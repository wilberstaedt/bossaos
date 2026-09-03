import { redirect } from 'next/navigation';
import { Aviso, Botao, Cartao } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { catalogoDePlanos, estadoComercial, previaDeDescidaParaPlano } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { CartoesDePlano } from '../../../../../../../src/componentes/CartoesDePlano.tsx';
import { TEXTO_DA_CAPACIDADE } from '../../../../../../../src/componentes/planos.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-014 · "Cambiar de plan" (atlas p. 51)
 *
 * O objectivo escrito no atlas é *"Comparacao funcional, impacto, data efetiva e
 * confirmacao"* — o impacto é a parte que não se desenha sozinha.
 *
 * **A prévia sai da mesma chamada que a efectivação faz.**
 * `previaDeDescidaParaPlano` é a função que o trabalho de fundo usa para decidir
 * se reverte o tema. Não são duas contas a dar o mesmo: é a mesma conta. Duas
 * dariam o mesmo resultado até ao dia em que uma delas mudasse, e nesse dia este
 * ecrã prometia uma coisa e o worker fazia outra.
 *
 * E o que se diz a quem está a descer é o que o atlas diz no STATE-006: **os
 * dados conservam-se**. Descer bloqueia operações novas; não apaga o que existe.
 */
export default async function MudarDePlano({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams?: Promise<{ para?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { catalogo, estado, previa } = await comEscopoDoPedido(sessao, async (db) => {
    const estadoActual = await estadoComercial(db, sessao.contexto.organizationId);
    // Sem destino escolhido, previsualiza-se o que JÁ está agendado. É o caso
    // que interessa a quem abre a página: "o que é que me vai acontecer?".
    const destino = estadoActual.descerParaPlano;
    return {
      catalogo: await catalogoDePlanos(db),
      estado: estadoActual,
      previa: destino ? await previaDeDescidaParaPlano(db, sessao.contexto.organizationId, destino) : null,
    };
  });

  const agora = new Set(estado.concessoes.map((c) => c.capacidade));
  const depois = new Set(previa?.depois.concessoes.map((c) => c.capacidade) ?? []);
  const perdidas = [...agora].filter((c) => !depois.has(c));

  const nomeDe = (capacidade: string) =>
    (m.planos.destaques as Record<string, string>)[TEXTO_DA_CAPACIDADE[capacidade] ?? ''] ?? capacidade;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.mudarPlano.sobrancelha}</p>
          <h1>{m.mudarPlano.titulo}</h1>
        </div>
        <Botao>{m.mudarPlano.accao}</Botao>
      </div>

      {previa && estado.descerParaPlano ? (
        <Cartao titulo={m.mudarPlano.impacto.replace('{plano}', estado.descerParaPlano)}>
          <dl className="bo-estado__factos">
            <dt>{m.mudarPlano.perde}</dt>
            <dd>
              {perdidas.length > 0
                ? [...new Set(perdidas.map(nomeDe))].join(' · ')
                : m.mudarPlano.nadaSePerde}
            </dd>
            <dt>{m.mudarPlano.mantem}</dt>
            {/* A frase que baixa a tensão de quem lê, e é verdade: a descida
                desactiva a revisão do tema, não a apaga. */}
            <dd>{m.mudarPlano.dados}</dd>
            <dt>{m.mudarPlano.efectivo}</dt>
            <dd>{estado.descerEm ? formatarData(estado.descerEm, idioma) : '—'}</dd>
          </dl>
        </Cartao>
      ) : (
        <Aviso titulo={m.mudarPlano.sobrancelha}>{m.mudarPlano.semDescida}</Aviso>
      )}

      <CartoesDePlano idioma={idioma} catalogo={catalogo} planoActual={estado.planoCodigo} />
    </div>
  );
}
