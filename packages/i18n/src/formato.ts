import { escalaDaMoeda, type Dinheiro } from '@bossaos/domain';
import type { Idioma } from './idiomas.ts';

/**
 * Dinheiro em **unidades mínimas inteiras**, com código de moeda.
 *
 * O tipo e a escala vêm do **domínio**, e não daqui. Quantas casas tem uma moeda
 * é um facto sobre dinheiro, não sobre apresentação — e tê-lo em dois sítios era
 * ter duas réguas: no dia em que uma mudasse, o formatador e o parser
 * discordavam sobre o que é um cêntimo. Este ficheiro é onde os inteiros viram
 * texto, e só isso.
 */
export type { Dinheiro };

const digitos = escalaDaMoeda;

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

export function formatarNumero(
  n: number,
  idioma: Idioma,
  opcoes?: Intl.NumberFormatOptions,
): string {
  // As opções são opcionais e aditivas: sem elas, o comportamento é o mesmo de
  // sempre. Existem porque uma percentagem NÃO se escreve juntando `%` a um
  // número — «0 %» em espanhol e «0%» em inglês diferem num espaço, e essa
  // diferença é do sítio, não de quem chama. Formatá-la na página seria pôr
  // uma regra de local fora do único ficheiro que as conhece.
  return new Intl.NumberFormat(idioma, opcoes).format(n);
}
