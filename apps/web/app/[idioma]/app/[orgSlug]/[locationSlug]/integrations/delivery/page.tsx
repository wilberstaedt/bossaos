import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarIntegracoes } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-007 · «Conecta delivery» (atlas p. 260)
 *
 * ── Esta tela existe para dizer que NÃO está ligada ───────────────────────
 *
 * Não há conta de agregador, não há chaves, e não há contrato assinado com
 * nenhum. Podia ter-se desenhado o ecrã com os botões todos e um «em breve» ao
 * lado — e seria o erro do E24 outra vez: um conector que finge funcionar só se
 * descobre quando um cliente contava com ele.
 *
 * O que ela faz é o que é verdadeiro e útil hoje: mostra o estado real e **o
 * que falta**, por palavras, para quem quiser avançar saber por onde.
 */
export default async function DeliveryProvider({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const todas = await comEscopoDoPedido(sessao,
    (db) => listarIntegracoes(db, sessao.contexto.organizationId));
  const entrega = todas.filter((i: { familia: string }) => i.familia === 'delivery');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-007">{s.delivery}</h1>
        </div>
      </div>

      {entrega.length === 0 ? (
        <div data-teste="sem-delivery">
          <Aviso tom="info" titulo={s.delivery}>{s.naoLigada}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="provedores-de-entrega">
          {entrega.map((i: {
            id: string; provedor: string; estado: string; requisitos: string | null;
          }) => (
            <li key={i.id} data-teste="provedor-de-entrega">
              <span>{i.provedor}</span>{' '}
              <Etiqueta tom={i.estado === 'ACTIVA' ? 'sucesso' : 'neutro'}>
                {i.estado === 'ACTIVA' ? s.estadoACTIVA : s.estadoDESLIGADA}
              </Etiqueta>
              {i.requisitos ? (
                <p className="bo-campo__ajuda" data-teste="requisitos">
                  {s.requisitos}: {i.requisitos}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
