import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { porFranja } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { horaLocalDe, janelaDoServico } from '../../../../../../../src/janela-do-servico.ts';
import { NavegacaoDeRelatorios } from '../../../../../../../src/componentes/NavegacaoDeRelatorios.tsx';
import { TabelaDeRelatorio } from '../../../../../../../src/componentes/TabelaDeRelatorio.tsx';

export const dynamic = 'force-dynamic';

/**
 * REP-006 · «Cada franja del servicio» (atlas p. 156)
 *
 * ── A hora é a do SÍTIO ──────────────────────────────────────────────────
 *
 * Agrupar por hora é a operação onde o fuso mais se paga: com a hora do servidor,
 * o pico do jantar aparece à hora do almoço e ninguém desconfia — é um gráfico
 * com forma. `horaLocalDe` converte pelo fuso da unidade, e sem fuso a página
 * recusa-se a agrupar.
 */
export default async function PorFranja({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const janela = janelaDoServico(unidade.fuso);
  const linhas = janela && unidade.fuso
    ? (await comEscopoDoPedido(sessao, (db) =>
        porFranja(db, unidade.id, janela.de, janela.ate, horaLocalDe(unidade.fuso!))))
        .map((f) => ({
          chave: `${String(f.hora).padStart(2, '0')}:00`,
          quantidade: f.quantidade,
          valorOperacionalMenor: f.valorOperacionalMenor,
          moeda: f.moeda,
        }))
    : [];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}{unidade.fuso ? ` · ${unidade.fuso}` : ''}</p>
          <h1>{p.porFranja}</h1>
        </div>
      </div>

      <NavegacaoDeRelatorios idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/franjas" />

      {!janela ? (
        <Aviso tom="aviso" titulo={p.porFranja}>{m.salaE13.semFuso}</Aviso>
      ) : (
        <TabelaDeRelatorio idioma={idioma} titulo={p.porFranja} linhas={linhas} />
      )}
    </div>
  );
}
