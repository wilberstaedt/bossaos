import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-006 · editar categoria (atlas p. 58)
 *
 * `visivel` esconde a categoria da carta **sem a apagar** — e sem apagar os
 * produtos que estão nela. Uma categoria sazonal que se esconde em Janeiro volta
 * em Junho com as fichas de alérgenos intactas; apagada, voltaria vazia, e
 * alguém teria de as declarar outra vez de memória.
 */
export default async function EditarCategoria({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; categoryId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, categoryId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const categoria = await comEscopoDoPedido(sessao, (db) =>
    db.category.findFirst({
      where: { id: categoryId },
      select: { id: true, nome: true, descricao: true, ordem: true, visivel: true, version: true },
    }),
  );
  if (!categoria) notFound();

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/categorias/${categoryId}`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="versao" value={categoria.version} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelhaCategorias}</p>
            <h1>{c.tituloEditarCategoria}</h1>
          </div>
          <Botao type="submit">{c.accaoGuardarCategoria}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
        {erro === 'conflito_de_versao' ? <Aviso tom="perigo" titulo={c.conflito} urgente /> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={c.nome} name="nome" defaultValue={categoria.nome} required />
          <Campo rotulo={c.descricao} name="descricao" defaultValue={categoria.descricao ?? ''} />
          <Campo rotulo={c.ordem} name="ordem" type="number" min={1} defaultValue={String(categoria.ordem)} />
          <Seletor rotulo={c.visivel} name="visivel" defaultValue={categoria.visivel ? '1' : '0'}>
            <option value="1">{c.sim}</option>
            <option value="0">{c.nao}</option>
          </Seletor>
        </div>
      </form>
    </div>
  );
}
