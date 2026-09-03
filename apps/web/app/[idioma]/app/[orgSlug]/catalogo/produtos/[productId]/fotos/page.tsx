import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMedia, obterProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-014 · "Fotos del producto" (atlas p. 66)
 *
 * As fotos escolhem-se da biblioteca; **não se carregam aqui**. É uma decisão e
 * não uma simplificação: o mesmo ficheiro serve vários produtos, e um
 * carregamento por produto multiplicaria a mesma imagem por dez linhas — e
 * substituí-la passaria a ser dez trabalhos, dos quais alguém faria nove.
 *
 * A principal é um **rádio**: uma ou nenhuma. Um conjunto de caixas permitiria
 * zero ou três, e a carta publicada teria de escolher uma pela ordem da base —
 * a mesma família do empate de preços do E07.
 */
export default async function FotosDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    const ligadas = await db.productMedia.findMany({
      where: { productId },
      select: {
        id: true, principal: true, ordem: true,
        media: { select: { id: true, chave: true, nomeOriginal: true, textoAlternativo: true } },
      },
      orderBy: { ordem: 'asc' },
    });
    return { produto, ligadas, biblioteca: await listarMedia(db, produto.brandId) };
  });
  if (!dados) notFound();

  const { produto, ligadas, biblioteca } = dados;
  const jaLigadas = new Set(ligadas.map((l) => l.media.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaFotos}</p>
          <h1>{produto.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/media`}>{c.tituloMedia}</a>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}

      {ligadas.length === 0 ? <Cartao variante="suave">{c.semFotos}</Cartao> : null}

      <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/fotos`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        {ligadas.map((l) => (
          <Cartao key={l.id}>
            <div className="bo-estado__cabecalho">
              <span className="bo-tema__rotulo">{l.media.nomeOriginal ?? l.media.chave}</span>
              {l.principal ? <Etiqueta tom="realce">{c.principal}</Etiqueta> : null}
            </div>
            {/* O texto alternativo vive no ficheiro e não na ligação: é uma
                propriedade da imagem, e repeti-lo por produto daria dez
                descrições diferentes da mesma foto. */}
            <p className="bo-uso__nota">
              {l.media.textoAlternativo ?? c.semAlternativo}
            </p>
            <label className="bo-campo__envolvente">
              <input type="radio" name="principal" value={l.media.id} defaultChecked={l.principal} />
              <span>{c.accaoDefinirPrincipal}</span>
            </label>
          </Cartao>
        ))}

        <Cartao variante="suave">
          <Seletor rotulo={c.accaoLigar} name="juntar" defaultValue="">
            <option value="">{m.arranque.porEscolher}</option>
            {biblioteca.filter((b) => !jaLigadas.has(b.id)).map((b) => (
              <option key={b.id} value={b.id}>{b.nomeOriginal ?? b.chave}</option>
            ))}
          </Seletor>
        </Cartao>

        <Botao type="submit">{m.catalogoE07.accaoGuardar}</Botao>
      </form>
    </div>
  );
}
