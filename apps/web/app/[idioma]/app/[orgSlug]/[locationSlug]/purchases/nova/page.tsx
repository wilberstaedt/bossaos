import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { artigosDoFornecedor } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarCompras } from '../../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * PUR-002 · «Prepara una compra» (atlas)
 *
 * A encomenda é uma INTENÇÃO. Esta tela não move stock nenhum, e é de propósito
 * que não tem botão nenhum que o sugira: quem confirma que a mercadoria entrou é
 * quem a conta à porta, na PUR-003.
 */
export default async function NovaEncomenda({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const base = await carregarCompras(idioma, orgSlug, locationSlug);
  const artigos = await comEscopoDoPedido(base.sessao, async (db) => {
    const todos = await Promise.all(base.fornecedores.map(async (f) => {
      const seus = await artigosDoFornecedor(db, f.id);
      return seus.map((a) => ({ ...a, fornecedor: f.nome }));
    }));
    return todos.flat();
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="PUR-002">{t.novaEncomenda}</h1>
        </div>
      </div>
      <p data-teste="so-recepcao">{t.soRecepcaoMexe}</p>
      <p data-teste="quantos-artigos">{artigos.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_encomenda" />
        <input type="hidden" name="locationId" value={base.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.fornecedor} name="supplierId" required>
          {base.fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.numero} name="numero" required maxLength={40} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>

      <h2>{t.artigos}</h2>
      <ul className="bo-lista bo-lista--colunas" data-teste="artigos">
        {artigos.map((a) => (
          <li key={a.id}>
            <span>{a.fornecedor}</span>
            <span data-teste="insumo">{a.insumo.nome}</span>
            <span data-teste="unidade-de-compra">{a.unidadeDeCompra}</span>
            <span data-teste="factor">{String(a.factorMili)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
