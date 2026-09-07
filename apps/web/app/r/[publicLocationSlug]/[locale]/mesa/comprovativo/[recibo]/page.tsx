import { CabecalhoDePagina } from '@bossaos/ui';
import { notFound } from 'next/navigation';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarVisita } from '../../../../../../../src/visitante/carregar-visita.ts';
import { textosDoVisitante } from '../../../../../../../src/visitante/PecasDoVisitante.tsx';
import { PagamentoEmComprovacao } from '../../../../../../../src/pagamento/PagamentoEmComprovacao.tsx';
import { comprovativoDaVisita } from '../../../../../../../src/visitante/carregar-visita.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-016 · «Tu comprobante» (atlas)
 *
 * ── Isto NÃO é um documento fiscal, e di-lo ───────────────────────────────
 *
 * «Não emitir um PDF comum e chamá-lo de documento fiscal.» A emissão é o E24,
 * com o provedor e o país. Aqui é um comprovativo informativo, e a frase está no
 * ecrã — não numa nota de rodapé que ninguém lê.
 *
 * ── E o estado indeterminado tem ecrã próprio ─────────────────────────────
 *
 * Se a tentativa ainda não foi confirmada, o que aparece é a STATE-011 — e o que
 * ela diz é «não tentes outra vez». Um comprovativo que mostra um vazio a quem
 * acabou de pagar é um comprovativo que faz a pessoa pagar duas vezes.
 */
export default async function Comprovativo({
  params,
}: { params: Promise<{ publicLocationSlug: string; locale: string; recibo: string }> }) {
  const { publicLocationSlug, locale, recibo } = await params;
  const idioma = locale as Idioma;
  const t = mensagensDe(idioma).pagamentoE23;
  void textosDoVisitante(idioma);
  await carregarVisita(publicLocationSlug, locale);

  const dados = await comprovativoDaVisita(recibo);
  if (!dados) notFound();

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={t.naMesa} titulo={t.comprovativo} tela="MENU-016" />
      {dados.emComprovacao ? (
        <PagamentoEmComprovacao idioma={idioma} />
      ) : (
        <>
          <p data-teste="pago">
            {t.pago} {formatarDinheiro(
              { montanteMenor: dados.montanteMenor, moeda: dados.moeda }, idioma)}
          </p>
          {dados.gorjetaMenor > 0 && (
            <p data-teste="gorjeta">
              {t.gorjeta} {formatarDinheiro(
                { montanteMenor: dados.gorjetaMenor, moeda: dados.moeda }, idioma)}
            </p>
          )}
        </>
      )}
      <p data-teste="sem-fiscal">{mensagensDe(idioma).tpvE22.semFiscal}</p>
    </div>
  );
}
