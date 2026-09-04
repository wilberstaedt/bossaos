import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { comEscopo, obterPrisma, pessoasEAcessos } from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A correcção 5 do marco E11 — e o par que impede o conserto errado.
 *
 * ── O defeito ─────────────────────────────────────────────────────────────
 *
 * `ORG-007` lia `users` pelo cliente do runtime, e recebia nulos. A tela rebentava
 * em `p.user.nome`. Nunca funcionou, e estava assinada como validada porque nunca
 * tinha sido renderizada.
 *
 * ── A forma exacta da separação, medida e não suposta ─────────────────────
 *
 * Escrevi este ficheiro a dizer «o runtime não pode ler `users`». Está errado, e
 * a medição corrigiu-me: o privilégio de `SELECT` **existe**. O que o E04 faz é
 * mais fino — a política `identidade_propria` deixa ver
 * `id = app_utilizador_actual()`, ou seja **a própria linha e mais nenhuma**.
 *
 * Era por isso que a tela de equipa recebia nulos: ela precisa das linhas dos
 * OUTROS, e essas nunca lhe pertenceram.
 *
 * ── O par, escrito pelo revisor ───────────────────────────────────────────
 *
 * > *«A tela renderiza **e** o runtime continua sem conseguir ler `users`
 * > directamente. Consertar dando permissão ao runtime seria trocar um ecrã
 * > partido por um buraco de segurança.»*
 *
 * As duas metades estão neste ficheiro, e a segunda é a que interessa: sem ela,
 * a correcção mais óbvia — alargar a política de `users` — passava no grupo 1 e
 * abria a identidade de toda a gente a qualquer rota do produto.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

after(async () => {
  await sql.end();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. A tela de equipa consegue os nomes', () => {
  it('e traz nome E email de quem pertence à organização', async () => {
    const pessoas = await comA((db) => pessoasEAcessos(db, IDS.orgA));
    assert.ok(pessoas.length > 0, 'não veio ninguém — a tela continuaria vazia');

    // O que rebentava: `p.user.nome` sobre um `user` nulo. Agora tem de vir
    // preenchido, e não basta o objecto existir.
    const comEmail = pessoas.filter((p) => p.user.email !== '');
    assert.ok(
      comEmail.length > 0,
      'nenhuma pessoa trouxe email: a porta devolveu vazio e a tela mostra linhas em branco',
    );
    for (const p of comEmail) {
      assert.match(p.user.email, /@/, `email sem forma de email: ${p.user.email}`);
      assert.equal(typeof p.user.id, 'string');
    }
  });

  it('e as pertenças continuam a vir com o papel — não se perdeu nada pelo caminho', async () => {
    // A reescrita trocou a origem dos nomes. Se tivesse trocado também a das
    // pertenças, a tela mostrava as pessoas certas sem os acessos delas.
    const pessoas = await comA((db) => pessoasEAcessos(db, IDS.orgA));
    const comPapel = pessoas.filter((p) => p.roleAssignments.length > 0);
    assert.ok(comPapel.length > 0, 'ninguém traz papel — os acessos desapareceram');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. O PAR — o runtime continua a não ver a identidade dos outros', () => {
  it('a leitura DIRECTA de `users` devolve SÓ a própria linha', async () => {
    // ── A metade que impede o conserto errado, e a forma exacta dela ──────
    //
    // Escrevi isto primeiro como «o runtime não lê `users`» e estava errado —
    // medi e o privilégio EXISTE. O que o E04 faz é outra coisa, e melhor: a
    // política `identidade_propria` deixa ver `id = app_utilizador_actual()`, ou
    // seja, **a própria linha e mais nenhuma**. Era por isso que a tela de equipa
    // recebia nulos: precisava das linhas dos OUTROS.
    //
    // O par é este. Se alguém alargar a política — ou trocar o cliente por um
    // sem contexto — para pôr a tela de pé, este caso acende.
    const linhas = await comA((db) => db.$queryRaw<{ id: string }[]>`SELECT id FROM users`);
    assert.equal(
      linhas.length, 1,
      `a leitura directa devolveu ${linhas.length} linhas: o runtime passou a ver identidades alheias`,
    );
    assert.equal(linhas[0]?.id, IDS.utilizadorA, 'e a linha visível nem sequer é a do próprio');
  });

  it('e a tela mostra MAIS pessoas do que a leitura directa consegue ver', async () => {
    // A afirmação que junta as duas metades, e a que ficaria vácua sozinha: a
    // porta serve mesmo para alguma coisa. Se a tela mostrasse só uma pessoa,
    // «a porta funciona» e «o runtime lê tudo» seriam indistinguíveis.
    const pelaPorta = await comA((db) => pessoasEAcessos(db, IDS.orgA));
    const directas = await comA((db) => db.$queryRaw<unknown[]>`SELECT id FROM users`);
    assert.ok(
      pelaPorta.filter((p) => p.user.email !== '').length > directas.length,
      'a porta não trouxe mais identidades do que a leitura directa — ou não serve, ou o runtime lê tudo',
    );
  });

  it('e a política de linha de `users` continua a ser a do E04', async () => {
    // Mede a CAUSA e não só o efeito: um filtro em TypeScript por cima de uma
    // política alargada daria zero no caso de cima com o buraco na mesma.
    const { rows } = await sql.query(
      `SELECT pg_get_expr(polqual, polrelid) AS expr FROM pg_policy
        WHERE polrelid = 'users'::regclass AND polname = 'identidade_propria'`);
    assert.equal(
      (rows[0] as { expr: string } | undefined)?.expr,
      '(id = app_utilizador_actual())',
      'a política de identidade própria mudou de forma — a separação do E04 deixou de valer',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. A porta verifica QUEM CHAMA, e não só quem é pedido', () => {
  it('pedir a organização ALHEIA devolve zero, mesmo sendo SECURITY DEFINER', async () => {
    // A `identidade_por_email` do E03 aceita qualquer email porque devolve só um
    // id. Esta devolve nome e email — e sem esta verificação, qualquer rota do
    // runtime enumerava a equipa de qualquer inquilino, com o `SECURITY DEFINER`
    // a passar por cima do RLS a fazê-lo.
    const alheias = await comA((db) => db.$queryRaw<unknown[]>`
      SELECT * FROM identidades_da_organizacao(${IDS.orgB}::uuid)`);
    assert.equal(alheias.length, 0, 'a porta devolveu identidades de outro inquilino');
  });

  it('e o PAR: pedir a PRÓPRIA devolve as pessoas dela', async () => {
    // Sem isto, uma função que devolvesse sempre zero passava no caso de cima e
    // deixava a tela vazia — «isola» tudo, e não serve para nada.
    const proprias = await comA((db) => db.$queryRaw<unknown[]>`
      SELECT * FROM identidades_da_organizacao(${IDS.orgA}::uuid)`);
    assert.ok(proprias.length > 0, 'a porta não devolveu ninguém da própria organização');
  });

  it('e vale nos dois sentidos: B também não vê a equipa de A', async () => {
    const deA = await comB((db) => db.$queryRaw<unknown[]>`
      SELECT * FROM identidades_da_organizacao(${IDS.orgA}::uuid)`);
    assert.equal(deA.length, 0, 'B enumerou a equipa de A');
  });

  it('sem contexto de sessão, a porta FALHA FECHADA', async () => {
    // `app_organizacao_actual()` é NULL fora de uma transacção com contexto, a
    // comparação dá NULL, e não sai uma linha. Falhar aberto aqui seria pior do
    // que o defeito que se está a corrigir.
    const semContexto = await prisma.$queryRaw<unknown[]>`
      SELECT * FROM identidades_da_organizacao(${IDS.orgA}::uuid)`;
    assert.equal(semContexto.length, 0, 'a porta devolveu identidades sem contexto de sessão');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. A porta devolve o MÍNIMO', () => {
  it('só id, email e nome — nada da tabela de identidade sai a mais', async () => {
    // `users` guarda mais do que isto. A interface mínima do CT-04 é uma
    // propriedade da porta, e mede-se contando as colunas que ela devolve.
    const linhas = await comA((db) => db.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM identidades_da_organizacao(${IDS.orgA}::uuid) LIMIT 1`);
    assert.ok(linhas[0], 'não veio linha nenhuma para medir');
    assert.deepEqual(Object.keys(linhas[0]).sort(), ['email', 'id', 'nome']);

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'users'`);
    assert.ok(
      (rows[0] as { n: number }).n > 3,
      'a tabela `users` tem 3 colunas ou menos — a medição do mínimo deixou de medir algo',
    );
  });
});
