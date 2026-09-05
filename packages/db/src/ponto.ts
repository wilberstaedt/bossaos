import { CORTE_DO_SERVICO_MINUTOS, diaDeServicoDe } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Equipa, escalas e ponto — o motor do E28.
 *
 * Contrato: `docs/architecture/ponto-e-escalas.md`.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem `editarMarcacao`. Não tem `apagarMarcacao`. Não tem nenhuma função
 * que escreva por cima de uma hora já picada — e a base recusaria na mesma, com
 * `REGISTO_IMUTAVEL`, se alguém escrevesse uma.
 *
 * Esta etapa mexe no salário de quem trabalha na casa, e quem é prejudicado por
 * um defeito aqui é a pessoa com menos poder para o contestar.
 */

export { CORTE_DO_SERVICO_MINUTOS, diaDeServicoDe };

export type RecusaDePonto =
  | 'MINUTOS_INVALIDOS'
  | 'SEM_MOTIVO'
  | 'MARCACAO_DESCONHECIDA'
  | 'JA_CORRIGIDA';

export class RecusaDoPonto extends Error {
  readonly motivo: RecusaDePonto;

  constructor(motivo: RecusaDePonto, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoPonto';
    this.motivo = motivo;
  }
}

function inteiro(n: number, oQue: string): number {
  if (!Number.isInteger(n)) {
    throw new RecusaDoPonto('MINUTOS_INVALIDOS',
      `${oQue} é em minutos inteiros, e veio ${n} — uma jornada não é 8,116666 horas`);
  }
  return n;
}

// ── Funções de equipa ──────────────────────────────────────────────────────

export function criarFuncao(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string; cor?: string;
}) {
  return db.teamRole.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(), cor: dados.cor?.trim() || null,
    },
  });
}

export function funcoesDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.teamRole.findMany({
    where: { locationId, arquivadaEm: null }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, cor: true },
  });
}

/**
 * A equipa, com nomes — pela PORTA, e não por junção.
 *
 * ── Porque é que não se lê `membership.user` ──────────────────────────────
 *
 * `users` tem RLS de identidade própria: uma junção devolve o nome de quem está
 * a ver e **nulo para toda a gente**. A primeira versão disto rebentou com
 * «Cannot read properties of null» — e a mensagem era a isolação a funcionar,
 * não um defeito dela.
 *
 * O produto já tinha a saída: `identidades_da_organizacao`, a mesma porta que o
 * mapa de sala usa para mostrar quem é o responsável de cada mesa.
 */
export async function equipaDaUnidade(db: ClienteComEscopo, organizationId: string) {
  const identidades = await db.$queryRawUnsafe<
    { id: string; email: string; nome: string | null }[]
  >('SELECT * FROM identidades_da_organizacao($1::uuid)', organizationId);
  const porUtilizador = new Map(identidades.map((i) => [i.id, i]));
  const pertencas = await db.membership.findMany({
    where: { organizationId, estado: 'ACTIVO' },
    select: { id: true, userId: true },
  });
  return pertencas.map((m) => {
    const quem = porUtilizador.get(m.userId);
    return {
      id: m.id,
      userId: m.userId,
      // Ausência é ausência: quem a porta não devolve fica sem nome, e nunca
      // com o identificador a fazer de nome.
      nome: quem?.nome ?? null,
      email: quem?.email ?? '',
    };
  });
}

// ── A escala PREVISTA ──────────────────────────────────────────────────────

export function criarTurno(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; membershipId: string;
  roleId?: string; diaDeServico: string;
  inicioMinutos: number; fimMinutos: number; nota?: string;
}) {
  const inicio = inteiro(dados.inicioMinutos, 'o início do turno');
  const fim = inteiro(dados.fimMinutos, 'o fim do turno');
  if (fim <= inicio) {
    throw new RecusaDoPonto('MINUTOS_INVALIDOS', 'o turno acaba antes de começar');
  }
  return db.shift.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      membershipId: dados.membershipId, roleId: dados.roleId ?? null,
      diaDeServico: new Date(`${dados.diaDeServico}T00:00:00Z`),
      inicioMinutos: inicio, fimMinutos: fim, nota: dados.nota?.trim() || null,
    },
  });
}

export function turnosDaSemana(db: ClienteComEscopo, dados: {
  locationId: string; de: string; ate: string;
}) {
  return db.shift.findMany({
    where: {
      locationId: dados.locationId,
      diaDeServico: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },
    },
    orderBy: [{ diaDeServico: 'asc' }, { inicioMinutos: 'asc' }],
    select: {
      id: true, diaDeServico: true, inicioMinutos: true, fimMinutos: true, nota: true,
      membro: { select: { id: true } },
      funcao: { select: { id: true, nome: true } },
    },
  });
}

// ── A MARCAÇÃO: um facto ───────────────────────────────────────────────────

/**
 * Picar o ponto. **A única porta que cria uma marcação.**
 *
 * O `autorMembershipId` é quem registou, que pode não ser de quem é a jornada:
 * uma autocorrecção é `autor = membro`. Não se proíbe; distingue-se.
 */
export function picar(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; membershipId: string;
  autorMembershipId: string;
  tipo: 'ENTRADA' | 'SAIDA'; momento: Date; fuso: string; origem?: string;
}) {
  return db.timeEntry.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      membershipId: dados.membershipId, autorMembershipId: dados.autorMembershipId,
      tipo: dados.tipo, momento: dados.momento,
      // A fronteira é aqui, e é uma vez só.
      diaDeServico: new Date(`${diaDeServicoDe(dados.momento, dados.fuso)}T00:00:00Z`),
      origem: dados.origem ?? null,
    },
  });
}

/**
 * Corrigir uma marcação — com um registo NOVO.
 *
 * A original continua lá. A base recusa qualquer tentativa de a reescrever, e
 * recusa também uma «correcção» que troque a pessoa ou o tipo: a imutabilidade
 * protege o passado, e o gatilho do sentido protege o significado.
 */
export async function corrigir(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string;
  marcacaoId: string; autorMembershipId: string;
  momento: Date; fuso: string; motivo: string;
}) {
  if (!dados.motivo.trim()) {
    throw new RecusaDoPonto('SEM_MOTIVO',
      'uma correcção sem razão não se explica a quem foi corrigido');
  }
  const original = await db.timeEntry.findUnique({
    where: { id: dados.marcacaoId },
    select: { id: true, membershipId: true, tipo: true, correccao: { select: { id: true } } },
  });
  if (!original) throw new RecusaDoPonto('MARCACAO_DESCONHECIDA', dados.marcacaoId);
  // Uma marcação já corrigida corrige-se a partir da CORRECÇÃO, e não da
  // original: senão ficavam duas verdades a apontar ao mesmo sítio.
  if (original.correccao) {
    throw new RecusaDoPonto('JA_CORRIGIDA',
      'esta marcação já tem correcção; corrija a correcção');
  }
  return db.timeEntry.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      membershipId: original.membershipId, autorMembershipId: dados.autorMembershipId,
      tipo: original.tipo, momento: dados.momento,
      diaDeServico: new Date(`${diaDeServicoDe(dados.momento, dados.fuso)}T00:00:00Z`),
      corrigeId: original.id, motivo: dados.motivo.trim(),
    },
  });
}

export interface MarcacaoLida {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  momento: Date;
  /** `true` quando esta marcação foi substituída por uma correcção. */
  corrigida: boolean;
  /** `true` quando esta marcação É uma correcção. */
  ehCorreccao: boolean;
  /** Quem corrigiu foi a própria pessoa? Só faz sentido numa correcção. */
  autocorreccao: boolean;
  /** A PERTENÇA de quem registou. O nome resolve-se pela porta das identidades. */
  autorMembershipId: string;
  motivo: string | null;
}

export async function marcacoesDoDia(db: ClienteComEscopo, dados: {
  membershipId: string; diaDeServico: string;
}): Promise<MarcacaoLida[]> {
  const linhas = await db.timeEntry.findMany({
    where: {
      membershipId: dados.membershipId,
      diaDeServico: new Date(`${dados.diaDeServico}T00:00:00Z`),
    },
    orderBy: [{ momento: 'asc' }, { criadoEm: 'asc' }],
    select: {
      id: true, tipo: true, momento: true, motivo: true, corrigeId: true,
      membershipId: true, autorMembershipId: true,
      correccao: { select: { id: true } },
    },
  });
  return linhas.map((l) => ({
    id: l.id,
    tipo: l.tipo as 'ENTRADA' | 'SAIDA',
    momento: l.momento,
    corrigida: l.correccao !== null,
    ehCorreccao: l.corrigeId !== null,
    autocorreccao: l.corrigeId !== null && l.autorMembershipId === l.membershipId,
    autorMembershipId: l.autorMembershipId,
    motivo: l.motivo,
  }));
}

export interface JornadaDoDia {
  diaDeServico: string;
  /** Minutos efectivamente trabalhados, contados das marcações que VALEM. */
  realMinutos: number;
  /** Minutos escalados. `null` quando não havia turno previsto. */
  previstoMinutos: number | null;
  /** `real − previsto`. `null` sem turno: não há diferença de nada. */
  diferencaMinutos: number | null;
  /** Entrou e nunca saiu. Não é uma jornada de zero: é uma jornada ABERTA. */
  aberta: boolean;
  entradas: number;
  correccoes: number;
}

/**
 * A jornada de um dia — e as marcações que VALEM.
 *
 * ── Uma marcação corrigida não conta; a correcção dela é que conta ────────
 *
 * As duas continuam guardadas, porque o rasto é o ponto. O que muda é qual
 * delas entra na conta — e essa decisão deriva-se, nunca se escreve.
 */
export async function jornadaDoDia(db: ClienteComEscopo, dados: {
  membershipId: string; locationId: string; diaDeServico: string; fuso: string;
}): Promise<JornadaDoDia> {
  const todas = await marcacoesDoDia(db, dados);
  const valem = todas.filter((m) => !m.corrigida);
  const entradas = valem.filter((m) => m.tipo === 'ENTRADA')
    .sort((a, b) => a.momento.getTime() - b.momento.getTime());
  const saidas = valem.filter((m) => m.tipo === 'SAIDA')
    .sort((a, b) => a.momento.getTime() - b.momento.getTime());

  let real = 0;
  const pares = Math.min(entradas.length, saidas.length);
  for (let i = 0; i < pares; i += 1) {
    const de = entradas[i]!.momento.getTime();
    const ate = saidas[i]!.momento.getTime();
    if (ate > de) real += Math.round((ate - de) / 60_000);
  }

  const turno = await db.shift.findFirst({
    where: {
      membershipId: dados.membershipId, locationId: dados.locationId,
      diaDeServico: new Date(`${dados.diaDeServico}T00:00:00Z`),
    },
    select: { inicioMinutos: true, fimMinutos: true },
  });
  const previsto = turno ? turno.fimMinutos - turno.inicioMinutos : null;

  return {
    diaDeServico: dados.diaDeServico,
    realMinutos: real,
    previstoMinutos: previsto,
    diferencaMinutos: previsto === null ? null : real - previsto,
    // Entrou e não saiu: uma jornada ABERTA, e não uma jornada de zero minutos.
    // Um produto que trate a ausência de saída como saída à meia-noite inventa
    // uma hora que ninguém picou.
    aberta: entradas.length > saidas.length,
    entradas: entradas.length,
    correccoes: todas.filter((m) => m.ehCorreccao).length,
  };
}

/** As jornadas de toda a equipa num dia — para a HR-008 e a HR-011. */
export async function jornadasDaUnidade(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; diaDeServico: string; fuso: string;
}) {
  const equipa = await equipaDaUnidade(db, dados.organizationId);
  return Promise.all(equipa.map(async (m) => ({
    membershipId: m.id,
    nome: m.nome ?? m.email,
    jornada: await jornadaDoDia(db, {
      membershipId: m.id, locationId: dados.locationId,
      diaDeServico: dados.diaDeServico, fuso: dados.fuso,
    }),
  })));
}

/** As correcções de uma unidade, para quem as revê na HR-010. */
export function correccoesDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.timeEntry.findMany({
    where: { locationId, corrigeId: { not: null } },
    orderBy: { criadoEm: 'desc' }, take: 100,
    select: {
      id: true, tipo: true, momento: true, motivo: true, criadoEm: true,
      membershipId: true, autorMembershipId: true,
      corrige: { select: { id: true, momento: true } },
    },
  });
}
