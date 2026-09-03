import { NextResponse } from 'next/server';
import { bloquearProduto, desbloquearProduto, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao, instanteNaZona } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-017 · "acabou o polvo".
 *
 * ── A hora escrita é a hora do restaurante ─────────────────────────────────
 *
 * `datetime-local` manda `2026-09-04T23:30` — **sem fuso**. Lê-la com `new
 * Date(...)` interpreta-a no fuso de quem corre o processo, que é o servidor.
 * Um bloqueio "até às 23h30" posto por uma unidade em Brisbane expirava dez
 * horas cedo ou tarde, e o produto voltava à carta a meio do serviço.
 *
 * Por isso passa por `instanteNaZona` com o fuso **da unidade**, lido da base.
 * Está medido no E06: com o processo em `Europe/Madrid` e a unidade em Madrid a
 * conversão é a identidade e um defeito destes passa despercebido — a prova
 * corre com `TZ=America/Los_Angeles` de propósito.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; productId: string }> },
) {
  const { orgSlug, productId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationId = texto(dados, 'locationId') ?? null;
  const bloqueado = texto(dados, 'bloqueado') === '1';
  const motivo = texto(dados, 'motivo') ?? null;
  const escrito = texto(dados, 'ate');

  const problema = await comEscopoDoPedido(sessao, async (db) => {
    if (!bloqueado) {
      await desbloquearProduto(db, productId, locationId);
    } else {
      let ate: Date | null = null;
      if (escrito) {
        const unidade = locationId
          ? await db.location.findFirst({ where: { id: locationId }, select: { fuso: true } })
          : null;
        // Sem fuso configurado na unidade não se inventa nenhum: recusa-se, do
        // mesmo modo que o E06 recusa 09h-18h para um horário por configurar.
        if (!unidade?.fuso) return 'unidade_sem_fuso';
        ate = instanteNaZona(escrito, unidade.fuso);
        // `null` aqui é a hora que NÃO EXISTE naquele sítio — a madrugada em
        // que o relógio adianta. Deixar passar guardava um bloqueio sem fim
        // quando a pessoa pediu um com fim, e ela nunca saberia.
        if (ate === null) return 'hora_inexistente';
      }
      await bloquearProduto(db, sessao.contexto.organizationId, productId, locationId, motivo, ate);
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: bloqueado ? 'produto.bloqueado' : 'produto.desbloqueado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      detalhe: { locationId, motivo, ate: escrito ?? null },
    });
    return null;
  });

  const destino = `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/disponibilidade`;
  if (problema) return voltarPara(destino, { erro: problema });
  return voltarPara(destino, { guardado: '1' });
}
