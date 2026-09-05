import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Seletor } from '@bossaos/ui';
import { recompensasDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarCliente } from '../../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-007 · «Recompensas de María» (atlas) — o saldo explica-se movimento a movimento. */
export default async function Recompensas({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; customerId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, customerId } = await params;
  const t = mensagensDe(idioma).crmE27;
  const base = await carregarCliente(idioma, orgSlug, locationSlug, customerId);
  const recompensas = await comEscopoDoPedido(base.sessao,
    (db) => recompensasDaUnidade(db, base.unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.cliente.nome}</p>
          <h1 data-tela="CRM-007">{t.recompensas}</h1>
        </div>
      </div>
      <p data-teste="saldo">{String(base.cliente.saldoPontos)}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantos-movimentos">{base.pontos.length}</p>
      {base.pontos.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="movimentos">
          {base.pontos.map((m) => (
            <li key={m.id}>
              <span data-teste="tipo">{m.tipo}</span>
              <span data-teste="pontos">{String(m.pontos)}</span>
              <span data-teste="motivo">{m.motivo}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="resgatar" />
        <input type="hidden" name="customerId" value={base.cliente.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.recompensa} name="rewardId" required>
          {recompensas.map((r) => (
            <option key={r.id} value={r.id}>{r.nome} · {String(r.custoPontos)}</option>
          ))}
        </Seletor>
        <Botao type="submit">{t.resgatar}</Botao>
      </form>
    </div>
  );
}
