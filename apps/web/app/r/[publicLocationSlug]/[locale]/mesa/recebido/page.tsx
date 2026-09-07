import { Aviso, CabecalhoDePagina } from '@bossaos/ui';
import { formatarHora, type Idioma } from '@bossaos/i18n';
import {
  carregarVisita, pedidosDaMesa,
} from '../../../../../../src/visitante/carregar-visita.ts';
import { NavegacaoDaVisita, textosDoVisitante } from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-009 · «Pedido recibido» (atlas p. 89)
 *
 * ── «Recebido» quer dizer que o SERVIDOR o tem ────────────────────────────
 *
 * Não é um agradecimento: é uma afirmação sobre um facto, e a tela só existe
 * depois de o pedido estar gravado. É a mesma linha que o E15 traçou do outro
 * lado — «nunca mostre enviado se só gravou no dispositivo» —, aqui sem fila
 * local porque quem está na mesa tem a rede do restaurante e o envio é síncrono.
 *
 * Se alguma coisa correr mal, o caminho não passa por aqui: passa pelo carrinho,
 * com o motivo.
 */
export default async function PedidoRecebido({
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
  const pedidos = await pedidosDaMesa();
  const base = `/r/${publicLocationSlug}/${locale}`;
  const esteId = typeof busca.pedido === 'string' ? busca.pedido : null;
  const este = pedidos.find((p: { id: string }) => p.id === esteId) ?? pedidos[0] ?? null;

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.pedidoRecebido} tela="MENU-009" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/andamento" />

      {este === null ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        <div data-teste="recebido">
          <Aviso tom="sucesso" titulo={s.pedidoFeito}>
            {este.numero} · {formatarHora(este.createdAt, idioma)}
          </Aviso>
          <ul className="bo-publico__lista" data-teste="linhas">
            {este.linhas.map((l: { id: string; nome: string; quantidade: number }) => (
              <li key={l.id} className="bo-publico__produto" data-teste="linha">
                <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
              </li>
            ))}
          </ul>
          <div className="bo-estado__accoes">
            <a className="bo-botao bo-botao--secundario" href={`${base}/mesa/andamento`}
               data-seccao="MENU-010">{s.assimVai}</a>
          </div>
        </div>
      )}
    </div>
  );
}
