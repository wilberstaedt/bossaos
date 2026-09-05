import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarPessoa } from '../../../../../../../src/ponto/pagina.ts';
import { resolverPedido } from '../../../../../../../src/sessao.ts';
import { notFound } from 'next/navigation';
import { equipaDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-006 · «Mi jornada» (atlas) — a jornada de quem está a ver.
 *
 * ── É esta a tela que torna o registo verificável por quem picou ──────────
 *
 * A régua diz que não basta estar certo: tem de ser verificável por quem picou
 * o ponto. Um registo que só o encarregado consegue ver é um registo que a
 * pessoa não pode contestar — e é ela quem tem menos poder para o fazer.
 */
export default async function MinhaJornada({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const equipa = await comEscopoDoPedido(sessao,
    (db) => equipaDaUnidade(db, sessao.contexto.organizationId));
  const eu = equipa.find((m) => m.userId === sessao.contexto.actorId) ?? equipa[0];
  if (!eu) notFound();
  const b = await carregarPessoa(idioma, orgSlug, locationSlug, eu.id);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.diaDeServico}</p>
          <h1 data-tela="HR-006">{t.jornada}</h1>
        </div>
      </div>
      <p data-teste="marcacao-e-facto">{t.marcacaoEhFacto}</p>
      <p data-teste="real">{b.jornada.realMinutos}</p>
      <p data-teste="previsto">{b.jornada.previstoMinutos ?? '—'}</p>
      <p data-teste="diferenca">
        {b.jornada.diferencaMinutos === null ? '—' : b.jornada.diferencaMinutos}
      </p>
      {b.jornada.aberta ? (
        <p data-teste="aberta">{t.abertaExplica}</p>
      ) : <p data-teste="fechada">{t.fechada}</p>}
      <p data-teste="quantas-marcacoes">{b.marcacoes.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="marcacoes">
        {b.marcacoes.map((m) => (
          <li key={m.id}>
            <span data-teste="tipo">{m.tipo === 'ENTRADA' ? t.entrada : t.saida}</span>
            <span data-teste="momento">{m.momento.toISOString().slice(11, 16)}</span>
            {m.corrigida ? <span data-teste="corrigida">{t.corrigida}</span> : null}
            {m.motivo ? <span data-teste="motivo">{m.motivo}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
