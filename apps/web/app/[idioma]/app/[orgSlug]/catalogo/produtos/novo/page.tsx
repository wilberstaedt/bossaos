import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Seletor } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-008 · "Nuevo producto" (atlas p. 60)
 *
 * O atlas põe aqui preço e imposto. O preço fica — mas como **regra base**, que
 * é o que o motor de precedência sabe resolver; guardá-lo numa coluna do produto
 * criava um segundo sítio onde o preço vive, e dois sítios divergem.
 *
 * O **imposto não fica**. Os perfis fiscais são o E24, e um seletor com "IVA
 * 10%" escrito à mão seria um número que alguém acredita e ninguém calculou.
 * Fica dito que está por validar, que é a verdade.
 *
 * Também não há campo de preço vazio a valer zero: sem regra, o produto fica
 * **sem preço**, e a lista di-lo com essas palavras.
 */
export default async function NovoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    categorias: await db.category.findMany({
      where: { archivedAt: null }, select: { id: true, nome: true }, orderBy: { ordem: 'asc' },
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaNovo}</p>
          <h1>{c.tituloNovo}</h1>
        </div>
      </div>
      {erro === 'quota_esgotada' ? <Aviso tom="aviso" titulo={m.planos.quotaEsgotada} /> : null}
      {erro === 'sem_plano' ? <Aviso tom="aviso" titulo={c.semPlano} /> : null}

      <Cartao>
        <form method="post" action={`/api/org/${orgSlug}/produtos`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            <Campo rotulo={c.nome} name="nome" required />
            <Campo rotulo={c.descricao} name="descricao" />
            <Campo rotulo={c.referencia} name="sku" />
            <Seletor rotulo="Marca" name="brandId" required>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
            <Seletor rotulo={c.categoria} name="categoryId" defaultValue="">
              <option value="">{m.arranque.porEscolher}</option>
              {dados.categorias.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </Seletor>
            <Campo rotulo={c.preco} name="montante" type="text" inputMode="decimal" />
            <Campo rotulo="ISO 4217" name="moeda" maxLength={3} />
          </div>
          {/* Não é um seletor de impostos vazio: é a razão por que não há um. */}
          <p className="bo-planos__nota">{`${c.imposto}: ${c.impostoPorValidar}`}</p>
          <Botao type="submit">{c.accaoCriar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}
