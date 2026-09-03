import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  aberturaAgora, arquivarUnidade, comEscopo, comIdempotencia, comIdentidade,
  criarOrganizacaoComDono, criarUnidade, dependenciasDaUnidade, guardarExcepcao,
  guardarSemana, lerHorario, marcarPasso, obterPrisma, progressoDoArranque,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova do E06.
 *
 * O alvo está em `docs/architecture/domain-model.md` e `permissions.md`, os dois
 * escritos no E00. E a régua que atravessa tudo, do `README.md` dos contratos:
 *
 * > **Desconhecido é uma resposta.** Não é zero, não é vazio, não é a média.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * O par, outra vez, em duas dimensões:
 *
 *   1. a MESMA chave duas vezes cria uma organização; chaves diferentes criam
 *      duas — sem o segundo caso, uma função que devolvesse sempre a mesma
 *      organização passava no primeiro;
 *   2. o MESMO instante, na MESMA unidade, dá `desconhecido` com o dia por
 *      configurar e `fechado` com o dia declarado fechado.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
const marca = Date.now();
const criadas: string[] = [];

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comoDiogo = <T>(fn: Parameters<typeof comIdentidade<T>>[2]) =>
  comIdentidade(prisma, IDS.utilizadorPlataforma, fn);

const utc = (a: number, m: number, d: number, h: number, min = 0) => new Date(Date.UTC(a, m - 1, d, h, min));
const ALMOCO = { inicioMin: 13 * 60, fimMin: 16 * 60 };
const NOITE = { inicioMin: 20 * 60, fimMin: 25 * 60 };

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

after(async () => {
  // As organizações criadas aqui saem daqui. Uma prova que deixa lixo faz a
  // seguinte medir outra coisa.
  for (const id of criadas) {
    await sql.query('DELETE FROM idempotency_keys WHERE organization_id = $1', [id]);
    await sql.query('DELETE FROM onboarding_progress WHERE organization_id = $1', [id]);
    await sql.query('DELETE FROM role_assignments WHERE organization_id = $1', [id]);
    await sql.query('DELETE FROM memberships WHERE organization_id = $1', [id]);
    await sql.query('DELETE FROM organizations WHERE id = $1', [id]);
  }
  await sql.query("DELETE FROM idempotency_keys WHERE accao LIKE 'prova.%'");
  await sql.end();
  await prisma.$disconnect();
});

describe('1. Repetir não duplica — e chaves diferentes não colapsam', () => {
  it('a mesma chave duas vezes devolve a MESMA organização', async () => {
    const chave = `prova-${marca}-a`;
    const slug = `prova-${marca}-a`;
    const primeira = await comoDiogo((db) => criarOrganizacaoComDono(db, { chave, slug, nome: 'Prova A' }));
    criadas.push(primeira.organizationId);
    assert.equal(primeira.criada, true);

    // A segunda tentativa: é o cliente que expirou e voltou a enviar.
    const segunda = await comoDiogo((db) => criarOrganizacaoComDono(db, { chave, slug, nome: 'Prova A' }));
    assert.equal(segunda.organizationId, primeira.organizationId);
    assert.equal(segunda.criada, false, 'a segunda chamada criou outra vez');

    const { rows } = await sql.query('SELECT count(*)::int AS n FROM organizations WHERE slug = $1', [slug]);
    assert.equal(rows[0].n, 1, 'ficaram duas organizações com o mesmo slug');
  });

  it('chaves DIFERENTES criam organizações diferentes', async () => {
    // O par. Sem ele, uma implementação que ignorasse a chave e devolvesse
    // sempre a primeira organização do actor passava no caso de cima.
    const b = await comoDiogo((db) =>
      criarOrganizacaoComDono(db, { chave: `prova-${marca}-b`, slug: `prova-${marca}-b`, nome: 'Prova B' }));
    criadas.push(b.organizationId);
    assert.equal(b.criada, true);
    assert.notEqual(b.organizationId, criadas[0]);
  });

  it('duas tentativas SIMULTÂNEAS criam uma só', async () => {
    // O caso que ler-a-chave-e-depois-criar não resolve: as duas leem "não
    // existe" e as duas criam. Quem decide aqui é o índice único, e o perdedor
    // bloqueia até o vencedor confirmar.
    const chave = `prova-${marca}-c`;
    const slug = `prova-${marca}-c`;
    const [x, y] = await Promise.all([
      comoDiogo((db) => criarOrganizacaoComDono(db, { chave, slug, nome: 'Prova C' })),
      comoDiogo((db) => criarOrganizacaoComDono(db, { chave, slug, nome: 'Prova C' })),
    ]);
    criadas.push(x.organizationId);
    assert.equal(x.organizationId, y.organizationId, 'as duas criaram organizações diferentes');
    assert.equal([x.criada, y.criada].filter(Boolean).length, 1, 'as duas dizem que criaram');
    const { rows } = await sql.query('SELECT count(*)::int AS n FROM organizations WHERE slug = $1', [slug]);
    assert.equal(rows[0].n, 1);
  });

  it('quem cria fica lá dentro como DONO', async () => {
    // O invariante que a porta existe para garantir. Uma organização sem dono
    // ninguém a abre e ninguém a apaga.
    const { rows } = await sql.query(
      `SELECT r.papel FROM role_assignments r
         JOIN memberships m ON m.id = r.membership_id
        WHERE r.organization_id = $1 AND m.user_id = $2`,
      [criadas[0], IDS.utilizadorPlataforma],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].papel, 'OWNER');
  });

  it('sem chave, recusa em vez de criar', async () => {
    await assert.rejects(
      () => comoDiogo((db) => criarOrganizacaoComDono(db, { chave: '  ', slug: `x-${marca}`, nome: 'X' })),
      /chave de idempot/i,
    );
  });

  it('a idempotência genérica também não duplica uma unidade', async () => {
    const chave = `prova-unidade-${marca}`;
    const criar = (id: string) =>
      comA((db) => db.location.create({
        data: { id, organizationId: IDS.orgA, brandId: IDS.marcaA, nome: 'Prova', slug: `prova-${marca}` },
      }));

    const um = await comA((db) => comIdempotencia(db, IDS.orgA, 'prova.unidade', { chave, actorId: IDS.utilizadorA }, criar));
    const dois = await comA((db) => comIdempotencia(db, IDS.orgA, 'prova.unidade', { chave, actorId: IDS.utilizadorA }, criar));
    assert.equal(dois.id, um.id);
    assert.equal(dois.criado, false);
    const n = await comA((db) => db.location.count({ where: { slug: `prova-${marca}` } }));
    assert.equal(n, 1);
    await sql.query('DELETE FROM locations WHERE id = $1', [um.id]);
  });
});

describe('2. Horários: por configurar, fechado e aberto são três coisas', () => {
  let unidade: string;

  beforeEach(async () => {
    // Uma unidade nova por caso, para nenhum caso herdar a configuração do anterior.
    unidade = (await comA((db) => criarUnidade(db, IDS.orgA, {
      brandId: IDS.marcaA, nome: 'Horários', slug: `horarios-${Date.now()}`, fuso: 'Europe/Madrid',
    }))).id;
  });

  it('sem nada configurado, a sexta às 14:00 é DESCONHECIDA', async () => {
    const r = await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 4, 12)));
    assert.equal(r.estado, 'desconhecido');
    assert.equal(r.estado === 'desconhecido' && r.motivo, 'por_configurar');
  });

  it('com a sexta declarada fechada, o MESMO instante dá fechado', async () => {
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, { 5: { tipo: 'fechado' } }));
    const r = await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 4, 12)));
    assert.equal(r.estado, 'fechado');
  });

  it('20:00-01:00 mantém o sábado aberto às 00:30, e desconhecido às 02:00', async () => {
    const g = await comA((db) => guardarSemana(db, IDS.orgA, unidade, {
      5: { tipo: 'aberto', intervalos: [ALMOCO, NOITE] },
    }));
    assert.equal(g.ok, true);
    assert.equal((await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 4, 21)))).estado, 'aberto');
    assert.equal((await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 4, 22, 30)))).estado, 'aberto');
    // 02:00 de sábado: o serviço de sexta acabou e o sábado nunca foi configurado.
    assert.equal((await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 5, 0)))).estado, 'desconhecido');
  });

  it('uma excepção de feriado fecha um dia que a semana abre', async () => {
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, { 5: { tipo: 'aberto', intervalos: [ALMOCO] } }));
    await comA((db) => guardarExcepcao(db, IDS.orgA, unidade, {
      data: '2026-09-04', motivo: 'Fiesta local', estado: { tipo: 'fechado' },
    }));
    const r = await comA((db) => aberturaAgora(db, unidade, utc(2026, 9, 4, 12)));
    assert.equal(r.estado, 'fechado');
    assert.equal(r.estado === 'fechado' && r.excepcao, 'Fiesta local');
  });

  it('sem FUSO não há pergunta a fazer, e diz-se isso', async () => {
    const semFuso = (await comA((db) => criarUnidade(db, IDS.orgA, {
      brandId: IDS.marcaA, nome: 'Sem fuso', slug: `sem-fuso-${Date.now()}`,
    }))).id;
    const r = await comA((db) => aberturaAgora(db, semFuso, utc(2026, 9, 4, 12)));
    assert.equal(r.estado, 'desconhecido');
    assert.equal(r.estado === 'desconhecido' && r.motivo, 'sem_fuso');
    assert.deepEqual(await comA((db) => lerHorario(db, semFuso)), { semFuso: true });
  });

  it('gravar um dia não apaga os outros', async () => {
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, {
      1: { tipo: 'aberto', intervalos: [ALMOCO] },
      2: { tipo: 'aberto', intervalos: [ALMOCO] },
    }));
    // Um formulário que só mostra a terça não pode apagar a segunda.
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, { 2: { tipo: 'fechado' } }));
    const h = await comA((db) => lerHorario(db, unidade));
    assert.ok(!('semFuso' in h));
    assert.equal(h.semana[1]?.tipo, 'aberto', 'a segunda foi apagada por se gravar a terça');
    assert.equal(h.semana[2]?.tipo, 'fechado');
  });

  it('a gravação recusa intervalos inválidos ANTES de escrever', async () => {
    const r = await comA((db) => guardarSemana(db, IDS.orgA, unidade, {
      3: { tipo: 'aberto', intervalos: [{ inicioMin: 1200, fimMin: 60 }] },
    }));
    assert.equal(r.ok, false);
    // E não escreveu nada: uma recusa que já escreveu é pior do que uma aceitação.
    const h = await comA((db) => lerHorario(db, unidade));
    assert.ok(!('semFuso' in h) && h.semana[3] === undefined, 'a quarta ficou gravada apesar da recusa');
  });

  it('e a BASE recusa o mesmo, para quem não passar por aqui', async () => {
    // A validação em TypeScript diz qual dia e qual intervalo, para o ecrã poder
    // apontar. A constraint é o que impede quem escrever por outro caminho.
    const dia = await comA((db) => db.scheduleDay.create({
      data: { organizationId: IDS.orgA, locationId: unidade, dia: 4, fechado: false }, select: { id: true },
    }));
    await assert.rejects(
      () => comA((db) => db.scheduleInterval.create({
        data: { organizationId: IDS.orgA, diaId: dia.id, inicioMin: 1200, fimMin: 60 },
      })),
      /intervalo_bem_formado/,
    );
  });
});

describe('3. Arquivar não apaga, e não deixa ficar sem nada', () => {
  it('lista as dependências ANTES de arquivar', async () => {
    const unidade = (await comA((db) => criarUnidade(db, IDS.orgA, {
      brandId: IDS.marcaA, nome: 'A arquivar', slug: `arquivar-${Date.now()}`, fuso: 'Europe/Madrid',
    }))).id;
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, { 1: { tipo: 'fechado' } }));

    const deps = await comA((db) => dependenciasDaUnidade(db, unidade));
    assert.ok(deps.some((d) => d.tipo === 'horarios' && d.quantas === 1));

    const r = await comA((db) => arquivarUnidade(db, unidade));
    assert.equal(r.ok, true);

    // O histórico fica. "Operación nueva: desactivada", não "apagada".
    const restantes = await comA((db) => db.scheduleDay.count({ where: { locationId: unidade } }));
    assert.equal(restantes, 1, 'arquivar apagou o horário');
    const arquivada = await comA((db) => db.location.findFirst({ where: { id: unidade }, select: { archivedAt: true } }));
    assert.ok(arquivada?.archivedAt);
  });

  it('recusa arquivar a ÚLTIMA unidade activa', async () => {
    const activas = await comA((db) => db.location.count({ where: { archivedAt: null } }));
    assert.ok(activas >= 1);
    // Arquiva todas menos uma, e depois tenta a última.
    const todas = await comA((db) => db.location.findMany({ where: { archivedAt: null }, select: { id: true } }));
    for (const u of todas.slice(1)) await comA((db) => arquivarUnidade(db, u.id));

    const r = await comA((db) => arquivarUnidade(db, todas[0]!.id));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.motivo, 'ultima_unidade');
    // Repõe o que este caso arquivou.
    await sql.query('UPDATE locations SET archived_at = NULL WHERE organization_id = $1', [IDS.orgA]);
  });
});

describe('4. O progresso guarda-se, e só avança', () => {
  it('marcar 7 e depois 2 mantém 7', async () => {
    // Quem volta ao passo 2 para corrigir a marca não perde o 7. A primeira
    // versão disto fazia upsert e depois GREATEST, e não funcionava.
    await comA((db) => marcarPasso(db, IDS.orgA, 7));
    await comA((db) => marcarPasso(db, IDS.orgA, 2));
    const p = await comA((db) => progressoDoArranque(db, IDS.orgA));
    assert.equal(p?.passo, 7);
    await sql.query('DELETE FROM onboarding_progress WHERE organization_id = $1', [IDS.orgA]);
  });

  it('um passo fora de 1..10 rebenta em vez de ser guardado', async () => {
    await assert.rejects(() => comA((db) => marcarPasso(db, IDS.orgA, 11)), /passo fora/);
  });
});

describe('5. Os horários de A não são visíveis a B', () => {
  it('as tabelas novas têm política de linha, como todas as outras', async () => {
    const unidade = (await comA((db) => criarUnidade(db, IDS.orgA, {
      brandId: IDS.marcaA, nome: 'Isolada', slug: `isolada-${Date.now()}`, fuso: 'Europe/Madrid',
    }))).id;
    await comA((db) => guardarSemana(db, IDS.orgA, unidade, { 1: { tipo: 'aberto', intervalos: [ALMOCO] } }));

    const deA = await comA((db) => db.scheduleDay.count({ where: { locationId: unidade } }));
    assert.equal(deA, 1, 'A não vê o que acabou de escrever');

    const deB = await comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB },
      (db) => db.scheduleDay.count({ where: { locationId: unidade } }));
    assert.equal(deB, 0, 'B viu o horário de A');
  });
});
