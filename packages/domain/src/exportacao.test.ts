import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VALIDADE_PADRAO_MS, decidirDescarregamento, expiraEm, identificadorAdivinhavel,
  type Exportacao,
} from './exportacao.ts';
import type { Concessao } from './permissoes.ts';

const ORG = 'org-a';
const ACTOR = 'user-1';
const PEDIDA = new Date('2026-09-04T10:00:00Z');

const exportacao = (extra: Partial<Exportacao> = {}): Exportacao => ({
  id: 'K7pQ2mRt9XvB4nLc8ZaYw3Fj',
  organizationId: ORG,
  actorId: ACTOR,
  accaoExigida: 'catalogo.editar',
  criadaEm: PEDIDA,
  expiraEm: expiraEm(PEDIDA),
  ...extra,
});

const COM_DIREITO: Concessao[] = [{ papel: 'OWNER' }];
// KITCHEN TEM `catalogo.ler` — lê a carta no ecrã da cozinha — e NÃO tem
// `catalogo.editar`. É por isso que a acção exigida para exportar não é a de
// ler: ver a carta num ecrã e levar o ficheiro inteiro para fora são coisas
// diferentes, e a primeira versão deste teste usava `catalogo.ler` e ficava
// verde por a cozinha ter esse direito.
const SEM_DIREITO: Concessao[] = [{ papel: 'KITCHEN' }];

const decidir = (extra: Partial<Parameters<typeof decidirDescarregamento>[0]> = {}) =>
  decidirDescarregamento({
    exportacao: exportacao(),
    actorId: ACTOR,
    organizationId: ORG,
    concessoes: COM_DIREITO,
    agora: new Date('2026-09-04T10:30:00Z'),
    ...extra,
  });

describe('1. O SEGUNDO ponto de verificação', () => {
  it('quem pediu com direito e ainda o tem, descarrega', () => {
    assert.deepEqual(decidir(), { ok: true });
  });

  it('QUEM PERDEU O DIREITO ENTRE O PEDIDO E O DESCARREGAMENTO é recusado', () => {
    // É a regra inteira, numa asserção. Pedida às 10h por quem foi despedido às
    // 11h: às 11h30 o ficheiro existe, o link existe, e o descarregamento não.
    //
    // Sem esta verificação a exportação é uma porta que fica aberta atrás da
    // pessoa — e nada no sistema o diria, porque o link continua a "funcionar".
    const r = decidir({ concessoes: SEM_DIREITO });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.erro, 'sem_permissao');
  });

  it('e é o PAR: a mesma exportação, o mesmo instante, só muda a concessão', () => {
    // Sem o par, uma implementação que recusasse tudo passava no caso de cima.
    const agora = new Date('2026-09-04T10:30:00Z');
    assert.equal(decidir({ agora, concessoes: COM_DIREITO }).ok, true);
    assert.equal(decidir({ agora, concessoes: SEM_DIREITO }).ok, false);
  });
});

describe('2. Links privados expiram', () => {
  it('depois da hora, não descarrega', () => {
    assert.equal(decidir({ agora: new Date('2026-09-04T11:30:00Z') }).ok, false);
  });

  it('no instante EXACTO já expirou — semiaberto, como tudo', () => {
    const fim = expiraEm(PEDIDA);
    assert.equal(decidir({ agora: fim }).ok, false);
    assert.equal(decidir({ agora: new Date(fim.getTime() - 1) }).ok, true);
  });

  it('a validade por omissão é uma hora, e isso é uma decisão', () => {
    // Um dia é comodidade para quem exporta e vinte e três horas de janela para
    // quem encontrar o endereço.
    assert.equal(VALIDADE_PADRAO_MS, 3_600_000);
    assert.equal(expiraEm(PEDIDA).toISOString(), '2026-09-04T11:00:00.000Z');
  });

  it('revogada não descarrega, mesmo dentro da validade', () => {
    const r = decidir({ exportacao: exportacao({ revogadaEm: new Date('2026-09-04T10:15:00Z') }) });
    assert.equal(!r.ok && r.erro, 'revogado');
  });
});

describe('3. A exportação é de quem a pediu', () => {
  it('de outra pessoa, na mesma organização', () => {
    const r = decidir({ actorId: 'user-2' });
    assert.equal(!r.ok && r.erro, 'nao_e_seu');
  });

  it('de outra organização recusa ANTES de olhar para a permissão', () => {
    // A ordem não é intercambiável: dizer "não tens permissão" sobre uma
    // exportação alheia confirma que ela existe.
    const r = decidirDescarregamento({
      exportacao: exportacao({ organizationId: 'org-b' }),
      actorId: ACTOR, organizationId: ORG,
      concessoes: SEM_DIREITO,
      agora: new Date('2026-09-04T10:30:00Z'),
    });
    assert.equal(!r.ok && r.erro, 'outra_organizacao');
  });
});

describe('4. O identificador endereça, não autoriza', () => {
  it('os formatos que se contam são recusados', () => {
    for (const mau of ['1', 'exportacao-1', 'export-000042', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'curto']) {
      assert.equal(identificadorAdivinhavel(mau), true, mau);
    }
  });

  it('um identificador com entropia a sério passa', () => {
    assert.equal(identificadorAdivinhavel('K7pQ2mRt9XvB4nLc8ZaYw3Fj'), false);
  });

  it('mas conhecer o identificador NÃO chega — passa pelas cinco verificações', () => {
    // Este é o ponto: mesmo com o endereço completo e correcto, sem direito não
    // há ficheiro. Um sistema em que conhecer o URL basta transforma o histórico
    // do navegador e o `Referer` numa fuga.
    assert.equal(decidir({ concessoes: SEM_DIREITO }).ok, false);
  });
});
