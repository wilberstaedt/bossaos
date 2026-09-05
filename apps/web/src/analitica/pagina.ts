import { notFound } from 'next/navigation';
import {
  estadoDosPagamentos, evolucaoDeCustos, janelasDasUnidades, movimentosDeArmazem,
  porCampanha, recorrencia, totalDaOrganizacao, trabalhoPorFuncao, vendasPorUnidade,
} from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas da analítica precisam, e precisam igual.
 *
 * ── Nenhuma delas recebe um número solto ──────────────────────────────────
 *
 * Tudo o que vem do motor é `Medido<T>`: ou traz um valor, ou diz que não
 * mediu. As telas têm de decidir o que escrever nos dois casos — e é isso que
 * impede o `0` de significar as duas coisas.
 */
export function mesCorrente(): { de: string; ate: string } {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth();
  return {
    de: new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10),
    ate: new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10),
  };
}

/** REP-016 · a comparação entre unidades vive ao nível da ORGANIZAÇÃO. */
export async function carregarComparacao(idioma: string, orgSlug: string) {
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const periodo = mesCorrente();
  const { unidades, janelas } = await comEscopoDoPedido(sessao, async (db) => ({
    unidades: await vendasPorUnidade(db, periodo),
    janelas: await janelasDasUnidades(db, new Date()),
  }));
  return {
    idioma, orgSlug, sessao, periodo, unidades, janelas,
    total: totalDaOrganizacao(unidades),
  };
}

export async function carregarRelatorio(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const periodo = mesCorrente();
  const hoje = new Date().toISOString().slice(0, 10);
  const dados = await comEscopoDoPedido(base.sessao, async (db) => ({
    trabalho: await trabalhoPorFuncao(db, {
      locationId: base.unidade.id, diaDeServico: hoje,
    }),
    pagamentos: await estadoDosPagamentos(db, { locationId: base.unidade.id }),
    armazem: await movimentosDeArmazem(db, { locationId: base.unidade.id }),
    custos: await evolucaoDeCustos(db, { locationId: base.unidade.id }),
    recorrencia: await recorrencia(db, { locationId: base.unidade.id }),
    campanhas: await porCampanha(db, { locationId: base.unidade.id }),
    vendas: await vendasPorUnidade(db, periodo),
  }));
  return { ...base, orgSlug, periodo, hoje, ...dados };
}
