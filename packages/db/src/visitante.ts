import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * E17 · o QR da mesa e o visitante.
 *
 * ── Rodar não é revogar, e é essa a etapa inteira ─────────────────────────
 *
 * Um QR numa mesa é um segredo que qualquer pessoa fotografa. A resposta óbvia —
 * «então roda-se» — cria o problema oposto se rodar significar revogar: os
 * clientes a meio da refeição perdem o carrinho e a sessão, o restaurante aprende
 * isso **uma vez** e nunca mais roda. O token volta a ser eterno, agora com a
 * ilusão de que não é.
 *
 * - **Rodar** troca o segredo que abre sessões NOVAS. Acto de rotina, e por isso
 *   barato: não fecha nada.
 * - **Revogar** fecha as sessões vivas daquela mesa. Acto de excepção, e diz-se
 *   ao revogar — quantas caem, um número e nunca o conteúdo.
 */

/** O resumo. A base nunca guarda o segredo, como os convites do E04. */
export function resumirSegredo(segredo: string): string {
  return createHash('sha256').update(segredo, 'utf8').digest('hex');
}

/**
 * Um segredo novo, em texto, para ser impresso **uma vez**.
 *
 * 24 bytes em base64url. Não é um identificador legível de propósito: um
 * segredo que se possa adivinhar a partir do número da mesa não é um segredo, e
 * `mesa-07` é exactamente o que alguém escreveria com pressa.
 */
export function segredoNovo(): string {
  return randomBytes(24).toString('base64url');
}

// ── Rodar ──────────────────────────────────────────────────────────────────

export interface ResultadoDaRotacao {
  ok: true;
  /** Em claro, e **só aqui**. Quem não o imprimir agora tem de rodar outra vez. */
  segredo: string;
  geracao: number;
  /** Quantas sessões de visitante continuaram vivas. É o ponto todo. */
  sessoesQueContinuam: number;
}

/**
 * Roda o QR da mesa: segredo novo, sessões vivas **intactas**.
 *
 * ── O que esta função NÃO toca ────────────────────────────────────────────
 *
 * `guest_sessions`. Nem uma linha. Não é cuidado ao escrever — é o que a forma
 * permite: a sessão de visitante tem token próprio e **não guarda a geração do
 * QR**, portanto não há nada aqui que a possa invalidar.
 *
 * Devolve `sessoesQueContinuam` porque o ecrã tem de o poder dizer a quem roda:
 * a pergunta que essa pessoa tem na cabeça é «vou estragar o jantar de alguém?»,
 * e a resposta é um número.
 */
export async function rodarQrDaMesa(
  db: ClienteComEscopo,
  dados: { tableId: string; actor: { email: string } },
): Promise<ResultadoDaRotacao | { ok: false; motivo: 'mesa_desconhecida' }> {
  const mesa = await db.serviceTable.findFirst({
    where: { id: dados.tableId, archivedAt: null },
    select: { id: true, qrGeracao: true, organizationId: true },
  });
  if (!mesa) return { ok: false, motivo: 'mesa_desconhecida' };

  const segredo = segredoNovo();
  const geracao = mesa.qrGeracao + 1;
  await db.serviceTable.update({
    where: { id: mesa.id },
    data: { qrSegredoHash: resumirSegredo(segredo), qrGeracao: geracao, qrRodadoEm: new Date() },
  });

  // Contadas DEPOIS da troca, porque é depois que a pergunta faz sentido: são as
  // que sobreviveram. Contá-las antes dizia quantas havia, que é outra coisa.
  const sessoesQueContinuam = await db.guestSession.count({
    where: {
      tableId: mesa.id, estado: 'ACTIVA',
      sessaoDeMesa: { estado: { not: 'FECHADA' } },
    },
  });

  return { ok: true, segredo, geracao, sessoesQueContinuam };
}

// ── Revogar ────────────────────────────────────────────────────────────────

/**
 * Quantas sessões vivas caem se esta mesa for revogada **agora**.
 *
 * Existe para o ecrã dizer o número **antes** de confirmar, como no DEV-004 do
 * E13: *«descartar é aceitável quando quem decide sabe o que está a descartar;
 * descobrir depois não é.»*
 */
export function sessoesVivasDaMesa(db: ClienteComEscopo, tableId: string) {
  return db.guestSession.findMany({
    where: { tableId, estado: 'ACTIVA', sessaoDeMesa: { estado: { not: 'FECHADA' } } },
    select: { id: true, abertaEm: true, ultimaVezEm: true },
    orderBy: { abertaEm: 'asc' },
  });
}

/**
 * Revoga o acesso da mesa: as sessões vivas caem.
 *
 * ── Exige motivo, e não roda o segredo ────────────────────────────────────
 *
 * Um acto de excepção sem razão escrita é uma decisão que ninguém consegue rever
 * — a mesma regra do cancelamento no E16.
 *
 * E **não** troca o segredo: são dois actos, e juntá-los aqui por conveniência
 * era refazer o colapso pelo outro lado. Quem quer as duas coisas faz as duas, e
 * o ecrã oferece-as separadas.
 */
export async function revogarAcessoDaMesa(
  db: ClienteComEscopo,
  dados: { tableId: string; motivo: string; actor: { email: string } },
): Promise<{ ok: true; revogadas: number } | { ok: false; motivo: 'sem_motivo' }> {
  const motivo = dados.motivo.trim();
  if (!motivo) return { ok: false, motivo: 'sem_motivo' };

  const vivas = await sessoesVivasDaMesa(db, dados.tableId);
  if (vivas.length > 0) {
    await db.guestSession.updateMany({
      where: { id: { in: vivas.map((v: { id: string }) => v.id) } },
      data: {
        estado: 'REVOGADA', revogadaEm: new Date(),
        revogadaPor: dados.actor.email, revogadaMotivo: motivo,
      },
    });
  }
  return { ok: true, revogadas: vivas.length };
}

// ── Abrir e verificar, pela porta estreita ────────────────────────────────

export interface VisitanteAberto {
  guestId: string;
  token: string;
  tableSessionId: string;
  mesaCodigo: string;
}

/**
 * Abre uma sessão de visitante a partir do QR. `null` quando não abre.
 *
 * ── Passa pela porta da base, e não pelo runtime ──────────────────────────
 *
 * Quem chega pelo QR **não tem sessão de inquilino**. Ler ou escrever com o
 * cliente do runtime aqui devolvia vazio pela política de linha; dar-lhe contexto
 * era abrir a organização inteira a quem tem um autocolante. A `abrir_visitante`
 * escreve uma linha, com os identificadores que ela própria resolveu.
 *
 * ── E `null` cobre os dois casos que o contrato separa ────────────────────
 *
 * Segredo que não casa (QR antigo, depois de rodar) **e** mesa fechada com
 * segredo válido. Os dois dão «não abre», e é isso que tira valor à fotografia.
 * Distingui-los na resposta seria dizer a quem tem o autocolante se ele ainda
 * serve — informação que só é útil a quem não devia estar a perguntar.
 */
export async function abrirVisitante(
  prisma: PrismaClient,
  dados: { publicSlug: string; segredo: string },
): Promise<VisitanteAberto | null> {
  const token = segredoNovo();
  const linhas = await prisma.$queryRaw<
    { guest_id: string; table_session_id: string; mesa_codigo: string }[]
  >`SELECT * FROM abrir_visitante(${dados.publicSlug}, ${resumirSegredo(dados.segredo)}, ${resumirSegredo(token)})`;

  const linha = linhas[0];
  if (!linha) return null;
  return {
    guestId: linha.guest_id,
    token,
    tableSessionId: linha.table_session_id,
    mesaCodigo: linha.mesa_codigo,
  };
}

export interface VisitanteActivo {
  guestId: string;
  organizationId: string;
  locationId: string;
  tableId: string;
  tableSessionId: string;
  mesaCodigo: string;
}

/**
 * A sessão de visitante deste token, se ainda vale. `null` se não vale.
 *
 * A regra inteira vive na função da base: activa **e** com a mesa por fechar. Um
 * `WHERE estado = 'ACTIVA'` escrito à mão numa consulta nova era o dia em que a
 * conta fechada continuava a aceitar pedidos.
 */
export async function visitanteActivo(
  prisma: PrismaClient, token: string,
): Promise<VisitanteActivo | null> {
  const linhas = await prisma.$queryRaw<{
    guest_id: string; organization_id: string; location_id: string;
    table_id: string; table_session_id: string; mesa_codigo: string;
  }[]>`SELECT * FROM visitante_activo(${resumirSegredo(token)})`;
  const l = linhas[0];
  if (!l) return null;
  return {
    guestId: l.guest_id, organizationId: l.organization_id, locationId: l.location_id,
    tableId: l.table_id, tableSessionId: l.table_session_id, mesaCodigo: l.mesa_codigo,
  };
}

/** Marca o sinal de vida. «Nunca pediu nada» é diferente de «pediu há uma hora». */
export async function visitanteFalou(prisma: PrismaClient, guestId: string): Promise<void> {
  await prisma.guestSession.updateMany({
    where: { id: guestId }, data: { ultimaVezEm: new Date() },
  });
}

/** As sessões de visitante de uma unidade, para o QR-006. */
export function visitantesDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.guestSession.findMany({
    where: { locationId },
    include: {
      mesa: { select: { id: true, codigo: true } },
      sessaoDeMesa: { select: { id: true, estado: true } },
    },
    orderBy: { abertaEm: 'desc' },
  });
}

/**
 * O estado que o ecrã mostra de uma sessão de visitante. **Derivado.**
 *
 * Três palavras para três situações que uma pessoa distingue: alguém a revogou,
 * a conta fechou, ou está a decorrer. Guardar isto numa coluna criava a segunda
 * verdade que o E16 proibiu — e a que o ecrã mostrasse passava a depender de
 * quem escreveu por último.
 */
export function estadoDoVisitante(
  visitante: { estado: string; sessaoDeMesa: { estado: string } },
): 'ACTIVA' | 'REVOGADA' | 'MESA_FECHADA' {
  if (visitante.estado === 'REVOGADA') return 'REVOGADA';
  if (visitante.sessaoDeMesa.estado === 'FECHADA') return 'MESA_FECHADA';
  return 'ACTIVA';
}
