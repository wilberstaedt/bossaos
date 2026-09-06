import { Aviso } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { carregarKiosk } from '../../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-007 · «El terminal está pausado» (atlas p. 220)
 *
 * ── Parar a máquina é caro, e é a decisão certa ───────────────────────────
 *
 * Há duas razões para esta tela, e a segunda é a que a etapa existe para
 * resolver: **uma cobrança indeterminada pausa o terminal**.
 *
 * A alternativa era o produto decidir sozinho sobre dinheiro que não consegue
 * ver — com a pessoa já fora da loja e ninguém no balcão para reclamar. Deixar
 * o kiosk servir o cliente seguinte por cima de uma cobrança por resolver era
 * empilhar um problema de dinheiro em cima de outro, e o segundo esconde o
 * primeiro.
 *
 * ── E esta tela não diz «erro» ────────────────────────────────────────────
 *
 * Diz o que é: alguém tem de vir ver. Um cliente que lê «erro» carrega outra
 * vez; um cliente que lê «avisa a equipa» vai avisar a equipa.
 */
export default async function KioskPausado({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, disponibilidade } = await carregarKiosk(deviceId);

  // Se já não está pausado, esta tela diz isso em vez de mentir. Um ecrã que
  // continua a dizer «pausado» depois de alguém ter resolvido é um kiosk que
  // ninguém volta a usar.
  const razao = disponibilidade.disponivel ? null : disponibilidade.razao;

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={kiosk.nome} titulo={s.pausado} tela="KIOSK-007" />

      {razao === 'COBRANCA_POR_RESOLVER' ? (
        <div data-teste="pausado-cobranca">
          <Aviso tom="perigo" titulo={s.pausado}>{s.pausadoCobranca}</Aviso>
        </div>
      ) : razao === 'NAO_APROVADO' ? (
        <div data-teste="pausado-nao-aprovado">
          <Aviso tom="aviso" titulo={s.pausado}>{s.pausadoNaoAprovado}</Aviso>
        </div>
      ) : (
        <div data-teste="ja-disponivel">
          <Aviso tom="sucesso" titulo={s.bemVindo}>{s.comecar}</Aviso>
          <a
            className="bo-lista__ligacao"
            data-seccao="KIOSK-001"
            href={`/${idioma}/kiosk/${deviceId}`}
          >
            {s.comecar}
          </a>
        </div>
      )}
    </div>
  );
}
