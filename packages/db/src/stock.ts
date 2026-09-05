import type { ClienteComEscopo } from './escopo.ts';

/**
 * Stock e fichas técnicas — o motor do E25.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem nenhuma função que escreva o saldo. Não há `actualizarSaldo`, não há
 * `definirStock`. O saldo é a soma dos movimentos, derivada por gatilho, e a
 * única maneira de o mudar é **lançar um movimento** — com momento, autor e
 * razão.
 *
 * Um `UPDATE stock_items SET saldo_mili` é reposto pela base. Isso não é
 * paranóia: é a diferença entre uma contagem que não bate e ninguém saber desde
 * quando, e uma contagem que se explica movimento a movimento.
 */

export type RecusaDeStock =
  | 'FICHA_CICLICA'
  | 'SEM_FICHA'
  | 'QUANTIDADE_INVALIDA'
  | 'JA_CONSUMIDO';

export class RecusaDoStock extends Error {
  readonly motivo: RecusaDeStock;

  constructor(motivo: RecusaDeStock, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoStock';
    this.motivo = motivo;
  }
}

/** Milésimos da unidade. 1 kg = 1_000_000; 1 g = 1000. */
export const MILI = 1000;

/**
 * Lançar um movimento. **A única porta que muda um saldo.**
 *
 * A quantidade é sempre positiva e o sinal vem do tipo: um consumo com
 * quantidade negativa seria uma entrada disfarçada, e ninguém daria por isso a
 * ler o relatório.
 */
export async function movimentarStock(
  db: ClienteComEscopo,
  dados: {
    itemId: string; tipo: 'ENTRADA' | 'CONSUMO' | 'QUEBRA' | 'AJUSTE'
      | 'TRANSFERENCIA_SAIDA' | 'TRANSFERENCIA_ENTRADA';
    quantidadeMili: number; motivo: string; actor?: string; orderLineId?: string;
  },
): Promise<{ id: string; saldoMili: number }> {
  if (!Number.isInteger(dados.quantidadeMili) || dados.quantidadeMili <= 0) {
    // Inteiro e positivo. Um decimal aqui seria vírgula flutuante a entrar por
    // uma porta que a guarda não vigia.
    throw new RecusaDoStock('QUANTIDADE_INVALIDA', `${dados.quantidadeMili}`);
  }
  const item = await db.stockItem.findUniqueOrThrow({
    where: { id: dados.itemId }, select: { organizationId: true },
  });
  const criado = await db.stockMovement.create({
    data: {
      organizationId: item.organizationId, itemId: dados.itemId, tipo: dados.tipo,
      quantidadeMili: BigInt(dados.quantidadeMili), motivo: dados.motivo,
      actor: dados.actor ?? null, orderLineId: dados.orderLineId ?? null,
    },
    select: { id: true },
  });
  const depois = await db.stockItem.findUniqueOrThrow({
    where: { id: dados.itemId }, select: { saldoMili: true },
  });
  return { id: criado.id, saldoMili: Number(depois.saldoMili) };
}

/**
 * Descer a árvore da ficha até às FOLHAS.
 *
 * ── Porquê até às folhas, e não um nível ──────────────────────────────────
 *
 * Uma sub-receita não está no frigorífico: o que está são os ingredientes dela.
 * Descontar «1 molho» descontaria uma coisa que ninguém comprou, e deixava o
 * tomate a dizer que ainda lá está.
 *
 * A recursão é segura porque o **ciclo foi recusado na escrita** — mas há na
 * mesma um limite de profundidade, porque uma guarda que depende de outra estar
 * bem é uma guarda a menos. Se ele disparar, é sinal de que a da escrita falhou.
 */
export async function folhasDaFicha(
  db: ClienteComEscopo, recipeId: string, factor = 1, profundidade = 0,
): Promise<Map<string, number>> {
  if (profundidade > 12) {
    throw new RecusaDoStock('FICHA_CICLICA',
      'profundidade acima de 12: a guarda da escrita deixou passar um ciclo');
  }
  const linhas = await db.recipeLine.findMany({
    where: { recipeId },
    select: { itemId: true, subRecipeId: true, quantidadeMili: true },
  });
  const folhas = new Map<string, number>();
  for (const l of linhas) {
    const quantidade = Number(l.quantidadeMili) * factor;
    if (l.itemId) {
      folhas.set(l.itemId, (folhas.get(l.itemId) ?? 0) + quantidade);
      continue;
    }
    if (!l.subRecipeId) continue;
    const sub = await db.recipe.findUniqueOrThrow({
      where: { id: l.subRecipeId }, select: { rendeMili: true },
    });
    // A sub-receita rende `rendeMili`; precisamos de `quantidade`. O factor é a
    // proporção — e é aqui que uma divisão em vírgula flutuante estragaria tudo,
    // por isso multiplica-se antes e arredonda-se no fim, uma vez só.
    const dentro = await folhasDaFicha(
      db, l.subRecipeId, quantidade / Number(sub.rendeMili), profundidade + 1,
    );
    for (const [item, q] of dentro) folhas.set(item, (folhas.get(item) ?? 0) + q);
  }
  return folhas;
}

/**
 * O consumo de uma linha servida.
 *
 * ── O momento é a passagem a SERVIDO, e está escrito no contrato ──────────
 *
 * Um pedido cancelado antes de produzir não consome — a comida não foi feita.
 * Um pedido produzido e devolvido **consome**, porque devolvê-la não a repõe no
 * frigorífico; se foi para o lixo, isso é uma **quebra**, com a sua razão.
 *
 * E consumir duas vezes a mesma linha é impossível: há um índice único sobre
 * `(order_line_id, item_id)` para o consumo. Servir duas vezes o mesmo prato é
 * um só consumo — a identidade é a do acontecimento, outra vez.
 */
export async function consumirPelaLinha(
  db: ClienteComEscopo,
  dados: { orderLineId: string; productId: string; quantidade: number; actor?: string },
): Promise<{ folhas: number; jaEstava: boolean }> {
  const ficha = await db.recipe.findUnique({
    where: { productId: dados.productId }, select: { id: true },
  });
  // Sem ficha não há o que descontar, e isso NÃO é um erro: nem todo o produto
  // tem receita — uma garrafa de água comprada e vendida não tem árvore.
  if (!ficha) return { folhas: 0, jaEstava: false };

  const folhas = await folhasDaFicha(db, ficha.id);
  let postos = 0;
  for (const [itemId, quantidadeMili] of folhas) {
    const total = Math.round(quantidadeMili * dados.quantidade);
    if (total <= 0) continue;
    const item = await db.stockItem.findUniqueOrThrow({
      where: { id: itemId }, select: { organizationId: true },
    });
    // `createMany` com `skipDuplicates`: a colisão do índice é o reenvio, e
    // apanhá-la com `try/catch` dentro da transacção abortá-la-ia — a lição do
    // E24, que aqui se aplica de origem.
    const r = await db.stockMovement.createMany({
      data: [{
        organizationId: item.organizationId, itemId, tipo: 'CONSUMO',
        quantidadeMili: BigInt(total), motivo: 'linha servida',
        actor: dados.actor ?? null, orderLineId: dados.orderLineId,
      }],
      skipDuplicates: true,
    });
    postos += r.count;
  }
  return { folhas: folhas.size, jaEstava: postos === 0 && folhas.size > 0 };
}

/** Os insumos de uma unidade, com o saldo derivado. */
export async function insumosDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.stockItem.findMany({
    where: { locationId }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, unidade: true, saldoMili: true, minimoMili: true },
  });
}

/**
 * A DÍVIDA: os saldos abaixo de zero.
 *
 * É esta lista que impede o negativo de ser silencioso. O contrato escolheu
 * «visível» em vez de «impossível» porque a contagem **vai** estar errada, e
 * travar o serviço às 21h faz a equipa lançar um ajuste inventado para
 * desbloquear — o que estraga a contagem ainda mais e apaga o rasto.
 */
export async function dividaDeStock(db: ClienteComEscopo, locationId: string) {
  return db.stockItem.findMany({
    where: { locationId, saldoMili: { lt: 0 } },
    orderBy: { saldoMili: 'asc' },
    select: { id: true, nome: true, unidade: true, saldoMili: true },
  });
}

/** Os movimentos de um insumo — o que explica o saldo. */
export async function movimentosDoInsumo(db: ClienteComEscopo, itemId: string) {
  return db.stockMovement.findMany({
    where: { itemId }, orderBy: { criadoEm: 'desc' }, take: 100,
    select: { id: true, tipo: true, quantidadeMili: true, motivo: true, criadoEm: true },
  });
}

/** As fichas de uma unidade. */
export async function fichasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.recipe.findMany({
    where: { locationId }, orderBy: { nome: 'asc' },
    select: {
      id: true, nome: true, productId: true, rendeMili: true,
      linhas: { select: { id: true, itemId: true, subRecipeId: true, quantidadeMili: true } },
    },
  });
}

/** Criar um insumo. O saldo nasce a zero e só muda por movimento. */
export async function criarInsumo(
  db: ClienteComEscopo,
  dados: { organizationId: string; locationId: string; nome: string; unidade: string },
): Promise<{ id: string }> {
  return db.stockItem.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome, unidade: dados.unidade,
    },
    select: { id: true },
  });
}

/** Criar uma ficha, e ligá-la a um produto se ele existir. */
export async function criarFicha(
  db: ClienteComEscopo,
  dados: {
    organizationId: string; locationId: string; nome: string;
    productId?: string; rendeMili?: number;
  },
): Promise<{ id: string }> {
  return db.recipe.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome, productId: dados.productId ?? null,
      rendeMili: BigInt(dados.rendeMili ?? 1000),
    },
    select: { id: true },
  });
}

/**
 * Juntar uma linha à ficha.
 *
 * O ciclo é recusado **pela base**. Aqui traduz-se o erro para um nome — porque
 * quem lê «violação de restrição» não sabe o que fazer, e quem lê «esta linha
 * fecharia um ciclo» sabe.
 */
export async function juntarLinhaDaFicha(
  db: ClienteComEscopo,
  dados: {
    organizationId: string; recipeId: string; quantidadeMili: number;
    itemId?: string; subRecipeId?: string;
  },
): Promise<{ id: string }> {
  try {
    return await db.recipeLine.create({
      data: {
        organizationId: dados.organizationId, recipeId: dados.recipeId,
        itemId: dados.itemId ?? null, subRecipeId: dados.subRecipeId ?? null,
        quantidadeMili: BigInt(dados.quantidadeMili),
      },
      select: { id: true },
    });
  } catch (e) {
    if (String((e as Error).message).includes('FICHA_CICLICA')) {
      throw new RecusaDoStock('FICHA_CICLICA',
        'esta linha fecharia um ciclo na árvore da ficha');
    }
    throw e;
  }
}
