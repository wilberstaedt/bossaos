import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarConta } from '../../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-004 · «Concilia la operación» (atlas)
 *
 * ── Nada se auto-confirma, nem a 100% ─────────────────────────────────────
 *
 * Uma correspondência é uma sugestão até alguém a confirmar, e confirmar deixa
 * autor e momento. Quem concilia responde pelo que conciliou, e daqui a um ano
 * alguém vai perguntar quem foi.
 */
export default async function Conciliar({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; accountId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, accountId } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarConta(idioma, orgSlug, locationSlug, accountId);
  const sugestoes = b.correspondencias.filter((c) => c.estado === 'SUGERIDA');
  const confirmadas = b.correspondencias.filter((c) => c.estado === 'CONFIRMADA');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.conta.nome}</p>
          <h1 data-tela="FIN-004">{t.conciliar}</h1>
        </div>
      </div>
      <p data-teste="nada-auto-confirma">{t.nadaAutoConfirma}</p>
      <p data-teste="conciliado-derivado">{t.conciliadoDerivado}</p>
      <p data-teste="quantas-sugestoes">{sugestoes.length}</p>
      <p data-teste="quantas-confirmadas">{confirmadas.length}</p>
      {b.correspondencias.length === 0
        ? <p data-teste="sem-correspondencias">{t.semCorrespondencias}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="correspondencias">
          {b.correspondencias.map((c) => (
            <li key={c.id}>
              <span data-teste="conceito">{c.movimento.conceito}</span>
              <span data-teste="montante">{String(c.linha.montanteMenor)}</span>
              <span data-teste="semelhanca">{c.semelhanca}</span>
              <span data-teste={c.estado === 'CONFIRMADA' ? 'confirmada' : 'sugestao'}>
                {c.estado === 'CONFIRMADA' ? t.conciliada : t.sugestao}
              </span>
              {c.confirmadaPor ? (
                <span data-teste="confirmada-por">{c.confirmadaPor}</span>
              ) : (
                <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
                  <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="accao" value="confirmar" />
                  <input type="hidden" name="reconciliationId" value={c.id} />
                  <input type="hidden" name="accountId" value={accountId} />
                  <input type="hidden" name="locationSlug" value={locationSlug} />
                  <Botao type="submit">{t.confirmar}</Botao>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Sugerir é um passo separado de confirmar: uma sugestão não concilia
          nada, e é por isso que os dois botões existem. */}
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="sugerir" />
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.extracto} name="bankLineId" required>
          {b.linhas.filter((l) => !l.conciliada).map((l) => (
            <option key={l.id} value={l.id}>
              {l.dataValor.toISOString().slice(0, 10)} · {String(l.montanteMenor)}
            </option>
          ))}
        </Seletor>
        <Seletor rotulo={t.conceito} name="movementId" required>
          {b.resultado.map((m) => (
            <option key={m.movimentoId} value={m.movimentoId}>{m.conceito}</option>
          ))}
        </Seletor>
        <Campo rotulo={t.semelhanca} name="semelhanca" type="text" inputMode="numeric" />
        <Botao type="submit">{t.sugestao}</Botao>
      </form>
    </div>
  );
}
