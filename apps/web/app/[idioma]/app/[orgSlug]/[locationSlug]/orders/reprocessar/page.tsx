import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * ORD-011 · «Reintenta de forma segura» (atlas p. 118)
 *
 * ── «De forma segura» quer dizer uma coisa concreta ───────────────────────
 *
 * Quer dizer **idempotente**: reprocessar duas vezes não produz dois efeitos.
 * Não é uma promessa desta tela — é a identidade do acontecimento e a restrição
 * única na base, e é por isso que o botão pode existir sem medo.
 *
 * O contrário seria o botão perigoso do produto: um «tentar outra vez» que
 * duplica a venda porque quem o carregou não sabia se a primeira tinha passado.
 * Quem não sabe se passou é exactamente quem carrega em reprocessar.
 *
 * ── E um evento já aplicado não se reaplica ───────────────────────────────
 *
 * A função privilegiada devolve o estado que já lá estava e não faz nada. Um
 * webhook atrasado que chega depois de um cancelamento **não reactiva a
 * assinatura** — o aceite 1 do prompt desta etapa —, porque o estado já não é
 * `RECEBIDO`.
 */
export default async function ReprocessarEvento({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  // Os acontecimentos de fornecedor por reconciliar, do E23 — que é o que esta
  // tela reprocessa. Os eventos de COBRANÇA DO SAAS não aparecem aqui: são de
  // outra contabilidade e de outro dono, e vivem na PLAT-005.
  const eventos = await comEscopoDoPedido(sessao, (db) =>
    db.providerEvent.findMany({
      where: { organizationId: sessao.contexto.organizationId },
      select: {
        id: true, tipo: true, recebidoEm: true, attemptId: true, estadoProvedor: true,
      },
      orderBy: { recebidoEm: 'desc' }, take: 30,
    }));

  // ── «Por processar» DERIVA-SE, e não há coluna para ele ────────────────
  //
  // Escrevi `processadoEm` à primeira, e o typecheck disse que não existe. Foi
  // bom: uma coluna «processado» é um estado que alguém escreve, e o E23 não a
  // tem de propósito — um acontecimento sem tentativa associada é um que ainda
  // não encontrou o pagamento dele, e isso lê-se da ligação, não de um carimbo.
  //
  // Um número que se pode derivar nunca se escreve, e um estado também não.
  const porProcessar = eventos.filter(
    (e: { attemptId: string | null }) => e.attemptId === null);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="ORD-011">{s.reprocessar}</h1>
        </div>
      </div>

      {porProcessar.length === 0 ? (
        <div data-teste="sem-eventos">
          <Aviso tom="sucesso" titulo={s.reprocessar}>{s.semEventos}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="eventos">
          {porProcessar.map((e: { id: string; tipo: string; recebidoEm: Date }) => (
            <li key={e.id} data-teste="evento">
              <span>{e.tipo}</span>{' '}
              <Etiqueta tom="aviso">{s.entregaEstadoPOR_ENVIAR}</Etiqueta>
              <p className="bo-campo__ajuda">
                {formatarDataHora(e.recebidoEm, idioma)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p data-teste="quantos">{porProcessar.length}</p>
    </div>
  );
}
