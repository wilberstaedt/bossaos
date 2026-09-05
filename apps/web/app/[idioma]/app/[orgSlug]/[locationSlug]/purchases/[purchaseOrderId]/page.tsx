import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { artigosDoFornecedor } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarEncomenda } from '../../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * PUR-003 · «Recibe y comprueba» (atlas)
 *
 * ── Três colunas, e nenhuma resolvida em silêncio ─────────────────────────
 *
 * Pediram-se 10 caixas, chegaram 8, a factura diz 10. Isso é uma terça-feira
 * normal, e não uma avaria. As diferenças mostram-se como diferenças — quem
 * decide se aceita 8 e paga 8, ou se reclama, é a casa.
 *
 * E esta é a ÚNICA tela do produto que mexe no stock por compra.
 */
export default async function Conferir({
  params,
}: {
  params: Promise<{
    idioma: Idioma; orgSlug: string; locationSlug: string; purchaseOrderId: string;
  }>;
}) {
  const { idioma, orgSlug, locationSlug, purchaseOrderId } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const base = await carregarEncomenda(idioma, orgSlug, locationSlug, purchaseOrderId);
  const artigos = await comEscopoDoPedido(base.sessao,
    (db) => artigosDoFornecedor(db, base.encomenda.fornecedor.id));
  const semDiferenca = base.conferencia.every(
    (c) => c.diferencaRecepcao === 0n && c.diferencaFactura === 0n,
  );

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.encomenda.fornecedor.nome}</p>
          <h1 data-tela="PUR-003">{base.encomenda.numero}</h1>
        </div>
      </div>
      <p data-teste="tres-numeros">{t.tresNumeros}</p>
      <p data-teste="quantas-linhas">{base.conferencia.length}</p>
      <p data-teste="quantas-recepcoes">{base.encomenda.recepcoes.length}</p>
      {semDiferenca ? <p data-teste="sem-diferenca">{t.semDiferenca}</p> : null}

      <ul className="bo-lista bo-lista--colunas" data-teste="conferencia">
        {base.conferencia.map((c) => (
          <li key={c.linhaId}>
            <span data-teste="insumo">{c.insumo}</span>
            <span data-teste="encomendado">{String(c.encomendadoMili)}</span>
            <span data-teste="recebido">{String(c.recebidoMili)}</span>
            <span data-teste="facturado">{String(c.facturadoMili)}</span>
            {c.diferencaRecepcao === 0n ? null : (
              <span data-teste="diferenca-recepcao">{String(c.diferencaRecepcao)}</span>
            )}
            {c.diferencaFactura === 0n ? null : (
              <span data-teste="diferenca-factura">{String(c.diferencaFactura)}</span>
            )}
          </li>
        ))}
      </ul>

      <h2>{t.receber}</h2>
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="receber" />
        <input type="hidden" name="purchaseOrderId" value={base.encomenda.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.artigo} name="purchaseOrderLineId" required>
          {base.conferencia.map((c) => (
            <option key={c.linhaId} value={c.linhaId}>{c.insumo} · {c.unidadeDeCompra}</option>
          ))}
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Campo rotulo={t.custo} name="custo" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.receber}</Botao>
      </form>

      <h2>{t.registarFactura}</h2>
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="registar_factura" />
        <input type="hidden" name="purchaseOrderId" value={base.encomenda.id} />
        <input type="hidden" name="supplierId" value={base.encomenda.fornecedor.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.numero} name="numero" required maxLength={40} />
        <Seletor rotulo={t.artigo} name="supplierItemId" required>
          {artigos.map((a) => (
            <option key={a.id} value={a.id}>{a.insumo.nome} · {a.unidadeDeCompra}</option>
          ))}
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Campo rotulo={t.total} name="total" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.registarFactura}</Botao>
      </form>

      <h2>{t.artigos}</h2>
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="juntar_linha" />
        <input type="hidden" name="purchaseOrderId" value={base.encomenda.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.artigo} name="supplierItemId" required>
          {artigos.map((a) => (
            <option key={a.id} value={a.id}>{a.insumo.nome} · {a.unidadeDeCompra}</option>
          ))}
        </Seletor>
        <Campo rotulo={t.encomendado} name="quantidade" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
