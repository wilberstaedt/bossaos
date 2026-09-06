import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { podeCobrar } from '@bossaos/db';
import { carregarKiosk } from '../../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-005 · «Completa el pago» (atlas p. 218)
 *
 * ── Offline não captura e não promete ─────────────────────────────────────
 *
 * O que impede a promessa não é um `if` nesta tela: é a **ausência de caminho**.
 * Um kiosk sem rede não chega ao servidor, logo não cria tentativa de pagamento
 * nem muda o pedido de rascunho. Esta página existe para o DIZER — a alternativa
 * é um ecrã a girar e uma pessoa a achar que já pagou.
 *
 * ── E o que é que aparece quando não se sabe ──────────────────────────────
 *
 * Se ficou uma cobrança indeterminada, esta tela não é a que se vê: o terminal
 * está pausado e a casca manda para o KIOSK-007. Não se cobra em cima de um
 * pagamento que ninguém consegue ver.
 */
export default async function KioskPagar({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, sessao, disponibilidade } = await carregarKiosk(deviceId);
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  // Esta página só se renderiza no servidor. Chegar aqui **é** a prova de que
  // há ligação — e por isso o estado é ONLINE por construção, não por um
  // sensor no navegador que mente quando o WiFi tem sinal e não tem rota.
  const ligado = podeCobrar('ONLINE');

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={kiosk.nome} titulo={s.pagar} tela="KIOSK-005" />

      {!ligado ? (
        <div data-teste="sem-ligacao">
          <Aviso tom="aviso" titulo={s.semLigacao}>{s.semLigacaoAviso}</Aviso>
        </div>
      ) : null}

      {sessao?.pedido ? (
        <p data-teste="pedido">{s.pedido}: {sessao.pedido.numero}</p>
      ) : (
        <p data-teste="carrinho-vazio">{s.carrinhoVazio}</p>
      )}

      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-006"
        href={`/${idioma}/kiosk/${deviceId}/numero`}
      >
        {s.pagar}
      </a>
      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-004"
        href={`/${idioma}/kiosk/${deviceId}/carrinho`}
      >
        {s.carrinho}
      </a>
    </div>
  );
}
