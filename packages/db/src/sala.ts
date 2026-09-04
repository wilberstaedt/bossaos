import type { PrismaClient } from '@prisma/client';
import { comEscopo, type ClienteComEscopo } from './escopo.ts';

/**
 * Sala: zonas, mesas e sessões (E13).
 *
 * ── A coisa que decide a forma deste ficheiro ─────────────────────────────
 *
 * É a primeira etapa em que **duas pessoas mexem na mesma coisa ao mesmo
 * tempo**. Dois empregados abrem a mesa 7 no mesmo segundo, cada um no seu
 * tablet, e nenhum dos dois vê o outro. Tudo o que veio antes tinha um dono de
 * cada vez, e por isso podia dar-se ao luxo de ler antes de escrever.
 *
 * Aqui não. **A unicidade vem da base**, do índice único parcial
 * `uma_sessao_activa_por_mesa`, e não de uma consulta prévia. A régua do E13
 * di-lo com o número: *«um SELECT antes do INSERT é uma corrida com uma janela
 * mais estreita, e o teste passa a maior parte das vezes — que é pior do que
 * falhar sempre»*. Um defeito que passa a maior parte das vezes não é
 * reproduzível, e o que não é reproduzível não se corrige.
 */

/** O código do PostgreSQL para violação de restrição única. */
const VIOLACAO_UNICA = '23505';

function eViolacaoUnica(erro: unknown, indice?: string): boolean {
  const e = erro as { code?: string; meta?: { target?: unknown }; message?: string } | null;
  const codigo = e?.code ?? (e as { cause?: { code?: string } } | null)?.cause?.code;
  if (codigo !== VIOLACAO_UNICA && codigo !== 'P2002') return false;
  if (!indice) return true;
  // O nome do índice, quando se sabe qual é. Sem isto, uma colisão do CÓDIGO da
  // mesa lia-se como «a mesa está ocupada» — duas causas com a mesma resposta é
  // como se diagnostica a errada.
  const texto = `${JSON.stringify(e?.meta ?? {})} ${e?.message ?? ''}`;
  return texto.includes(indice);
}

export interface Actor {
  email: string;
  membershipId?: string;
}

export type ResultadoDeAbertura =
  | { ok: true; sessaoId: string }
  /** Já há sessão activa nesta mesa. Veio da BASE, não de uma consulta. */
  | { ok: false; motivo: 'mesa_ocupada' }
  | { ok: false; motivo: 'mesa_desconhecida' }
  | { ok: false; motivo: 'mesa_arquivada' };

/**
 * Abre uma sessão de mesa (FLOOR-007).
 *
 * ── Uma tentativa, uma TRANSACÇÃO ────────────────────────────────────────
 *
 * Recebe o `PrismaClient` e abre o seu próprio `comEscopo`, em vez de receber um
 * cliente já com escopo. Não é arrumação: uma violação de restrição **aborta a
 * transacção** no PostgreSQL, e tudo o que viesse a seguir dentro dela falharia
 * com «current transaction is aborted». Apanhar o erro dentro da transacção de
 * outra pessoa deixava-a inutilizável sem que quem a abriu soubesse porquê.
 *
 * E é o comportamento certo: uma abertura que falha não escreve **nada** — nem o
 * evento de histórico. O `ROLLBACK` dá isso de graça.
 *
 * ── Não consulta antes ───────────────────────────────────────────────────
 *
 * Repare no que **não** está aqui: nenhum `findFirst` a perguntar se a mesa está
 * livre. A pergunta é feita e respondida no mesmo acto de escrever.
 */
export async function abrirSessao(
  prisma: PrismaClient,
  organizationId: string,
  dados: {
    locationId: string;
    tableId: string;
    comensais?: number;
    responsavelId?: string | null;
    actor: Actor;
  },
): Promise<ResultadoDeAbertura> {
  try {
    return await comEscopo(prisma, { organizationId }, async (db) => {
      // A mesa é lida para saber que EXISTE e que não está arquivada. Não é a
      // consulta que garante a unicidade — essa é do índice. É a que distingue
      // «não há mesa nenhuma com este identificador» de «a mesa está ocupada»,
      // e sem ela as duas davam a mesma resposta.
      const mesa = await db.serviceTable.findFirst({
        where: { id: dados.tableId },
        select: { id: true, locationId: true, archivedAt: true },
      });
      if (!mesa) return { ok: false as const, motivo: 'mesa_desconhecida' as const };
      if (mesa.archivedAt) return { ok: false as const, motivo: 'mesa_arquivada' as const };

      const sessao = await db.tableSession.create({
        data: {
          organizationId,
          locationId: mesa.locationId,
          tableId: mesa.id,
          comensais: dados.comensais ?? 1,
          ...(dados.responsavelId ? { responsavelId: dados.responsavelId } : {}),
          abertaPor: dados.actor.email,
          estado: 'ABERTA',
        },
        select: { id: true },
      });

      await registarEvento(db, organizationId, sessao.id, 'sessao.aberta', dados.actor.email, {
        tableId: mesa.id, comensais: dados.comensais ?? 1,
      });

      return { ok: true as const, sessaoId: sessao.id };
    });
  } catch (erro) {
    if (eViolacaoUnica(erro, 'uma_sessao_activa_por_mesa')) {
      return { ok: false, motivo: 'mesa_ocupada' };
    }
    throw erro;
  }
}

/** O histórico. Append-only por privilégio: o runtime não tem UPDATE nem DELETE. */
export async function registarEvento(
  db: ClienteComEscopo,
  organizationId: string,
  sessionId: string,
  accao: string,
  actorEmail: string,
  detalhe?: Record<string, unknown>,
): Promise<void> {
  await db.tableSessionEvent.create({
    data: {
      organizationId, sessionId, accao, actorEmail,
      ...(detalhe ? { detalhe: detalhe as object } : {}),
    },
  });
}

export type ResultadoDeFecho =
  | { ok: true; sessaoId: string }
  | { ok: false; motivo: 'sessao_desconhecida' | 'ja_fechada' };

/**
 * Pede a conta (FLOOR-011): a sessão vai para `A_ENCERRAR`.
 *
 * **A mesa continua ocupada.** É o intervalo entre pedir a conta e a mesa ficar
 * livre, e durante ele há gente sentada. Libertar aqui era pôr outra pessoa em
 * cima da conta de quem ainda lá está — e `A_ENCERRAR` continua dentro do índice
 * único, por isso a mesa não abre outra vez.
 */
export async function iniciarEncerramento(
  db: ClienteComEscopo,
  organizationId: string,
  sessaoId: string,
  actor: Actor,
): Promise<ResultadoDeFecho> {
  const sessao = await db.tableSession.findFirst({
    where: { id: sessaoId }, select: { id: true, estado: true },
  });
  if (!sessao) return { ok: false, motivo: 'sessao_desconhecida' };
  if (sessao.estado === 'FECHADA') return { ok: false, motivo: 'ja_fechada' };

  await db.tableSession.update({ where: { id: sessaoId }, data: { estado: 'A_ENCERRAR' } });
  await registarEvento(db, organizationId, sessaoId, 'sessao.encerramento_iniciado', actor.email);
  return { ok: true, sessaoId };
}

/**
 * Fecha a sessão. A mesa **volta a poder abrir**.
 *
 * É o par do aceite 1, e é a condição `estado <> 'FECHADA'` do índice que o
 * torna verdade: ao fechar, a linha sai do índice. Sem a condição, o aceite 1
 * passava e cada mesa ficava inutilizável depois do primeiro serviço.
 */
export async function fecharSessao(
  db: ClienteComEscopo,
  organizationId: string,
  sessaoId: string,
  actor: Actor,
): Promise<ResultadoDeFecho> {
  const sessao = await db.tableSession.findFirst({
    where: { id: sessaoId }, select: { id: true, estado: true },
  });
  if (!sessao) return { ok: false, motivo: 'sessao_desconhecida' };
  if (sessao.estado === 'FECHADA') return { ok: false, motivo: 'ja_fechada' };

  await db.tableSession.update({
    where: { id: sessaoId },
    data: { estado: 'FECHADA', fechadaEm: new Date(), fechadaPor: actor.email },
  });
  await registarEvento(db, organizationId, sessaoId, 'sessao.fechada', actor.email);
  return { ok: true, sessaoId };
}

export type ResultadoDaTransferencia =
  | { ok: true; sessaoId: string; de: string; para: string }
  | { ok: false; motivo: 'sessao_desconhecida' | 'ja_fechada' | 'mesa_desconhecida' | 'mesma_mesa' }
  | { ok: false; motivo: 'mesa_destino_ocupada' };

/**
 * Transfere uma sessão para outra mesa (FLOOR-009).
 *
 * ── É uma transacção ou não é nada ───────────────────────────────────────
 *
 * A régua: *«se a origem liberta e o destino falha, a sala fica com uma sessão
 * no ar e uma mesa ocupada por ninguém»*. Aqui não há duas escritas a
 * coordenar — há **uma**: a sessão muda de `table_id`. A origem fica livre
 * porque a sessão deixou de lá estar, não porque alguém a libertou.
 *
 * É a forma que evita o defeito, e não um cuidado ao escrever. Um modelo com
 * `mesa.ocupada` de um lado e `sessao.mesa` do outro teria duas linhas a
 * concordar — e é entre elas que a coerência se perde.
 *
 * O destino ocupado é recusado pelo **mesmo índice** que recusa a abertura
 * dupla. Não há segunda regra a manter alinhada com a primeira.
 */
export async function transferirSessao(
  prisma: PrismaClient,
  organizationId: string,
  sessaoId: string,
  mesaDestinoId: string,
  actor: Actor,
): Promise<ResultadoDaTransferencia> {
  try {
    return await comEscopo(prisma, { organizationId }, async (db) => {
      const sessao = await db.tableSession.findFirst({
        where: { id: sessaoId }, select: { id: true, estado: true, tableId: true },
      });
      if (!sessao) return { ok: false as const, motivo: 'sessao_desconhecida' as const };
      if (sessao.estado === 'FECHADA') return { ok: false as const, motivo: 'ja_fechada' as const };
      if (sessao.tableId === mesaDestinoId) return { ok: false as const, motivo: 'mesma_mesa' as const };

      const destino = await db.serviceTable.findFirst({
        where: { id: mesaDestinoId, archivedAt: null }, select: { id: true, locationId: true },
      });
      if (!destino) return { ok: false as const, motivo: 'mesa_desconhecida' as const };

      await db.tableSession.update({
        where: { id: sessaoId },
        data: { tableId: destino.id, locationId: destino.locationId },
      });
      await registarEvento(db, organizationId, sessaoId, 'sessao.transferida', actor.email, {
        de: sessao.tableId, para: destino.id,
      });

      return { ok: true as const, sessaoId, de: sessao.tableId, para: destino.id };
    });
  } catch (erro) {
    if (eViolacaoUnica(erro, 'uma_sessao_activa_por_mesa')) {
      // A origem fica EXACTAMENTE como estava: o `ROLLBACK` desfez a mudança de
      // mesa e o evento de histórico ao mesmo tempo.
      return { ok: false, motivo: 'mesa_destino_ocupada' };
    }
    throw erro;
  }
}

export type ResultadoDeArquivoDeMesa =
  | { ok: true; tableId: string }
  | { ok: false; motivo: 'mesa_desconhecida' }
  | { ok: false; motivo: 'sessao_aberta'; sessaoId: string };

/**
 * Arquiva uma mesa (FLOOR-003) — e **respeita sessões abertas**.
 *
 * ── Recusa, e não fecha por ela ──────────────────────────────────────────
 *
 * O aceite diz «arquivamento respeita sessões abertas», e há duas maneiras de
 * respeitar: recusar, ou fechar deliberadamente. Escolhi recusar, e a razão é a
 * pergunta que o revisor já disse que ia fazer — **o que acontece à conta de
 * quem está sentado**.
 *
 * Fechar a sessão para poder arquivar decide por quem está à mesa: a conta fecha
 * a meio do jantar, no momento em que alguém no escritório reorganiza a sala.
 * Arquivar uma mesa não tem urgência nenhuma; a mesa tem gente. Entre as duas, a
 * que espera é a do escritório.
 *
 * A recusa **diz qual é a sessão**, para quem arquiva poder ir fechá-la em vez
 * de adivinhar qual das mesas está a bloquear.
 */
export async function arquivarMesa(
  db: ClienteComEscopo,
  organizationId: string,
  tableId: string,
): Promise<ResultadoDeArquivoDeMesa> {
  void organizationId;
  const mesa = await db.serviceTable.findFirst({
    where: { id: tableId }, select: { id: true, archivedAt: true },
  });
  if (!mesa) return { ok: false, motivo: 'mesa_desconhecida' };

  const aberta = await db.tableSession.findFirst({
    where: { tableId, estado: { not: 'FECHADA' } }, select: { id: true },
  });
  if (aberta) return { ok: false, motivo: 'sessao_aberta', sessaoId: aberta.id };

  await db.serviceTable.update({ where: { id: tableId }, data: { archivedAt: new Date() } });
  return { ok: true, tableId };
}

// ── Leituras ───────────────────────────────────────────────────────────────

export function listarZonas(db: ClienteComEscopo, locationId: string) {
  return db.serviceArea.findMany({
    where: { locationId, archivedAt: null },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  });
}

export function listarMesas(db: ClienteComEscopo, locationId: string) {
  return db.serviceTable.findMany({
    where: { locationId, archivedAt: null },
    orderBy: { codigo: 'asc' },
    include: { area: { select: { id: true, nome: true, tipo: true } } },
  });
}

/**
 * A sala em tempo real (FLOOR-006): cada mesa com a sessão activa, se houver.
 *
 * Uma consulta só. Duas — mesas e depois sessões — davam um retrato composto de
 * dois instantes, e numa sala a mudar é assim que um ecrã mostra uma mesa livre
 * que acabou de abrir.
 */
export async function salaAgora(db: ClienteComEscopo, locationId: string) {
  const mesas = await db.serviceTable.findMany({
    where: { locationId, archivedAt: null },
    orderBy: { codigo: 'asc' },
    include: {
      area: { select: { id: true, nome: true, tipo: true } },
      sessoes: {
        where: { estado: { not: 'FECHADA' } },
        select: {
          id: true, estado: true, comensais: true, abertaEm: true, abertaPor: true,
          responsavel: { select: { id: true, user: { select: { nome: true, email: true } } } },
        },
      },
    },
  });
  return mesas.map((m) => ({
    ...m,
    // O índice único garante que esta lista tem no máximo um elemento. Devolver
    // um array aqui obrigaria cada ecrã a decidir o que fazer com dois — e a
    // decisão certa é que dois não existem.
    sessao: m.sessoes[0] ?? null,
  }));
}

export function historicoDaSessao(db: ClienteComEscopo, sessionId: string) {
  return db.tableSessionEvent.findMany({
    where: { sessionId }, orderBy: { createdAt: 'asc' },
  });
}

export function listarCombinacoes(db: ClienteComEscopo, locationId: string) {
  return db.tableCombination.findMany({
    where: { locationId, archivedAt: null },
    orderBy: { nome: 'asc' },
    include: { membros: { include: { mesa: { select: { id: true, codigo: true } } } } },
  });
}

export function listarTiposDeServico(db: ClienteComEscopo, locationId: string) {
  return db.serviceType.findMany({ where: { locationId }, orderBy: { inicioMinutos: 'asc' } });
}
