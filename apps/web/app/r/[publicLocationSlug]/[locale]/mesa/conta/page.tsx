import { Aviso } from '@bossaos/ui';
import { totalDoPedido } from '@bossaos/db';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import {
  carregarVisita, pedidosDaMesa,
} from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-013 · «¿Traemos la cuenta?» (atlas p. 93)
 *
 * ── Este ecrã NÃO cobra, e di-lo por palavras ─────────────────────────────
 *
 * É a mesma regra do E15 vista do outro lado: *«offline não faz pagamento nem
 * reserva confirmada — não é limitação da primeira versão, é o desenho»*. Aqui
 * há rede, e continua a não cobrar: o pagamento faz-se com uma pessoa.
 *
 * Escrever isso na tela não é modéstia — é o que impede alguém de ficar sentado à
 * espera de que o telemóvel resolva a conta.
 *
 * O total é a soma do que foi **aceite**, com o preço de quando foi aceite. Não
 * lê a carta: a conta de quem está sentado não muda porque a cozinha actualizou
 * os preços a meio do jantar.
 */
export default async function TrazemosAConta({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const pedidos = await pedidosDaMesa(visitante);
  const base = `/r/${publicLocationSlug}/${locale}`;

  const todasAsLinhas = pedidos.flatMap((p) => p.linhas);
  const total = totalDoPedido(todasAsLinhas);

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.trazemosAConta} tela="MENU-013" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/conta" />

      {busca.avisado === '1' ? (
        <div data-teste="avisado">
          <Aviso tom="sucesso" titulo={s.pedidoFeito}>{s.pedirContaAjuda}</Aviso>
        </div>
      ) : null}

      {/* Ausência é ausência: sem nada aceite não há conta, e isso não é uma
          conta de zero. */}
      {total === null ? (
        <p className="bo-campo__ajuda" data-teste="sem-total">{s.semTotal}</p>
      ) : (
        <p data-teste="total">
          <strong>{s.total}</strong>: {formatarDinheiro(total, idioma)}
        </p>
      )}

      <p className="bo-campo__ajuda">{s.pedirContaAjuda}</p>

      <form method="post" action="/api/publico/mesa" data-teste="pedir-conta">
        <input type="hidden" name="slug" value={publicLocationSlug} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="accao" value="conta" />
        <div className="bo-estado__accoes">
          <button className="bo-botao bo-botao--primario" type="submit">{s.pedirAConta}</button>
        </div>
      </form>
    </div>
  );
}
