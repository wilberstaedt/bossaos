import { NextResponse } from 'next/server';
import {
  abrirCaixa, abrirConta, ajustar, anular, comContaTrancada, confirmarPagamento, contar,
  contasAbertas, devolver, entrarPagamentoEmDinheiro, fecharCaixa, fecharConta,
  listarUnidades, somasDaConta,
  corrigirMovimento, guardarConectorDePagamento, guardarConectorFiscal,
  juntarLinhasDoPedido, movimentar,
  obterPrisma, reabrirCaixa,
  reconciliar, reverterAjuste, tentarPagar, transferirLinha,
} from '@bossaos/db';
import { corpoDaResposta, deTextoParaMenor, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do TPV, das contas e da caixa.
 *
 * ── O dinheiro entra como TEXTO e sai como inteiro ────────────────────────
 *
 * `deTextoParaMenor` é a única conversão, e devolve `null` no que não é dinheiro
 * em vez de adivinhar. Não há aqui `Number()` sobre nada com nome de dinheiro:
 * `Number('8.07') * 100` dá `806.9999999999999`, e o `Math.round` disfarça-o até
 * ao valor onde deixa de disfarçar.
 *
 * ── E a cobrança passa pela conta TRANCADA ────────────────────────────────
 *
 * Duas caixas na última parcela têm de dar uma cobrança e uma **recusa de
 * negócio**. Sem o cadeado — ou com o retrato tirado antes dele — a segunda
 * recebia um `40001`, que diz «tente outra vez»; e quem tenta outra vez numa sala
 * cheia gera uma chave nova, que é o caminho por onde se cobra duas vezes.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationId = texto(dados, 'locationId') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  // A unidade resolve-se DENTRO do escopo: um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = unidades.find((u: { id: string }) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const moeda = 'EUR';
  const dinheiro = (campo: string) => deTextoParaMenor(texto(dados, campo) ?? '', moeda);
  const paraTpv = () => `/${idioma}/pos/${locationId}`;
  const paraConta = (id: string) => `${paraTpv()}/conta/${id}`;
  const paraCaixa = (id: string) => `${paraTpv()}/caixa/${id}`;

  try {
    if (accao === 'abrir_conta') {
      const valor = dinheiro('valor');
      const nome = texto(dados, 'nome') ?? '';
      if (valor === null || !nome) return voltarPara(`${paraTpv()}/balcao`, { erro: 'valor' });
      const { id } = await comEscopoDoPedido(sessao, async (db) => {
        const conta = await abrirConta(db, {
          organizationId, locationId: unidade.id, numero: `${Date.now()}`, moeda,
        });
        await db.billLine.create({
          data: {
            organizationId, billId: conta.id, nome,
            quantidade: 1, unitarioMenor: valor,
          },
        });
        return conta;
      });
      return voltarPara(paraConta(id), { ok: 'conta' });
    }

    if (accao === 'pagar_dinheiro') {
      const billId = texto(dados, 'billId') ?? '';
      const cobrar = dinheiro('cobrar');
      const recebido = dinheiro('recebido');
      if (cobrar === null || recebido === null) {
        return voltarPara(`${paraConta(billId)}/dinheiro`, { erro: 'valor' });
      }
      const prisma = obterPrisma(process.env.DATABASE_URL ?? '');
      await comContaTrancada(prisma, { organizationId, userId: actor.id }, billId, async (db) => {
        const t = await tentarPagar(db, {
          billId, meio: 'DINHEIRO', montanteMenor: cobrar,
          chaveIdempotente: `tpv:${billId}:${Date.now()}`,
        });
        const pagamento = await confirmarPagamento(db, t.id, recebido);
        // A gaveta: só se houver caixa aberta. Sem caixa, o pagamento existe na
        // mesma — o dinheiro entrou — e a caixa apanha-o quando abrir. Fingir
        // uma caixa aqui era inventar um sítio onde o dinheiro esteve.
        const caixa = await db.cashRegister.findFirst({
          where: { locationId: unidade.id }, orderBy: { criadaEm: 'desc' },
          select: { id: true },
        });
        if (caixa) {
          const fechada = await db.cashRegisterEvent.findFirst({
            where: { registerId: caixa.id },
            orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], select: { tipo: true },
          });
          if (fechada?.tipo !== 'FECHO') {
            await entrarPagamentoEmDinheiro(db, {
              registerId: caixa.id, paymentId: pagamento.id, actor: actor.id,
            });
          }
        }
        return pagamento;
      });
      return voltarPara(paraConta(billId), { ok: 'pago' });
    }

    if (accao === 'juntar_pedido') {
      // «Suporte balcão, conta por mesa e consolidação controlada»: as linhas do
      // pedido passam para a conta com o preço que valem AGORA. Ler o preço mais
      // tarde dava uma conta cujo valor muda quando alguém edita a carta.
      const billId = texto(dados, 'billId') ?? '';
      const orderId = texto(dados, 'orderId') ?? '';
      const postas = await comEscopoDoPedido(sessao,
        (db) => juntarLinhasDoPedido(db, billId, orderId));
      return voltarPara(paraConta(billId), { ok: `linhas:${postas}` });
    }

    if (accao === 'reconciliar') {
      // A ÚNICA porta que tira uma conta do estado indeterminado, e é um ACTO
      // com resultado dito — nunca o efeito lateral de alguém tentar pagar
      // outra vez. Essa é a diferença entre reconciliar e cobrar duas vezes.
      const billId = texto(dados, 'billId') ?? '';
      const attemptId = texto(dados, 'attemptId') ?? '';
      const bruto = texto(dados, 'resultado');
      const resultado = bruto === 'CONFIRMADA' ? 'CONFIRMADA'
        : bruto === 'CANCELADA' ? 'CANCELADA' : 'FALHOU';
      await comEscopoDoPedido(sessao, (db) => reconciliar(db, attemptId, resultado));
      return voltarPara(paraConta(billId), { ok: 'reconciliada' });
    }

    if (accao === 'corrigir_movimento') {
      const registerId = texto(dados, 'registerId') ?? '';
      const valor = dinheiro('valor');
      const motivo = texto(dados, 'motivo') ?? '';
      if (valor === null || motivo.trim().length < 3) {
        return voltarPara(`${paraCaixa(registerId)}/movimento`, { erro: 'correccao' });
      }
      await comEscopoDoPedido(sessao, (db) => corrigirMovimento(db, {
        movimentoId: texto(dados, 'movimentoId') ?? '',
        montanteMenor: valor, motivo, actor: actor.id,
      }));
      return voltarPara(`${paraCaixa(registerId)}/movimento`, { ok: 'corrigido' });
    }

    if (accao === 'guardar_conector_pagamento') {
      // A titularidade, e nada mais. Não há aqui campo de chave secreta porque
      // não há coluna: o segredo vive no ambiente do servidor.
      await comEscopoDoPedido(sessao, (db) => guardarConectorDePagamento(db, {
        organizationId, locationId: unidade.id,
        ...(texto(dados, 'provedor') ? { provedor: texto(dados, 'provedor')! } : {}),
        ...(texto(dados, 'merchantId') ? { merchantId: texto(dados, 'merchantId')! } : {}),
        activo: texto(dados, 'activo') === 'on',
      }));
      return voltarPara(`${paraTpv()}/pagamentos`, { ok: 'conector' });
    }

    if (accao === 'cobrar_cartao') {
      // Abre a TENTATIVA e mais nada. Quem confirma é o webhook, com assinatura
      // verificada — «retorno do navegador não prova pagamento». Este caminho
      // nunca cria um `Payment`.
      const billId = texto(dados, 'billId') ?? '';
      const prisma = obterPrisma(process.env.DATABASE_URL ?? '');
      await comContaTrancada(prisma, { organizationId, userId: actor.id }, billId, async (db) => {
        const { devidoMenor, pagoMenor } = await somasDaConta(db, billId);
        return tentarPagar(db, {
          billId, meio: 'CARTAO', montanteMenor: devidoMenor - pagoMenor,
          chaveIdempotente: `tpv:cartao:${billId}:${Date.now()}`,
        });
      });
      return voltarPara(`${paraConta(billId)}/cartao`, { ok: 'tentativa' });
    }

    if (accao === 'guardar_conector_fiscal') {
      // Provedor, NIF e ambiente. NÃO há campo de credencial, porque não há
      // coluna: o segredo vive no ambiente do servidor.
      await comEscopoDoPedido(sessao, (db) => guardarConectorFiscal(db, {
        organizationId, locationId: unidade.id,
        ...(texto(dados, 'provedor') ? { provedor: texto(dados, 'provedor')! } : {}),
        ...(texto(dados, 'nif') ? { nif: texto(dados, 'nif')! } : {}),
        ...(texto(dados, 'ambiente') ? { ambiente: texto(dados, 'ambiente')! } : {}),
        activo: texto(dados, 'activo') === 'on',
      }));
      return voltarPara(`${paraTpv()}/fiscal/configuracao`, { ok: 'fiscal' });
    }

    if (accao === 'ajustar') {
      const billId = texto(dados, 'billId') ?? '';
      const valor = dinheiro('valor');
      const motivo = texto(dados, 'motivo') ?? '';
      const tipo = texto(dados, 'tipo') === 'CORTESIA' ? 'CORTESIA' : 'DESCONTO';
      if (valor === null || motivo.trim().length < 3) {
        return voltarPara(paraConta(billId), { erro: 'ajuste' });
      }
      await comEscopoDoPedido(sessao, (db) => ajustar(db, {
        billId, tipo, montanteMenor: valor, motivo, autorizadoPor: actor.id,
      }));
      return voltarPara(paraConta(billId), { ok: 'ajuste' });
    }

    if (accao === 'reverter_ajuste') {
      const billId = texto(dados, 'billId') ?? '';
      const ajusteId = texto(dados, 'ajusteId') ?? '';
      const motivo = texto(dados, 'motivo') ?? '';
      if (motivo.trim().length < 3) return voltarPara(`${paraConta(billId)}/anular`, { erro: 'motivo' });
      await comEscopoDoPedido(sessao, (db) => reverterAjuste(db, {
        ajusteId, motivo, autorizadoPor: actor.id,
      }));
      return voltarPara(`${paraConta(billId)}/anular`, { ok: 'revertido' });
    }

    if (accao === 'anular') {
      const billId = texto(dados, 'billId') ?? '';
      await comEscopoDoPedido(sessao, (db) => anular(db, texto(dados, 'attemptId') ?? ''));
      return voltarPara(`${paraConta(billId)}/anular`, { ok: 'anulado' });
    }

    if (accao === 'devolver') {
      const billId = texto(dados, 'billId') ?? '';
      const paymentId = texto(dados, 'paymentId') ?? '';
      const valor = dinheiro('valor');
      const motivo = texto(dados, 'motivo') ?? '';
      if (valor === null || motivo.trim().length < 3) {
        return voltarPara(`${paraConta(billId)}/anular`, { erro: 'devolucao' });
      }
      await comEscopoDoPedido(sessao, (db) => devolver(db, {
        paymentId, montanteMenor: valor, motivo, autorizadoPor: actor.id,
        chaveIdempotente: `tpv:refund:${paymentId}:${valor}:${motivo}`,
      }));
      return voltarPara(`${paraConta(billId)}/anular`, { ok: 'devolvido' });
    }

    if (accao === 'transferir' || accao === 'juntar_contas') {
      const paraBillId = texto(dados, 'paraBillId') ?? '';
      if (accao === 'transferir') {
        await comEscopoDoPedido(sessao, (db) =>
          transferirLinha(db, texto(dados, 'billLineId') ?? '', paraBillId));
        return voltarPara(`/${idioma}/staff/${locationId}/transferir`, { ok: 'movido' });
      }
      // Juntar é mover TODAS as linhas — e não somar duas contas numa terceira.
      const deBillId = texto(dados, 'deBillId') ?? '';
      await comEscopoDoPedido(sessao, async (db) => {
        const linhas = await db.billLine.findMany({
          where: { billId: deBillId }, select: { id: true },
        });
        for (const l of linhas) await transferirLinha(db, l.id, paraBillId);
      });
      return voltarPara(`/${idioma}/app/${orgSlug}/${unidade.slug}/floor/contas`, { ok: 'juntas' });
    }

    if (accao === 'fechar_conta') {
      await comEscopoDoPedido(sessao, (db) =>
        fecharConta(db, texto(dados, 'billId') ?? '', actor.id));
      return voltarPara(`/${idioma}/staff/${locationId}/fechar-mesa`, { ok: 'fechada' });
    }

    if (accao === 'abrir_caixa') {
      const fundo = dinheiro('fundo');
      const nome = texto(dados, 'nome') ?? '';
      if (fundo === null || !nome) return voltarPara(`${paraTpv()}/caixa/abrir`, { erro: 'fundo' });
      const { id } = await comEscopoDoPedido(sessao, (db) => abrirCaixa(db, {
        organizationId, locationId: unidade.id, nome, moeda, fundoMenor: fundo, actor: actor.id,
      }));
      return voltarPara(`${paraCaixa(id)}/contagem`, { ok: 'caixa' });
    }

    if (accao === 'movimentar') {
      const registerId = texto(dados, 'registerId') ?? '';
      const valor = dinheiro('valor');
      const motivo = texto(dados, 'motivo') ?? '';
      const tipo = texto(dados, 'tipo') === 'SAIDA' ? 'SAIDA' : 'ENTRADA';
      if (valor === null || motivo.trim().length < 3) {
        return voltarPara(`${paraCaixa(registerId)}/movimento`, { erro: 'movimento' });
      }
      await comEscopoDoPedido(sessao, (db) => movimentar(db, {
        registerId, tipo, montanteMenor: valor, motivo, actor: actor.id,
      }));
      return voltarPara(`${paraCaixa(registerId)}/movimento`, { ok: 'movimento' });
    }

    if (accao === 'contar') {
      const registerId = texto(dados, 'registerId') ?? '';
      const contado = dinheiro('contado');
      if (contado === null) return voltarPara(`${paraCaixa(registerId)}/contagem`, { erro: 'contado' });
      await comEscopoDoPedido(sessao, (db) => contar(db, {
        registerId, contadoMenor: contado, actor: actor.id,
      }));
      return voltarPara(`${paraCaixa(registerId)}/contagem`, { ok: 'contado' });
    }

    if (accao === 'fechar_caixa') {
      const registerId = texto(dados, 'registerId') ?? '';
      const motivo = texto(dados, 'motivo');
      await comEscopoDoPedido(sessao, (db) => fecharCaixa(db, {
        registerId, actor: actor.id,
        // A autorização só vai quando o ecrã a pediu — e o ecrã só a pede quando
        // há diferença. Mandá-la sempre era assinar por omissão.
        ...(texto(dados, 'autoriza') ? { autorizadoPor: actor.id } : {}),
        ...(motivo ? { motivo } : {}),
      }));
      return voltarPara(`${paraCaixa(registerId)}/fecho`, { ok: 'fechada' });
    }

    if (accao === 'reabrir_caixa') {
      const registerId = texto(dados, 'registerId') ?? '';
      const motivo = texto(dados, 'motivo') ?? '';
      if (motivo.trim().length < 3) return voltarPara(`${paraCaixa(registerId)}/fecho`, { erro: 'motivo' });
      await comEscopoDoPedido(sessao, (db) => reabrirCaixa(db, {
        registerId, actor: actor.id, motivo,
      }));
      return voltarPara(`${paraCaixa(registerId)}/fecho`, { ok: 'reaberta' });
    }

    if (accao === 'listar') {
      const contas = await comEscopoDoPedido(sessao, (db) => contasAbertas(db, unidade.id));
      return NextResponse.json({ contas });
    }
  } catch (e) {
    // A recusa de negócio volta para o ecrã com o nome dela. Um 500 aqui dizia
    // «alguma coisa correu mal» a quem precisa de saber O QUÊ.
    const motivo = e instanceof Error && /^[A-Z_]+:/.test(e.message)
      ? e.message.split(':')[0] : 'erro';
    return voltarPara(paraTpv(), { erro: motivo ?? 'erro' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
