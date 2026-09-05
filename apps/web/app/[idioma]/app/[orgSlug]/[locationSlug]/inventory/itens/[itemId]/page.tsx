import { mensagensDe, formatarHora, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarInsumo } from '../../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-003 · «Detalhe do insumo» (atlas)
 *
 * ── O saldo aparece com o que o EXPLICA ───────────────────────────────────
 *
 * Um número sozinho não se pode contestar. Aqui ele vem com os movimentos que o
 * fazem, por ordem — e é isso que transforma «a contagem não bate» numa
 * pergunta com resposta: bate a partir de qual movimento.
 */
export default async function DetalheDoInsumo({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; itemId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, itemId } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumo, movimentos } = await carregarInsumo(
    idioma, orgSlug, locationSlug, itemId);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-003">{insumo.nome}</h1>
        </div>
      </div>
      <p data-teste="saldo">{t.saldo}: {String(insumo.saldoMili)}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantos-movimentos">{movimentos.length}</p>
      {movimentos.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista" data-teste="movimentos">
          {movimentos.map((m) => (
            <li key={m.id}>
              <span data-teste="tipo">{m.tipo}</span>
              <span>{String(m.quantidadeMili)}</span>
              <span data-teste="motivo">{m.motivo}</span>
              <span>{formatarHora(m.criadoEm, idioma)}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="movimentar" />
        <input type="hidden" name="itemId" value={insumo.id} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.movimentos} name="tipo">
          <option value="ENTRADA">{t.entrada}</option>
          <option value="AJUSTE">{t.ajuste}</option>
          <option value="QUEBRA">{t.quebra}</option>
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
