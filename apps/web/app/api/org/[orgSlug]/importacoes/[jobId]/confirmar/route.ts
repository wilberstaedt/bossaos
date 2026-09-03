import { NextResponse } from 'next/server';
import { confirmarImportacao, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-027 · confirmar a importação.
 *
 * Escreve **as linhas que a prévia guardou**, e nada mais. Não relê o ficheiro:
 * o que a pessoa aprovou tem de ser o que acontece.
 *
 * Corre dentro da transacção que o `comEscopo` abriu — o lote aprovado entra
 * inteiro ou não entra. E confirmar duas vezes o mesmo trabalho não escreve
 * outra vez: o estado `PREVISTA` é o portão, e é a mesma família da idempotência
 * do E06.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; jobId: string }> },
) {
  const { orgSlug, jobId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/catalogo/importar`;

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const resultado = await confirmarImportacao(
      db, sessao.contexto.organizationId, jobId, sessao.actor.email,
    );
    await registar(db, sessao.contexto.organizationId, {
      accao: resultado.ok ? 'importacao.confirmada' : 'importacao.recusada',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'import_job', alvoId: jobId,
      detalhe: resultado.ok
        ? { criados: resultado.criados, actualizados: resultado.actualizados }
        : { erro: resultado.erro },
    });
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro, job: jobId });
  return voltarPara(destino, { importado: '1', job: jobId });
}
