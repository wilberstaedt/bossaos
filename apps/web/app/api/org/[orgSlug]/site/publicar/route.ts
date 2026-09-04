import { NextResponse } from 'next/server';
import { criarSiteSeFaltar, publicarSite, registar, retirarSite } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WEB-011 · publicar e retirar — o aceite 1 do E10.
 *
 * > *«Rascunho não muda o site público; publicar e retirar são consistentes.»*
 *
 * ── Publicar cria uma VERSÃO, e a versão é imutável ───────────────────────
 *
 * A revisão nasce e o ponteiro troca dentro da **mesma transacção** — a que o
 * `comEscopoDoPedido` já abre. Sem isso, uma falha entre as duas escritas deixava
 * um ponteiro para uma revisão que não chegou a existir.
 *
 * ── Retirar apaga o ponteiro ──────────────────────────────────────────────
 *
 * Não põe uma bandeira: uma bandeira deixa o conteúdo alcançável por quem se
 * esqueça de a ler. Sem linha em `site_publications`, a porta pública não tem
 * junção que dê — a régua reprova à cabeça «a rota devolve uma página em cache
 * com o conteúdo antigo», e aqui não há conteúdo antigo por onde voltar.
 *
 * **O endereço público NÃO é largado.** Retirar o site e libertar o endereço são
 * decisões diferentes, e o QR está impresso.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string }> },
) {
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
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/website/publicar`;
  const accao = texto(dados, 'accao');

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const resultado = await comEscopoDoPedido(sessao, async (db) => {
    const siteId = await criarSiteSeFaltar(db, sessao.contexto.organizationId, unidade.id);

    if (accao === 'retirar') {
      const r = await retirarSite(db, siteId);
      await registar(db, sessao.contexto.organizationId, {
        accao: 'site.retirado',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'site', alvoId: siteId, detalhe: { estava: r.retirado },
      });
      return { tipo: 'retirado' as const };
    }

    const r = await publicarSite(db, sessao.contexto.organizationId, {
      siteId, autor: sessao.actor.email,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: r.ok ? 'site.publicado' : 'site.publicacao.bloqueada',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'site', alvoId: siteId,
      detalhe: r.ok ? { revisao: r.numero } : { bloqueios: r.bloqueios.map((b) => b.motivo) },
    });
    return r.ok
      ? { tipo: 'publicado' as const, numero: r.numero }
      : { tipo: 'bloqueado' as const, motivo: r.bloqueios[0]?.motivo ?? 'sem_paginas_visiveis' };
  });

  if (resultado.tipo === 'bloqueado') return voltarPara(destino, { erro: resultado.motivo });
  if (resultado.tipo === 'retirado') return voltarPara(destino, { retirado: '1' });
  return voltarPara(destino, { publicado: String(resultado.numero) });
}
