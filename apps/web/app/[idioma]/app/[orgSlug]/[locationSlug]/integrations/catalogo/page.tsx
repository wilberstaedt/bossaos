import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarIntegracoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-001 · «Conecta tus herramientas» (atlas p. 254)
 *
 * ── O que não está ligado **diz que não está ligado** ─────────────────────
 *
 * Um conector que finge funcionar é pior do que um que diz que não está ligado:
 * o primeiro só se descobre quando um cliente contava com ele.
 *
 * Por isso `DESLIGADA` vem sempre com os **requisitos por palavras** — e a base
 * recusa o contrário. Um beco sem indicação é o mesmo que silêncio: quem lê não
 * sabe o que fazer a seguir, e volta cá amanhã.
 */
export default async function CatalogoDeIntegracoes({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const integracoes = await comEscopoDoPedido(sessao,
    (db) => listarIntegracoes(db, sessao.contexto.organizationId));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/integrations`;

  const rotulo = (estado: string): string => {
    const v = (s as unknown as Record<string, unknown>)[`estado${estado}`];
    return typeof v === 'string' ? v : estado;
  };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-001">{s.catalogo}</h1>
        </div>
      </div>

      {integracoes.length === 0 ? (
        <div data-teste="sem-integracoes">
          <Aviso tom="info" titulo={s.catalogo}>{s.semIntegracoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="integracoes">
          {integracoes.map((i: {
            id: string; familia: string; provedor: string;
            estado: string; requisitos: string | null;
          }) => (
            <li key={i.id} data-teste="integracao">
              <a className="bo-lista__ligacao" data-seccao="INT-002"
                 href={`${base}/catalogo/${i.id}`}>
                <span>{i.familia} · {i.provedor}</span>
                <Etiqueta tom={
                  i.estado === 'ACTIVA' ? 'sucesso'
                    : i.estado === 'ERRO' ? 'perigo' : 'neutro'
                }>
                  {rotulo(i.estado)}
                </Etiqueta>
              </a>
              {/* O que falta, por palavras. Sem isto, «não conectada» é um beco. */}
              {i.requisitos ? (
                <p className="bo-campo__ajuda" data-teste="requisitos">
                  {s.requisitos}: {i.requisitos}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <nav className="bo-publico__seccoes" aria-label={s.catalogo}>
        <a data-seccao="INT-008" href={`${base}/chaves`}>{s.chaves}</a>
        <a data-seccao="INT-009" href={`${base}/webhooks`}>{s.webhooks}</a>
        <a data-seccao="INT-010" href={`${base}/registos`}>{s.registos}</a>
        <a data-seccao="INT-007" href={`${base}/delivery`}>{s.delivery}</a>
      </nav>
    </div>
  );
}
