import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { conectorFiscal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarTpv } from '../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-021 · «Configuración fiscal» (atlas)
 *
 * ── Não há campo para credencial, e isso é a decisão ──────────────────────
 *
 * A mesma do E23: o segredo vive no ambiente do servidor. O que se configura
 * aqui é **quem emite** — provedor, NIF, ambiente — e nada disso é segredo.
 *
 * ── E o AMBIENTE está no ecrã, em letra igual ao resto ────────────────────
 *
 * «Sandbox» nunca é produção, e a pior confusão desta área é julgar que se
 * emitiu a sério contra um servidor de ensaio. Por isso o ambiente é uma escolha
 * explícita e aparece na lista de documentos, e não uma definição escondida.
 */
export default async function ConfiguracaoFiscal({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).fiscalE24;
  const { unidade, orgSlug, sessao } = await carregarTpv(idioma, locationId);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorFiscal(db, unidade.id));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-021">{t.configuracao}</h1>
        </div>
      </div>
      {!conector?.activo && <p data-teste="emissao-bloqueada">{t.emissaoBloqueada}</p>}
      <p data-teste="por-confirmar">{t.porConfirmar}</p>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="guardar_conector_fiscal" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <Campo rotulo={t.provedor} name="provedor" defaultValue={conector?.provedor ?? ''} />
        <Campo rotulo={t.nif} name="nif" defaultValue={conector?.nif ?? ''} />
        <Seletor rotulo={t.ambiente} name="ambiente" defaultValue={conector?.ambiente ?? 'SANDBOX'}>
          <option value="SANDBOX">{t.sandbox}</option>
          <option value="PRODUCAO">{t.producao}</option>
        </Seletor>
        <label className="bo-campo">
          <input type="checkbox" name="activo" defaultChecked={conector?.activo ?? false} />
          <span>{t.provedor}</span>
        </label>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
