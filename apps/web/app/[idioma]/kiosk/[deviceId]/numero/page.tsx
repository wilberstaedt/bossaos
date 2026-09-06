import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { carregarKiosk } from '../../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-006 · «Tu número es el 031» (atlas p. 219)
 *
 * ── O número é o do PEDIDO, e o pedido é do servidor ──────────────────────
 *
 * Um kiosk que inventasse o número localmente daria dois «031» em dois
 * aparelhos da mesma casa, e duas pessoas iam ao balcão buscar o mesmo prato.
 * O número vem da coluna que o E14 já preenche.
 *
 * ── E a saída daqui é uma das TRÊS ────────────────────────────────────────
 *
 * O botão de recomeçar não «limpa o ecrã»: fecha a sessão pela mesma função que
 * a inactividade e o reinício à mão usam. Um caminho de saída próprio para esta
 * tela seria o quarto — e o quarto é o que limpa menos.
 */
export default async function KioskNumero({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, sessao, disponibilidade } = await carregarKiosk(deviceId);
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={kiosk.nome} titulo={s.confirmado} tela="KIOSK-006" />

      {sessao?.pedido ? (
        <p className="bo-estado__numero" data-teste="numero">{sessao.pedido.numero}</p>
      ) : (
        <div data-teste="sem-pedido">
          <Aviso tom="info" titulo={s.confirmado}>{s.carrinhoVazio}</Aviso>
        </div>
      )}

      <p>{s.recolher}</p>

      <form method="post" action={`/api/kiosk/${deviceId}/terminar`}>
        <input type="hidden" name="motivo" value="CONCLUIDA" />
        <input type="hidden" name="idioma" value={idioma} />
        <button className="bo-botao" type="submit" data-teste="recomecar">
          {s.recomecar}
        </button>
        <p className="bo-campo__ajuda">{s.recomecarAjuda}</p>
      </form>
    </div>
  );
}
