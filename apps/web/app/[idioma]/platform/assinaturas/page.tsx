import { redirect } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-005 · «Suscripciones de la plataforma» (atlas p. 235)
 *
 * ── A tela onde o defeito desta etapa apareceria ──────────────────────────
 *
 * Se alguém tivesse conseguido dar-se a si próprio um plano por webhook, é aqui
 * que se veria — uma organização com um plano que ninguém lhe vendeu.
 *
 * Por isso esta tela mostra, ao lado das subscrições, **os eventos que ficaram
 * sem vínculo**: chegaram, a assinatura confere, e não há cliente nosso ligado.
 * Não é uma lista de erros — é a lista das vezes em que o sistema recusou mudar
 * alguma coisa, e é precisamente isso que se quer poder ver.
 *
 * E os que **alegaram outra organização** aparecem marcados. Um evento que
 * alegou o que não era é a assinatura de uma tentativa.
 */
export default async function AssinaturasDaPlataforma({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);

  // A `saas_billing_events` não tem inquilino — é o ponto da fronteira 4 — e
  // por isso lê-se pela identidade da plataforma, como as outras telas daqui.
  const eventos = await comIdentidade(prisma, actor.id, (db) =>
    db.saasBillingEvent.findMany({
      select: {
        id: true, provedor: true, tipo: true, estado: true, motivo: true,
        organizationIdAlegado: true, organizationIdResolvido: true, recebidoEm: true,
      },
      orderBy: { recebidoEm: 'desc' }, take: 50,
    }));

  const semVinculo = eventos.filter(
    (e: { estado: string }) => e.estado === 'SEM_VINCULO');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.dinheiroDoSaas}</p>
          <h1 data-tela="PLAT-005">{s.assinaturas}</h1>
        </div>
      </div>

      <div data-teste="sem-provedor">
        <Aviso tom="info" titulo={s.semProvedor}>{s.semProvedorAjuda}</Aviso>
      </div>

      <h2>{s.eventosPorResolver}</h2>
      <p className="bo-campo__ajuda" data-teste="sem-vinculo-ajuda">{s.semVinculoAjuda}</p>
      <p data-teste="quantos-sem-vinculo">{semVinculo.length}</p>

      {eventos.length === 0 ? (
        <p data-teste="sem-eventos">{s.semEventos}</p>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="eventos">
          {eventos.map((e: {
            id: string; provedor: string; tipo: string; estado: string;
            motivo: string | null; organizationIdAlegado: string | null;
            organizationIdResolvido: string | null; recebidoEm: Date;
          }) => (
            <li key={e.id} data-teste="evento">
              <span>{e.provedor} · {e.tipo}</span>{' '}
              <Etiqueta tom={
                e.estado === 'APLICADO' ? 'sucesso'
                  : e.estado === 'RECUSADO' ? 'perigo' : 'aviso'
              }>{e.estado}</Etiqueta>
              {/* A tentativa fica visível. Um evento que alegou o que não era é
                  a coisa que alguém vai querer encontrar daqui a um ano. */}
              {e.organizationIdAlegado
                && e.organizationIdAlegado !== e.organizationIdResolvido ? (
                <Etiqueta tom="perigo">{s.alegou}</Etiqueta>
              ) : null}
              <p className="bo-campo__ajuda">
                {formatarDataHora(e.recebidoEm, idioma)}
                {e.motivo ? ` · ${e.motivo}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
