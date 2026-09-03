import { NextResponse } from 'next/server';
import { guardarTraducao, registar } from '@bossaos/db';
import {
  IDIOMAS_DE_CONTEUDO, corpoDaResposta, estadoHttp, exigirAccao, type IdiomaDeConteudo,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-015 · gravar uma tradução.
 *
 * **A impressão do original é lida AGORA, da base.** Não vem do formulário, e
 * essa é a decisão que faz a regra funcionar: se viesse, quem quisesse silenciar
 * o aviso de obsolescência mandava a impressão actual com um texto velho, e a
 * tradução ficava "revista" sobre um original que já não existe.
 *
 * `revistoPor` é quem está autenticado, pela mesma razão da ficha de alérgenos:
 * uma revisão sem responsável não é uma revisão.
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
  const destino = `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/traducoes`;
  const escrita = texto(dados, 'lingua');
  const nome = texto(dados, 'nome');
  // Um idioma fora dos três entraria na base e não teria onde ser mostrado — e a
  // base recusa-o de qualquer maneira, com uma mensagem que não ajuda ninguém.
  if (!nome || !escrita || !(IDIOMAS_DE_CONTEUDO as readonly string[]).includes(escrita)) {
    return voltarPara(destino, { erro: 'campos' });
  }

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const resultado = await guardarTraducao(
      db, sessao.contexto.organizationId, productId, escrita as IdiomaDeConteudo,
      {
        nome,
        descricao: texto(dados, 'descricao') ?? null,
        revista: texto(dados, 'revista') === '1',
        autor: sessao.actor.email,
      },
    );
    if (resultado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'produto.traducao.guardada',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'product', alvoId: productId,
        detalhe: { lingua: escrita, estado: resultado.estado },
      });
    }
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro });
  return voltarPara(destino, { guardado: '1' });
}
