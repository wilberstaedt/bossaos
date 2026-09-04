import { redirect } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { listarEstacoes, listarUnidades } from '@bossaos/db';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-008 · «Conecta cocina y barra» (atlas p. 55)
 *
 * ── Diz o que acontece se ficar por fazer ─────────────────────────────────
 *
 * Um passo de arranque que se pode saltar tem de dizer o **custo** de o saltar.
 * Aqui o custo é concreto: sem estações e sem regras, tudo o que for pedido
 * aparece como **não encaminhado** — e isso é de propósito, porque ausência de
 * regra não é «cozinha por omissão».
 *
 * Não há uma configuração de exemplo a preencher isto por conveniência. Um
 * roteamento inventado é uma decisão do dono tomada por nós, e escondida.
 */
export default async function LigarCozinhaEBalcao({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const s = m.kdsE16;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const orgs = await organizacoesDoActor(actor.id);
  const org = orgs[0];
  if (!org) redirect(`/${idioma}/auth/organizations`);

  const sessao = await resolverPedido(org.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { unidades, porUnidade } = await comEscopoDoPedido(sessao, async (db) => {
    const us = await listarUnidades(db);
    const mapa: Record<string, number> = {};
    for (const u of us) mapa[u.id] = (await listarEstacoes(db, u.id)).length;
    return { unidades: us, porUnidade: mapa };
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{org.slug}</p>
          <h1 data-tela="ONB-008">{s.ligarCozinha}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda">{s.ligarCozinhaAjuda}</p>
      <p data-teste="quantas">{unidades.length}</p>

      {unidades.length === 0 ? (
        <div data-teste="sem-unidades">
          <Aviso tom="aviso" titulo={s.ligarCozinha}>{s.semEstacoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="unidades">
          {unidades.map((u: { id: string; nome: string; slug: string }) => (
            <li key={u.id} className="bo-publico__produto" data-teste="unidade"
                data-estacoes={porUnidade[u.id] ?? 0}>
              <a href={`/${idioma}/app/${org.slug}/${u.slug}/settings/ecras`} data-seccao="SET-006">
                <span className="bo-publico__nome">{u.nome}</span>
                <span className="bo-publico__preco">{porUnidade[u.id] ?? 0}</span>
              </a>
              <p className="bo-publico__descricao">
                {/* Zero estações não é um número tranquilizador: é a frase. */}
                {(porUnidade[u.id] ?? 0) === 0 ? s.semEstacoes : s.cadaProdutoASuaEstacao}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Cartao titulo={s.passar}>
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/onboarding/pronto`}>
            {s.passar}
          </a>
        </div>
      </Cartao>
    </div>
  );
}
