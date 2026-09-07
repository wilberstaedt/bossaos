import { notFound, redirect } from 'next/navigation';
import { Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade } from '@bossaos/db';
import { estadoDaSessao } from '@bossaos/domain';
import { actorDoPedido } from '../../../../../src/sessao.ts';
import { obterBaseDeEcra } from '../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-009 · «Diagnóstico del tenant» (atlas p. 239)
 *
 * ── O que se mostra de uma casa sem entrar nela ───────────────────────────
 *
 * **Contagens e estado, nunca conteúdo.** Quantas unidades tem, se a subscrição
 * está activa, quantos trabalhos falharam, quem do suporte lá esteve.
 *
 * Nada disto exige uma sessão de suporte, e é deliberado: se o diagnóstico
 * mostrasse pedidos, produtos ou clientes, ver-se-ia a casa toda sem abrir
 * sessão nenhuma — e as quatro condições passavam a valer só para quem as
 * respeitasse.
 *
 * A linha é: **saber que algo está mal não exige ver o quê.**
 */
export default async function DiagnosticoDoInquilino({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgId: string }>;
}) {
  const { idioma, orgId } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterBaseDeEcra();
  const dados = await comIdentidade(prisma, actor.id, async (db) => {
    const org = await db.organization.findFirst({
      where: { id: orgId }, select: { id: true, slug: true, nome: true },
    });
    if (!org) return null;
    const [unidades, trabalhosFalhados, sessoes] = await Promise.all([
      db.location.count({ where: { organizationId: orgId } }),
      db.platformJob.count({ where: { organizationId: orgId, estado: 'FALHOU' } }),
      db.supportSession.findMany({
        where: { organizationId: orgId },
        select: { id: true, staffEmail: true, expiraEm: true, terminadaEm: true, abertaEm: true },
        orderBy: { abertaEm: 'desc' }, take: 10,
      }),
    ]);
    return { org, unidades, trabalhosFalhados, sessoes };
  });
  if (!dados) notFound();

  const agora = new Date();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dados.org.nome}</p>
          <h1 data-tela="PLAT-009">{s.diagnostico}</h1>
        </div>
      </div>

      {/* Contagens e estado. Nunca conteúdo. */}
      <p data-teste="unidades">{dados.unidades}</p>
      <p data-teste="trabalhos-falhados">{dados.trabalhosFalhados}</p>
      <p className="bo-campo__ajuda" data-teste="sem-conteudo">{s.vemosOQuePrecisamos}</p>

      <h2>{s.quemEntrou}</h2>
      <ul className="bo-lista bo-lista--blocos" data-teste="sessoes">
        {dados.sessoes.map((x: {
          id: string; staffEmail: string; abertaEm: Date; expiraEm: Date;
          terminadaEm: Date | null;
        }) => {
          const estado = estadoDaSessao(x, agora);
          return (
            <li key={x.id} data-teste="sessao">
              <span>{x.staffEmail}</span>{' '}
              <Etiqueta tom={estado === 'viva' ? 'aviso' : 'neutro'}>
                {estado === 'viva' ? s.sessaoViva
                  : estado === 'terminada' ? s.sessaoTerminada : s.sessaoExpirada}
              </Etiqueta>
              <p className="bo-campo__ajuda">{formatarDataHora(x.abertaEm, idioma)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
