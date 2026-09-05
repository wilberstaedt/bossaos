import type { ClienteComEscopo } from './escopo.ts';

/**
 * A fila de mensagens das reservas.
 *
 * ── Reenviar não entrega duas vezes ────────────────────────────────────────
 *
 * «Templates transacionais, fila, resultado por provedor, histórico e reenvio
 * deduplicado.» É a família que já apareceu duas vezes neste projecto — entrega
 * repetível com efeitos deduplicados — e o que se esquece é sempre o mesmo.
 *
 * A MENSAGEM existe uma vez por (reserva, tipo); as TENTATIVAS penduram-se nela.
 * Reenviar acrescenta uma tentativa; entregar outra vez é impossível, porque a
 * entrega é um carimbo e um carimbo que já existe não se escreve de novo.
 *
 * E uma mensagem **diferente** para a mesma reserva tem chave diferente, logo é
 * enviada. Sem essa metade, «engole tudo o que se parece» satisfazia o teste.
 */

export type ResultadoDaMensagem =
  | { ok: true; mensagemId: string; entregue: true }
  | { ok: false; mensagemId: string; motivo: 'JA_ENTREGUE' | 'SEM_PROVEDOR' | 'FALHOU' };

export interface Conector {
  provedor: string | null;
  activo: boolean;
}

/**
 * O conector da unidade.
 *
 * Sem linha, está desligado. Ausência é ausência: uma unidade que nunca
 * configurou mensageria não tem mensageria, e não uma qualquer por omissão.
 */
export async function conectorDaUnidade(
  db: ClienteComEscopo, locationId: string,
): Promise<Conector> {
  const linha = await db.messagingConnector.findUnique({ where: { locationId } });
  return { provedor: linha?.provedor ?? null, activo: linha?.activo ?? false };
}

/** O texto a usar, ou `null` se a casa ainda não o escreveu. */
export async function templateDe(
  db: ClienteComEscopo, locationId: string, tipo: string, idioma: string,
): Promise<{ assunto: string; corpo: string } | null> {
  const t = await db.messageTemplate.findFirst({
    where: { locationId, tipo, idioma, activo: true },
    select: { assunto: true, corpo: true },
  });
  return t;
}

/**
 * Põe uma mensagem na fila, e tenta entregá-la.
 *
 * ── Sem provedor, fica PENDENTE — e nunca ENVIADA ─────────────────────────
 *
 * «Sem provedor configurado, o conector fica desligado e visível como desligado
 * — não a fingir que enviou.»
 *
 * `PENDENTE` não é `FALHADA`: falhar é ter tentado e não ter conseguido. Sem
 * provedor não se chegou a tentar, e chamar-lhe falha manda alguém procurar um
 * erro que não existe. A tentativa fica registada com o motivo, para o histórico
 * dizer a verdade.
 */
export async function enfileirar(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  reservaId: string, tipo: string, idioma: string,
  entregar?: (assunto: string, corpo: string) => Promise<{ ok: boolean; erro?: string }>,
): Promise<ResultadoDaMensagem> {
  const conector = await conectorDaUnidade(db, locationId);
  const texto = await templateDe(db, locationId, tipo, idioma);

  // A mensagem existe uma vez. `upsert` na chave (reserva, tipo) é o que faz o
  // reenvio cair na mesma linha em vez de criar outra.
  const mensagem = await db.reservationMessage.upsert({
    where: { uma_mensagem_por_reserva_e_tipo: { reservationId: reservaId, tipo } },
    create: {
      organizationId, locationId, reservationId: reservaId, tipo, idioma,
      estado: 'PENDENTE',
      assunto: texto?.assunto ?? null, corpo: texto?.corpo ?? null,
    },
    update: {},
    select: { id: true, estado: true, entregueEm: true, assunto: true, corpo: true },
  });

  // ── Já entregue: acrescenta a tentativa, e NÃO entrega ─────────────────
  //
  // É aqui que o reenviar deixa de duplicar. O histórico regista que alguém
  // tentou, que é a verdade, e o cliente não recebe segunda vez.
  if (mensagem.entregueEm) {
    await db.reservationMessageAttempt.create({
      data: {
        organizationId, messageId: mensagem.id, provedor: conector.provedor,
        resultado: 'JA_ENTREGUE',
      },
    });
    return { ok: false, mensagemId: mensagem.id, motivo: 'JA_ENTREGUE' };
  }

  if (!conector.activo || !conector.provedor) {
    await db.reservationMessageAttempt.create({
      data: {
        organizationId, messageId: mensagem.id, provedor: null,
        resultado: 'SEM_PROVEDOR',
        erro: 'o conector de mensageria está desligado',
      },
    });
    await db.reservationMessage.update({
      where: { id: mensagem.id },
      data: { estado: 'PENDENTE', erro: 'sem provedor configurado' },
    });
    return { ok: false, mensagemId: mensagem.id, motivo: 'SEM_PROVEDOR' };
  }

  const r = entregar
    ? await entregar(mensagem.assunto ?? '', mensagem.corpo ?? '')
    : { ok: false, erro: 'sem transporte' };

  await db.reservationMessageAttempt.create({
    data: {
      organizationId, messageId: mensagem.id, provedor: conector.provedor,
      resultado: r.ok ? 'ENTREGUE' : 'FALHOU',
      erro: r.ok ? null : (r.erro ?? null),
    },
  });

  if (!r.ok) {
    // ── A falha do provedor NÃO apaga a reserva ─────────────────────────
    //
    // O E18 já prova isso do lado da reserva; aqui prova-se do lado da mensagem:
    // a linha fica FALHADA, com o erro, e a reserva não é tocada.
    await db.reservationMessage.update({
      where: { id: mensagem.id },
      data: { estado: 'FALHADA', erro: r.erro ?? 'falha do provedor' },
    });
    return { ok: false, mensagemId: mensagem.id, motivo: 'FALHOU' };
  }

  await db.reservationMessage.update({
    where: { id: mensagem.id },
    data: { estado: 'ENVIADA', entregueEm: new Date(), erro: null },
  });
  return { ok: true, mensagemId: mensagem.id, entregue: true };
}

export interface MensagemNoHistorico {
  id: string;
  tipo: string;
  idioma: string;
  estado: string;
  erro: string | null;
  entregueEm: Date | null;
  reserva: { id: string; nome: string };
  tentativas: { resultado: string; provedor: string | null; erro: string | null; quando: Date }[];
}

/** O histórico: as mensagens e **todas** as tentativas de cada uma. */
export async function historicoDeMensagens(
  db: ClienteComEscopo, locationId: string,
): Promise<MensagemNoHistorico[]> {
  const linhas = await db.reservationMessage.findMany({
    where: { locationId },
    orderBy: { createdAt: 'desc' },
    include: {
      reserva: { select: { id: true, nome: true } },
      tentativas: { orderBy: { createdAt: 'asc' } },
    },
  });
  return linhas.map((m) => ({
    id: m.id, tipo: m.tipo, idioma: m.idioma, estado: m.estado, erro: m.erro,
    entregueEm: m.entregueEm,
    reserva: { id: m.reserva.id, nome: m.reserva.nome },
    tentativas: m.tentativas.map((t) => ({
      resultado: t.resultado, provedor: t.provedor, erro: t.erro, quando: t.createdAt,
    })),
  }));
}

export async function listarTemplates(db: ClienteComEscopo, locationId: string) {
  return db.messageTemplate.findMany({
    where: { locationId }, orderBy: [{ tipo: 'asc' }, { idioma: 'asc' }],
  });
}

export async function guardarTemplate(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { tipo: string; idioma: string; assunto: string; corpo: string },
): Promise<void> {
  await db.messageTemplate.upsert({
    where: {
      um_template_por_unidade_tipo_idioma: {
        locationId, tipo: dados.tipo, idioma: dados.idioma,
      },
    },
    create: { organizationId, locationId, ...dados },
    update: { assunto: dados.assunto, corpo: dados.corpo },
  });
}

/**
 * Liga ou desliga o conector.
 *
 * Ligar sem provedor não passa: a base tem um `CHECK`, e aqui devolve-se a recusa
 * como motivo em vez de deixar rebentar — é a mesma decisão de sempre.
 */
export async function guardarConector(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { provedor: string | null; activo: boolean },
): Promise<{ ok: true } | { ok: false; motivo: 'SEM_PROVEDOR' }> {
  if (dados.activo && !dados.provedor) return { ok: false, motivo: 'SEM_PROVEDOR' };
  await db.messagingConnector.upsert({
    where: { locationId },
    create: { organizationId, locationId, ...dados },
    update: dados,
  });
  return { ok: true };
}
