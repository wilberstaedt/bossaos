import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCompras } from '../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/** PUR-001 · «Pedidos de compra» (atlas) */
export default async function Encomendas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const { unidade, encomendas, fornecedores } = await carregarCompras(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/purchases`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="PUR-001">{t.encomendas}</h1>
        </div>
      </div>
      <p data-teste="tres-numeros">{t.tresNumeros}</p>
      <p data-teste="so-recepcao">{t.soRecepcaoMexe}</p>
      <p data-teste="quantas-encomendas">{encomendas.length}</p>
      <p data-teste="quantos-fornecedores">{fornecedores.length}</p>
      {encomendas.length === 0 ? <p data-teste="sem-encomendas">{t.semEncomendas}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="encomendas">
          {encomendas.map((e) => (
            <li key={e.id}>
              <a className="bo-lista__ligacao" href={`${base}/${e.id}`}>{e.numero}</a>
              <span data-teste="fornecedor">{e.fornecedor.nome}</span>
              <span data-teste="estado">{e.estado}</span>
              <span data-teste="quantas-recepcoes">{e.recepcoes.length}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="nova-encomenda" href={`${base}/nova`}>{t.novaEncomenda}</a>
        <a className="bo-botao" data-seccao="custos" href={`${base}/custos`}>{t.comoMuda}</a>
        <a className="bo-botao" data-seccao="fornecedores"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/suppliers`}>{t.fornecedores}</a>
      </nav>
    </div>
  );
}
