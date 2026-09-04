import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  acrescentarLinhas, cancelarLinha, enviarPedido, guardarPedido, pedidoPorComando,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../src/site-do-pedido.ts';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As acções do motor de pedidos (E14).
 *
 * ── O `command_id` vem do CLIENTE, e não daqui ────────────────────────────
 *
 * O contrato do E00 é explícito: *«o `command_id` nasce no cliente, antes do
 * envio, e sobrevive ao recarregamento»*. Se fosse gerado aqui, cada retentativa
 * traria uma chave nova — e a idempotência deixava de existir exactamente no caso
 * que ela serve, que é a resposta perder-se depois do commit.
 *
 * O formulário traz um campo escondido com a chave. **Só quando ele falta** é que
 * se gera uma, e isso está escrito à frente do `??` para não passar por
 * comportamento normal: é o caso de alguém chamar a rota à mão.
 */
export async function GET(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  // A consulta por `command_id` (E14, entregar 4): é como o cliente pergunta se o
  // que ele enviou chegou, em vez de reenviar às cegas.
  const commandId = new URL(pedido.url).searchParams.get('commandId');
  if (!commandId) return NextResponse.json({ erro: 'sem_command_id' }, { status: 400 });

  const achado = await comEscopoDoPedido(sessao, (db) => pedidoPorComando(db, commandId));
  if (!achado) return NextResponse.json({ conhecido: false }, { status: 404 });
  return NextResponse.json({ conhecido: true, ...achado });
}

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const organizationId = sessao.contexto.organizationId;
  const actor = { email: sessao.actor.email };
  const prisma = obterBase();

  const linhasDoFormulario = () => {
    const produtos = dados.getAll('productId').filter((p): p is string => typeof p === 'string');
    const quantidades = dados.getAll('quantidade').map((q) => Number(q) || 1);
    // ── O preço PROPOSTO, quando o cliente trouxe um ───────────────────────
    //
    // É o que um rascunho escrito offline guardou de quando foi escrito, e é
    // contra ele que o servidor confere a carta do momento em que aceita. Vem
    // como lista paralela às outras duas e casa-se por posição.
    //
    // **Vazio é ausência, não é zero.** Um `Number('')` dá 0, e zero aqui era um
    // cliente a propor que o prato é grátis — que o servidor então rejeitaria por
    // divergência, sobre uma proposta que ninguém fez. `undefined` faz o motor
    // não comparar preço nenhum, que é o comportamento certo de quem não propôs.
    const propostos = dados.getAll('precoPropostoMenor').map((v) => {
      const bruto = typeof v === 'string' ? v.trim() : '';
      if (bruto === '') return undefined;
      const n = Number(bruto);
      return Number.isInteger(n) ? n : undefined;
    });
    return produtos.map((productId, i) => ({
      productId,
      quantidade: quantidades[i] ?? 1,
      ...(propostos[i] === undefined ? {} : { precoPropostoMenor: propostos[i] }),
    }));
  };

  if (accao === 'enviar' || accao === 'acrescentar') {
    const linhas = linhasDoFormulario();
    if (linhas.length === 0) return voltarPara(`${base}/novo`, { erro: 'sem_linhas' });

    if (accao === 'acrescentar') {
      const orderId = texto(dados, 'orderId') ?? '';
      const r = await acrescentarLinhas(prisma, organizationId, {
        orderId, locationId: unidade.id, canal: 'SALA', linhas, actor,
      });
      if (!r.ok) return voltarPara(base, { erro: r.motivo });
      return voltarPara(`${base}/${orderId}`, { acrescentadas: String(r.acrescentadas) });
    }

    const r = await enviarPedido(prisma, organizationId, {
      // A chave do FORMULÁRIO. O `??` só existe para quem chame a rota à mão.
      commandId: texto(dados, 'commandId') ?? randomUUID(),
      locationId: unidade.id,
      canal: (texto(dados, 'canal') ?? 'SALA') as 'SALA',
      linhas,
      ...(texto(dados, 'orderId') ? { orderId: texto(dados, 'orderId')! } : {}),
      ...(texto(dados, 'tableSessionId') ? { tableSessionId: texto(dados, 'tableSessionId')! } : {}),
      actor,
    });
    if (!r.ok) return voltarPara(`${base}/novo`, { erro: r.motivo });
    return voltarPara(`${base}/${r.orderId}`, {
      ...(r.repetido ? { repetido: '1' } : { enviado: '1' }),
      ...(r.rejeitadas.length > 0 ? { rejeitadas: String(r.rejeitadas.length) } : {}),
    });
  }

  if (accao === 'guardar') {
    const orderId = texto(dados, 'orderId') ?? '';
    const versao = Number(texto(dados, 'versao') ?? '0');
    const r = await comEscopoDoPedido(sessao, (db) => guardarPedido(db, organizationId, {
      orderId, versaoEsperada: versao,
      ...(texto(dados, 'estado') ? { estado: texto(dados, 'estado') as 'ACEITE' } : {}),
      actor,
    }));
    if (r.ok) return voltarPara(`${base}/${orderId}`, { guardado: '1' });
    if (r.motivo === 'conflito') {
      // O conflito leva a pessoa para o ecrã de edição, que mostra o que mudou.
      // Um 409 seco obrigava a refazer do zero — cumpria a letra e falhava a
      // pessoa, que é o que a régua reprova pelo nome.
      return voltarPara(`${base}/${orderId}/editar`, { conflito: String(r.versaoActual) });
    }
    return voltarPara(base, { erro: r.motivo });
  }

  if (accao === 'cancelar_linha') {
    const linhaId = texto(dados, 'linhaId') ?? '';
    const orderId = texto(dados, 'orderId') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => cancelarLinha(db, organizationId, linhaId, actor));
    if (!r.ok) return voltarPara(`${base}/${orderId}`, { erro: r.motivo });
    return voltarPara(`${base}/${orderId}`, { cancelada: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
