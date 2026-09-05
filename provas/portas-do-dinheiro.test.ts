import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * As portas do dinheiro: o webhook do adquirente e o ciclo do documento fiscal.
 *
 * ── Porque é que esta prova lê FICHEIROS e não corre a base ───────────────
 *
 * O que ela mede não é o comportamento — isso está medido em `adquirente.test.ts`
 * e `fiscal.test.ts`, com base e tudo. O que ela mede é **o alcance**: que existe
 * código de produto a chamar aquelas funções.
 *
 * É a pergunta que uma suite verde nunca responde. O E23 foi assinado com o
 * `receberWebhook` sem chamador nenhum, e a `provar-adquirente` jurava que o
 * reenvio deduplicava — numa porta que não existia. Uma máquina provada e sem
 * quem a chame é uma máquina que não está no produto.
 *
 * ── E é por isso que o controlo negativo é apagar a CHAMADA ───────────────
 *
 * Não o comportamento: a chamada. Se a asserção ficar verde depois de eu apagar
 * a linha que chama, ela não mede o produto — mede a existência da função, que
 * já está medida noutro sítio.
 */

const WEB = join(process.cwd(), 'apps/web');
const ler = (caminho: string) => readFileSync(join(WEB, caminho), 'utf8');

/** Todo o código de produto, para procurar chamadas. */
function produtoInteiro(): string {
  const ficheiros = execSync(
    "git ls-files 'apps/web/**/*.ts' 'apps/web/**/*.tsx'", { encoding: 'utf8' },
  ).split('\n').filter(Boolean);
  return ficheiros.map((f) => readFileSync(f, 'utf8')).join('\n');
}

describe('1 · o webhook do adquirente tem porta', () => {
  const ROTA = 'app/api/webhooks/pagamentos/[provedor]/route.ts';

  it('há uma rota, e ela CHAMA o receberWebhook', () => {
    const conteudo = ler(ROTA);
    assert.match(conteudo, /receberWebhook\(/,
      'a rota do webhook não chama a porta que confere a assinatura');
  });

  it('e chama a reconciliação: um acontecimento gravado e não aplicado é um facto que ninguém usou', () => {
    assert.match(ler(ROTA), /reconciliarComProvedor\(/,
      'o webhook grava o acontecimento e não reconcilia');
  });

  it('o corpo vai CRU, e o segredo vem do ambiente', () => {
    const conteudo = ler(ROTA);
    assert.match(conteudo, /await pedido\.text\(\)/,
      'o corpo tem de ser lido cru: reconvertê-lo muda a ordem das chaves');
    assert.doesNotMatch(conteudo, /pedido\.json\(\)/,
      'a rota lê o corpo como JSON e a assinatura deixaria de bater');
    assert.match(conteudo, /process\.env\[/,
      'o segredo do adquirente tem de vir do ambiente, nunca da base');
  });

  it('e a recusa NÃO diz porquê a quem a enviou', () => {
    const conteudo = ler(ROTA);
    assert.doesNotMatch(conteudo, /ASSINATURA_INVALIDA/,
      'a rota devolve o motivo da recusa: é um manual de como forjar a assinatura');
  });

  it('o trilho do adquirente é LIDO por alguma tela', () => {
    assert.match(produtoInteiro(), /acontecimentosDaConta\(/,
      'quem tem de reconciliar não vê o que o banco disse');
  });
});

describe('2 · o ciclo do documento fiscal tem porta', () => {
  const produto = produtoInteiro();

  it('pedirDocumento é chamado em produto', () => {
    assert.match(produto, /pedirDocumento\(/,
      'nada no produto pode PEDIR um documento fiscal');
  });

  it('enviarDocumento é chamado em produto', () => {
    assert.match(produto, /enviarDocumento\(/,
      'nada no produto pode ENVIAR um documento fiscal');
  });

  it('responderDocumento é chamado em produto', () => {
    assert.match(produto, /responderDocumento\(/,
      'nada no produto pode registar a RESPOSTA do fornecedor');
  });

  it('corrigirDocumento é chamado em produto', () => {
    assert.match(produto, /corrigirDocumento\(/,
      'nada no produto pode CORRIGIR um documento fiscal');
  });

  it('e as quatro chamadas estão na rota do TPV, com escopo de inquilino', () => {
    const rota = ler('app/api/org/[orgSlug]/tpv/route.ts');
    for (const fn of ['pedirDocumento', 'enviarDocumento', 'responderDocumento',
      'corrigirDocumento']) {
      assert.match(rota, new RegExp(`${fn}\\(`),
        `${fn} não é chamado pela rota que resolve a sessão`);
    }
    // Guarda de leitor cego: sem isto, um ficheiro vazio passaria as quatro.
    assert.ok(rota.length > 2000, 'não li a rota — a comparação seria vazia');
  });
});
