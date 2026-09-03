import { NextResponse } from 'next/server';
import { podeDescarregar, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { obterMedia } from '../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SET-012 · **o segundo ponto de verificação**.
 *
 * ── A rota inteira existe por causa de uma frase do E00 ────────────────────
 *
 * > Um ficheiro gerado quando alguém tinha direito continua a existir depois de
 * > esse direito acabar; se o descarregamento não verifica, a exportação é uma
 * > porta que fica aberta atrás da pessoa.
 *
 * Por isso as concessões são **lidas outra vez**, aqui, agora — `resolverPedido`
 * vai à base a cada pedido. Passar as que vieram do pedido de exportação seria
 * repetir a primeira verificação com outro nome.
 *
 * E é a mesma família da revogação do E04: a diferença entre "impede" e "impede
 * ao pedido seguinte".
 *
 * ── O que o identificador NÃO é ────────────────────────────────────────────
 *
 * Não é uma credencial. Quem tiver o endereço completo passa pelas cinco
 * verificações na mesma — inquilino, dono, revogação, prazo, permissão. Um
 * sistema em que conhecer o URL basta transforma o histórico do navegador, o
 * `Referer` e um grupo de conversa numa fuga.
 */
export async function GET(
  _pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; exportId: string }> },
) {
  const { orgSlug, exportId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }

  const decisao = await comEscopoDoPedido(sessao, async (db) => {
    const r = await podeDescarregar(
      db, sessao.contexto.organizationId, exportId, sessao.actor.id,
      // As concessões de AGORA. É este argumento que faz a regra existir.
      sessao.concessoes,
    );
    await registar(db, sessao.contexto.organizationId, {
      accao: r.ok ? 'exportacao.descarregada' : 'exportacao.descarregamento.recusado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'export_job', alvoId: exportId,
      detalhe: r.ok ? {} : { erro: r.erro },
    });
    if (r.ok) {
      await db.exportJob.updateMany({
        where: { id: exportId }, data: { descarregadaEm: new Date() },
      });
    }
    return r;
  });

  if (!decisao.ok) {
    // `outra_organizacao` e `nao_e_seu` saem como AUSÊNCIA, não como "sem
    // permissão": dizer que não se tem permissão sobre uma exportação alheia
    // confirma que ela existe.
    const estado = decisao.erro === 'outra_organizacao' || decisao.erro === 'nao_e_seu' ? 404
      : decisao.erro === 'sem_permissao' ? 403
      : 410; // expirado / revogado — existiu e já não serve
    return NextResponse.json({ erro: decisao.erro }, { status: estado });
  }
  if (!decisao.chave) return NextResponse.json({ erro: 'ficheiro_ausente' }, { status: 404 });

  const conteudo = await obterMedia().ler(decisao.chave);
  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      // `attachment` e não `inline`: um CSV renderizado no nosso domínio é uma
      // superfície que não precisamos de ter.
      'content-disposition': 'attachment; filename="catalogo.csv"',
      // Um ficheiro com a carta inteira não fica em nenhuma cache pelo caminho.
      'cache-control': 'no-store, private',
    },
  });
}
