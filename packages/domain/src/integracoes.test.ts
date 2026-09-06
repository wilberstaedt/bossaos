import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  destinoPermitido, doisDinheiros, estadoDaChave, redigir, temEscopo,
} from './integracoes.ts';

/**
 * A etapa em que o defeito RENDE DINHEIRO a quem o encontrar.
 *
 * O grupo 3 é o que paga a etapa — mas a decisão do webhook mede-se contra a
 * base, em `provas/integracoes.test.ts`, porque a garantia é um gatilho e uma
 * permissão, e nenhuma das duas é uma função pura.
 */

const T = (iso: string) => new Date(iso);
const AGORA = T('2026-09-06T12:00:00.000Z');

describe('1. O âmbito verifica-se por operação', () => {
  it('a chave certa passa, a de âmbito errado não', () => {
    assert.equal(temEscopo(['CATALOGO_LER'], 'CATALOGO_LER'), true);
    assert.equal(temEscopo(['CATALOGO_LER'], 'CATALOGO_ESCREVER'), false);
  });

  it('ler não dá escrever — e é o par que interessa', () => {
    // Sem este caso, uma implementação que devolvesse sempre `true` passava o
    // primeiro. E «ler dá escrever» é o erro que se escreve sozinho quando
    // alguém decide simplificar os âmbitos.
    const soLeitura = ['CATALOGO_LER', 'PEDIDOS_LER', 'RELATORIOS_LER'] as const;
    assert.equal(temEscopo(soLeitura, 'CATALOGO_ESCREVER'), false);
    assert.equal(temEscopo(soLeitura, 'PEDIDOS_ESCREVER'), false);
  });
});

describe('2. Revogar corta já, e expirar é outra coisa', () => {
  it('uma chave viva é válida', () => {
    assert.equal(
      estadoDaChave({ revogadaEm: null, expiraEm: T('2027-01-01') }, AGORA), 'valida');
  });

  it('revogada há um segundo já não vale', () => {
    // No mesmo segundo, não no próximo ciclo de cache. O caso em que se revoga
    // é alguém ter levado a chave.
    const umSegundoAntes = new Date(AGORA.getTime() - 1000);
    assert.equal(
      estadoDaChave({ revogadaEm: umSegundoAntes, expiraEm: T('2027-01-01') }, AGORA),
      'revogada');
  });

  it('expirada é EXPIRADA e não revogada — são coisas diferentes', () => {
    // Confundi-las apagava a informação que interessa a quem lê o registo: uma
    // chave que caducou sozinha e uma que alguém cortou não contam a mesma
    // história.
    assert.equal(
      estadoDaChave({ revogadaEm: null, expiraEm: T('2026-01-01') }, AGORA), 'expirada');
  });

  it('revogada E expirada conta como REVOGADA, porque foi isso que alguém fez', () => {
    assert.equal(
      estadoDaChave({ revogadaEm: T('2026-02-01'), expiraEm: T('2026-01-01') }, AGORA),
      'revogada');
  });

  it('CONTROLO NEGATIVO: com a revogação ignorada, os dois casos acima caem', () => {
    // O plante: um estado que só olha para o prazo. É o defeito realista —
    // alguém a «simplificar» a função para uma comparação de datas.
    const soPrazo = (c: { revogadaEm: Date | null; expiraEm: Date }) =>
      (c.expiraEm <= AGORA ? 'expirada' : 'valida');

    const revogadaEViva = { revogadaEm: new Date(AGORA.getTime() - 1000), expiraEm: T('2027-01-01') };
    assert.equal(soPrazo(revogadaEViva), 'valida');
    assert.equal(estadoDaChave(revogadaEViva, AGORA), 'revogada');
  });
});

describe('3. Destinos: nada da rede interna, e nem por redireccionamento', () => {
  it('um destino público em https passa', () => {
    assert.deepEqual(destinoPermitido('https://exemplo.example/hook'), { ok: true });
  });

  it('http simples é recusado — o corpo assinado ia em claro', () => {
    assert.equal(destinoPermitido('http://exemplo.example/hook').ok, false);
  });

  for (const mau of [
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.5/hook',
    'https://172.16.3.9/hook',
    'https://192.168.1.1/hook',
    // O que interessa mesmo: os metadados da nuvem.
    'https://169.254.169.254/latest/meta-data/',
    'https://painel.internal/admin',
    'https://base.local/',
    'https://[::1]/hook',
    // A forma de escrever 127.0.0.1 que o URL normaliza para hexadecimal.
    'https://[::ffff:127.0.0.1]/hook',
    'https://[::ffff:169.254.169.254]/latest/meta-data/',
    'https://[fd00::1]/hook',
  ]) {
    it(`recusa ${mau}`, () => {
      const r = destinoPermitido(mau);
      assert.equal(r.ok, false, `${mau} passou: o nosso servidor vai ler o que só ele vê`);
      assert.equal(r.ok === false && r.razao, 'rede_interna');
    });
  }

  it('e um endereço que nem é endereço é recusado sem rebentar', () => {
    assert.equal(destinoPermitido('nao e um url').ok, false);
  });

  it('CONTROLO NEGATIVO: com a verificação só do prefixo, o link-local passa', () => {
    // O plante realista: alguém verifica «começa por https» e dá-se por
    // satisfeito. É a versão que quase toda a gente escreve à primeira.
    const soPrefixo = (u: string) => ({ ok: u.startsWith('https://') });
    assert.equal(soPrefixo('https://169.254.169.254/latest/meta-data/').ok, true);
    assert.equal(destinoPermitido('https://169.254.169.254/latest/meta-data/').ok, false);
  });
});

describe('4. Os dois dinheiros não somam', () => {
  it('o par existe, e NÃO há total', () => {
    const d = doisDinheiros(120_00, 49_00, 'EUR');
    assert.equal(d.daCasaMenor, 120_00);
    assert.equal(d.doSaasMenor, 49_00);
    // A propriedade que interessa: não existe caminho para o total. Não é que
    // ninguém o calcule — é que a forma não o tem.
    assert.equal('total' in d, false,
      'apareceu um total: responde a uma pergunta que ninguém faz');
    assert.equal(Object.keys(d).sort().join(','), 'daCasaMenor,doSaasMenor,moeda');
  });
});

describe('5. O registo não leva segredos', () => {
  it('as chaves sensíveis saem redigidas, em qualquer profundidade', () => {
    const cru = {
      accao: 'chamada',
      headers: { Authorization: 'Bearer abc123', 'content-type': 'application/json' },
      corpo: { itens: [{ nome: 'café', token: 'tok_live_zzz' }] },
    };
    const limpo = redigir(cru) as Record<string, unknown>;
    const texto = JSON.stringify(limpo);
    assert.ok(!texto.includes('abc123'), 'a credencial ficou no registo');
    assert.ok(!texto.includes('tok_live_zzz'), 'o token ficou no registo, dentro de um array');
    // E o que não é segredo continua lá — senão o registo deixava de servir.
    assert.ok(texto.includes('café'));
    assert.ok(texto.includes('application/json'));
  });

  it('CONTROLO NEGATIVO: sem a recursão, o segredo de dentro do array sobrevive', () => {
    const soAoDeCima = (v: Record<string, unknown>) => {
      const s: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) {
        s[k] = k.toLowerCase() === 'authorization' ? '[redigido]' : x;
      }
      return s;
    };
    const cru = { headers: { Authorization: 'Bearer abc' }, corpo: { token: 'tok_zzz' } };
    assert.ok(JSON.stringify(soAoDeCima(cru)).includes('tok_zzz'));
    assert.ok(!JSON.stringify(redigir(cru)).includes('tok_zzz'));
  });
});
