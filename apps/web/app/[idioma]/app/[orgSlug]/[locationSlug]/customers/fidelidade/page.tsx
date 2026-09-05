import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarFidelidade } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-006 · «Programa de fidelidad» (atlas)
 *
 * Os pontos são valor, e o dinheiro é inteiro em unidade menor — 3,00 € é
 * `300`, e não `3.0`. A guarda do dinheiro não leva excepção nesta etapa.
 */
export default async function Fidelidade({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, recompensas } = await carregarFidelidade(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-006">{t.fidelidade}</h1>
        </div>
      </div>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantas-recompensas">{recompensas.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="recompensas">
        {recompensas.map((r) => (
          <li key={r.id}>
            <span data-teste="nome">{r.nome}</span>
            <span data-teste="custo">{String(r.custoPontos)}</span>
            <span data-teste="valor">{String(r.valorMenor)}</span>
            <span data-teste="moeda">{r.moeda}</span>
          </li>
        ))}
      </ul>
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_recompensa" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        {/* Texto e não `number`: o `step` do HTML5 recusa valores pela restrição
            nativa antes de o JS os ver, e o erro aparece sem explicação. */}
        <Campo rotulo={t.custoPontos} name="custoPontos" type="text" inputMode="numeric" required />
        <Campo rotulo={t.valor} name="valorMenor" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
