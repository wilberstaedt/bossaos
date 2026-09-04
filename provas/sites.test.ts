import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, criarSiteSeFaltar, dominiosDaUnidade, guardarLeadPublico,
  largarDominio, obterPrisma, publicarSite, registarVerificacao, retirarSite,
  sitePublico, sitePublicoPorDominio, vincularDominio,
} from '../packages/db/src/index.ts';
import { novidadeDoSite, paginaDoSite, valorDoRegistoDeProva } from '../packages/domain/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova do E10 — os três aceites, atacados como a régua diz que vão ser.
 *
 * `docs/reviews/ALVO-E10.md`, escrita antes de existir uma linha desta etapa:
 *
 * > **1.** O meu ataque é o par: gravar rascunho e ir ao **site público**
 * > confirmar que nada mudou — não à pré-visualização, que é o mesmo processo a
 * > olhar-se ao espelho.
 * >
 * > **2.** E **partir a gravação de propósito** — base indisponível — para ver o
 * > que o ecrã diz: se disser sucesso, o aceite 2 está reprovado por definição.
 * >
 * > **3.** Este prova-se com **dois** inquilinos, não com um.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
const marca = Date.now();
const SLUG_A = `e10a-${marca}`;
const SLUG_B = `e10b-${marca}`;
const DOMINIO = `e10-${marca}.exemplo.example`;
const AUTOR = 'dona@exemplo.example';

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);

let siteA = '';
let siteB = '';

/** Monta um site com as três páginas preenchidas e uma novidade. */
async function montar(
  correr: typeof comA, organizationId: string, locationId: string, sufixo: string,
): Promise<string> {
  return correr(async (db) => {
    const siteId = await criarSiteSeFaltar(db, organizationId, locationId);
    for (const tipo of ['INICIO', 'SOBRE', 'CONTACTO'] as const) {
      await db.sitePage.updateMany({
        where: { siteId, tipo },
        data: {
          titulo: `e10 ${sufixo} ${tipo}`,
          corpo: `Texto de ${sufixo} para ${tipo}.`,
          visivel: true,
          ...(tipo === 'CONTACTO'
            ? { contacto: { morada: `Calle ${sufixo} 1`, telefone: '+34 900 000 000', email: `${sufixo}@exemplo.example` } }
            : {}),
        },
      });
    }
    await db.sitePost.create({
      data: {
        organizationId, siteId, slug: `e10-${sufixo}-noticia`,
        titulo: `Noticia de ${sufixo}`, resumo: 'r', corpo: 'c',
        publicadoEm: new Date('2026-08-01T00:00:00Z'), visivel: true,
      },
    });
    return siteId;
  });
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);

  await sql.query('UPDATE locations SET public_slug = $1 WHERE id = $2', [SLUG_A, IDS.unidadeA]);
  await sql.query('UPDATE locations SET public_slug = $1 WHERE id = $2', [SLUG_B, IDS.unidadeB]);

  siteA = await montar(comA, IDS.orgA, IDS.unidadeA, 'a');
  siteB = await montar(comB, IDS.orgB, IDS.unidadeB, 'b');

  await comA((db) => publicarSite(db, IDS.orgA, { siteId: siteA, autor: AUTOR }));
  await comB((db) => publicarSite(db, IDS.orgB, { siteId: siteB, autor: AUTOR }));
});

after(async () => {
  // Quem faz a sujidade apanha-a. É a regra do projecto, e o E06 mostrou o que
  // custa não a cumprir: uma prova deixou lixo e partiu a prova de isolamento.
  await sql.query(`DELETE FROM leads WHERE location_id IN ($1, $2)`, [IDS.unidadeA, IDS.unidadeB]);
  await sql.query(`DELETE FROM custom_domains WHERE dominio LIKE 'e10-%'`);
  await sql.query(`DELETE FROM custom_domain_owners WHERE dominio LIKE 'e10-%'`);
  await sql.query(`DELETE FROM site_publications WHERE site_id IN ($1, $2)`, [siteA, siteB]);
  await sql.query(`DELETE FROM site_revisions WHERE site_id IN ($1, $2)`, [siteA, siteB]);
  await sql.query(`DELETE FROM site_posts WHERE site_id IN ($1, $2)`, [siteA, siteB]);
  await sql.query(`DELETE FROM site_pages WHERE site_id IN ($1, $2)`, [siteA, siteB]);
  await sql.query(`DELETE FROM sites WHERE id IN ($1, $2)`, [siteA, siteB]);
  await sql.query(`UPDATE locations SET public_slug = NULL WHERE public_slug LIKE 'e10%'`);
  await sql.query(`DELETE FROM public_slug_owners WHERE slug LIKE 'e10%'`);
  await sql.end();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. ACEITE 1 — rascunho não muda o site público', () => {
  it('o site publicado responde, com o que foi publicado', async () => {
    // O par primeiro. Sem ele, uma porta que devolvesse `null` a toda a gente
    // passava em tudo o que vem a seguir e o site não servia nada a ninguém.
    const servido = await sitePublico(prisma, SLUG_A);
    assert.ok(servido, 'o site publicado tinha de responder');
    assert.equal(paginaDoSite(servido.site, 'INICIO')?.titulo, 'e10 a INICIO');
    assert.ok(novidadeDoSite(servido.site, 'e10-a-noticia'));
  });

  it('EDITAR O RASCUNHO NÃO MUDA O PÚBLICO — medido na rota pública', async () => {
    // ── O ataque, escrito pelo sénior antes de existir código ──────────────
    //
    // «gravar rascunho e ir ao SITE PÚBLICO confirmar que nada mudou — não à
    // pré-visualização, que é o mesmo processo a olhar-se ao espelho.»
    await comA((db) => db.sitePage.updateMany({
      where: { siteId: siteA, tipo: 'INICIO' },
      data: { titulo: 'RASCUNHO QUE NAO PODE SAIR', corpo: 'texto novo por publicar' },
    }));
    await comA((db) => db.sitePost.create({
      data: {
        organizationId: IDS.orgA, siteId: siteA, slug: 'e10-a-rascunho',
        titulo: 'NOVIDADE POR PUBLICAR', visivel: true,
      },
    }));

    const servido = await sitePublico(prisma, SLUG_A);
    assert.ok(servido);
    assert.equal(paginaDoSite(servido.site, 'INICIO')?.titulo, 'e10 a INICIO');

    const corpo = JSON.stringify(servido.site);
    assert.ok(!corpo.includes('RASCUNHO QUE NAO PODE SAIR'), 'o rascunho saiu para o público');
    assert.ok(!corpo.includes('NOVIDADE POR PUBLICAR'), 'a novidade por publicar saiu');
    assert.equal(novidadeDoSite(servido.site, 'e10-a-rascunho'), null);
  });

  it('e PUBLICAR passa a servir o que estava em rascunho', async () => {
    // O outro lado do par: se publicar não mudasse nada, o caso de cima passava
    // com um produto que nunca publica coisa nenhuma.
    const r = await comA((db) => publicarSite(db, IDS.orgA, { siteId: siteA, autor: AUTOR }));
    assert.equal(r.ok, true);

    const servido = await sitePublico(prisma, SLUG_A);
    assert.ok(servido);
    assert.equal(paginaDoSite(servido.site, 'INICIO')?.titulo, 'RASCUNHO QUE NAO PODE SAIR');
    assert.ok(novidadeDoSite(servido.site, 'e10-a-rascunho'));
  });

  it('a página OCULTA não vai na publicação, nem escondida', async () => {
    await comA((db) => db.sitePage.updateMany({
      where: { siteId: siteA, tipo: 'SOBRE' },
      data: { visivel: false, titulo: 'PAGINA DESLIGADA' },
    }));
    await comA((db) => publicarSite(db, IDS.orgA, { siteId: siteA, autor: AUTOR }));

    const servido = await sitePublico(prisma, SLUG_A);
    assert.ok(servido);
    assert.equal(paginaDoSite(servido.site, 'SOBRE'), null);
    // Não basta não aparecer: não pode estar no corpo. Um campo que vem e não se
    // mostra é uma fuga com uma cortina à frente.
    assert.ok(!JSON.stringify(servido.site).includes('PAGINA DESLIGADA'));
  });

  it('RETIRAR tira do ar, e o endereço deixa de responder', async () => {
    await comA((db) => retirarSite(db, siteA));
    assert.equal(await sitePublico(prisma, SLUG_A), null, 'retirado e continua a responder');
  });

  it('e o PAR: voltar a publicar repõe o site, com número NOVO', async () => {
    const r = await comA((db) => publicarSite(db, IDS.orgA, { siteId: siteA, autor: AUTOR }));
    assert.equal(r.ok, true);
    const servido = await sitePublico(prisma, SLUG_A);
    assert.ok(servido, 'não voltou depois de publicar outra vez');
    // O número nunca recua, nem depois de retirar: duas revisões diferentes com
    // o mesmo nome tornam o histórico impossível de ler.
    assert.ok(servido.revisionNumero >= 4, `número recuou: ${servido.revisionNumero}`);
  });

  it('a revisão publicada é IMUTÁVEL — a base recusa', async () => {
    const servido = await sitePublico(prisma, SLUG_A);
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        UPDATE site_revisions SET conteudo = '[]'::jsonb WHERE id = ${servido!.revisionId}::uuid`),
      /permission denied|permissão negada/i,
      'o runtime conseguiu reescrever uma revisão publicada',
    );
  });

  it('dois inquilinos não se misturam', async () => {
    const a = await sitePublico(prisma, SLUG_A);
    const b = await sitePublico(prisma, SLUG_B);
    assert.ok(a && b);
    assert.equal(a.organizationId, IDS.orgA);
    assert.equal(b.organizationId, IDS.orgB);
    assert.ok(!JSON.stringify(b.site).includes('e10 a '), 'o site de B trouxe conteúdo de A');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. ACEITE 2 — lead guarda-se uma vez; falha real não mostra sucesso', () => {
  const lead = {
    nome: 'Ana Ruiz', email: 'ana@exemplo.example',
    mensagem: 'Quería reservar para ocho el sábado.', origem: 'site' as const,
  };

  it('um lead válido guarda-se', async () => {
    const r = await guardarLeadPublico(prisma, {
      ...lead, organizationId: IDS.orgA, locationId: IDS.unidadeA,
    });
    assert.deepEqual(r, { ok: true, duplicado: false });
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM leads WHERE location_id = $1', [IDS.unidadeA]);
    assert.equal((rows[0] as { n: number }).n, 1);
  });

  it('O DUPLO CLIQUE não faz dois — e a contagem prova-o', async () => {
    // O caso real que a régua nomeia. E as duas submissões vão em PARALELO, que
    // é o que separa a idempotência da base de um `if (jaExiste)`: em série, um
    // `if` também passava.
    await Promise.all([
      guardarLeadPublico(prisma, { ...lead, organizationId: IDS.orgA, locationId: IDS.unidadeA }),
      guardarLeadPublico(prisma, { ...lead, organizationId: IDS.orgA, locationId: IDS.unidadeA }),
    ]);
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM leads WHERE location_id = $1', [IDS.unidadeA]);
    assert.equal((rows[0] as { n: number }).n, 1, 'o duplo clique gravou mais do que um');
  });

  it('e o PAR: um contacto DIFERENTE no mesmo dia é um lead novo', async () => {
    // Sem isto, uma implementação que recusasse todos os leads depois do
    // primeiro passava no caso de cima — e perdia todos os clientes seguintes.
    const r = await guardarLeadPublico(prisma, {
      ...lead, mensagem: 'Otra pregunta distinta.',
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
    });
    assert.deepEqual(r, { ok: true, duplicado: false });
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM leads WHERE location_id = $1', [IDS.unidadeA]);
    assert.equal((rows[0] as { n: number }).n, 2);
  });

  it('A FALHA REAL NÃO DEVOLVE SUCESSO — o ataque mais caro dos três', async () => {
    // ── O ataque, tal como está escrito na régua ───────────────────────────
    //
    // «partir a gravação de propósito — base indisponível — para ver o que o
    // ecrã diz: se disser sucesso, o aceite 2 está reprovado por definição, e é
    // o defeito mais caro porque perde dinheiro sem fazer barulho.»
    //
    // Aqui a gravação é partida a valer: o privilégio de INSERT é retirado ao
    // runtime. Não é um erro simulado com um duplo — é a base a recusar.
    await sql.query('REVOKE INSERT ON leads FROM bossaos_app');
    try {
      let subiu = false;
      let resultado: unknown = 'nunca devolveu';
      try {
        resultado = await guardarLeadPublico(prisma, {
          ...lead, mensagem: 'Este nao pode chegar a dizer que foi guardado.',
          organizationId: IDS.orgA, locationId: IDS.unidadeA,
        });
      } catch {
        subiu = true;
      }
      assert.equal(subiu, true,
        `a gravação falhou e a função devolveu ${JSON.stringify(resultado)} — sucesso sobre nada`);

      // E não ficou nada na base, que é a outra metade: o ecrã não pode dizer
      // sucesso, e também não pode ter guardado metade.
      const { rows } = await sql.query(
        'SELECT count(*)::int AS n FROM leads WHERE location_id = $1', [IDS.unidadeA]);
      assert.equal((rows[0] as { n: number }).n, 2, 'gravou apesar de a base recusar');
    } finally {
      await sql.query('GRANT INSERT ON leads TO bossaos_app');
    }
  });

  it('e o PAR: com o privilégio reposto, volta a guardar', async () => {
    // Sem este caso, o de cima passava com uma função que nunca guarda nada.
    const r = await guardarLeadPublico(prisma, {
      ...lead, mensagem: 'Depois de repor tem de voltar a gravar.',
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
    });
    assert.deepEqual(r, { ok: true, duplicado: false });
  });

  it('um lead inválido é RECUSADO, e recusa não é falha', async () => {
    const r = await guardarLeadPublico(prisma, {
      ...lead, email: 'isto-nao-e-email',
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
    });
    assert.equal(r.ok, false);
  });

  it('o runtime NÃO pode apagar um lead', async () => {
    // Se pudesse, a saída fácil para esconder que a gravação estava a falhar era
    // apagar o que ficou meio gravado.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`DELETE FROM leads WHERE location_id = ${IDS.unidadeA}::uuid`),
      /permission denied|permissão negada/i,
    );
  });

  it('e B não vê os leads de A', async () => {
    const deB = await comB((db) => db.lead.count({ where: { locationId: IDS.unidadeA } }));
    assert.equal(deB, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. ACEITE 3 — o domínio não é tomado por outro inquilino', () => {
  it('A vincula, e o domínio nasce PENDENTE', async () => {
    const r = await vincularDominio(prisma, IDS.orgA, IDS.unidadeA, DOMINIO, 'token-de-a');
    assert.equal(r, 'ok');
    const [d] = await comA((db) => dominiosDaUnidade(db, IDS.unidadeA));
    assert.equal(d?.estado, 'PENDENTE');
  });

  it('e PENDENTE NÃO SERVE CONTEÚDO — regra 1 do contrato', async () => {
    // «Só depois de ver a prova é que o domínio serve conteúdo.» A verificação
    // está na porta e não em quem a chama.
    assert.equal(await sitePublicoPorDominio(prisma, DOMINIO), null);
  });

  it('B NÃO PODE reclamar o domínio de A', async () => {
    // Dois inquilinos, que é o que a régua exige: um inquilino a reclamar um
    // domínio livre não prova nada sobre o segundo.
    const r = await vincularDominio(prisma, IDS.orgB, IDS.unidadeB, DOMINIO, 'token-de-b');
    assert.equal(r, 'reservado_por_outra_organizacao');
  });

  it('vista a prova, PASSA A SERVIR — o par da regra 1', async () => {
    const [d] = await comA((db) => dominiosDaUnidade(db, IDS.unidadeA));
    const v = await comA((db) => registarVerificacao(db, DOMINIO, {
      tipo: 'registos', valores: ['v=spf1 -all', d!.registo.valor],
    }));
    assert.equal(v?.estado, 'VERIFICADO');

    const servido = await sitePublicoPorDominio(prisma, DOMINIO);
    assert.ok(servido, 'verificado e continua sem servir');
    assert.equal(servido.organizationId, IDS.orgA);
  });

  it('o DNS cala-se e o site CONTINUA NO AR — regra 2', async () => {
    // Perder a posse exige ver OUTRO dono, não deixar de ver o nosso. Se um
    // tempo-limite de rede tirasse o site do ar, era o dano que a regra existe
    // para impedir.
    const v = await comA((db) => registarVerificacao(db, DOMINIO, {
      tipo: 'nao_respondeu', erro: 'ETIMEDOUT',
    }));
    assert.equal(v?.estado, 'INDETERMINADO');
    assert.ok(await sitePublicoPorDominio(prisma, DOMINIO), 'um DNS mudo tirou o site do ar');
  });

  it('mas a prova de OUTRO dono contesta, e aí PÁRA de servir', async () => {
    const v = await comA((db) => registarVerificacao(db, DOMINIO, {
      tipo: 'registos', valores: [valorDoRegistoDeProva('token-de-outra-empresa')],
    }));
    assert.equal(v?.estado, 'CONTESTADO');
    assert.equal(await sitePublicoPorDominio(prisma, DOMINIO), null);
  });

  it('A LARGA o domínio: sai do ar', async () => {
    // Repõe-se primeiro o estado bom, para medir o largar e não o contestado.
    const [d] = await comA((db) => dominiosDaUnidade(db, IDS.unidadeA));
    await comA((db) => registarVerificacao(db, DOMINIO, {
      tipo: 'registos', valores: [d!.registo.valor],
    }));
    assert.ok(await sitePublicoPorDominio(prisma, DOMINIO));

    assert.equal(await largarDominio(prisma, IDS.orgA, DOMINIO), 'ok');
    assert.equal(await sitePublicoPorDominio(prisma, DOMINIO), null);
  });

  it('E B CONTINUA A NÃO PODER RECLAMAR — o nome não volta ao mundo', async () => {
    // A regra inteira. O `@unique` impede dois AO MESMO TEMPO; isto é dois EM
    // SEQUÊNCIA, que é o caso real — e o domínio anda em cartões e anúncios
    // pagos que não se actualizam.
    const r = await vincularDominio(prisma, IDS.orgB, IDS.unidadeB, DOMINIO, 'token-de-b');
    assert.equal(r, 'reservado_por_outra_organizacao');
  });

  it('O PAR QUE DÁ SENTIDO: A RETOMA o domínio dele', async () => {
    // Sem este caso, o de cima passava com uma implementação que proibisse
    // QUALQUER domínio já usado — e essa impede o dono de voltar depois de uma
    // pausa de inverno. É outra regra, e está errada.
    const r = await vincularDominio(prisma, IDS.orgA, IDS.unidadeA, DOMINIO, 'token-novo-de-a');
    assert.equal(r, 'ok');
  });

  it('o runtime NÃO pode apagar uma reserva de domínio', async () => {
    await assert.rejects(
      () => comA((db) => db.$executeRaw`DELETE FROM custom_domain_owners WHERE dominio = ${DOMINIO}`),
      /permission denied|permissão negada/i,
    );
  });

  it('e um domínio com forma inválida é recusado', async () => {
    assert.equal(
      await vincularDominio(prisma, IDS.orgA, IDS.unidadeA, '../admin', 'token'),
      'invalido',
    );
  });
});
