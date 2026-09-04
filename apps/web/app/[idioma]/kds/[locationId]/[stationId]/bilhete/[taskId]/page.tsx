import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { estadoDerivado } from '@bossaos/db';
import { formatarHora, type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import {
  CabecalhoDoKds, TempoDoBilhete, porChaveDoKds, textosDoKds,
} from '../../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-003 · «Mesa 07 · Ticket A104» (atlas p. 186) — a ficha de um bilhete.
 *
 * ── Mostra as OUTRAS estações do mesmo pedido ─────────────────────────────
 *
 * É o que faz esta tela valer a pena: quem está na grelha vê que a batata está
 * na fritadeira e ainda não saiu. Sem isso, cada estação acha que acabou o
 * trabalho e a mesa fica à espera de uma peça que ninguém está a olhar.
 *
 * O invariante «uma estação só vê as suas tarefas» é sobre o **quadro de
 * trabalho**, não sobre saber se a mesa está completa — e o contrato diz que o
 * pronto do pedido é *todas as tarefas prontas*, o que obriga a poder contá-las.
 */
export default async function FichaDoBilhete({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string; taskId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId, stationId, taskId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes, orgSlug } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tarefa = await comEscopoDoPedido(sessao, (db) => db.productionTask.findFirst({
    where: { id: taskId, locationId: unidade.id },
    include: {
      linha: { select: { nome: true, quantidade: true, estado: true } },
      pedido: { select: { id: true, numero: true, canal: true } },
      estacao: { select: { nome: true } },
    },
  }));
  if (!tarefa) notFound();

  const irmas = await comEscopoDoPedido(sessao, (db) => db.productionTask.findMany({
    where: { orderId: tarefa.orderId },
    include: { estacao: { select: { nome: true } }, linha: { select: { nome: true } } },
    orderBy: { criadaEm: 'asc' },
  }));
  const agora = await agoraNoServidor(sessao);
  const derivado = estadoDerivado(irmas);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={`${tarefa.pedido.numero} · ${tarefa.linha.nome}`} tela="KDS-003" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId} actual="" />

      {typeof busca.erro === 'string' ? (
        <div data-teste="recusa"><Aviso tom="perigo" titulo={s.bilhete}>{busca.erro}</Aviso></div>
      ) : null}

      <p data-teste="estado-da-tarefa">
        <Etiqueta tom={tarefa.estado === 'PRONTA' ? 'sucesso' : 'neutro'}>
          {porChaveDoKds(s, `tarefa${tarefa.estado}`) ?? tarefa.estado}
        </Etiqueta>
        {' · '}
        <TempoDoBilhete criadaEmMs={tarefa.criadaEm.getTime()} agoraNoServidorMs={agora} s={s} />
      </p>
      <p className="bo-campo__ajuda">{s.tempoDoServidor}</p>

      <h2>{s.passe}</h2>
      {/* A contagem do pedido inteiro. `2/3` diz o que falta; um «pronto» aqui
          fazia sair comida fria. */}
      <p data-teste="contagem-do-pedido"
         data-prontas={derivado?.prontas ?? ''} data-total={derivado?.total ?? ''}>
        {derivado?.prontas ?? 0}/{derivado?.total ?? 0}
        {' · '}
        {porChaveDoKds(s, `pedido${derivado?.estado ?? ''}`) ?? ''}
      </p>

      <ul className="bo-publico__lista" data-teste="irmas">
        {irmas.map((t) => (
          <li key={t.id} className="bo-publico__produto" data-teste="irma"
              data-estado={t.estado} data-propria={t.id === tarefa.id ? '1' : '0'}>
            <span className="bo-publico__nome">{t.linha.nome}</span>
            <span className="bo-publico__preco">
              {porChaveDoKds(s, `tarefa${t.estado}`) ?? t.estado}
            </span>
            <p className="bo-publico__descricao">
              {/* Ausência é ausência: uma tarefa sem estação diz-se, e não se
                  finge que pertence a alguma. */}
              {t.estacao?.nome ?? s.naoEncaminhado}
              {t.prontaEm ? ` · ${formatarHora(t.prontaEm, idioma)}` : ''}
            </p>
          </li>
        ))}
      </ul>

      {tarefa.estado === 'POR_INICIAR' || tarefa.estado === 'EM_PREPARO' ? (
        <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="cancelar">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="stationId" value={stationId} />
          <input type="hidden" name="seccao" value="" />
          <input type="hidden" name="accao" value="transitar" />
          <input type="hidden" name="taskId" value={tarefa.id} />
          <input type="hidden" name="para" value="CANCELADA" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="motivo">{s.motivo}</label>
            <input className="bo-campo__controlo" id="motivo" name="motivo" required />
          </span>
          <p className="bo-campo__ajuda">{s.motivoObrigatorio}</p>
          <button className="bo-botao bo-botao--perigo bo-botao--operacao" type="submit">
            {s.accaoCancelar}
          </button>
        </form>
      ) : null}
    </div>
  );
}
