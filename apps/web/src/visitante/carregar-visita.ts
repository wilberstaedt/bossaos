import { redirect } from 'next/navigation';
import { listarPedidos, obterPrisma } from '@bossaos/db';
import { comEscopo } from '@bossaos/db';
import { obterEnv } from '../servidor.ts';
import { visitanteDaRequisicao } from './sessao-do-visitante.ts';

/**
 * O que todas as telas da visita precisam.
 *
 * ── Sem sessão viva, vai para o ESTADO que o explica ──────────────────────
 *
 * E não para a carta em silêncio. Quem estava a pedir e viu a conta fechar
 * merece a frase — «a conta fechou e com ela este acesso; o que pediste continua
 * no pedido da mesa» — e não um ecrã que se comporta como se ele nunca tivesse
 * estado ali. É o STATE-009, e existe por isto.
 */
export async function carregarVisita(publicSlug: string, locale: string) {
  const visitante = await visitanteDaRequisicao();
  if (!visitante) redirect(`/r/${publicSlug}/${locale}/menu?sessao=terminou`);
  return visitante;
}

/**
 * Os pedidos desta mesa, lidos com o escopo do inquilino que a porta validou.
 *
 * O visitante vê **a sua mesa** e mais nada: o filtro é a `tableSessionId` que
 * veio da credencial, não um identificador do endereço. O convidado da mesa 5
 * não vê a mesa 4 — é a regra do `autenticacao-e-convites.md`, e aqui ela é a
 * forma da consulta.
 */
export async function pedidosDaMesa(visitante: {
  organizationId: string; locationId: string; tableSessionId: string;
}) {
  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  return comEscopo(prisma, { organizationId: visitante.organizationId }, async (db) => {
    const todos = await listarPedidos(db, visitante.locationId);
    return todos.filter((p: { tableSessionId: string | null }) =>
      p.tableSessionId === visitante.tableSessionId);
  });
}
