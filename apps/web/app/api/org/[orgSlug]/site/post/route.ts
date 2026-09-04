import { NextResponse } from 'next/server';
import { criarSiteSeFaltar, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, textoOuNulo, voltarPara } from '../../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMA_DO_SLUG = /^[a-z0-9]([a-z0-9-]{1,80}[a-z0-9])?$/;

/**
 * WEB-006 · novidades e eventos.
 *
 * ── O endereço da novidade escreve-se, não se gera ────────────────────────
 *
 * Um `slug` gerado a partir do título muda quando o título é corrigido, e um
 * endereço que muda parte as ligações que já foram partilhadas — que é o que uma
 * novidade tem de mais valioso. Escreve-se uma vez, e a forma é verificada aqui
 * **e** na base: sem isso alguém escreve `../` e o endereço deixa de apontar
 * para onde diz.
 *
 * ── E apagar é apagar, não esconder ───────────────────────────────────────
 *
 * `visivel = false` tira a novidade da próxima publicação e guarda o texto.
 * Apagar remove a linha. São coisas diferentes e têm botões diferentes; um botão
 * só, chamado "remover", acabaria por fazer a que quem carrega não espera.
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
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/website/novidades`;

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const apagar = texto(dados, 'apagar');
  if (apagar !== undefined) {
    await comEscopoDoPedido(sessao, async (db) => {
      await db.sitePost.deleteMany({ where: { id: apagar } });
      await registar(db, sessao.contexto.organizationId, {
        accao: 'site.novidade.apagada',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'site_post', alvoId: apagar, detalhe: {},
      });
    });
    return voltarPara(destino, { guardado: '1' });
  }

  const slug = texto(dados, 'slug') ?? '';
  const titulo = texto(dados, 'titulo');
  if (!FORMA_DO_SLUG.test(slug)) return voltarPara(destino, { erro: 'slug' });
  if (titulo === undefined) return voltarPara(destino, { erro: 'titulo' });

  const dataEscrita = texto(dados, 'publicadoEm');
  // Uma data que o navegador não consegue ler **não** vira a data de hoje. Vira
  // ausência, e a página pública diz "sem data" — inventar hoje era pôr uma
  // afirmação falsa numa página de eventos.
  const publicadoEm = dataEscrita ? new Date(`${dataEscrita}T00:00:00Z`) : null;
  const dataValida = publicadoEm !== null && !Number.isNaN(publicadoEm.getTime());

  const conteudo = {
    slug, titulo,
    resumo: textoOuNulo(dados, 'resumo') ?? null,
    corpo: textoOuNulo(dados, 'corpo') ?? null,
    publicadoEm: dataValida ? publicadoEm : null,
    visivel: dados.has('visivel'),
  };

  const id = texto(dados, 'id');
  try {
    await comEscopoDoPedido(sessao, async (db) => {
      const siteId = await criarSiteSeFaltar(db, sessao.contexto.organizationId, unidade.id);
      if (id) {
        await db.sitePost.update({ where: { id }, data: conteudo });
      } else {
        await db.sitePost.create({
          data: { organizationId: sessao.contexto.organizationId, siteId, ...conteudo },
        });
      }
      await registar(db, sessao.contexto.organizationId, {
        accao: 'site.novidade.guardada',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'site', alvoId: siteId, detalhe: { slug, visivel: conteudo.visivel },
      });
    });
  } catch {
    // Dois endereços iguais no mesmo site: a base recusa, e a recusa é o que
    // interessa. Uma consulta prévia leria "livre" nas duas gravações
    // simultâneas.
    return voltarPara(destino, { erro: 'slug_repetido' });
  }

  return voltarPara(destino, { guardado: '1' });
}
