/**
 * Idiomas da interface.
 *
 * **Espanhol primeiro**, e não por ordem alfabética: o produto nasce em Espanha,
 * o atlas inteiro está desenhado em espanhol e é a língua em que os primeiros
 * restaurantes vão trabalhar. Pôr o inglês como omissão seria desenhar para um
 * utilizador que ainda não existe.
 */
export const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PADRAO: Idioma = 'es-ES';

/** Nome de cada idioma **na própria língua** — nunca traduzido. */
export const NOME_DO_IDIOMA: Record<Idioma, string> = {
  'es-ES': 'Español',
  'pt-BR': 'Português',
  en: 'English',
};

export function eIdioma(v: unknown): v is Idioma {
  return typeof v === 'string' && (IDIOMAS as readonly string[]).includes(v);
}

/**
 * Resolve o idioma a partir do que o browser pede (`Accept-Language`).
 *
 * Aceita a variante mais próxima: um `pt-PT` cai em `pt-BR` porque é muito mais
 * próximo do que o espanhol, e um `es-MX` cai em `es-ES`. Devolver o padrão a
 * quem pede `pt` seria servir espanhol a um brasileiro por causa de um travessão.
 */
export function resolverIdioma(aceite: string | null | undefined): Idioma {
  if (!aceite) return IDIOMA_PADRAO;

  const pedidos = aceite
    .split(',')
    .map((parte) => {
      const [etiqueta = '', q = 'q=1'] = parte.trim().split(';');
      return { etiqueta: etiqueta.trim().toLowerCase(), peso: Number(q.replace('q=', '')) || 0 };
    })
    .sort((a, b) => b.peso - a.peso);

  for (const { etiqueta } of pedidos) {
    const exacto = IDIOMAS.find((i) => i.toLowerCase() === etiqueta);
    if (exacto) return exacto;

    const base = etiqueta.split('-')[0];
    const porBase = IDIOMAS.find((i) => i.toLowerCase().split('-')[0] === base);
    if (porBase) return porBase;
  }
  return IDIOMA_PADRAO;
}
