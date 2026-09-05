import { estadoDerivado } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * E16 · produção, estações e KDS.
 *
 * ── O modo de falha desta área não dá erro ────────────────────────────────
 *
 * Numa cozinha, quando isto parte, não aparece uma mensagem vermelha: aparece
 * **um prato que nunca é feito**, e ninguém descobre até o cliente perguntar. Do
 * ponto de vista do software nada correu mal — o pedido simplesmente nunca
 * chegou ao ecrã.
 *
 * É por isso que quase tudo aqui é sobre **não perder**, e quase nada sobre
 * velocidade.
 */

export type EstadoDaProducao =
  | 'POR_INICIAR' | 'EM_PREPARO' | 'PRONTA' | 'ENTREGUE' | 'CANCELADA';

export interface ActorDeProducao {
  email: string;
}

// ── Estações ───────────────────────────────────────────────────────────────

export function listarEstacoes(db: ClienteComEscopo, locationId: string) {
  return db.productionStation.findMany({
    where: { locationId, archivedAt: null },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  });
}

export async function guardarEstacao(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    id?: string; locationId: string; nome: string;
    tipo?: 'PREPARACAO' | 'EXPO'; ordem?: number; limiteVisivel?: number;
  },
): Promise<{ ok: true; id: string } | { ok: false; motivo: 'limite_invalido' | 'sem_nome' }> {
  const nome = dados.nome.trim();
  if (nome === '') return { ok: false, motivo: 'sem_nome' };
  // ── Um limite visível de zero esconde TUDO ────────────────────────────
  //
  // E um limite negativo não quer dizer nada. Recusa-se em vez de o guardar e
  // deixar o ecrã em branco — que é indistinguível de «não há trabalho», e é
  // exactamente a confusão que esta etapa existe para não deixar acontecer.
  const limite = dados.limiteVisivel ?? 12;
  if (!Number.isInteger(limite) || limite < 1) return { ok: false, motivo: 'limite_invalido' };

  if (dados.id) {
    await db.productionStation.updateMany({
      where: { id: dados.id },
      data: {
        nome, ...(dados.tipo ? { tipo: dados.tipo } : {}),
        ...(dados.ordem === undefined ? {} : { ordem: dados.ordem }),
        limiteVisivel: limite,
      },
    });
    return { ok: true, id: dados.id };
  }
  const criada = await db.productionStation.create({
    data: {
      organizationId, locationId: dados.locationId, nome,
      tipo: dados.tipo ?? 'PREPARACAO', ordem: dados.ordem ?? 0, limiteVisivel: limite,
    },
    select: { id: true },
  });
  return { ok: true, id: criada.id };
}

// ── Roteamento ─────────────────────────────────────────────────────────────

export function listarRegras(db: ClienteComEscopo, locationId: string) {
  return db.routingRule.findMany({
    where: { locationId },
    include: {
      estacao: { select: { id: true, nome: true } },
      produto: { select: { id: true, nome: true } },
      categoria: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function guardarRegra(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { locationId: string; stationId: string; productId?: string; categoryId?: string },
): Promise<{ ok: true; id: string } | { ok: false; motivo: 'alvo_invalido' }> {
  // Exactamente um alvo. A base também o recusa — esta verificação existe para
  // a resposta ser um motivo e não uma excepção de restrição.
  const alvos = [dados.productId, dados.categoryId].filter((x) => x !== undefined);
  if (alvos.length !== 1) return { ok: false, motivo: 'alvo_invalido' };

  const criada = await db.routingRule.create({
    data: {
      organizationId, locationId: dados.locationId, stationId: dados.stationId,
      ...(dados.productId ? { productId: dados.productId } : {}),
      ...(dados.categoryId ? { categoryId: dados.categoryId } : {}),
    },
    select: { id: true },
  });
  return { ok: true, id: criada.id };
}

export async function apagarRegra(db: ClienteComEscopo, id: string): Promise<void> {
  await db.routingRule.deleteMany({ where: { id } });
}

/**
 * As estações que um produto alcança nesta unidade.
 *
 * ── TODAS as regras que casam, e não a «melhor» ───────────────────────────
 *
 * Não há precedência entre uma regra de produto e uma de categoria: as duas
 * valem, e o resultado são duas tarefas. É o que faz um hambúrguer com batata ser
 * grelha **e** fritadeira — o caso que parte o modelo ingénuo, e o motivo de o
 * contrato existir.
 *
 * **Lista vazia é «não encaminhado», e é uma resposta.** Não é «cozinha por
 * omissão»: ausência de regra quer dizer que ninguém decidiu, e inventar a
 * estação mais provável é tomar a decisão do dono e esconder que foi inventada.
 */
export async function estacoesParaProduto(
  db: ClienteComEscopo,
  locationId: string,
  produto: { id: string | null; categoryId: string | null },
): Promise<string[]> {
  if (!produto.id) return [];
  const regras = await db.routingRule.findMany({
    where: {
      locationId,
      OR: [
        { productId: produto.id },
        ...(produto.categoryId ? [{ categoryId: produto.categoryId }] : []),
      ],
    },
    select: { stationId: true },
  });
  // Distintas: duas regras para a mesma estação são a mesma estação, e não duas
  // tarefas. O índice único da base recusaria a segunda — isto evita chegar lá.
  return [...new Set(regras.map((r: { stationId: string }) => r.stationId))];
}

// ── Tarefas ────────────────────────────────────────────────────────────────

/**
 * Cria as tarefas de produção das linhas ACEITES de um envio.
 *
 * ── Uma linha sem regra gera UMA tarefa sem estação ───────────────────────
 *
 * E não zero. Zero fazia o trabalho desaparecer em silêncio, que é o defeito que
 * esta etapa inteira existe para impedir: não dá erro, dá comida em falta. Uma
 * tarefa sem estação é visível a quem configura e diz o que é — há trabalho, e
 * ninguém foi avisado.
 */
export async function criarTarefasDasLinhas(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { locationId: string; orderId: string; actor: ActorDeProducao },
): Promise<{ criadas: number; naoEncaminhadas: number }> {
  const linhas = await db.orderLine.findMany({
    where: { orderId: dados.orderId, estado: 'ACEITE' },
    select: { id: true, productId: true },
  });

  // ── A categoria vem de uma consulta À PARTE, e não de uma relação ───────
  //
  // `OrderLine` não tem relação com `Product`, e é de propósito: a linha guarda
  // um **instantâneo** — nome e preço copiados — porque o produto pode ser
  // arquivado depois e a linha servida continua a valer. Acrescentar a relação
  // só para isto era desfazer a decisão do E14 por conveniência de uma consulta.
  //
  // Uma consulta para todas as linhas, e não uma por linha: `N+1` no caminho de
  // envio de um pedido é o ecrã que toda a gente tem aberto a noite inteira.
  const idsDeProduto = [...new Set(
    linhas.map((l: { productId: string | null }) => l.productId).filter((x): x is string => !!x))];
  const produtos = idsDeProduto.length === 0 ? [] : await db.product.findMany({
    where: { id: { in: idsDeProduto } },
    select: { id: true, categoryId: true },
  });
  const categoriaDe = new Map(
    produtos.map((p: { id: string; categoryId: string | null }) => [p.id, p.categoryId]));

  let criadas = 0;
  let naoEncaminhadas = 0;
  for (const linha of linhas) {
    const jaTem = await db.productionTask.count({ where: { lineId: linha.id } });
    // Idempotente: reenviar o mesmo comando não duplica trabalho na cozinha.
    if (jaTem > 0) continue;

    const estacoes = await estacoesParaProduto(db, dados.locationId, {
      id: linha.productId,
      categoryId: (linha.productId ? categoriaDe.get(linha.productId) : null) ?? null,
    });

    const alvos: (string | null)[] = estacoes.length > 0 ? estacoes : [null];
    for (const stationId of alvos) {
      await db.productionTask.create({
        data: {
          organizationId, locationId: dados.locationId,
          orderId: dados.orderId, lineId: linha.id,
          ...(stationId ? { stationId } : {}),
        },
      });
      criadas += 1;
      if (stationId === null) naoEncaminhadas += 1;
    }
  }
  return { criadas, naoEncaminhadas };
}

/**
 * O que uma estação VÊ. É a consulta, e não o que o ecrã pinta.
 *
 * ── O contrato é explícito sobre onde se mede isto ────────────────────────
 *
 * *«Uma estação só vê as suas tarefas. Não é filtragem no ecrã: é o que a
 * consulta devolve. Se a linha chega ao ecrã e é escondida por CSS, chegou.»*
 *
 * ── E NÃO leva o limite visível ───────────────────────────────────────────
 *
 * O `limiteVisivel` da estação é uma regra de **apresentação**. Se entrasse aqui
 * num `take`, os bilhetes que não coubessem deixavam de existir para quem
 * pergunta — e o total contado deixava de bater com o enviado. É exactamente o
 * erro que o `kds-e-tempo-real.md` descreve: parece limpo, e é comida que nunca
 * é feita.
 *
 * ── E20 · o que não é para agora NÃO está aqui ───────────────────────────
 *
 * «Um pedido para as 20h não é trabalho para agora.» A passagem é por RELÓGIO:
 * a pergunta «chegou a hora?» responde-se comparando `now()` da BASE com o
 * momento de produção, e não «alguém abriu o ecrã e nós aproveitámos».
 *
 * Se dependesse de alguém olhar, o pedido das 8h da manhã esperava pelo primeiro
 * cozinheiro que chega às 11h.
 *
 * A tarefa **existe** desde que o pedido é aceite — é a mesma tarefa, com o
 * mesmo id — e por isso atravessar o momento duas vezes não cria duas entradas:
 * não há nada que se crie na passagem.
 */
export async function tarefasDaEstacao(
  db: ClienteComEscopo,
  locationId: string,
  stationId: string | null,
  filtro: { incluirResolvidas?: boolean; incluirFuturas?: boolean } = {},
) {
  // ── O agora vem da BASE, e a razão NÃO é o fuso ───────────────────────
  //
  // Escrevi `new Date()` à primeira, e justifiquei-o com «dois servidores em
  // fusos diferentes». Isso é falso: `Date.now()` é UTC absoluto, e o fuso do
  // processo não lhe toca.
  //
  // A razão verdadeira é outra e é mais chata: o que se compara é com carimbos
  // guardados pela BASE, e entre o relógio da aplicação e o dela há **deriva**.
  // Alguns segundos chegam para um pedido entrar na fila um instante antes ou
  // depois do que devia; um servidor com o relógio mal acertado transforma isso
  // em minutos. Perguntar as horas a quem guarda os carimbos tira a questão.
  const [linha] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const agora = linha!.agora;
  return db.productionTask.findMany({
    where: {
      locationId,
      stationId,
      ...(filtro.incluirResolvidas
        ? {}
        : { estado: { in: ['POR_INICIAR', 'EM_PREPARO'] as EstadoDaProducao[] } }),
      // Um pedido sem `producaoEm` é para agora: entra sempre.
      ...(filtro.incluirFuturas ? {} : {
        pedido: { OR: [{ producaoEm: null }, { producaoEm: { lte: agora } }] },
      }),
    },
    include: {
      linha: { select: { id: true, nome: true, quantidade: true, estado: true } },
      pedido: { select: { id: true, numero: true, canal: true, tableSessionId: true } },
      estacao: { select: { id: true, nome: true, tipo: true } },
    },
    // Prioridade primeiro, e depois a ordem de chegada. Nunca o contrário: um
    // bilhete priorizado no fim da lista é uma prioridade que não serve de nada.
    orderBy: [{ prioridade: 'desc' }, { criadaEm: 'asc' }],
  });
}


/** As transições que uma tarefa aceita, e mais nenhumas. */
const TRANSICOES: Record<EstadoDaProducao, EstadoDaProducao[]> = {
  POR_INICIAR: ['EM_PREPARO', 'CANCELADA'],
  // Um recall reabre uma tarefa: PRONTA volta a EM_PREPARO. É o que o contrato
  // manda — «reabre uma tarefa permitida sem criar venda nova nem consumo novo».
  EM_PREPARO: ['PRONTA', 'CANCELADA'],
  PRONTA: ['ENTREGUE', 'EM_PREPARO'],
  ENTREGUE: ['EM_PREPARO'],
  CANCELADA: [],
};

export type ResultadoDaTransicao =
  | { ok: true; versao: number; estado: EstadoDaProducao }
  | { ok: false; motivo: 'tarefa_desconhecida' }
  | { ok: false; motivo: 'transicao_invalida'; de: EstadoDaProducao }
  | { ok: false; motivo: 'sem_motivo' }
  | { ok: false; motivo: 'nao_encaminhada' };

/**
 * Move uma tarefa, sobe a versão e **grava o evento na mesma transacção**.
 *
 * ── Porque é que o evento não é um efeito à parte ─────────────────────────
 *
 * O cursor do KDS é a sequência destes eventos. Um evento escrito fora da
 * transacção perde-se quando ela reverte — e o cliente que retoma a partir do
 * cursor salta uma transição que aconteceu mesmo. O ecrã fica atrasado sobre uma
 * cozinha que já avançou, e ninguém vê erro nenhum.
 */
export async function transitarTarefa(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    taskId: string;
    para: EstadoDaProducao;
    actor: ActorDeProducao;
    /** Obrigatório para cancelar: o tempo e os ingredientes já foram gastos. */
    motivo?: string;
  },
): Promise<ResultadoDaTransicao> {
  const tarefa = await db.productionTask.findFirst({
    where: { id: dados.taskId },
    select: { id: true, estado: true, versao: true, locationId: true, orderId: true, stationId: true },
  });
  if (!tarefa) return { ok: false, motivo: 'tarefa_desconhecida' };

  const de = tarefa.estado as EstadoDaProducao;
  if (!TRANSICOES[de].includes(dados.para)) return { ok: false, motivo: 'transicao_invalida', de };

  // «Cancelar uma linha já em preparação exige motivo» — e sem motivo a recusa é
  // dita, não silenciosa: o produto já foi consumido em tempo e ingredientes.
  if (dados.para === 'CANCELADA' && !dados.motivo?.trim()) {
    return { ok: false, motivo: 'sem_motivo' };
  }
  // Uma tarefa sem estação não tem quem a comece. Deixá-la avançar escondia a
  // falta de roteamento — que é o único sintoma que ela tem.
  if (tarefa.stationId === null && dados.para === 'EM_PREPARO') {
    return { ok: false, motivo: 'nao_encaminhada' };
  }

  const versao = tarefa.versao + 1;
  const agora = new Date();
  await db.productionTask.update({
    where: { id: tarefa.id },
    data: {
      estado: dados.para,
      versao,
      // Os carimbos são do servidor. O gatilho da base protege o de criação; os
      // restantes escrevem-se aqui, e nunca a partir de nada que venha do cliente.
      ...(dados.para === 'EM_PREPARO' ? { iniciadaEm: agora, prontaEm: null } : {}),
      ...(dados.para === 'PRONTA' ? { prontaEm: agora } : {}),
      ...(dados.para === 'ENTREGUE' ? { entregueEm: agora } : {}),
      ...(dados.motivo ? { motivoCancelamento: dados.motivo.trim() } : {}),
    },
  });

  await db.productionEvent.create({
    data: {
      organizationId, locationId: tarefa.locationId, taskId: tarefa.id,
      orderId: tarefa.orderId, accao: `tarefa.${dados.para.toLowerCase()}`,
      versao, actorEmail: dados.actor.email,
      ...(dados.motivo ? { detalhe: { motivo: dados.motivo.trim() } as object } : {}),
    },
  });

  return { ok: true, versao, estado: dados.para };
}

/**
 * Prioriza uma tarefa. **Com motivo**, sempre.
 *
 * Uma prioridade sem razão é uma decisão que ninguém consegue rever depois do
 * turno — e a fila do KDS é onde as decisões de quem grita mais alto se
 * disfarçam de decisões do sistema.
 */
export async function priorizarTarefa(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { taskId: string; prioridade: number; motivo: string; actor: ActorDeProducao },
): Promise<{ ok: true } | { ok: false; motivo: 'tarefa_desconhecida' | 'sem_motivo' }> {
  if (!dados.motivo.trim()) return { ok: false, motivo: 'sem_motivo' };
  const tarefa = await db.productionTask.findFirst({
    where: { id: dados.taskId },
    select: { id: true, versao: true, locationId: true, orderId: true },
  });
  if (!tarefa) return { ok: false, motivo: 'tarefa_desconhecida' };

  const versao = tarefa.versao + 1;
  await db.productionTask.update({
    where: { id: tarefa.id },
    data: { prioridade: dados.prioridade, motivoPrioridade: dados.motivo.trim(), versao },
  });
  await db.productionEvent.create({
    data: {
      organizationId, locationId: tarefa.locationId, taskId: tarefa.id,
      orderId: tarefa.orderId, accao: 'tarefa.priorizada', versao,
      actorEmail: dados.actor.email,
      detalhe: { prioridade: dados.prioridade, motivo: dados.motivo.trim() } as object,
    },
  });
  return { ok: true };
}

/**
 * Cancelar uma linha cancela as tarefas dela — **em todas as estações**.
 *
 * Invariante 3 do contrato. Uma tarefa órfã numa estação é comida a ser feita
 * para um pedido que já não existe, e a cozinha não tem como saber.
 */
export async function cancelarTarefasDaLinha(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { lineId: string; motivo: string; actor: ActorDeProducao },
): Promise<{ canceladas: number }> {
  const tarefas = await db.productionTask.findMany({
    where: { lineId: dados.lineId, estado: { notIn: ['CANCELADA'] as EstadoDaProducao[] } },
    select: { id: true, versao: true, locationId: true, orderId: true },
  });
  for (const t of tarefas) {
    await db.productionTask.update({
      where: { id: t.id },
      data: { estado: 'CANCELADA', versao: t.versao + 1, motivoCancelamento: dados.motivo },
    });
    await db.productionEvent.create({
      data: {
        organizationId, locationId: t.locationId, taskId: t.id, orderId: t.orderId,
        accao: 'tarefa.cancelada', versao: t.versao + 1, actorEmail: dados.actor.email,
        detalhe: { motivo: dados.motivo, porLinha: true } as object,
      },
    });
  }
  return { canceladas: tarefas.length };
}

// ── Retoma: cursor, intervalo desconhecido, snapshot ───────────────────────

export interface EventoDeProducao {
  cursor: bigint;
  taskId: string | null;
  accao: string;
  versao: number;
  createdAt: Date;
}

/** Os eventos desta unidade a partir de um cursor. Ordenados, sempre. */
export function eventosDesde(
  db: ClienteComEscopo, locationId: string, desde: bigint, quantos = 200,
) {
  return db.productionEvent.findMany({
    where: { locationId, cursor: { gt: desde } },
    orderBy: { cursor: 'asc' },
    take: quantos,
    select: { cursor: true, taskId: true, accao: true, versao: true, createdAt: true },
  });
}

/** O cursor mais alto desta unidade. É o ponto de partida de quem chega novo. */
export async function cursorActual(db: ClienteComEscopo, locationId: string): Promise<bigint> {
  const ultimo = await db.productionEvent.findFirst({
    where: { locationId }, orderBy: { cursor: 'desc' }, select: { cursor: true },
  });
  return ultimo?.cursor ?? 0n;
}

// `estadoDerivado` mudou-se para `@bossaos/domain` pela mesma razão do
// `totalDoPedido`: é pura. Reexporta-se daqui.
export { estadoDerivado };
