import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * A fronteira: o adquirente.
 *
 * ── Três coisas que a régua nomeia, e que decidem o desenho todo ──────────
 *
 * 1. **Um webhook chega duas vezes e isso é o funcionamento normal.** A
 *    identidade é a do ACONTECIMENTO — a mesma forma da mensageria do E19 — e a
 *    garantia é um índice único, não um `if já existe`: dois processos a receber
 *    o mesmo reenvio ao mesmo tempo não conseguem gravá-lo duas vezes.
 *
 * 2. **A ordem não é garantida.** O estorno pode chegar antes da captura. Por
 *    isso não há aqui máquina de transições: guarda-se o estado que o PROVEDOR
 *    autoriza, com o instante em que ELE diz que aconteceu, e o estado da conta
 *    **deriva-se** dos acontecimentos. Uma transição perde o evento que chega
 *    cedo demais; uma derivação não perde nada.
 *
 * 3. **A assinatura verifica-se antes de qualquer efeito** — antes até de ler o
 *    corpo para decidir o que fazer com ele. É a única porta do sistema onde
 *    alguém de fora consegue afirmar que dinheiro entrou.
 */

export type RecusaDoAdquirente =
  | 'ASSINATURA_INVALIDA'
  | 'SEM_CONECTOR'
  | 'CONECTOR_DESLIGADO'
  | 'CORPO_ILEGIVEL';

export class RecusaDeWebhook extends Error {
  readonly motivo: RecusaDoAdquirente;

  constructor(motivo: RecusaDoAdquirente) {
    // A mensagem NÃO diz porquê a quem a enviou: um erro que explica o que
    // faltou à assinatura é um manual de como a forjar. Quem tem a chave não
    // precisa da explicação; quem não tem, não a leva daqui.
    super(motivo);
    this.name = 'RecusaDeWebhook';
    this.motivo = motivo;
  }
}

/**
 * A verificação da assinatura, e é a primeira coisa que acontece.
 *
 * `timingSafeEqual` e não `===`: comparar cadeias de caracteres byte a byte com
 * saída antecipada revela, pelo tempo, quantos bytes acertaram. Não é teoria — é
 * a diferença entre precisar de 2^256 tentativas e precisar de algumas centenas.
 *
 * O corpo entra como **texto cru** e não como objecto. Um corpo já convertido em
 * JSON e outra vez em texto pode ter outra ordem de chaves e outro espaçamento —
 * e aí a assinatura do adquirente nunca bateria, ou pior, batia por acaso sobre
 * outra coisa.
 */
export function assinaturaConfere(
  corpoCru: string, assinatura: string | null, segredo: string,
): boolean {
  if (!assinatura || !segredo) return false;
  const esperada = createHmac('sha256', segredo).update(corpoCru, 'utf8').digest();
  let recebida: Buffer;
  try {
    recebida = Buffer.from(assinatura, 'hex');
  } catch {
    return false;
  }
  // Comprimentos diferentes fazem o `timingSafeEqual` atirar; e comparar antes
  // não vaza nada de útil, porque o comprimento do resumo é público.
  if (recebida.length !== esperada.length) return false;
  return timingSafeEqual(recebida, esperada);
}

/** O acontecimento como o adquirente o conta. */
export interface AcontecimentoDoProvedor {
  eventoId: string;
  tipo: string;
  estadoProvedor: 'AUTORIZADO' | 'CAPTURADO' | 'FALHOU' | 'DEVOLVIDO' | 'CANCELADO';
  ocorridoEm: Date;
  attemptId?: string;
  billId?: string;
  montanteMenor?: number;
  provedorRef?: string;
}

export interface ResultadoDoWebhook {
  eventoId: string;
  /** Verdadeiro quando este acontecimento já cá estava — o reenvio normal. */
  repetido: boolean;
}

/**
 * Receber um webhook.
 *
 * A ordem das operações é a decisão: **assinatura, depois corpo.** Ler o corpo
 * primeiro — nem que fosse só para saber de que conta se trata — já é dar efeito
 * a dados de um estranho, porque a escolha do que fazer a seguir passa a
 * depender deles.
 */
export async function receberWebhook(
  db: ClienteComEscopo,
  dados: {
    organizationId: string;
    provedor: string;
    corpoCru: string;
    assinatura: string | null;
    segredo: string;
  },
): Promise<ResultadoDoWebhook> {
  // ── 1. A assinatura. Antes de tudo. ──────────────────────────────────────
  if (!assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo)) {
    throw new RecusaDeWebhook('ASSINATURA_INVALIDA');
  }

  // ── 2. Só agora o corpo ──────────────────────────────────────────────────
  let evento: AcontecimentoDoProvedor;
  try {
    const bruto = JSON.parse(dados.corpoCru) as Record<string, unknown>;
    if (typeof bruto.eventoId !== 'string' || typeof bruto.tipo !== 'string') {
      throw new Error('sem identidade');
    }
    evento = {
      eventoId: bruto.eventoId,
      tipo: bruto.tipo,
      estadoProvedor: bruto.estadoProvedor as AcontecimentoDoProvedor['estadoProvedor'],
      ocorridoEm: new Date(String(bruto.ocorridoEm)),
      ...(typeof bruto.attemptId === 'string' ? { attemptId: bruto.attemptId } : {}),
      ...(typeof bruto.billId === 'string' ? { billId: bruto.billId } : {}),
      ...(typeof bruto.montanteMenor === 'number' ? { montanteMenor: bruto.montanteMenor } : {}),
      ...(typeof bruto.provedorRef === 'string' ? { provedorRef: bruto.provedorRef } : {}),
    };
    if (Number.isNaN(evento.ocorridoEm.getTime())) throw new Error('sem instante');
  } catch {
    throw new RecusaDeWebhook('CORPO_ILEGIVEL');
  }

  // ── 3. A identidade do acontecimento, garantida por ÍNDICE ───────────────
  //
  // Não há aqui «procura e se não existir insere»: entre a procura e a inserção
  // cabe o segundo processo. Tenta-se inserir e trata-se a colisão como o que
  // ela é — o reenvio normal do adquirente.
  try {
    await db.providerEvent.create({
      data: {
        organizationId: dados.organizationId,
        provedor: dados.provedor,
        eventoId: evento.eventoId,
        tipo: evento.tipo,
        estadoProvedor: evento.estadoProvedor,
        ocorridoEm: evento.ocorridoEm,
        attemptId: evento.attemptId ?? null,
        billId: evento.billId ?? null,
        montanteMenor: evento.montanteMenor ?? null,
        // O corpo fica para auditoria. A ASSINATURA nunca: um segredo em
        // registo é um segredo publicado.
        corpo: JSON.parse(dados.corpoCru) as object,
      },
    });
  } catch (e) {
    const codigo = (e as { code?: string }).code;
    if (codigo === 'P2002') return { eventoId: evento.eventoId, repetido: true };
    throw e;
  }
  return { eventoId: evento.eventoId, repetido: false };
}

/**
 * O estado que o provedor autoriza, DERIVADO do conjunto de acontecimentos.
 *
 * ── Porque não é uma máquina de transições ────────────────────────────────
 *
 * «O webhook do estorno pode chegar antes do da captura. Uma máquina de estados
 * que só aceita a transição esperada perde o segundo evento em silêncio, e o
 * registo fica a dizer uma coisa que não aconteceu.»
 *
 * Aqui não se transita: lê-se o conjunto e ordena-se pelo instante que o
 * PROVEDOR carimbou — nunca pelo da chegada, que é precisamente o que não é de
 * confiança. Por isso a ordem de chegada não pode mudar o resultado: ela não
 * entra na conta.
 *
 * O desempate é o `evento_id`, e não a ordem de inserção: dois acontecimentos
 * com o mesmo carimbo têm de dar o mesmo resultado nas duas máquinas, e a ordem
 * de inserção depende de quem chegou primeiro à rede.
 */
export async function estadoAutorizado(
  db: ClienteComEscopo, attemptId: string,
): Promise<{
  estado: 'DESCONHECIDO' | 'AUTORIZADO' | 'CAPTURADO' | 'FALHOU' | 'DEVOLVIDO' | 'CANCELADO';
  capturadoMenor: number;
  devolvidoMenor: number;
  acontecimentos: number;
}> {
  const eventos = await db.providerEvent.findMany({
    where: { attemptId },
    orderBy: [{ ocorridoEm: 'asc' }, { eventoId: 'asc' }],
    select: { estadoProvedor: true, montanteMenor: true },
  });
  if (eventos.length === 0) {
    return { estado: 'DESCONHECIDO', capturadoMenor: 0, devolvidoMenor: 0, acontecimentos: 0 };
  }
  let capturadoMenor = 0;
  let devolvidoMenor = 0;
  for (const e of eventos) {
    if (e.estadoProvedor === 'CAPTURADO') capturadoMenor = e.montanteMenor ?? capturadoMenor;
    if (e.estadoProvedor === 'DEVOLVIDO') devolvidoMenor += e.montanteMenor ?? 0;
  }
  const ultimo = eventos[eventos.length - 1]!.estadoProvedor;
  return {
    // Devolvido tudo é DEVOLVIDO, mesmo que o último a chegar tenha sido a
    // captura: o que manda é o conjunto, não o último carimbo.
    estado: (devolvidoMenor > 0 && devolvidoMenor >= capturadoMenor && capturadoMenor > 0)
      ? 'DEVOLVIDO'
      : ultimo as 'AUTORIZADO' | 'CAPTURADO' | 'FALHOU' | 'CANCELADO',
    capturadoMenor, devolvidoMenor, acontecimentos: eventos.length,
  };
}

/**
 * Pôr a nossa casa de acordo com o que o provedor autoriza.
 *
 * É idempotente por construção: cria o que falta e não toca no que existe. O
 * pagamento e a devolução são imutáveis por gatilho desde o E22, por isso «pôr
 * de acordo» nunca pode significar reescrever — significa **acrescentar o que
 * falta**, e é essa a única leitura possível.
 */
export async function reconciliarComProvedor(
  db: ClienteComEscopo,
  dados: { attemptId: string; autorizadoPor: string; provedor: string },
): Promise<{ estado: string; criouPagamento: boolean; criouDevolucao: boolean }> {
  const autorizado = await estadoAutorizado(db, dados.attemptId);
  const tentativa = await db.paymentAttempt.findUniqueOrThrow({
    where: { id: dados.attemptId },
    select: { organizationId: true, billId: true, meio: true, montanteMenor: true },
  });

  let criouPagamento = false;
  let criouDevolucao = false;

  if (autorizado.capturadoMenor > 0) {
    const jaExiste = await db.payment.findUnique({
      where: { attemptId: dados.attemptId }, select: { id: true },
    });
    if (!jaExiste) {
      await db.payment.create({
        data: {
          organizationId: tentativa.organizationId, billId: tentativa.billId,
          attemptId: dados.attemptId, meio: tentativa.meio,
          montanteMenor: autorizado.capturadoMenor,
          provedor: dados.provedor,
          provedorRef: `${dados.provedor}:${dados.attemptId}`,
        },
      });
      criouPagamento = true;
    }
    await db.paymentAttempt.updateMany({
      where: { id: dados.attemptId, estado: { not: 'CONFIRMADA' } },
      data: { estado: 'CONFIRMADA', resolvidaEm: new Date() },
    });
  }

  if (autorizado.devolvidoMenor > 0) {
    const pagamento = await db.payment.findUnique({
      where: { attemptId: dados.attemptId }, select: { id: true },
    });
    // A devolução que chega ANTES da captura não se perde nem se inventa: fica
    // no conjunto, e é aplicada quando a captura aparecer. Se nunca aparecer,
    // continua a ver-se nos acontecimentos — que é a verdade.
    if (pagamento) {
      const chave = `${dados.provedor}:refund:${dados.attemptId}:${autorizado.devolvidoMenor}`;
      const jaDevolvido = await db.refund.findFirst({
        where: { chaveIdempotente: chave }, select: { id: true },
      });
      if (!jaDevolvido) {
        await db.refund.create({
          data: {
            organizationId: tentativa.organizationId, paymentId: pagamento.id,
            montanteMenor: Math.min(autorizado.devolvidoMenor, autorizado.capturadoMenor),
            motivo: 'devolução confirmada pelo adquirente',
            autorizadoPor: dados.autorizadoPor,
            chaveIdempotente: chave,
          },
        });
        criouDevolucao = true;
      }
    }
  }

  if (autorizado.estado === 'FALHOU' || autorizado.estado === 'CANCELADO') {
    await db.paymentAttempt.updateMany({
      where: { id: dados.attemptId, estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
      data: {
        estado: autorizado.estado === 'FALHOU' ? 'FALHOU' : 'CANCELADA',
        resolvidaEm: new Date(),
      },
    });
  }

  return { estado: autorizado.estado, criouPagamento, criouDevolucao };
}

/** O conector de pagamento de uma unidade. Sem titularidade, não liga. */
export async function conectorDePagamento(db: ClienteComEscopo, locationId: string) {
  return db.paymentConnector.findUnique({
    where: { locationId },
    select: { id: true, provedor: true, merchantId: true, activo: true },
  });
}

export async function guardarConectorDePagamento(
  db: ClienteComEscopo,
  dados: {
    organizationId: string; locationId: string;
    provedor?: string; merchantId?: string; activo: boolean;
  },
): Promise<void> {
  const valores = {
    provedor: dados.provedor?.trim() || null,
    merchantId: dados.merchantId?.trim() || null,
    activo: dados.activo,
    actualizadoEm: new Date(),
  };
  await db.paymentConnector.upsert({
    where: { locationId: dados.locationId },
    update: valores,
    create: {
      organizationId: dados.organizationId, locationId: dados.locationId, ...valores,
    },
  });
}

/** Os acontecimentos de uma conta, por ordem do PROVEDOR — o que a auditoria lê. */
export async function acontecimentosDaConta(db: ClienteComEscopo, billId: string) {
  return db.providerEvent.findMany({
    where: { billId },
    orderBy: [{ ocorridoEm: 'asc' }, { eventoId: 'asc' }],
    select: {
      eventoId: true, tipo: true, estadoProvedor: true, montanteMenor: true,
      ocorridoEm: true, recebidoEm: true,
    },
  });
}
