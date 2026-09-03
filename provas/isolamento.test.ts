import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova de isolamento do E03.
 *
 * O alvo está em `docs/architecture/prova-de-isolamento.md`, escrito no E00,
 * **antes** desta etapa começar — de propósito, para a régua não sair do que a
 * implementação calhou de fazer.
 *
 * Corre com o **papel real de runtime**, por SQL directo. Não pelo cliente
 * Prisma com privilégios de teste, não com a credencial de migração: uma
 * política verificada por quem já pode tudo não foi verificada. O Prisma tem a
 * sua própria secção no fim, porque é o caminho que a aplicação usa de facto.
 */

const RUNTIME = process.env.DATABASE_URL;
if (!RUNTIME) throw new Error('DATABASE_URL em falta — esta prova precisa do papel de runtime');

/**
 * **A consulta positiva.** Escrita UMA vez e usada em dois casos que se decidem
 * um ao outro: com contexto tem de trazer as marcas de A (caso 1); sem contexto
 * nenhum tem de trazer vazio (caso 3). É a comparação entre as duas que separa
 * "a política negou" de "a base está oca" — e sem o caso 3 os outros três são
 * compatíveis com um sistema completamente partido, onde tudo devolve vazio e
 * tudo "nega".
 */
const CONSULTA_POSITIVA = 'SELECT id, nome FROM brands ORDER BY nome';

let cliente: Client;

/**
 * Contexto que **nunca** persiste: faz sempre ROLLBACK.
 *
 * As tentativas de escrita usam este. A razão apareceu ao correr o controlo
 * negativo: com a política desligada, as escritas que deviam ser recusadas
 * passaram — e a marca de A foi mesmo movida para B. A prova corrompeu as
 * fixtures de que depende, e a partir daí só podia ser corrida uma vez.
 *
 * Uma prova que altera o mundo que mede não é uma prova, é uma migração.
 */
async function comContextoDescartavel<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  await cliente.query('BEGIN');
  try {
    await cliente.query('SELECT set_config($1, $2, true)', ['app.organization_id', organizationId]);
    return await fn();
  } finally {
    await cliente.query('ROLLBACK');
  }
}

async function comContexto<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  await cliente.query('BEGIN');
  try {
    await cliente.query('SELECT set_config($1, $2, true)', ['app.organization_id', organizationId]);
    const r = await fn();
    await cliente.query('COMMIT');
    return r;
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  }
}

before(async () => {
  cliente = new Client({ connectionString: RUNTIME });
  await cliente.connect();
  // O papel tem de ser mesmo o de runtime, e não um superuser distraído.
  const { rows } = await cliente.query(
    'SELECT current_user AS papel, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
  );
  assert.equal(rows[0].papel, 'bossaos_app', 'a prova tem de correr com o papel de runtime');
  assert.equal(rows[0].rolsuper, false, 'o papel de runtime não pode ser superuser');
  assert.equal(rows[0].rolbypassrls, false, 'o papel de runtime não pode ter BYPASSRLS');
});

after(async () => {
  await cliente.end();
});

describe('caso 1 — positivo: o contexto funciona', () => {
  it('com contexto de A, a consulta positiva traz as marcas de A', async () => {
    const linhas = await comContexto(IDS.orgA, async () => (await cliente.query(CONSULTA_POSITIVA)).rows);

    // Sem este caso, os três seguintes passam num sistema em que tudo devolve
    // vazio: tudo "nega" e o verde é vácuo.
    assert.ok(linhas.length > 0, 'a consulta positiva tem de trazer linhas');
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].id, IDS.marcaA);
  });

  it('e as unidades de A, que são duas', async () => {
    const linhas = await comContexto(IDS.orgA, async () =>
      (await cliente.query('SELECT id, nome FROM locations ORDER BY nome')).rows,
    );
    assert.equal(linhas.length, 2, 'A tem Marina Playa e Marina Puerto');
  });
});

describe('caso 2 — inquilino alheio: o RLS apanha', () => {
  it('ler a marca de B por id, com contexto de A, não devolve nada', async () => {
    const linhas = await comContexto(IDS.orgA, async () =>
      (await cliente.query('SELECT id FROM brands WHERE id = $1', [IDS.marcaB])).rows,
    );
    // Ausência, e não "proibido": CT-04 manda não revelar existência.
    assert.deepEqual(linhas, []);
  });

  it('e a unidade de B também não', async () => {
    const linhas = await comContexto(IDS.orgA, async () =>
      (await cliente.query('SELECT id FROM locations WHERE id = $1', [IDS.unidadeB])).rows,
    );
    assert.deepEqual(linhas, []);
  });

  it('ESCREVER com organization_id de B é recusado pelo WITH CHECK', async () => {
    // Um SELECT protegido com um UPDATE desprotegido é uma porta: a linha sairia
    // do inquilino A, deixaria de ser vista, e pareceria ter funcionado.
    await assert.rejects(
      () =>
        comContextoDescartavel(IDS.orgA, () =>
          cliente.query(
            `INSERT INTO brands (id, organization_id, nome, slug, updated_at)
             VALUES (gen_random_uuid(), $1, 'Intrusa', 'intrusa', now())`,
            [IDS.orgB],
          ),
        ),
      /row-level security|violates/i,
    );
  });

  it('e MOVER uma linha de A para B também', async () => {
    await assert.rejects(
      () =>
        comContextoDescartavel(IDS.orgA, () =>
          cliente.query('UPDATE brands SET organization_id = $1 WHERE id = $2', [
            IDS.orgB,
            IDS.marcaA,
          ]),
        ),
      /row-level security|violates/i,
    );
  });

  it('a marca de A continua em A depois das duas tentativas', async () => {
    const linhas = await comContexto(IDS.orgA, async () => (await cliente.query(CONSULTA_POSITIVA)).rows);
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].id, IDS.marcaA);
  });
});

describe('caso 3 — SEM CONTEXTO: nega, e nega para o positivo também', () => {
  it('a MESMA consulta do caso 1, fora de contexto, devolve vazio', async () => {
    // Este é o caso que decide. Prova que o vazio do caso 2 vem da POLÍTICA e
    // não de a base estar oca: a mesma consulta que acabou de trazer uma linha
    // traz zero quando não há contexto.
    const { rows } = await cliente.query(CONSULTA_POSITIVA);
    assert.deepEqual(rows, []);
  });

  it('e o contraste está medido, não assumido', async () => {
    const comCtx = await comContexto(IDS.orgA, async () => (await cliente.query(CONSULTA_POSITIVA)).rows);
    const semCtx = (await cliente.query(CONSULTA_POSITIVA)).rows;

    assert.ok(comCtx.length > 0, 'com contexto: traz dados');
    assert.equal(semCtx.length, 0, 'sem contexto: vazio');
    assert.notEqual(comCtx.length, semCtx.length, 'a diferença é o que prova a política');
  });

  it('escrever sem contexto também é recusado', async () => {
    await cliente.query('BEGIN');
    await assert.rejects(
      () =>
        cliente.query(
          `INSERT INTO brands (id, organization_id, nome, slug, updated_at)
           VALUES (gen_random_uuid(), $1, 'Sem contexto', 'sem-contexto', now())`,
          [IDS.orgA],
        ),
      /row-level security|violates/i,
    );
    await cliente.query('ROLLBACK');
  });

  it('um contexto VAZIO nega, e não rebenta', async () => {
    // `set_config(..., '')` faz `current_setting` devolver '', e ''::uuid
    // rebentaria. O NULLIF na função de contexto é o que transforma isso em
    // NULL — que compara falso e nega. Sem ele, uma limpeza de contexto mal
    // feita trocava "negar" por um erro a meio de um serviço.
    await cliente.query('BEGIN');
    await cliente.query('SELECT set_config($1, $2, true)', ['app.organization_id', '']);
    const { rows } = await cliente.query(CONSULTA_POSITIVA);
    await cliente.query('COMMIT');
    assert.deepEqual(rows, []);
  });
});

describe('caso 4 — unidade errada dentro do MESMO inquilino: o RLS não apanha', () => {
  it('as duas unidades de A passam as duas a política', async () => {
    // É suposto. O RLS protege a ORGANIZAÇÃO. Um empregado da Playa e um da
    // Puerto pertencem à mesma, e a política não os distingue — quem os separa
    // é o filtro de serviço. Afirmar aqui que "o RLS isola a unidade" seria
    // acreditar numa protecção que não existe.
    const linhas = await comContexto(IDS.orgA, async () =>
      (await cliente.query('SELECT id FROM locations')).rows,
    );
    const ids = linhas.map((l) => l.id).sort();
    assert.deepEqual(ids, [IDS.unidadeA, IDS.unidadeA2].sort());
  });

  it('o filtro de serviço é que separa, e é explícito', async () => {
    const linhas = await comContexto(IDS.orgA, async () =>
      (await cliente.query('SELECT id FROM locations WHERE id = $1', [IDS.unidadeA])).rows,
    );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].id, IDS.unidadeA);
  });
});

describe('ligação reutilizada: nada sobra do inquilino anterior', () => {
  it('depois do COMMIT o contexto deixa de valer — e volta a cadeia VAZIA, não a NULL', async () => {
    await comContexto(IDS.orgA, async () => {
      const { rows } = await cliente.query(`SELECT current_setting('app.organization_id', true) AS v`);
      assert.equal(rows[0].v, IDS.orgA, 'dentro da transacção o contexto está lá');
    });

    // Escrevi este teste a esperar NULL e falhou. Medido: uma vez que um GUC
    // personalizado é definido numa sessão, o valor de reposição dele é a cadeia
    // VAZIA, não "por definir". `current_setting` devolve '' e não NULL.
    const { rows } = await cliente.query(`SELECT current_setting('app.organization_id', true) AS v`);
    assert.equal(rows[0].v, '', 'o valor de reposição de um GUC personalizado é ""');

    // E é por isso que o NULLIF na função de contexto não é zelo: sem ele, o
    // `''::uuid` REBENTA — em todas as consultas seguintes de uma ligação já
    // usada, que num pool é toda a gente a partir do segundo pedido.
    const funcao = await cliente.query('SELECT app_organizacao_actual() AS v');
    assert.equal(funcao.rows[0].v, null, 'a função transforma "" em NULL, e NULL nega');
  });

  it('CONTROLO NEGATIVO: sem o NULLIF, o mesmo estado seria um erro e não uma recusa', async () => {
    // Prova que a linha acima é carga e não decoração: o cast directo do estado
    // real em que a ligação fica após um commit rebenta.
    await assert.rejects(
      () => cliente.query(`SELECT (NULLIF(current_setting('app.organization_id', true), 'x'))::uuid`),
      /invalid input syntax for type uuid/i,
      'o cast de "" tem de rebentar — se não rebenta, este controlo não prova nada',
    );
  });

  it('depois do ROLLBACK é o mesmo, e a política nega na mesma', async () => {
    await cliente.query('BEGIN');
    await cliente.query('SELECT set_config($1, $2, true)', ['app.organization_id', IDS.orgB]);
    await cliente.query('ROLLBACK');

    const { rows } = await cliente.query('SELECT app_organizacao_actual() AS v');
    assert.equal(rows[0].v, null, 'depois do rollback não sobra contexto válido');

    const consulta = await cliente.query(CONSULTA_POSITIVA);
    assert.deepEqual(consulta.rows, [], 'e a consulta positiva devolve vazio');
  });

  it('e a consulta seguinte na MESMA ligação não vê o inquilino anterior', async () => {
    // É esta a fuga silenciosa que o `set_config` local evita: uma ligação
    // reciclada do pool a levar o restaurante do pedido anterior.
    await comContexto(IDS.orgB, async () => {
      const { rows } = await cliente.query(CONSULTA_POSITIVA);
      assert.equal(rows[0].id, IDS.marcaB, 'dentro do contexto de B vê-se B');
    });
    const depois = (await cliente.query(CONSULTA_POSITIVA)).rows;
    assert.deepEqual(depois, [], 'fora de contexto, nada — nem A nem B');

    // E a seguir, contexto de A na mesma ligação: vê A e só A.
    const emA = await comContexto(IDS.orgA, async () => (await cliente.query(CONSULTA_POSITIVA)).rows);
    assert.equal(emA.length, 1);
    assert.equal(emA[0].id, IDS.marcaA, 'não sobrou nada de B');
  });
});

describe('identidade global: a interface mínima', () => {
  it('sem contexto de utilizador, a tabela de identidades não devolve nada', async () => {
    const { rows } = await cliente.query('SELECT id FROM users');
    assert.deepEqual(rows, [], 'a identidade é excepção documentada, não porta aberta');
  });

  it('a função de email devolve UM id, e mais nada', async () => {
    const { rows, fields } = await cliente.query('SELECT identidade_por_email($1) AS id', [
      'carla@exemplo.example',
    ]);
    assert.equal(rows[0].id, IDS.utilizadorAmbas);
    assert.equal(fields.length, 1, 'só o id: nem nome, nem data, nem existência de mais linhas');
  });

  it('email desconhecido devolve NULL, sem dizer se existe alguém', async () => {
    const { rows } = await cliente.query('SELECT identidade_por_email($1) AS id', [
      'ninguem@exemplo.example',
    ]);
    assert.equal(rows[0].id, null);
  });

  it('com contexto de utilizador, vê-se a própria linha e só essa', async () => {
    await cliente.query('BEGIN');
    await cliente.query('SELECT set_config($1, $2, true)', ['app.user_id', IDS.utilizadorAmbas]);
    const { rows } = await cliente.query('SELECT id, email FROM users');
    await cliente.query('COMMIT');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, IDS.utilizadorAmbas);
  });

  it('e as organizações onde é membro — duas, não todas', async () => {
    await cliente.query('BEGIN');
    await cliente.query('SELECT set_config($1, $2, true)', ['app.user_id', IDS.utilizadorAmbas]);
    const { rows } = await cliente.query('SELECT id FROM organizations ORDER BY slug');
    await cliente.query('COMMIT');
    assert.equal(rows.length, 2, 'a Carla é membro das duas');

    // E quem só é membro de uma vê uma. Se a política estivesse a devolver
    // "todas", este caso passaria na mesma no anterior — a Carla é membro de
    // todas as que existem.
    await cliente.query('BEGIN');
    await cliente.query('SELECT set_config($1, $2, true)', ['app.user_id', IDS.utilizadorA]);
    const so = await cliente.query('SELECT id FROM organizations');
    await cliente.query('COMMIT');
    assert.equal(so.rows.length, 1, 'a Ana é membro de uma só');
    assert.equal(so.rows[0].id, IDS.orgA);
  });
});

/**
 * O caminho que a aplicação usa de facto.
 *
 * As secções acima correm SQL directo com o papel de runtime, que é o que prova
 * a política. Esta corre o Prisma com o mesmo papel, através de `comEscopo` — e
 * é o que prova que o **código do produto** entra no contexto certo. As duas são
 * precisas: uma política certa com um helper errado vaza na mesma.
 */
describe('pelo Prisma, com comEscopo', () => {
  let prisma: Awaited<ReturnType<typeof abrir>>;

  async function abrir() {
    const { obterPrisma } = await import('../packages/db/src/index.ts');
    return obterPrisma(RUNTIME as string);
  }

  before(async () => {
    prisma = await abrir();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('com escopo de A, os repositórios trazem A', async () => {
    const { comEscopo } = await import('../packages/db/src/escopo.ts');
    const { listarMarcas, listarUnidades } = await import('../packages/db/src/repositorios.ts');

    const r = await comEscopo(prisma, { organizationId: IDS.orgA }, async (db) => ({
      marcas: await listarMarcas(db),
      unidades: await listarUnidades(db),
    }));

    assert.equal(r.marcas.length, 1);
    assert.equal(r.marcas[0]?.id, IDS.marcaA);
    assert.equal(r.unidades.length, 2);
  });

  it('a marca de B não existe para o escopo de A', async () => {
    const { comEscopo } = await import('../packages/db/src/escopo.ts');
    const { obterMarca } = await import('../packages/db/src/repositorios.ts');

    const alheia = await comEscopo(prisma, { organizationId: IDS.orgA }, (db) =>
      obterMarca(db, IDS.marcaB),
    );
    assert.equal(alheia, null, 'ausência, não erro — não se revela existência');
  });

  it('a MESMA leitura FORA de comEscopo devolve vazio', async () => {
    // O modo de falha que o `prova-de-isolamento.md` nomeia: não rebenta,
    // devolve lista vazia, e o ecrã diz "sem produtos" a quem tem cem.
    const semEscopo = await prisma.brand.findMany({ orderBy: { nome: 'asc' } });
    assert.deepEqual(semEscopo, [], 'sem contexto o Prisma devolve vazio, não erro');

    const comEscopoModulo = await import('../packages/db/src/escopo.ts');
    const comCtx = await comEscopoModulo.comEscopo(prisma, { organizationId: IDS.orgA }, (db) =>
      db.brand.findMany({ orderBy: { nome: 'asc' } }),
    );
    assert.equal(comCtx.length, 1, 'e com contexto traz — a diferença é a prova');
  });

  it('escrever para outra organização é recusado também pelo Prisma', async () => {
    const { comEscopo } = await import('../packages/db/src/escopo.ts');
    const { criarMarca } = await import('../packages/db/src/repositorios.ts');

    // `comEscopo` faz COMMIT quando a função devolve. Com a política desligada
    // a escrita passaria e ficaria gravada — por isso atira-se de dentro, o que
    // desfaz a transacção quer a política tenha recusado, quer não.
    const SENTINELA = 'a escrita passou e nao devia';
    await assert.rejects(
      () =>
        comEscopo(prisma, { organizationId: IDS.orgA }, async (db) => {
          await criarMarca(db, IDS.orgB, { nome: 'Intrusa', slug: 'intrusa-prisma' });
          throw new Error(SENTINELA);
        }),
      (e: Error) => {
        assert.notEqual(e.message, SENTINELA, 'a política tinha de ter recusado antes disto');
        return /row-level security|violates/i.test(e.message);
      },
    );
  });

  it('comEscopo recusa um identificador que não é UUID, antes de tocar na base', async () => {
    const { comEscopo } = await import('../packages/db/src/escopo.ts');
    await assert.rejects(
      () => comEscopo(prisma, { organizationId: "' OR 1=1 --" }, async () => null),
      /não é um UUID/,
    );
  });

  it('o caminho de identidade resolve o email e as organizações', async () => {
    const { comIdentidade, identidadePorEmail } = await import('../packages/db/src/escopo.ts');
    const { organizacoesDoUtilizador } = await import('../packages/db/src/repositorios.ts');

    const id = await identidadePorEmail(prisma, 'Carla@Exemplo.Example');
    assert.equal(id, IDS.utilizadorAmbas, 'o email é normalizado para minúsculas');

    const orgs = await comIdentidade(prisma, id as string, (db) => organizacoesDoUtilizador(db));
    assert.equal(orgs.length, 2);
  });
});
