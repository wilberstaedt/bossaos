/**
 * Dinheiro: unidades mínimas inteiras, com código de moeda.
 *
 * ── A regra que não tem excepção ───────────────────────────────────────────
 *
 * > **Nunca vírgula flutuante.** 10,00 € é `1000` + `EUR`.
 *
 * `0.1 + 0.2` não dá `0.3`, e num sistema que soma comandas o dia inteiro esse
 * cêntimo aparece — primeiro numa caixa que não fecha, depois numa equipa que
 * desiste de contar. O E07 é a primeira etapa onde o dinheiro entra em código de
 * produto, e é aqui que a regra ganha guardas.
 *
 * ── A escala vive AQUI, e não no formatador ────────────────────────────────
 *
 * Quantas casas tem uma moeda é um facto sobre dinheiro, não sobre apresentação.
 * Estava no `packages/i18n`, que é onde os inteiros viram texto — e ter a mesma
 * régua em dois sítios é ter duas réguas: no dia em que uma mudasse, o
 * formatador e o parser discordavam sobre o que é um cêntimo. O i18n passa a
 * importar daqui.
 */

export interface Dinheiro {
  /** Unidades mínimas. `1250` é 12,50 €, e `1250` é 1250 ¥. */
  montanteMenor: number;
  /** ISO 4217, maiúsculas. */
  moeda: string;
}

/**
 * Moedas sem casas decimais ou com três.
 *
 * A lista é curta de propósito: só o que diverge das duas casas. `Intl` sabe
 * isto e podia dizê-lo — mas devolve-o por definição de formatação e não por
 * definição da moeda, e um motor que não conheça a moeda cai para duas sem
 * avisar. Aqui a divergência é explícita e revisível.
 */
const DIGITOS_POR_MOEDA: Readonly<Record<string, number>> = {
  JPY: 0, KRW: 0, CLP: 0, ISK: 0, VND: 0,
  TND: 3, BHD: 3, KWD: 3, JOD: 3, OMR: 3,
};

export function escalaDaMoeda(moeda: string): number {
  return DIGITOS_POR_MOEDA[moeda.toUpperCase()] ?? 2;
}

export function moedaValida(moeda: string): boolean {
  return /^[A-Z]{3}$/.test(moeda);
}

/**
 * Lê o que uma pessoa escreveu e devolve unidades mínimas.
 *
 * **Não usa `parseFloat`, e é essa a razão de existir.** `parseFloat('8.07') *
 * 100` dá `806.9999999999999`, e `Math.round` disfarça-o até ao valor onde não
 * disfarça. Isto trabalha nos dígitos: separa a parte inteira da decimal, enche
 * ou corta à escala da moeda, e concatena. Nunca há um `number` fraccionário no
 * meio.
 *
 * Aceita vírgula e ponto como separador decimal, porque quem escreve preços em
 * Espanha escreve `8,00` e o teclado de um telemóvel dá `8.00`. **Não** aceita
 * separador de milhares: `1.234,56` e `1,234.56` são ambíguos entre convenções,
 * e adivinhar qual é seria escolher o preço errado por um factor de mil.
 */
export function deTextoParaMenor(texto: string, moeda: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '');
  if (limpo === '') return null;
  const m = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(limpo);
  if (!m) return null;

  const sinal = m[1] === '-' ? -1 : 1;
  const inteira = m[2]!;
  const decimalEscrita = m[3] ?? '';
  const casas = escalaDaMoeda(moeda);

  // Mais casas do que a moeda tem é entrada errada, não arredondamento: quem
  // escreve 8,005 num preço em euros ou se enganou ou espera meio cêntimo.
  // Arredondar em silêncio decide por essa pessoa.
  if (decimalEscrita.length > casas) return null;

  const decimal = decimalEscrita.padEnd(casas, '0');
  const juntos = `${inteira}${decimal}`;
  // `Number` sobre uma cadeia só de dígitos é exacto até 2^53, que são noventa
  // mil biliões de cêntimos. O que não é exacto é multiplicar por 100.
  const valor = Number(juntos);
  if (!Number.isSafeInteger(valor)) return null;
  return sinal * valor;
}

/** `800` → `"8,00"` em EUR. Texto para um campo, não para o ecrã do cliente. */
export function deMenorParaTexto(montanteMenor: number, moeda: string): string {
  const casas = escalaDaMoeda(moeda);
  const negativo = montanteMenor < 0;
  const digitos = String(Math.abs(montanteMenor)).padStart(casas + 1, '0');
  const inteira = digitos.slice(0, digitos.length - casas);
  const decimal = digitos.slice(digitos.length - casas);
  return `${negativo ? '-' : ''}${inteira}${casas > 0 ? `,${decimal}` : ''}`;
}

export type ErroDeSoma = { erro: 'moedas_diferentes'; moedas: readonly string[] };

/**
 * Soma dinheiro. **Recusa moedas diferentes em vez de converter.**
 *
 * *"Moeda incompatível é erro. Nunca conversão implícita."* Converter exigiria
 * uma taxa, e uma taxa exige uma data e uma fonte — nada disso está aqui, e
 * inventá-lo daria um total que ninguém consegue reproduzir amanhã.
 */
export function somar(parcelas: readonly Dinheiro[]): Dinheiro | ErroDeSoma {
  if (parcelas.length === 0) throw new Error('somar sem parcelas: qual moeda?');
  const moedas = [...new Set(parcelas.map((p) => p.moeda.toUpperCase()))];
  if (moedas.length > 1) return { erro: 'moedas_diferentes', moedas };
  const total = parcelas.reduce((s, p) => {
    if (!Number.isInteger(p.montanteMenor)) {
      // Um montante fraccionário aqui significa que alguém fez contas em euros
      // algures atrás. Falhar alto é melhor do que arredondar em silêncio.
      throw new Error('montanteMenor tem de ser inteiro (unidades mínimas)');
    }
    return s + p.montanteMenor;
  }, 0);
  return { montanteMenor: total, moeda: moedas[0]! };
}

/**
 * Dividir dinheiro em partes iguais, sem perder nem inventar um cêntimo.
 *
 * ── A ordem do resíduo escreve-se ANTES, e é esta ──────────────────────────
 *
 * «10,00 € por três dá 3,34 + 3,33 + 3,33. Não 3,33 × 3 com um cêntimo a
 * evaporar-se, e não 3,34 × 3 com um cêntimo inventado.» O resíduo vai para as
 * **primeiras** partes, uma unidade a cada, e pára quando acaba.
 *
 * Escolher a ordem depois de ver a diferença é escolher a ordem que faz a conta
 * bater naquele caso — e é por isso que o contrato manda escrevê-la primeiro.
 *
 * A asserção que isto tem de passar **não é** «cada parte é 3,33»: é a **soma
 * das partes ser exactamente o total**. Um teste que soma três valores que ele
 * próprio escolheu para somarem certo não mede nada; o caso que interessa é o
 * que não divide bem.
 */
export function dividirEmPartes(total: Dinheiro, partes: number): Dinheiro[] {
  if (!Number.isInteger(partes) || partes < 1) return [];
  const base = Math.trunc(total.montanteMenor / partes);
  const resto = total.montanteMenor - base * partes;
  return Array.from({ length: partes }, (_, i) => ({
    montanteMenor: base + (i < resto ? 1 : 0),
    moeda: total.moeda,
  }));
}

/**
 * Dividir por pesos — é a divisão por item e por pessoa desigual.
 *
 * O resíduo segue a mesma ordem: às primeiras. E há uma diferença que não é
 * detalhe: aqui o resto pode ser maior do que numa divisão igual, porque o
 * truncar acontece em cada peso. Continua a somar ao total, que é a propriedade
 * que se mede.
 */
export function dividirPorPesos(total: Dinheiro, pesos: readonly number[]): Dinheiro[] {
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (soma <= 0 || pesos.some((p) => p < 0)) return [];
  const brutos = pesos.map((p) => Math.trunc((total.montanteMenor * p) / soma));
  let resto = total.montanteMenor - brutos.reduce((a, b) => a + b, 0);
  return brutos.map((m) => {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    return { montanteMenor: m + extra, moeda: total.moeda };
  });
}
