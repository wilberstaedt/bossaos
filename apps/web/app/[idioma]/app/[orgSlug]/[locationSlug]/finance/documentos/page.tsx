import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-011 · «Tus documentos» (atlas) — e os períodos.
 *
 * ── Fechar PROÍBE, e não copia totais ─────────────────────────────────────
 *
 * Não há aqui nenhum número guardado do fecho. Se houvesse, passava a ser uma
 * segunda verdade que envelhece — e reabrir para corrigir deixava dois números
 * a discordar sem ninguém saber qual vale.
 */
export default async function Documentos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="FIN-011">{t.documentos}</h1>
        </div>
      </div>
      <p data-teste="fechar-proibe">{t.fecharProibe}</p>
      <p data-teste="quantos-periodos">{b.periodos.length}</p>
      {b.periodos.length === 0 ? <p data-teste="sem-periodos">{t.semPeriodos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="periodos">
          {b.periodos.map((p) => (
            <li key={p.id}>
              <span data-teste="de">{p.de.toISOString().slice(0, 10)}</span>
              <span data-teste="ate">{p.ate.toISOString().slice(0, 10)}</span>
              <span data-teste={p.estado === 'FECHADO' ? 'fechado' : 'aberto'}>
                {p.estado === 'FECHADO' ? t.fechado : t.aberto}
              </span>
              <span data-teste="ajustes">{p.ajustes.length}</span>
              {p.acontecimentos.map((a) => (
                <span key={a.id} data-teste="acontecimento">
                  {a.tipo} · {a.autor}{a.motivo ? ` · ${a.motivo}` : ''}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_periodo" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.periodo} name="de" type="text" defaultValue={b.periodo.de} required />
        <Campo rotulo={t.ate} name="ate" type="text" defaultValue={b.periodo.ate} required />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
      {/* Fechar PROÍBE movimentos novos com data dentro. Não copia totais:
          se copiasse, passavam a ser uma segunda verdade que envelhece. */}
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="fechar" />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.periodo} name="periodId" required>
          {b.periodos.filter((p) => p.estado === 'ABERTO').map((p) => (
            <option key={p.id} value={p.id}>{p.de.toISOString().slice(0, 10)}</option>
          ))}
        </Seletor>
        <Botao type="submit">{t.fechar}</Botao>
      </form>
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="reabrir" />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.periodo} name="periodId" required>
          {b.periodos.map((p) => (
            <option key={p.id} value={p.id}>{p.de.toISOString().slice(0, 10)}</option>
          ))}
        </Seletor>
        {/* Reabrir sem motivo é um interruptor com outro nome. */}
        <Campo rotulo={t.motivo} name="motivo" required maxLength={200} />
        <Botao type="submit">{t.reabrir}</Botao>
      </form>
    </div>
  );
}
