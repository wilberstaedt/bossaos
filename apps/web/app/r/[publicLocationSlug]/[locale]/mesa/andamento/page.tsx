import { CabecalhoDePagina, Etiqueta } from '@bossaos/ui';
import { estadoDerivado, totalDoPedido } from '@bossaos/domain';
import { formatarDinheiro, formatarHora, type Idioma } from '@bossaos/i18n';
import {
  carregarVisita, pedidosDaMesa, producaoDaMesa,
} from '../../../../../../src/visitante/carregar-visita.ts';
import { NavegacaoDaVisita, porChaveDoVisitante, textosDoVisitante } from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-010 · «Así va tu pedido» (atlas p. 90)
 *
 * ── O estado vem das TAREFAS, e a contagem também ─────────────────────────
 *
 * É o mesmo `estadoDerivado` do E16, e não uma segunda leitura escrita aqui:
 * «pronto» é **todas** as tarefas prontas, e com a penúltima pronta a mesa ainda
 * não sai. Uma cópia da regra nesta tela era a segunda verdade — e a que o
 * cliente veria não teria de concordar com a que o expo vê.
 *
 * A contagem aparece porque `2/3` é o que responde à pergunta que quem está
 * sentado faz: «falta muito?». Um «em preparação» sozinho não responde nada.
 */
export default async function AssimVaiOTeuPedido({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const pedidos = await pedidosDaMesa();
  const base = `/r/${publicLocationSlug}/${locale}`;

  // A produção vem pela porta: só os estados, sem estação e sem quem a faz.
  // O cliente não tem nada que saber que a batata está na fritadeira.
  const porPedido = await producaoDaMesa();

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.assimVai} tela="MENU-010" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/andamento" />

      <p data-teste="quantos">{pedidos.length}</p>

      {pedidos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="pedidos">
          {pedidos.map((p) => {
            const derivado = estadoDerivado(porPedido.get(p.id) ?? []);
            const total = totalDoPedido(p.linhas);
            return (
              <li key={p.id} className="bo-publico__produto" data-teste="pedido"
                  data-estado={derivado?.estado ?? ''}
                  data-prontas={derivado?.prontas ?? ''} data-total={derivado?.total ?? ''}>
                <span className="bo-publico__nome">{p.numero}</span>
                <span className="bo-publico__preco">
                  {derivado === null ? (
                    // Sem tarefas não há estado de produção. Dizer «por começar»
                    // era afirmar sobre trabalho que ainda não existe.
                    <Etiqueta tom="neutro">{formatarHora(p.createdAt, idioma)}</Etiqueta>
                  ) : (
                    <Etiqueta tom={derivado.estado === 'PRONTO' ? 'sucesso' : 'aviso'}>
                      {porChaveDoVisitante(s, `pedido${derivado.estado}`)
                        ?? derivado.estado}
                    </Etiqueta>
                  )}
                </span>
                <p className="bo-publico__descricao">
                  {derivado === null ? null : (
                    <span data-teste="contagem">{derivado.prontas}/{derivado.total} · </span>
                  )}
                  {p.linhas.map((l: { nome: string; quantidade: number }) =>
                    `${l.quantidade}× ${l.nome}`).join(' · ')}
                </p>
                {total === null ? (
                  <p className="bo-campo__ajuda" data-teste="sem-total">{s.semTotal}</p>
                ) : (
                  <p data-teste="total">
                    <strong>{s.total}</strong>: {formatarDinheiro(total, idioma)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
