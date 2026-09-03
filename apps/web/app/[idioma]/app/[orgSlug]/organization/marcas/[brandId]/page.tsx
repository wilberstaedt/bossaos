import { notFound, redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { mensagensDe, NOME_DO_IDIOMA, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-003 · a marca (atlas p. 40)
 *
 * Do que o atlas desenha, três campos são reais hoje — nome público, identidade
 * textual, idioma principal — e três não: catálogo partilhado, canais e herança
 * de tema para novas unidades. Esses são E07, E08 e E12.
 *
 * Aparecem, e dizem que ainda não se medem. Desenhá-los com "Compartido por
 * marca" era o mais fácil, e teria sido uma afirmação sobre um mecanismo que
 * ninguém construiu.
 */
export default async function DetalheDaMarca({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; brandId: string }>;
}) {
  const { idioma, orgSlug, brandId } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marca: await db.brand.findFirst({
      where: { id: brandId, archivedAt: null },
      select: { nome: true, slug: true, descricao: true, idiomaPrincipal: true },
    }),
    unidades: await db.location.findMany({
      where: { brandId, archivedAt: null }, select: { nome: true },
    }),
  }));
  // Marca de outra organização e marca inexistente saem iguais. É a regra do E04.
  if (!dados.marca) notFound();

  const idiomaDaMarca = dados.marca.idiomaPrincipal;
  const factos: Array<{ rotulo: string; valor: string; ausente?: boolean }> = [
    { rotulo: m.arranque.marca.nomePublico, valor: dados.marca.nome },
    { rotulo: m.arranque.marca.identificador, valor: dados.marca.slug },
    {
      rotulo: m.arranque.marca.descricao,
      valor: dados.marca.descricao ?? m.unidades.porConfigurar,
      ausente: !dados.marca.descricao,
    },
    {
      rotulo: m.arranque.marca.idioma,
      valor: idiomaDaMarca
        ? (NOME_DO_IDIOMA[idiomaDaMarca as Idioma] ?? idiomaDaMarca)
        : m.arranque.porEscolher,
      ausente: !idiomaDaMarca,
    },
    {
      rotulo: m.unidades.sobrancelha,
      valor: dados.unidades.length > 0
        ? dados.unidades.map((u) => u.nome).join(' · ')
        : m.plataforma.semRegistos,
      ausente: dados.unidades.length === 0,
    },
    { rotulo: m.unidades.catalogo, valor: m.preferencias.cartaPorMedir, ausente: true },
    { rotulo: m.marca.herencia, valor: m.marca.herenciaPorMedir, ausente: true },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.marca.sobrancelha}</p>
          <h1>{dados.marca.nome}</h1>
        </div>
      </div>

      <Cartao variante="contornado" className="bo-plataforma__banner">
        <p className="bo-plataforma__banner-titulo">{m.plataforma.bannerTitulo}</p>
        <p className="bo-plataforma__banner-detalhe">{m.plataforma.bannerDetalhe}</p>
      </Cartao>

      <dl className="bo-estado__factos">
        {factos.map((f) => (
          <div key={f.rotulo}>
            <dt>{f.rotulo}</dt>
            <dd className={f.ausente ? 'bo-uso__valor--ausente' : undefined}>{f.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
