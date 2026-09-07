import { mensagensDe, type Idioma } from '@bossaos/i18n';

/** As mensagens do E31, tipadas. Nunca `Record<string, string>`. */
export type TextosDoKiosk = ReturnType<typeof mensagensDe>['kioskE31'];

export function textosDoKiosk(idioma: Idioma): TextosDoKiosk {
  return mensagensDe(idioma).kioskE31;
}

/**
 * Uma mensagem escolhida por um valor do modelo — `estado${LEITURA}`.
 *
 * Devolve `null` quando não conhece a chave, para um valor novo aparecer como
 * buraco visível em vez de escorregar para o ecrã em bruto. É a mesma decisão
 * do `porChaveDoKds`, e está aqui outra vez porque as duas famílias não
 * partilham ficheiro.
 */
export function porChaveDoKiosk(s: TextosDoKiosk, chave: string): string | null {
  const valor = (s as unknown as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : null;
}

