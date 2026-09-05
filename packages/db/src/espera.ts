import {
  estimativaEmMinutos, mesasQueServem, posicaoDerivada, quemCabeNaMesa,
  type MesaParaEspera, type NaEspera,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';
import { lerDefinicoes } from './reservas.ts';
import { acontecimento, enfileirar } from './mensagens.ts';

/**
 * A lista de espera, do lado da base.
 *
 * ── O que se guarda, e o que NÃO se guarda ─────────────────────────────────
 *
 * Guarda-se o momento de chegada, o tamanho do grupo, o contacto, o estado e as
 * zonas que servem aquele grupo. **Não se guarda uma posição.**
 *
 * Não há função aqui que devolva um número de fila, porque não há coluna de onde
 * o tirar. A posição sai de `posicaoNaEspera`, que a calcula a partir da
 * composição actual da espera — e por isso muda quando a espera muda, e não
 * quando um contador é incrementado.
 */

export interface EntradaNaEspera {
  id: string;
  nome: string;
  contacto: string;
  pessoas: number;
  estado: 'A_ESPERA' | 'COM_OFERTA' | 'SENTADO' | 'DESISTIU';
  chegouEm: Date;
  chamadoEm: Date | null;
  sentadoEm: Date | null;
  zonas: string[];
  notas: string | null;
}

async function mesasDaUnidade(
  db: ClienteComEscopo, locationId: string,
): Promise<MesaParaEspera[]> {
  const mesas = await db.serviceTable.findMany({
    where: { locationId, archivedAt: null },
    select: { id: true, areaId: true, capacidade: true },
  });
  return mesas;
}

/**
 * Entrar na espera. **Não reserva nada por existir.**
 *
 * As zonas são uma preferência. Lista vazia quer dizer «a unidade inteira», e
 * não «nenhuma» — ausência é ausência.
 */
export async function entrarNaEspera(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { nome: string; contacto: string; pessoas: number; zonas?: string[]; notas?: string },
): Promise<string> {
  const linha = await db.waitlistEntry.create({
    data: {
      organizationId, locationId,
      nome: dados.nome, contacto: dados.contacto, pessoas: dados.pessoas,
      ...(dados.notas ? { notas: dados.notas } : {}),
    },
    select: { id: true },
  });
  // ── As zonas em separado, e não aninhadas ──────────────────────────────
  //
  // A chave estrangeira da zona é composta — `(organization_id, area_id)` — e o
  // `create` aninhado não deixa escrever a organização, porque a herda da
  // relação com a espera. Escrever as duas linhas em sequência diz exactamente
  // o que se quer, em vez de disfarçar a chave composta.
  if (dados.zonas && dados.zonas.length > 0) {
    await db.waitlistArea.createMany({
      data: dados.zonas.map((areaId) => ({ organizationId, waitlistId: linha.id, areaId })),
    });
  }
  return linha.id;
}

/**
 * Quem está à espera, **por ordem de chegada**.
 *
 * ── É o que o host vê, e é de propósito ────────────────────────────────────
 *
 * «O host precisa de ver a ordem de chegada, porque é a informação que lhe
 * permite ser justo de propósito quando decide não a seguir.» Ele vê quem chegou
 * primeiro, vê quem cabe na mesa que vagou, e escolhe.
 *
 * Isto **não** é a posição de ninguém. É a ordem de chegada, que é outra coisa —
 * e o ecrã do host tem de as dizer com palavras diferentes.
 */
export async function esperaDaUnidade(
  db: ClienteComEscopo, locationId: string,
  opcoes: { incluirFechadas?: boolean } = {},
): Promise<EntradaNaEspera[]> {
  const linhas = await db.waitlistEntry.findMany({
    where: {
      locationId,
      ...(opcoes.incluirFechadas ? {} : { estado: { in: ['A_ESPERA', 'COM_OFERTA'] } }),
    },
    orderBy: { createdAt: 'asc' },
    include: { zonas: { select: { areaId: true } } },
  });
  return linhas.map((l) => ({
    id: l.id, nome: l.nome, contacto: l.contacto, pessoas: l.pessoas,
    estado: l.estado as EntradaNaEspera['estado'],
    chegouEm: l.createdAt, chamadoEm: l.chamadoEm, sentadoEm: l.sentadoEm,
    zonas: l.zonas.map((z) => z.areaId), notas: l.notas,
  }));
}

const paraODominio = (e: EntradaNaEspera): NaEspera =>
  ({ id: e.id, pessoas: e.pessoas, zonas: e.zonas, chegouEm: e.chegouEm });

/**
 * A posição de alguém — derivada, dentro do grupo que cabe nas mesmas mesas.
 *
 * Devolve `null` para quem não cabe em mesa nenhuma desta sala. Não é o último
 * da fila: é alguém para quem esta sala não tem mesa, e a diferença importa.
 */
export async function posicaoNaEspera(
  db: ClienteComEscopo, locationId: string, esperaId: string,
): Promise<{ posicao: number; de: number } | null> {
  const [todos, mesas] = await Promise.all([
    esperaDaUnidade(db, locationId), mesasDaUnidade(db, locationId),
  ]);
  const quem = todos.find((e) => e.id === esperaId);
  if (!quem) return null;
  return posicaoDerivada(paraODominio(quem), todos.map(paraODominio), mesas);
}

/**
 * O que se diz a quem espera: uma estimativa, marcada como estimativa.
 *
 * O número nunca sai sozinho. Quem o mostrar tem o `estimativa: true` na mão e
 * não pode fingir que não sabe o que ele é — o resto, que é dizê-lo por
 * palavras, é do ecrã, e a régua mede-o no texto visível.
 */
export async function esperaEstimada(
  db: ClienteComEscopo, locationId: string, esperaId: string,
): Promise<{ minutos: number; estimativa: true } | null> {
  const definicoes = await lerDefinicoes(db, locationId);
  const posicao = await posicaoNaEspera(db, locationId, esperaId);
  return estimativaEmMinutos(posicao, definicoes.duracaoPadraoMin);
}

/**
 * Quem cabe na mesa que vaga agora, e porquê.
 *
 * Devolve **todos** os que cabem, por ordem de chegada, com a mesa que motivou a
 * sugestão. Escolher é do host: o produto ordena e explica, não decide.
 */
export async function sugestoesParaMesa(
  db: ClienteComEscopo, locationId: string, tableId: string,
): Promise<{ espera: EntradaNaEspera; porque: { tableId: string; codigo: string } }[]> {
  const mesa = await db.serviceTable.findFirst({
    where: { id: tableId, locationId, archivedAt: null },
    select: { id: true, areaId: true, capacidade: true, codigo: true },
  });
  if (!mesa) return [];
  const todos = await esperaDaUnidade(db, locationId);
  const cabem = quemCabeNaMesa(mesa, todos.map(paraODominio));
  const porId = new Map(todos.map((e) => [e.id, e]));
  return cabem.map((c) => ({
    espera: porId.get(c.id)!,
    porque: { tableId: mesa.id, codigo: mesa.codigo },
  }));
}

/**
 * Chamar alguém: a espera passa a `COM_OFERTA`, com a vaga concreta.
 *
 * ── Uma porta só, e foi a base que o exigiu ────────────────────────────────
 *
 * O E18 tinha um `oferecerVaga` que fazia isto sem carimbar `chamadoEm`. Assim
 * que o `CHECK` desta migração passou a exigir o carimbo, essa segunda porta
 * ficou vermelha — e bem: duas funções a escrever a mesma transição são duas
 * decisões sobre a mesma coisa, e uma delas esquecia-se do carimbo de que o
 * relatório de tempos de espera vive.
 *
 * A restrição encontrou a duplicação antes de qualquer pessoa a encontrar.
 */
export async function chamarDaEspera(
  db: ClienteComEscopo, locationId: string, esperaId: string,
  tableId: string, inicio: Date, fim: Date,
): Promise<Date> {
  const definicoes = await lerDefinicoes(db, locationId);
  const [agora] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const expira = new Date(agora!.agora.getTime() + definicoes.retencaoMin * 60_000);
  const espera = await db.waitlistEntry.update({
    where: { id: esperaId },
    data: {
      estado: 'COM_OFERTA', ofertaTableId: tableId,
      ofertaInicio: inicio, ofertaFim: fim, ofertaExpiraEm: expira,
      chamadoEm: agora!.agora,
    },
    select: { organizationId: true, reservationId: true },
  });

  // ── O ACONTECIMENTO: a mesa ficou pronta ──────────────────────────────
  //
  // Vive AQUI, onde o facto acontece, e não na rota — uma chamada da lista de
  // espera é sempre uma chamada, venha de que ecrã vier.
  //
  // É o caso que o contrato usa para explicar a chave: «a sua mesa está pronta»
  // pode ter de sair DUAS VEZES na mesma noite — a pessoa não veio à primeira e o
  // host volta a chamar. Cada chamada cunha identidade nova, logo entrega. Com a
  // chave antiga a segunda desaparecia em silêncio.
  if (espera.reservationId) {
    await enfileirar(db, espera.organizationId, locationId, espera.reservationId,
      acontecimento(), 'mesa-pronta', 'es-ES');
  }
  return expira;
}

/**
 * Sentar. É o fim feliz, e leva a sessão de mesa consigo.
 *
 * A base exige o carimbo: um `SENTADO` sem `sentadoEm` seria uma linha que diz
 * que alguém se sentou e não sabe quando — e o relatório de tempos de espera sai
 * daqui.
 */
export async function sentarQuemEsperava(
  db: ClienteComEscopo, esperaId: string, tableSessionId: string,
): Promise<void> {
  await db.waitlistEntry.update({
    where: { id: esperaId },
    data: { estado: 'SENTADO', sentadoEm: new Date(), tableSessionId },
  });
}

export async function desistir(db: ClienteComEscopo, esperaId: string): Promise<void> {
  await db.waitlistEntry.update({
    where: { id: esperaId },
    data: {
      estado: 'DESISTIU', desistiuEm: new Date(),
      // A vaga sai com a desistência. Uma oferta pendurada numa espera morta
      // prendia a mesa até a retenção expirar, sem ninguém a caminho.
      ofertaTableId: null, ofertaInicio: null, ofertaFim: null, ofertaExpiraEm: null,
    },
  });
}

export { mesasQueServem };
