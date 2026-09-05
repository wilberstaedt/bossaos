import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarCompras } from '../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/** SUP-001 · «Tus proveedores» (atlas) */
export default async function Fornecedores({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const { unidade, fornecedores } = await carregarCompras(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/purchases`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SUP-001">{t.fornecedores}</h1>
        </div>
      </div>
      <p data-teste="quantos-fornecedores">{fornecedores.length}</p>
      {fornecedores.length === 0 ? <p data-teste="sem-fornecedores">{t.semFornecedores}</p> : (
        <ul className="bo-lista" data-teste="fornecedores">
          {fornecedores.map((f) => (
            <li key={f.id}>
              <a className="bo-lista__ligacao"
                 href={`/${idioma}/app/${orgSlug}/${locationSlug}/suppliers/${f.id}`}>{f.nome}</a>
              <span data-teste="contacto">{f.contacto ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="encomendas" href={base}>{t.encomendas}</a>
      </nav>
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_fornecedor" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={120} />
        <Campo rotulo={t.contacto} name="contacto" maxLength={120} />
        <Campo rotulo={t.nif} name="nif" maxLength={40} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
