import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMA = /^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$/;

/**
 * CHAN-001 · definir o endereço público.
 *
 * ── O único identificador do produto que é global ─────────────────────────
 *
 * Tudo o resto é único DENTRO da organização, e é isso que deixa duas cadeias
 * ter ambas uma unidade `centro`. Este vai para um URL na internet aberta: dois
 * inquilinos a disputar `/r/la-societat/` é a carta de um servida ao cliente do
 * outro.
 *
 * A colisão é apanhada pelo índice único da base e traduzida aqui — não por uma
 * consulta prévia. Duas pessoas a escolher o mesmo endereço no mesmo segundo
 * leem ambas "está livre" e escrevem ambas; quem decide é a restrição.
 *
 * E a forma é verificada aqui **e** na base. Sem isso, alguém escreve `../admin`
 * e o endereço deixa de apontar para onde diz.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; locationId: string }> },
) {
  const { orgSlug, locationId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/channels`;
  const escrito = texto(dados, 'publicSlug');

  if (escrito !== undefined && !FORMA.test(escrito)) {
    return voltarPara(destino, { erro: 'invalido' });
  }

  try {
    await comEscopoDoPedido(sessao, async (db) => {
      await db.location.updateMany({
        where: { id: locationId },
        // Vazio APAGA o endereço, e isso é uma operação real: quem fecha uma
        // unidade quer que o link deixe de responder, e não que aponte para uma
        // carta velha.
        data: { publicSlug: escrito ?? null },
      });
      await registar(db, sessao.contexto.organizationId, {
        accao: 'unidade.endereco-publico.guardado',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'location', alvoId: locationId,
        detalhe: { publicSlug: escrito ?? null },
      });
    });
  } catch {
    // O índice único da base. Não se consulta antes: duas pessoas a escolher o
    // mesmo endereço no mesmo segundo leem ambas "está livre".
    return voltarPara(destino, { erro: 'ocupado' });
  }

  return voltarPara(destino, { guardado: '1' });
}
