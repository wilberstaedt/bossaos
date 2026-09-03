import { redirect } from 'next/navigation';
import { Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import {
  actorDoPedido, comEscopoDoPedido, organizacoesDoActor, resolverPedido,
} from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ONB-006 · "Organiza el primer menú" (atlas p. 30)
 *
 * O menu nasce com secções, e não vazio. **É a diferença entre um passo cumprido
 * e um passo que parece cumprido:** um menu sem secções existe na lista, faz o
 * item do arranque ficar verde, e não pode ser publicado — e a pessoa só
 * descobre isso no CAT-025, três ecrãs depois, quando já não se lembra deste.
 *
 * Por isso as categorias aparecem aqui com a contagem de produtos: escolher às
 * cegas entre "Entradas" e "Postres" sem saber qual tem quarenta produtos e qual
 * tem zero é escolher por adivinhação.
 */
export default async function MenuInicial({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ org?: string; erro?: string }>;
}) {
  const { idioma } = await params;
  const { org, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  const minhas = await organizacoesDoActor(actor.id);
  const activa = minhas.find((o) => o.slug === org) ?? minhas.find((o) => o.estado === 'ACTIVO');
  if (!activa) redirect(`/${idioma}/onboarding/organizacao`);

  const sessao = await resolverPedido(activa.slug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    categorias: await db.category.findMany({
      where: { archivedAt: null },
      select: { id: true, nome: true, _count: { select: { produtos: true } } },
      orderBy: { ordem: 'asc' },
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.arranque.itemCarta}</p>
          <h1>{c.tituloMenuInicial}</h1>
        </div>
      </div>
      {erro ? <p className="bo-campo__erro">{erro}</p> : null}

      <Cartao>
        <form method="post" action={`/api/org/${activa.slug}/menus`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="arranque" value="1" />
          <div className="bo-forma__grelha">
            <Campo rotulo={m.catalogoE07.nome} name="nome" required />
            <Seletor rotulo="Marca" name="brandId" required>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
          </div>

          <Cartao variante="suave">
            <h2 className="bo-planos__nome">{m.catalogoE07.tituloCategorias}</h2>
            {dados.categorias.length === 0
              ? <p className="bo-planos__nota">{m.plataforma.semRegistos}</p>
              : dados.categorias.map((x) => (
                <label key={x.id} className="bo-campo__envolvente">
                  <input type="checkbox" name="juntar" value={x.id}
                         defaultChecked={x._count.produtos > 0} />
                  {/* A contagem ao lado: escolher entre "Entradas" e "Postres"
                      sem saber qual tem quarenta produtos é adivinhar. */}
                  <span>
                    {x.nome}
                    <span className="bo-uso__nota">
                      {` · ${formatarNumero(x._count.produtos, idioma)}`}
                    </span>
                  </span>
                </label>
              ))}
          </Cartao>

          <Botao type="submit">{c.accaoCriarMenuInicial}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaMenuInicial}</p>
      </Cartao>

      <div className="bo-estado__accoes">
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/onboarding/pronto?org=${activa.slug}`}>{m.arranque.pronto.titulo}</a>
      </div>
    </div>
  );
}
