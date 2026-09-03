import { redirect } from 'next/navigation';
import { Botao, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { arranqueDaOrganizacao } from '@bossaos/db';
import { pendentesDoArranque } from '@bossaos/domain';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-010 · "Todo listo para empezar" (atlas p. 37, passo 10 de 10)
 *
 * ── É esta a tela do aceite 3 ──────────────────────────────────────────────
 *
 * > *"Onboarding Starter pode chegar ao passo de catálogo sem exigir etapas
 * > Restaurant/Pro."*
 *
 * A lista **adapta-se ao plano**: no Starter, o pedido de prova não aparece como
 * pendente — aparece como não aplicável, e não conta. Uma lista fixa com dois
 * itens impossíveis num Starter é uma lista que nunca fica verde, e uma lista
 * que nunca fica verde ensina a ignorá-la.
 *
 * E metade do que o atlas desenha — carta revista, QR lido em dois aparelhos —
 * depende de módulos que ainda não existem. Esses estão **por medir**, com a
 * razão escrita. Um visto verde ao lado deles seria a coisa mais fácil de
 * desenhar e a mais fácil de acreditar.
 */
export default async function TudoPronto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { idioma } = await params;
  const { org } = await searchParams;
  const m = mensagensDe(idioma);
  const a = m.arranque;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const minhas = await organizacoesDoActor(actor.id);
  const activa = minhas.find((o) => o.slug === org) ?? minhas.find((o) => o.estado === 'ACTIVO');
  if (!activa) redirect(`/${idioma}/onboarding/organizacao`);

  const sessao = await resolverPedido(activa.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const { itens } = await comEscopoDoPedido(sessao, (db) =>
    arranqueDaOrganizacao(db, sessao.contexto.organizationId));

  const pendentes = pendentesDoArranque(itens);
  const rotulo = (chave: string) =>
    (a as unknown as Record<string, string>)[`item${chave[0]!.toUpperCase()}${chave.slice(1)}`] ?? chave;
  const razao = (r?: string) =>
    r ? ((a as unknown as Record<string, string>)[`razao${r[0]!.toUpperCase()}${r.slice(1)}`] ?? r) : '';

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{a.passo.replace('{n}', '10')}</p>
          <h1>{a.pronto.titulo}</h1>
        </div>
        <Botao disabled={pendentes.length > 0}>{a.pronto.accao}</Botao>
      </div>

      <div className="bo-plataforma__lista">
        {itens.map((i) => (
          <Cartao key={i.chave} className="bo-plataforma__linha">
            <span>
              <span className="bo-tema__rotulo">{rotulo(i.chave)}</span>
              {i.estado === 'por_medir' ? <span className="bo-uso__nota">{razao(i.razao)}</span> : null}
            </span>
            {/* A etiqueta é sempre TEXTO. O atlas desenha vistos e caixas; um
                visto sozinho não diz nada a quem não distingue as cores, e
                "não se aplica" não tem símbolo nenhum que o exprima. */}
            <Etiqueta tom={i.estado === 'feito' ? 'sucesso' : i.estado === 'pendente' ? 'aviso' : 'neutro'}>
              {i.estado === 'feito' ? a.feito
                : i.estado === 'pendente' ? a.pendente
                : i.estado === 'nao_aplicavel' ? a.naoAplicavel
                : a.porMedir}
            </Etiqueta>
          </Cartao>
        ))}
      </div>

      <p className="bo-planos__nota">
        {pendentes.length === 0
          ? a.podeSeguir
          : a.faltam.replace('{n}', formatarNumero(pendentes.length, idioma))}
      </p>
    </div>
  );
}
