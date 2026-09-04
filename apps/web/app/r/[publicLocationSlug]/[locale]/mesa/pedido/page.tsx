import { Aviso } from '@bossaos/ui';
import { comEscopo, obterProduto, obterPrisma, precoEfectivo } from '@bossaos/db';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { carregarVisita } from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';
import { lerCarrinho } from '../../../../../../src/visitante/carrinho.ts';
import { obterEnv } from '../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-007 · «Tu pedido» (atlas p. 87) — o carrinho antes de sair.
 *
 * ── O preço é do SERVIDOR, e é lido aqui outra vez ────────────────────────
 *
 * O carrinho guarda **o que** se quer, e não **quanto custa**. O preço que
 * aparece nesta tela é lido da carta agora, e o que vale é o do momento em que o
 * servidor aceitar — é a decisão do E14, e é a razão de uma linha poder ser
 * rejeitada por divergência.
 *
 * Guardar o preço na bolacha teria sido conveniente e teria dado ao cliente a
 * caneta com que se escreve a conta.
 */
export default async function OTeuPedido({
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
  const carrinho = await lerCarrinho();
  const base = `/r/${publicLocationSlug}/${locale}`;

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const linhas = await comEscopo(prisma, { organizationId: visitante.organizationId },
    (db) => Promise.all(carrinho.map(async (item) => {
      const produto = await obterProduto(db, item.productId);
      const preco = await precoEfectivo(db, item.productId, visitante.locationId, 'CARTA');
      return {
        ...item,
        nome: produto?.nome ?? null,
        precoMenor: preco.ok ? preco.preco.montanteMenor : null,
        moeda: preco.ok ? preco.preco.moeda : null,
      };
    })));

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.oTeuPedido} tela="MENU-007" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/pedido" />

      {busca.erro === 'sem_linhas' ? (
        <div data-teste="sem-linhas">
          <Aviso tom="aviso" titulo={s.oTeuPedido}>{s.carrinhoVazio}</Aviso>
        </div>
      ) : null}

      <p data-teste="quantos">{linhas.length}</p>

      {linhas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="vazio">{s.carrinhoVazio}</p>
      ) : (
        <>
          <ul className="bo-publico__lista" data-teste="carrinho">
            {linhas.map((l) => (
              <li key={l.productId} className="bo-publico__produto" data-teste="item">
                <span className="bo-publico__nome">
                  {l.quantidade}× {l.nome ?? l.productId}
                </span>
                <span className="bo-publico__preco">
                  {/* Sem preço na carta não é grátis: é um prato que não se pode
                      cobrar, e o servidor vai recusá-lo com o motivo. */}
                  {l.precoMenor !== null && l.moeda
                    ? formatarDinheiro({ montanteMenor: l.precoMenor, moeda: l.moeda }, idioma)
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
          <div className="bo-estado__accoes">
            <a className="bo-botao bo-botao--primario" href={`${base}/mesa/enviar`}
               data-seccao="MENU-008">{s.prontoParaEnviar}</a>
          </div>
        </>
      )}
    </div>
  );
}
