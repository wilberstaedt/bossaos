import { redirect } from 'next/navigation';
import { Botao, Campo, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-018 · "Biblioteca de opciones" (atlas p. 70)
 *
 * A coluna **Uso** conta os produtos que usam cada grupo, e existe por uma razão
 * concreta: sem ela, mudar o mínimo de um grupo é uma alteração cega. Com ela,
 * quem edita sabe que está a mexer em quarenta fichas.
 */
export default async function BibliotecaDeOpcoes({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { grupos, marcas } = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    grupos: await db.modifierGroup.findMany({
      where: { archivedAt: null },
      select: {
        id: true, nome: true, obrigatorio: true, minimo: true, maximo: true,
        _count: { select: { opcoes: true, emProdutos: true } },
      },
      orderBy: { nome: 'asc' },
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaOpcoes}</p>
          <h1>{c.tituloBiblioteca}</h1>
        </div>
      </div>


      {/* ── Criar sem uma tela nova ────────────────────────────────────────
          O atlas não desenha um ecrã de criação para grupos de opções: a matriz tem
          CAT-018 e CAT-019 e mais nenhum. Uma rota `/novo` seria uma tela a mais, e
          colidia com o segmento dinâmico ao lado. O formulário mínimo vive
          aqui, e o resto edita-se na ficha. */}
      <Cartao>
        <form method="post" action="{`/api/org/${orgSlug}/opcoes`}" className="bo-forma__grelha">
          <input type="hidden" name="idioma" value={idioma} />
          <Campo rotulo={c.grupo} name="nome" required />
          <Seletor rotulo="Marca" name="brandId" required>
            {marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </Seletor>
          <Campo rotulo={c.nome} name="opcao" required />
          <Botao type="submit">{c.accaoCriarGrupo}</Botao>
        </form>
      </Cartao>

      <Tabela
        legenda={c.tituloBiblioteca}
        colunas={[
          { chave: 'nome', rotulo: c.grupo },
          { chave: 'eleicao', rotulo: c.eleicao },
          { chave: 'limites', rotulo: `${c.minimo} / ${c.maximo}`, numero: true },
          { chave: 'opcoes', rotulo: c.opcoes, numero: true },
          { chave: 'uso', rotulo: c.uso, numero: true },
        ]}
        linhas={grupos.map((g) => ({
          id: g.id,
          nome: g.nome,
          eleicao: g.obrigatorio ? c.obrigatoria : c.opcional,
          // Sem tecto escreve-se por extenso. Um campo vazio nesta coluna
          // leria-se como zero, que é o oposto.
          limites: `${formatarNumero(g.minimo, idioma)} / ${
            g.maximo === null ? c.semTecto : formatarNumero(g.maximo, idioma)}`,
          opcoes: formatarNumero(g._count.opcoes, idioma),
          uso: c.usoProdutos.replace('{n}', formatarNumero(g._count.emProdutos, idioma)),
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/catalogo/opcoes/${linha.id}`}>{linha.nome}</a>
            : coluna.chave === 'eleicao'
              ? <Etiqueta tom={linha.eleicao === c.obrigatoria ? 'realce' : 'neutro'}>{linha.eleicao}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
