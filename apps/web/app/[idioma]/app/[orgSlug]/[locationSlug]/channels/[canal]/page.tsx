import { notFound } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos, precoEfectivo } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';

export const dynamic = 'force-dynamic';

const CANAIS = ['CARTA', 'SITE', 'SALA', 'TPV', 'TAKEAWAY', 'KIOSK'] as const;

/**
 * CHAN-002 · «Configura el canal» (atlas p. 84)
 *
 * ── O que um canal é, e o que ele NÃO é ──────────────────────────────────
 *
 * Não é uma cópia do catálogo. O E07 já tinha decidido isto — «não crie tabelas
 * independentes de produtos para menu, Staff ou TPV», porque cada superfície com
 * a sua cópia significa que o preço da carta e o do TPV divergem sem ninguém
 * saber qual é o certo. O canal é uma **vista**: os mesmos produtos, com as
 * regras de preço e de visibilidade que lhe apontam.
 *
 * Por isso esta página **mostra** o que o canal serve e a que preço, e não
 * oferece um campo de preço próprio. O preço edita-se onde ele vive: no produto.
 *
 * ── E um produto sem regra para este canal aparece como SEM PREÇO ────────
 *
 * Não herda o preço de outro canal nem mostra o da carta. Um produto sem preço
 * neste canal é um produto que **não se pode pedir aqui** — e o motor de pedidos
 * rejeita-o com `SEM_PRECO`, que é a mesma resposta vista do outro lado.
 */
export default async function ConfigurarCanal({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; canal: string }>;
}) {
  const { idioma, orgSlug, locationSlug, canal } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;

  const escolhido = CANAIS.find((c) => c.toLowerCase() === canal.toLowerCase());
  if (!escolhido) notFound();

  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const produtos = await comEscopoDoPedido(sessao, async (db) => {
    const todos = await listarProdutos(db, {});
    return Promise.all(todos.slice(0, 50).map(async (x) => ({
      id: x.id, nome: x.nome,
      preco: await precoEfectivo(db, x.id, unidade.id, escolhido),
    })));
  });

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.canal}: {escolhido}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      <nav className="bo-publico__seccoes" aria-label={p.canal}>
        {CANAIS.map((c) => (
          <a key={c} href={`${base}/${c.toLowerCase()}`}
             aria-current={c === escolhido ? 'page' : undefined}>{c}</a>
        ))}
      </nav>

      {produtos.length === 0 ? (
        <Aviso titulo={p.produto}>{p.semDados}</Aviso>
      ) : (
        <Cartao titulo={p.produto}>
          <table className="bo-tabela">
            <thead>
              <tr>
                <th scope="col">{p.produto}</th>
                <th scope="col">{p.preco}</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((x) => (
                <tr key={x.id}>
                  <th scope="row">{x.nome}</th>
                  <td>
                    {x.preco.ok
                      ? formatarDinheiro(x.preco.preco, idioma)
                      : <Etiqueta tom="aviso">{p.semPreco}</Etiqueta>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </div>
  );
}
