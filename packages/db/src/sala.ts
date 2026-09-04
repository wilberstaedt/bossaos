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
 * Manda limpar a mesa. Continua **ocupada**.
 *
 * O prompt do E13 pede «iniciar encerramento **e limpeza**», e a limpeza tem de
 * ser um estado seu: entre a conta paga e a mesa pronta há alguém a limpá-la, e
 * durante esse tempo a mesa está vazia mas **não está livre**. Sentar gente numa
 * mesa por limpar é o defeito que este estado impede.
 *
 * Não custa nada ao modelo: `EM_LIMPEZA` continua dentro do índice único parcial,
 * porque a condição dele é `estado <> 'FECHADA'`. A mesa fica ocupada sem uma
 * segunda regra a ter de concordar com a primeira.
 */
export async function iniciarLimpeza(
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

  await db.tableSession.update({ where: { id: sessaoId }, data: { estado: 'EM_LIMPEZA' } });
  await registarEvento(db, organizationId, sessaoId, 'sessao.limpeza_iniciada', actor.email);
  return { ok: true, sessaoId };
}

export type ResultadoDeResponsavel =
  | { ok: true; sessaoId: string; responsavelId: string }
  | { ok: false; motivo: 'sessao_desconhecida' | 'ja_fechada' | 'pessoa_desconhecida' };

/**
 * Atribui o responsável pela mesa (E13, entregar 2).
 *
 * ── É uma PERTENÇA, e não um utilizador ──────────────────────────────────
 *
 * O mesmo utilizador pode estar em duas organizações, e a responsabilidade por
 * uma mesa é de uma delas. A pertença é lida **dentro do escopo**, e por isso uma
 * pertença de outro inquilino simplesmente não aparece — a recusa é ausência, e
 * não uma verificação que alguém se tenha de lembrar de escrever.
 *
 * Muda-se durante o serviço, e é suposto: o turno acaba e a mesa passa a outra
 * pessoa com a conta a meio. Cada troca fica no histórico, que é o que responde a
 * «quem estava com esta mesa às onze».
 */
export async function atribuirResponsavel(
  db: ClienteComEscopo,
  organizationId: string,
  sessaoId: string,
  membershipId: string,
  actor: Actor,
): Promise<ResultadoDeResponsavel> {
  const sessao = await db.tableSession.findFirst({
    where: { id: sessaoId }, select: { id: true, estado: true, responsavelId: true },
  });
  if (!sessao) return { ok: false, motivo: 'sessao_desconhecida' };
  if (sessao.estado === 'FECHADA') return { ok: false, motivo: 'ja_fechada' };

  const pertenca = await db.membership.findFirst({
    where: { id: membershipId, estado: 'ACTIVO' }, select: { id: true },
  });
  if (!pertenca) return { ok: false, motivo: 'pessoa_desconhecida' };

  await db.tableSession.update({
    where: { id: sessaoId }, data: { responsavelId: pertenca.id },
  });
  await registarEvento(db, organizationId, sessaoId, 'sessao.responsavel_atribuido', actor.email, {
    de: sessao.responsavelId, para: pertenca.id,
  });
  return { ok: true, sessaoId, responsavelId: pertenca.id };
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
export async function salaAgora(
  db: ClienteComEscopo,
  locationId: string,
  organizationId: string,
) {
  const mesas = await db.serviceTable.findMany({
    where: { locationId, archivedAt: null },
    orderBy: { codigo: 'asc' },
    include: {
      area: { select: { id: true, nome: true, tipo: true } },
      sessoes: {
        where: { estado: { not: 'FECHADA' } },
        select: {
          id: true, estado: true, comensais: true, abertaEm: true, abertaPor: true,
          // ── O identificador da PERTENÇA, e nunca a junção a `users` ─────
          //
          // Estava `responsavel: { select: { id, user: { ... } } }`, e é o mesmo
          // defeito do ORG-007 pela TERCEIRA vez no projecto — a segunda neste
          // ficheiro. O runtime não lê `users`: a política `identidade_propria`
          // limita-o à linha dele próprio, e o Prisma devolve `user: null` **sem
          // se queixar** sempre que o responsável é outra pessoa — que é o caso
          // normal numa sala.
          //
          // O nome vem da porta, mais abaixo. Duas coisas que isto NÃO faz, de
          // propósito: não põe um `?.` a mais — isso esconde a causa e devolve um
          // ecrã sem nome onde devia estar uma pessoa — e não dá privilégio ao
          // runtime, que trocava um ecrã partido por um buraco de segurança.
          responsavelId: true,
        },
      },
    },
  });

  // Uma consulta à porta para a sala toda, e não uma por mesa: `N+1` numa sala
  // cheia é o ecrã que toda a gente tem aberto a noite inteira.
  const identidades = await db.$queryRaw<{ id: string; email: string; nome: string | null }[]>`
    SELECT * FROM identidades_da_organizacao(${organizationId}::uuid)`;
  const porUtilizador = new Map(identidades.map((i) => [i.id, i]));

  const pertencas = await db.membership.findMany({ select: { id: true, userId: true } });
  const porPertenca = new Map(pertencas.map((m) => [m.id, m.userId]));

  return mesas.map((m) => {
    const sessao = m.sessoes[0] ?? null;
    return {
      ...m,
      // O índice único garante que esta lista tem no máximo um elemento. Devolver
      // um array aqui obrigaria cada ecrã a decidir o que fazer com dois — e a
      // decisão certa é que dois não existem.
      sessao: sessao === null ? null : {
        ...sessao,
        // Ausência é ausência: sem responsável é `null`, e um responsável que a
        // porta não devolve fica com o nome a `null` e o email vazio — nunca com
        // o identificador a fazer de nome.
        responsavel: sessao.responsavelId === null ? null : {
          id: sessao.responsavelId,
          nome: porUtilizador.get(porPertenca.get(sessao.responsavelId) ?? '')?.nome ?? null,
          email: porUtilizador.get(porPertenca.get(sessao.responsavelId) ?? '')?.email ?? '',
        },
      },
    };
  });
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

/**
 * As pertenças activas, para escolher quem responde pela mesa.
 *
 * ── Passa pela PORTA, e a primeira versão não passava ─────────────────────
 *
 * Escrevi isto como `include: { user: { select: { nome, email } } }` e o ecrã
 * respondeu **500**: `Cannot read properties of null (reading 'nome')`. O runtime
 * não lê `users` — a política `identidade_propria` limita-o à linha dele próprio —
 * e o Prisma devolve a relação a `null` sem se queixar.
 *
 * É **o mesmo defeito do ORG-007**, que o marco do E11 já tinha apanhado e
 * fechado com `identidades_da_organizacao`, uma porta `SECURITY DEFINER` que abre
 * uma pergunta e verifica o seu próprio chamador. Escrevê-lo outra vez mostra
 * que a lição não vive na cabeça de quem escreve: vive na porta, e é por isso que
 * a porta existe.
 *
 * O par que o E11 fixou continua de pé: a tela funciona **e** o runtime continua
 * sem conseguir ler `users` directamente. Dar-lhe a permissão trocava um ecrã
 * partido por um buraco de segurança.
 */
export async function pessoasDaUnidade(db: ClienteComEscopo, organizationId: string) {
  const pertencas = await db.membership.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });
  const identidades = await db.$queryRaw<{ id: string; email: string; nome: string | null }[]>`
    SELECT * FROM identidades_da_organizacao(${organizationId}::uuid)`;
  const porId = new Map(identidades.map((i) => [i.id, i]));

  // Uma identidade que a porta não devolve fica com o email VAZIO e o nome nulo —
  // nunca com um nome inventado nem com o identificador a fazer de nome.
  return pertencas.map((p) => ({
    id: p.id,
    nome: porId.get(p.userId)?.nome ?? null,
    email: porId.get(p.userId)?.email ?? '',
  }));
}

export function listarTiposDeServico(db: ClienteComEscopo, locationId: string) {
  return db.serviceType.findMany({ where: { locationId }, orderBy: { inicioMinutos: 'asc' } });
}
