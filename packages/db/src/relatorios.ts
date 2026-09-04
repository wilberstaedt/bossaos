import type { ClienteComEscopo } from './escopo.ts';

/**
 * Relatórios operacionais (REP-002 a REP-007).
 *
 * ── Valor OPERACIONAL, e não receita ─────────────────────────────────────
 *
 * O E14 manda distinguir os dois pelo nome, e a distinção não é vocabulário: o
 * que estes números somam são **linhas aceites**, que é o que a cozinha fez. Não
 * é o que entrou em caixa — não houve pagamento, não houve documento fiscal, e
 * pode haver cancelamentos depois. Chamar-lhe «vendas» faria alguém fechar o mês
 * com este número, e o mês fecha-se com outro.
 *
 * ── Somam-se os INSTANTÂNEOS ─────────────────────────────────────────────
 *
 * Nenhuma destas funções toca no catálogo. O relatório de ontem não muda porque
 * hoje se publicou um preço novo — que é a mesma razão do aceite 3, vista de
 * longe.
 */

export interface ResumoDoServico {
  pedidos: number;
  linhasAceites: number;
  linhasRejeitadas: number;
  /** Cêntimos. `null` quando não há linhas aceites — que não é o mesmo que zero. */
  valorOperacionalMenor: number | null;
  moeda: string | null;
}

/** As linhas aceites de um intervalo, já com o instantâneo do preço. */
async function linhasAceites(db: ClienteComEscopo, locationId: string, de: Date, ate: Date) {
  return db.orderLine.findMany({
    where: {
      estado: 'ACEITE',
      // Os componentes de combo ficam de fora: o preço é do combo, e somá-los
      // fazia todos os relatórios contarem o mesmo dinheiro duas vezes.
      linhaPaiId: null,
      pedido: { locationId, createdAt: { gte: de, lt: ate } },
    },
    select: {
      quantidade: true, precoMenor: true, moeda: true, nome: true, productId: true,
      pedido: { select: { id: true, canal: true, createdAt: true, tableSessionId: true } },
    },
  });
}

function somar(linhas: readonly { quantidade: number; precoMenor: number | null; moeda: string | null }[]) {
  const com = linhas.filter((l) => l.precoMenor !== null && l.moeda !== null);
  if (com.length === 0) return { valorOperacionalMenor: null, moeda: null };
  const moeda = com[0]!.moeda!;
  // Moedas diferentes não se somam. Devolver um número escondia um defeito de
  // configuração — e um relatório com o número errado é pior do que sem número.
  if (com.some((l) => l.moeda !== moeda)) return { valorOperacionalMenor: null, moeda: null };
  return {
    valorOperacionalMenor: com.reduce((t, l) => t + l.precoMenor! * l.quantidade, 0),
    moeda,
  };
}

/** REP-002 · «Tu servicio de hoy». */
export async function resumoDoServico(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
): Promise<ResumoDoServico> {
  const [aceites, rejeitadas, pedidos] = await Promise.all([
    linhasAceites(db, locationId, de, ate),
    db.orderLine.count({
      where: { estado: 'REJEITADA', pedido: { locationId, createdAt: { gte: de, lt: ate } } },
    }),
    db.order.count({ where: { locationId, createdAt: { gte: de, lt: ate } } }),
  ]);
  return {
    pedidos,
    linhasAceites: aceites.length,
    linhasRejeitadas: rejeitadas,
    ...somar(aceites),
  };
}

/** Agrupa por uma chave qualquer, somando o instantâneo. */
async function agruparPor<K extends string>(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
  chave: (l: Awaited<ReturnType<typeof linhasAceites>>[number]) => K,
) {
  const linhas = await linhasAceites(db, locationId, de, ate);
  const grupos = new Map<K, typeof linhas>();
  for (const l of linhas) {
    const k = chave(l);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([k, ls]) => ({
      chave: k,
      quantidade: ls.reduce((t, l) => t + l.quantidade, 0),
      ...somar(ls),
    }))
    .sort((a, b) => (b.valorOperacionalMenor ?? 0) - (a.valorOperacionalMenor ?? 0));
}

/** REP-003 · por canal. */
export const porCanal = (db: ClienteComEscopo, l: string, de: Date, ate: Date) =>
  agruparPor(db, l, de, ate, (x) => String(x.pedido.canal));

/** REP-004 · por produto. */
export const porProduto = (db: ClienteComEscopo, l: string, de: Date, ate: Date) =>
  agruparPor(db, l, de, ate, (x) => x.nome);

/**
 * REP-005 · por categoria.
 *
 * A categoria vem do catálogo, e não do instantâneo — a linha guarda o nome do
 * produto, não o da categoria. É uma **pendência declarada** e não um valor
 * inventado: um produto que mude de categoria move o histórico com ele, e isso
 * está dito no ecrã em vez de ser escondido.
 */
export async function porCategoria(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
) {
  const linhas = await linhasAceites(db, locationId, de, ate);
  const ids = [...new Set(linhas.map((l) => l.productId).filter((x): x is string => !!x))];
  const produtos = ids.length === 0 ? [] : await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, category: { select: { nome: true } } },
  });
  const categoriaDe = new Map(produtos.map((p) => [p.id, p.category?.nome ?? null]));

  const grupos = new Map<string, typeof linhas>();
  for (const l of linhas) {
    // Sem categoria conhecida a linha vai para «(sem categoria)» — e não é
    // distribuída pelas outras nem escondida. Ausência aparece.
    const k = (l.productId ? categoriaDe.get(l.productId) : null) ?? '(sem categoria)';
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()].map(([k, ls]) => ({
    chave: k, quantidade: ls.reduce((t, l) => t + l.quantidade, 0), ...somar(ls),
  }));
}

/**
 * REP-006 · por franja horária.
 *
 * A hora sai do `created_at` do pedido convertido ao **fuso da unidade** por quem
 * chama — não pelo do servidor. É a lição do E06, e a razão é a mesma: «são 14:00»
 * não quer dizer nada sem saber onde.
 */
export async function porFranja(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
  horaLocal: (d: Date) => number,
) {
  const linhas = await linhasAceites(db, locationId, de, ate);
  const grupos = new Map<number, typeof linhas>();
  for (const l of linhas) {
    const h = horaLocal(l.pedido.createdAt);
    grupos.set(h, [...(grupos.get(h) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([h, ls]) => ({ hora: h, quantidade: ls.reduce((t, l) => t + l.quantidade, 0), ...somar(ls) }))
    .sort((a, b) => a.hora - b.hora);
}

/** REP-007 · por mesa. */
export const porMesa = (db: ClienteComEscopo, l: string, de: Date, ate: Date) =>
  agruparPor(db, l, de, ate, (x) => x.pedido.tableSessionId ?? '(sem mesa)');
