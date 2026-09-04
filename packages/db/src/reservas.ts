import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  antecedencia, intervaloEfectivo, opcoesDeAlocacao,
  type CombinacaoDisponivel, type MesaDisponivel,
} from '@bossaos/domain';
import { comEscopoSerializavel, type ClienteComEscopo, type Escopo } from './escopo.ts';

/**
 * O motor de reservas.
 *
 * ── O que falha aqui não aparece num relatório ─────────────────────────────
 *
 * Aparece à porta, com as pessoas em pé no corredor. Por isso o padrão de teste
 * desta área é o oposto do habitual: **o caso que interessa é o que deve ser
 * recusado**.
 *
 * ── Onde vive cada garantia ────────────────────────────────────────────────
 *
 * Três sítios, e é preciso saber qual é qual para saber o que cada prova mede:
 *
 *  1. **A base**, na exclusão `uma_mesa_um_intervalo`: a mesma mesa não pode
 *     ter dois intervalos sobrepostos. Não precisa de lock nenhum e não pode ser
 *     esquecida por quem escreve código novo.
 *  2. **A forma da alocação**: uma linha por MESA. É isto que faz a combinação
 *     3+4 chocar com a mesa 3 sem caso especial em lado nenhum.
 *  3. **O lock por unidade**, para o que nenhuma restrição exprime: a CONTAGEM
 *     de comensais por zona. Duas confirmações em mesas diferentes passam ambas
 *     na exclusão e lêem ambas a mesma soma antiga.
 *
 * Um teste de concorrência sobre a MESMA mesa fica verde com e sem lock — quem
 * o segura é (1). Fica escrito porque é exactamente o teste que engana.
 */

export const TENTATIVAS_DE_SERIALIZACAO = 3;

/**
 * O Postgres desistiu de serializar e manda repetir.
 *
 * ── O código não vem só de uma forma, e isso custou-me a primeira corrida ──
 *
 * Escrevi isto a procurar `40001`, que é o `SQLSTATE`. O Prisma não o entrega
 * assim: embrulha-o em `P2034` com o texto «Transaction failed due to a write
 * conflict or a deadlock». A repetição nunca acontecia, o erro subia inteiro, e
 * o teste de concorrência da zona morria com um erro de base em vez de dar uma
 * resposta de negócio.
 *
 * Fica a reconhecer as três formas. Uma delas é o texto, que é frágil — e é por
 * isso que o teste de concorrência existe: se o Prisma mudar a frase, é ele que
 * fica vermelho.
 */
function eConflitoDeSerializacao(erro: unknown): boolean {
  const codigo = (erro as { code?: string })?.code;
  const meta = (erro as { meta?: { code?: string } })?.meta?.code;
  const texto = String((erro as Error)?.message ?? '');
  return codigo === '40001' || meta === '40001' || codigo === 'P2034'
    || texto.includes('could not serialize')
    || texto.includes('write conflict or a deadlock');
}

/** A exclusão da base disparou: alguém ficou com a mesa primeiro. */
function eChoqueDeMesa(erro: unknown): boolean {
  const texto = String((erro as Error)?.message ?? '');
  const meta = (erro as { meta?: { code?: string } })?.meta?.code;
  return texto.includes('uma_mesa_um_intervalo') || texto.includes('23P01')
    || meta === '23P01' || texto.includes('conflicting key value violates exclusion');
}

export function resumirSegredo(segredo: string): string {
  return createHash('sha256').update(segredo).digest('hex');
}

/**
 * O segredo do link de gestão. **Não enumerável** — «um token sequencial deixa
 * ver a reserva do vizinho».
 */
export function segredoDeGestao(): string {
  return randomBytes(32).toString('base64url');
}

export interface DefinicoesDeReserva {
  activo: boolean;
  duracaoPadraoMin: number;
  bufferMin: number;
  antecedenciaMinMin: number;
  antecedenciaMaxDias: number;
  minPessoas: number;
  maxPessoas: number;
  permiteCombinacoes: boolean;
  cancelamentoAteMin: number;
  retencaoMin: number;
  toleranciaAtrasoMin: number;
  depositoLigado: boolean;
}

const POR_OMISSAO: DefinicoesDeReserva = {
  activo: false, duracaoPadraoMin: 90, bufferMin: 15,
  antecedenciaMinMin: 60, antecedenciaMaxDias: 90,
  minPessoas: 1, maxPessoas: 12, permiteCombinacoes: true,
  cancelamentoAteMin: 120, retencaoMin: 15, toleranciaAtrasoMin: 15,
  depositoLigado: false,
};

export async function lerDefinicoes(
  db: ClienteComEscopo, locationId: string,
): Promise<DefinicoesDeReserva> {
  const linha = await db.reservationSettings.findUnique({ where: { locationId } });
  // ── Ausência é ausência, e a ausência aqui é «não configurado» ───────────
  //
  // Sem linha, `activo` é FALSO. Uma unidade que nunca abriu o ecrã das reservas
  // não aceita reservas — o contrário seria o produto a decidir por ela.
  if (!linha) return POR_OMISSAO;
  return {
    activo: linha.activo,
    duracaoPadraoMin: linha.duracaoPadraoMin,
    bufferMin: linha.bufferMin,
    antecedenciaMinMin: linha.antecedenciaMinMin,
    antecedenciaMaxDias: linha.antecedenciaMaxDias,
    minPessoas: linha.minPessoas,
    maxPessoas: linha.maxPessoas,
    permiteCombinacoes: linha.permiteCombinacoes,
    cancelamentoAteMin: linha.cancelamentoAteMin,
    retencaoMin: linha.retencaoMin,
    toleranciaAtrasoMin: linha.toleranciaAtrasoMin,
    depositoLigado: linha.depositoLigado,
  };
}

export async function guardarDefinicoes(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  campos: Partial<DefinicoesDeReserva>,
): Promise<void> {
  // O depósito nunca chega à base a `true`: há uma restrição a impedi-lo, e
  // filtrá-lo aqui faz a recusa ser uma decisão legível em vez de um erro de SQL.
  const { depositoLigado: _ignorado, ...seguros } = campos;
  await db.reservationSettings.upsert({
    where: { locationId },
    create: { organizationId, locationId, ...POR_OMISSAO, ...seguros },
    update: seguros,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Ocupação
// ──────────────────────────────────────────────────────────────────────────

export interface Ocupacao {
  tableId: string;
  inicio: Date;
  fim: Date;
  fonte: 'RESERVA' | 'SALA' | 'RETENCAO';
}

/**
 * Tudo o que ocupa uma mesa num intervalo, venha de onde vier.
 *
 * ── Três fontes, e o walk-in é uma delas ───────────────────────────────────
 *
 * «Walk-ins usam as mesmas alocações.» Uma sessão de mesa ABERTA é gente
 * sentada: se a disponibilidade só olhasse para as reservas, a sala cheia
 * aparecia vazia no ecrã de quem atende o telefone.
 *
 * A sessão aberta ocupa a mesa pela **duração padrão da casa**, contada desde a
 * abertura. É uma estimativa, e é declarada como tal — ninguém sabe quando é que
 * aquela mesa se levanta. Usa-se o número que a casa já escolheu para as
 * reservas, em vez de inventar outro, porque um segundo número seria uma segunda
 * opinião sobre quanto dura uma refeição.
 *
 * ── E a retenção da lista de espera sai sozinha ────────────────────────────
 *
 * `oferta_expira_em > now()`, comparado com o relógio da BASE. Não há acção
 * nenhuma que precise de acontecer para a mesa voltar a estar livre: uma
 * retenção esquecida numa noite em que ninguém abre o ecrã liberta-se à mesma.
 */
export async function ocupacaoNoIntervalo(
  db: ClienteComEscopo, locationId: string, inicio: Date, fim: Date,
  definicoes: DefinicoesDeReserva,
): Promise<Ocupacao[]> {
  const minutosDaSala = definicoes.duracaoPadraoMin + definicoes.bufferMin;

  const linhas = await db.$queryRaw<{ table_id: string; inicio: Date; fim: Date; fonte: string }[]>`
    SELECT a.table_id, a.inicio, a.fim, 'RESERVA' AS fonte
      FROM reservation_allocations a
      JOIN reservations r
        ON r.organization_id = a.organization_id AND r.id = a.reservation_id
     WHERE a.location_id = ${locationId}::uuid
       AND r.estado <> 'CANCELADA'
       AND tstzrange(a.inicio, a.fim, '[)') && tstzrange(${inicio}, ${fim}, '[)')

    UNION ALL

    SELECT s.table_id,
           s.aberta_em,
           s.aberta_em + make_interval(mins => ${minutosDaSala}),
           'SALA'
      FROM table_sessions s
     WHERE s.location_id = ${locationId}::uuid
       AND s.estado = 'ABERTA'
       AND tstzrange(s.aberta_em, s.aberta_em + make_interval(mins => ${minutosDaSala}), '[)')
           && tstzrange(${inicio}, ${fim}, '[)')

    UNION ALL

    SELECT w.oferta_table_id, w.oferta_inicio, w.oferta_fim, 'RETENCAO'
      FROM waitlist_entries w
     WHERE w.location_id = ${locationId}::uuid
       AND w.estado = 'COM_OFERTA'
       AND w.oferta_table_id IS NOT NULL
       AND w.oferta_expira_em > now()
       AND tstzrange(w.oferta_inicio, w.oferta_fim, '[)') && tstzrange(${inicio}, ${fim}, '[)')
  `;

  return linhas.map((l) => ({
    tableId: l.table_id, inicio: l.inicio, fim: l.fim,
    fonte: l.fonte as Ocupacao['fonte'],
  }));
}

/** As mesas fechadas por um bloqueio que cruze o intervalo. */
export async function mesasBloqueadas(
  db: ClienteComEscopo, locationId: string, inicio: Date, fim: Date,
): Promise<{ todas: boolean; zonas: string[]; mesas: string[]; motivo: string | null }> {
  const blocos = await db.reservationBlock.findMany({
    where: { locationId, inicio: { lt: fim }, fim: { gt: inicio } },
    select: { areaId: true, tableId: true, motivo: true },
  });
  return {
    todas: blocos.some((b) => !b.areaId && !b.tableId),
    zonas: blocos.flatMap((b) => (b.areaId ? [b.areaId] : [])),
    mesas: blocos.flatMap((b) => (b.tableId ? [b.tableId] : [])),
    motivo: blocos[0]?.motivo ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Disponibilidade — informativa
// ──────────────────────────────────────────────────────────────────────────

export interface Disponibilidade {
  livres: MesaDisponivel[];
  ocupadas: number;
  comensaisNaZona: Map<string, number>;
}

/**
 * O que está livre — **e pode estar desactualizado no instante em que é lido**.
 *
 * «A consulta de disponibilidade é informativa; a confirmação verifica tudo
 * novamente.» Esta função não segura nada e não toma lock nenhum de propósito:
 * segurar capacidade para quem só está a olhar é a maneira de a sala aparecer
 * cheia por causa de quem nunca reservou.
 */
export async function disponibilidade(
  db: ClienteComEscopo, locationId: string, inicio: Date, duracaoMin: number,
  definicoes: DefinicoesDeReserva,
): Promise<Disponibilidade> {
  const janela = intervaloEfectivo(inicio, duracaoMin, definicoes.bufferMin);
  const [mesas, ocupacao, bloqueios] = await Promise.all([
    db.serviceTable.findMany({
      where: { locationId, archivedAt: null },
      select: { id: true, codigo: true, areaId: true, capacidade: true },
    }),
    ocupacaoNoIntervalo(db, locationId, janela.inicio, janela.fim, definicoes),
    mesasBloqueadas(db, locationId, janela.inicio, janela.fim),
  ]);

  const tomadas = new Set(ocupacao.map((o) => o.tableId));
  const livres = bloqueios.todas ? [] : mesas.filter((m) =>
    !tomadas.has(m.id) && !bloqueios.mesas.includes(m.id) && !bloqueios.zonas.includes(m.areaId));

  const comensaisNaZona = await comensaisPorZona(db, locationId, janela.inicio, janela.fim);
  return { livres, ocupadas: tomadas.size, comensaisNaZona };
}

/**
 * Quantos comensais já estão prometidos em cada zona no intervalo.
 *
 * É a soma que o lock guarda. Note-se que conta **pessoas da reserva**, e não
 * lugares das mesas: a regra da zona é sobre gente na sala.
 */
export async function comensaisPorZona(
  db: ClienteComEscopo, locationId: string, inicio: Date, fim: Date,
): Promise<Map<string, number>> {
  const linhas = await db.$queryRaw<{ area_id: string; total: bigint }[]>`
    SELECT t.area_id, COALESCE(SUM(r.pessoas), 0) AS total
      FROM reservation_allocations a
      JOIN reservations r
        ON r.organization_id = a.organization_id AND r.id = a.reservation_id
      JOIN service_tables t
        ON t.organization_id = a.organization_id AND t.id = a.table_id
     WHERE a.location_id = ${locationId}::uuid
       AND r.estado <> 'CANCELADA'
       AND tstzrange(a.inicio, a.fim, '[)') && tstzrange(${inicio}, ${fim}, '[)')
     GROUP BY t.area_id
  `;
  // Uma reserva de combinação tem uma linha por componente. Somar `r.pessoas`
  // por linha contaria o grupo duas vezes — por isso a soma é sobre reservas
  // DISTINTAS, feita abaixo a partir das reservas e não das alocações.
  const porZona = new Map<string, number>();
  for (const l of linhas) porZona.set(l.area_id, Number(l.total));
  return porZona;
}

// ──────────────────────────────────────────────────────────────────────────
// Confirmação
// ──────────────────────────────────────────────────────────────────────────

export interface PedidoDeReserva {
  locationId: string;
  pessoas: number;
  inicio: Date;
  duracaoMin?: number;
  areaId?: string | null;
  nome: string;
  contacto: string;
  notas?: string | null;
  aceitaMarketing?: boolean;
  origem?: 'HOST' | 'PUBLICO' | 'ESPERA';
  chaveIdempotente: string;
  criadaPor: string;
}

export type MotivoDeRecusa =
  | 'DESLIGADO' | 'CEDO_DEMAIS' | 'TARDE_DEMAIS'
  | 'GRUPO_PEQUENO' | 'GRUPO_GRANDE'
  | 'SEM_MESA' | 'ZONA_CHEIA' | 'BLOQUEADO' | 'DISPUTA';

export type ResultadoDaConfirmacao =
  | { ok: true; reservaId: string; mesas: string[]; repetida: boolean; segredoDeGestao?: string }
  | { ok: false; motivo: MotivoDeRecusa; alternativas: Date[] };

/**
 * Confirma uma reserva, ou recusa-a dizendo porquê.
 *
 * ── A repetição devolve a MESMA reserva ────────────────────────────────────
 *
 * `chaveIdempotente` é única por unidade. Sem ela, o retry que o `serializable`
 * obriga a fazer criava uma reserva nova — e o cliente ficava com duas mesas,
 * que é exactamente o defeito que o retry existia para evitar.
 */
export async function confirmarReserva(
  prisma: PrismaClient, escopo: Escopo, pedido: PedidoDeReserva,
  opcoes: { comLock?: boolean; agora?: Date } = {},
): Promise<ResultadoDaConfirmacao> {
  let ultimo: unknown = null;
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_SERIALIZACAO; tentativa += 1) {
    try {
      return await comEscopoSerializavel(
        prisma, escopo, `reservas:${pedido.locationId}`,
        (db) => confirmarDentroDaTransacao(db, escopo, pedido, opcoes.agora),
        opcoes.comLock === undefined ? {} : { comLock: opcoes.comLock },
      );
    } catch (erro) {
      ultimo = erro;
      if (eConflitoDeSerializacao(erro) || eChoqueDeMesa(erro)) continue;
      throw erro;
    }
  }
  // ── Desistir é uma resposta, e é melhor do que tentar para sempre ────────
  //
  // «Retry LIMITADO.» Um ciclo sem tecto transforma uma noite cheia numa fila de
  // ligações presas, e o cliente fica à espera em vez de ouvir «não temos».
  if (eChoqueDeMesa(ultimo) || eConflitoDeSerializacao(ultimo)) {
    return { ok: false, motivo: 'DISPUTA', alternativas: [] };
  }
  throw ultimo;
}

async function confirmarDentroDaTransacao(
  db: ClienteComEscopo, escopo: Escopo, pedido: PedidoDeReserva, agoraDado?: Date,
): Promise<ResultadoDaConfirmacao> {
  // ── A repetição é a PRIMEIRA pergunta ───────────────────────────────────
  //
  // Antes de qualquer verificação: se esta chave já tem reserva, a resposta é
  // essa reserva. Verificar capacidade primeiro faria a repetição de uma reserva
  // já feita ser recusada por falta de espaço — o espaço que ela própria ocupa.
  const jaFeita = await db.reservation.findFirst({
    where: { locationId: pedido.locationId, chaveIdempotente: pedido.chaveIdempotente },
    select: { id: true, alocacoes: { select: { tableId: true } } },
  });
  if (jaFeita) {
    return { ok: true, reservaId: jaFeita.id, mesas: jaFeita.alocacoes.map((a) => a.tableId), repetida: true };
  }

  const definicoes = await lerDefinicoes(db, pedido.locationId);
  if (!definicoes.activo) return { ok: false, motivo: 'DESLIGADO', alternativas: [] };
  if (pedido.pessoas < definicoes.minPessoas) return { ok: false, motivo: 'GRUPO_PEQUENO', alternativas: [] };
  if (pedido.pessoas > definicoes.maxPessoas) return { ok: false, motivo: 'GRUPO_GRANDE', alternativas: [] };

  const agora = agoraDado ?? await agoraDaBase(db);
  const cedoOuTarde = antecedencia(
    agora, pedido.inicio, definicoes.antecedenciaMinMin, definicoes.antecedenciaMaxDias);
  if (cedoOuTarde) return { ok: false, motivo: cedoOuTarde, alternativas: [] };

  const duracao = pedido.duracaoMin ?? definicoes.duracaoPadraoMin;
  const janela = intervaloEfectivo(pedido.inicio, duracao, definicoes.bufferMin);

  const bloqueios = await mesasBloqueadas(db, pedido.locationId, janela.inicio, janela.fim);
  if (bloqueios.todas) return { ok: false, motivo: 'BLOQUEADO', alternativas: [] };

  const [mesas, combinacoes, ocupacao] = await Promise.all([
    db.serviceTable.findMany({
      where: { locationId: pedido.locationId, archivedAt: null },
      select: { id: true, codigo: true, areaId: true, capacidade: true },
    }),
    db.tableCombination.findMany({
      where: { locationId: pedido.locationId, archivedAt: null },
      select: { id: true, nome: true, capacidade: true, membros: { select: { tableId: true } } },
    }),
    ocupacaoNoIntervalo(db, pedido.locationId, janela.inicio, janela.fim, definicoes),
  ]);

  const indisponiveis = new Set<string>([
    ...ocupacao.map((o) => o.tableId),
    ...bloqueios.mesas,
    ...mesas.filter((m) => bloqueios.zonas.includes(m.areaId)).map((m) => m.id),
  ]);

  const candidatas: MesaDisponivel[] = mesas;
  const juntas: CombinacaoDisponivel[] = combinacoes.map((c) => ({
    id: c.id, nome: c.nome, capacidade: c.capacidade, membros: c.membros.map((m) => m.tableId),
  }));

  const opcoes = opcoesDeAlocacao(
    pedido.pessoas, candidatas, juntas, definicoes.permiteCombinacoes, pedido.areaId);
  const escolhida = opcoes.find((grupo) => grupo.every((id) => !indisponiveis.has(id)));

  if (!escolhida) {
    return { ok: false, motivo: 'SEM_MESA', alternativas: await horariosAlternativos(
      db, pedido, definicoes, duracao, agora) };
  }

  // ── A CONTAGEM da zona, que é o que o lock guarda ────────────────────────
  //
  // Nenhuma restrição a exprime: duas confirmações em mesas diferentes passam
  // ambas na exclusão. Aqui lê-se a soma e compara-se com o tecto, e é este par
  // ler-depois-escrever que precisa de estar serializado.
  const zonaDaEscolha = mesas.find((m) => m.id === escolhida[0])!.areaId;
  const tecto = await tectoDaZona(db, pedido.locationId, zonaDaEscolha);
  if (tecto !== null) {
    const jaPrometidos = await comensaisConfirmadosNaZona(
      db, pedido.locationId, zonaDaEscolha, janela.inicio, janela.fim);
    if (jaPrometidos + pedido.pessoas > tecto) {
      return { ok: false, motivo: 'ZONA_CHEIA', alternativas: await horariosAlternativos(
        db, pedido, definicoes, duracao, agora) };
    }
  }

  const segredo = segredoDeGestao();
  const reserva = await db.reservation.create({
    data: {
      organizationId: escopo.organizationId,
      locationId: pedido.locationId,
      pessoas: pedido.pessoas,
      inicio: pedido.inicio,
      fim: new Date(pedido.inicio.getTime() + duracao * 60_000),
      nome: pedido.nome,
      contacto: pedido.contacto,
      notas: pedido.notas ?? null,
      aceitaMarketing: pedido.aceitaMarketing ?? false,
      origem: pedido.origem ?? 'HOST',
      chaveIdempotente: pedido.chaveIdempotente,
      criadaPor: pedido.criadaPor,
      gestaoTokenHash: resumirSegredo(segredo),
      gestaoExpiraEm: new Date(pedido.inicio.getTime() + 24 * 60 * 60_000),
    },
    select: { id: true },
  });

  await db.reservationAllocation.createMany({
    data: escolhida.map((tableId) => ({
      organizationId: escopo.organizationId,
      locationId: pedido.locationId,
      reservationId: reserva.id,
      tableId,
      inicio: janela.inicio,
      fim: janela.fim,
    })),
  });

  return { ok: true, reservaId: reserva.id, mesas: escolhida, repetida: false, segredoDeGestao: segredo };
}

/** O relógio que conta é o do SERVIDOR, nunca o do aparelho que pede. */
export async function agoraDaBase(db: ClienteComEscopo): Promise<Date> {
  const [linha] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  return linha!.agora;
}

async function tectoDaZona(
  db: ClienteComEscopo, locationId: string, areaId: string,
): Promise<number | null> {
  const regras = await db.capacityRule.findMany({
    where: { locationId, OR: [{ areaId }, { areaId: null }] },
    select: { maxComensais: true },
  });
  if (regras.length === 0) return null;
  // A regra mais apertada manda. Um tecto da unidade e um tecto da zona não se
  // somam: são dois limites, e quem passa por baixo dos dois é quem cabe.
  return Math.min(...regras.map((r) => r.maxComensais));
}

async function comensaisConfirmadosNaZona(
  db: ClienteComEscopo, locationId: string, areaId: string, inicio: Date, fim: Date,
): Promise<number> {
  // ── DISTINCT na reserva, e não soma por alocação ─────────────────────────
  //
  // Uma reserva de combinação tem uma linha por componente. Somar `pessoas` por
  // alocação contaria o grupo de oito como dezasseis — e a zona parecia cheia
  // com metade da gente lá dentro.
  const [linha] = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(r.pessoas), 0) AS total FROM (
      SELECT DISTINCT r.id, r.pessoas
        FROM reservations r
        JOIN reservation_allocations a
          ON a.organization_id = r.organization_id AND a.reservation_id = r.id
        JOIN service_tables t
          ON t.organization_id = a.organization_id AND t.id = a.table_id
       WHERE a.location_id = ${locationId}::uuid
         AND t.area_id = ${areaId}::uuid
         AND r.estado <> 'CANCELADA'
         AND tstzrange(a.inicio, a.fim, '[)') && tstzrange(${inicio}, ${fim}, '[)')
    ) r
  `;
  return Number(linha?.total ?? 0);
}

/**
 * Horários alternativos para quem foi recusado.
 *
 * «Se houver disputa, manter a reserva anterior ao falhar um reagendamento e
 * sugerir horários alternativos.» Sugerir nada é tecnicamente uma resposta e
 * praticamente um beco: quem liga a reservar quer ouvir uma hora.
 */
async function horariosAlternativos(
  db: ClienteComEscopo, pedido: PedidoDeReserva, definicoes: DefinicoesDeReserva,
  duracaoMin: number, agora: Date,
): Promise<Date[]> {
  const encontrados: Date[] = [];
  for (const desvio of [-60, -30, 30, 60, 90, 120]) {
    const quando = new Date(pedido.inicio.getTime() + desvio * 60_000);
    if (antecedencia(agora, quando, definicoes.antecedenciaMinMin, definicoes.antecedenciaMaxDias)) continue;
    const d = await disponibilidade(db, pedido.locationId, quando, duracaoMin, definicoes);
    const opcoes = opcoesDeAlocacao(
      pedido.pessoas, d.livres, [], definicoes.permiteCombinacoes, pedido.areaId);
    if (opcoes.length > 0) encontrados.push(quando);
    if (encontrados.length === 3) break;
  }
  return encontrados;
}

// ──────────────────────────────────────────────────────────────────────────
// Reagendar, cancelar, no-show
// ──────────────────────────────────────────────────────────────────────────

export type ResultadoDoReagendamento =
  | { ok: true; reservaId: string; mesas: string[] }
  | { ok: false; motivo: MotivoDeRecusa; alternativas: Date[]; anteriorIntacta: true };

/**
 * Muda a hora de uma reserva — ou não muda nada.
 *
 * ── A anterior sobrevive, e é por isso que isto é UMA transacção ───────────
 *
 * «Um cliente que pediu para mudar de hora e ficou sem mesa nenhuma é pior do
 * que um cliente que não conseguiu mudar.»
 *
 * As alocações antigas são apagadas e as novas escritas dentro da mesma
 * transacção: se as novas não couberem, o rollback repõe as antigas e a reserva
 * fica como estava. Largar primeiro e tentar depois — em duas transacções — é o
 * desenho que deixa o cliente sem nada, e não dá erro nenhum a fazê-lo.
 */
export async function reagendar(
  prisma: PrismaClient, escopo: Escopo,
  locationId: string, reservaId: string, novoInicio: Date,
  opcoes: { comLock?: boolean; agora?: Date } = {},
): Promise<ResultadoDoReagendamento> {
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_SERIALIZACAO; tentativa += 1) {
    try {
      return await comEscopoSerializavel(
        prisma, escopo, `reservas:${locationId}`,
        async (db): Promise<ResultadoDoReagendamento> => {
          const reserva = await db.reservation.findFirst({
            where: { id: reservaId, locationId },
            select: { id: true, pessoas: true, inicio: true, fim: true, estado: true },
          });
          if (!reserva || reserva.estado === 'CANCELADA') {
            return { ok: false, motivo: 'SEM_MESA', alternativas: [], anteriorIntacta: true };
          }

          const definicoes = await lerDefinicoes(db, locationId);
          const duracao = Math.round((reserva.fim.getTime() - reserva.inicio.getTime()) / 60_000);
          const janela = intervaloEfectivo(novoInicio, duracao, definicoes.bufferMin);

          // As antigas saem AQUI, dentro da transacção. Não saem antes.
          await db.reservationAllocation.deleteMany({ where: { reservationId: reservaId } });

          const [mesas, combinacoes, ocupacao, bloqueios] = await Promise.all([
            db.serviceTable.findMany({
              where: { locationId, archivedAt: null },
              select: { id: true, codigo: true, areaId: true, capacidade: true },
            }),
            db.tableCombination.findMany({
              where: { locationId, archivedAt: null },
              select: { id: true, nome: true, capacidade: true, membros: { select: { tableId: true } } },
            }),
            ocupacaoNoIntervalo(db, locationId, janela.inicio, janela.fim, definicoes),
            mesasBloqueadas(db, locationId, janela.inicio, janela.fim),
          ]);

          const indisponiveis = new Set<string>([
            ...ocupacao.map((o) => o.tableId),
            ...bloqueios.mesas,
            ...mesas.filter((m) => bloqueios.zonas.includes(m.areaId)).map((m) => m.id),
          ]);
          const opcoesDeMesa = bloqueios.todas ? [] : opcoesDeAlocacao(
            reserva.pessoas, mesas,
            combinacoes.map((c) => ({
              id: c.id, nome: c.nome, capacidade: c.capacidade, membros: c.membros.map((m) => m.tableId),
            })),
            definicoes.permiteCombinacoes);
          const escolhida = opcoesDeMesa.find((g) => g.every((id) => !indisponiveis.has(id)));

          if (!escolhida) {
            // ── Rebentar de propósito para o rollback repor as antigas ──────
            //
            // Devolver um objecto aqui faria a transacção fazer COMMIT — e o
            // `deleteMany` acima ficava. A reserva sobrevivia sem mesa nenhuma,
            // que é a versão silenciosa do defeito que isto evita.
            throw new SemCapacidadeParaReagendar();
          }

          await db.reservation.update({
            where: { id: reservaId },
            data: { inicio: novoInicio, fim: new Date(novoInicio.getTime() + duracao * 60_000) },
          });
          await db.reservationAllocation.createMany({
            data: escolhida.map((tableId) => ({
              organizationId: escopo.organizationId,
              locationId, reservationId: reservaId, tableId,
              inicio: janela.inicio, fim: janela.fim,
            })),
          });
          return { ok: true, reservaId, mesas: escolhida };
        },
        opcoes.comLock === undefined ? {} : { comLock: opcoes.comLock },
      );
    } catch (erro) {
      if (erro instanceof SemCapacidadeParaReagendar) {
        return { ok: false, motivo: 'SEM_MESA', alternativas: [], anteriorIntacta: true };
      }
      if (eConflitoDeSerializacao(erro) || eChoqueDeMesa(erro)) continue;
      throw erro;
    }
  }
  return { ok: false, motivo: 'DISPUTA', alternativas: [], anteriorIntacta: true };
}

class SemCapacidadeParaReagendar extends Error {
  constructor() { super('sem capacidade para reagendar'); }
}

export async function cancelar(
  db: ClienteComEscopo, reservaId: string, por: string,
): Promise<void> {
  await db.reservation.update({
    where: { id: reservaId },
    data: { estado: 'CANCELADA', canceladaEm: new Date(), canceladaPor: por },
  });
  // A ocupação sai com o cancelamento. Deixar as alocações a segurar a mesa
  // depois de a reserva morrer é a maneira de a sala aparecer cheia às 21h com
  // metade das mesas vazias.
  await db.reservationAllocation.deleteMany({ where: { reservationId: reservaId } });
}

/**
 * O cliente não apareceu.
 *
 * «Chegar não é estar sentado. Libertar uma reserva atrasada é política e acção
 * do host, nunca uma limpeza automática silenciosa» — por isso isto é uma função
 * que alguém chama, e não um varredor.
 */
export async function registarNaoCompareceu(
  db: ClienteComEscopo, reservaId: string,
): Promise<void> {
  await db.reservation.update({
    where: { id: reservaId },
    data: { estado: 'NAO_COMPARECEU', noShowEm: new Date() },
  });
  await db.reservationAllocation.deleteMany({ where: { reservationId: reservaId } });
}

export async function sentar(db: ClienteComEscopo, reservaId: string): Promise<void> {
  await db.reservation.update({
    where: { id: reservaId },
    data: { estado: 'SENTADA', sentadaEm: new Date() },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Mensagem — resultado SEPARADO
// ──────────────────────────────────────────────────────────────────────────

/**
 * «Uma reserva confirmada com email por enviar continua confirmada. Falha de
 * envio não desfaz a reserva, e sucesso de envio não a confirma.»
 *
 * Duas linhas em duas tabelas. Se isto fosse uma coluna `email_enviado` na
 * reserva, o dia em que o envio falhasse seria o dia em que alguém escrevia
 * `estado = 'FALHADA'` na reserva inteira.
 */
export async function registarMensagem(
  db: ClienteComEscopo, organizationId: string, reservaId: string,
  tipo: string, estado: 'ENVIADA' | 'FALHADA', erro?: string,
): Promise<void> {
  await db.reservationMessage.create({
    data: { organizationId, reservationId: reservaId, tipo, estado, erro: erro ?? null },
  });
}

export async function mensagensDaReserva(
  db: ClienteComEscopo, reservaId: string,
): Promise<{ tipo: string; estado: string; erro: string | null }[]> {
  return db.reservationMessage.findMany({
    where: { reservationId: reservaId },
    select: { tipo: true, estado: true, erro: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Lista de espera e retenção
// ──────────────────────────────────────────────────────────────────────────

/** Entrar na lista **não reserva nada**. */
export async function entrarNaEspera(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { nome: string; contacto: string; pessoas: number },
): Promise<string> {
  const linha = await db.waitlistEntry.create({
    data: { organizationId, locationId, ...dados },
    select: { id: true },
  });
  return linha.id;
}

/**
 * Oferece uma vaga com retenção.
 *
 * A oferta consome capacidade **enquanto dura**, e a duração vem das definições
 * da casa. O fim é um INSTANTE gravado agora, contra o relógio da base — não um
 * contador que alguém tem de decrementar.
 */
export async function oferecerVaga(
  db: ClienteComEscopo, locationId: string, esperaId: string,
  tableId: string, inicio: Date, fim: Date,
): Promise<Date> {
  const definicoes = await lerDefinicoes(db, locationId);
  const agora = await agoraDaBase(db);
  const expira = new Date(agora.getTime() + definicoes.retencaoMin * 60_000);
  await db.waitlistEntry.update({
    where: { id: esperaId },
    data: {
      estado: 'COM_OFERTA', ofertaTableId: tableId,
      ofertaInicio: inicio, ofertaFim: fim, ofertaExpiraEm: expira,
    },
  });
  return expira;
}

/**
 * Varre as retenções que já passaram da hora.
 *
 * ── Higiene, e não correcção ───────────────────────────────────────────────
 *
 * A capacidade JÁ está livre sem isto: `ocupacaoNoIntervalo` compara
 * `oferta_expira_em` com `now()` e não conta as expiradas. Este varredor existe
 * para a lista de espera não ficar cheia de ofertas mortas no ecrã de quem
 * trabalha.
 *
 * A distinção importa: se a correcção dependesse dele, uma noite em que ele não
 * corresse era uma noite de mesas bloqueadas — e é precisamente esse o defeito
 * que o contrato manda evitar.
 */
export async function varrerRetencoesExpiradas(
  db: ClienteComEscopo, locationId: string,
): Promise<number> {
  const r = await db.waitlistEntry.updateMany({
    where: { locationId, estado: 'COM_OFERTA', ofertaExpiraEm: { lt: new Date() } },
    data: { estado: 'A_ESPERA', ofertaTableId: null, ofertaInicio: null, ofertaFim: null, ofertaExpiraEm: null },
  });
  return r.count;
}

// ──────────────────────────────────────────────────────────────────────────
// Configuração — as seis telas
// ──────────────────────────────────────────────────────────────────────────

export async function listarTurnos(db: ClienteComEscopo, locationId: string) {
  return db.serviceWindow.findMany({
    where: { locationId, archivedAt: null },
    orderBy: [{ diaDaSemana: 'asc' }, { horaInicio: 'asc' }],
  });
}

export async function listarCapacidades(db: ClienteComEscopo, locationId: string) {
  return db.capacityRule.findMany({
    where: { locationId },
    include: { zona: { select: { nome: true } }, turno: { select: { nome: true } } },
  });
}

export async function listarBloqueios(db: ClienteComEscopo, locationId: string) {
  return db.reservationBlock.findMany({
    where: { locationId },
    orderBy: { inicio: 'asc' },
    include: { zona: { select: { nome: true } }, mesa: { select: { codigo: true } } },
  });
}

export async function listarReservas(
  db: ClienteComEscopo, locationId: string, de: Date, ate: Date,
) {
  return db.reservation.findMany({
    where: { locationId, inicio: { gte: de, lt: ate } },
    orderBy: { inicio: 'asc' },
    include: { alocacoes: { select: { tableId: true } } },
  });
}

/**
 * Resolve uma hora LOCAL num instante, e diz se houve escolha.
 *
 * A tabela de fusos está na base, e é de lá que vem a resposta. O `estado` é a
 * metade que costuma faltar: resolver `02h30` em silêncio para `03h30` é resolver
 * — mas quem marcou tem de saber que a casa entendeu outra hora.
 */
export async function resolverHoraLocal(
  db: ClienteComEscopo, fuso: string, local: string,
): Promise<{ instante: Date; estado: 'NORMAL' | 'INEXISTENTE' | 'AMBIGUA' }> {
  const [linha] = await db.$queryRaw<{ instante: Date; estado: string }[]>`
    SELECT instante, estado FROM instante_local(${fuso}, ${local}::timestamp)
  `;
  return { instante: linha!.instante, estado: linha!.estado as 'NORMAL' | 'INEXISTENTE' | 'AMBIGUA' };
}
