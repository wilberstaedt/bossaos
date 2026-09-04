import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  CAPACIDADE_DO_TEMA, aplicarDescidaAgendada, comEscopo, descartarRascunho, destinosPublicos,
  estadoComercial, guardarRascunho, historicoDoTema, obterPrisma, publicarRascunho,
  rascunhoDoTema, restaurarTemaAnterior, reverterAoPadrao, temaActivo, temaPublico,
} from '../packages/db/src/index.ts';
import { momentoLocal } from '../packages/domain/src/index.ts';
import { TEMA_BOSSAOS, variaveisDoTema } from '../packages/ui/src/regras.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E12 — cores públicas e mudanças de plano.
 *
 * A régua está em `docs/reviews/ALVO-E12.md` e pede TRÊS coisas ao mesmo tempo:
 * que o Restaurant/Pro mude a cor pública, que o Starter **não consiga** — e que
 * isso seja **o servidor a recusar** e não um ecrã escondido —, e que o que não é
 * personalizável continue a não ser, mesmo no plano de cima.
 *
 * O aceite 3 é o perigoso, e são três promessas com falhas diferentes:
 * reverter na data (no fuso da unidade), preservar conteúdo, e **restaurar depois
 * do upgrade**. A terceira é o par: *«uma implementação que APAGASSE o tema
 * passava as duas primeiras»*.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB }, fn);

const AUTOR = 'prova-e12@bossaos.example';
/**
 * Legível: primária escura com texto claro por cima, fundo claro.
 *
 * Em minúsculas de propósito. O produto **normaliza** para `#rrggbb` antes de
 * gravar — `#1B3A2F` e `#1b3a2f` são a mesma cor, e guardar as duas formas fazia
 * a comparação «há alterações por publicar?» dizer que sim para sempre. A prova
 * afirma a forma guardada, e não a que se escreveu.
 */
const CORES = { primaria: '#1b3a2f', acento: '#c4522e', fundo: '#fbf9f4' };
/** O par que a WCAG reprova: cinzento médio sobre cinzento médio. */
const ILEGIVEL = { primaria: '#858585', acento: '#858585', fundo: '#858585' };

async function assinar(organizationId: string, codigo: string) {
  await sql.query(
    `INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
     SELECT gen_random_uuid(), $1, p.id, 'ACTIVA', now() FROM plan_definitions p WHERE p.codigo = $2
     ON CONFLICT (organization_id) DO UPDATE
       SET plan_id = (SELECT id FROM plan_definitions WHERE codigo = $2),
           estado = 'ACTIVA', valido_ate = NULL,
           descer_para_plano_id = NULL, descer_em = NULL, updated_at = now()`,
    [organizationId, codigo],
  );
}

async function limpar(organizationId: string) {
  await sql.query("DELETE FROM entitlement_grants WHERE organization_id = $1 AND origem = 'ADICIONAL'", [organizationId]);
  await sql.query('DELETE FROM theme_drafts WHERE organization_id = $1', [organizationId]);
  await sql.query('UPDATE theme_revisions SET restaura_de_id = NULL WHERE organization_id = $1', [organizationId]);
  await sql.query('DELETE FROM theme_revisions WHERE organization_id = $1', [organizationId]);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

after(async () => {
  await limpar(IDS.orgA);
  await limpar(IDS.orgB);
  await assinar(IDS.orgA, 'STARTER');
  await assinar(IDS.orgB, 'PRO');
  await sql.query(
    `UPDATE subscriptions SET descer_para_plano_id = NULL, descer_em = NULL, updated_at = now()
      WHERE organization_id IN ($1, $2)`, [IDS.orgA, IDS.orgB]);
  await sql.end();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await limpar(IDS.orgA);
  await limpar(IDS.orgB);
  await assinar(IDS.orgA, 'STARTER');
  await assinar(IDS.orgB, 'PRO');
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. o Starter não muda a cor pública — e quem recusa é o SERVIDOR', () => {
  it('guardar o rascunho é recusado por PLANO, e nada fica na base', async () => {
    const r = await comA(async (db) =>
      guardarRascunho(db, IDS.orgA, await estadoComercial(db, IDS.orgA), CORES, AUTOR));

    assert.ok(!r.ok);
    assert.equal(r.motivo, 'plano');
    // "Não altera dados" é metade do aceite. Recusar e gravar à mesma seria pior
    // do que não recusar, porque ninguém iria procurar o defeito.
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM theme_drafts WHERE organization_id = $1', [IDS.orgA]);
    assert.equal(rows[0].n, 0, 'o Starter foi recusado e mesmo assim ficou um rascunho gravado');
  });

  it('publicar também é recusado por PLANO, e não por "não há rascunho"', async () => {
    // A ordem importa: um Starter sem rascunho a receber `nada_por_publicar`
    // responde a verdade e esconde a razão — e a recusa por plano fica por provar.
    const r = await comA(async (db) =>
      publicarRascunho(db, IDS.orgA, await estadoComercial(db, IDS.orgA), AUTOR));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'plano');
  });

  it('O PAR: o Pro guarda e publica as mesmas cores', async () => {
    // Sem isto, tudo o que está acima passava num sistema que recusa a toda a
    // gente — e um sistema que recusa a toda a gente também "protege o Starter".
    const guardado = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR));
    assert.ok(guardado.ok, 'o Pro não conseguiu guardar cores que o plano dele inclui');
    assert.equal(guardado.porPublicar, true);

    const publicado = await comB(async (db) =>
      publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR));
    assert.ok(publicado.ok);

    const activo = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(activo.primaria, CORES.primaria);
    assert.equal(activo.padrao, false);
  });

  it('CONTROLO NEGATIVO: com a capacidade concedida, o Starter passa a conseguir', async () => {
    // Se as recusas de cima NÃO ficarem verdes ao desligar a verificação de
    // plano, o que estava a bloquear era outra coisa — provavelmente a
    // autorização do E04 — e o teste do plano nunca existiu.
    await sql.query(
      `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, origem, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NULL, 'ADICIONAL', 'controlo negativo do E12', now())
       ON CONFLICT (organization_id, capacidade, location_id) DO NOTHING`,
      [IDS.orgA, CAPACIDADE_DO_TEMA]);

    const r = await comA(async (db) =>
      guardarRascunho(db, IDS.orgA, await estadoComercial(db, IDS.orgA), CORES, AUTOR));
    assert.ok(r.ok, 'com a capacidade concedida o Starter continuou bloqueado — quem bloqueia não é o plano');

    const publicado = await comA(async (db) =>
      publicarRascunho(db, IDS.orgA, await estadoComercial(db, IDS.orgA), AUTOR));
    assert.ok(publicado.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. o que NÃO é personalizável continua a não ser, mesmo no plano de cima', () => {
  it('tipografia, componentes e cores de estado são recusados ao Pro', async () => {
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), {
        ...CORES,
        // Um cliente que repinte um estado de erro passa o aceite 1 e quebra a
        // leitura de um ecrã de operação. É por isto que estes não entram.
        estadoPerigo: '#00FF00',
        fonteTitulo: 'Comic Sans MS',
        foco: '#FFFFFF',
      }, AUTOR));

    assert.ok(!r.ok);
    assert.equal(r.motivo, 'token');
    assert.deepEqual([...r.tokens].sort(), ['estadoPerigo', 'foco', 'fonteTitulo']);
  });

  it('O PAR: sem os intrusos, exactamente as mesmas três cores passam', async () => {
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR));
    assert.ok(r.ok, 'a recusa acima não era dos tokens a mais — era das cores');
  });

  it('as variáveis CSS de um tema são CINCO, e nenhuma delas é de estado', async () => {
    // A fronteira medida na saída, e não na entrada. Mesmo que um token
    // intruso escapasse à validação, não teria por onde chegar à folha de
    // estilos: `variaveisDoTema` é a única função que produz CSS de tema.
    const chaves = Object.keys(variaveisDoTema(CORES)).sort();
    assert.deepEqual(chaves, [
      '--bo-publico-acento', '--bo-publico-fundo', '--bo-publico-primaria',
      '--bo-publico-primaria-texto', '--bo-publico-texto',
    ]);
  });

  it('CSS injectado numa cor não passa: volta ao token de origem', async () => {
    // `red;--bo-foco:transparent` desligava o anel de foco do site inteiro sem
    // ninguém escrever uma linha de CSS.
    const variaveis = variaveisDoTema({
      primaria: 'red;--bo-foco:transparent', acento: CORES.acento, fundo: CORES.fundo,
    });
    assert.equal(variaveis['--bo-publico-primaria'], TEMA_BOSSAOS.primaria);
    for (const valor of Object.values(variaveis)) {
      assert.match(valor, /^#[0-9a-f]{6}$/i, `saiu para o CSS uma coisa que não é cor: ${valor}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. cor ilegível falha NO SERVIDOR', () => {
  it('o Pro é recusado por contraste, e o rascunho não muda', async () => {
    await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR));

    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), ILEGIVEL, AUTOR));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'contraste');
    assert.ok(r.validacao.reprovacoes.length > 0, 'recusou sem dizer porquê');

    const depois = await comB((db) => rascunhoDoTema(db, IDS.orgB));
    assert.equal(depois.primaria, CORES.primaria, 'a recusa gravou à mesma');
  });

  it('publicar cores ilegíveis é impossível porque nunca chegam a rascunho', async () => {
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), ILEGIVEL, AUTOR));
    assert.ok(!r.ok);
    const publicado = await comB(async (db) =>
      publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR));
    assert.ok(!publicado.ok);
    assert.equal(publicado.motivo, 'nada_por_publicar');
  });

  it('uma cor que NÃO é cor dá recusa e não excepção', async () => {
    // Medido a 04/09: `lerHex` atirava, e a rota devolvia **500** a um pedido que
    // só estava errado. Uma recusa que se lê como avaria manda quem a recebeu
    // procurar no sítio errado.
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), {
        ...CORES, primaria: 'red',
      }, AUTOR));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'contraste');
    assert.match(r.validacao.reprovacoes.join(' '), /hexadecimal/);
  });

  it('CONTROLO NEGATIVO: um par legível passa', async () => {
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR));
    assert.ok(r.ok, 'reprovou um par legível — o limiar está errado, não as cores');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. o tema de outro inquilino', () => {
  it('a sessão de B não escreve o rascunho de A', async () => {
    // ── O estado comercial é o DE B, e isto foi uma medição ────────────────
    //
    // A primeira versão passava `estadoComercial(db, IDS.orgA)` lido de dentro do
    // escopo de B — que não vê a subscrição de A e devolve "sem plano". O
    // `guardarRascunho` recusava por PLANO e nunca chegava à política de linha:
    // a prova ficava verde a medir a recusa errada.
    //
    // Com o estado de B (que TEM o direito), o portão do plano abre e o que
    // sobra é o isolamento — que é o que se quer medir aqui.
    let rebentou = false;
    try {
      await comB(async (db) =>
        guardarRascunho(db, IDS.orgA, await estadoComercial(db, IDS.orgB), CORES, AUTOR));
    } catch {
      rebentou = true;
    }
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM theme_drafts WHERE organization_id = $1', [IDS.orgA]);
    assert.equal(rows[0].n, 0, 'B escreveu no rascunho de A');
    assert.ok(rebentou, 'a política deixou passar e não gravou — verificar porquê');
  });

  it('O PAR: a sessão de B escreve o rascunho DE B', async () => {
    const r = await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR));
    assert.ok(r.ok, 'a recusa acima não é isolamento: B também não consegue o dele');
  });

  it('a porta pública de A nunca devolve as cores de B', async () => {
    await comB(async (db) => {
      await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
      return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
    });
    // A unidade de A não tem endereço público nesta prova: a porta responde
    // ausência, e ausência devolve a paleta de origem — nunca a de outro.
    const doA = await temaPublico(prisma, 'nao-existe-este-endereco');
    assert.equal(doA.primaria, TEMA_BOSSAOS.primaria);
    assert.equal(doA.padrao, true);
    assert.equal(doA.revisaoId, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. a descida acontece na DATA e no FUSO da unidade', () => {
  /** Escreve um fuso na unidade e devolve-a ao que estava no fim. */
  async function comFuso<T>(locationId: string, fuso: string | null, fn: () => Promise<T>): Promise<T> {
    const { rows } = await sql.query('SELECT fuso FROM locations WHERE id = $1', [locationId]);
    const antes = rows[0]?.fuso ?? null;
    await sql.query('UPDATE locations SET fuso = $2, updated_at = now() WHERE id = $1', [locationId, fuso]);
    try {
      return await fn();
    } finally {
      await sql.query('UPDATE locations SET fuso = $2, updated_at = now() WHERE id = $1', [locationId, antes]);
    }
  }

  const agendar = async (fuso: string, data: string) =>
    comFuso(IDS.unidadeA, fuso, async () => {
      const { rows } = await sql.query(
        'SELECT agendar_descida($1::uuid, $2::text, $3::date, $4::uuid) AS r',
        [IDS.orgA, 'STARTER', data, IDS.unidadeA]);
      assert.equal(rows[0].r, 'agendada');
      const { rows: s } = await sql.query(
        'SELECT descer_em FROM subscriptions WHERE organization_id = $1', [IDS.orgA]);
      return s[0].descer_em as Date;
    });

  it('a mesma data escrita dá instantes DIFERENTES em fusos diferentes', async () => {
    await assinar(IDS.orgA, 'RESTAURANT');
    const madrid = await agendar('Europe/Madrid', '2026-10-31');
    const auckland = await agendar('Pacific/Auckland', '2026-10-31');
    const losAngeles = await agendar('America/Los_Angeles', '2026-10-31');

    assert.notEqual(madrid.getTime(), auckland.getTime());
    assert.notEqual(madrid.getTime(), losAngeles.getTime());

    // E cada um cai à meia-noite LOCAL do dia escrito.
    for (const [instante, fuso] of [
      [madrid, 'Europe/Madrid'], [auckland, 'Pacific/Auckland'], [losAngeles, 'America/Los_Angeles'],
    ] as const) {
      const local = momentoLocal(instante, fuso);
      assert.equal(local.data, '2026-10-31', `${fuso}: caiu no dia errado`);
      assert.equal(local.minutos, 0, `${fuso}: não caiu à meia-noite local`);
    }
  });

  it('O PAR que mostra porque é que isto importa: a meia-noite UTC cai no dia ANTERIOR', async () => {
    // Era o que o `plataforma.mjs` fazia — `new Date('2026-10-31')`. A oeste de
    // Greenwich, o restaurante perdia as cores um dia antes do que lhe foi dito.
    const utc = new Date('2026-10-31');
    assert.equal(momentoLocal(utc, 'America/Los_Angeles').data, '2026-10-30');
    // E com a correcção, não.
    await assinar(IDS.orgA, 'RESTAURANT');
    const certo = await agendar('America/Los_Angeles', '2026-10-31');
    assert.equal(momentoLocal(certo, 'America/Los_Angeles').data, '2026-10-31');
  });

  it('unidade SEM fuso: recusa e não escreve nada', async () => {
    // Ausência não é política. Escolher UTC por uma unidade sem fuso é inventar
    // o dia em que ela perde as cores.
    await assinar(IDS.orgA, 'RESTAURANT');
    await comFuso(IDS.unidadeA, null, async () => {
      const { rows } = await sql.query(
        'SELECT agendar_descida($1::uuid, $2::text, $3::date, $4::uuid) AS r',
        [IDS.orgA, 'STARTER', '2026-10-31', IDS.unidadeA]);
      assert.equal(rows[0].r, 'sem_fuso');
      const { rows: s } = await sql.query(
        'SELECT descer_em FROM subscriptions WHERE organization_id = $1', [IDS.orgA]);
      assert.equal(s[0].descer_em, null, 'recusou e agendou à mesma');
    });
  });

  it('unidade de OUTRA organização: ausência, não permissão negada', async () => {
    await assinar(IDS.orgA, 'RESTAURANT');
    const { rows } = await sql.query(
      'SELECT agendar_descida($1::uuid, $2::text, $3::date, $4::uuid) AS r',
      [IDS.orgA, 'STARTER', '2026-10-31', IDS.unidadeB]);
    assert.equal(rows[0].r, 'unidade_desconhecida');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. as TRÊS promessas da descida, que falham por caminhos diferentes', () => {
  /** Deixa a organização B com cores próprias publicadas e uma descida vencida. */
  async function comCoresEDescidaVencida() {
    await assinar(IDS.orgB, 'PRO');
    await comB(async (db) => {
      await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
      return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
    });
    await sql.query(
      `UPDATE subscriptions
          SET descer_para_plano_id = (SELECT id FROM plan_definitions WHERE codigo = 'STARTER'),
              descer_em = now() - interval '1 hour', updated_at = now()
        WHERE organization_id = $1`, [IDS.orgB]);
  }

  it('promessa 1 · a aparência reverte quando a data chega', async () => {
    await comCoresEDescidaVencida();
    const r = await comB((db) => aplicarDescidaAgendada(db, IDS.orgB));
    assert.ok(r.aplicada);
    assert.equal(r.temaRevertido, true);

    const activo = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(activo.padrao, true);
    assert.equal(activo.primaria, TEMA_BOSSAOS.primaria);
  });

  it('promessa 2 · o conteúdo fica — e a revisão anterior TAMBÉM', async () => {
    await comCoresEDescidaVencida();
    const antes = await comB((db) => historicoDoTema(db, IDS.orgB, 50));
    await comB((db) => aplicarDescidaAgendada(db, IDS.orgB));
    const depois = await comB((db) => historicoDoTema(db, IDS.orgB, 50));

    // Nenhuma revisão desapareceu: a descida ACRESCENTA a padrão.
    for (const r of antes) {
      assert.ok(depois.some((d) => d.id === r.id), `a descida apagou a revisão ${r.id}`);
    }
    assert.ok(depois.length > antes.length);
    assert.ok(depois.some((d) => !d.padrao && d.primaria === CORES.primaria),
      'as cores próprias sumiram do histórico');
  });

  it('promessa 3 · O PAR que separa reverter de APAGAR: sobe de plano e restaura', async () => {
    // *«Uma implementação que APAGASSE o tema passava as duas primeiras.»*
    await comCoresEDescidaVencida();
    await comB((db) => aplicarDescidaAgendada(db, IDS.orgB));

    // O direito volta.
    await assinar(IDS.orgB, 'PRO');
    const r = await comB(async (db) =>
      restaurarTemaAnterior(db, IDS.orgB, await estadoComercial(db, IDS.orgB)));
    assert.ok(r.ok, 'não havia nada para restaurar — a descida apagou');

    const activo = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(activo.primaria, CORES.primaria);
    assert.equal(activo.padrao, false);

    // E a revisão nova diz DE ONDE veio. A régua reprova «tema aplicado sem
    // dizer de que revisão veio».
    const historico = await comB((db) => historicoDoTema(db, IDS.orgB, 50));
    const nova = historico.find((x) => x.id === r.revisaoId);
    assert.ok(nova?.restauraDeId, 'restaurou sem dizer de que revisão veio');
    assert.equal(nova.publicadaPor, 'restauro-apos-subida');
  });

  it('restaurar sem direito é recusado — subir é que devolve as cores', async () => {
    await comCoresEDescidaVencida();
    await comB((db) => aplicarDescidaAgendada(db, IDS.orgB));
    // Continua em STARTER depois da descida.
    const r = await comB(async (db) =>
      restaurarTemaAnterior(db, IDS.orgB, await estadoComercial(db, IDS.orgB)));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'plano');
  });

  it('A BASE recusa apagar uma revisão publicada, e alterar-lhe as cores', async () => {
    // Isto é o que torna a terceira promessa estrutural em vez de uma intenção:
    // uma implementação futura que quisesse apagar não consegue, e uma que
    // quisesse reescrever a história também não.
    await comB(async (db) => {
      await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
      return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
    });
    const runtime = new Client({ connectionString: RUNTIME });
    await runtime.connect();
    try {
      await runtime.query('BEGIN');
      await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgB]);
      await assert.rejects(
        runtime.query('DELETE FROM theme_revisions WHERE organization_id = $1', [IDS.orgB]),
        /permission denied|permissão negada/i,
        'o runtime conseguiu APAGAR uma revisão de tema',
      );
      await runtime.query('ROLLBACK');

      await runtime.query('BEGIN');
      await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgB]);
      await assert.rejects(
        runtime.query("UPDATE theme_revisions SET primaria = '#000000' WHERE organization_id = $1", [IDS.orgB]),
        /permission denied|permissão negada/i,
        'o runtime conseguiu reescrever as cores de uma revisão publicada',
      );
      await runtime.query('ROLLBACK');

      // O PAR: `activa` continua editável, senão publicar deixava de funcionar.
      await runtime.query('BEGIN');
      await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgB]);
      await runtime.query('UPDATE theme_revisions SET activa = activa WHERE organization_id = $1', [IDS.orgB]);
      await runtime.query('ROLLBACK');
    } finally {
      await runtime.end();
    }
  });

  it('reverter ao padrão NÃO apaga — deixa a revisão anterior onde estava', async () => {
    await comB(async (db) => {
      await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
      return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
    });
    const r = await comB((db) => reverterAoPadrao(db, IDS.orgB));
    assert.equal(r.revertido, true);
    assert.ok(r.revisaoGuardada, 'reverteu e não disse qual guardou');

    const historico = await comB((db) => historicoDoTema(db, IDS.orgB, 50));
    assert.ok(historico.some((x) => x.id === r.revisaoGuardada));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('7. o tema CHEGA à rota pública, e diz de que revisão veio', () => {
  /** Dá um endereço público à unidade de B e apanha-o no fim. */
  async function comEnderecoPublico<T>(fn: (slug: string) => Promise<T>): Promise<T> {
    const slug = 'e12-tema-publico';
    await sql.query('DELETE FROM public_slug_owners WHERE slug = $1', [slug]);
    const { rows } = await sql.query(
      'SELECT reservar_endereco_publico($1::uuid, $2::uuid, $3) AS r',
      [IDS.orgB, IDS.unidadeB, slug]);
    assert.equal(rows[0].r, 'ok', 'não consegui reservar o endereço da prova');
    try {
      return await fn(slug);
    } finally {
      await sql.query('UPDATE locations SET public_slug = NULL WHERE id = $1', [IDS.unidadeB]);
      await sql.query('DELETE FROM public_slug_owners WHERE slug = $1', [slug]);
    }
  }

  it('ANTES de publicar devolve a paleta de origem; DEPOIS devolve as cores', async () => {
    await comEnderecoPublico(async (slug) => {
      const antes = await temaPublico(prisma, slug);
      assert.equal(antes.primaria, TEMA_BOSSAOS.primaria);
      assert.equal(antes.padrao, true);
      assert.equal(antes.revisaoId, null);

      const publicado = await comB(async (db) => {
        await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
        return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
      });
      assert.ok(publicado.ok);

      const depois = await temaPublico(prisma, slug);
      assert.equal(depois.primaria, CORES.primaria);
      assert.equal(depois.padrao, false);
      // De que revisão veio. Sem isto, a aparência era a única publicação do
      // produto sem rasto.
      assert.equal(depois.revisaoId, publicado.revisaoId);
    });
  });

  it('a porta pública lê SEM sessão — é o visitante da carta que a usa', async () => {
    // `temaActivo` lê com o cliente com escopo e um visitante não tem escopo
    // nenhum. Se `publico_tema` precisasse de sessão, a carta servia sempre a
    // paleta de origem e ninguém dava por isso.
    await comEnderecoPublico(async (slug) => {
      await comB(async (db) => {
        await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
        return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
      });
      const semSessao = new Client({ connectionString: RUNTIME });
      await semSessao.connect();
      try {
        const { rows } = await semSessao.query('SELECT * FROM publico_tema($1)', [slug]);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].primaria, CORES.primaria);
      } finally {
        await semSessao.end();
      }
    });
  });

  it('os DESTINOS são contados, e uma organização sem público não tem nenhum', async () => {
    const semNada = await comB((db) => destinosPublicos(db, IDS.orgB));
    assert.deepEqual(semNada, [], 'inventou destinos a uma organização sem endereço público');

    await comEnderecoPublico(async () => {
      // Com endereço mas sem publicações continua vazio: um endereço público sem
      // carta nem site não é destino de nada.
      const soEndereco = await comB((db) => destinosPublicos(db, IDS.orgB));
      assert.deepEqual(soEndereco, []);
    });
  });

  it('descartar o rascunho não toca no que está no ar', async () => {
    const publicado = await comB(async (db) => {
      await guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES, AUTOR);
      return publicarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), AUTOR);
    });
    assert.ok(publicado.ok);
    await comB(async (db) =>
      guardarRascunho(db, IDS.orgB, await estadoComercial(db, IDS.orgB), {
        ...CORES, primaria: '#2b1b3a',
      }, AUTOR));
    assert.equal(await comB((db) => descartarRascunho(db, IDS.orgB)), true);

    const activo = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(activo.primaria, CORES.primaria);
  });
});
