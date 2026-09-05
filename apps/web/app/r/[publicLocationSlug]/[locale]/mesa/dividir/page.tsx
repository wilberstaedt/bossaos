import { dividirEmPartes } from '@bossaos/domain';
import { totalDoPedido } from '@bossaos/domain';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarVisita, pedidosDaMesa } from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-015 · «¿Cómo queréis dividir?» (atlas)
 *
 * A mesma divisão do POS-009, e é a MESMA função — `dividirEmPartes`, do
 * domínio. Duas divisões, uma no balcão e outra na mesa, davam dois resultados
 * no dia em que uma mudasse; e a que discordasse seria descoberta por um cliente,
 * não por nós.
 *
 * O ecrã mostra as partes **e a soma**, porque a propriedade que interessa é a
 * soma bater — «cada parte é 3,33» só é verdade quando a divisão é exacta.
 */
export default async function DividirNaMesa({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams?: Promise<{ partes?: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const { partes } = (await searchParams) ?? {};
  const idioma = locale as Idioma;
  const t = mensagensDe(idioma).pagamentoE23;
  await carregarVisita(publicLocationSlug, locale);
  const pedidos = await pedidosDaMesa();
  const total = totalDoPedido(pedidos.flatMap((p) => p.linhas))
    ?? { montanteMenor: 0, moeda: 'EUR' };
  // São pessoas, não cêntimos: `parseInt` sobre um nome que não é de dinheiro.
  const quantas = Math.min(Math.max(parseInt(partes ?? '2', 10) || 2, 1), 20);
  const fatias = dividirEmPartes(total, quantas);
  const soma = fatias.reduce((a, b) => a + b.montanteMenor, 0);
  const base = `/r/${publicLocationSlug}/${locale}/mesa`;

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={t.naMesa} titulo={t.dividir} tela="MENU-015" />
      <form method="get" className="bo-forma">
        <label htmlFor="partes">{t.quantos}</label>
        <input id="partes" name="partes" type="text" inputMode="numeric"
               defaultValue={String(quantas)} className="bo-campo__controlo" />
        <button type="submit" className="bo-botao">{t.dividir}</button>
      </form>
      <ul className="bo-lista" data-teste="partes">
        {fatias.map((f, i) => (
          <li key={i}><span>{i + 1}</span><span>{formatarDinheiro(f, idioma)}</span></li>
        ))}
      </ul>
      <p data-teste="soma-das-partes">
        {formatarDinheiro({ montanteMenor: soma, moeda: total.moeda }, idioma)}
      </p>
      <p data-teste="divisao-ajuda">{t.divisaoAjuda}</p>
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/conta" />
    </div>
  );
}
