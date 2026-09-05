import { redirect } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-021 · «Impostos e taxas de item» (atlas)
 *
 * ── Porque não está em `brands/[brandSlug]/catalog/taxes` ─────────────────
 *
 * A matriz sugeria essa rota, mas a carta entregue vive em
 * `/app/<org>/catalogo` desde o E07 — com produtos, categorias, menus e opções.
 * Pôr esta tela sozinha noutra árvore era criar uma segunda carta. Fica com as
 * irmãs, e o desvio está declarado no `E24.md`.
 *
 * ── E o que este ecrã NÃO faz ─────────────────────────────────────────────
 *
 * Não afirma taxas. Mostra o que está configurado por item, e diz que o
 * **mapeamento fiscal** — que taxa corresponde a que categoria no regime — está
 * **por confirmar na fonte oficial**. Inventar aqui uma tabela de IVA seria o
 * requisito inventado que a régua recusa, com o agravante de aparecer num ecrã
 * que alguém pode copiar para a contabilidade.
 */
export default async function ImpostosDoCatalogo({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string }> }) {
  const { idioma, orgSlug } = await params;
  const t = mensagensDe(idioma).fiscalE24;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
  const produtos = await comEscopoDoPedido(sessao, (db) => listarProdutos(db)) as
    { id: string; nome: string }[];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{orgSlug}</p>
          <h1 data-tela="CAT-021">{t.impostos}</h1>
        </div>
      </div>
      {/* A pendência aparece ANTES da lista, e não em rodapé: quem vier buscar
          números para a contabilidade tem de a ler primeiro. */}
      <p data-teste="por-confirmar">{t.porConfirmar}</p>
      <p data-teste="quantos">{produtos.length}</p>
      {produtos.length === 0 ? <p data-teste="sem-impostos">{t.semImpostos}</p> : (
        <ul className="bo-lista" data-teste="itens">
          {produtos.slice(0, 50).map((p) => (
            <li key={p.id}>
              <span>{p.nome}</span>
              {/* Sem taxa afirmada: o que não se verificou não se mostra como
                  se fosse facto. */}
              <span data-teste="taxa-por-definir">{t.taxa}: —</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
