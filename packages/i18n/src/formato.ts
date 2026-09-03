import type { Idioma } from './idiomas.ts';

/**
 * Dinheiro em **unidades mínimas inteiras**, com código de moeda.
 *
 * Nunca vírgula flutuante: `0.1 + 0.2` não dá `0.3`, e num sistema que soma
 * comandas o dia inteiro esse cêntimo aparece. A arquitectura fixa isto (CT-11)
 * e o formatador é o sítio onde a regra encontra o ecrã — é aqui que os inteiros
 * viram texto, e só aqui.
 */
export interface Dinheiro {
  /** Cêntimos, e não euros. 1250 é 12,50 €. */
  montanteMenor: number;
  /** ISO 4217: EUR, BRL, GBP… */
  moeda: string;
}

/** Moedas sem casas decimais (JPY) ou com três (TND). O resto tem duas. */
const DIGITOS_POR_MOEDA: Record<string, number> = { JPY: 0, KRW: 0, TND: 3, BHD: 3, KWD: 3 };

function digitos(moeda: string): number {
  return DIGITOS_POR_MOEDA[moeda.toUpperCase()] ?? 2;
}

export function formatarDinheiro(valor: Dinheiro, idioma: Idioma): string {
  if (!Number.isInteger(valor.montanteMenor)) {
    // Um montante fraccionário aqui significa que alguém fez contas em euros
    // algures atrás. Falhar alto é melhor do que arredondar em silêncio.
    throw new Error('montanteMenor tem de ser inteiro (unidades mínimas)');
  }
  const casas = digitos(valor.moeda);
  return new Intl.NumberFormat(idioma, {
    style: 'currency',
    currency: valor.moeda,
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor.montanteMenor / 10 ** casas);
}

/** Data curta, na convenção de cada sítio. `31/12/2026` em ES, `12/31/2026` em EN. */
export function formatarData(data: Date, idioma: Idioma, fuso = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat(idioma, { dateStyle: 'short', timeZone: fuso }).format(data);
}

export function formatarDataHora(data: Date, idioma: Idioma, fuso = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat(idioma, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: fuso,
  }).format(data);
}

/** Hora do serviço. 24 h em ES/PT, 12 h com am/pm em EN. */
export function formatarHora(data: Date, idioma: Idioma, fuso = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat(idioma, { timeStyle: 'short', timeZone: fuso }).format(data);
}

export function formatarNumero(n: number, idioma: Idioma): string {
  return new Intl.NumberFormat(idioma).format(n);
}
