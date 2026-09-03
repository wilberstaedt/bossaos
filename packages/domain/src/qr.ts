/**
 * QR de verdade — não um desenho que parece um QR.
 *
 * ── Porque é que isto está escrito à mão ───────────────────────────────────
 *
 * O prompt do E09 é explícito: *"Não use QR ilustrativo como código
 * funcional."* Um quadrado de pontos que não lê é pior do que não haver QR
 * nenhum: imprime-se em cinquenta mesas, ninguém testa, e descobre-se com um
 * cliente a apontar o telemóvel.
 *
 * Não há biblioteca de QR nas dependências e acrescentar uma é uma decisão que
 * não é minha. O que é meu é não entregar um desenho.
 *
 * ── Como é que isto se verifica sem um leitor ──────────────────────────────
 *
 * Não tenho descodificador de referência, e por isso a verificação não é "corri
 * e deu". São quatro medidas independentes, cada uma capaz de apanhar uma classe
 * diferente de erro, e estão todas em `qr.test.ts`:
 *
 * 1. **A tabela de blocos contra a GEOMETRIA.** O número total de palavras de
 *    código de cada versão sai da contagem de módulos livres da matriz — código
 *    que nada tem que ver com a tabela. Se a tabela tiver um número trocado, as
 *    duas contas deixam de bater.
 * 2. **Os síndromes de Reed-Solomon.** Uma palavra RS válida tem todos os
 *    síndromes a zero. É a primeira coisa que um descodificador faz, e mede a
 *    aritmética do corpo de Galois sem depender do meu codificador.
 * 3. **A distância de Hamming da informação de formato.** As 32 cadeias válidas
 *    têm de estar a pelo menos 7 bits umas das outras. Um gerador BCH errado ou
 *    uma máscara trocada colapsam essa distância.
 * 4. **Ida e volta.** Ler a matriz de volta e recuperar os bytes.
 *
 * A leitura física em dois aparelhos **fica como pendência declarada**, que é o
 * que o aceite 1 do E09 permite: *"leia o QR exportado em dois dispositivos
 * reais ou registre o teste físico pendente"*. Uma pendência declarada é uma
 * resposta; um QR não lido que se diz lido não é.
 */

export type NivelDeCorreccao = 'L' | 'M' | 'Q' | 'H';

/** Versões suportadas. A 10-L leva 271 bytes — um URL cabe muitas vezes. */
export const VERSAO_MAXIMA = 10;

// ── Corpo de Galois GF(256), com o polinómio do QR (0x11d) ──────────────────

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
}

const mul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!;

/** O polinómio gerador de grau `grau`: (x-α⁰)(x-α¹)…(x-α^(grau-1)). */
function gerador(grau: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < grau; i++) {
    const seguinte = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      seguinte[j] = (seguinte[j]! ^ g[j]!) as number;
      seguinte[j + 1] = (seguinte[j + 1]! ^ mul(g[j]!, EXP[i]!)) as number;
    }
    g = seguinte;
  }
  return g;
}

/** As palavras de correcção de um bloco de dados. */
export function correccao(dados: Uint8Array, quantas: number): Uint8Array {
  const g = gerador(quantas);
  const resto = new Uint8Array(dados.length + quantas);
  resto.set(dados);
  for (let i = 0; i < dados.length; i++) {
    const factor = resto[i]!;
    if (factor === 0) continue;
    for (let j = 0; j < g.length; j++) {
      resto[i + j] = (resto[i + j]! ^ mul(g[j]!, factor)) as number;
    }
  }
  return resto.slice(dados.length);
}

/**
 * Os síndromes de uma palavra completa (dados + correcção).
 *
 * **Todos a zero quer dizer palavra válida.** É a primeira coisa que um
 * descodificador faz, e é a forma de medir a aritmética sem um descodificador:
 * se o meu corpo de Galois estiver errado, isto não dá zero.
 */
export function sindromes(palavra: Uint8Array, quantas: number): Uint8Array {
  const s = new Uint8Array(quantas);
  for (let i = 0; i < quantas; i++) {
    let v = 0;
    for (const b of palavra) v = mul(v, EXP[i]!) ^ b;
    s[i] = v;
  }
  return s;
}

// ── Tabelas por versão ──────────────────────────────────────────────────────

/** Centros dos padrões de alinhamento, por versão (1 não tem). */
const ALINHAMENTO: readonly (readonly number[])[] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

interface Blocos {
  /** Palavras de correcção por bloco. */
  ec: number;
  /** `[quantosBlocos, palavrasDeDadosPorBloco]`, um ou dois grupos. */
  grupos: ReadonlyArray<readonly [number, number]>;
}

/**
 * A estrutura de blocos da norma (ISO 18004, tabela 9).
 *
 * **Esta tabela é verificada contra a geometria**, não copiada e confiada: o
 * total de palavras de cada versão sai da contagem de módulos livres da matriz,
 * e o teste exige que as duas contas batam certo. Um número trocado aqui parte
 * essa igualdade.
 */
const BLOCOS: Record<number, Record<NivelDeCorreccao, Blocos>> = {
  1: { L: { ec: 7, grupos: [[1, 19]] }, M: { ec: 10, grupos: [[1, 16]] },
       Q: { ec: 13, grupos: [[1, 13]] }, H: { ec: 17, grupos: [[1, 9]] } },
  2: { L: { ec: 10, grupos: [[1, 34]] }, M: { ec: 16, grupos: [[1, 28]] },
       Q: { ec: 22, grupos: [[1, 22]] }, H: { ec: 28, grupos: [[1, 16]] } },
  3: { L: { ec: 15, grupos: [[1, 55]] }, M: { ec: 26, grupos: [[1, 44]] },
       Q: { ec: 18, grupos: [[2, 17]] }, H: { ec: 22, grupos: [[2, 13]] } },
  4: { L: { ec: 20, grupos: [[1, 80]] }, M: { ec: 18, grupos: [[2, 32]] },
       Q: { ec: 26, grupos: [[2, 24]] }, H: { ec: 16, grupos: [[4, 9]] } },
  5: { L: { ec: 26, grupos: [[1, 108]] }, M: { ec: 24, grupos: [[2, 43]] },
       Q: { ec: 18, grupos: [[2, 15], [2, 16]] }, H: { ec: 22, grupos: [[2, 11], [2, 12]] } },
  6: { L: { ec: 18, grupos: [[2, 68]] }, M: { ec: 16, grupos: [[4, 27]] },
       Q: { ec: 24, grupos: [[4, 19]] }, H: { ec: 28, grupos: [[4, 15]] } },
  7: { L: { ec: 20, grupos: [[2, 78]] }, M: { ec: 18, grupos: [[4, 31]] },
       Q: { ec: 18, grupos: [[2, 14], [4, 15]] }, H: { ec: 26, grupos: [[4, 13], [1, 14]] } },
  8: { L: { ec: 24, grupos: [[2, 97]] }, M: { ec: 22, grupos: [[2, 38], [2, 39]] },
       Q: { ec: 22, grupos: [[4, 18], [2, 19]] }, H: { ec: 26, grupos: [[4, 14], [2, 15]] } },
  9: { L: { ec: 30, grupos: [[2, 116]] }, M: { ec: 22, grupos: [[3, 36], [2, 37]] },
       Q: { ec: 20, grupos: [[4, 16], [4, 17]] }, H: { ec: 24, grupos: [[4, 12], [4, 13]] } },
  10: { L: { ec: 18, grupos: [[2, 68], [2, 69]] }, M: { ec: 26, grupos: [[4, 43], [1, 44]] },
        Q: { ec: 24, grupos: [[6, 19], [2, 20]] }, H: { ec: 28, grupos: [[6, 15], [2, 16]] } },
};

export function estruturaDeBlocos(versao: number, nivel: NivelDeCorreccao): Blocos {
  const b = BLOCOS[versao]?.[nivel];
  if (!b) throw new Error(`versão ${versao} fora do suportado (1..${VERSAO_MAXIMA})`);
  return b;
}

/** Palavras de dados que cabem numa versão e nível. */
export function capacidadeEmDados(versao: number, nivel: NivelDeCorreccao): number {
  return estruturaDeBlocos(versao, nivel).grupos.reduce((t, [n, d]) => t + n * d, 0);
}

/** Palavras totais (dados + correcção). */
export function palavrasTotais(versao: number, nivel: NivelDeCorreccao): number {
  const b = estruturaDeBlocos(versao, nivel);
  const blocos = b.grupos.reduce((t, [n]) => t + n, 0);
  return capacidadeEmDados(versao, nivel) + blocos * b.ec;
}

export const lado = (versao: number): number => 17 + versao * 4;

// ── A matriz ────────────────────────────────────────────────────────────────

/** `null` = livre; `true`/`false` = módulo já fixado por padrão de função. */
type Matriz = (boolean | null)[][];

function matrizVazia(versao: number): Matriz {
  const n = lado(versao);
  return Array.from({ length: n }, () => new Array<boolean | null>(n).fill(null));
}

function porPadrao(m: Matriz, versao: number): void {
  const n = lado(versao);
  const por = (l: number, c: number, v: boolean) => {
    if (l >= 0 && l < n && c >= 0 && c < n) m[l]![c] = v;
  };

  // Localizadores nos três cantos, com separador de um módulo à volta.
  for (const [l0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    for (let l = -1; l <= 7; l++) {
      for (let c = -1; c <= 7; c++) {
        const dentro = l >= 0 && l < 7 && c >= 0 && c < 7;
        const anel = l === 0 || l === 6 || c === 0 || c === 6;
        const miolo = l >= 2 && l <= 4 && c >= 2 && c <= 4;
        por(l0 + l, c0 + c, dentro && (anel || miolo));
      }
    }
  }

  // Sincronismo: a linha e a coluna 6, alternadas.
  for (let i = 8; i < n - 8; i++) {
    const v = i % 2 === 0;
    m[6]![i] = v;
    m[i]![6] = v;
  }

  // Alinhamento, excepto onde colide com os localizadores.
  const centros = ALINHAMENTO[versao] ?? [];
  for (const l0 of centros) {
    for (const c0 of centros) {
      const noCanto = (l0 <= 8 && c0 <= 8) || (l0 <= 8 && c0 >= n - 9) || (l0 >= n - 9 && c0 <= 8);
      if (noCanto) continue;
      for (let l = -2; l <= 2; l++) {
        for (let c = -2; c <= 2; c++) {
          por(l0 + l, c0 + c, Math.max(Math.abs(l), Math.abs(c)) !== 1);
        }
      }
    }
  }

  // O módulo escuro, que é sempre escuro e sempre neste sítio.
  m[n - 8]![8] = true;

  // Reserva da informação de formato (preenchida depois de se escolher a
  // máscara). Marca-se como `false` para não receber dados.
  for (let i = 0; i < 9; i++) {
    if (m[8]![i] === null) m[8]![i] = false;
    if (m[i]![8] === null) m[i]![8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8]![n - 1 - i] === null) m[8]![n - 1 - i] = false;
    if (m[n - 1 - i]![8] === null) m[n - 1 - i]![8] = false;
  }

  // Informação de versão (só da 7 para cima).
  if (versao >= 7) {
    const bits = infoDeVersao(versao);
    for (let i = 0; i < 18; i++) {
      const v = ((bits >> i) & 1) === 1;
      const l = Math.floor(i / 3);
      const c = n - 11 + (i % 3);
      m[l]![c] = v;
      m[c]![l] = v;
    }
  }
}

/** BCH(18,6) da informação de versão, gerador 0x1f25. */
export function infoDeVersao(versao: number): number {
  let r = versao << 12;
  for (let i = 0; i < 12; i++) {
    if ((r >> (17 - i)) & 1) r ^= 0x1f25 << (5 - i);
  }
  return (versao << 12) | (r & 0xfff);
}

const BITS_DE_NIVEL: Record<NivelDeCorreccao, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

/**
 * BCH(15,5) da informação de formato, com a máscara 0x5412.
 *
 * A máscara existe para que a cadeia toda a zeros não seja válida — sem ela, uma
 * matriz em branco leria-se como um formato legítimo.
 */
export function infoDeFormato(nivel: NivelDeCorreccao, mascara: number): number {
  const dados = (BITS_DE_NIVEL[nivel] << 3) | mascara;
  let r = dados << 10;
  for (let i = 0; i < 5; i++) {
    if ((r >> (14 - i)) & 1) r ^= 0x537 << (4 - i);
  }
  return ((dados << 10) | (r & 0x3ff)) ^ 0x5412;
}

function porFormato(m: Matriz, nivel: NivelDeCorreccao, mascara: number): void {
  const n = m.length;
  const bits = infoDeFormato(nivel, mascara);
  const b = (i: number) => ((bits >> i) & 1) === 1;

  for (let i = 0; i <= 5; i++) m[8]![i] = b(i);
  m[8]![7] = b(6);
  m[8]![8] = b(7);
  m[7]![8] = b(8);
  for (let i = 9; i <= 14; i++) m[14 - i]![8] = b(i);

  for (let i = 0; i <= 7; i++) m[n - 1 - i]![8] = b(i);
  for (let i = 8; i <= 14; i++) m[8]![n - 15 + i] = b(i);
}

const MASCARAS: ReadonlyArray<(l: number, c: number) => boolean> = [
  (l, c) => (l + c) % 2 === 0,
  (l) => l % 2 === 0,
  (_l, c) => c % 3 === 0,
  (l, c) => (l + c) % 3 === 0,
  (l, c) => (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0,
  (l, c) => ((l * c) % 2) + ((l * c) % 3) === 0,
  (l, c) => (((l * c) % 2) + ((l * c) % 3)) % 2 === 0,
  (l, c) => (((l + c) % 2) + ((l * c) % 3)) % 2 === 0,
];

/**
 * Quantos módulos desta versão recebem dados, segundo a reserva do CODIFICADOR.
 *
 * Existe para ser comparada com duas contas independentes: uma reserva escrita
 * outra vez no teste, e os totais publicados da norma. Sem esta função, o teste
 * comparava a sua própria cópia da tabela consigo mesma — que foi o que
 * aconteceu, e só o controlo negativo do centro de alinhamento o mostrou.
 */
export function modulosDeDadosDaVersao(versao: number): number {
  const m = matrizVazia(versao);
  porPadrao(m, versao);
  return percursoDeDados(versao, m).length;
}

/** A ordem em que os módulos livres recebem bits: zigue-zague de baixo à direita. */
export function percursoDeDados(versao: number, reservados: Matriz): Array<[number, number]> {
  const n = lado(versao);
  const caminho: Array<[number, number]> = [];
  let cima = true;
  for (let cDireita = n - 1; cDireita > 0; cDireita -= 2) {
    // A coluna 6 é de sincronismo e não conta como coluna de dados.
    const cd = cDireita <= 6 ? cDireita - 1 : cDireita;
    for (let i = 0; i < n; i++) {
      const l = cima ? n - 1 - i : i;
      for (const c of [cd, cd - 1]) {
        if (reservados[l]![c] === null) caminho.push([l, c]);
      }
    }
    cima = !cima;
  }
  return caminho;
}

/**
 * A penalidade de uma matriz, pelas quatro regras da norma.
 *
 * Exportada para a **escolha** da máscara poder ser medida. A ida e volta passa
 * com qualquer máscara — a penalidade é o que separa um código que uma câmara lê
 * de um que ela hesita a ler, e é uma propriedade do código, não da câmara.
 */
export function penalidadeDosModulos(modulos: readonly (readonly boolean[])[]): number {
  return penalidade(modulos.map((l) => [...l]) as Matriz);
}

function penalidade(m: Matriz): number {
  const n = m.length;
  const v = (l: number, c: number) => m[l]![c] === true;
  let p = 0;

  // 1: corridas de cinco ou mais da mesma cor.
  for (let i = 0; i < n; i++) {
    for (const linha of [true, false]) {
      let corrida = 1;
      for (let j = 1; j < n; j++) {
        const a = linha ? v(i, j) : v(j, i);
        const b = linha ? v(i, j - 1) : v(j - 1, i);
        if (a === b) corrida++;
        else { if (corrida >= 5) p += corrida - 2; corrida = 1; }
      }
      if (corrida >= 5) p += corrida - 2;
    }
  }
  // 2: blocos 2×2 da mesma cor.
  for (let l = 0; l < n - 1; l++) {
    for (let c = 0; c < n - 1; c++) {
      const a = v(l, c);
      if (a === v(l, c + 1) && a === v(l + 1, c) && a === v(l + 1, c + 1)) p += 3;
    }
  }
  // 3: o padrão 1:1:3:1:1 com quatro claros de um lado — o que se confunde com
  // um localizador e faz o leitor procurar um canto que não existe.
  const ALVO = [true, false, true, true, true, false, true];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 7; j++) {
      for (const linha of [true, false]) {
        const casa = ALVO.every((x, k) => (linha ? v(i, j + k) : v(j + k, i)) === x);
        if (!casa) continue;
        const antes = [j - 4, j - 3, j - 2, j - 1]
          .every((k) => k < 0 || !(linha ? v(i, k) : v(k, i)));
        const depois = [j + 7, j + 8, j + 9, j + 10]
          .every((k) => k >= n || !(linha ? v(i, k) : v(k, i)));
        if (antes || depois) p += 40;
      }
    }
  }
  // 4: desequilíbrio entre escuro e claro.
  let escuros = 0;
  for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (v(l, c)) escuros++;
  const percentagem = (escuros * 100) / (n * n);
  p += Math.floor(Math.abs(percentagem - 50) / 5) * 10;
  return p;
}

// ── Codificação ─────────────────────────────────────────────────────────────

class Bits {
  private readonly bits: number[] = [];
  push(valor: number, quantos: number): void {
    for (let i = quantos - 1; i >= 0; i--) this.bits.push((valor >> i) & 1);
  }
  get comprimento(): number { return this.bits.length; }
  paraBytes(quantos: number): Uint8Array {
    const saida = new Uint8Array(quantos);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i] === 1) saida[i >> 3] = (saida[i >> 3]! | (0x80 >> (i & 7))) as number;
    }
    return saida;
  }
}

/** A versão mais pequena onde `bytes` cabe. `null` se não couber em nenhuma. */
export function versaoParaBytes(quantosBytes: number, nivel: NivelDeCorreccao): number | null {
  for (let v = 1; v <= VERSAO_MAXIMA; v++) {
    // 4 bits de modo + 8 ou 16 de contagem + os dados.
    const contagem = v <= 9 ? 8 : 16;
    const precisos = Math.ceil((4 + contagem + quantosBytes * 8) / 8);
    if (precisos <= capacidadeEmDados(v, nivel)) return v;
  }
  return null;
}

export interface Codigo {
  versao: number;
  nivel: NivelDeCorreccao;
  mascara: number;
  /** `modulos[linha][coluna]`, `true` = escuro. */
  modulos: readonly (readonly boolean[])[];
}

/**
 * Codifica um texto em modo byte.
 *
 * **Atira se não couber.** Truncar produziria um QR que lê — e leva a um
 * endereço errado, que é a pior das saídas: parece que funciona.
 */
export function codificar(texto: string, nivel: NivelDeCorreccao = 'M'): Codigo {
  const dados = new TextEncoder().encode(texto);
  const versao = versaoParaBytes(dados.length, nivel);
  if (versao === null) {
    throw new Error(
      `${dados.length} bytes não cabem em nenhuma versão até ${VERSAO_MAXIMA} no nível ${nivel}`,
    );
  }

  const capacidade = capacidadeEmDados(versao, nivel);
  const bits = new Bits();
  bits.push(0b0100, 4);                       // modo byte
  bits.push(dados.length, versao <= 9 ? 8 : 16);
  for (const b of dados) bits.push(b, 8);
  // Terminador: até quatro zeros, e só os que cabem.
  bits.push(0, Math.min(4, capacidade * 8 - bits.comprimento));
  while (bits.comprimento % 8 !== 0) bits.push(0, 1);
  const corpo = bits.paraBytes(capacidade);
  // Enchimento alternado, como a norma manda.
  for (let i = Math.ceil(bits.comprimento / 8), j = 0; i < capacidade; i++, j++) {
    corpo[i] = j % 2 === 0 ? 0xec : 0x11;
  }

  // Blocos, correcção e intercalação.
  const estrutura = estruturaDeBlocos(versao, nivel);
  const blocosDeDados: Uint8Array[] = [];
  const blocosDeEc: Uint8Array[] = [];
  let posicao = 0;
  for (const [quantos, porBloco] of estrutura.grupos) {
    for (let i = 0; i < quantos; i++) {
      const bloco = corpo.slice(posicao, posicao + porBloco);
      posicao += porBloco;
      blocosDeDados.push(bloco);
      blocosDeEc.push(correccao(bloco, estrutura.ec));
    }
  }

  const intercalado: number[] = [];
  const maiorDados = Math.max(...blocosDeDados.map((b) => b.length));
  for (let i = 0; i < maiorDados; i++) {
    for (const b of blocosDeDados) if (i < b.length) intercalado.push(b[i]!);
  }
  for (let i = 0; i < estrutura.ec; i++) {
    for (const b of blocosDeEc) intercalado.push(b[i]!);
  }

  // Colocação, com as oito máscaras, e fica a de menor penalidade.
  const reservados = matrizVazia(versao);
  porPadrao(reservados, versao);
  const caminho = percursoDeDados(versao, reservados);

  let melhor: { m: Matriz; mascara: number; p: number } | null = null;
  for (let mascara = 0; mascara < 8; mascara++) {
    const m = reservados.map((l) => [...l]);
    const regra = MASCARAS[mascara]!;
    caminho.forEach(([l, c], i) => {
      const byte = intercalado[i >> 3] ?? 0;
      const bit = ((byte >> (7 - (i & 7))) & 1) === 1;
      m[l]![c] = regra(l, c) ? !bit : bit;
    });
    porFormato(m, nivel, mascara);
    const p = penalidade(m);
    if (!melhor || p < melhor.p) melhor = { m, mascara, p };
  }

  const escolhida = melhor!;
  return {
    versao, nivel, mascara: escolhida.mascara,
    modulos: escolhida.m.map((l) => l.map((v) => v === true)),
  };
}

/**
 * Lê os bytes de volta a partir da matriz.
 *
 * Existe para a ida e volta do teste, e **não corrige erros**: assume a matriz
 * intacta, que é o caso quando o que a produziu foi o codificador. Serve para
 * apanhar assimetrias entre colocação, máscara e intercalação — não substitui um
 * leitor a sério.
 */
export function descodificar(codigo: Codigo): Uint8Array {
  const { versao, nivel, mascara } = codigo;
  const reservados = matrizVazia(versao);
  porPadrao(reservados, versao);
  const caminho = percursoDeDados(versao, reservados);
  const regra = MASCARAS[mascara]!;

  const total = palavrasTotais(versao, nivel);
  const bytes = new Uint8Array(total);
  caminho.forEach(([l, c], i) => {
    if (i >= total * 8) return;
    const cru = codigo.modulos[l]![c]!;
    const bit = regra(l, c) ? !cru : cru;
    if (bit) bytes[i >> 3] = (bytes[i >> 3]! | (0x80 >> (i & 7))) as number;
  });

  // Desintercalar, e ficar só com os dados.
  const estrutura = estruturaDeBlocos(versao, nivel);
  const tamanhos: number[] = [];
  for (const [quantos, porBloco] of estrutura.grupos) {
    for (let i = 0; i < quantos; i++) tamanhos.push(porBloco);
  }
  const blocos = tamanhos.map((t) => new Uint8Array(t));
  let k = 0;
  const maior = Math.max(...tamanhos);
  for (let i = 0; i < maior; i++) {
    for (let b = 0; b < blocos.length; b++) {
      if (i < tamanhos[b]!) blocos[b]![i] = bytes[k++]!;
    }
  }
  const corpo = new Uint8Array(tamanhos.reduce((a, b) => a + b, 0));
  let p = 0;
  for (const b of blocos) { corpo.set(b, p); p += b.length; }

  // Cabeçalho: 4 bits de modo + 8/16 de contagem.
  const contagemBits = versao <= 9 ? 8 : 16;
  const ler = (inicio: number, quantos: number): number => {
    let v = 0;
    for (let i = 0; i < quantos; i++) {
      const pos = inicio + i;
      v = (v << 1) | ((corpo[pos >> 3]! >> (7 - (pos & 7))) & 1);
    }
    return v;
  };
  const comprimento = ler(4, contagemBits);
  const saida = new Uint8Array(comprimento);
  for (let i = 0; i < comprimento; i++) saida[i] = ler(4 + contagemBits + i * 8, 8);
  return saida;
}

/**
 * O SVG do código, com a margem obrigatória.
 *
 * **Quatro módulos de margem, e não zero.** A norma chama-lhe zona de silêncio e
 * sem ela muitos leitores não encontram o código — e o defeito aparece como "às
 * vezes lê", que é o pior de diagnosticar.
 *
 * Um só caminho `<path>` em vez de um `<rect>` por módulo: uma versão 10 tem
 * 3481 módulos, e 3481 rectângulos é um ficheiro que os programas de impressão
 * demoram a abrir.
 */
export function paraSvg(codigo: Codigo, opcoes: { margem?: number; tamanho?: number } = {}): string {
  const margem = opcoes.margem ?? 4;
  const n = codigo.modulos.length;
  const total = n + margem * 2;
  const partes: string[] = [];
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (codigo.modulos[l]![c]) partes.push(`M${c + margem} ${l + margem}h1v1h-1z`);
    }
  }
  const tamanho = opcoes.tamanho ?? total * 4;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"`,
    ` width="${tamanho}" height="${tamanho}" shape-rendering="crispEdges"`,
    ` role="img" aria-label="QR">`,
    `<rect width="${total}" height="${total}" fill="#fff"/>`,
    `<path fill="#000" d="${partes.join('')}"/>`,
    `</svg>`,
  ].join('');
}

/** A fracção de módulos escuros. A norma quere-a perto de metade. */
export function densidade(codigo: Codigo): number {
  let escuros = 0;
  for (const linha of codigo.modulos) for (const v of linha) if (v) escuros++;
  const total = codigo.modulos.length ** 2;
  return escuros / total;
}

/**
 * A mesma carga com cada uma das oito máscaras, para se poder comparar.
 *
 * Existe só para o teste: é a forma de exigir que `codificar` escolha a de menor
 * penalidade em vez de a primeira que calhar.
 */
export function penalidadePorMascara(texto: string, nivel: NivelDeCorreccao = 'M'): number[] {
  const base = codificar(texto, nivel);
  const saida: number[] = [];
  for (let mascara = 0; mascara < 8; mascara++) {
    saida.push(penalidadeDosModulos(comMascara(base, mascara).modulos));
  }
  return saida;
}

/** O mesmo código com outra máscara. Só para comparação. */
function comMascara(codigo: Codigo, mascara: number): Codigo {
  const versao = codigo.versao;
  const reservados = matrizVazia(versao);
  porPadrao(reservados, versao);
  const caminho = percursoDeDados(versao, reservados);
  const antiga = MASCARAS[codigo.mascara]!;
  const nova = MASCARAS[mascara]!;
  const m = reservados.map((l) => [...l]);
  for (const [l, c] of caminho) {
    const pintado = codigo.modulos[l]![c]!;
    // Desfaz a máscara antiga e aplica a nova.
    const bit = antiga(l, c) ? !pintado : pintado;
    m[l]![c] = nova(l, c) ? !bit : bit;
  }
  porFormato(m, codigo.nivel, mascara);
  return { ...codigo, mascara, modulos: m.map((l) => l.map((v) => v === true)) };
}
