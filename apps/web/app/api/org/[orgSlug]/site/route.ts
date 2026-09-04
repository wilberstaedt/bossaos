import { NextResponse } from 'next/server';
import { criarSiteSeFaltar, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao, ligacaoSocialValida, REDES } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, textoOuNulo, voltarPara } from '../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../src/site-do-pedido.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WEB-001 · configuração geral · WEB-007 · redes · WEB-008 · SEO
 *
 * ── Guardar NÃO publica, e é aqui que isso se decide ──────────────────────
 *
 * Esta rota escreve no rascunho — `sites`, e nada mais. A revisão publicada não
 * é tocada. O aceite 1 do E10 é uma consequência de haver dois armazenamentos, e
 * esta rota é metade dessa separação: se ela escrevesse na revisão, "guardar"
 * passava a ser "publicar" e nenhum aviso no ecrã evitava isso.
 *
 * ── As ligações sociais são verificadas AQUI, e outra vez na projecção ────
 *
 * Duas vezes de propósito. Aqui, para quem escreve saber logo que a ligação foi
 * recusada; na projecção, porque a base já pode ter linhas guardadas antes desta
 * regra existir — e a projecção é o último sítio antes da internet aberta.
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

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const redes: { rede: string; url: string }[] = [];
  let alguraRecusada = false;
  for (const rede of REDES) {
    const url = textoOuNulo(dados, `rede_${rede}`);
    if (url === undefined || url === null) continue;
    if (!ligacaoSocialValida(rede, url)) { alguraRecusada = true; continue; }
    redes.push({ rede, url });
  }

  await comEscopoDoPedido(sessao, async (db) => {
    const siteId = await criarSiteSeFaltar(db, sessao.contexto.organizationId, unidade.id);
    // `textoOuNulo` distingue "não mexeu" (`undefined`) de "apagou" (`null`).
    // Uma cadeia vazia guardada era indistinguível de um campo por preencher, e o
    // ecrã passava a mostrar um título de zero letras nos motores de busca.
    //
    // O objecto é montado a passo e não com espalhamentos condicionais: com
    // `exactOptionalPropertyTypes`, `{...(x ? {a} : {})}` produz `a?: T |
    // undefined`, que não é o mesmo que a propriedade não estar lá — e o Prisma
    // trata `undefined` e ausência de maneira diferente.
    const alteracoes: Record<string, unknown> = {};
    const seoTitulo = textoOuNulo(dados, 'seoTitulo');
    if (seoTitulo !== undefined) alteracoes.seoTitulo = seoTitulo;
    const seoDescricao = textoOuNulo(dados, 'seoDescricao');
    if (seoDescricao !== undefined) alteracoes.seoDescricao = seoDescricao;
    // As redes só são reescritas quando o formulário DAS REDES foi submetido —
    // um campo escondido di-lo. Sem esta verificação, guardar o SEO apagava
    // todas as ligações sociais, porque o formulário do SEO não as manda.
    if (dados.has('rede_instagram')) alteracoes.redes = redes;

    if (Object.keys(alteracoes).length > 0) {
      await db.site.update({ where: { id: siteId }, data: alteracoes });
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'site.rascunho.guardado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'site', alvoId: siteId, detalhe: { seccao },
    });
  });

  return voltarPara(destino, alguraRecusada ? { erro: 'rede' } : { guardado: '1' });
}
