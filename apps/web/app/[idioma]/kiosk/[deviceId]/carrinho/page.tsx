import { redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { carregarKiosk } from '../../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-004 · «Revisa tu pedido» (atlas p. 217)
 *
 * ── O carrinho é o PEDIDO da sessão, e não um saco à parte ────────────────
 *
 * Não há aqui nenhuma estrutura de carrinho que precise de ser limpa quando o
 * cliente se vai embora. O carrinho é o `order_id` desta sessão, e a sessão
 * seguinte tem um `id` diferente e um `order_id` que a base **obriga** a ser
 * único. O cliente seguinte não vê isto porque não há caminho que lho mostre.
 */
export default async function KioskCarrinho({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, sessao, disponibilidade } = await carregarKiosk(deviceId);
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  const linhas = sessao?.pedido?.linhas ?? [];

  // ── Uma linha SEM PREÇO não vale zero ─────────────────────────────────
  //
  // `precoMenor` é anulável, e a tentação é somá-lo com `?? 0`. Isso faz um
  // total que parece medido e não é: quem lê paga o que o ecrã diz, e o que o
  // ecrã diz está errado para menos. Mesma regra do E30 — ausência não é zero,
  // e as duas escrevem-se diferente.
  //
  // Enquanto houver uma linha sem preço, esta tela **não mostra total**. Diz
  // que não sabe, e quem for ao balcão descobre porquê.
  const semPreco = linhas.some(
    (l: { precoMenor: number | null }) => l.precoMenor === null);
  const totalMenor = linhas.reduce(
    (soma: number, l: { precoMenor: number | null; quantidade: number }) =>
      soma + (l.precoMenor ?? 0) * l.quantidade, 0);
  const moeda = linhas.find(
    (l: { moeda: string | null }) => l.moeda !== null)?.moeda ?? 'EUR';

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={kiosk.nome} titulo={s.carrinho} tela="KIOSK-004" />

      {linhas.length === 0 ? (
        <div data-teste="carrinho-vazio">
          <Aviso tom="info" titulo={s.carrinho}>{s.carrinhoVazio}</Aviso>
        </div>
      ) : (
        <>
          <ul className="bo-publico__lista" data-teste="linhas">
            {linhas.map((l: {
              id: string; nome: string; quantidade: number;
              precoMenor: number | null; moeda: string | null;
            }) => (
              <li key={l.id} className="bo-publico__produto" data-teste="linha">
                <span className="bo-publico__nome">{l.quantidade} × {l.nome}</span>
                <span className="bo-publico__preco">
                  {l.precoMenor === null ? '—' : formatarDinheiro(
                    { montanteMenor: l.precoMenor * l.quantidade, moeda: l.moeda ?? moeda },
                    idioma)}
                </span>
              </li>
            ))}
          </ul>
          {semPreco ? (
            <p data-teste="total-por-medir">{s.carrinhoVazio}</p>
          ) : (
            <p data-teste="total">
              {s.total}: {formatarDinheiro({ montanteMenor: totalMenor, moeda }, idioma)}
            </p>
          )}
        </>
      )}

      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-005"
        href={`/${idioma}/kiosk/${deviceId}/pagar`}
      >
        {s.pagar}
      </a>
      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-002"
        href={`/${idioma}/kiosk/${deviceId}/menu`}
      >
        {s.menu}
      </a>
    </div>
  );
}
