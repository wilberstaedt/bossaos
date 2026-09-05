import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { totalDoPedido } from '@bossaos/domain';
import { carregarVisita, pedidosDaMesa } from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-014 · «Paga desde tu mesa» (atlas)
 *
 * ── Porque não está em `menu/pay`, como a matriz sugeria ──────────────────
 *
 * `menu/` é a carta ANÓNIMA — quem passa na rua e lê os pratos. `mesa/` é quem
 * está sentado e tem sessão de visitante. Um ecrã de pagamento na carta anónima
 * seria pagamento sem sessão, e é a regra que o E18 já fixou: **nada sem sessão
 * de visitante**. Fica em `mesa/`, e o desvio está declarado no `E23.md`.
 *
 * ── E este ecrã continua a NÃO cobrar sozinho ─────────────────────────────
 *
 * «Retorno do navegador não prova pagamento.» O que este ecrã faz é abrir uma
 * tentativa e mostrar o estado; quem confirma é o **webhook**, com assinatura
 * verificada. Um ecrã que diga «pago» porque o browser voltou é um ecrã que
 * mente em cada rede lenta.
 *
 * Enquanto não houver adquirente ligado, di-lo por palavras — e não oferece um
 * botão que não faz nada.
 */
export default async function PagarNaMesa({
  params,
}: { params: Promise<{ publicLocationSlug: string; locale: string }> }) {
  const { publicLocationSlug, locale } = await params;
  const idioma = locale as Idioma;
  const t = mensagensDe(idioma).pagamentoE23;
  await carregarVisita(publicLocationSlug, locale);
  const pedidos = await pedidosDaMesa();
  const total = totalDoPedido(pedidos.flatMap((p) => p.linhas))
    ?? { montanteMenor: 0, moeda: 'EUR' };
  const base = `/r/${publicLocationSlug}/${locale}/mesa`;

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={t.naMesa} titulo={t.pagar} tela="MENU-014" />
      <p data-teste="total">{formatarDinheiro(total, idioma)}</p>

      {/* A dependência em falta diz-se, e não se disfarça com um botão inerte. */}
      <p data-teste="sem-adquirente">{t.semAdquirente}</p>
      <p data-teste="nao-prova">{t.retornoNaoProva}</p>

      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="dividir" href={`${base}/dividir`}>{t.dividir}</a>
        <a className="bo-botao" data-seccao="conta" href={`${base}/conta`}>{t.verConta}</a>
      </nav>
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/conta" />
    </div>
  );
}
