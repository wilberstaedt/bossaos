import { redirect } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades, listarMesas, listarZonas } from '@bossaos/db';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-007 · «Dibuja sala y terraza» (atlas p. 36)
 *
 * ── O passo do arranque que NÃO cria nada por si ─────────────────────────
 *
 * Este ecrã mostra o que já existe e leva à sala a sério. Não duplica os
 * formulários do FLOOR-001 e do FLOOR-002: dois sítios a criar mesas divergem no
 * dia em que um deles ganhar um campo, e o sintoma é uma mesa criada pelo
 * arranque que a sala não sabe editar.
 *
 * ── E não inventa uma sala «típica» ──────────────────────────────────────
 *
 * A tentação do arranque é oferecer «10 mesas de 4» com um botão. Uma sala
 * inventada é dado falso na tabela que decide o serviço todo — e ninguém apaga
 * dez mesas que não existem; corrige-as uma a uma durante meses.
 */
export default async function ArranqueDaSala({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const s = m.salaE13;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const organizacoes = await organizacoesDoActor(actor.id);
  const primeira = organizacoes[0];
  if (!primeira) redirect(`/${idioma}/onboarding/organizacao`);

  const sessao = await resolverPedido(primeira.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const unidade = unidades[0] ?? null;
    return {
      unidade,
      zonas: unidade ? await listarZonas(db, unidade.id) : [],
      mesas: unidade ? await listarMesas(db, unidade.id) : [],
    };
  });

  if (!dados.unidade) redirect(`/${idioma}/onboarding/unidade`);
  const base = `/${idioma}/app/${primeira.slug}/${dados.unidade.slug}/floor`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dados.unidade.nome}</p>
          <h1>{s.desenharSala}</h1>
        </div>
      </div>

      <Cartao titulo={s.zonas}>
        <dl className="bo-estado__factos">
          <dt>{s.zonas}</dt>
          <dd>{dados.zonas.length}</dd>
          <dt>{s.mesas}</dt>
          <dd>{dados.mesas.length}</dd>
        </dl>
        {dados.zonas.length === 0 ? <Aviso titulo={s.zonas}>{s.semZonas}</Aviso> : null}
        {dados.zonas.length > 0 && dados.mesas.length === 0 ? (
          <Aviso titulo={s.mesas}>{s.semMesas}</Aviso>
        ) : null}
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--primario" href={`${base}/zonas`}>{s.zonas}</a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/mesas`}>{s.mesas}</a>
          {/* O passo da cozinha entra ANTES do «pronto»: sem estações e sem
              regras, tudo o que for pedido nasce não encaminhado — e é melhor
              descobri-lo aqui do que no primeiro serviço. */}
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/onboarding/cozinha`}
             data-seccao="ONB-008">{m.kdsE16.ligarCozinha}</a>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/onboarding/pronto`}>
            {m.comum.guardar}
          </a>
        </div>
      </Cartao>
    </div>
  );
}
