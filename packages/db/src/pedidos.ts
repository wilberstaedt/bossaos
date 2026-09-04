import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma, type Canal } from '@prisma/client';
import { comEscopo, type ClienteComEscopo } from './escopo.ts';
import { estaDisponivel, precoEfectivo } from './catalogo.ts';

/**
 * Motor de pedidos (E14).
 *
 * ── O que decide a forma deste ficheiro ───────────────────────────────────
 *
 * É a primeira etapa onde um defeito **cobra dinheiro duas vezes** ou faz
 * desaparecer o trabalho de alguém a meio de um serviço. Os três aceites são
 * três formas de a mesma coisa falhar — duas escritas que se encontram — e por
 * isso as garantias estão na forma e não em cuidado ao escrever:
 *
 *   1. `command_id` é ÚNICO na base. Reenviar depois do commit é impossível de
 *      duplicar. Um `SELECT` antes do `INSERT` é a corrida do E13 com outro nome.
 *   2. As linhas são **acrescentadas**. O padrão que perde trabalho —
 *      ler o pedido, juntar o item, gravar o pedido inteiro — não tem por onde
 *      acontecer, porque nunca se grava o pedido inteiro.
 *   3. O preço é **copiado** para a linha ao ser aceite. Uma publicação nova
 *      escreve noutra tabela e não tem como lhe tocar.
 */

const VIOLACAO_UNICA = '23505';

function eViolacaoUnica(erro: unknown): boolean {
  const e = erro as { code?: string; cause?: { code?: string } } | null;
  return e?.code === VIOLACAO_UNICA || e?.code === 'P2002' || e?.cause?.code === VIOLACAO_UNICA;
}

export interface ActorDoPedido {
  email: string;
}

/** Uma linha como o cliente a propõe. O preço é uma PROPOSTA. */
export interface LinhaProposta {
  productId: string;
  quantidade: number;
  /**
   * O que o cliente julga que custa. Chega do navegador, ou de um rascunho
   * escrito offline há uma hora — e em qualquer dos casos é uma proposta.
   * «Preço e dados recebidos do navegador são propostas; valores oficiais vêm do
   * catálogo e da política do servidor» (E14, respeitar 1).
   */
  precoPropostoMenor?: number;
  opcoes?: Record<string, unknown>;
}

export type ResultadoDoEnvio =
  | {
      ok: true;
      /** Verdadeiro quando este envio já tinha sido gravado e se devolveu o mesmo. */
      repetido: boolean;
      orderId: string;
      submissionId: string;
      aceites: number;
      rejeitadas: { productId: string; motivo: string }[];
    }
  | { ok: false; motivo: 'conflito_de_chave'; submissionIdExistente: string }
  | { ok: false; motivo: 'sem_linhas' | 'unidade_desconhecida' };

/** O resumo do que foi enviado, para distinguir repetição de colisão. */
export function resumoDoEnvio(linhas: readonly LinhaProposta[]): string {
  const normalizado = linhas
    .map((l) => ({
      productId: l.productId,
      quantidade: l.quantidade,
      opcoes: l.opcoes ?? null,
    }))
    .sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
  return createHash('sha256').update(JSON.stringify(normalizado), 'utf8').digest('hex');
}

/**
 * Envia uma ronda de linhas. **Idempotente pela base.**
 *
 * ── O caso é DEPOIS do commit ────────────────────────────────────────────
 *
 * Não é a rede falhar antes de gravar — isso é fácil e não perde nada. É gravar,
 * a resposta perder-se, e o cliente reenviar: o servidor já tem o pedido e o
 * cliente acha que não. Aqui o segundo envio bate no índice único do
 * `command_id`, e o que volta é **a mesma resposta** — não um «já existe» que
 * obriga quem chama a adivinhar o que aconteceu da primeira vez.
 *
 * E a mesma chave com corpo **diferente** não é repetição: é outra coisa a usar
 * o mesmo nome, e devolve conflito.
 *
 * ── Transacção própria, pela razão do E13 ────────────────────────────────
 *
 * Uma violação de restrição aborta a transacção no PostgreSQL. Apanhar o erro
 * dentro da transacção de outra pessoa deixava-a inutilizável a partir daí.
 */
export async function enviarPedido(
  prisma: PrismaClient,
  organizationId: string,
  dados: {
    commandId: string;
    locationId: string;
    canal: Canal;
    linhas: readonly LinhaProposta[];
    orderId?: string;
    tableSessionId?: string | null;
    actor: ActorDoPedido;
  },
): Promise<ResultadoDoEnvio> {
  if (dados.linhas.length === 0) return { ok: false, motivo: 'sem_linhas' };
  const resumo = resumoDoEnvio(dados.linhas);

  try {
    return await comEscopo(prisma, { organizationId }, async (db) => {
      const unidade = await db.location.findFirst({
        where: { id: dados.locationId, archivedAt: null },
        select: { id: true, moeda: true },
      });
      if (!unidade) return { ok: false as const, motivo: 'unidade_desconhecida' as const };

      const pedido = dados.orderId
        ? await db.order.findFirst({ where: { id: dados.orderId }, select: { id: true } })
        : null;

      const orderId = pedido?.id ?? (await db.order.create({
        data: {
          organizationId, locationId: unidade.id, canal: dados.canal,
          numero: await proximoNumero(db, unidade.id),
          estado: 'RASCUNHO', abertoPor: dados.actor.email,
          ...(dados.tableSessionId ? { tableSessionId: dados.tableSessionId } : {}),
        },
        select: { id: true },
      })).id;

      // O veredicto de cada linha, uma a uma e **sem tocar nas outras**. É o
      // aceite 3: o esgotado é rejeitado com o carrinho preservado, e limpar o
      // carrinho seria o defeito que faz a pessoa desistir.
      const veredictos = await Promise.all(
        dados.linhas.map((l) => julgarLinha(db, l, unidade.id, dados.canal)),
      );

      const submission = await db.orderSubmission.create({
        data: {
          organizationId, orderId, commandId: dados.commandId, payloadHash: resumo,
          criadoPor: dados.actor.email,
          resposta: {
            aceites: veredictos.filter((v) => v.estado === 'ACEITE').length,
            rejeitadas: veredictos
              .filter((v) => v.estado === 'REJEITADA')
              .map((v) => ({ productId: v.productId, motivo: v.motivo })),
          } as object,
        },
        select: { id: true },
      });

      await db.orderLine.createMany({
        data: veredictos.map((v) => ({
          organizationId, orderId, submissionId: submission.id,
          productId: v.productId, nome: v.nome, quantidade: v.quantidade,
          precoMenor: v.precoMenor, moeda: v.moeda,
          precoPropostoMenor: v.precoPropostoMenor,
          // `Prisma.DbNull` escreve NULL na coluna. `null` não compila e
        // `undefined` deixaria a coluna por escrever — que num `createMany`
        // é o mesmo que não dizer nada.
        opcoes: v.opcoes === null ? Prisma.DbNull : (v.opcoes as Prisma.InputJsonValue),
          estado: v.estado, motivoRejeicao: v.motivo,
          aceiteEm: v.estado === 'ACEITE' ? new Date() : null,
        })),
      });

      const aceites = veredictos.filter((v) => v.estado === 'ACEITE').length;
      if (aceites > 0) {
        await db.order.update({ where: { id: orderId }, data: { estado: 'ACEITE' } });
      }

      await db.orderEvent.create({
        data: {
          organizationId, orderId, accao: 'pedido.enviado',
          actorEmail: dados.actor.email,
          detalhe: { commandId: dados.commandId, aceites, linhas: dados.linhas.length } as object,
        },
      });

      // ── Pedido, evento e outbox na MESMA transacção ────────────────────
      //
      // É o que o E14 manda (entregar 3), e a razão é a mesma do E05: uma fila
      // fora da base aceita a tarefa e perde-a quando a transacção reverte — e
      // fica um aviso à cozinha de um pedido que nunca existiu. Ou o contrário,
      // que é pior: o pedido existe e a cozinha nunca soube.
      await db.outboxTask.create({
        data: {
          organizationId, tipo: 'pedido.entregar',
          payload: { orderId, submissionId: submission.id } as object,
        },
      });

      return {
        ok: true as const, repetido: false, orderId, submissionId: submission.id, aceites,
        rejeitadas: veredictos
          .filter((v) => v.estado === 'REJEITADA')
          .map((v) => ({ productId: v.productId ?? '', motivo: String(v.motivo) })),
      };
    });
  } catch (erro) {
    if (!eViolacaoUnica(erro)) throw erro;

    // O reenvio depois do commit. Lê-se o que já lá está e devolve-se o MESMO.
    return comEscopo(prisma, { organizationId }, async (db) => {
      const existente = await db.orderSubmission.findFirst({
        where: { commandId: dados.commandId },
        select: { id: true, orderId: true, payloadHash: true, resposta: true },
      });
      if (!existente) throw erro;

      if (existente.payloadHash !== resumo) {
        // Mesma chave, corpo diferente. Não é repetição — é outra coisa a usar o
        // mesmo nome, e devolvê-la como repetição escondia um pedido perdido.
        return {
          ok: false as const, motivo: 'conflito_de_chave' as const,
          submissionIdExistente: existente.id,
        };
      }

      const r = existente.resposta as { aceites?: number; rejeitadas?: unknown[] } | null;
      return {
        ok: true as const, repetido: true,
        orderId: existente.orderId, submissionId: existente.id,
        aceites: r?.aceites ?? 0,
        rejeitadas: (r?.rejeitadas ?? []) as { productId: string; motivo: string }[],
      };
    });
  }
}

interface Veredicto {
  productId: string;
  nome: string;
  quantidade: number;
  precoMenor: number | null;
  moeda: string | null;
  precoPropostoMenor: number | null;
  opcoes: Record<string, unknown> | null;
  estado: 'ACEITE' | 'REJEITADA';
  motivo: 'ESGOTADO' | 'SEM_PRECO' | 'PRECO_DIVERGENTE' | 'PRODUTO_DESCONHECIDO' | null;
}

/**
 * O veredicto de UMA linha — e onde a pergunta de dinheiro fica respondida.
 *
 * ── Um pedido escrito offline cobra a que preço? ──────────────────────────
 *
 * O `offline-e-fila-local.md` diz que **offline não faz pagamento nem reserva
 * confirmada**, e que isso é desenho e não limitação. O E14 traz entrega, e a
 * pergunta ficou por decidir: um pedido escrito offline e aceite mais tarde cobra
 * ao preço de quando foi escrito, ou de quando chegou?
 *
 * **Decisão: vale o preço do servidor no momento em que ele ACEITA** — e uma
 * divergência não é aplicada em silêncio: a linha é **rejeitada com o motivo
 * `PRECO_DIVERGENTE`**, com o carrinho preservado, para alguém decidir antes de
 * cobrar.
 *
 * As duas metades têm razões diferentes:
 *
 * - **O preço é do servidor** porque a alternativa é o cliente ditar o preço, e o
 *   E14 proíbe-o pelo nome: «preço e dados recebidos do navegador são propostas».
 *   Um rascunho offline é exactamente isso — uma proposta escrita no aparelho de
 *   alguém, possivelmente há uma hora. Aceitar o preço que ele traz é aceitar um
 *   preço que qualquer pessoa com o aparelho pode escrever.
 * - **A divergência não é aplicada em silêncio** porque cobrar €11 a quem pediu
 *   ao ver €9 é o defeito que a régua descreve noutro sítio: cumpre a letra e
 *   falha a pessoa. Rejeitar com o motivo dito devolve a decisão a quem está à
 *   mesa, que é quem a pode tomar.
 *
 * **O que NÃO fica decidido, e é declarado:** se o restaurante quer *honrar* o
 * preço antigo — uma cortesia comercial — isso é política do dono e não minha.
 * Fica como campo por existir em `OrderRules`, e não como um valor por omissão
 * escolhido por mim. Ausência não é política.
 *
 * E quando o cliente **não propõe preço** (o caso normal de quem pede online e
 * confia no que está na carta), não há divergência nenhuma: vale o do servidor.
 */
async function julgarLinha(
  db: ClienteComEscopo,
  linha: LinhaProposta,
  locationId: string,
  canal: Canal,
): Promise<Veredicto> {
  const base = {
    productId: linha.productId,
    quantidade: linha.quantidade,
    precoPropostoMenor: linha.precoPropostoMenor ?? null,
    opcoes: linha.opcoes ?? null,
  };

  const produto = await db.product.findFirst({
    where: { id: linha.productId }, select: { id: true, nome: true },
  });
  if (!produto) {
    return {
      ...base, nome: '(desconhecido)', precoMenor: null, moeda: null,
      estado: 'REJEITADA', motivo: 'PRODUTO_DESCONHECIDO',
    };
  }

  const disponibilidade = await estaDisponivel(db, produto.id, locationId);
  if (!disponibilidade.disponivel) {
    // Rejeitada, e **o resto do carrinho fica**. Limpar o carrinho ao rejeitar é
    // o defeito que faz a pessoa desistir — e passa qualquer teste que só
    // verifique a rejeição.
    return {
      ...base, nome: produto.nome, precoMenor: null, moeda: null,
      estado: 'REJEITADA', motivo: 'ESGOTADO',
    };
  }

  const preco = await precoEfectivo(db, produto.id, locationId, canal);
  if (!preco.ok) {
    return {
      ...base, nome: produto.nome, precoMenor: null, moeda: null,
      estado: 'REJEITADA', motivo: 'SEM_PRECO',
    };
  }

  // `resolverPreco` devolve `Dinheiro` — montante em unidade mínima e moeda
  // juntos, que é a decisão do E07 para o dinheiro não viajar meio despido.
  const oficial = preco.preco;

  if (
    linha.precoPropostoMenor !== undefined &&
    linha.precoPropostoMenor !== oficial.montanteMenor
  ) {
    return {
      ...base, nome: produto.nome,
      precoMenor: oficial.montanteMenor, moeda: oficial.moeda,
      estado: 'REJEITADA', motivo: 'PRECO_DIVERGENTE',
    };
  }

  return {
    ...base, nome: produto.nome,
    // O INSTANTÂNEO. A partir daqui esta linha não depende do catálogo.
    precoMenor: oficial.montanteMenor, moeda: oficial.moeda,
    estado: 'ACEITE', motivo: null,
  };
}

/** O número que a pessoa lê em voz alta. Sequencial por unidade e por dia. */
async function proximoNumero(db: ClienteComEscopo, locationId: string): Promise<string> {
  const hoje = new Date();
  const prefixo = `A${String(hoje.getUTCDate()).padStart(2, '0')}`;
  const ultimos = await db.order.findMany({
    where: { locationId, numero: { startsWith: prefixo } },
    select: { numero: true }, orderBy: { numero: 'desc' }, take: 1,
  });
  const ultimo = ultimos[0]?.numero ?? `${prefixo}000`;
  const n = Number(ultimo.slice(prefixo.length)) + 1;
  return `${prefixo}${String(n).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Aceite 2 — dois operadores sem apagar o trabalho um do outro
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Acrescenta linhas a um pedido. **Aditivo, e por isso não há corrida.**
 *
 * O padrão que perde trabalho em silêncio é o mais natural de escrever: ler o
 * pedido, juntar o item, gravar o pedido inteiro. A última escrita ganha e o item
 * do outro desaparece **sem erro nenhum** — ninguém vai procurar o que não deu
 * erro.
 *
 * Aqui nunca se grava o pedido inteiro: cada linha é uma linha nova. Dois
 * operadores a acrescentar ao mesmo tempo escrevem em sítios diferentes da
 * tabela, e os dois itens ficam. Não é cuidado ao escrever — é não haver por onde.
 */
export async function acrescentarLinhas(
  prisma: PrismaClient,
  organizationId: string,
  dados: {
    orderId: string;
    locationId: string;
    canal: Canal;
    linhas: readonly LinhaProposta[];
    actor: ActorDoPedido;
  },
): Promise<{ ok: true; acrescentadas: number } | { ok: false; motivo: 'pedido_desconhecido' }> {
  return comEscopo(prisma, { organizationId }, async (db) => {
    const pedido = await db.order.findFirst({
      where: { id: dados.orderId }, select: { id: true },
    });
    if (!pedido) return { ok: false as const, motivo: 'pedido_desconhecido' as const };

    const veredictos = await Promise.all(
      dados.linhas.map((l) => julgarLinha(db, l, dados.locationId, dados.canal)),
    );
    await db.orderLine.createMany({
      data: veredictos.map((v) => ({
        organizationId, orderId: pedido.id,
        productId: v.productId, nome: v.nome, quantidade: v.quantidade,
        precoMenor: v.precoMenor, moeda: v.moeda,
        precoPropostoMenor: v.precoPropostoMenor,
        // `Prisma.DbNull` escreve NULL na coluna. `null` não compila e
        // `undefined` deixaria a coluna por escrever — que num `createMany`
        // é o mesmo que não dizer nada.
        opcoes: v.opcoes === null ? Prisma.DbNull : (v.opcoes as Prisma.InputJsonValue),
        estado: v.estado, motivoRejeicao: v.motivo,
        aceiteEm: v.estado === 'ACEITE' ? new Date() : null,
      })),
    });
    await db.orderEvent.create({
      data: {
        organizationId, orderId: pedido.id, accao: 'pedido.linhas_acrescentadas',
        actorEmail: dados.actor.email, detalhe: { quantas: veredictos.length } as object,
      },
    });
    return { ok: true as const, acrescentadas: veredictos.length };
  });
}

export interface ConflitoRecuperavel {
  ok: false;
  motivo: 'conflito';
  /** A versão que está na base agora — para o ecrã continuar em vez de refazer. */
  versaoActual: number;
  /** O que mudou desde a versão que quem grava tinha. É isto que o torna recuperável. */
  mudou: { accao: string; quando: Date; porQuem: string }[];
  /** As linhas como estão agora. Sem elas, «recuperar» seria escrever de novo. */
  linhas: { id: string; nome: string; quantidade: number; estado: string }[];
}

/**
 * Grava alterações ao pedido com **concorrência optimista**.
 *
 * ── «Recuperável» é a palavra do aceite ──────────────────────────────────
 *
 * *«Um 409 que obriga a refazer o pedido do zero cumpre a letra e falha a
 * pessoa.»* Por isso o conflito não devolve só «não»: devolve a versão actual, o
 * que mudou entretanto e quem o mudou, e as linhas como estão. O ecrã tem com que
 * continuar.
 *
 * E repare no que esta função **não** faz: não acrescenta linhas. Acrescentar é
 * aditivo e não precisa de versão — pô-lo aqui obrigaria dois operadores a
 * disputar uma versão para escreverem em sítios diferentes, e transformava um
 * caminho sem corrida num com corrida.
 */
export async function guardarPedido(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    orderId: string;
    versaoEsperada: number;
    estado?: 'RASCUNHO' | 'ACEITE' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
    tableSessionId?: string | null;
    actor: ActorDoPedido;
  },
): Promise<{ ok: true; versao: number } | ConflitoRecuperavel | { ok: false; motivo: 'pedido_desconhecido' }> {
  const alteracoes: Record<string, unknown> = { versao: { increment: 1 } };
  if (dados.estado !== undefined) alteracoes.estado = dados.estado;
  if (dados.tableSessionId !== undefined) alteracoes.tableSessionId = dados.tableSessionId;

  // A versão entra na CONDIÇÃO, e não numa leitura antes. Ler a versão, comparar
  // em JavaScript e depois gravar é a mesma corrida com a janela mais estreita.
  const escrito = await db.order.updateMany({
    where: { id: dados.orderId, versao: dados.versaoEsperada },
    data: alteracoes,
  });

  if (escrito.count === 1) {
    await db.orderEvent.create({
      data: {
        organizationId, orderId: dados.orderId, accao: 'pedido.guardado',
        actorEmail: dados.actor.email, detalhe: { de: dados.versaoEsperada } as object,
      },
    });
    return { ok: true, versao: dados.versaoEsperada + 1 };
  }

  const actual = await db.order.findFirst({
    where: { id: dados.orderId }, select: { versao: true },
  });
  if (!actual) return { ok: false, motivo: 'pedido_desconhecido' };

  const [eventos, linhas] = await Promise.all([
    db.orderEvent.findMany({
      where: { orderId: dados.orderId },
      select: { accao: true, createdAt: true, actorEmail: true },
      orderBy: { createdAt: 'desc' }, take: 10,
    }),
    db.orderLine.findMany({
      where: { orderId: dados.orderId, estado: { not: 'CANCELADA' } },
      select: { id: true, nome: true, quantidade: true, estado: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return {
    ok: false, motivo: 'conflito', versaoActual: actual.versao,
    mudou: eventos.map((e) => ({ accao: e.accao, quando: e.createdAt, porQuem: e.actorEmail })),
    linhas: linhas.map((l) => ({
      id: l.id, nome: l.nome, quantidade: l.quantidade, estado: String(l.estado),
    })),
  };
}

/** Cancela uma linha. Muda o ESTADO — nunca o preço, que o gatilho recusa. */
export async function cancelarLinha(
  db: ClienteComEscopo,
  organizationId: string,
  linhaId: string,
  actor: ActorDoPedido,
): Promise<{ ok: true } | { ok: false; motivo: 'linha_desconhecida' }> {
  const linha = await db.orderLine.findFirst({
    where: { id: linhaId }, select: { id: true, orderId: true },
  });
  if (!linha) return { ok: false, motivo: 'linha_desconhecida' };

  await db.orderLine.update({ where: { id: linhaId }, data: { estado: 'CANCELADA' } });
  await db.orderEvent.create({
    data: {
      organizationId, orderId: linha.orderId, accao: 'linha.cancelada',
      actorEmail: actor.email, detalhe: { linhaId } as object,
    },
  });
  return { ok: true };
}

// ── Leituras ───────────────────────────────────────────────────────────────

/** A consulta por `command_id` (E14, entregar 4): «já chegou o meu pedido?». */
export async function pedidoPorComando(db: ClienteComEscopo, commandId: string) {
  return db.orderSubmission.findFirst({
    where: { commandId },
    select: { id: true, orderId: true, resposta: true, createdAt: true },
  });
}

export function listarPedidos(
  db: ClienteComEscopo,
  locationId: string,
  filtro: { estado?: 'RASCUNHO' | 'ACEITE' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO' } = {},
) {
  return db.order.findMany({
    where: { locationId, ...(filtro.estado ? { estado: filtro.estado } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      linhas: {
        select: {
          id: true, nome: true, quantidade: true, precoMenor: true, moeda: true,
          estado: true, motivoRejeicao: true,
          // ── O preço PROPOSTO viaja com a linha, e o E15 precisa dele ────
          //
          // A régua do E15: *«se a divergência só aparecer num log, o E14 foi
          // bem implementado e mal entregue»*. A linha rejeitada por preço tem
          // de mostrar os DOIS números lado a lado, e com um só deles quem está
          // na mesa não consegue decidir nada — que é exactamente o que se lhe
          // está a pedir. Faltava aqui: a coluna existia desde o E14 e esta
          // leitura não a trazia.
          precoPropostoMenor: true,
          linhaPaiId: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function obterPedido(db: ClienteComEscopo, orderId: string) {
  return db.order.findFirst({
    where: { id: orderId },
    include: {
      linhas: { orderBy: { createdAt: 'asc' } },
      envios: { select: { id: true, commandId: true, createdAt: true, criadoPor: true },
                orderBy: { createdAt: 'asc' } },
    },
  });
}

export function historicoDoPedido(db: ClienteComEscopo, orderId: string) {
  return db.orderEvent.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
}

/**
 * O total de um pedido, somado das linhas ACEITES.
 *
 * ── Não lê o catálogo, e é isso que o torna correcto ──────────────────────
 *
 * A régua reprova «preço lido no momento de fechar a conta». Este total é a soma
 * dos instantâneos: a conta de quem está sentado não muda porque a cozinha
 * actualizou a carta.
 *
 * E devolve `null` quando não há linhas aceites — não zero. Zero é um total; a
 * ausência de linhas não é um total de zero, é a ausência de conta.
 */
export function totalDoPedido(
  linhas: readonly {
    estado: string; precoMenor: number | null; quantidade: number; moeda: string | null;
    linhaPaiId?: string | null;
  }[],
): { montanteMenor: number; moeda: string } | null {
  // ── Um componente de combo NÃO entra na soma ───────────────────────────
  //
  // «Não some o preço do combo e de seus componentes duas vezes» (E14, entregar
  // 7). O componente existe para a cozinha saber o que fazer; o preço é do combo.
  // A base já lhe recusa preço — este filtro é a segunda porta, e as duas falham
  // por motivos diferentes, que é o que faz uma redundância valer alguma coisa.
  const aceites = linhas.filter(
    (l) => l.estado === 'ACEITE' && l.precoMenor !== null && !l.linhaPaiId);
  if (aceites.length === 0) return null;
  const moeda = aceites[0]!.moeda;
  if (!moeda) return null;
  // Moedas diferentes no mesmo pedido não se somam. Se acontecer, é defeito de
  // configuração e devolver um número escondia-o.
  if (aceites.some((l) => l.moeda !== moeda)) return null;
  return {
    montanteMenor: aceites.reduce((t, l) => t + l.precoMenor! * l.quantidade, 0),
    moeda,
  };
}
