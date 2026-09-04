import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { porCanal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { janelaDoServico } from '../../../../../../../src/janela-do-servico.ts';
import { NavegacaoDeRelatorios } from '../../../../../../../src/componentes/NavegacaoDeRelatorios.tsx';
import { TabelaDeRelatorio } from '../../../../../../../src/componentes/TabelaDeRelatorio.tsx';

export const dynamic = 'force-dynamic';

/**
 * Relatório operacional do E14 — somado dos INSTANTÂNEOS das linhas aceites.
 *
 * Nenhuma destas páginas toca no catálogo: o relatório de ontem não muda porque
 * hoje se publicou um preço novo. É o aceite 3 visto de longe.
 */
export default async function RelatorioAgrupado({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const janela = janelaDoServico(unidade.fuso);
  const linhas = janela
    ? await comEscopoDoPedido(sessao, (db) => porCanal(db, unidade.id, janela.de, janela.ate))
    : [];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.vendas}</h1>
        </div>
      </div>

      <NavegacaoDeRelatorios idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/canais" />

      {!janela ? (
        <Aviso tom="aviso" titulo={p.vendas}>{m.salaE13.semFuso}</Aviso>
      ) : (
        <TabelaDeRelatorio idioma={idioma} titulo={p.vendas} linhas={linhas} />
      )}
    </div>
  );
}
