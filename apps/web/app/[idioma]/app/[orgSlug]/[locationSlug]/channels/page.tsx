import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { estadoComercial, listarUnidades, podeCapacidade, publicacaoActual } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CHAN-001 · "Tus canales conectados" (atlas p. 83)
 *
 * ── O endereço público é único no MUNDO ────────────────────────────────────
 *
 * O `slug` interno da unidade é único dentro da organização — duas cadeias podem
 * ambas ter uma unidade `centro`. O endereço **público** vai para um URL na
 * internet aberta, e dois inquilinos a disputar `/r/la-societat/` é a carta de um
 * servida ao cliente do outro. Por isso é global, e a nota di-lo antes de a
 * pessoa escolher — descobri-lo com um erro depois de o imprimir é tarde.
 */
export default async function Canais({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const { erro, guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicoE09;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const unidade = unidades.find((u) => u.slug === locationSlug);
    if (!unidade) return null;
    const menus = await db.menu.findMany({
      where: { archivedAt: null }, select: { id: true, nome: true },
    });
    const publicadas = await Promise.all(
      menus.map(async (x) => [x, await publicacaoActual(db, x.id, 'CARTA')] as const),
    );
    return {
      unidade,
      publicado: publicadas.some(([, p]) => p !== null),
      estado: await estadoComercial(db, sessao.contexto.organizationId),
    };
  });
  if (!dados) notFound();

  const { unidade, publicado, estado } = dados;
  const temCarta = podeCapacidade(estado, { capacidade: 'carta.digital', intencao: 'usar' });
  const enderecoCompleto = unidade.publicSlug
    ? `/r/${unidade.publicSlug}/${idioma}/menu`
    : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaCanais}</p>
          <h1>{c.tituloCanais}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr`}>{c.tituloQr}</a>
      </div>

      {guardado ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}
      {erro === 'ocupado' ? <Aviso tom="perigo" titulo={c.enderecoOcupado} urgente /> : null}
      {erro === 'invalido' ? <Aviso tom="perigo" titulo={c.enderecoInvalido} urgente /> : null}

      <Cartao>
        <div className="bo-estado__cabecalho">
          <h2 className="bo-planos__nome">{c.canalCarta}</h2>
          <Etiqueta tom={temCarta.permitido && publicado ? 'sucesso' : 'neutro'}>
            {temCarta.permitido && publicado ? c.estadoLigado : c.estadoDesligado}
          </Etiqueta>
        </div>

        <form method="post"
              action={`/api/org/${orgSlug}/unidades/${unidade.id}/endereco-publico`}
              className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <div className="bo-forma__grelha">
            <Campo rotulo={c.enderecoPublico} name="publicSlug"
                   defaultValue={unidade.publicSlug ?? ''}
                   pattern="[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?" />
          </div>
          <Botao type="submit">{c.accaoDefinirEndereco}</Botao>
        </form>
        {/* Dito ANTES de escolher: descobri-lo com um erro depois de imprimir
            cinquenta menus é tarde. */}
        <p className="bo-planos__nota">{c.notaEndereco}</p>

        {enderecoCompleto
          ? <a className="bo-botao bo-botao--secundario" href={enderecoCompleto}>{c.verCarta}</a>
          : <p className="bo-planos__nota">{c.semEndereco}</p>}
      </Cartao>
    </div>
  );
}
