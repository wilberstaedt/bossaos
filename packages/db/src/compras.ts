import type { ClienteComEscopo } from './escopo.ts';

/**
 * Compras e fornecedores — o motor do E26.
 *
 * Contrato: `docs/architecture/compras-e-fornecedores.md`.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem nenhuma função que faça uma **encomenda** mexer no stock. Não há
 * `confirmarEncomenda` que lance entradas, não há `receberTudo` que despache a
 * encomenda inteira sem alguém contar. A única função que escreve um movimento
 * é a `receber` — e escreve-o sempre com a linha de recepção ao lado.
 *
 * O defeito que isto impede tem nome na régua: **a cozinha vê farinha que está
 * dentro de um camião**, faz a mise en place a contar com ela, e descobre à
 * hora do serviço.
 */

export type RecusaDeCompra =
  | 'SEM_FACTOR'
  | 'QUANTIDADE_INVALIDA'
  | 'DINHEIRO_INVALIDO'
  | 'ARTIGO_DESCONHECIDO'
  | 'LINHA_DE_OUTRA_ENCOMENDA';

export class RecusaDaCompra extends Error {
  readonly motivo: RecusaDeCompra;

  constructor(motivo: RecusaDeCompra, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDaCompra';
    this.motivo = motivo;
  }
}

/** A escala do E25: 1 kg = 1 000 000; uma unidade de compra = 1 000 000. */
export const UMA_UNIDADE = 1_000_000n;

/**
 * Quantos milésimos da unidade de USO dão estas unidades de COMPRA.
 *
 * ── É aqui que a etapa se joga, e é tudo inteiro ──────────────────────────
 *
 * 8 sacos (`8_000_000`) de 25 kg (`25_000_000`) dão `200_000_000` — 200 kg.
 * Nunca `8 × 25` em vírgula flutuante, e nunca `8` porque alguém leu o saco
 * como uma unidade. Esse é o defeito que só aparece no inventário ao fim do
 * mês, sem causa aparente.
 *
 * Arredonda-se ao milésimo mais próximo, meio para cima, e não se trunca: a
 * truncatura perde sempre para o mesmo lado, e o que se perde sistematicamente
 * acumula-se sem nunca se notar numa entrega.
 */
export function converterParaUso(recebidoMili: bigint, factorMili: bigint): bigint {
  if (factorMili <= 0n) {
    throw new RecusaDaCompra('SEM_FACTOR',
      'sem factor de conversão não se adivinha quanto entra — a mesma regra da densidade');
  }
  const produto = recebidoMili * factorMili;
  return (produto + UMA_UNIDADE / 2n) / UMA_UNIDADE;
}

function inteiroPositivo(n: number | bigint, oQue: string): bigint {
  if (typeof n === 'number' && !Number.isInteger(n)) {
    throw new RecusaDaCompra('QUANTIDADE_INVALIDA',
      `${oQue} tem de ser inteiro em milésimos, e veio ${n}`);
  }
  const v = BigInt(n);
  if (v <= 0n) {
    throw new RecusaDaCompra('QUANTIDADE_INVALIDA', `${oQue} tem de ser positivo, e veio ${v}`);
  }
  return v;
}

// ── Fornecedores ───────────────────────────────────────────────────────────

export function criarFornecedor(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string;
  contacto?: string; nif?: string;
}) {
  return db.supplier.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(),
      contacto: dados.contacto?.trim() || null,
      nif: dados.nif?.trim() || null,
    },
  });
}

export function fornecedoresDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.supplier.findMany({
    where: { locationId, arquivadoEm: null }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, contacto: true, nif: true },
  });
}

/**
 * Ligar um insumo a um fornecedor, **com o factor**.
 *
 * Sem factor, recusa-se — e a base recusa-a também, com `CHECK (factor_mili > 0)`.
 * São duas guardas de propósito: a da base é a que não se pode contornar, e a
 * daqui é a que diz o **nome** da recusa a quem está a preencher o formulário.
 */
export async function ligarArtigo(db: ClienteComEscopo, dados: {
  organizationId: string; supplierId: string; itemId: string;
  unidadeDeCompra: string; factorMili: number | bigint;
  precoMenor?: number | bigint; moeda?: string;
}) {
  const factor = inteiroPositivo(dados.factorMili, 'o factor de conversão');
  if (!dados.unidadeDeCompra.trim()) {
    throw new RecusaDaCompra('SEM_FACTOR', 'a unidade de compra não pode ser vazia');
  }
  if (dados.precoMenor !== undefined
      && typeof dados.precoMenor === 'number' && !Number.isInteger(dados.precoMenor)) {
    throw new RecusaDaCompra('DINHEIRO_INVALIDO',
      'o preço é inteiro em unidade menor — cêntimos, não euros com vírgula');
  }
  return db.supplierItem.create({
    data: {
      organizationId: dados.organizationId, supplierId: dados.supplierId,
      itemId: dados.itemId, unidadeDeCompra: dados.unidadeDeCompra.trim(),
      factorMili: factor,
      precoMenor: dados.precoMenor === undefined ? null : BigInt(dados.precoMenor),
      ...(dados.moeda ? { moeda: dados.moeda } : {}),
    },
  });
}

export function artigosDoFornecedor(db: ClienteComEscopo, supplierId: string) {
  return db.supplierItem.findMany({
    where: { supplierId },
    orderBy: { unidadeDeCompra: 'asc' },
    select: {
      id: true, unidadeDeCompra: true, factorMili: true, precoMenor: true, moeda: true,
      insumo: { select: { id: true, nome: true, unidade: true } },
    },
  });
}

// ── Encomendas: uma INTENÇÃO ───────────────────────────────────────────────

export function criarEncomenda(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; supplierId: string;
  numero: string; criadaPor?: string;
}) {
  return db.purchaseOrder.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      supplierId: dados.supplierId, numero: dados.numero.trim(),
      criadaPor: dados.criadaPor ?? null,
    },
  });
}

export async function juntarLinhaDaEncomenda(db: ClienteComEscopo, dados: {
  organizationId: string; purchaseOrderId: string; supplierItemId: string;
  encomendadoMili: number | bigint;
}) {
  const quanto = inteiroPositivo(dados.encomendadoMili, 'o encomendado');
  const artigo = await db.supplierItem.findUnique({
    where: { id: dados.supplierItemId }, select: { id: true },
  });
  if (!artigo) throw new RecusaDaCompra('ARTIGO_DESCONHECIDO', dados.supplierItemId);
  return db.purchaseOrderLine.create({
    data: {
      organizationId: dados.organizationId, purchaseOrderId: dados.purchaseOrderId,
      supplierItemId: dados.supplierItemId, encomendadoMili: quanto,
    },
  });
}

export function encomendasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.purchaseOrder.findMany({
    where: { locationId }, orderBy: { criadaEm: 'desc' },
    select: {
      id: true, numero: true, estado: true, criadaEm: true,
      fornecedor: { select: { id: true, nome: true } },
      linhas: { select: { id: true } },
      recepcoes: { select: { id: true } },
    },
  });
}

// ── Recepção: a ÚNICA coisa que mexe no stock ──────────────────────────────

/**
 * Receber mercadoria. **A única porta desta etapa para o stock.**
 *
 * Cada linha recebida gera uma entrada com `receiptLineId` ao lado, e o índice
 * único parcial faz do reenvio a mesma entrada: um duplo carregar no botão com
 * o camionista à espera é o cenário provável, não o raro.
 *
 * O `createMany` com `skipDuplicates` é a lição do E24: apanhar a colisão do
 * índice com `try/catch` dentro da transacção abortá-la-ia (`25P02`).
 */
export async function receber(db: ClienteComEscopo, dados: {
  organizationId: string;
  purchaseOrderId: string;
  recebidaPor?: string;
  nota?: string;
  linhas: {
    purchaseOrderLineId: string;
    recebidoMili: number | bigint;
    custoTotalMenor: number | bigint;
    moeda?: string;
  }[];
}): Promise<{ receiptId: string; entradas: number; entradaMili: bigint }> {
  if (dados.linhas.length === 0) {
    throw new RecusaDaCompra('QUANTIDADE_INVALIDA', 'uma recepção sem linhas não é uma recepção');
  }

  const recepcao = await db.receipt.create({
    data: {
      organizationId: dados.organizationId, purchaseOrderId: dados.purchaseOrderId,
      recebidaPor: dados.recebidaPor ?? null, nota: dados.nota?.trim() || null,
    },
  });

  let entradas = 0;
  let total = 0n;
  for (const l of dados.linhas) {
    const quanto = inteiroPositivo(l.recebidoMili, 'o recebido');
    if (typeof l.custoTotalMenor === 'number' && !Number.isInteger(l.custoTotalMenor)) {
      throw new RecusaDaCompra('DINHEIRO_INVALIDO',
        'o custo é inteiro em unidade menor — cêntimos, não euros com vírgula');
    }
    const linha = await db.purchaseOrderLine.findUnique({
      where: { id: l.purchaseOrderLineId },
      select: {
        purchaseOrderId: true,
        artigo: { select: { factorMili: true, itemId: true, insumo: { select: { organizationId: true } } } },
      },
    });
    if (!linha) throw new RecusaDaCompra('ARTIGO_DESCONHECIDO', l.purchaseOrderLineId);
    // Receber contra a linha de OUTRA encomenda punha stock a entrar por uma
    // porta que ninguém abriu, e a diferença aparecia na encomenda errada.
    if (linha.purchaseOrderId !== dados.purchaseOrderId) {
      throw new RecusaDaCompra('LINHA_DE_OUTRA_ENCOMENDA', l.purchaseOrderLineId);
    }

    const linhaDaRecepcao = await db.receiptLine.create({
      data: {
        organizationId: dados.organizationId, receiptId: recepcao.id,
        purchaseOrderLineId: l.purchaseOrderLineId,
        recebidoMili: quanto, custoTotalMenor: BigInt(l.custoTotalMenor),
        ...(l.moeda ? { moeda: l.moeda } : {}),
      },
    });

    const entradaMili = converterParaUso(quanto, linha.artigo.factorMili);
    const r = await db.stockMovement.createMany({
      data: [{
        organizationId: linha.artigo.insumo.organizationId,
        itemId: linha.artigo.itemId,
        tipo: 'ENTRADA',
        quantidadeMili: entradaMili,
        motivo: 'recepção de compra',
        receiptLineId: linhaDaRecepcao.id,
      }],
      skipDuplicates: true,
    });
    entradas += r.count;
    total += entradaMili;
  }

  return { receiptId: recepcao.id, entradas, entradaMili: total };
}

// ── Factura: PAPEL ─────────────────────────────────────────────────────────

export function registarFactura(db: ClienteComEscopo, dados: {
  organizationId: string; supplierId: string; purchaseOrderId?: string;
  numero: string;
  linhas: { supplierItemId: string; facturadoMili: number | bigint; totalMenor: number | bigint }[];
}) {
  for (const l of dados.linhas) inteiroPositivo(l.facturadoMili, 'o facturado');
  return db.supplierInvoice.create({
    data: {
      organizationId: dados.organizationId, supplierId: dados.supplierId,
      purchaseOrderId: dados.purchaseOrderId ?? null, numero: dados.numero.trim(),
      linhas: {
        create: dados.linhas.map((l) => ({
          organizationId: dados.organizationId,
          supplierItemId: l.supplierItemId,
          facturadoMili: BigInt(l.facturadoMili),
          totalMenor: BigInt(l.totalMenor),
        })),
      },
    },
  });
}

// ── As TRÊS colunas, e as diferenças DERIVADAS ─────────────────────────────

export interface LinhaConferida {
  linhaId: string;
  artigo: string;
  insumo: string;
  unidadeDeCompra: string;
  encomendadoMili: bigint;
  recebidoMili: bigint;
  facturadoMili: bigint;
  /** `recebido − encomendado`. Negativo é falta, positivo é a mais. */
  diferencaRecepcao: bigint;
  /** `facturado − recebido`. Positivo é o fornecedor a cobrar o que não entregou. */
  diferencaFactura: bigint;
}

/**
 * A conferência de uma encomenda: três números por linha, e as diferenças.
 *
 * ── Porque é que as diferenças não estão guardadas ────────────────────────
 *
 * São subtracções. Guardá-las era mais um número para ficar errado, e ficava:
 * bastava uma segunda recepção escrita por outro caminho. É a mesma decisão do
 * saldo de stock, do estado da conta e do `producao_em`.
 *
 * E não há um estado que colapse os três. «Recebida» obrigava a escolher entre
 * recebida e recebida a menos, e a escolha apagava a diferença que a casa
 * precisa de ver — que é exactamente a informação por que esta tela existe.
 */
export async function conferirEncomenda(
  db: ClienteComEscopo, purchaseOrderId: string,
): Promise<LinhaConferida[]> {
  const linhas = await db.purchaseOrderLine.findMany({
    where: { purchaseOrderId },
    select: {
      id: true, encomendadoMili: true, supplierItemId: true,
      artigo: {
        select: {
          unidadeDeCompra: true, insumo: { select: { nome: true } },
        },
      },
      recebidas: { select: { recebidoMili: true } },
    },
  });
  const encomenda = await db.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId }, select: { id: true },
  });
  const facturadas = await db.supplierInvoiceLine.findMany({
    where: { factura: { purchaseOrderId: encomenda.id } },
    select: { supplierItemId: true, facturadoMili: true },
  });
  const porArtigo = new Map<string, bigint>();
  for (const f of facturadas) {
    porArtigo.set(f.supplierItemId, (porArtigo.get(f.supplierItemId) ?? 0n) + f.facturadoMili);
  }

  return linhas.map((l) => {
    const recebido = l.recebidas.reduce((s, r) => s + r.recebidoMili, 0n);
    const facturado = porArtigo.get(l.supplierItemId) ?? 0n;
    return {
      linhaId: l.id,
      artigo: l.artigo.unidadeDeCompra,
      insumo: l.artigo.insumo.nome,
      unidadeDeCompra: l.artigo.unidadeDeCompra,
      encomendadoMili: l.encomendadoMili,
      recebidoMili: recebido,
      facturadoMili: facturado,
      diferencaRecepcao: recebido - l.encomendadoMili,
      diferencaFactura: facturado - recebido,
    };
  });
}

// ── O custo, e o método está ESCRITO ───────────────────────────────────────

export interface CustoDoInsumo {
  entradas: number;
  quantidadeMili: bigint;
  custoTotalMenor: bigint;
  /** Custo por unidade de uso (1 000 000 milésimos), em unidade menor. */
  medioPorUnidadeMenor: bigint | null;
}

/**
 * MÉDIA PONDERADA MÓVEL, derivada das entradas. Nunca uma coluna.
 *
 * ── Porque não PEPS ───────────────────────────────────────────────────────
 *
 * A farinha do saco novo e a do saco velho estão no mesmo balde. O produto não
 * sabe qual delas saiu, e um método que finge saber produz um número exacto que
 * está errado. A média assume o que é verdade — que se misturaram.
 *
 * Está escrito no contrato porque **um custeio implícito é um número que
 * ninguém consegue reproduzir**.
 */
export async function custoDoInsumo(
  db: ClienteComEscopo, itemId: string,
): Promise<CustoDoInsumo> {
  const linhas = await db.receiptLine.findMany({
    where: { linha: { artigo: { itemId } } },
    select: {
      recebidoMili: true, custoTotalMenor: true,
      linha: { select: { artigo: { select: { factorMili: true } } } },
    },
  });
  let quantidade = 0n;
  let custo = 0n;
  for (const l of linhas) {
    quantidade += converterParaUso(l.recebidoMili, l.linha.artigo.factorMili);
    custo += l.custoTotalMenor;
  }
  return {
    entradas: linhas.length,
    quantidadeMili: quantidade,
    custoTotalMenor: custo,
    medioPorUnidadeMenor: quantidade === 0n ? null : (custo * UMA_UNIDADE) / quantidade,
  };
}
