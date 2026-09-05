import type { ClienteComEscopo } from './escopo.ts';

/**
 * Contas, pagamentos e devoluções — o motor do E22.
 *
 * ── A conta é a obrigação; o pagamento é o que se recebeu ─────────────────
 *
 * «Colapsar duas destas num campo é o erro estrutural desta área.» Por isso não
 * há aqui nenhuma função que ponha uma conta em «paga»: o estado **deriva-se**
 * de somar o confirmado e comparar com o devido. Não há coluna onde alguém
 * escreva uma liquidação que não aconteceu.
 */

export type EstadoDaConta = 'ABERTA' | 'PARCIALMENTE_LIQUIDADA' | 'LIQUIDADA';

export type RecusaDeConta =
  | 'MOEDA_DIFERENTE'
  | 'AJUSTE_EXCEDE_O_DEVIDO'
  | 'TENTATIVA_POR_RECONCILIAR'
  | 'EXCEDE_O_DEVIDO'
  | 'TROCO_NEGATIVO'
  | 'JA_CAPTURADA'
  | 'NAO_CAPTURADA'
  | 'EXCEDE_O_CAPTURADO'
  | 'CONTA_COM_PAGAMENTO'
  | 'CONTA_POR_LIQUIDAR';

export class RecusaDaConta extends Error {
  // Campo declarado à mão: o `--experimental-strip-types` do Node não suporta
  // propriedade de parâmetro, e as provas correm nesse modo.
  readonly motivo: RecusaDeConta;

  constructor(motivo: RecusaDeConta, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDaConta';
    this.motivo = motivo;
  }
}

/** O que a conta já recebeu de facto, e o que dela já voltou. */
export async function somasDaConta(
  db: ClienteComEscopo, billId: string,
): Promise<{ devidoMenor: number; pagoMenor: number; devolvidoMenor: number; moeda: string }> {
  const conta = await db.bill.findUniqueOrThrow({
    where: { id: billId }, select: { devidoMenor: true, moeda: true },
  });
  const pago = await db.payment.aggregate({
    where: { billId }, _sum: { montanteMenor: true },
  });
  const devolvido = await db.refund.aggregate({
    where: { pagamento: { billId } }, _sum: { montanteMenor: true },
  });
  return {
    devidoMenor: conta.devidoMenor,
    moeda: conta.moeda,
    pagoMenor: pago._sum.montanteMenor ?? 0,
    devolvidoMenor: devolvido._sum.montanteMenor ?? 0,
  };
}

/**
 * O estado, que se calcula e não se lê.
 *
 * A devolução **não reabre saldo a cobrar**: «liga-se o ajuste correspondente e
 * preserva-se a liquidação histórica». Por isso o devolvido não entra nesta
 * conta — uma conta liquidada que sofreu um refund continua liquidada, e o que
 * mudou é outra coisa, que se vê ao lado.
 */
export async function estadoDaConta(
  db: ClienteComEscopo, billId: string,
): Promise<EstadoDaConta> {
  const { devidoMenor, pagoMenor } = await somasDaConta(db, billId);
  if (pagoMenor <= 0) return 'ABERTA';
  return pagoMenor >= devidoMenor ? 'LIQUIDADA' : 'PARCIALMENTE_LIQUIDADA';
}

/** Abre uma conta. O número é por unidade e a moeda vive na conta. */
export async function abrirConta(
  db: ClienteComEscopo,
  dados: { organizationId: string; locationId: string; numero: string; moeda: string; sessionId?: string },
): Promise<{ id: string }> {
  return db.bill.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      numero: dados.numero, moeda: dados.moeda.toUpperCase(),
      sessionId: dados.sessionId ?? null,
    },
    select: { id: true },
  });
}

/**
 * Passa as linhas de um pedido para a conta, com o preço que valem AGORA.
 *
 * A moeda tem de ser a mesma: «somar moedas diferentes é o erro que só aparece
 * quando alguém tenta conciliar», e recusa-se em vez de se converter à socapa.
 */
export async function juntarLinhasDoPedido(
  db: ClienteComEscopo, billId: string, orderId: string,
): Promise<number> {
  const conta = await db.bill.findUniqueOrThrow({
    where: { id: billId }, select: { organizationId: true, moeda: true },
  });
  const linhas = await db.orderLine.findMany({
    where: { orderId, estado: { not: 'REJEITADA' } },
    select: { id: true, nome: true, quantidade: true, precoMenor: true, moeda: true },
  });
  let postas = 0;
  for (const l of linhas) {
    if (l.precoMenor === null) continue;
    if (l.moeda !== null && l.moeda !== conta.moeda) {
      throw new RecusaDaConta('MOEDA_DIFERENTE', `${l.moeda} numa conta em ${conta.moeda}`);
    }
    await db.billLine.create({
      data: {
        organizationId: conta.organizationId, billId, orderLineId: l.id,
        nome: l.nome, quantidade: l.quantidade, unitarioMenor: l.precoMenor,
      },
    });
    postas += 1;
  }
  return postas;
}

/**
 * Desconto ou cortesia, com alçada e motivo.
 *
 * «Descontos não podem exceder saldo elegível ou virar troco oculto.» Recusa-se
 * com nome antes de a base ter de aparar o negativo — uma mensagem sobre uma
 * coluna não diz a ninguém o que se passou.
 */
export async function ajustar(
  db: ClienteComEscopo,
  dados: {
    billId: string; tipo: 'DESCONTO' | 'CORTESIA'; montanteMenor: number;
    motivo: string; autorizadoPor: string; billLineId?: string;
  },
): Promise<{ id: string; devidoMenor: number }> {
  const conta = await db.bill.findUniqueOrThrow({
    where: { id: dados.billId }, select: { organizationId: true, devidoMenor: true },
  });
  if (dados.montanteMenor > conta.devidoMenor) {
    throw new RecusaDaConta('AJUSTE_EXCEDE_O_DEVIDO',
      `${dados.montanteMenor} sobre um devido de ${conta.devidoMenor}`);
  }
  const criado = await db.billAdjustment.create({
    data: {
      organizationId: conta.organizationId, billId: dados.billId,
      billLineId: dados.billLineId ?? null,
      base: dados.billLineId ? 'LINHA' : 'CONTA',
      tipo: dados.tipo, montanteMenor: dados.montanteMenor,
      motivo: dados.motivo, autorizadoPor: dados.autorizadoPor,
    },
    select: { id: true },
  });
  const depois = await db.bill.findUniqueOrThrow({
    where: { id: dados.billId }, select: { devidoMenor: true },
  });
  return { id: criado.id, devidoMenor: depois.devidoMenor };
}

/**
 * A porta por onde se cobra: escopo, cadeado na CONTA, e retrato fresco.
 *
 * ── Porque não é o `comEscopoSerializavel` do E18 ─────────────────────────
 *
 * Medido a 05/09, não suposto. Com `Serializable` + cadeado, duas caixas a
 * cobrar a última parcela dão uma cobrança e uma **recusa** — mas a recusa é um
 * `40001`, «write conflict», e não a regra de negócio. O motivo é que o Postgres
 * tira o retrato da transacção na PRIMEIRA instrução, que aqui é o `set_config`
 * do escopo: quando o segundo chega ao cadeado, o retrato dele já é anterior ao
 * commit do primeiro. O cadeado fá-lo esperar; não o faz ver.
 *
 * E a diferença não é estética. `40001` diz «tente outra vez», e quem tenta
 * outra vez numa sala cheia gera uma chave nova — o caminho onde se cobra duas
 * vezes. `EXCEDE_O_DEVIDO` diz o que se passou.
 *
 * Em `READ COMMITTED` cada instrução tira retrato novo, e depois do cadeado o
 * segundo lê o mundo já com o primeiro pagamento lá dentro. É essa a resposta
 * que a caixa precisa de ouvir.
 */
export async function comContaTrancada<T>(
  prisma: Parameters<typeof import('./escopo.ts').comEscopo>[0],
  escopo: Parameters<typeof import('./escopo.ts').comEscopo>[1],
  billId: string,
  fn: (db: ClienteComEscopo) => Promise<T>,
): Promise<T> {
  const { comEscopo } = await import('./escopo.ts');
  return comEscopo(prisma, escopo, async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`conta:${billId}`}))`;
    return fn(db);
  });
}

/**
 * Tentar pagar.
 *
 * ── Reconciliar ANTES de criar outra cobrança. Sempre ─────────────────────
 *
 * «Uma tentativa que teve timeout não falhou. Não se sabe.» Se houver uma por
 * resolver nesta conta, recusa-se a seguinte — sem excepção por pressa de sala,
 * porque a excepção por pressa de sala é exactamente como se cobra duas vezes.
 *
 * ── E a última parcela ────────────────────────────────────────────────────
 *
 * Duas caixas a cobrar os últimos 5,00 € da mesma conta têm de dar uma cobrança
 * e uma recusa, nunca duas cobranças. Quem chama isto passa por
 * `comEscopoSerializavel` com a CONTA como chave: o segundo espera, lê o mundo
 * já com o primeiro pagamento lá dentro, e recebe uma resposta de negócio em
 * vez de um erro de base de dados.
 */
export async function tentarPagar(
  db: ClienteComEscopo,
  dados: {
    billId: string; meio: 'DINHEIRO' | 'CARTAO' | 'FORA_DA_BOSSAOS';
    montanteMenor: number; chaveIdempotente: string;
  },
): Promise<{ id: string; repetida: boolean }> {
  const conta = await db.bill.findUniqueOrThrow({
    where: { id: dados.billId }, select: { organizationId: true },
  });

  // Idempotência primeiro: reenviar a MESMA tentativa devolve a que existe, e
  // não é uma segunda cobrança nem um erro.
  const jaExiste = await db.paymentAttempt.findFirst({
    where: { organizationId: conta.organizationId, chaveIdempotente: dados.chaveIdempotente },
    select: { id: true },
  });
  if (jaExiste) return { id: jaExiste.id, repetida: true };

  const porResolver = await db.paymentAttempt.findFirst({
    where: { billId: dados.billId, estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
    select: { id: true, estado: true },
  });
  if (porResolver) {
    throw new RecusaDaConta('TENTATIVA_POR_RECONCILIAR',
      `a tentativa ${porResolver.id} está ${porResolver.estado}`);
  }

  const { devidoMenor, pagoMenor } = await somasDaConta(db, dados.billId);
  if (pagoMenor + dados.montanteMenor > devidoMenor) {
    throw new RecusaDaConta('EXCEDE_O_DEVIDO',
      `${pagoMenor} + ${dados.montanteMenor} passa de ${devidoMenor}`);
  }

  return {
    id: (await db.paymentAttempt.create({
      data: {
        organizationId: conta.organizationId, billId: dados.billId,
        meio: dados.meio, montanteMenor: dados.montanteMenor,
        chaveIdempotente: dados.chaveIdempotente,
      },
      select: { id: true },
    })).id,
    repetida: false,
  };
}

/**
 * Confirmar: a tentativa vira pagamento.
 *
 * O troco **não se guarda**: guarda-se o recebido, e o troco é recebido menos
 * devido. Uma subtracção guardada é uma subtracção que pode passar a discordar
 * das parcelas — e no dia em que discordar, ninguém sabe qual das duas mente.
 */
export async function confirmarPagamento(
  db: ClienteComEscopo, attemptId: string, recebidoMenor?: number,
): Promise<{ id: string; trocoMenor: number }> {
  const tentativa = await db.paymentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: { id: true, organizationId: true, billId: true, meio: true, montanteMenor: true, estado: true },
  });
  if (tentativa.estado === 'CONFIRMADA') throw new RecusaDaConta('JA_CAPTURADA');

  const emDinheiro = tentativa.meio === 'DINHEIRO';
  const recebido = emDinheiro ? (recebidoMenor ?? tentativa.montanteMenor) : null;
  if (recebido !== null && recebido < tentativa.montanteMenor) {
    throw new RecusaDaConta('TROCO_NEGATIVO',
      `recebeu ${recebido} para cobrar ${tentativa.montanteMenor}`);
  }

  const pagamento = await db.payment.create({
    data: {
      organizationId: tentativa.organizationId, billId: tentativa.billId,
      attemptId: tentativa.id, meio: tentativa.meio,
      montanteMenor: tentativa.montanteMenor, recebidoMenor: recebido,
    },
    select: { id: true },
  });
  await db.paymentAttempt.update({
    where: { id: attemptId }, data: { estado: 'CONFIRMADA', resolvidaEm: new Date() },
  });
  return { id: pagamento.id, trocoMenor: recebido === null ? 0 : recebido - tentativa.montanteMenor };
}

/**
 * Reconciliar uma tentativa que ficou sem resposta.
 *
 * É a única porta que tira uma conta do estado indeterminado, e existe para que
 * essa saída seja um ACTO — com resultado dito — e não o efeito lateral de
 * alguém tentar pagar outra vez.
 */
export async function reconciliar(
  db: ClienteComEscopo, attemptId: string, resultado: 'CONFIRMADA' | 'FALHOU' | 'CANCELADA',
): Promise<{ pagamentoId?: string }> {
  if (resultado === 'CONFIRMADA') {
    const { id } = await confirmarPagamento(db, attemptId);
    return { pagamentoId: id };
  }
  await db.paymentAttempt.update({
    where: { id: attemptId }, data: { estado: resultado, resolvidaEm: new Date() },
  });
  return {};
}

/**
 * Anular — e anular NÃO é devolver.
 *
 * «Void (não capturado): desfaz sem movimento de dinheiro.» Se já houve captura,
 * isto recusa: o caminho é a devolução, que move dinheiro a sério e por isso tem
 * motivo e autor.
 */
export async function anular(
  db: ClienteComEscopo, attemptId: string,
): Promise<void> {
  const pago = await db.payment.findUnique({ where: { attemptId }, select: { id: true } });
  if (pago) throw new RecusaDaConta('JA_CAPTURADA', 'anular não devolve dinheiro; use a devolução');
  await db.paymentAttempt.update({
    where: { id: attemptId }, data: { estado: 'CANCELADA', resolvidaEm: new Date() },
  });
}

/**
 * Devolver, com o limite derivado do que ainda não voltou.
 *
 * «Refund parcial é saldo derivado, não um campo.» O limite calcula-se aqui a
 * cada chamada; não há coluna `devolvido` onde duas devoluções concorrentes se
 * escrevessem por cima. E repetir a mesma chave devolve a mesma devolução.
 */
export async function devolver(
  db: ClienteComEscopo,
  dados: {
    paymentId: string; montanteMenor: number; motivo: string;
    autorizadoPor: string; chaveIdempotente: string;
  },
): Promise<{ id: string; repetida: boolean; porDevolverMenor: number }> {
  const pagamento = await db.payment.findUniqueOrThrow({
    where: { id: dados.paymentId },
    select: { organizationId: true, montanteMenor: true },
  });
  const jaExiste = await db.refund.findFirst({
    where: { organizationId: pagamento.organizationId, chaveIdempotente: dados.chaveIdempotente },
    select: { id: true },
  });
  const devolvido = (await db.refund.aggregate({
    where: { paymentId: dados.paymentId }, _sum: { montanteMenor: true },
  }))._sum.montanteMenor ?? 0;
  if (jaExiste) {
    return { id: jaExiste.id, repetida: true, porDevolverMenor: pagamento.montanteMenor - devolvido };
  }
  if (devolvido + dados.montanteMenor > pagamento.montanteMenor) {
    throw new RecusaDaConta('EXCEDE_O_CAPTURADO',
      `${devolvido} + ${dados.montanteMenor} passa de ${pagamento.montanteMenor}`);
  }
  const criado = await db.refund.create({
    data: {
      organizationId: pagamento.organizationId, paymentId: dados.paymentId,
      montanteMenor: dados.montanteMenor, motivo: dados.motivo,
      autorizadoPor: dados.autorizadoPor, chaveIdempotente: dados.chaveIdempotente,
    },
    select: { id: true },
  });
  return {
    id: criado.id, repetida: false,
    porDevolverMenor: pagamento.montanteMenor - devolvido - dados.montanteMenor,
  };
}

/**
 * Reverter um ajuste — a correcção que é um registo novo.
 *
 * O ajuste original não se toca: fica lá, com quem o pôs e porquê. A reversão
 * aponta para ele, e o devido volta a contar o que estava abatido. Sem isto, o
 * ajuste imutável era uma armadilha e não uma garantia.
 */
export async function reverterAjuste(
  db: ClienteComEscopo,
  dados: { ajusteId: string; motivo: string; autorizadoPor: string },
): Promise<{ id: string; devidoMenor: number }> {
  const original = await db.billAdjustment.findUniqueOrThrow({
    where: { id: dados.ajusteId },
    select: {
      organizationId: true, billId: true, billLineId: true, tipo: true,
      base: true, montanteMenor: true, reverteId: true,
    },
  });
  if (original.reverteId !== null) {
    throw new RecusaDaConta('AJUSTE_EXCEDE_O_DEVIDO', 'uma reversão não se reverte');
  }
  const criado = await db.billAdjustment.create({
    data: {
      organizationId: original.organizationId, billId: original.billId,
      billLineId: original.billLineId, tipo: original.tipo, base: original.base,
      montanteMenor: original.montanteMenor, motivo: dados.motivo,
      autorizadoPor: dados.autorizadoPor, reverteId: dados.ajusteId,
    },
    select: { id: true },
  });
  const depois = await db.bill.findUniqueOrThrow({
    where: { id: original.billId }, select: { devidoMenor: true },
  });
  return { id: criado.id, devidoMenor: depois.devidoMenor };
}

/**
 * Transferir uma linha de uma conta para outra.
 *
 * «Itens já liquidados não podem ser movidos silenciosamente» — e o advérbio é
 * o que interessa. Aqui recusa-se com nome; e por baixo a base recusa na mesma,
 * por gatilho, para quem chegue por outro caminho que não este.
 *
 * O índice único sobre `order_line_id` é a outra metade: sem ele, transferir era
 * copiar, e a soma das duas contas passava a ser maior do que o pedido.
 */
export async function transferirLinha(
  db: ClienteComEscopo, billLineId: string, paraBillId: string,
): Promise<void> {
  const linha = await db.billLine.findUniqueOrThrow({
    where: { id: billLineId }, select: { billId: true },
  });
  for (const conta of [linha.billId, paraBillId]) {
    const { pagoMenor } = await somasDaConta(db, conta);
    if (pagoMenor > 0) {
      throw new RecusaDaConta('CONTA_COM_PAGAMENTO', `a conta ${conta} já tem ${pagoMenor} pago`);
    }
  }
  const destino = await db.bill.findUniqueOrThrow({
    where: { id: paraBillId }, select: { moeda: true },
  });
  const origem = await db.bill.findUniqueOrThrow({
    where: { id: linha.billId }, select: { moeda: true },
  });
  if (destino.moeda !== origem.moeda) {
    throw new RecusaDaConta('MOEDA_DIFERENTE', `${origem.moeda} para ${destino.moeda}`);
  }
  await db.billLine.update({ where: { id: billLineId }, data: { billId: paraBillId } });
}

/**
 * Fechar a conta — e só quando o saldo o permitir.
 *
 * «Encerrar mesa somente quando a regra de saldo e serviço permitir.» Fechar uma
 * conta com uma tentativa por reconciliar seria fechar sem saber se o cliente
 * foi cobrado, que é a versão silenciosa do pior caso desta etapa.
 */
export async function fecharConta(
  db: ClienteComEscopo, billId: string, fechadaPor: string,
): Promise<void> {
  const porResolver = await db.paymentAttempt.count({
    where: { billId, estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
  });
  if (porResolver > 0) {
    throw new RecusaDaConta('TENTATIVA_POR_RECONCILIAR', `${porResolver} por reconciliar`);
  }
  if ((await estadoDaConta(db, billId)) !== 'LIQUIDADA') {
    throw new RecusaDaConta('CONTA_POR_LIQUIDAR');
  }
  await db.bill.update({
    where: { id: billId }, data: { fechadaEm: new Date(), fechadaPor },
  });
}

/** As contas abertas de uma unidade — o que o TPV mostra ao abrir. */
export async function contasAbertas(
  db: ClienteComEscopo, locationId: string,
): Promise<{ id: string; numero: string; devidoMenor: number; moeda: string;
             pagoMenor: number; estado: EstadoDaConta }[]> {
  const contas = await db.bill.findMany({
    where: { locationId, fechadaEm: null },
    orderBy: { criadaEm: 'asc' },
    select: { id: true, numero: true, devidoMenor: true, moeda: true },
  });
  const saida = [];
  for (const c of contas) {
    const { pagoMenor } = await somasDaConta(db, c.id);
    saida.push({
      ...c, pagoMenor,
      estado: (pagoMenor <= 0 ? 'ABERTA'
        : pagoMenor >= c.devidoMenor ? 'LIQUIDADA'
        : 'PARCIALMENTE_LIQUIDADA') as EstadoDaConta,
    });
  }
  return saida;
}
