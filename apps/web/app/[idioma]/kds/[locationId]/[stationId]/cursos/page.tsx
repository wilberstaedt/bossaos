import { CabecalhoDePagina } from '@bossaos/ui';
import { notFound } from 'next/navigation';
import { listarTiposDeServico } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarKds, estacaoDaUnidade } from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

/** Minutos desde a meia-noite local → `HH:MM`. O fuso é da unidade. */
function hora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

export const dynamic = 'force-dynamic';

/**
 * KDS-006 · «Mantén el siguiente pase» (atlas p. 189)
 *
 * ── O que esta tela NÃO faz, e porquê está declarado ──────────────────────
 *
 * Segurar um passe é uma decisão de serviço: a cozinha atrasa o prato seguinte
 * para a mesa comer ao ritmo dela. O contrato do E16 **não decide** como os
 * tempos se ligam às tarefas — e eu não invento aqui uma regra de negócio que
 * ninguém escreveu, que foi o erro que o `preco-de-um-pedido-escrito-offline.md`
 * ensinou a não repetir.
 *
 * O que esta tela dá é o que existe: os tempos de serviço da unidade (E13) e o
 * que está por preparar em cada um. **Ligar o bilhete ao tempo fica declarado
 * como pendência**, e não simulado com ar de pronto.
 */
export default async function CursosDoKds({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tipos = await comEscopoDoPedido(sessao, (db) => listarTiposDeServico(db, unidade.id));

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.cursos} tela="KDS-006" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/cursos" />

      <p data-teste="quantos">{tipos.length}</p>
      {tipos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semTempos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="cursos">
          {tipos.map((t: { id: string; nome: string; inicioMinutos: number; fimMinutos: number }) => (
            <li key={t.id} className="bo-publico__produto" data-teste="curso">
              <span className="bo-publico__nome">{t.nome}</span>
              <span className="bo-publico__preco">
                {hora(t.inicioMinutos)}–{hora(t.fimMinutos)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
