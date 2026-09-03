import { NextResponse } from 'next/server';
import { lerPerfil, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ORG-015 · registar um pedido de cancelamento.
 *
 * ── O que isto FAZ, e o que não faz ────────────────────────────────────────
 *
 * Não cancela. O E05 tirou ao runtime o `UPDATE` em `subscriptions` de
 * propósito — um catálogo comercial que o processo do restaurante reescreve é um
 * restaurante a dar-se um plano — e devolver-lhe essa escrita por causa de um
 * ecrã seria trocar a fechadura por causa de uma porta.
 *
 * O que faz é **registar o pedido, com quem, quando e porquê**, no mesmo rasto
 * de auditoria de tudo o resto. A plataforma efectiva-o ao fim do período, que é
 * o que o atlas escreve: *"Efecto: al finalizar el periodo"*. A cobrança é E32.
 *
 * A confirmação forte — escrever o nome da organização — é do atlas e fica.
 * Cancelar não é uma acção que se faça por engano num ecrã aberto por acaso.
 */
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
  const destino = `/${idioma}/app/${orgSlug}/organization/plano/cancelar`;
  const confirmacao = texto(dados, 'confirmacao');
  const motivo = texto(dados, 'motivo');

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const perfil = await lerPerfil(db, sessao.contexto.organizationId);
    // A confirmação compara-se com o nome REAL, lido agora. Comparar com um
    // valor que veio no formulário deixava qualquer pessoa mandar os dois iguais.
    if (!perfil || confirmacao !== perfil.nome) return { ok: false as const };
    await registar(db, sessao.contexto.organizationId, {
      accao: 'subscricao.cancelamento.pedido',
      actorId: sessao.actor.id,
      actorEmail: sessao.actor.email,
      alvoTipo: 'subscription',
      alvoId: sessao.contexto.organizationId,
      ...(motivo ? { motivo } : {}),
      detalhe: { efeito: 'fim_do_periodo' },
    });
    return { ok: true as const };
  });

  return voltarPara(destino, r.ok ? { registado: '1' } : { erro: 'confirmacao' });
}
