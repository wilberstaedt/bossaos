import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { caixaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-017 · «Cuenta el efectivo» (atlas)
 *
 * ── O contado é o ÚNICO número que uma pessoa escreve ─────────────────────
 *
 * O esperado sai dos movimentos e a diferença é a subtracção. Não há campo de
 * diferença neste formulário porque não há coluna de diferença na base: uma
 * diferença que se escreve é uma diferença que se pode escrever a zero.
 */
export default async function ContagemDeCaixa({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; registerId: string }> }) {
  const { idioma, locationId, registerId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { caixa, resumo, orgSlug } = await caixaDoTpv(idioma, locationId, registerId);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: resumo.moeda }, idioma);
  const base = `/${idioma}/pos/${locationId}/caixa/${registerId}`;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{caixa.nome}</p>
          <h1 data-tela="POS-017">{t.contagem}</h1>
        </div>
      </div>
      <p data-teste="fundo">{t.fundo} {d(resumo.fundoMenor)}</p>
      <p data-teste="entradas">{t.entrada} {d(resumo.entradasMenor)}</p>
      <p data-teste="saidas">{t.saida} {d(resumo.saidasMenor)}</p>
      <p data-teste="esperado">{t.esperado} {d(resumo.esperadoMenor)}</p>
      <p data-teste="esperado-ajuda">{t.esperadoAjuda}</p>

      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="contar" />
        <input type="hidden" name="registerId" value={caixa.id} />
        <input type="hidden" name="locationId" value={locationId} />
        <Campo rotulo={t.contado} name="contado" type="text" inputMode="decimal" required  />
        <Botao type="submit">{t.guardar}</Botao>
      </form>

      {resumo.contadoMenor !== null && (
        <>
          <p data-teste="contado">{t.contado} {d(resumo.contadoMenor)}</p>
          <p data-teste="diferenca">{t.diferenca} {d(resumo.diferencaMenor ?? 0)}</p>
        </>
      )}
      <nav className="bo-lista">
        <a data-seccao="movimento" href={`${base}/movimento`}>{t.movimento}</a>
        <a data-seccao="fecho" href={`${base}/fecho`}>{t.fecho}</a>
      </nav>
    </div>
  );
}
