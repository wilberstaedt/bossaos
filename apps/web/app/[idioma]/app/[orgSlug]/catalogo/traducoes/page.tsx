import { redirect } from 'next/navigation';
import { Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { coberturaDeTraducoes } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-024 · "Traducción en lote" (atlas p. 74)
 *
 * Quatro colunas e não três: **"o original mudou" conta à parte de "sem
 * tradução"**. Somá-las num "por traduzir" único faz parecer que há mais
 * trabalho novo do que há, e esconde o que é urgente — o obsoleto **já está
 * publicado e errado**, enquanto o que falta apenas não existe.
 *
 * São também trabalhos diferentes: um é escrever, o outro é comparar com o que
 * mudou. Quem os junta atira as duas coisas para a mesma fila e a mais urgente
 * fica no fim.
 */
export default async function TraducaoEmLote({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const cobertura = await comEscopoDoPedido(sessao, (db) => coberturaDeTraducoes(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaTraducoes}</p>
          <h1>{c.tituloLote}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/catalogo/produtos`}>{m.catalogoE07.tituloProdutos}</a>
      </div>

      <Tabela
        legenda={c.tituloLote}
        colunas={[
          { chave: 'lingua', rotulo: c.colunaIdioma },
          { chave: 'revisadas', rotulo: c.colunaRevisadas, numero: true },
          { chave: 'pendentes', rotulo: c.colunaPendentes, numero: true },
          { chave: 'obsoletas', rotulo: c.colunaObsoletas, numero: true },
          { chave: 'porTraduzir', rotulo: c.colunaPorTraduzir, numero: true },
        ]}
        linhas={cobertura.map((x) => ({
          id: x.idioma,
          lingua: x.idioma,
          revisadas: formatarNumero(x.revisadas, idioma),
          pendentes: formatarNumero(x.pendentes, idioma),
          obsoletas: formatarNumero(x.obsoletas, idioma),
          porTraduzir: formatarNumero(x.semTraducao, idioma),
        }))}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">{c.notaLote}</p>
      <p className="bo-planos__nota">{c.notaSemFornecedor}</p>
    </div>
  );
}
