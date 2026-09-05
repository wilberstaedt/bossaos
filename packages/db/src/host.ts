import type { ClienteComEscopo } from './escopo.ts';
import { agoraDaBase, lerDefinicoes } from './reservas.ts';

/**
 * O que o host vê, e o que o host faz.
 *
 * ── Chegar, sentar e libertar são TRÊS actos ──────────────────────────────
 *
 * «Chegar não é estar sentado. Libertar uma reserva atrasada é política e acção
 * do host, nunca uma limpeza automática silenciosa.»
 *
 * Não há varredor nenhum neste ficheiro. Há uma função que **diz quem está
 * atrasado** — `atrasadas` — e três que alguém tem de chamar. A diferença é a
 * etapa inteira: um varredor daria a mesa de quem está a estacionar o carro a
 * outra pessoa, sem ninguém decidir nada.
 */

export interface ReservaDoDia {
  id: string;
  estado: string;
  pessoas: number;
  inicio: Date;
  fim: Date;
  nome: string;
  contacto: string;
  notas: string | null;
  origem: string;
  mesas: { id: string; codigo: string }[];
  chegouEm: Date | null;
  sentadaEm: Date | null;
}

/** A agenda de um dia, por hora de início. */
export async function agendaDoDia(
  db: ClienteComEscopo, locationId: string, dia: Date,
): Promise<ReservaDoDia[]> {
  const inicio = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate()));
  const fim = new Date(inicio.getTime() + 24 * 3600_000);
  const linhas = await db.reservation.findMany({
    where: { locationId, inicio: { gte: inicio, lt: fim } },
    orderBy: [{ inicio: 'asc' }, { nome: 'asc' }],
    include: { alocacoes: { include: { mesa: { select: { id: true, codigo: true } } } } },
  });
  return linhas.map((r) => ({
    id: r.id, estado: r.estado, pessoas: r.pessoas, inicio: r.inicio, fim: r.fim,
    nome: r.nome, contacto: r.contacto, notas: r.notas, origem: r.origem,
    mesas: r.alocacoes.map((a) => ({ id: a.mesa.id, codigo: a.mesa.codigo })),
    chegouEm: r.chegouEm, sentadaEm: r.sentadaEm,
  }));
}

/**
 * Quantas pessoas há prometidas em cada hora do dia.
 *
 * ── A hora é a do INÍCIO, e isso é uma escolha declarada ──────────────────
 *
 * Uma reserva das 20h que dura 90 minutos toca as 20h, as 21h e um pouco das
 * 21h30. Contá-la nas três dá uma ocupação que soma mais gente do que existe;
 * contá-la só na hora de início dá uma leitura de **chegadas**, que é o que o
 * host usa para saber quando a porta vai estar cheia.
 *
 * São dois números diferentes e ambos úteis. Este é o das chegadas, e a tela
 * di-lo por palavras — um número sem definição não é comparável.
 */
export async function chegadasPorHora(
  db: ClienteComEscopo, locationId: string, dia: Date,
): Promise<{ hora: number; pessoas: number; reservas: number }[]> {
  const reservas = await agendaDoDia(db, locationId, dia);
  const vivas = reservas.filter((r) => r.estado !== 'CANCELADA');
  const porHora = new Map<number, { pessoas: number; reservas: number }>();
  for (const r of vivas) {
    const h = r.inicio.getUTCHours();
    const actual = porHora.get(h) ?? { pessoas: 0, reservas: 0 };
    porHora.set(h, { pessoas: actual.pessoas + r.pessoas, reservas: actual.reservas + 1 });
  }
  return [...porHora.entries()]
    .map(([hora, v]) => ({ hora, ...v }))
    .sort((a, b) => a.hora - b.hora);
}

/**
 * As reservas que estão a chegar, por MESA.
 *
 * ── É por aqui que a reserva se perde entre o motor e a sala ──────────────
 *
 * «Uma reserva confirmada para as 20h tem de aparecer na sala antes das 20h,
 * senão o host vê a mesa livre e senta lá um walk-in.»
 *
 * A mesa está mesmo livre — não há sessão aberta — e é essa a armadilha: o
 * FLOOR-006 estava a dizer a verdade sobre o presente e a esconder o que aí vem.
 */
export async function reservasAChegar(
  db: ClienteComEscopo, locationId: string, dentroDeMinutos = 120,
): Promise<Map<string, { reservaId: string; nome: string; pessoas: number; inicio: Date }>> {
  const agora = await agoraDaBase(db);
  const ate = new Date(agora.getTime() + dentroDeMinutos * 60_000);
  const linhas = await db.reservationAllocation.findMany({
    where: {
      locationId,
      reserva: { estado: { in: ['CONFIRMADA', 'CHEGOU'] }, inicio: { gte: agora, lt: ate } },
    },
    include: { reserva: { select: { id: true, nome: true, pessoas: true, inicio: true } } },
    orderBy: { inicio: 'asc' },
  });
  const porMesa = new Map<string, { reservaId: string; nome: string; pessoas: number; inicio: Date }>();
  for (const a of linhas) {
    // A primeira que chega manda: é a próxima a ocupar aquela mesa.
    if (!porMesa.has(a.tableId)) {
      porMesa.set(a.tableId, {
        reservaId: a.reserva.id, nome: a.reserva.nome,
        pessoas: a.reserva.pessoas, inicio: a.reserva.inicio,
      });
    }
  }
  return porMesa;
}

/**
 * As reservas atrasadas para além da tolerância da casa.
 *
 * **Não liberta nada.** Diz quem está atrasado, e quem decide é o host — que é
 * exactamente a diferença entre isto e um varredor.
 */
export async function atrasadas(
  db: ClienteComEscopo, locationId: string,
): Promise<ReservaDoDia[]> {
  const definicoes = await lerDefinicoes(db, locationId);
  const agora = await agoraDaBase(db);
  const limite = new Date(agora.getTime() - definicoes.toleranciaAtrasoMin * 60_000);
  const hoje = await agendaDoDia(db, locationId, agora);
  return hoje.filter((r) => r.estado === 'CONFIRMADA' && r.inicio < limite);
}

/**
 * O grupo chegou. **Não o senta.**
 *
 * A base exige o carimbo, e exige-o também em `SENTADA`: ninguém se senta sem
 * ter chegado, e uma linha que o diga perdeu o momento em que o grupo apareceu à
 * porta — que é o número de que a tolerância de atraso vive.
 */
export async function marcarChegada(
  db: ClienteComEscopo, reservaId: string,
): Promise<void> {
  await db.reservation.update({
    where: { id: reservaId },
    data: { estado: 'CHEGOU', chegouEm: new Date() },
  });
}

/**
 * Sentar o grupo, e é aqui que a sessão de mesa nasce.
 *
 * ── Uma transacção, e não duas ────────────────────────────────────────────
 *
 * A reserva passa a `SENTADA` e a sessão de mesa abre no mesmo acto. Em duas
 * transacções, um erro no meio deixava uma reserva sentada sem mesa aberta — e o
 * mapa da sala mostrava livre uma mesa com gente lá.
 */
export async function sentarReserva(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  reservaId: string, tableId: string, por: string,
): Promise<{ ok: true; sessaoId: string } | { ok: false; motivo: 'NAO_CHEGOU' | 'MESA_OCUPADA' }> {
  const reserva = await db.reservation.findFirst({
    where: { id: reservaId, locationId },
    select: { estado: true, pessoas: true, chegouEm: true },
  });
  // Sentar quem não chegou é a forma silenciosa de o check-in deixar de existir.
  if (!reserva || !reserva.chegouEm) return { ok: false, motivo: 'NAO_CHEGOU' };

  const ocupada = await db.tableSession.findFirst({
    where: { tableId, estado: { not: 'FECHADA' } }, select: { id: true },
  });
  if (ocupada) return { ok: false, motivo: 'MESA_OCUPADA' };

  const sessao = await db.tableSession.create({
    data: {
      organizationId, locationId, tableId,
      comensais: reserva.pessoas, abertaPor: por,
    },
    select: { id: true },
  });
  await db.reservation.update({
    where: { id: reservaId },
    data: { estado: 'SENTADA', sentadaEm: new Date() },
  });
  return { ok: true, sessaoId: sessao.id };
}

/**
 * Um walk-in: gente que chega sem reserva.
 *
 * «Walk-ins usam as mesmas alocações.» Abre uma sessão de mesa — e é isso que faz
 * a disponibilidade do E18 contar com eles, sem nenhum caminho especial.
 */
export async function abrirWalkIn(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  tableId: string, pessoas: number, por: string,
): Promise<{ ok: true; sessaoId: string } | { ok: false; motivo: 'MESA_OCUPADA' }> {
  const ocupada = await db.tableSession.findFirst({
    where: { tableId, estado: { not: 'FECHADA' } }, select: { id: true },
  });
  if (ocupada) return { ok: false, motivo: 'MESA_OCUPADA' };
  const sessao = await db.tableSession.create({
    data: { organizationId, locationId, tableId, comensais: pessoas, abertaPor: por },
    select: { id: true },
  });
  return { ok: true, sessaoId: sessao.id };
}

export async function reservaPorId(
  db: ClienteComEscopo, locationId: string, reservaId: string,
): Promise<ReservaDoDia | null> {
  const r = await db.reservation.findFirst({
    where: { id: reservaId, locationId },
    include: { alocacoes: { include: { mesa: { select: { id: true, codigo: true } } } } },
  });
  if (!r) return null;
  return {
    id: r.id, estado: r.estado, pessoas: r.pessoas, inicio: r.inicio, fim: r.fim,
    nome: r.nome, contacto: r.contacto, notas: r.notas, origem: r.origem,
    mesas: r.alocacoes.map((a) => ({ id: a.mesa.id, codigo: a.mesa.codigo })),
    chegouEm: r.chegouEm, sentadaEm: r.sentadaEm,
  };
}

/**
 * Os cinco números do relatório de reservas.
 *
 * ── Cada um vem com a sua DEFINIÇÃO ────────────────────────────────────────
 *
 * «Cinco números que toda a gente acha que sabe o que são e ninguém define
 * igual.» Um «no-show: 12» sem dizer se conta a reserva ou as pessoas, e a
 * partir de que minuto, é um número que o dono vai usar para decidir e que
 * ninguém consegue reproduzir.
 *
 * A definição não vive só no ecrã: vem daqui, ao lado do valor, para que não
 * possa haver duas — uma no código e outra na legenda.
 */
export interface NumeroComDefinicao {
  chave: string;
  valor: number;
  /** A chave da frase que descreve o que este número conta. */
  definicao: string;
}

export async function relatorioDeReservas(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
): Promise<NumeroComDefinicao[]> {
  const reservas = await db.reservation.findMany({
    where: { locationId, inicio: { gte: de, lt: ate } },
    select: { estado: true, pessoas: true, origem: true },
  });

  const vivas = reservas.filter((r) => r.estado !== 'CANCELADA');
  const canceladas = reservas.filter((r) => r.estado === 'CANCELADA');
  const naoCompareceram = reservas.filter((r) => r.estado === 'NAO_COMPARECEU');
  const doPublico = vivas.filter((r) => r.origem === 'PUBLICO');

  return [
    // Covers conta PESSOAS, e não reservas: é o número que a cozinha usa.
    { chave: 'covers', valor: vivas.reduce((t, r) => t + r.pessoas, 0),
      definicao: 'defCovers' },
    { chave: 'reservas', valor: vivas.length, definicao: 'defReservas' },
    // Cancelamento é uma percentagem sobre TUDO o que foi pedido, incluindo o
    // que foi cancelado — o denominador é a parte que ninguém define igual.
    { chave: 'cancelamento',
      valor: reservas.length === 0 ? 0
        : Math.round((canceladas.length / reservas.length) * 100),
      definicao: 'defCancelamento' },
    // No-show conta RESERVAS, não pessoas, e só as que o host marcou.
    { chave: 'noShow', valor: naoCompareceram.length, definicao: 'defNoShow' },
    { chave: 'origemPublica',
      valor: vivas.length === 0 ? 0 : Math.round((doPublico.length / vivas.length) * 100),
      definicao: 'defOrigem' },
  ];
}
