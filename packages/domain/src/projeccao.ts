/**
 * A projecção pública: o que um estranho pode ver.
 *
 * ── A regra dura do E09 ────────────────────────────────────────────────────
 *
 * > *"Rotas públicas leem apenas a projecção publicada e não revelam custos,
 * > SKUs internos, contactos privados ou catálogo oculto."*
 *
 * E a armadilha, escrita pelo sénior na régua antes de existir uma linha disto:
 *
 * > **A armadilha desta área é o campo que vem e não se mostra.** Um `select *`
 * > que chega ao navegador e é filtrado no React não é privacidade — é uma fuga
 * > com uma cortina à frente.
 *
 * ── Porque é que isto é uma LISTA DE PERMISSÃO e não uma de exclusão ───────
 *
 * Uma lista de exclusão (`delete produto.sku`) protege contra os campos que
 * existem **hoje**. O E22 traz custo de produção, o E24 traz perfis fiscais, e
 * cada um deles entra no retrato da revisão sem ninguém se lembrar desta função
 * — e sai para a internet aberta no mesmo dia.
 *
 * Aqui nada é espalhado. Cada campo é **lido pelo nome, um a um**, e o que não
 * está escrito não sai. Um campo novo no retrato é invisível por omissão, que é
 * o inverso do que acontece com `...produto`.
 *
 * `CAMPOS_DE_PRODUTO` existe para isso poder ser **medido**: o teste compara as
 * chaves do que sai com esta lista, e não com uma lista de proibidos.
 */

import type { EstadoDeAlergenio } from './alergenios.ts';
import type { Dinheiro } from './dinheiro.ts';

export const CAMPOS_DE_PRODUTO = [
  'id', 'nome', 'descricao', 'preco', 'variantes', 'alergenos', 'preferencias', 'imagens',
] as const;

export const CAMPOS_DE_CATEGORIA = ['id', 'nome', 'produtos'] as const;

export const CAMPOS_DE_CARTA = [
  'unidade', 'marca', 'revisao', 'idioma', 'canal', 'categorias', 'assinatura',
] as const;

export interface ProdutoPublico {
  /**
   * O identificador opaco do produto. **Nunca o SKU.**
   *
   * O SKU é a referência interna — aparece em facturas de fornecedor, em
   * inventário e em conversas com quem abastece. O identificador é um UUID que
   * não diz nada a ninguém e é o que a ligação da página precisa.
   */
  id: string;
  nome: string;
  descricao: string | null;
  /** `null` é "sem preço", e mostra-se como tal. Nunca zero. */
  preco: Dinheiro | null;
  variantes: ReadonlyArray<{ nome: string; predefinida: boolean }>;
  /**
   * Os CATORZE, com o estado de cada um — incluindo `DESCONHECIDO`.
   *
   * **Não se omitem os desconhecidos.** Omitir um alérgeno da lista pública
   * lê-se como "não contém", que é exactamente a inferência que o E07 existe
   * para impedir, agora à frente de quem vai comer.
   */
  alergenos: ReadonlyArray<{ codigo: string; estado: EstadoDeAlergenio }>;
  preferencias: readonly string[];
  imagens: ReadonlyArray<{ chave: string; textoAlternativo: string | null }>;
}

export interface CategoriaPublica {
  id: string;
  nome: string;
  produtos: readonly ProdutoPublico[];
}

export interface CartaPublica {
  unidade: string;
  marca: string;
  revisao: number;
  idioma: string;
  canal: string;
  categorias: readonly CategoriaPublica[];
  assinatura: string;
}

/** Lê um campo de um objecto desconhecido, sem confiar na forma. */
function objecto(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}
const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface PedidoDeProjeccao {
  /** O `conteudo` da revisão publicada, como veio da base. */
  conteudo: unknown;
  unidade: string;
  marca: string;
  revisao: number;
  idioma: string;
  canal: string;
  /**
   * Texto por produto, já resolvido pelo motor de traduções.
   *
   * Chega resolvido de propósito: a decisão sobre traduções obsoletas é do
   * `resolverTexto`, e repeti-la aqui daria duas regras para a mesma coisa.
   */
  textos?: ReadonlyMap<string, { nome: string; descricao: string | null }>;
}

/**
 * Constrói a carta pública a partir do retrato da revisão.
 *
 * Campo a campo. **Sem `...`, sem `Object.assign`, sem `JSON.parse` do que
 * entrou.** É deliberadamente aborrecido de escrever: é isso que faz um campo
 * novo não sair sozinho.
 */
export function projectarCarta(pedido: PedidoDeProjeccao): CartaPublica {
  const porCategoria = new Map<string, { nome: string; produtos: ProdutoPublico[] }>();

  for (const bruto of lista(pedido.conteudo)) {
    const item = objecto(bruto);
    const categoryId = texto(item.categoryId);
    if (categoryId === '') continue;

    const id = texto(item.productId);
    const traduzido = pedido.textos?.get(id);

    const produto: ProdutoPublico = {
      id,
      nome: traduzido?.nome ?? texto(item.nome),
      descricao: traduzido ? traduzido.descricao : textoOuNulo(item.descricao),
      // O preço só existe quando os dois campos existem. Um montante sem moeda
      // não é dinheiro, e mostrá-lo era mostrar um número.
      preco: typeof item.precoMenor === 'number' && typeof item.moeda === 'string'
        ? { montanteMenor: item.precoMenor, moeda: item.moeda }
        : null,
      variantes: lista(item.variantes).map((v) => {
        const o = objecto(v);
        return { nome: texto(o.nome), predefinida: o.predefinida === true };
      }),
      alergenos: lista(item.alergenos).map((a) => {
        const o = objecto(a);
        return { codigo: texto(o.codigo), estado: texto(o.estado) as EstadoDeAlergenio };
      }),
      preferencias: lista(item.preferencias).map((x) => texto(x)).filter((x) => x !== ''),
      imagens: lista(item.media).map((mm) => {
        const o = objecto(mm);
        return { chave: texto(o.chave), textoAlternativo: textoOuNulo(o.textoAlternativo) };
      }),
    };

    const existente = porCategoria.get(categoryId);
    if (existente) existente.produtos.push(produto);
    else porCategoria.set(categoryId, { nome: texto(item.categoriaNome), produtos: [produto] });
  }

  return {
    unidade: pedido.unidade,
    marca: pedido.marca,
    revisao: pedido.revisao,
    idioma: pedido.idioma,
    canal: pedido.canal,
    categorias: [...porCategoria.entries()].map(([id, c]) => ({
      id, nome: c.nome, produtos: c.produtos,
    })),
    assinatura: 'BossaOS',
  };
}

/**
 * Um produto da carta pública, por identificador (MENU-005).
 *
 * Procura **dentro da projecção**, não na base. Se fosse à base, o detalhe do
 * produto teria de repetir os filtros de publicação, de canal e de estado — e
 * bastava esquecer um para o detalhe mostrar o que a lista esconde.
 */
export function produtoDaCarta(carta: CartaPublica, id: string): ProdutoPublico | null {
  for (const c of carta.categorias) {
    const p = c.produtos.find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}

/**
 * A busca do MENU-004, sobre a projecção.
 *
 * Sem acentos e sem maiúsculas: quem escreve "cafe" num telemóvel espera
 * encontrar "café", e um restaurante em Espanha tem metade da carta acentuada.
 */
export function procurarNaCarta(carta: CartaPublica, termo: string): readonly ProdutoPublico[] {
  const limpo = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (limpo === '') return [];
  const cabe = (t: string) =>
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(limpo);
  return carta.categorias.flatMap((c) =>
    c.produtos.filter((p) => cabe(p.nome) || cabe(p.descricao ?? '')));
}
