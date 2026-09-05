import { notFound } from 'next/navigation';
import {
  correccoesDaUnidade, equipaDaUnidade, funcoesDaUnidade, jornadaDoDia,
  jornadasDaUnidade, marcacoesDoDia, turnosDaSemana,
} from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas do ponto precisam, e precisam igual.
 *
 * ── O nome de quem corrigiu vem pela PORTA, e não por junção ──────────────
 *
 * `users` tem RLS de identidade própria: uma junção devolveria o nome de quem
 * está a ver e nulo para toda a gente. A `equipaDaUnidade` resolve-o pela porta
 * `identidades_da_organizacao`, e as telas cruzam pelo identificador da
 * pertença — que é o que as marcações guardam.
 */
export async function carregarEquipa(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const { equipa, funcoes } = await comEscopoDoPedido(base.sessao, async (db) => ({
    equipa: await equipaDaUnidade(db, base.sessao.contexto.organizationId),
    funcoes: await funcoesDaUnidade(db, base.unidade.id),
  }));
  const nomeDe = (membershipId: string) =>
    equipa.find((m) => m.id === membershipId)?.nome
    ?? equipa.find((m) => m.id === membershipId)?.email
    ?? '—';
  return { ...base, orgSlug, equipa, funcoes, nomeDe };
}

/** O dia de serviço de hoje, na hora da CASA — nunca no relógio do servidor. */
export function hojeDaCasa(fuso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export async function carregarPessoa(
  idioma: string, orgSlug: string, locationSlug: string,
  membershipId: string, dia?: string,
) {
  const base = await carregarEquipa(idioma, orgSlug, locationSlug);
  const pessoa = base.equipa.find((m) => m.id === membershipId);
  if (!pessoa) notFound();
  const fuso = base.unidade.fuso ?? 'Europe/Madrid';
  const diaDeServico = dia ?? hojeDaCasa(fuso);
  const { marcacoes, jornada } = await comEscopoDoPedido(base.sessao, async (db) => ({
    marcacoes: await marcacoesDoDia(db, { membershipId, diaDeServico }),
    jornada: await jornadaDoDia(db, {
      membershipId, locationId: base.unidade.id, diaDeServico, fuso,
    }),
  }));
  return { ...base, pessoa, diaDeServico, fuso, marcacoes, jornada };
}

export async function carregarEscala(
  idioma: string, orgSlug: string, locationSlug: string, de: string, ate: string,
) {
  const base = await carregarEquipa(idioma, orgSlug, locationSlug);
  const turnos = await comEscopoDoPedido(base.sessao,
    (db) => turnosDaSemana(db, { locationId: base.unidade.id, de, ate }));
  return { ...base, turnos, de, ate };
}

export async function carregarHoras(
  idioma: string, orgSlug: string, locationSlug: string, dia?: string,
) {
  const base = await carregarEquipa(idioma, orgSlug, locationSlug);
  const fuso = base.unidade.fuso ?? 'Europe/Madrid';
  const diaDeServico = dia ?? hojeDaCasa(fuso);
  const jornadas = await comEscopoDoPedido(base.sessao, (db) => jornadasDaUnidade(db, {
    organizationId: base.sessao.contexto.organizationId,
    locationId: base.unidade.id, diaDeServico, fuso,
  }));
  return { ...base, jornadas, diaDeServico, fuso };
}

export async function carregarCorreccoes(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarEquipa(idioma, orgSlug, locationSlug);
  const correccoes = await comEscopoDoPedido(base.sessao,
    (db) => correccoesDaUnidade(db, base.unidade.id));
  return { ...base, correccoes };
}
