import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { fichaDeAlergeniosDoProduto, listarMarcas, obterProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-009 · a ficha do produto (atlas p. 61)
 *
 * O campo escondido `versao` é o que faz o aceite 3 funcionar: vai com o
 * formulário, e o servidor só grava se ainda for a versão que estava lá. Quem
 * tiver o ecrã aberto há dez minutos recebe conflito em vez de apagar o trabalho
 * de quem gravou entretanto.
 */
export default async function FichaDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    const ficha = await fichaDeAlergeniosDoProduto(db, productId);
    return {
      produto, marcas: await listarMarcas(db),
      porDeclarar: ficha.filter((l) => l.estado === 'DESCONHECIDO').length,
      categorias: await db.category.findMany({
        where: { archivedAt: null }, select: { id: true, nome: true }, orderBy: { ordem: 'asc' },
      }),
    };
  });
  if (!dados) notFound();

  const { produto, categorias, porDeclarar } = dados;
  const base = `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}`;

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        {/* A versão que este ecrã leu. Sem isto não há concorrência optimista. */}
        <input type="hidden" name="versao" value={produto.version} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelhaProdutos}</p>
            <h1>{produto.nome}</h1>
          </div>
          <Botao type="submit">{c.accaoGuardar}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
        {erro === 'conflito_de_versao'
          ? <Aviso tom="perigo" titulo={c.accaoGuardar} urgente>{c.conflito}</Aviso> : null}
        {porDeclarar > 0
          ? <Aviso tom="aviso" titulo={c.sobrancelhaAlergenos}>
              {c.porDeclarar.replace('{n}', String(porDeclarar))} · {c.notaAlergenos}
            </Aviso>
          : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={c.nome} name="nome" defaultValue={produto.nome} required />
          <Campo rotulo={c.descricao} name="descricao" defaultValue={produto.descricao ?? ''} />
          <Campo rotulo={c.referencia} name="sku" defaultValue={produto.sku ?? ''} />
          <Seletor rotulo={c.categoria} name="categoryId" defaultValue={produto.category?.id ?? ''}>
            <option value="">{m.arranque.porEscolher}</option>
            {categorias.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Seletor>
          <Seletor rotulo={c.estado} name="estado" defaultValue={produto.estado}>
            <option value="RASCUNHO">{c.estadoRASCUNHO}</option>
            <option value="ACTIVO">{c.estadoACTIVO}</option>
            <option value="ARQUIVADO">{c.estadoARQUIVADO}</option>
          </Seletor>
          {/* O atlas mostra "Origen: Catálogo de marca". É verdade e é fixo: um
              produto é da marca, e é isso que impede a cópia por canal. */}
          <Campo rotulo={c.origem} defaultValue={c.origemMarca} readOnly />
        </div>
      </form>

      <Cartao>
        <div className="bo-estado__accoes">
          {[
            ['precos', c.tituloPrecos], ['variantes', c.tituloVariantes],
            ['opcoes', c.tituloOpcoes], ['alergenos', c.tituloAlergenos],
            ['canais', c.tituloCanais], ['disponibilidade', c.tituloDisponibilidade],
          ].map(([rota, titulo]) => (
            <a key={rota} className="bo-botao bo-botao--secundario" href={`${base}/${rota}`}>{titulo}</a>
          ))}
        </div>
      </Cartao>
    </div>
  );
}
