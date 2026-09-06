import type { ClienteComEscopo } from './escopo.ts';

/**
 * Kiosk — o motor do E31.
 *
 * Contrato: `docs/architecture/kiosk-e-impressao.md`.
 *
 * ── O aceite mais duro da etapa, e onde ele se resolve ─────────────────────
 *
 * Dois clientes seguidos não partilham carrinho, dados nem sessão de pagamento.
 * E, ao lado, uma exigência que puxa ao contrário: apagar os dados da pessoa
 * sem perder a confirmação do pedido.
 *
 * **Quem tentar resolver isto no botão de reiniciar falha numa das duas.** A
 * solução não é apagar com esperteza no fim; é **não juntar no princípio** — e
 * por isso a `kiosk_sessions` não tem uma única coluna com dados da pessoa. O
 * que este ficheiro não pode limpar é o que ele nunca guardou.
 *
 * ── E as três saídas são UMA função ────────────────────────────────────────
 *
 * Concluído, inactividade e reinício à mão terminam pela `terminarSessao`. Não
 * há três caminhos a fazer o mesmo três vezes, porque três caminhos é como um
 * deles acaba a limpar menos — e o que limpa menos é o que deixa o carrinho do
 * cliente anterior no ecrã do seguinte.
 */

export type MotivoDeSaida = 'CONCLUIDA' | 'ABANDONADA' | 'REINICIADA';

export type RecusaDeKiosk =
  | 'DISPOSITIVO_DESCONHECIDO'
  | 'DISPOSITIVO_NAO_APROVADO'
  | 'SESSAO_DESCONHECIDA'
  | 'SESSAO_JA_TERMINADA'
  | 'COBRANCA_POR_RESOLVER'
  | 'SEM_LIGACAO';

export class RecusaDoKiosk extends Error {
  readonly motivo: RecusaDeKiosk;

  constructor(motivo: RecusaDeKiosk, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoKiosk';
    this.motivo = motivo;
  }
}

/**
 * A sessão viva de um aparelho, se houver.
 *
 * Devolve `null` e não uma sessão vazia: **não haver sessão é um facto**, e uma
 * sessão vazia inventada aqui seria indistinguível de uma sessão a meio com o
 * carrinho por encher.
 */
export async function sessaoViva(db: ClienteComEscopo, deviceId: string) {
  return db.kioskSession.findFirst({
    where: { deviceId, estado: 'ABERTA' },
    include: { pedido: { include: { linhas: true } }, conta: true },
  });
}

/**
 * Abre a sessão de um cliente novo.
 *
 * ── Porque é que isto FECHA a anterior antes de abrir ──────────────────────
 *
 * O índice único parcial da base só deixa uma sessão aberta por aparelho. Sem
 * este fecho, o segundo cliente batia numa violação de restrição e via um erro
 * — e a pessoa a seguir na fila não tem culpa de quem se foi embora sem tocar
 * no ecrã. Fechar a anterior é o comportamento certo **e** o que a base exige;
 * mas repare-se que quem garante continua a ser ela, não esta linha.
 *
 * A anterior fecha como `ABANDONADA`, que é o que de facto aconteceu.
 */
export async function abrirSessaoDeKiosk(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
  deviceId: string,
  idioma: string,
) {
  const aparelho = await db.device.findFirst({ where: { id: deviceId, locationId } });
  if (!aparelho) {
    throw new RecusaDoKiosk('DISPOSITIVO_DESCONHECIDO', deviceId);
  }
  if (aparelho.estado !== 'ACTIVO') {
    throw new RecusaDoKiosk('DISPOSITIVO_NAO_APROVADO',
      `o aparelho está ${aparelho.estado} — um kiosk que não está ACTIVO não recebe clientes`);
  }

  const anterior = await sessaoViva(db, deviceId);
  if (anterior) {
    await terminarSessao(db, anterior.id, 'ABANDONADA',
      'o cliente anterior deixou o ecrã a meio');
  }

  return db.kioskSession.create({
    data: { organizationId, locationId, deviceId, idioma, estado: 'ABERTA' },
  });
}

/**
 * O ÚNICO caminho de saída — para os três motivos.
 *
 * ── O que esta função deliberadamente não faz ──────────────────────────────
 *
 * Não apaga dados da pessoa, porque não há dados da pessoa para apagar. Não
 * «limpa o carrinho», porque o carrinho é o `orderId` desta sessão e a sessão
 * seguinte tem um `id` diferente e um `order_id` que a base obriga a ser único.
 *
 * O que ela faz é fechar. **A limpeza é uma consequência da estrutura, não uma
 * lista de coisas a esquecer.** Uma lista é o que se pode escrever incompleta.
 */
export async function terminarSessao(
  db: ClienteComEscopo,
  sessaoId: string,
  motivo: MotivoDeSaida,
  detalhe: string,
) {
  const sessao = await db.kioskSession.findFirst({ where: { id: sessaoId } });
  if (!sessao) throw new RecusaDoKiosk('SESSAO_DESCONHECIDA', sessaoId);
  if (sessao.estado !== 'ABERTA') {
    throw new RecusaDoKiosk('SESSAO_JA_TERMINADA',
      `já estava ${sessao.estado} — fechar duas vezes escondia a primeira razão`);
  }

  try {
    return await db.kioskSession.update({
      where: { id: sessaoId },
      data: { estado: motivo, terminadaEm: new Date(), terminadaMotivo: detalhe },
    });
  } catch (erro) {
    // ── O reiniciar não abandona uma cobrança indeterminada ────────────────
    //
    // Quem recusa é o gatilho da base, e é ele que tem de recusar: uma
    // verificação aqui em cima era uma corrida entre ler e escrever, e o que
    // está do outro lado é dinheiro que pode ter saído da conta de alguém que
    // já se foi embora.
    //
    // Isto traduz a recusa; não a decide.
    if (String(erro).includes('sessao_com_cobranca_indeterminada')) {
      throw new RecusaDoKiosk('COBRANCA_POR_RESOLVER',
        'há uma cobrança por resolver nesta sessão, e fechar o ecrã não a resolve');
    }
    throw erro;
  }
}

/**
 * A pessoa fica **ligada** ao pedido, e nunca copiada para dentro dele.
 *
 * O prazo vem de fora porque é finalidade que o decide (contrato do E27), e não
 * o kiosk. Um prazo escolhido aqui era o produto a inventar retenção.
 */
export async function ligarPessoaAoPedido(
  db: ClienteComEscopo,
  organizationId: string,
  orderId: string,
  customerId: string,
  finalidade: 'SERVICO' | 'CAMPANHA',
  expiraEm: Date,
) {
  return db.orderContact.create({
    data: { organizationId, orderId, customerId, finalidade, expiraEm },
  });
}

/**
 * Apaga a pessoa. **O pedido fica.**
 *
 * Não há aqui nenhum cuidado a proteger o pedido — a ligação cai por
 * `ON DELETE CASCADE` e o pedido nem sabe que ela existia. É a diferença entre
 * uma garantia e uma boa intenção: se isto fosse uma coluna em `orders`,
 * nenhuma quantidade de cuidado nesta função salvava o pedido.
 */
export async function apagarPessoa(db: ClienteComEscopo, customerId: string) {
  await db.customer.delete({ where: { id: customerId } });
}

/**
 * O kiosk está utilizável? (KIOSK-007)
 *
 * Três razões para pausar, e a terceira é a que importa: **uma cobrança
 * indeterminada pausa o terminal.** Parar a máquina é caro; a alternativa é o
 * produto decidir sozinho sobre dinheiro que não consegue ver, com a pessoa já
 * fora da loja e ninguém no balcão para reclamar.
 */
export async function estadoDoKiosk(
  db: ClienteComEscopo,
  deviceId: string,
): Promise<
  | { readonly disponivel: true }
  | { readonly disponivel: false; readonly razao: 'NAO_APROVADO' | 'COBRANCA_POR_RESOLVER' }
> {
  const aparelho = await db.device.findFirst({ where: { id: deviceId } });
  if (!aparelho || aparelho.estado !== 'ACTIVO') {
    return { disponivel: false, razao: 'NAO_APROVADO' };
  }

  const sessao = await sessaoViva(db, deviceId);
  if (sessao?.billId) {
    const porResolver = await db.paymentAttempt.count({
      where: { billId: sessao.billId, estado: 'INDETERMINADA' },
    });
    if (porResolver > 0) {
      return { disponivel: false, razao: 'COBRANCA_POR_RESOLVER' };
    }
  }

  return { disponivel: true };
}
