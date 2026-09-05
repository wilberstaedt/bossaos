import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarPessoa } from '../../../../../../../src/ponto/pagina.ts';
import { horaDaMarcacao } from '../../../../../../../src/ponto/horas.ts';

export const dynamic = 'force-dynamic';

/** HR-002 · «Perfil de Alex» (atlas) — o dia de hoje, na hora da casa. */
export default async function Pessoa({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; membershipId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, membershipId } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarPessoa(idioma, orgSlug, locationSlug, membershipId);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.pessoa}</p>
          <h1 data-tela="HR-002">{b.pessoa.nome ?? b.pessoa.email}</h1>
        </div>
      </div>
      <p data-teste="email">{b.pessoa.email}</p>
      <p data-teste="dia">{b.diaDeServico}</p>
      <p data-teste="dia-de-servico">{t.diaDeServico}</p>
      <p data-teste="real">{b.jornada.realMinutos}</p>
      <p data-teste="previsto">{b.jornada.previstoMinutos ?? '—'}</p>
      {b.jornada.aberta ? <p data-teste="aberta">{t.aberta}</p> : null}
      <p data-teste="quantas-marcacoes">{b.marcacoes.length}</p>
      {b.marcacoes.length === 0 ? <p data-teste="sem-marcacoes">{t.semMarcacoes}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="marcacoes">
          {b.marcacoes.map((m) => (
            <li key={m.id}>
              <span data-teste="tipo">{m.tipo === 'ENTRADA' ? t.entrada : t.saida}</span>
              <span data-teste="momento">{horaDaMarcacao(m.momento, b.fuso, b.diaDeServico)}</span>
              {m.corrigida ? <span data-teste="corrigida">{t.corrigida}</span> : null}
              {m.ehCorreccao ? (
                <span data-teste={m.autocorreccao ? 'autocorreccao' : 'por-terceiro'}>
                  {m.autocorreccao ? t.autocorreccao : t.porTerceiro}
                </span>
              ) : null}
              {m.motivo ? <span data-teste="motivo">{m.motivo}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
