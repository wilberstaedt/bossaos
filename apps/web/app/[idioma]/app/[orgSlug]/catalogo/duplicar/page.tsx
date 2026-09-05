import { notFound } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas, previsaoDaClonagem } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-028 · «Copia un menú a otra unidad» (atlas)
 *
 * ── Decisão de rota declarada ─────────────────────────────────────────────
 *
 * A matriz sugere `/app/[orgSlug]/brands/[brandSlug]/catalog/duplicate`. Esse
 * segmento `brands/` **não existe no produto**: o catálogo vive em
 * `/app/[orgSlug]/catalogo/`. Criar a família de rotas para um único membro era
 * inventar estrutura para satisfazer uma sugestão.
 *
 * ── E o que se copia ──────────────────────────────────────────────────────
 *
 * Catálogo e configuração; **nunca pedidos nem clientes**. E a diferença
 * mostra-se **antes** de aplicar: quem clona tem de ver o que vai mudar
 * enquanto ainda pode voltar atrás.
 */
export default async function Duplicar({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string }> }) {
  const { idioma, orgSlug } = await params;
  const t = mensagensDe(idioma).analiticaE30;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const marcas = await comEscopoDoPedido(sessao, (db) => listarMarcas(db)) as
    { id: string; nome: string }[];
  const previsao = marcas.length >= 2
    ? await comEscopoDoPedido(sessao, (db) => previsaoDaClonagem(db, {
      deBrandId: marcas[0]!.id, paraBrandId: marcas[1]!.id,
    }))
    : await comEscopoDoPedido(sessao, (db) => previsaoDaClonagem(db, {
      deBrandId: marcas[0]?.id ?? '', paraBrandId: marcas[0]?.id ?? '',
    }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{orgSlug}</p>
          <h1 data-tela="CAT-028">{t.duplicar}</h1>
        </div>
      </div>
      <p data-teste="clona-configuracao">{t.clonaConfiguracao}</p>
      <p data-teste="quantas-marcas">{marcas.length}</p>
      {previsao.medido ? (
        <>
          <p data-teste="quantas-linhas">{previsao.valor.length}</p>
          <ul className="bo-lista bo-lista--colunas" data-teste="previsao">
            {previsao.valor.map((d) => (
              <li key={d.produto}>
                <span data-teste="produto">{d.produto}</span>
                <span data-teste={d.jaExiste ? 'ja-existe' : 'vai-criar'}>
                  {d.jaExiste ? t.jaExiste : t.vaiCriar}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p data-teste="sem-dados">{t.semDados}</p>
          <p data-teste="sem-dados-explica">{t.semDadosExplica}</p>
        </>
      )}
    </div>
  );
}
