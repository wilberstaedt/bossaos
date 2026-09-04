import { notFound, redirect } from 'next/navigation';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { cartaPublica } from '@bossaos/db';
import { IDIOMAS_DE_CONTEUDO, produtoDaCarta, type IdiomaDeConteudo } from '@bossaos/domain';
import { obterBase } from '../../../../../../../../src/servidor.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../../../../src/visitante/PecasDoVisitante.tsx';
import { visitanteDaRequisicao } from '../../../../../../../../src/visitante/sessao-do-visitante.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-006 · «A tu gusto» (atlas p. 83) — escolher antes de juntar ao pedido.
 *
 * ── Só existe DENTRO de uma visita ────────────────────────────────────────
 *
 * Sem sessão de mesa não há a que juntar. Quem chegar aqui sem ela vai para o
 * estado que o explica — e não para um formulário que dá erro depois de
 * preenchido, que é a versão que faz alguém escolher três coisas para nada.
 *
 * ── E lê o produto da PROJECÇÃO, como o MENU-005 ──────────────────────────
 *
 * Não vai à base. Se fosse, teria de repetir os filtros de publicação, canal,
 * estado e visibilidade — e bastava esquecer um para se poder pedir o que a
 * carta esconde. É o caminho clássico da fuga: a lista está certa e o detalhe
 * não.
 */
export default async function AoTeuGosto({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string; produtoId: string }>;
}) {
  const { publicLocationSlug, locale, produtoId } = await params;
  const idiomaConteudo: IdiomaDeConteudo =
    (IDIOMAS_DE_CONTEUDO as readonly string[]).includes(locale)
      ? (locale as IdiomaDeConteudo) : 'es-ES';
  const idioma = idiomaConteudo as Idioma;
  const s = textosDoVisitante(idioma);
  const base = `/r/${publicLocationSlug}/${locale}`;

  const visitante = await visitanteDaRequisicao();
  if (!visitante) redirect(`${base}/menu?sessao=terminou`);

  const servida = await cartaPublica(obterBase(), publicLocationSlug, 'CARTA', idiomaConteudo);
  if (!servida) notFound();
  const produto = produtoDaCarta(servida.carta, produtoId);
  if (!produto) notFound();

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.aTeuGosto} tela="MENU-006" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="" />

      <h2 data-teste="prato">{produto.nome}</h2>
      <p className="bo-publico__preco" data-teste="preco">
        {produto.preco ? formatarDinheiro(produto.preco, idioma) : '—'}
      </p>
      {produto.descricao ? <p className="bo-publico__texto">{produto.descricao}</p> : null}

      <form method="post" action={`/r/${publicLocationSlug}/api/mesa`} data-teste="juntar">
        <input type="hidden" name="slug" value={publicLocationSlug} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="accao" value="acrescentar" />
        <input type="hidden" name="productId" value={produto.id} />
        <span className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="quantidade">{s.quantidade}</label>
          {/* `type="text"` com `inputMode`: o `type="number"` recusa valores pela
              validação nativa antes de o servidor os ver — decisão do E07. */}
          <input className="bo-campo__controlo" id="quantidade" name="quantidade"
                 type="text" inputMode="numeric" defaultValue="1" />
        </span>
        <div className="bo-estado__accoes">
          <button className="bo-botao bo-botao--primario" type="submit">{s.acrescentar}</button>
        </div>
      </form>
    </div>
  );
}
