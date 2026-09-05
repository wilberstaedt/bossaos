import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarEscala, hojeDaCasa } from '../../../../../../../src/ponto/pagina.ts';
import { horaDoMinuto } from '../../../../../../../src/ponto/horas.ts';

export const dynamic = 'force-dynamic';

/** HR-004 · «Planifica la semana» (atlas) */
export default async function Escala({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/team/escala`;
  // A semana conta-se a partir do dia de serviço de HOJE, na hora da casa.
  const provisorio = await carregarEscala(idioma, orgSlug, locationSlug, '2000-01-01', '2000-01-01');
  const fuso = provisorio.unidade.fuso ?? 'Europe/Madrid';
  const hoje = hojeDaCasa(fuso);
  const de = new Date(`${hoje}T00:00:00Z`);
  de.setUTCDate(de.getUTCDate() - 7);
  const ate = new Date(`${hoje}T00:00:00Z`);
  ate.setUTCDate(ate.getUTCDate() + 7);
  const b = await carregarEscala(
    idioma, orgSlug, locationSlug,
    de.toISOString().slice(0, 10), ate.toISOString().slice(0, 10),
  );

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="HR-004">{t.escala}</h1>
        </div>
      </div>
      <p data-teste="dia-de-servico">{t.diaDeServico}</p>
      <p data-teste="quantos-turnos">{b.turnos.length}</p>
      {b.turnos.length === 0 ? <p data-teste="sem-turnos">{t.semTurnos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="turnos">
          {b.turnos.map((s) => (
            <li key={s.id}>
              <span data-teste="dia">{s.diaDeServico.toISOString().slice(0, 10)}</span>
              <span data-teste="quem">{b.nomeDe(s.membro.id)}</span>
              <span data-teste="funcao">{s.funcao?.nome ?? '—'}</span>
              <span data-teste="inicio">{horaDoMinuto(s.inicioMinutos)}</span>
              <span data-teste="fim">{horaDoMinuto(s.fimMinutos)}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="novo-turno" href={`${base}/novo`}>{t.novoTurno}</a>
      </nav>
    </div>
  );
}
