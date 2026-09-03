import { redirect } from 'next/navigation';
import { Botao, Campo, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarDinheiro, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos, listarUnidades, precoEfectivo } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-007 · "Productos" (atlas p. 59)
 *
 * A coluna **Preço** é resolvida, não guardada: passa pelo motor de precedência
 * para a unidade activa e o canal da carta. Guardar um preço "de lista" nesta
 * tabela seria a quinta cópia do mesmo número, e a primeira a divergir.
 *
 * E diz **"sin precio"** quando não há regra — não zero. Um produto sem preço
 * não custa nada grátis: não se sabe quanto custa.
 *
 * A coluna **Estado** mostra rascunho/activo/arquivado. O atlas mostra
 * "Publicado", que é E08 — publicar cria revisão imutável e ainda não existe.
 */
export default async function Produtos({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { q } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produtos = await listarProdutos(db, { ...(q ? { texto: q } : {}) });
    const unidades = await listarUnidades(db);
    const unidade = unidades[0];
    const precos = new Map<string, string>();
    if (unidade) {
      for (const p of produtos) {
        const r = await precoEfectivo(db, p.id, unidade.id, 'CARTA');
        precos.set(
          p.id,
          r.ok ? formatarDinheiro(r.preco, idioma)
            : r.erro === 'conflito' ? c.conflitoPreco
            : r.erro === 'moeda_incompativel' ? c.moedaIncompativel
            : r.erro === 'unidade_sem_moeda' ? c.unidadeSemMoeda
            : c.semPreco,
        );
      }
    }
    return { produtos, precos };
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaProdutos}</p>
          <h1>{c.tituloProdutos}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`/${idioma}/app/${orgSlug}/catalogo/produtos/novo`}>
          {c.accaoCriarProduto}
        </a>
      </div>

      {/* Busca sem JavaScript: um GET com o termo na URL. Funciona, é
          partilhável, e o botão "voltar" faz o que se espera. */}
      <form method="get" className="bo-forma__grelha">
        <Campo rotulo={c.buscar} name="q" defaultValue={q ?? ''} />
        <Botao type="submit" tom="secundario">{c.buscar}</Botao>
      </form>

      <Tabela
        legenda={c.tituloProdutos}
        colunas={[
          { chave: 'nome', rotulo: c.colunaProduto },
          { chave: 'categoria', rotulo: c.categoria },
          { chave: 'preco', rotulo: c.colunaPreco, numero: true },
          { chave: 'estado', rotulo: c.colunaEstado },
        ]}
        linhas={dados.produtos.map((p) => ({
          id: p.id,
          nome: p.nome,
          categoria: p.category?.nome ?? '—',
          preco: dados.precos.get(p.id) ?? c.semPreco,
          estado: (c as unknown as Record<string, string>)[`estado${p.estado}`] ?? p.estado,
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/catalogo/produtos/${linha.id}`}>{linha.nome}</a>
            : coluna.chave === 'estado'
              ? <Etiqueta tom={linha.estado === c.estadoACTIVO ? 'sucesso' : 'neutro'}>{linha.estado}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {m.plataforma.registosMostrados.replace('{n}', formatarNumero(dados.produtos.length, idioma))}
      </p>
    </div>
  );
}
