import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { conectorDePagamento } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-022 · «Configuración de cobros» (atlas)
 *
 * ── Não há aqui campo para uma chave secreta, e isso é a decisão ──────────
 *
 * «Segredos de adquirente em código, em registo, ou em endereço» é reprovação à
 * cabeça. O segredo vive no ambiente do servidor; o que se configura aqui é a
 * **titularidade** — quem recebe o dinheiro — e isso não é segredo nenhum.
 *
 * E o conector não liga sem provedor E merchant: a base recusa-o por `CHECK`.
 * Ligar sem titularidade era declarar pagamento real pronto sem o ser.
 */
export default async function ConfiguracaoDeCobros({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { unidade, orgSlug, sessao } = await carregarTpv(idioma, locationId);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDePagamento(db, unidade.id));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-022">{t.caixa}</h1>
        </div>
      </div>
      <p data-teste="estado-conector">{conector?.activo ? p.ligado : p.desligado}</p>
      {!conector?.activo && <p data-teste="sem-adquirente">{p.semAdquirente}</p>}
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="guardar_conector_pagamento" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <Campo rotulo={t.conta} name="provedor" defaultValue={conector?.provedor ?? ''} />
        <Campo rotulo={t.autoriza} name="merchantId" defaultValue={conector?.merchantId ?? ''} />
        <label className="bo-campo">
          <input type="checkbox" name="activo" defaultChecked={conector?.activo ?? false} />
          <span>{p.ligado}</span>
        </label>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
      {/* Diz-se o que NÃO se guarda, para ninguém procurar onde pôr a chave. */}
      <p data-teste="segredo-fora">{p.segredoFora}</p>
    </div>
  );
}
