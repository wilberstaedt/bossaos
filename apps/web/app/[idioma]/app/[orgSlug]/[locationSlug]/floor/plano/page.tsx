import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMesas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-004 · «Organiza el espacio» (atlas p. 116)
 *
 * ── O que este ecrã NÃO faz, e é uma decisão ─────────────────────────────
 *
 * Não arrasta mesas com o rato. Arrastar exige JavaScript, e a sala é o sítio do
 * produto onde o JavaScript falha mais: tablet velho, rede do restaurante, mão
 * molhada. As coordenadas editam-se no ecrã da mesa, e este mostra o desenho que
 * elas produzem.
 *
 * Não é uma versão reduzida à espera da boa: é a que funciona sempre. Se o
 * arrastar entrar, entra por cima disto e não em vez disto.
 *
 * ── As mesas por colocar aparecem à parte, e não no canto ────────────────
 *
 * `posX`/`posY` são anuláveis. Desenhar uma mesa sem posição em `0,0` juntava
 * todas as que faltam colocar no mesmo sítio e fazia o desenho mentir sobre a
 * sala. Aqui elas aparecem numa lista, com o nome do que são: por colocar.
 */
export default async function PlanoDaSala({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const mesas = await comEscopoDoPedido(sessao, (db) => listarMesas(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  const colocadas = mesas.filter((x) => x.posX !== null && x.posY !== null);
  const porColocar = mesas.filter((x) => x.posX === null || x.posY === null);
  const largura = Math.max(10, ...colocadas.map((x) => (x.posX ?? 0) + 2));
  const altura = Math.max(6, ...colocadas.map((x) => (x.posY ?? 0) + 2));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.plano}</h1>
        </div>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/plano" />

      {mesas.length === 0 ? <Aviso titulo={s.mesas}>{s.semMesas}</Aviso> : null}

      {colocadas.length > 0 ? (
        <div
          className="bo-plano"
          style={{ gridTemplateColumns: `repeat(${largura}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${altura}, auto)` }}
        >
          {colocadas.map((mesa) => (
            <a key={mesa.id} className="bo-plano__mesa" href={`${base}/mesas/${mesa.id}`}
               style={{ gridColumn: (mesa.posX ?? 0) + 1, gridRow: (mesa.posY ?? 0) + 1 }}>
              <span className="bo-plano__codigo">{mesa.codigo}</span>
              <span className="bo-plano__capacidade">{mesa.capacidade}</span>
            </a>
          ))}
        </div>
      ) : null}

      {porColocar.length > 0 ? (
        <section aria-labelledby="por-colocar">
          <h2 id="por-colocar">{s.semPosicao}</h2>
          {/* A mesma lista das outras telas da sala, e não um `bo-lista` com um
              link solto: medido a 360 px, o link solto dava um alvo de toque de
              132×22 px, abaixo dos 44 que a WCAG 2.2 pede. Estas ligações
              carregam-se com o dedo em movimento numa sala cheia. */}
          <ul className="bo-publico__lista">
            {porColocar.map((mesa) => (
              <li key={mesa.id} className="bo-publico__produto">
                <a href={`${base}/mesas/${mesa.id}`}>
                  <span className="bo-publico__nome">{mesa.codigo}</span>
                  <span className="bo-publico__preco">{mesa.area.nome}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
