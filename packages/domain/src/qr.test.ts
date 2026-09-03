import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VERSAO_MAXIMA, capacidadeEmDados, codificar, correccao, descodificar,
  estruturaDeBlocos, infoDeFormato, infoDeVersao, lado, modulosDeDadosDaVersao,
  palavrasTotais,
  paraSvg, percursoDeDados, sindromes, versaoParaBytes,
  type NivelDeCorreccao,
} from './qr.ts';

const NIVEIS: readonly NivelDeCorreccao[] = ['L', 'M', 'Q', 'H'];
const URL = 'https://bossaos.mwdeveloper.tech/r/marina-oropesa/es-ES/menu';

/**
 * ── Como é que isto se verifica sem um leitor de referência ────────────────
 *
 * Não tenho descodificador de terceiros e não vou dizer "corri e deu". São
 * quatro medidas, cada uma capaz de apanhar uma classe diferente de erro, e três
 * delas **não passam pelo meu codificador**.
 */

describe('1. A tabela de blocos contra a GEOMETRIA da matriz', () => {
  it('TRÊS contas independentes têm de bater certo, versão a versão', () => {
    // ── Porque é que são três e não duas ──────────────────────────────────
    //
    // A primeira versão deste caso comparava a reserva de padrões escrita no
    // TESTE com os totais publicados — e a do codificador nunca entrava na
    // conta. O controlo negativo mostrou-o: troquei um centro de alinhamento no
    // codificador e **nada ficou vermelho**, porque o teste estava a validar a
    // sua própria cópia.
    //
    // Agora são três:
    //   (a) `modulosDeDadosDaVersao` — a reserva do CODIFICADOR;
    //   (b) `percursoReal` — a reserva escrita outra vez, aqui, a partir da norma;
    //   (c) os totais publicados da norma para as dez primeiras versões.
    //
    // E a tabela de blocos entra como quarta: `palavrasTotais` soma dados mais
    // correcção, e tem de dar o mesmo. Um número trocado em qualquer um dos
    // quatro sítios parte a igualdade, e as outras três dizem qual é o errado.
    const PUBLICADOS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

    for (let v = 1; v <= VERSAO_MAXIMA; v++) {
      const doCodificador = Math.floor(modulosDeDadosDaVersao(v) / 8);
      const doTeste = Math.floor(percursoReal(v) / 8);
      const publicado = PUBLICADOS[v - 1]!;

      assert.equal(doCodificador, publicado,
        `v${v}: a reserva do CODIFICADOR dá ${doCodificador} palavras, a norma diz ${publicado}`);
      assert.equal(doTeste, publicado,
        `v${v}: a reserva do TESTE dá ${doTeste} palavras, a norma diz ${publicado}`);

      for (const nivel of NIVEIS) {
        assert.equal(palavrasTotais(v, nivel), publicado,
          `v${v}-${nivel}: a tabela de blocos diz ${palavrasTotais(v, nivel)}`);
      }
    }
  });

  it('e as capacidades de dados crescem com a versão e descem com o nível', () => {
    // Uma âncora barata contra uma tabela baralhada entre níveis: mais correcção
    // é sempre menos espaço, e uma versão maior é sempre mais espaço.
    for (let v = 1; v <= VERSAO_MAXIMA; v++) {
      assert.ok(capacidadeEmDados(v, 'L') > capacidadeEmDados(v, 'M'), `v${v} L>M`);
      assert.ok(capacidadeEmDados(v, 'M') > capacidadeEmDados(v, 'Q'), `v${v} M>Q`);
      assert.ok(capacidadeEmDados(v, 'Q') > capacidadeEmDados(v, 'H'), `v${v} Q>H`);
      if (v > 1) {
        assert.ok(capacidadeEmDados(v, 'L') > capacidadeEmDados(v - 1, 'L'), `v${v} > v${v - 1}`);
      }
    }
  });
});

/** O percurso real, com os padrões de função no sítio. */
function percursoReal(versao: number): number {
  // `percursoDeDados` conta os `null`. Uma matriz vazia dá tudo livre, o que não
  // serve; usa-se a que o codificador produz, onde os padrões já estão fixados,
  // reconstruída aqui a partir do próprio módulo.
  const n = lado(versao);
  const m = Array.from({ length: n }, () => new Array<boolean | null>(n).fill(null));
  reservarComoOCodificador(m, versao);
  return percursoDeDados(versao, m).length;
}

/**
 * A reserva de padrões, escrita OUTRA VEZ e a partir da norma.
 *
 * É a duplicação deliberada que dá valor ao caso: se a reserva do codificador
 * tiver um padrão fora do sítio, esta conta deixa de bater com a dele — e a
 * segunda âncora (os totais publicados) diz qual das duas está errada.
 */
function reservarComoOCodificador(m: (boolean | null)[][], versao: number): void {
  const n = lado(versao);
  const marcar = (l: number, c: number) => { if (l >= 0 && l < n && c >= 0 && c < n) m[l]![c] = false; };
  // Localizadores 7×7 mais separador: 8×8 em cada canto (9×9 contando o
  // separador que entra para dentro).
  for (const [l0, c0] of [[0, 0], [0, n - 8], [n - 8, 0]] as const) {
    for (let l = 0; l < 8; l++) for (let c = 0; c < 8; c++) marcar(l0 + l, c0 + c);
  }
  // Sincronismo.
  for (let i = 0; i < n; i++) { marcar(6, i); marcar(i, 6); }
  // Alinhamento.
  const CENTROS: Record<number, readonly number[]> = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
    7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };
  const centros = CENTROS[versao] ?? [];
  for (const l0 of centros) {
    for (const c0 of centros) {
      const noCanto = (l0 <= 8 && c0 <= 8) || (l0 <= 8 && c0 >= n - 9) || (l0 >= n - 9 && c0 <= 8);
      if (noCanto) continue;
      for (let l = -2; l <= 2; l++) for (let c = -2; c <= 2; c++) marcar(l0 + l, c0 + c);
    }
  }
  // Formato (15 bits em dois sítios) e o módulo escuro.
  for (let i = 0; i < 9; i++) { marcar(8, i); marcar(i, 8); }
  for (let i = 0; i < 8; i++) { marcar(8, n - 1 - i); marcar(n - 1 - i, 8); }
  // Informação de versão.
  if (versao >= 7) {
    for (let i = 0; i < 18; i++) {
      const l = Math.floor(i / 3);
      const c = n - 11 + (i % 3);
      marcar(l, c); marcar(c, l);
    }
  }
}

describe('2. Reed-Solomon: os síndromes de uma palavra válida são zero', () => {
  it('todas as versões e níveis produzem palavras válidas', () => {
    // É a primeira coisa que um descodificador faz. Se a aritmética do corpo de
    // Galois estiver errada — polinómio, tabela de logaritmos, gerador — isto
    // não dá zero, e dá-o **sem passar pelo meu codificador de matriz**.
    for (let v = 1; v <= VERSAO_MAXIMA; v++) {
      for (const nivel of NIVEIS) {
        const { ec, grupos } = estruturaDeBlocos(v, nivel);
        const tamanho = grupos[0]![1];
        const dados = Uint8Array.from({ length: tamanho }, (_x, i) => (i * 37 + 11) & 0xff);
        const palavra = new Uint8Array(tamanho + ec);
        palavra.set(dados);
        palavra.set(correccao(dados, ec), tamanho);
        assert.ok(sindromes(palavra, ec).every((s) => s === 0), `v${v}-${nivel}`);
      }
    }
  });

  it('e UM byte trocado faz os síndromes deixarem de ser zero — é o par', () => {
    // Sem isto, uma implementação de `sindromes` que devolvesse sempre zeros
    // passava no caso de cima e não media nada.
    const dados = Uint8Array.from({ length: 19 }, (_x, i) => i);
    const palavra = new Uint8Array(26);
    palavra.set(dados);
    palavra.set(correccao(dados, 7), 19);
    palavra[5] = (palavra[5]! ^ 0x01) as number;
    assert.ok(sindromes(palavra, 7).some((s) => s !== 0));
  });
});

describe('3. Informação de formato e de versão', () => {
  it('as 32 cadeias de formato estão a pelo menos 7 bits umas das outras', () => {
    // A distância mínima do código BCH(15,5) usado no QR é 7. Um gerador errado
    // ou uma máscara trocada colapsam-na — e é uma propriedade do código, não do
    // meu cálculo, o que a torna uma medida independente.
    const todas: number[] = [];
    for (const nivel of NIVEIS) for (let m = 0; m < 8; m++) todas.push(infoDeFormato(nivel, m));
    assert.equal(new Set(todas).size, 32, 'há cadeias repetidas');
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        const d = ((todas[i]! ^ todas[j]!).toString(2).match(/1/g) ?? []).length;
        assert.ok(d >= 7, `distância ${d} entre ${i} e ${j}`);
      }
    }
  });

  it('a cadeia toda a zeros NÃO é um formato válido', () => {
    // É para isso que serve a máscara 0x5412: sem ela, uma matriz em branco
    // leria-se como um formato legítimo.
    const todas = NIVEIS.flatMap((n) => [0, 1, 2, 3, 4, 5, 6, 7].map((m) => infoDeFormato(n, m)));
    assert.ok(!todas.includes(0));
  });

  it('a informação de versão tem os 6 bits da versão nos 6 bits de cima', () => {
    for (let v = 7; v <= VERSAO_MAXIMA; v++) {
      assert.equal(infoDeVersao(v) >> 12, v);
      // E o resto é BCH: 18 bits ao todo.
      assert.ok(infoDeVersao(v) < (1 << 18));
    }
  });
});

describe('4. Ida e volta', () => {
  it('o URL da carta volta byte a byte', () => {
    for (const nivel of NIVEIS) {
      const codigo = codificar(URL, nivel);
      assert.deepEqual(
        new TextDecoder().decode(descodificar(codigo)), URL,
        `nível ${nivel}`,
      );
    }
  });

  it('acentos e til, que é o que um restaurante tem no nome', () => {
    for (const texto of ['https://x.example/r/marina-oropesa/pt-BR/menu?q=pão', 'Café — Ração']) {
      const codigo = codificar(texto, 'M');
      assert.equal(new TextDecoder().decode(descodificar(codigo)), texto);
    }
  });

  it('em todas as versões, do limite de cada uma', () => {
    // O caso de fronteira: exactamente o que cabe. É onde o terminador e o
    // enchimento se tocam, e onde um `Math.min` a menos parte tudo.
    for (let v = 1; v <= VERSAO_MAXIMA; v++) {
      const bytes = capacidadeEmDados(v, 'L') - (v <= 9 ? 2 : 3);
      const texto = 'a'.repeat(bytes);
      const codigo = codificar(texto, 'L');
      assert.equal(codigo.versao, v, `esperava a versão ${v}`);
      assert.equal(new TextDecoder().decode(descodificar(codigo)), texto, `v${v}`);
    }
  });
});

describe('5. O que o codificador RECUSA', () => {
  it('não trunca: atira quando não cabe', () => {
    // Truncar produziria um QR que LÊ — e leva a um endereço errado. É a pior
    // das saídas, porque parece que funciona.
    const enorme = 'x'.repeat(capacidadeEmDados(VERSAO_MAXIMA, 'H') + 100);
    assert.throws(() => codificar(enorme, 'H'), /não cabem/);
    assert.equal(versaoParaBytes(enorme.length, 'H'), null);
  });

  it('escolhe a versão mais pequena que serve', () => {
    assert.equal(codificar('x'.repeat(10), 'L').versao, 1);
    assert.equal(versaoParaBytes(17, 'L'), 1);
    assert.equal(versaoParaBytes(18, 'L'), 2);
  });
});

describe('6. A forma do código e o SVG', () => {
  it('os três localizadores estão nos cantos', () => {
    const c = codificar(URL, 'M');
    const n = c.modulos.length;
    for (const [l0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      // Anel escuro, miolo escuro, e o quadrado claro entre os dois.
      assert.equal(c.modulos[l0]![c0], true, 'canto do anel');
      assert.equal(c.modulos[l0 + 1]![c0 + 1], false, 'anel claro');
      assert.equal(c.modulos[l0 + 3]![c0 + 3], true, 'miolo');
    }
  });

  it('OS PADRÕES DE ALINHAMENTO ESTÃO NOS CENTROS QUE A NORMA DIZ', () => {
    // ── Contar módulos não apanha um padrão DESLOCADO ─────────────────────
    //
    // A conta das três medidas do grupo 1 é uma CONTAGEM. Mover o centro de
    // alinhamento da versão 7 de 38 para 36 não muda quantos módulos ficam
    // reservados — muda quais. O controlo negativo mostrou-o: troquei o centro e
    // as três contas continuaram a bater certo.
    //
    // Isto olha para a FORMA no sítio: miolo escuro, anel claro à volta, anel
    // escuro por fora. Os centros vêm da cópia do teste, que é independente da
    // do codificador.
    const CENTROS: Record<number, readonly number[]> = {
      2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
      7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
    };

    for (let v = 2; v <= VERSAO_MAXIMA; v++) {
      const bytes = capacidadeEmDados(v, 'L') - (v <= 9 ? 2 : 3);
      const c = codificar('a'.repeat(bytes), 'L');
      const n = c.modulos.length;
      const centros = CENTROS[v]!;
      let vistos = 0;
      for (const l0 of centros) {
        for (const c0 of centros) {
          const noCanto = (l0 <= 8 && c0 <= 8) || (l0 <= 8 && c0 >= n - 9) || (l0 >= n - 9 && c0 <= 8);
          if (noCanto) continue;
          vistos++;
          assert.equal(c.modulos[l0]![c0], true, `v${v}: miolo em (${l0},${c0})`);
          for (const [dl, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]] as const) {
            assert.equal(c.modulos[l0 + dl]![c0 + dc], false,
              `v${v}: anel claro em (${l0 + dl},${c0 + dc})`);
          }
          for (const [dl, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2]] as const) {
            assert.equal(c.modulos[l0 + dl]![c0 + dc], true,
              `v${v}: anel escuro em (${l0 + dl},${c0 + dc})`);
          }
        }
      }
      assert.ok(vistos >= 1, `v${v}: não havia nenhum padrão de alinhamento para medir`);
    }
  });

  it('o módulo escuro está sempre escuro', () => {
    const c = codificar(URL, 'Q');
    assert.equal(c.modulos[c.modulos.length - 8]![8], true);
  });

  it('o sincronismo alterna', () => {
    const c = codificar(URL, 'M');
    const n = c.modulos.length;
    for (let i = 8; i < n - 8; i++) {
      assert.equal(c.modulos[6]![i], i % 2 === 0, `coluna ${i}`);
      assert.equal(c.modulos[i]![6], i % 2 === 0, `linha ${i}`);
    }
  });

  it('o SVG leva QUATRO módulos de margem', () => {
    // A zona de silêncio. Sem ela muitos leitores não encontram o código, e o
    // defeito aparece como "às vezes lê", que é o pior de diagnosticar.
    const c = codificar(URL, 'M');
    const svg = paraSvg(c);
    const total = c.modulos.length + 8;
    assert.ok(svg.includes(`viewBox="0 0 ${total} ${total}"`), svg.slice(0, 120));
    // E o fundo é branco: um QR sobre transparente impresso em papel de cor
    // deixa de ter contraste.
    assert.ok(svg.includes('fill="#fff"'));
  });

  it('o SVG é um caminho só, não um rectângulo por módulo', () => {
    // Uma versão 10 tem 3481 módulos. Três mil rectângulos é um ficheiro que os
    // programas de impressão demoram a abrir.
    const svg = paraSvg(codificar(URL, 'M'));
    assert.equal((svg.match(/<path/g) ?? []).length, 1);
    assert.equal((svg.match(/<rect/g) ?? []).length, 1, 'só o fundo');
  });
});
