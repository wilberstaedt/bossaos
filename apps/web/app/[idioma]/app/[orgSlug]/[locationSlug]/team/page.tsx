import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarEquipa } from '../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/** HR-001 · «El equipo del restaurante» (atlas) */
export default async function Equipa({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const { unidade, equipa } = await carregarEquipa(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/team`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="HR-001">{t.equipa}</h1>
        </div>
      </div>
      <p data-teste="marcacao-e-facto">{t.marcacaoEhFacto}</p>
      <p data-teste="quantas-pessoas">{equipa.length}</p>
      {equipa.length === 0 ? <p data-teste="sem-equipa">{t.semEquipa}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="equipa">
          {equipa.map((m) => (
            <li key={m.id}>
              <a className="bo-lista__ligacao" href={`${base}/${m.id}`}>{m.nome ?? m.email}</a>
              <span data-teste="email">{m.email}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="funcoes" href={`${base}/funcoes`}>{t.funcoes}</a>
        <a className="bo-botao" data-seccao="escala" href={`${base}/escala`}>{t.escala}</a>
        <a className="bo-botao" data-seccao="jornada" href={`${base}/jornada`}>{t.jornada}</a>
        <a className="bo-botao" data-seccao="picar" href={`${base}/picar`}>{t.picar}</a>
        <a className="bo-botao" data-seccao="horas" href={`${base}/horas`}>{t.horas}</a>
        <a className="bo-botao" data-seccao="correccao" href={`${base}/correccao`}>{t.correccao}</a>
        <a className="bo-botao" data-seccao="correccoes" href={`${base}/correccoes`}>{t.correccoes}</a>
        <a className="bo-botao" data-seccao="relatorio" href={`${base}/relatorio`}>{t.relatorio}</a>
      </nav>
    </div>
  );
}
