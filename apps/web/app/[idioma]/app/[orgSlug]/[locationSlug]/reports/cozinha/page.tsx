import { minutosDecorridos } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-009 · «Tiempos de cocina» (atlas p. 285)
 *
 * ── Mede o que ACONTECEU, com os carimbos do servidor ─────────────────────
 *
 * O tempo de uma tarefa é `pronta_em − criada_em`, e os dois vêm da base. Não há
 * aqui um relógio de cliente, e não pode haver: um relatório calculado com o
 * relógio de quem o abre dava números diferentes a duas pessoas na mesma sala.
 *
 * ── E as que não acabaram NÃO entram na média ─────────────────────────────
 *
 * Uma tarefa por acabar não tem tempo — não tem um tempo grande, não tem
 * nenhum. Contá-la como zero puxava a média para baixo e fazia a cozinha parecer
 * mais rápida do que é, exactamente nas noites em que ficou trabalho por fazer.
 */
export default async function TemposDeCozinha({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const s = m.kdsE16;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const tarefas = await comEscopoDoPedido(sessao, (db) => db.productionTask.findMany({
    where: { locationId: unidade.id, prontaEm: { not: null } },
    include: { estacao: { select: { id: true, nome: true } } },
  }));

  // Agrupadas por estação. Uma média da unidade inteira esconde a estação que
  // está a atrasar tudo — que é a única coisa que este relatório existe para
  // dizer.
  const porEstacao = new Map<string, { nome: string; minutos: number[] }>();
  for (const t of tarefas) {
    if (!t.prontaEm) continue;
    const minutos = minutosDecorridos(t.criadaEm.getTime(), t.prontaEm.getTime());
    if (minutos === null) continue;
    const chave = t.estacao?.id ?? 'sem-estacao';
    const linha = porEstacao.get(chave) ?? { nome: t.estacao?.nome ?? s.naoEncaminhado, minutos: [] };
    linha.minutos.push(minutos);
    porEstacao.set(chave, linha);
  }

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="REP-009">{s.temposDeCozinha}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/reports`}>{m.comum.voltar}</a>
      </div>

      <p className="bo-campo__ajuda">{s.tempoDoServidor}</p>
      {/* A população, declarada antes de qualquer média. Uma média sobre duas
          tarefas não é uma média — e sem o número ninguém sabe qual é o caso. */}
      <p data-teste="quantas">{tarefas.length}</p>

      {porEstacao.size === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-tempos">{s.semTempos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="tempos">
          {[...porEstacao.entries()].map(([chave, linha]) => {
            const total = linha.minutos.reduce((a, b) => a + b, 0);
            const media = Math.round(total / linha.minutos.length);
            const maisLento = Math.max(...linha.minutos);
            return (
              <li key={chave} className="bo-publico__produto" data-teste="estacao"
                  data-medio={media} data-quantas={linha.minutos.length}>
                <span className="bo-publico__nome">{linha.nome}</span>
                <span className="bo-publico__preco">{media} {s.minutos}</span>
                <p className="bo-publico__descricao">
                  {s.medio}: {media} {s.minutos}
                  {' · '}{s.maisLento}: {maisLento} {s.minutos}
                  {' · '}{s.noTotal}: {linha.minutos.length}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
