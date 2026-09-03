import { redirect } from 'next/navigation';
import { Aviso, Botao } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { catalogoDePlanos, estadoComercial } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { CartoesDePlano } from '../../../../../../src/componentes/CartoesDePlano.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORG-010 · "Tu plan BossaOS" (atlas p. 47)
 *
 * A mesma grelha do ONB-004, com o plano contratado marcado. O que é **lido da
 * base e não decorado**: qual é o plano actual, em que estado está a subscrição,
 * e se há uma descida agendada — que é o campo que o `estadoComercial` devolvia
 * sempre a `null` até esta etapa, e por isso dizia "nenhuma mudança agendada" a
 * quem tinha uma.
 */
export default async function PlanoDaOrganizacao({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { catalogo, estado } = await comEscopoDoPedido(sessao, async (db) => ({
    catalogo: await catalogoDePlanos(db),
    estado: await estadoComercial(db, sessao.contexto.organizationId),
  }));

  const rotuloDoEstado =
    estado.estadoSubscricao
      ? ((m.planos as unknown as Record<string, string>)[`estado${estado.estadoSubscricao}`] ?? estado.estadoSubscricao)
      : m.planos.semSubscricao;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.planos.sobrancelhaSubscricao}</p>
          <h1>{m.planos.tituloSubscricao}</h1>
        </div>
        <Botao>{m.planos.accaoSubscricao}</Botao>
      </div>

      <p className="bo-planos__actual">
        {m.planos.planoActual}: <strong>{estado.planoNome ?? m.planos.semSubscricao}</strong>
        {' · '}
        {rotuloDoEstado}
      </p>

      {estado.descerParaPlano && estado.descerEm ? (
        <Aviso tom="aviso" titulo={m.mudarPlano.sobrancelha}>
          {m.planos.descidaAgendada
            .replace('{plano}', estado.descerParaPlano)
            .replace('{data}', formatarData(estado.descerEm, idioma))}
        </Aviso>
      ) : null}

      <CartoesDePlano idioma={idioma} catalogo={catalogo} planoActual={estado.planoCodigo} />
    </div>
  );
}
