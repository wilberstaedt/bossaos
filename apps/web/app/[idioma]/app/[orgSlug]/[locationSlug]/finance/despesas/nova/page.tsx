import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarFinanceiro } from '../../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-006 · «Añade un gasto» (atlas)
 *
 * ── Duas datas, e o formulário obriga a dar as duas ───────────────────────
 *
 * A ocorrência é quando a coisa aconteceu; a data-valor é quando o dinheiro se
 * mexeu. Um formulário com uma data só obriga o produto a inventar a outra — e
 * é exactamente aí que as três datas colapsam numa.
 */
export default async function NovaDespesa({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="FIN-006">{t.novaDespesa}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>
      <p data-teste="fechar-proibe">{t.fecharProibe}</p>
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="registar_despesa" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.conceito} name="conceito" required maxLength={120} />
        {/* Texto e não `number`: o `step` do HTML5 recusa valores pela restrição
            nativa antes de o JS os ver, e o erro aparece sem explicação. */}
        <Campo rotulo={t.montante} name="montante" type="text" inputMode="numeric" required />
        <Campo rotulo={t.moeda} name="moeda" maxLength={3} defaultValue="EUR" />
        <Campo rotulo={t.ocorrencia} name="ocorrenciaEm" type="text" defaultValue={hoje} required />
        <Campo rotulo={t.valor} name="valorEm" type="text" defaultValue={hoje} required />
        <Seletor rotulo={t.centro} name="centroDeCusto">
          <option value="">—</option>
          <option value="cozinha">cozinha</option>
          <option value="sala">sala</option>
          <option value="estrutura">estrutura</option>
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
