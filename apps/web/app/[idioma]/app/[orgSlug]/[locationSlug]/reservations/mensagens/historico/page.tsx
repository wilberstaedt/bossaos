import { Tabela } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { historicoDeMensagens } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-018 · «Mensajes enviados» (atlas p. 154)
 *
 * ── O histórico mostra as TENTATIVAS, e não só o resultado ────────────────
 *
 * «O resultado do provedor é guardado.» Uma coluna «estado: falhada» não diz
 * quantas vezes se tentou nem porquê — e é isso que alguém pergunta quando o
 * cliente liga a dizer que não recebeu nada.
 *
 * E a frase do reenvio está no ecrã: reenviar **não** entrega duas vezes. Sem
 * ela, quem carrega assume que carregou em vão e carrega mais.
 */
export default async function HistoricoDeMensagens({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const g = mensagensDe(idioma).mensagensE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const historico = await comEscopoDoPedido(sessao, (db) => historicoDeMensagens(db, unidade.id));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-018" titulo={g.historico} activa="">
      <p className="bo-campo__ajuda" data-teste="reenviar-ajuda">{g.reenviarAjuda}</p>
      <Tabela
        legenda={g.historico}
        vazio={<p data-teste="sem-mensagens">{g.semMensagens}</p>}
        colunas={[
          { chave: 'reserva', rotulo: g.reserva },
          { chave: 'tipo', rotulo: g.tipo },
          { chave: 'estado', rotulo: g.estado },
          { chave: 'tentativas', rotulo: g.tentativas },
          { chave: 'quando', rotulo: g.historico },
        ]}
        linhas={historico.map((x) => ({
          id: x.id, reserva: x.reserva.nome, tipo: x.tipo, estado: x.estado,
          // O número de tentativas, que é o que distingue «tentei outra vez» de
          // «o cliente recebeu duas vezes».
          tentativas: String(x.tentativas.length),
          quando: x.entregueEm ? formatarData(x.entregueEm, idioma) : '—',
        }))}
      />
    </EstruturaDoHost>
  );
}
