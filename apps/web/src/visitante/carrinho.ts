import { cookies } from 'next/headers';

/**
 * O carrinho do visitante, numa bolacha.
 *
 * ── Porque é que não é uma tabela ─────────────────────────────────────────
 *
 * O contrato do E17 decide o QR e a sessão; sobre o carrinho **não diz nada**, e
 * inventar-lhe um modelo na base era decidir por quem não me pediu — o erro que
 * o `preco-de-um-pedido-escrito-offline.md` ensinou a não repetir.
 *
 * O que o carrinho precisa de ser é: sobreviver a mudar de página, funcionar sem
 * JavaScript, e não ser autoridade sobre nada. Uma bolacha faz as três.
 *
 * ── E não precisa de assinatura ───────────────────────────────────────────
 *
 * Alguém que mexa nesta bolacha muda **o que vai pedir** — que é uma coisa que
 * pode fazer na mesma carregando noutro botão. O que não muda é o **preço**: ele
 * é do servidor, e o E14 provou-o com um gatilho que recusa alterar a linha
 * aceite. Assinar isto seria proteger uma escolha que é de quem escolhe.
 *
 * A bolacha morre quando a sessão morre, porque partilha o `path` da unidade.
 */
export const BOLACHA_DO_CARRINHO = 'bo_carrinho';

export interface ItemDoCarrinho {
  productId: string;
  quantidade: number;
}

/**
 * Lê o carrinho. Um valor ilegível dá carrinho **vazio**, e não estoira.
 *
 * Quem chega com uma bolacha corrompida está num telemóvel, numa mesa, com fome.
 * Um ecrã de erro ali é pior do que recomeçar — e não há nada a perder, porque o
 * carrinho ainda não é um pedido.
 */
export async function lerCarrinho(): Promise<ItemDoCarrinho[]> {
  const bruto = (await cookies()).get(BOLACHA_DO_CARRINHO)?.value;
  if (!bruto) return [];
  return bruto.split(',').flatMap((par) => {
    const [productId, q] = par.split(':');
    const quantidade = Number(q);
    // Um par sem identificador ou com quantidade inválida é lixo, e é descartado
    // em silêncio — não é um erro a mostrar, é uma linha que não existe.
    if (!productId || !Number.isInteger(quantidade) || quantidade < 1) return [];
    return [{ productId, quantidade }];
  });
}

export function escreverCarrinho(itens: readonly ItemDoCarrinho[]): string {
  return itens.map((i) => `${i.productId}:${i.quantidade}`).join(',');
}

/** Acrescenta, somando à linha que já existe em vez de a duplicar. */
export function acrescentar(
  itens: readonly ItemDoCarrinho[], productId: string, quantidade: number,
): ItemDoCarrinho[] {
  const existente = itens.find((i) => i.productId === productId);
  if (!existente) return [...itens, { productId, quantidade }];
  return itens.map((i) =>
    i.productId === productId ? { ...i, quantidade: i.quantidade + quantidade } : i);
}
