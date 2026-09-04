/**
 * Publicar: o que bloqueia, o que muda, e o que uma restauração faz.
 *
 * ── As duas regras do E00 ──────────────────────────────────────────────────
 *
 * > O cadastro é único; **o que está a ser editado e o que o cliente vê não são
 * > a mesma coisa**. Publicar cria uma **revisão imutável** e troca a referência
 * > do destino de forma atómica.
 *
 * > Uma falha a meio da publicação tem de deixar a revisão **anterior inteira**.
 * > Publicação pela metade é pior do que publicação falhada — a carta fica com
 * > metade dos preços novos e metade dos antigos, e ninguém sabe qual é qual.
 *
 * A atomicidade vive na base (uma transacção, uma troca de referência) e
 * prova-se contra ela. O que vive aqui é o que se pode decidir sem escrever
 * nada: **o que impede a publicação**, **o que muda entre duas revisões**, e o
 * que significa restaurar.
 */

export type MotivoDeBloqueio =
  | 'carta_vazia'
  | 'sem_preco'
  /**
   * A UNIDADE não tem moeda — e não é o produto que não tem preço.
   *
   * O tipo `erroDePreco` já previa `unidade_sem_moeda` e o motivo não existia:
   * o caso caía no `sem_preco` genérico. A jornada do marco E11 apanhou-o —
   * publicou-se com um produto que tinha preço, e o produto disse «sem preço».
   *
   * Manda a pessoa ao sítio errado: ela vai ver a ficha do produto, encontra os
   * 8,50 lá, e conclui que o sistema está avariado. O que falta está na unidade,
   * três ecrãs ao lado. Um motivo errado é pior do que um motivo genérico.
   */
  | 'unidade_sem_moeda'
  | 'moeda_incompativel'
  | 'conflito_de_preco'
  | 'alergenos_por_declarar'
  | 'sem_categoria';

export interface ItemParaPublicar {
  productId: string;
  nome: string;
  /** `null` quando o motor de preços não resolveu — e isso é um bloqueio. */
  precoMenor: number | null;
  moeda: string | null;
  /** O erro que o motor de preços devolveu, quando devolveu um. */
  erroDePreco?: 'conflito' | 'moeda_incompativel' | 'sem_preco' | 'unidade_sem_moeda';
  categoryId: string | null;
  /** Quantos dos catorze continuam sem declaração. */
  alergenosPorDeclarar: number;
}

export interface Bloqueio {
  productId: string;
  nome: string;
  motivo: MotivoDeBloqueio;
  detalhe?: string;
}

export interface PoliticaDePublicacao {
  /**
   * Exigir a ficha de alérgenos completa.
   *
   * **Não é `true` por omissão, e a razão é honesta:** uma carta com oitenta
   * pratos e mil declarações em falta nunca publicaria, e o resultado real não
   * seria fichas completas — seria alguém a marcar tudo como "não contém" para
   * o portão abrir. Isso é pior do que publicar com a ficha incompleta, porque
   * troca "não sabemos" por uma afirmação falsa.
   *
   * Fica ligável por quem opera, e o ecrã diz sempre quantas faltam.
   */
  exigirAlergenosCompletos?: boolean;
}

/**
 * O que impede esta publicação.
 *
 * Devolve **todos** os bloqueios, não o primeiro: quem publica uma carta quer
 * saber os doze produtos sem preço de uma vez, não descobri-los um por um em
 * doze tentativas.
 *
 * O prompt do E08 é explícito — *"não invente conteúdo para passar no
 * checklist"*. Nada aqui preenche nada: um produto sem preço fica bloqueado, e
 * não publicado a zero.
 */
export function bloqueiosDePublicacao(
  itens: readonly ItemParaPublicar[],
  politica: PoliticaDePublicacao = {},
): readonly Bloqueio[] {
  const bloqueios: Bloqueio[] = [];
  // Uma carta sem produtos é uma página em branco na internet aberta. Acontece
  // por engano — nenhum produto visível no canal que se está a publicar — e sem
  // isto publicava-se em silêncio, com o ecrã a dizer "nada mudou".
  if (itens.length === 0) {
    return [{ productId: '', nome: '', motivo: 'carta_vazia' }];
  }
  for (const i of itens) {
    const base = { productId: i.productId, nome: i.nome };
    if (i.erroDePreco === 'conflito') {
      // O empate do E07 chega aqui inteiro: continua a ser erro, não sorteio.
      bloqueios.push({ ...base, motivo: 'conflito_de_preco' });
    } else if (i.erroDePreco === 'moeda_incompativel') {
      bloqueios.push({ ...base, motivo: 'moeda_incompativel' });
    } else if (i.erroDePreco === 'unidade_sem_moeda') {
      // Antes de este ramo existir, isto era `sem_preco` — e o produto tinha
      // preço. Ver `MotivoDeBloqueio`.
      bloqueios.push({ ...base, motivo: 'unidade_sem_moeda' });
    } else if (i.precoMenor === null || i.moeda === null) {
      // Sem preço não se vende. Publicar a zero seria oferecer o prato.
      bloqueios.push({ ...base, motivo: 'sem_preco' });
    }
    if (i.categoryId === null) {
      bloqueios.push({ ...base, motivo: 'sem_categoria' });
    }
    if (politica.exigirAlergenosCompletos && i.alergenosPorDeclarar > 0) {
      bloqueios.push({
        ...base, motivo: 'alergenos_por_declarar',
        detalhe: String(i.alergenosPorDeclarar),
      });
    }
  }
  return bloqueios;
}

export type TipoDeMudanca = 'acrescentado' | 'removido' | 'alterado';

export interface Mudanca {
  productId: string;
  nome: string;
  tipo: TipoDeMudanca;
  /** Só em `alterado`: que campos, com antes e depois. */
  campos?: ReadonlyArray<{ campo: string; antes: string; depois: string }>;
}

const AMOSTRA = (i: ItemParaPublicar): Record<string, string> => ({
  nome: i.nome,
  preco: i.precoMenor === null ? '—' : `${i.precoMenor} ${i.moeda ?? '?'}`,
  categoria: i.categoryId ?? '—',
});

/**
 * O que muda entre a revisão publicada e a que se vai publicar (CAT-025).
 *
 * **Removido não é o mesmo que alterado**, e por isso são tipos diferentes: um
 * produto que sai da carta é a mudança que mais custa a notar numa lista de
 * cinquenta alterações, e é a que um cliente encontra primeiro.
 *
 * A comparação é por `productId` e nunca por nome: dois "Café" não são o mesmo
 * produto — é a mesma regra que o E00 escreve para a importação, e não muda
 * porque o ecrã é outro.
 */
export function compararRevisoes(
  publicada: readonly ItemParaPublicar[],
  proposta: readonly ItemParaPublicar[],
): readonly Mudanca[] {
  const antes = new Map(publicada.map((i) => [i.productId, i]));
  const depois = new Map(proposta.map((i) => [i.productId, i]));
  const mudancas: Mudanca[] = [];

  for (const [id, novo] of depois) {
    const velho = antes.get(id);
    if (!velho) {
      mudancas.push({ productId: id, nome: novo.nome, tipo: 'acrescentado' });
      continue;
    }
    const a = AMOSTRA(velho);
    const b = AMOSTRA(novo);
    const campos = Object.keys(b)
      .filter((k) => a[k] !== b[k])
      .map((k) => ({ campo: k, antes: a[k]!, depois: b[k]! }));
    if (campos.length > 0) {
      mudancas.push({ productId: id, nome: novo.nome, tipo: 'alterado', campos });
    }
  }
  for (const [id, velho] of antes) {
    if (!depois.has(id)) {
      mudancas.push({ productId: id, nome: velho.nome, tipo: 'removido' });
    }
  }
  return mudancas;
}

export interface Revisao {
  id: string;
  numero: number;
  criadaEm: Date;
  criadaPor: string;
  /** Preenchido quando esta revisão foi criada a restaurar outra. */
  restauraDe?: string | null;
}

/**
 * Restaurar cria uma revisão NOVA (o prompt do E08 di-lo: *"Restauração cria
 * nova revisão"*).
 *
 * Não se "volta atrás" no número. Uma revisão é imutável e o histórico é uma
 * linha do tempo: se restaurar apagasse ou reutilizasse números, a pergunta
 * "o que é que estava publicado no dia 4" deixava de ter resposta — e é uma
 * pergunta que se faz depois de uma reclamação, não antes.
 */
export function proximaRevisao(
  existentes: readonly Revisao[],
  autor: string,
  agora: Date,
  restauraDe?: string,
): Omit<Revisao, 'id'> {
  const numero = existentes.reduce((m, r) => Math.max(m, r.numero), 0) + 1;
  return {
    numero, criadaEm: agora, criadaPor: autor,
    ...(restauraDe ? { restauraDe } : {}),
  };
}
