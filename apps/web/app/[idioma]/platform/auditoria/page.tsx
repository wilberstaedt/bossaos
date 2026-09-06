import { redirect } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { formatarDataHora } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { eUmaPessoa } from '@bossaos/domain';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-013 · «Registro de administración» (atlas p. 243)
 *
 * ── A tela que nos vigia a nós ────────────────────────────────────────────
 *
 * As acções da plataforma, todas, com a **pessoa** que as fez. E há um contador
 * que não devia poder ser maior do que zero: o das que estão assinadas por um
 * papel em vez de uma pessoa.
 *
 * Um gatilho da base já as recusa à entrada. Este contador existe para o caso de
 * alguém, um dia, desligar o gatilho «só por um minuto» — e nesse minuto o
 * número deixa de ser zero e fica assim para sempre, porque a auditoria é
 * append-only.
 */
export default async function AuditoriaGlobal({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const eventos = await comIdentidade(prisma, actor.id, (db) =>
    db.auditEvent.findMany({
      where: { accao: { startsWith: 'plataforma.' } },
      select: {
        id: true, accao: true, actorEmail: true, organizationId: true,
        motivo: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' }, take: 100,
    }));

  // O que não devia poder existir. Se for maior que zero, alguém desligou o
  // gatilho — e a auditoria é append-only, portanto fica lá.
  const porPapel = eventos.filter(
    (e: { actorEmail: string | null }) => e.actorEmail === null || !eUmaPessoa(e.actorEmail));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.painel}</p>
          <h1 data-tela="PLAT-013">{s.auditoriaGlobal}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="papel-nao-e-pessoa">{s.papelNaoEPessoa}</p>
      <p data-teste="quantas-por-papel">{porPapel.length}</p>

      <ul className="bo-lista bo-lista--blocos" data-teste="eventos">
        {eventos.map((e: {
          id: string; accao: string; actorEmail: string | null;
          motivo: string | null; createdAt: Date;
        }) => (
          <li key={e.id} data-teste="evento">
            <span className="bo-identificador">{e.accao}</span>
            <p className="bo-campo__ajuda" data-teste="quem">
              {e.actorEmail ?? '—'} · {formatarDataHora(e.createdAt, idioma)}
            </p>
            {e.motivo ? <p className="bo-campo__ajuda">{e.motivo}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
