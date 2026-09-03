import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * O aceite 2 do E07, medido POR HTTP.
 *
 * > *"modificadores obrigatórios/opcionais e limites min/max validados também
 * > por chamada direta da API"*
 *
 * A prova em `catalogo.test.ts` chama `validarEscolhasDoProduto` — a função. Isso
 * mostra que o motor está certo; **não mostra que a rota o usa**. Esta corre
 * contra a aplicação construída, com sessão real emitida pela biblioteca de
 * autenticação, e faz o que um TPV ou um `curl` fariam.
 *
 * O caso que carrega o aceite é o terceiro: **o corpo manda os seus próprios
 * limites, e a rota ignora-os**. Uma rota que confiasse no que lhe enviam
 * validava o pedido contra as regras do próprio pedido, e passaria os dois
 * primeiros casos sem falhar nenhum.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3012';
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!MIG) throw new Error('MIGRATION_DATABASE_URL em falta');

const SENHA = 'Prova-E07-http-2026';
const marca = Date.now();
const PREFIXO = `e07http-${marca}`;
const CONTA = `dona-cat-${marca}@exemplo.example`;

let sql: Client;
let cookie = '';
let userId = '';
let produto = '';
let grupo = '';
const opcoes: string[] = [];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function registar(): Promise<void> {
  let r: Response | undefined;
  for (let i = 0; i < 6; i++) {
    r = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: 'POST',
      // `origin` é obrigatório: a biblioteca recusa mutações sem ele. É a
      // validação de origem a funcionar, e não se desliga para a prova passar.
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({ email: CONTA, password: SENHA, name: 'Dona do catálogo' }),
    });
    if (r.status !== 429) break;
    await dormir(11_000);
  }
  assert.ok(r?.ok, `registo falhou: ${r?.status} ${await r?.text()}`);
  cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [CONTA]);
  userId = rows[0].id;
}

/** Faz o pedido como quem tem sessão. */
function pedir(corpo: unknown): Promise<Response> {
  return fetch(`${BASE}/api/org/marina-oropesa/produtos/${produto}/opcoes`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify(corpo),
  });
}

/**
 * O arranque guarda o erro em vez de o atirar.
 *
 * Um `before` que atira deixa a ligação ao Postgres aberta, o `after` pode não
 * correr, e o processo **fica pendurado** em vez de falhar — foi o que me
 * aconteceu à primeira, com dez minutos de nada. Assim o erro chega como uma
 * asserção, o `after` fecha sempre, e o diagnóstico aparece no relatório.
 */
let arranque: Error | null = null;

before(async () => {
  try {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  await registar();

  // Pertença e papel por SQL: o caminho de gestão é provado no E04, e repeti-lo
  // aqui só tornava esta prova mais lenta e mais frágil.
  const { rows: m } = await sql.query(
    `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
     ON CONFLICT (organization_id, user_id) DO UPDATE SET estado='ACTIVO', updated_at=now()
     RETURNING id`, [IDS.orgA, userId]);
  await sql.query(
    `INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'OWNER', now())`, [IDS.orgA, m[0].id]);

  const { rows: p } = await sql.query(
    `INSERT INTO products (id, organization_id, brand_id, nome, estado, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVO', now()) RETURNING id`,
    [IDS.orgA, IDS.marcaA, `${PREFIXO} entrecot`]);
  produto = p[0].id;

  // Obrigatório, exactamente UMA escolha. É o que a base sabe, e é o que a rota
  // tem de ir buscar.
  const { rows: g } = await sql.query(
    `INSERT INTO modifier_groups (id, organization_id, brand_id, nome, obrigatorio, minimo, maximo, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, true, 1, 1, now()) RETURNING id`,
    [IDS.orgA, IDS.marcaA, `${PREFIXO} ponto`]);
  grupo = g[0].id;
  for (const [i, nome] of ['Poco hecho', 'Al punto', 'Hecho'].entries()) {
    const { rows: o } = await sql.query(
      `INSERT INTO modifier_options (id, organization_id, group_id, nome, ordem, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, now()) RETURNING id`,
      [IDS.orgA, grupo, nome, i + 1]);
    opcoes.push(o[0].id);
  }
  await sql.query(
    `INSERT INTO product_modifier_groups (id, organization_id, product_id, group_id, ordem)
     VALUES (gen_random_uuid(), $1, $2, $3, 1)`, [IDS.orgA, produto, grupo]);
  } catch (e) {
    arranque = e instanceof Error ? e : new Error(String(e));
  }
});

after(async () => {
  // Fecha SEMPRE, mesmo que o arranque tenha ido a meio: uma ligação aberta
  // mantém o processo vivo e transforma uma falha numa espera.
  if (!sql) return;
  try {
  // Tudo o que esta corrida criou sai, mesmo que ela morra a meio. Foi lixo de
  // uma prova minha que partiu a prova de isolamento do E03 durante o E06.
  await sql.query('DELETE FROM product_modifier_groups WHERE product_id = $1', [produto]);
  await sql.query('DELETE FROM modifier_options WHERE group_id = $1', [grupo]);
  await sql.query('DELETE FROM modifier_groups WHERE id = $1', [grupo]);
  await sql.query('DELETE FROM products WHERE id = $1', [produto]);
  if (userId) {
    await sql.query(
      'DELETE FROM role_assignments WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1)', [userId]);
    await sql.query('DELETE FROM memberships WHERE user_id = $1', [userId]);
    await sql.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await sql.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
    await sql.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  } finally {
    await sql.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
describe('A API valida modificadores, e os limites vêm da BASE', () => {
  it('0. o arranque correu — sem isto, o resto não mede nada', () => {
    assert.equal(arranque, null, `arranque falhou: ${arranque?.message}`);
    assert.ok(produto && grupo && cookie, 'produto, grupo e sessão têm de existir');
  });

  it('1. sem escolher nada, o grupo obrigatório recusa — 422', async () => {
    const r = await pedir({ escolhas: {} });
    assert.equal(r.status, 422, 'o corpo é bem formado; o que falha é o pedido');
    const corpo = await r.json() as { valido: boolean; problemas: { erro: string; grupoId: string }[] };
    assert.equal(corpo.valido, false);
    assert.deepEqual(corpo.problemas, [{ erro: 'obrigatorio', grupoId: grupo }]);
  });

  it('2. uma escolha válida passa — 200. É o par do caso 1', async () => {
    // Sem este, uma rota que devolvesse 422 a tudo passava no caso de cima.
    const r = await pedir({ escolhas: { [grupo]: [opcoes[0]] } });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { valido: true, problemas: [] });
  });

  it('3. O CASO QUE CARREGA O ACEITE: os limites do corpo são ignorados', async () => {
    // O cliente manda os seus próprios limites, a dizer que o grupo é opcional e
    // que aceita três. É o que faria quem quisesse contornar a validação — e é o
    // que uma rota escrita a partir do formulário aceitaria sem pensar.
    const r = await pedir({
      escolhas: {},
      grupos: [{ id: grupo, obrigatorio: false, minimo: 0, maximo: 3 }],
      minimo: 0, maximo: 3, obrigatorio: false,
    });
    assert.equal(r.status, 422, 'os limites do corpo não podem mandar');
    const corpo = await r.json() as { problemas: { erro: string }[] };
    assert.equal(corpo.problemas[0]?.erro, 'obrigatorio');

    // E o simétrico: mandar três opções continua a violar o máximo REAL (1),
    // apesar de o corpo dizer que o máximo é 3.
    const r2 = await pedir({ escolhas: { [grupo]: opcoes }, maximo: 3 });
    assert.equal(r2.status, 422);
    const c2 = await r2.json() as { problemas: { erro: string }[] };
    assert.equal(c2.problemas[0]?.erro, 'acima_do_maximo');
  });

  it('4. sem sessão nenhuma, a rota não responde com validação', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/produtos/${produto}/opcoes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({ escolhas: {} }),
    });
    assert.equal(r.status, 401, 'sem sessão é 401 — não sei quem és');
  });

  it('5. um corpo que não é JSON dá 400, não 500', async () => {
    const r = await fetch(`${BASE}/api/org/marina-oropesa/produtos/${produto}/opcoes`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', origin: BASE },
      body: 'isto não é json',
    });
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { erro: 'corpo_invalido' });
  });
});
