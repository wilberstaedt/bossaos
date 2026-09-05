import { notFound } from 'next/navigation';
import {
  caixaDoPeriodo, centrosDeCusto, contasDaUnidade, correspondenciasDaConta,
  extractoDaConta, importacoesDaConta, periodosDaUnidade, resultadoDoPeriodo,
  totalizar,
} from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas do financeiro precisam, e precisam igual.
 *
 * ── As duas leituras carregam-se SEMPRE as duas ───────────────────────────
 *
 * Caixa pela data-valor, resultado pela ocorrência. Uma tela que só carregue
 * uma delas convida quem a lê a tomá-la pela resposta às duas perguntas — e as
 * perguntas são diferentes.
 */
export function mesCorrente(): { de: string; ate: string } {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth();
  const de = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
  const ate = new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
  return { de, ate };
}

export async function carregarFinanceiro(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const periodo = mesCorrente();
  const dados = await comEscopoDoPedido(base.sessao, async (db) => ({
    contas: await contasDaUnidade(db, base.unidade.id),
    caixa: await caixaDoPeriodo(db, { locationId: base.unidade.id, ...periodo }),
    resultado: await resultadoDoPeriodo(db, { locationId: base.unidade.id, ...periodo }),
    periodos: await periodosDaUnidade(db, base.unidade.id),
  }));
  return {
    ...base, orgSlug, periodo, ...dados,
    totalCaixa: totalizar(dados.caixa),
    totalResultado: totalizar(dados.resultado),
  };
}

export async function carregarConta(
  idioma: string, orgSlug: string, locationSlug: string, accountId: string,
) {
  const base = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const conta = base.contas.find((c) => c.id === accountId);
  if (!conta) notFound();
  const { linhas, importacoes, correspondencias } = await comEscopoDoPedido(
    base.sessao, async (db) => ({
      linhas: await extractoDaConta(db, accountId),
      importacoes: await importacoesDaConta(db, accountId),
      correspondencias: await correspondenciasDaConta(db, accountId),
    }),
  );
  return { ...base, conta, linhas, importacoes, correspondencias };
}

export async function carregarCentros(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const centros = await comEscopoDoPedido(base.sessao,
    (db) => centrosDeCusto(db, { locationId: base.unidade.id, ...base.periodo }));
  return { ...base, centros };
}
