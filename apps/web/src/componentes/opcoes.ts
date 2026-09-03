/**
 * As listas dos selectores, e a razão de a primeira opção estar sempre vazia.
 *
 * > **Nada aqui tem valor por omissão.**
 *
 * Um `<select>` sem `<option value="">` seleccionado escolhe sozinho a primeira
 * opção — e a primeira opção de uma lista de países é a que ficou em cima por
 * acaso. O utilizador não carrega em nada, o formulário submete "AF", e a
 * organização fica no Afeganistão. É a mesma família de "uma unidade sem moeda
 * não é AUD", só que pior: parece uma escolha.
 *
 * A opção vazia primeira, com o rótulo "Sin elegir", torna o não-escolhido
 * visível — e o servidor trata a cadeia vazia como `null`, que é o que
 * "desconhecido" quer dizer no modelo.
 */

/**
 * Os países são os que os produtos e as fixtures usam hoje.
 *
 * **Não é a lista ISO inteira**, e isso é uma pendência declarada e não um
 * descuido: 249 códigos num `<select>` sem pesquisa é pior de usar do que oito
 * com um campo livre a seguir, e inventar aqui uma lista curta "dos que
 * interessam" seria decidir por quem vende. Entra a lista completa quando
 * houver um selector com pesquisa (E12).
 */
export const PAISES = ['ES', 'PT', 'BR', 'AU', 'GB', 'FR', 'IT', 'US'] as const;

/** ISO 4217, as moedas dos países acima. Mesma pendência, mesma razão. */
export const MOEDAS = ['EUR', 'BRL', 'AUD', 'GBP', 'USD'] as const;

/**
 * Fusos IANA.
 *
 * A lista completa vem do próprio motor quando ele a tem —
 * `Intl.supportedValuesOf('timeZone')` — e não de uma tabela nossa que envelhece
 * sozinha. Quando não tem, fica esta lista curta e o campo continua a poder ser
 * escrito à mão.
 */
export function fusos(): readonly string[] {
  const suportados = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  if (typeof suportados === 'function') {
    try {
      return suportados('timeZone');
    } catch { /* o motor diz que sabe e não sabe: cai para a lista curta */ }
  }
  return ['Europe/Madrid', 'Europe/Lisbon', 'America/Sao_Paulo', 'Australia/Brisbane', 'UTC'];
}
