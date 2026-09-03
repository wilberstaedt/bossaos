import type { Prisma } from '@prisma/client';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Rasto de acções sensíveis (E04, entrega 5).
 *
 * A tabela é append-only por gatilho: `UPDATE` e `DELETE` rebentam, até para o
 * dono. Um rasto que se pode editar não serve para aquilo que existe.
 *
 * `motivo` não é decorativo. Uma auditoria que diz *o quê* e não diz *porquê*
 * obriga quem a lê, meses depois, a adivinhar — e quem adivinha absolve.
 */
export interface EventoDeAuditoria {
  accao: string;
  actorId?: string;
  actorEmail?: string;
  alvoTipo?: string;
  alvoId?: string;
  motivo?: string;
  /** Detalhe estruturado. **Nunca** senhas, nunca tokens (CT-04). */
  detalhe?: Record<string, unknown>;
}

/** Chaves que nunca entram no detalhe, mesmo que alguém as passe por engano. */
const PROIBIDAS = /senha|password|token|secret|segredo|authorization|cookie|hash/i;

export async function registar(
  db: ClienteComEscopo,
  organizationId: string,
  evento: EventoDeAuditoria,
): Promise<void> {
  // O tipo JSON do Prisma não aceita `unknown`, e forçá-lo com `as` esconderia
  // que um valor não serializável rebentaria na gravação. A travessia por
  // `JSON.parse(JSON.stringify(...))` faz a conversão acontecer AQUI, onde o
  // erro aponta para quem passou o valor, e não dentro do driver.
  const detalhe: Prisma.InputJsonValue | undefined = evento.detalhe
    ? (JSON.parse(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(evento.detalhe).map(([k, v]) =>
              PROIBIDAS.test(k) ? [k, '[redigido]'] : [k, v],
            ),
          ),
        ),
      ) as Prisma.InputJsonValue)
    : undefined;

  await db.auditEvent.create({
    data: {
      organizationId,
      accao: evento.accao,
      ...(evento.actorId ? { actorId: evento.actorId } : {}),
      ...(evento.actorEmail ? { actorEmail: evento.actorEmail } : {}),
      ...(evento.alvoTipo ? { alvoTipo: evento.alvoTipo } : {}),
      ...(evento.alvoId ? { alvoId: evento.alvoId } : {}),
      ...(evento.motivo ? { motivo: evento.motivo } : {}),
      ...(detalhe ? { detalhe } : {}),
    },
  });
}

export function listarAuditoria(db: ClienteComEscopo, limite = 100) {
  return db.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limite,
    select: {
      id: true, accao: true, actorEmail: true, alvoTipo: true,
      alvoId: true, motivo: true, createdAt: true,
    },
  });
}
