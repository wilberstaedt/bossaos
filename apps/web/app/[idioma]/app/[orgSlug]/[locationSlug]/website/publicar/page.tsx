import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-011 · «Publica tu web» (atlas p. 255) — o aceite 1 do E10.
 *
 * ── Publicar e retirar são dois botões, e é isso que os torna consistentes ─
 *
 * Um interruptor único faz a operação depender do estado que o ecrã acha que
 * tem. Dois botões nomeados dizem o que vão fazer, e quem carrega sabe o que
 * pediu mesmo que o ecrã esteja desactualizado.
 *
 * ── Retirar não larga o endereço público ─────────────────────────────────
 *
 * São decisões diferentes e têm ecrãs diferentes: o endereço vive no CHAN-001.
 * O QR está impresso, e um "retirar" que também libertasse o endereço punha o
 * nome de volta no mundo com o papel ainda nas mesas.
 */
export default async function PublicarSite({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ publicado?: string; retirado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const procura = await searchParams;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  const estado = rascunho?.estado ?? 'RASCUNHO';
  const accao = `/api/org/${orgSlug}/site/publicar`;
  const visiveis = rascunho ? rascunho.paginas.filter((p) => p.visivel).length : 0;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.publicar}</h1>
        </div>
        <Etiqueta tom={estado === 'PUBLICADO' ? 'sucesso' : 'neutro'}>
          {estado === 'PUBLICADO' ? g.publicado : estado === 'RETIRADO' ? g.retirado : g.rascunho}
        </Etiqueta>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/publicar" />

      {procura.publicado ? (
        <Aviso tom="sucesso" titulo={g.publicado}>{`${g.revisao} ${procura.publicado}`}</Aviso>
      ) : null}
      {procura.retirado === '1' ? <Aviso tom="info" titulo={g.retirado}>{g.semPublicar}</Aviso> : null}
      {procura.erro === 'sem_paginas_visiveis' ? (
        <Aviso tom="aviso" titulo={g.publicar}>{g.avisoRascunho}</Aviso>
      ) : null}
      {procura.erro === 'inicio_sem_conteudo' ? (
        <Aviso tom="aviso" titulo={g.inicio}>{g.avisoRascunho}</Aviso>
      ) : null}

      <dl className="bo-estado__factos">
        <dt>{g.estado}</dt>
        <dd>{estado === 'PUBLICADO' ? g.publicado : estado === 'RETIRADO' ? g.retirado : g.rascunho}</dd>
        <dt>{g.paginas}</dt>
        <dd>{visiveis}</dd>
        <dt>{g.verPublico}</dt>
        <dd>
          {unidade.publicSlug
            ? <a href={`/r/${unidade.publicSlug}/${idioma}`}>{`/r/${unidade.publicSlug}/${idioma}`}</a>
            : g.semEndereco}
        </dd>
      </dl>

      <form method="post" action={accao}>
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="publicar" />
        <button type="submit" className="bo-botao bo-botao--primario">{g.publicarAgora}</button>
      </form>

      <form method="post" action={accao} style={{ marginTop: 'var(--bo-espaco-md)' }}>
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="retirar" />
        <button type="submit" className="bo-botao bo-botao--secundario">{g.retirar}</button>
      </form>
    </div>
  );
}
