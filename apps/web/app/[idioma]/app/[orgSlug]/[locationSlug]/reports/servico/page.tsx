import { Aviso, Cartao } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { resumoDoServico } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { janelaDoServico } from '../../../../../../../src/janela-do-servico.ts';
import { NavegacaoDeRelatorios } from '../../../../../../../src/componentes/NavegacaoDeRelatorios.tsx';

export const dynamic = 'force-dynamic';

/**
 * REP-002 · «Tu servicio de hoy» (atlas p. 152)
 *
 * ── «Hoje» é o dia DA UNIDADE ────────────────────────────────────────────
 *
 * Sem fuso configurado não há dia, e a página diz isso em vez de somar a
 * meia-noite do servidor. É a mesma regra do E06 e do agendamento de descidas do
 * E12 — e o sintoma de a ignorar seria um relatório com metade de ontem, com
 * números que parecem números.
 */
export default async function ServicoDeHoje({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const janela = janelaDoServico(unidade.fuso);
  const resumo = janela
    ? await comEscopoDoPedido(sessao, (db) => resumoDoServico(db, unidade.id, janela.de, janela.ate))
    : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.servicoDeHoje}</h1>
        </div>
      </div>

      <NavegacaoDeRelatorios idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/servico" />

      {!janela ? (
        <Aviso tom="aviso" titulo={p.servicoDeHoje}>{m.salaE13.semFuso}</Aviso>
      ) : (
        <>
          <Aviso tom="info" titulo={p.valorOperacional}>{p.naoEReceita}</Aviso>
          <Cartao titulo={p.servicoDeHoje}>
            <dl className="bo-estado__factos">
              <dt>{p.pedidosContados}</dt>
              <dd>{resumo!.pedidos}</dd>
              <dt>{p.aceite}</dt>
              <dd>{resumo!.linhasAceites}</dd>
              <dt>{p.rejeitada}</dt>
              <dd>{resumo!.linhasRejeitadas}</dd>
              <dt>{p.valorOperacional}</dt>
              <dd>
                {resumo!.valorOperacionalMenor !== null && resumo!.moeda
                  ? formatarDinheiro(
                      { montanteMenor: resumo!.valorOperacionalMenor, moeda: resumo!.moeda }, idioma)
                  : p.semTotal}
              </dd>
            </dl>
          </Cartao>
        </>
      )}
    </div>
  );
}
