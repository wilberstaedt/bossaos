import { redirect } from 'next/navigation';
import { Botao, Campo, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/** CAT-005 · categorias (atlas p. 57). A contagem de produtos é real, não estimada. */
export default async function Categorias({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { categorias, marcas } = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    categorias: await db.category.findMany({
      where: { archivedAt: null },
      select: {
        id: true, nome: true, ordem: true, visivel: true,
        _count: { select: { produtos: true } },
      },
      orderBy: { ordem: 'asc' },
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaCategorias}</p>
          <h1>{c.tituloCategorias}</h1>
        </div>
      </div>


      {/* ── Criar sem uma tela nova ────────────────────────────────────────
          O atlas não desenha um ecrã de criação para categorias: a matriz tem
          CAT-005 e CAT-006 e mais nenhum. Uma rota `/novo` seria uma tela a mais, e
          colidia com o segmento dinâmico ao lado. O formulário mínimo vive
          aqui, e o resto edita-se na ficha. */}
      <Cartao>
        <form method="post" action="{`/api/org/${orgSlug}/categorias`}" className="bo-forma__grelha">
          <input type="hidden" name="idioma" value={idioma} />
          <Campo rotulo={c.nome} name="nome" required />
          <Seletor rotulo="Marca" name="brandId" required>
            {marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </Seletor>
          <Botao type="submit">{c.accaoCriarCategoria}</Botao>
        </form>
      </Cartao>

      <Tabela
        legenda={c.tituloCategorias}
        colunas={[
          { chave: 'nome', rotulo: c.colunaCategoria },
          { chave: 'ordem', rotulo: c.ordem, numero: true },
          { chave: 'produtos', rotulo: c.colunaProdutos, numero: true },
          { chave: 'visivel', rotulo: c.visivel },
        ]}
        linhas={categorias.map((x) => ({
          id: x.id,
          nome: x.nome,
          ordem: formatarNumero(x.ordem, idioma),
          produtos: formatarNumero(x._count.produtos, idioma),
          visivel: x.visivel ? c.sim : c.nao,
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/catalogo/categorias/${linha.id}`}>{linha.nome}</a>
            : coluna.chave === 'visivel'
              ? <Etiqueta tom={linha.visivel === c.sim ? 'sucesso' : 'neutro'}>{linha.visivel}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
