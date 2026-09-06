import { redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { fichaDeAlergeniosDoProduto, listarProdutos } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-001 · "Tu catálogo, conectado" (atlas p. 53)
 *
 * Quatro contadores no atlas e um gráfico marcado **"Datos ilustrativos"**. É
 * essa palavra que decide o que aqui aparece, como no ORG-013 do E06:
 *
 * - **Produtos** conta-se, e é real.
 * - **Alérgenos por declarar** conta-se, e é o número que mais importa nesta
 *   etapa: um catálogo com oitenta produtos e mil e cem declarações em falta é
 *   uma carta que não se pode publicar, e ninguém vê isso produto a produto.
 * - **Publicados** e **sem foto** ficam por medir: publicar é E08 e as imagens
 *   são de uma etapa posterior.
 * - **Não há gráfico.** Uma série de sete dias exigiria sete dias de história
 *   que ninguém guardou.
 */
export default async function ResumoDoCatalogo({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produtos = await listarProdutos(db);
    let porDeclarar = 0;
    for (const p of produtos) {
      const ficha = await fichaDeAlergeniosDoProduto(db, p.id);
      porDeclarar += ficha.filter((l) => l.estado === 'DESCONHECIDO').length;
    }
    return { total: produtos.length, porDeclarar };
  });

  const medidos = [
    { rotulo: c.kpiProdutos, valor: formatarNumero(dados.total, idioma) },
    { rotulo: c.kpiPorDeclarar, valor: formatarNumero(dados.porDeclarar, idioma) },
  ];
  const porMedir = [
    { rotulo: c.kpiPublicados, razao: c.razaoPublicacao },
    { rotulo: c.kpiSemFoto, razao: c.razaoFoto },
  ];

  return (
    <div className={true ? 'bo-pagina bo-condicional-inexistente' : 'bo-pagina'}>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaResumo}</p>
          <h1>{c.tituloResumo}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`/${idioma}/app/${orgSlug}/catalogo/produtos/novo`}>
          {c.accaoCriarProduto}
        </a>
      </div>

      <div className="bo-uso">
        {medidos.map((k) => (
          <Cartao key={k.rotulo} className="bo-uso__cartao">
            <p className="bo-uso__rotulo">{k.rotulo}</p>
            <p className="bo-uso__valor">{k.valor}</p>
          </Cartao>
        ))}
        {porMedir.map((k) => (
          <Cartao key={k.rotulo} variante="suave" className="bo-uso__cartao">
            <p className="bo-uso__rotulo">{k.rotulo}</p>
            {/* Sem número. Um traço é honesto; um zero diria que se contou. */}
            <p className="bo-uso__valor bo-uso__valor--ausente">{m.uso.aindaNaoMedido}</p>
            <p className="bo-uso__nota">{k.razao}</p>
          </Cartao>
        ))}
      </div>

      <div className="bo-planos">
        {[
          ['produtos', c.tituloProdutos], ['menus', c.tituloMenus],
          ['categorias', c.tituloCategorias], ['opcoes', c.tituloBiblioteca],
          ['alergenos', c.tituloBibliotecaAlergenos],
        ].map(([rota, titulo]) => (
          <Cartao key={rota} className="bo-planos__cartao">
            <h2 className="bo-planos__nome">{titulo}</h2>
            <a className="bo-botao bo-botao--secundario"
               href={`/${idioma}/app/${orgSlug}/catalogo/${rota}`}>{m.plataforma.abrirDetalhe}</a>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
