import { notFound } from 'next/navigation';
import {
  campanhasDaUnidade, clientesDaUnidade, consentimentosDe, modelosDaUnidade,
  movimentosDePontos, origensDaUnidade, recompensasDaUnidade, respostasDaUnidade,
  segmentosDaUnidade,
} from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas do CRM precisam, e precisam igual.
 *
 * ── A lista de pessoas NUNCA traz uma permissão colada ────────────────────
 *
 * `clientesDaUnidade` devolve nome, contacto, origem e saldo — e mais nada.
 * Não há aqui nenhum campo que diga se a pessoa aceita campanhas, porque essa
 * pergunta não tem resposta guardada: faz-se, por finalidade e por canal, a
 * quem a queira saber, e é a base que a responde.
 */
export async function carregarCrm(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const { clientes, campanhas, segmentos } = await comEscopoDoPedido(base.sessao, async (db) => ({
    clientes: await clientesDaUnidade(db, base.unidade.id),
    campanhas: await campanhasDaUnidade(db, base.unidade.id),
    segmentos: await segmentosDaUnidade(db, base.unidade.id),
  }));
  return { ...base, orgSlug, clientes, campanhas, segmentos };
}

/** Uma pessoa, com as quatro respostas e o histórico do consentimento. */
export async function carregarCliente(
  idioma: string, orgSlug: string, locationSlug: string, customerId: string,
) {
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const cliente = base.clientes.find((c) => c.id === customerId);
  // Uma pessoa de outra unidade dá AUSÊNCIA, e não «proibido».
  if (!cliente) notFound();
  const { consentimentos, pontos } = await comEscopoDoPedido(base.sessao, async (db) => ({
    consentimentos: await consentimentosDe(db, customerId),
    pontos: await movimentosDePontos(db, customerId),
  }));
  return { ...base, cliente, consentimentos, pontos };
}

export async function carregarFidelidade(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const recompensas = await comEscopoDoPedido(base.sessao,
    (db) => recompensasDaUnidade(db, base.unidade.id));
  return { ...base, recompensas };
}

export async function carregarModelos(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const modelos = await comEscopoDoPedido(base.sessao,
    (db) => modelosDaUnidade(db, base.unidade.id));
  return { ...base, modelos };
}

export async function carregarVozes(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const respostas = await comEscopoDoPedido(base.sessao,
    (db) => respostasDaUnidade(db, base.unidade.id));
  return { ...base, respostas };
}

export async function carregarOrigens(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const origens = await comEscopoDoPedido(base.sessao,
    (db) => origensDaUnidade(db, base.unidade.id));
  return { ...base, origens };
}
