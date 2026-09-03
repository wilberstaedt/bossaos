import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-004 · "Organiza tu carta" (atlas p. 56)
 *
 * O atlas desenha isto a arrastar. **A ordem aqui é um número que se escreve.**
 *
 * Não é preguiça: é a ordem pela qual as duas coisas têm de existir. O que a
 * carta publicada lê é a coluna `ordem`; arrastar é uma forma de a escrever. Com
 * o número, a funcionalidade está inteira e funciona num tablet de cozinha com o
 * JavaScript em baixo. Com o arrastar sozinho, não haveria nada por baixo.
 *
 * Fica declarado como pendência do E07: **arrastar é melhoria, não requisito**.
 */
export default async function OrdemDoMenu({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; menuId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, menuId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.findFirst({ where: { id: menuId }, select: { id: true, nome: true } });
    if (!menu) return null;
    const seccoes = await db.menuCategory.findMany({
      where: { menuId },
      select: { id: true, ordem: true, category: { select: { id: true, nome: true } } },
      orderBy: { ordem: 'asc' },
    });
    const todas = await db.category.findMany({
      where: { archivedAt: null }, select: { id: true, nome: true }, orderBy: { nome: 'asc' },
    });
    return { menu, seccoes, todas };
  });
  if (!dados) notFound();

  const jaNoMenu = new Set(dados.seccoes.map((s) => s.category.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaSeccoes}</p>
          <h1>{dados.menu.nome}</h1>
        </div>
      </div>
      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}

      <form method="post" action={`/api/org/${orgSlug}/menus/${menuId}/ordem`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        {dados.seccoes.length === 0 ? <Cartao variante="suave">{c.semSeccoes}</Cartao> : null}
        {dados.seccoes.map((s) => (
          <Cartao key={s.id}>
            <div className="bo-forma__grelha">
              <Campo rotulo={c.seccao} defaultValue={s.category.nome} readOnly />
              <Campo rotulo={c.ordem} name={`ordem:${s.id}`} type="number" min={1}
                     defaultValue={String(s.ordem)} />
            </div>
          </Cartao>
        ))}

        <Cartao variante="suave">
          <h2 className="bo-planos__nome">{c.tituloCategorias}</h2>
          {dados.todas.filter((x) => !jaNoMenu.has(x.id)).map((x) => (
            <label key={x.id} className="bo-campo__envolvente">
              <input type="checkbox" name="juntar" value={x.id} />
              <span>{x.nome}</span>
            </label>
          ))}
        </Cartao>

        <Botao type="submit">{c.accaoGuardarOrdem}</Botao>
        <p className="bo-planos__nota">{c.notaOrdem}</p>
      </form>
    </div>
  );
}
