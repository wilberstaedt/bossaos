import { NextResponse } from 'next/server';
import { CANAIS, registar, type Canal } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao, instanteNaZona } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-003 · guardar o menu.
 *
 * O período é `[de, até)` — semiaberto, como tudo. O `até` é interpretado como
 * **o início do dia seguinte**, e é isso que faz um menu que "acaba a 31 de
 * Agosto" valer o dia 31 inteiro. Guardar `31-08 00:00` como fim tirava o menu
 * logo à meia-noite do dia 30 para o 31, e ninguém escreve uma data a pensar
 * nisso.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; menuId: string }> },
) {
  const { orgSlug, menuId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}`;
  const versao = Number(texto(dados, 'versao'));
  if (!Number.isInteger(versao)) return voltarPara(destino, { erro: 'versao' });

  const nome = texto(dados, 'nome');
  const locationId = texto(dados, 'locationId') ?? null;
  const estadoEscrito = texto(dados, 'estado');
  const de = texto(dados, 'periodoDe');
  const ate = texto(dados, 'periodoAte');
  const canais = dados.getAll('canal')
    .filter((x): x is string => typeof x === 'string')
    .filter((x): x is Canal => (CANAIS as readonly string[]).includes(x));

  const r = await comEscopoDoPedido(sessao, async (db) => {
    // O fuso é o da unidade quando o menu é de uma unidade; sendo da marca, as
    // datas são UTC, porque não há um sítio a que pertençam.
    const fuso = locationId
      ? (await db.location.findFirst({ where: { id: locationId }, select: { fuso: true } }))?.fuso
      : null;
    const paraInstante = (dia: string | undefined, fimDoDia: boolean): Date | null | undefined => {
      if (!dia) return null;
      const hora = `${dia}T00:00`;
      if (!fuso) {
        const base = new Date(`${hora}:00Z`);
        if (Number.isNaN(base.getTime())) return undefined;
        // `[de, até)`: o fim é o início do dia SEGUINTE, para o último dia contar.
        if (fimDoDia) base.setUTCDate(base.getUTCDate() + 1);
        return base;
      }
      const instante = instanteNaZona(hora, fuso);
      if (!instante) return undefined;
      if (fimDoDia) {
        const seguinte = new Date(instante);
        seguinte.setUTCDate(seguinte.getUTCDate() + 1);
        return seguinte;
      }
      return instante;
    };

    const periodoDe = paraInstante(de, false);
    const periodoAte = paraInstante(ate, true);
    if (periodoDe === undefined || periodoAte === undefined) return { ok: false as const, erro: 'data' };
    if (periodoDe && periodoAte && periodoDe.getTime() >= periodoAte.getTime()) {
      // Um intervalo vazio não é um menu curto: é um menu que nunca vale.
      return { ok: false as const, erro: 'periodo_vazio' };
    }

    const afectadas = await db.menu.updateMany({
      where: { id: menuId, version: versao },
      data: {
        ...(nome ? { nome } : {}),
        descricao: texto(dados, 'descricao') ?? null,
        locationId,
        periodoDe, periodoAte,
        ...(estadoEscrito === 'RASCUNHO' || estadoEscrito === 'ACTIVO' || estadoEscrito === 'ARQUIVADO'
          ? { estado: estadoEscrito } : {}),
        version: { increment: 1 },
      },
    });
    if (afectadas.count === 0) {
      const existe = await db.menu.findFirst({ where: { id: menuId }, select: { id: true } });
      return { ok: false as const, erro: existe ? 'conflito_de_versao' : 'nao_encontrado' };
    }

    await db.menuChannel.deleteMany({ where: { menuId, canal: { notIn: canais } } });
    for (const canal of canais) {
      const ja = await db.menuChannel.findFirst({ where: { menuId, canal }, select: { id: true } });
      if (!ja) {
        await db.menuChannel.create({
          data: { organizationId: sessao.contexto.organizationId, menuId, canal },
        });
      }
    }

    await registar(db, sessao.contexto.organizationId, {
      accao: 'menu.guardado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menuId, detalhe: { versao, canais, locationId },
    });
    return { ok: true as const };
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro });
  return voltarPara(destino, { guardado: '1' });
}
