import { NextResponse } from 'next/server';
import { criarSiteSeFaltar, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao, TIPOS_DE_PAGINA } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, textoOuNulo, voltarPara } from '../../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WEB-002 a WEB-005 · o conteúdo de cada página, e se está visível.
 *
 * ── `visivel` é um campo do formulário e não um botão à parte ─────────────
 *
 * Ligar e desligar uma página é uma decisão de conteúdo, e vive no mesmo sítio
 * onde o conteúdo se escreve. Um interruptor separado permitia publicar uma
 * página vazia com dois cliques dados em ecrãs diferentes, sem nunca ver o que
 * ia para o ar.
 *
 * E continua a ser **rascunho**: ligar a página não a põe na internet. Só
 * publicar o faz — o que também quer dizer que desligar uma página não a tira do
 * ar enquanto não se voltar a publicar, e o ecrã diz isso.
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
  const seccao = texto(dados, 'seccao') ?? '';
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/website${seccao}`;

  const tipo = texto(dados, 'tipo') ?? '';
  if (!(TIPOS_DE_PAGINA as readonly string[]).includes(tipo)) {
    return voltarPara(destino, { erro: 'tipo' });
  }

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  await comEscopoDoPedido(sessao, async (db) => {
    const siteId = await criarSiteSeFaltar(db, sessao.contexto.organizationId, unidade.id);
    const pagina = await db.sitePage.findFirst({
      where: { siteId, tipo: tipo as 'INICIO' }, select: { id: true },
    });
    const conteudo = {
      titulo: textoOuNulo(dados, 'titulo') ?? null,
      corpo: textoOuNulo(dados, 'corpo') ?? null,
      // A caixa desmarcada não chega no `FormData` — é assim que o HTML funciona.
      // Ler `has` e não o valor é o que faz "desmarcado" querer dizer `false` em
      // vez de "não mexeu", que aqui é a diferença entre esconder e não mexer.
      visivel: dados.has('visivel'),
      ...(tipo === 'CONTACTO' ? {
        contacto: {
          morada: textoOuNulo(dados, 'morada') ?? null,
          telefone: textoOuNulo(dados, 'telefone') ?? null,
          email: textoOuNulo(dados, 'email') ?? null,
        },
      } : {}),
    };
    if (pagina) {
      await db.sitePage.update({ where: { id: pagina.id }, data: conteudo });
    } else {
      await db.sitePage.create({
        data: { organizationId: sessao.contexto.organizationId, siteId, tipo: tipo as 'INICIO', ...conteudo },
      });
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'site.pagina.guardada',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'site', alvoId: siteId, detalhe: { tipo, visivel: conteudo.visivel },
    });
  });

  return voltarPara(destino, { guardado: '1' });
}
