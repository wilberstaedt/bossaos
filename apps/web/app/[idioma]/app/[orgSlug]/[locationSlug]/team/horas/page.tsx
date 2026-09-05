import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarHoras } from '../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/** HR-008 · «Revisa las horas» (atlas) — previsto e real, lado a lado. */
export default async function Horas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarHoras(idioma, orgSlug, locationSlug);
  const comAlgo = b.jornadas.filter(
    (j) => j.jornada.entradas > 0 || j.jornada.previstoMinutos !== null,
  );

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.diaDeServico}</p>
          <h1 data-tela="HR-008">{t.horas}</h1>
        </div>
      </div>
      <p data-teste="minutos-inteiros">{t.minutosInteiros}</p>
      <p data-teste="quantas-jornadas">{comAlgo.length}</p>
      {comAlgo.length === 0 ? <p data-teste="sem-marcacoes">{t.semMarcacoes}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="jornadas">
          {comAlgo.map((j) => (
            <li key={j.membershipId}>
              <span data-teste="quem">{j.nome}</span>
              <span data-teste="previsto">{j.jornada.previstoMinutos ?? '—'}</span>
              <span data-teste="real">{j.jornada.realMinutos}</span>
              {j.jornada.diferencaMinutos === null ? null : (
                j.jornada.diferencaMinutos === 0
                  ? <span data-teste="sem-diferenca">{t.semDiferenca}</span>
                  : <span data-teste="diferenca">{j.jornada.diferencaMinutos}</span>
              )}
              {j.jornada.aberta ? <span data-teste="aberta">{t.aberta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
