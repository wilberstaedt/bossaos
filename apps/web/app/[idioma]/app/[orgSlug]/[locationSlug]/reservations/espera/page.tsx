import { Tabela } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { esperaDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-008 · «Lista de espera» (atlas p. 144)
 *
 * ── O host vê a ordem de CHEGADA, e a tela diz que é isso ─────────────────
 *
 * «O host precisa de ver a ordem de chegada, porque é a informação que lhe
 * permite ser justo de propósito quando decide não a seguir.»
 *
 * Esta lista **não** mostra posições. Mostra quem chegou primeiro, e diz por
 * palavras que essa não é a ordem em que se sentam — senão o host lê-a como uma
 * fila e o produto acaba a decidir por ele em silêncio.
 */
export default async function EsperaOperacional({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const lista = await comEscopoDoPedido(sessao, (db) => esperaDaUnidade(db, unidade.id));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-008" titulo={h.espera} activa="/espera">
      <p className="bo-campo__ajuda" data-teste="ordem-chegada">{h.ordemChegada}</p>
      {/* A frase que impede a lista de ser lida como uma fila. */}
      <p className="bo-campo__ajuda" data-teste="ordem-ajuda">{h.ordemAjuda}</p>
      <Tabela
        legenda={h.espera}
        vazio={<p data-teste="sem-espera">{h.semEspera}</p>}
        colunas={[
          { chave: 'chegou', rotulo: h.hora },
          { chave: 'nome', rotulo: h.nome },
          { chave: 'pessoas', rotulo: h.pessoas, numero: true },
          { chave: 'estado', rotulo: h.estado },
        ]}
        linhas={lista.map((e) => ({
          id: e.id, chegou: formatarHora(e.chegouEm, idioma), nome: e.nome,
          pessoas: String(e.pessoas), estado: e.estado,
        }))}
      />
    </EstruturaDoHost>
  );
}
