import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { obterProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-011 · variantes (atlas p. 63)
 *
 * Uma variante é uma forma do mesmo produto — média, grande — e tem preço
 * próprio. **Não é um modificador**: quem pede uma pizza grande não pediu uma
 * pizza com o extra "grande", pediu outra linha de carta com outro preço.
 *
 * `predefinida` é um rádio e não uma caixa por produto: só uma pode sê-lo, e um
 * conjunto de caixas permitiria zero ou três.
 */
export default async function VariantesDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const produto = await comEscopoDoPedido(sessao, (db) => obterProduto(db, productId));
  if (!produto) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaVariantes}</p>
          <h1>{produto.nome}</h1>
        </div>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}

      <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/variantes`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        {produto.variantes.length === 0 ? <Cartao variante="suave">{c.semVariantes}</Cartao> : null}
        {produto.variantes.map((v) => (
          <Cartao key={v.id}>
            <div className="bo-forma__grelha">
              <Campo rotulo={c.nome} name={`nome:${v.id}`} defaultValue={v.nome} />
              <Campo rotulo={c.ordem} name={`ordem:${v.id}`} type="number" defaultValue={String(v.ordem)} />
              <label className="bo-campo__envolvente">
                <input type="radio" name="predefinida" value={v.id} defaultChecked={v.predefinida} />
                <span>{c.predefinida}</span>
              </label>
            </div>
          </Cartao>
        ))}
        <Cartao variante="suave">
          <div className="bo-forma__grelha">
            <Campo rotulo={c.nome} name="nova" />
            <Campo rotulo={c.ordem} name="novaOrdem" type="number"
                   defaultValue={String(produto.variantes.length + 1)} />
          </div>
        </Cartao>
        <Botao type="submit">{c.accaoGuardarVariantes}</Botao>
      </form>
    </div>
  );
}
