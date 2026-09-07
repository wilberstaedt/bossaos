/**
 * A origem pública do sítio — de onde saem `canonical`, `hreflang` e o sitemap.
 *
 * ── Porque é que isto NÃO é `https://bossaos.com` escrito aqui ────────────
 *
 * O próprio repositório diz que não é nosso:
 *
 *   «bossaos.com e @bossaos são nomes **pretendidos**, sem posse ou
 *    disponibilidade presumida.»
 *   — docs/bossaos/PROMPTS_COMPLETOS.md, linha 577
 *
 * Um `canonical` é uma afirmação para uma máquina: diz *«o endereço oficial
 * desta página é este»*. Escrever lá um domínio que a documentação declara não
 * possuído seria publicar uma posse que não existe — e num sítio que ninguém
 * relê, porque um `<link rel=canonical>` não se vê no ecrã.
 *
 * É a mesma disciplina do preço de aparelho que não inventei na L1f e do texto
 * legal que não dei por revisto na L1g: **a estrutura avança, o valor que
 * pertence a uma decisão de fora fica declarado.**
 *
 * ── O que acontece sem a variável ─────────────────────────────────────────
 *
 * Vale `http://localhost:3000`, que é falso em produção e **verdadeiro em
 * desenvolvimento** — e, sobretudo, é obviamente falso. Um domínio plausível
 * mas errado passa despercebido; `localhost` num `canonical` de produção salta
 * à vista da primeira pessoa que olhe.
 *
 * `ORIGEM_DECLARADA` diz se a variável foi mesmo definida. A
 * `validar-seo.sh` usa-a para separar «o SEO está montado» de «o SEO está
 * montado E aponta para o sítio certo», que são duas perguntas diferentes.
 */

const OMISSAO = 'http://localhost:3000';

/** A variável foi definida por quem publica? */
export const ORIGEM_DECLARADA: boolean =
  typeof process.env.NEXT_PUBLIC_SITE_URL === 'string'
  && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0;

/**
 * A origem, sem barra final.
 *
 * Sem barra porque tudo o que se lhe junta começa por `/`: manter as duas
 * produzia `//es-ES`, que é um endereço diferente do pretendido e o tipo de
 * defeito que só aparece num relatório de indexação semanas depois.
 */
export const ORIGEM: string = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || OMISSAO)
  .replace(/\/+$/, '');

/** Um endereço absoluto a partir de um caminho que começa por `/`. */
export function absoluto(caminho: string): string {
  return `${ORIGEM}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}
