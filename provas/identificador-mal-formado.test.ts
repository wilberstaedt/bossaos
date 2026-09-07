import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  comEscopo, comEscopoSerializavel, comIdentidade,
  ehIdentificadorMalFormado, IdentificadorMalFormado,
} from '../packages/db/src/escopo.ts';

/**
 * RV100-024: um identificador com forma inválida é «não existe», não «rebentou».
 *
 * ── O defeito, e é uma CLASSE ─────────────────────────────────────────────
 *
 * Um segmento de URL que não seja UUID entra directo num `where` sobre uma
 * coluna `@db.Uuid`. O Postgres levanta `22P02`, o Prisma traduz para `P2023`,
 * e a página devolve 500 **antes** de chegar ao `notFound()` que ela já tem
 * escrito. Foram medidas 128 páginas debaixo de um segmento `[…Id]`, e nenhuma
 * validava a forma antes de consultar.
 *
 * ── Porque é que esta prova não precisa da base ───────────────────────────
 *
 * O que aqui se prova é a TRADUÇÃO: que a falha do Prisma ganha um nome, e que
 * só aquela falha o ganha. Isso mede-se com um cliente falso que levanta o erro
 * que o Prisma levantaria. O `P2023` não foi presumido: está no runtime do
 * cliente, `"InconsistentColumnData": return "P2023"`.
 *
 * O que ISTO NÃO PROVA, e fica declarado: que o 404 chega ao navegador. Essa
 * ponta atravessa o `comEscopoDoPedido`, o Next e uma consulta verdadeira, e
 * pede o arnês — que estava a ser usado por outro implementador quando isto se
 * escreveu. Está por medir, e não por medir «depois»: é uma pendência com nome.
 */

/** Um cliente que só sabe fazer uma coisa: levantar o erro que se lhe der. */
function clienteQueLevanta(erro: unknown) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: async (fn: (tx: any) => Promise<unknown>) => fn({
      $executeRaw: async () => 0,
      // A consulta de dentro é que rebenta, como rebenta na vida real: o
      // `set_config` passa, e o `findFirst` com o id mal formado é que cai.
      qualquerModelo: { findFirst: async () => { throw erro; } },
    }),
  } as never;
}

/**
 * A forma REAL, medida no erro que chega ao apanhador numa rota do produto.
 *
 * A primeira versão desta prova usava um `P2023` inventado a partir do runtime
 * do Prisma. O `P2023` existe — e não é o que um UUID mal formado produz. Uma
 * prova construída sobre a forma suposta passa e não protege nada: passou, e o
 * produto continuou a dar 500. Agora o erro desta prova é o que foi observado.
 */
const P2007 = Object.assign(
  new Error('\nInvalid `prisma.location.findFirst()` invocation:\n\n\n'
    + 'Invalid input value: invalid input syntax for type uuid: "nao-e-um-uuid"'),
  { code: 'P2007', name: 'PrismaClientKnownRequestError' },
);
/** A outra forma, que o Prisma também sabe produzir. Reconhecer as duas. */
const P2023 = Object.assign(
  new Error('Inconsistent column data: Error creating UUID'), { code: 'P2023' },
);
const ORG = '11111111-1111-4111-8111-111111111111';

describe('RV100-024: o identificador mal formado ganha nome', () => {
  it('o `comEscopo` traduz o P2023 num IdentificadorMalFormado', async () => {
    await assert.rejects(
      () => comEscopo(clienteQueLevanta(P2007), { organizationId: ORG },
        (db) => (db as unknown as { qualquerModelo: { findFirst: () => Promise<unknown> } })
          .qualquerModelo.findFirst()),
      (e: unknown) => {
        assert.ok(e instanceof IdentificadorMalFormado, `veio ${(e as Error)?.name}`);
        assert.equal((e as IdentificadorMalFormado).causa, P2007, 'a causa original perde-se');
        return true;
      },
    );
  });

  it('o `comIdentidade` faz o mesmo — uma rede com um buraco não é uma rede', async () => {
    await assert.rejects(
      () => comIdentidade(clienteQueLevanta(P2023), ORG,
        (db) => (db as unknown as { qualquerModelo: { findFirst: () => Promise<unknown> } })
          .qualquerModelo.findFirst()),
      (e: unknown) => e instanceof IdentificadorMalFormado,
    );
  });

  // ── CONTROLO NEGATIVO, e é o que impede a cura de ser pior ──────────────
  //
  // Converter TUDO em «não existe» esconderia uma falha real por trás de um
  // 404 — e um 404 sobre uma falha real é pior do que o 500, porque ninguém a
  // vai procurar. A tradução tem de ser estreita, e é isso que se mede aqui.
  it('um erro de base NÃO vira identificador mal formado', async () => {
    const outro = Object.assign(new Error('deadlock detected'), { code: '40P01' });
    await assert.rejects(
      () => comEscopo(clienteQueLevanta(outro), { organizationId: ORG },
        (db) => (db as unknown as { qualquerModelo: { findFirst: () => Promise<unknown> } })
          .qualquerModelo.findFirst()),
      (e: unknown) => {
        assert.ok(!(e instanceof IdentificadorMalFormado), 'um deadlock foi convertido em «não existe»');
        assert.equal((e as { code?: string }).code, '40P01');
        return true;
      },
    );
  });

  it('o `comEscopoSerializavel` também traduz — era o terceiro funil', async () => {
    // Estava sem tradutor. O `exigirUuid` lá dentro guarda UM campo, o da
    // organização, e deixa cru qualquer outro id tocado na transacção. É o
    // invólucro usado onde se reserva uma mesa.
    await assert.rejects(
      () => comEscopoSerializavel(clienteQueLevanta(P2023), { organizationId: ORG }, 'chave',
        (db) => (db as unknown as { qualquerModelo: { findFirst: () => Promise<unknown> } })
          .qualquerModelo.findFirst()),
      (e: unknown) => e instanceof IdentificadorMalFormado,
    );
  });

  // ── O defeito que reabriu o RV100-024 ───────────────────────────────────
  //
  // Havia duas verificações para a mesma coisa e não eram equivalentes: o
  // `sessao.ts` perguntava `instanceof` e o `servidor.ts` perguntava `code`, e
  // a classe não copiava o `code`. Para um dado erro, no máximo uma acertava —
  // e foi por isso que a mesma rota dava 500 por um caminho e 404 pelo outro,
  // no MESMO build.
  it('o reconhecedor reconhece a instância que o próprio sistema cria', () => {
    const convertido = new IdentificadorMalFormado(P2023);
    assert.equal(ehIdentificadorMalFormado(convertido), true,
      'o sistema criou um erro que o seu próprio reconhecedor não reconhece');
  });

  it('o reconhecedor distingue, e não diz que sim a tudo', () => {
    assert.equal(ehIdentificadorMalFormado(P2007), true, 'a forma MEDIDA não é reconhecida');
    assert.equal(ehIdentificadorMalFormado(P2023), true);
    // O `P2007` é «erro de validação de dados» em geral. Só o que fala de uuid
    // é isto — converter os outros em «não existe» escondia falhas alheias.
    assert.equal(
      ehIdentificadorMalFormado(Object.assign(new Error('Invalid input value: too long'), { code: 'P2007' })),
      false, 'um P2007 que não fala de uuid foi convertido em «não existe»',
    );
    assert.equal(ehIdentificadorMalFormado(new Error('qualquer coisa')), false);
    assert.equal(ehIdentificadorMalFormado({ code: 'P2002' }), false, 'P2002 é chave duplicada');
    assert.equal(ehIdentificadorMalFormado(null), false);
    assert.equal(ehIdentificadorMalFormado('P2023'), false, 'uma string não é um erro');
  });
});
