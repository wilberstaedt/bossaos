import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorFiscal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-006 · «Fiscal/contabilidade» (atlas)
 *
 * ── O ecrã diz o que NÃO está confirmado, e onde isso está escrito ────────
 *
 * A régua do E24 recusou-se a enumerar os requisitos do regime, e a razão vale
 * para este ecrã também: um requisito fiscal errado mostrado com confiança passa
 * a ser citado como verdade.
 *
 * O que este ecrã afirma é o que se sabe verificar: se há fornecedor ligado, em
 * que ambiente, e que os requisitos concretos **estão por confirmar na fonte
 * oficial** — com o ADR onde isso está registado, com data e endereços.
 */
export default async function IntegracaoFiscal({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).fiscalE24;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorFiscal(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-006">{t.fiscal}</h1>
        </div>
      </div>
      <p data-teste="estado-conector">{conector?.activo ? t.provedor : t.emissaoBloqueada}</p>
      <p data-teste="ambiente">{t.ambiente}: {
        conector?.ambiente === 'PRODUCAO' ? t.producao : t.sandbox
      }</p>
      {/* A pendência externa, no ecrã e não só num documento de progresso. */}
      <p data-teste="por-confirmar">{t.porConfirmar}</p>
      <a className="bo-botao" data-seccao="fiscal-config"
         href={`/${idioma}/pos/${unidade.id}/fiscal/configuracao`}>{t.configuracao}</a>
    </div>
  );
}
