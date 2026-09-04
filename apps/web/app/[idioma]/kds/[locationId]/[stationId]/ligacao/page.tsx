import { notFound } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { listarDispositivos, tarefasDaEstacao } from '@bossaos/db';
import { formatarDataHora, type Idioma } from '@bossaos/i18n';
import { carregarKds, estacaoDaUnidade } from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { CabecalhoDoKds, textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * STATE-012 · «Cocina 01 no tiene conexión» (atlas p. 398)
 *
 * ── «Heartbeat não comprova recebimento» ──────────────────────────────────
 *
 * O contrato di-lo pelo nome: *«um dispositivo "activo" que não imprimiu o
 * bilhete continua activo, e a cozinha não sabe. O estado mostrado é o do último
 * resultado real.»*
 *
 * Por isso esta tela mostra o **último sinal** e diz, por palavras, que um sinal
 * não é uma entrega. E mostra o que está por preparar apesar disso: uma estação
 * sem ligação não perde trabalho — o trabalho está na base, contado, e é isso
 * que quem chega a este ecrã em pânico precisa de ler primeiro.
 *
 * ── E é um ESTADO, não um alerta que passa ────────────────────────────────
 *
 * «Estação offline gera alerta — não um ícone discreto que ninguém olha», e
 * nenhuma informação pode existir só como um apito. Isto fica no ecrã e
 * sobrevive a uma recarga.
 */
export default async function LigacaoDaEstacao({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const { dispositivos, porPreparar } = await comEscopoDoPedido(sessao, async (db) => ({
    dispositivos: await listarDispositivos(db, unidade.id),
    porPreparar: await tarefasDaEstacao(db, unidade.id, estacao.id),
  }));
  const daCozinha = dispositivos.filter((d: { estacao: string }) => d.estacao === 'COZINHA');

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.semLigacao} tela="STATE-012" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/ligacao" />

      <div data-teste="aviso-sem-ligacao">
        <Aviso tom="aviso" titulo={s.semLigacao}>{s.estacaoSemLigacao}</Aviso>
      </div>

      {/* O trabalho continua contado. É a primeira coisa que alguém precisa de
          ler quando um ecrã de cozinha morre a meio do serviço. */}
      <p className="bo-kds__contagem">
        <span>{s.noTotal}: <strong data-teste="por-preparar">{porPreparar.length}</strong></span>
      </p>

      <h2>{s.ultimoSinal}</h2>
      <p className="bo-campo__ajuda">{s.batimentoNaoProva}</p>
      {daCozinha.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-dispositivos">{s.semEstacoes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="dispositivos">
          {daCozinha.map((d: { id: string; nome: string; estado: string; ultimoVistoEm: Date | null }) => (
            <li key={d.id} className="bo-publico__produto" data-teste="dispositivo"
                data-sinal={d.ultimoVistoEm ? 'sim' : 'nao'}>
              <span className="bo-publico__nome">{d.nome}</span>
              <span className="bo-publico__preco">
                {/* «Nunca deu sinal» não é «há muito tempo»: é não saber. */}
                {d.ultimoVistoEm
                  ? formatarDataHora(d.ultimoVistoEm, idioma)
                  : s.nuncaDeuSinal}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
