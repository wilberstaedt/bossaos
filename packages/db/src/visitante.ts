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

/**
 * Marca o sinal de vida. «Nunca pediu nada» é diferente de «pediu há uma hora».
 *
 * ── Escrevia sem escopo, e a base recusava em SILÊNCIO ────────────────────
 *
 * A primeira versão fazia `prisma.guestSession.updateMany` com o cliente do
 * runtime e **sem contexto de inquilino**. A política de linha recusava a
 * escrita, o `updateMany` devolvia `count: 0`, e não havia erro nenhum — o
 * QR-006 mostrava «nunca pediu nada» sobre alguém que tinha acabado de pedir.
 *
 * É o mesmo modo de falha do ORG-007: não estoira, mente. E não podia ser doutra
 * maneira — quem chega pelo QR não tem inquilino, e dar-lho aqui era abrir a
 * organização a quem tem um autocolante. Vai pela porta, como o resto.
 */
export async function visitanteFalou(prisma: PrismaClient, token: string): Promise<void> {
  // ── `$executeRaw`, e não `$queryRaw` ────────────────────────────────────
  //
  // A porta devolve `void`, e o `$queryRaw` tenta descodificar as colunas do
  // resultado: com `void` responde `UnsupportedNativeDataType` e rebenta. O
  // `$executeRaw` conta linhas e não olha para tipos.
  //
  // Só o navegador o apanhou, e a razão é a que interessa: **nenhum teste de
  // base chamava esta função**. Estava exportada, usada só pela rota, e por isso
  // fora de todas as provas. Agora tem caso próprio — a cobertura de uma função
  // não é ela existir, é alguém chamá-la.
  await prisma.$executeRaw`SELECT visitante_falou(${resumirSegredo(token)})`;
}

/** Uma linha de pedido, como o visitante a vê. */
export interface LinhaDoVisitante {
  id: string;
  nome: string;
  quantidade: number;
  precoMenor: number | null;
  moeda: string | null;
  estado: string;
  motivoRejeicao: string | null;
  linhaPaiId: string | null;
}

export interface PedidoDoVisitante {
  id: string;
  numero: string;
  canal: string;
  createdAt: Date;
  linhas: LinhaDoVisitante[];
}

/**
 * Os pedidos DESTA mesa. Pela porta, e o filtro é a credencial.
 *
 * «O convidado da mesa 5 não vê a mesa 4 nem os outros ocupantes da 5» — e isso
 * está escrito em SQL, dentro da porta, e não num filtro que a próxima página
 * pode esquecer.
 */
export async function pedidosDoVisitante(
  prisma: PrismaClient, token: string,
): Promise<PedidoDoVisitante[]> {
  const linhas = await prisma.$queryRaw<{
    order_id: string; numero: string; canal: string; criado_em: Date;
    linha_id: string | null; nome: string | null; quantidade: number | null;
    preco_menor: number | null; moeda: string | null;
    linha_estado: string | null; motivo_rejeicao: string | null; linha_pai_id: string | null;
  }[]>`SELECT * FROM visitante_ve_pedidos(${resumirSegredo(token)})`;

  const porPedido = new Map<string, PedidoDoVisitante>();
  for (const l of linhas) {
    const pedido = porPedido.get(l.order_id) ?? {
      id: l.order_id, numero: l.numero, canal: l.canal, createdAt: l.criado_em, linhas: [],
    };
    // Um pedido sem linhas nenhumas existe — o `LEFT JOIN` devolve-o com os
    // campos da linha a `null`. Inventar uma linha vazia ali era pior do que a
    // ausência: a tela somava um item que não existe.
    if (l.linha_id) {
      pedido.linhas.push({
        id: l.linha_id, nome: l.nome ?? '', quantidade: l.quantidade ?? 0,
        precoMenor: l.preco_menor, moeda: l.moeda,
        estado: l.linha_estado ?? '', motivoRejeicao: l.motivo_rejeicao,
        linhaPaiId: l.linha_pai_id,
      });
    }
    porPedido.set(l.order_id, pedido);
  }
  return [...porPedido.values()];
}

/** O estado das tarefas de produção desta mesa, por pedido. Só os estados. */
export async function producaoDoVisitante(
  prisma: PrismaClient, token: string,
): Promise<Map<string, { estado: string }[]>> {
  const linhas = await prisma.$queryRaw<{ order_id: string; estado: string }[]>`
    SELECT * FROM visitante_ve_producao(${resumirSegredo(token)})`;
  const mapa = new Map<string, { estado: string }[]>();
  for (const l of linhas) {
    mapa.set(l.order_id, [...(mapa.get(l.order_id) ?? []), { estado: l.estado }]);
  }
  return mapa;
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

// ── As chamadas da mesa (ponto 4 do enunciado) ─────────────────────────────

export type TipoDeChamada = 'AJUDA' | 'CONTA';

/**
 * A janela de deduplicação, em segundos.
 *
 * ── É UM número, e responde às DUAS coisas que o enunciado pede ───────────
 *
 * «Limites de frequência» e «deduplicação» não são dois mecanismos: são a mesma
 * janela vista de dois lados. Dentro dela, um segundo toque **é** a primeira
 * chamada — isso é deduplicar. E como só há uma chamada por janela, a frequência
 * fica limitada a uma por tipo e por mesa — isso é o limite.
 *
 * Escrever dois mecanismos para uma propriedade era inventar complexidade e
 * arranjar um segundo sítio onde a regra pode discordar de si própria.
 *
 * ── Dois minutos, e porquê ────────────────────────────────────────────────
 *
 * É o tempo que alguém espera antes de achar que ninguém o ouviu. Mais curto e o
 * limite não limita nada; mais longo e uma chamada legítima — «ninguém veio, e
 * agora precisamos mesmo» — é engolida em silêncio, que é pior do que não haver
 * limite nenhum.
 *
 * **Não é política do restaurante**: é o intervalo em que dois toques são
 * evidentemente o mesmo pedido. Se um dia for configurável, é uma decisão do
 * dono e entra por uma tabela, não por aqui.
 */
export const JANELA_DE_CHAMADA_SEGUNDOS = 120;

export interface ChamadaDaMesa {
  callId: string;
  pedidaEm: Date;
  /** `null` enquanto ninguém foi. Ausência é ausência. */
  atendidaEm: Date | null;
  /**
   * Verdadeiro quando este toque **não** criou chamada nova: já havia uma dentro
   * da janela, e é a mesma. Devolve-se para o ecrã o poder dizer — «já
   * avisámos» é diferente de «avisámos agora», e a diferença é o que faz alguém
   * parar de carregar.
   */
  deduplicada: boolean;
}

/**
 * Chama a sala. `null` quando a credencial já não vale.
 *
 * ── A janela vive na PORTA, e não aqui ────────────────────────────────────
 *
 * Uma verificação feita antes do `INSERT`, deste lado, é a mesma corrida do E13
 * com outro nome: dois toques ao mesmo tempo lêem ambos «não há chamada aberta»
 * e escrevem duas. Na porta, a leitura e a escrita são o mesmo acto, com o
 * bloqueio da linha — e duas pessoas na mesma mesa a carregarem ao mesmo tempo
 * dão uma chamada, que é o que a sala precisa que aconteça.
 */
export async function chamarASala(
  prisma: PrismaClient,
  dados: { token: string; tipo: TipoDeChamada; janelaSegundos?: number },
): Promise<ChamadaDaMesa | null> {
  const janela = dados.janelaSegundos ?? JANELA_DE_CHAMADA_SEGUNDOS;
  const linhas = await prisma.$queryRaw<{
    call_id: string; pedida_em: Date; atendida_em: Date | null; deduplicada: boolean;
  }[]>`SELECT * FROM chamar_a_sala(${resumirSegredo(dados.token)}, ${dados.tipo}::"TipoDeChamada", ${janela})`;
  const l = linhas[0];
  if (!l) return null;
  return {
    callId: l.call_id, pedidaEm: l.pedida_em,
    atendidaEm: l.atendida_em, deduplicada: l.deduplicada,
  };
}

export interface ChamadaVista {
  callId: string;
  tipo: TipoDeChamada;
  pedidaEm: Date;
  atendidaEm: Date | null;
  atendidaPor: string | null;
}

/** O que esta mesa chamou, para o visitante saber se alguém vem. */
export async function chamadasDaVisita(
  prisma: PrismaClient, token: string,
): Promise<ChamadaVista[]> {
  const linhas = await prisma.$queryRaw<{
    call_id: string; tipo: TipoDeChamada; pedida_em: Date;
    atendida_em: Date | null; atendida_por: string | null;
  }[]>`SELECT * FROM chamadas_da_visita(${resumirSegredo(token)})`;
  return linhas.map((l) => ({
    callId: l.call_id, tipo: l.tipo, pedidaEm: l.pedida_em,
    atendidaEm: l.atendida_em, atendidaPor: l.atendida_por,
  }));
}

/** As chamadas por atender de uma unidade — o que a sala vê. */
export function chamadasPorAtender(db: ClienteComEscopo, locationId: string) {
  return db.guestCall.findMany({
    where: { locationId, atendidaEm: null },
    include: { mesa: { select: { id: true, codigo: true } } },
    // A mais antiga primeiro: quem espera há mais tempo é quem já desistiu de
    // esperar. Ordenar pela mais recente punha a sala a servir quem grita agora.
    orderBy: { pedidaEm: 'asc' },
  });
}

/**
 * Alguém foi lá. **É a metade que fecha o ciclo.**
 *
 * «Sem a confirmação, quem chamou não sabe se alguém vem, e volta a carregar» —
 * e depois de duas voltas deixa de acreditar no botão e levanta a mão, que é
 * exactamente o que este produto existe para não ser preciso.
 *
 * Idempotente: atender duas vezes não reescreve quem atendeu primeiro. A
 * primeira pessoa a ir lá é a que consta.
 */
export async function atenderChamada(
  db: ClienteComEscopo,
  dados: { callId: string; actor: { email: string } },
): Promise<{ ok: true } | { ok: false; motivo: 'chamada_desconhecida' | 'ja_atendida' }> {
  const escrito = await db.guestCall.updateMany({
    // `atendidaEm: null` na CONDIÇÃO, e não numa leitura antes: ler e depois
    // escrever é a mesma corrida com a janela mais estreita.
    where: { id: dados.callId, atendidaEm: null },
    data: { atendidaEm: new Date(), atendidaPor: dados.actor.email },
  });
  if (escrito.count === 1) return { ok: true };

  const existe = await db.guestCall.count({ where: { id: dados.callId } });
  return { ok: false, motivo: existe > 0 ? 'ja_atendida' : 'chamada_desconhecida' };
}


/**
 * O visitante envia o carrinho. **Recebe o TOKEN, nunca um inquilino.**
 *
 * ── Porque é que esta função existe, em vez de a rota chamar `enviarPedido` ──
 *
 * `enviarPedido` **recebe** o `organizationId`. Numa rota pública isso é a forma
 * errada, mesmo quando o valor está certo: quem lê o ficheiro não consegue saber
 * de onde ele veio, e a guarda do E09 — que lê o ficheiro — também não.
 *
 * Aqui o inquilino sai da porta, a partir da credencial, e não há por onde outro
 * valor entrar. É a mesma forma do `guardarLeadPublico` do E10: a escrita pública
 * resolve o inquilino a partir do que é público, e não do que lhe passam.
 */
export async function pedirDoVisitante(
  prisma: PrismaClient,
  dados: {
    token: string;
    commandId: string;
    linhas: readonly { productId: string; quantidade: number }[];
  },
): Promise<
  | { ok: true; orderId: string; rejeitadas: number }
  | { ok: false; motivo: 'sessao_terminou' | 'sem_linhas' | string }
> {
  const visitante = await visitanteActivo(prisma, dados.token);
  if (!visitante) return { ok: false, motivo: 'sessao_terminou' };
  if (dados.linhas.length === 0) return { ok: false, motivo: 'sem_linhas' };

  const { enviarPedido } = await import('./pedidos.ts');
  const r = await enviarPedido(prisma, visitante.organizationId, {
    commandId: dados.commandId,
    locationId: visitante.locationId,
    // Um pedido de visitante é sempre de origem CARTA. O E15 provou que a origem
    // tem de ser visível e distinguível a quem serve — dois pratos iguais
    // pedidos ao mesmo tempo pelo cliente e pela sala são DOIS.
    canal: 'CARTA',
    linhas: dados.linhas,
    tableSessionId: visitante.tableSessionId,
    actor: { email: `visitante:${visitante.guestId}` },
  });
  if (!r.ok) return { ok: false, motivo: r.motivo };
  return { ok: true, orderId: r.orderId, rejeitadas: r.rejeitadas.length };
}

/**
 * O comprovativo, por porta estreita.
 *
 * ── Porque entra aqui e não numa excepção ─────────────────────────────────
 *
 * Quem está na mesa não tem inquilino: tem uma bolacha de visitante e um
 * identificador de recibo. É a mesma forma do `abrirVisitante` — a função
 * recebe a credencial e mais nada, e resolve tudo lá dentro. Uma excepção à
 * guarda das rotas seria uma porta a mais, e este sítio já tem as que precisa.
 *
 * Devolve **só o que se mostra**: montante, gorjeta, moeda, e se ainda está por
 * confirmar. Não devolve a conta, nem a tentativa, nem o nome de ninguém — o que
 * não sai por aqui não pode ser lido por aqui.
 */
export async function reciboPublico(
  prisma: PrismaClient, recibo: string,
): Promise<{
  montanteMenor: number; gorjetaMenor: number; moeda: string; emComprovacao: boolean;
} | null> {
  // O identificador é opaco e tem forma conhecida. Recusar aqui evita que uma
  // cadeia arbitrária chegue à base — e evita-o antes de a base ser tocada.
  if (!/^[0-9a-f-]{8,64}$/i.test(recibo)) return null;
  const linhas = await prisma.$queryRaw<{
    montante_menor: number; gorjeta_menor: number; moeda: string; em_comprovacao: boolean;
  }[]>`SELECT * FROM publico_recibo(${recibo})`;
  const r = linhas[0];
  if (!r) return null;
  return {
    montanteMenor: r.montante_menor, gorjetaMenor: r.gorjeta_menor,
    moeda: r.moeda, emComprovacao: r.em_comprovacao,
  };
}
