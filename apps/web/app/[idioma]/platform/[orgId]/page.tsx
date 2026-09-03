import { notFound, redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { formatarData, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma, organizacaoDaPlataforma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-003 · "La Societat · Organización" (atlas p. 361)
 *
 * Seis campos no atlas: plano, unidades, usuarios, **dispositivos**, estado,
 * soporte. Quatro medem-se hoje. Dois não:
 *
 * - **Dispositivos** exige um registo de aparelhos que é de outra etapa;
 * - **Soporte** exige casos de suporte, que são a E33.
 *
 * Dizem "aún no medido" em vez de trazerem um número. É a mesma decisão do
 * ORG-013 e pela mesma razão: este é um ecrã onde alguém decide se liga a um
 * cliente, e um "4 dispositivos" inventado leva a uma conversa errada.
 */
export default async function DetalheDoTenant({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgId: string }>;
}) {
  const { idioma, orgId } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const org = await comIdentidade(prisma, actor.id, (db) => organizacaoDaPlataforma(db, orgId));
  if (!org) notFound();

  const factos: Array<{ rotulo: string; valor: string; ausente?: boolean }> = [
    { rotulo: m.plataforma.campoPlano, valor: org.plano ?? '—' },
    { rotulo: m.plataforma.campoUnidades, valor: formatarNumero(org.unidades, idioma) },
    { rotulo: m.plataforma.campoUtilizadores, valor: formatarNumero(org.utilizadores, idioma) },
    { rotulo: m.plataforma.campoDispositivos, valor: m.plataforma.semDispositivos, ausente: true },
    { rotulo: m.plataforma.campoEstado, valor: org.estado },
    { rotulo: m.plataforma.campoSuporte, valor: m.plataforma.semSuporte, ausente: true },
  ];
  if (org.descerPara && org.descerEm) {
    factos.push({
      rotulo: m.mudarPlano.sobrancelha,
      valor: `${org.descerPara} · ${formatarData(org.descerEm, idioma)}`,
    });
  }

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.plataforma.sobrancelhaTenant}</p>
          <h1>{org.nome}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`/${idioma}/platform/${org.id}/entitlements`}>
          {m.plataforma.accaoDiagnostico}
        </a>
      </div>

      <Cartao variante="contornado" className="bo-plataforma__banner">
        <p className="bo-plataforma__banner-titulo">{m.plataforma.bannerTitulo}</p>
        <p className="bo-plataforma__banner-detalhe">{m.plataforma.bannerDetalhe}</p>
      </Cartao>

      <dl className="bo-estado__factos">
        {factos.map((f) => (
          <div key={f.rotulo}>
            <dt>{f.rotulo}</dt>
            <dd className={f.ausente ? 'bo-uso__valor--ausente' : undefined}>{f.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
