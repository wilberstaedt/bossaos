import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarHoras } from '../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/** HR-011 · «Horas por equipo» (atlas) — o total do dia, em minutos inteiros. */
export default async function Relatorio({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarHoras(idioma, orgSlug, locationSlug);
  const comHoras = b.jornadas.filter((j) => j.jornada.realMinutos > 0);
  // A soma faz-se em inteiros. Somar horas com vírgula dava 40.99999999 no fim
  // do mês, e o fim do mês é onde isto se transforma num recibo.
  const total = comHoras.reduce((s, j) => s + j.jornada.realMinutos, 0);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.diaDeServico}</p>
          <h1 data-tela="HR-011">{t.relatorio}</h1>
        </div>
      </div>
      <p data-teste="minutos-inteiros">{t.minutosInteiros}</p>
      <p data-teste="quantas-pessoas">{comHoras.length}</p>
      <p data-teste="total">{total}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="totais">
        {comHoras.map((j) => (
          <li key={j.membershipId}>
            <span data-teste="quem">{j.nome}</span>
            <span data-teste="minutos">{j.jornada.realMinutos}</span>
            <span data-teste="correccoes">{j.jornada.correccoes}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
