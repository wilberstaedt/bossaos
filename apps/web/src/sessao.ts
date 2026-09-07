import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  comEscopo, comIdentidade, concessoesDoActor, obterPrisma, IdentificadorMalFormado,
  type ClienteComEscopo,
} from '@bossaos/db';
import {
  resolverContexto,
  type Concessao, type ContextoDeInquilino, type Resultado,
} from '@bossaos/domain';
import { criarAutenticacao, criarCorreio } from '@bossaos/auth';
import { obterEnv } from './servidor.ts';

/**
 * Resolver quem está a pedir, e o que ele pode.
 *
 * A regra que este ficheiro existe para tornar impossível de contornar:
 *
 * > **A URL selecciona o contexto; não o autentica.**
 *
 * `/api/org/marina-oropesa/...` diz qual organização o pedido quer. Quem decide
 * se ele a pode ter é a FILIAÇÃO, lida da base a cada pedido. É isso que faz uma
 * revogação notar-se ao pedido seguinte, em vez de quando a sessão expirar.
 */

let autenticacao: ReturnType<typeof criarAutenticacao> | undefined;

export function obterAutenticacao() {
  if (!autenticacao) {
    const env = obterEnv();
    autenticacao = criarAutenticacao({
      authDatabaseUrl: env.AUTH_DATABASE_URL,
      segredo: env.BETTER_AUTH_SECRET,
      urlBase: env.BETTER_AUTH_URL,
      correio: criarCorreio({ host: env.SMTP_HOST, porta: env.SMTP_PORT, de: env.MAIL_FROM }),
    });
  }
  return autenticacao;
}

export interface Actor {
  id: string;
  email: string;
  nome: string;
}

export type PedidoResolvido =
  | {
      ok: true;
      actor: Actor;
      contexto: ContextoDeInquilino;
      concessoes: readonly Concessao[];
      membershipId: string;
    }
  | { ok: false; resultado: Resultado<never> };

/** Quem está autenticado, sem organização nenhuma ainda. */
export async function actorDoPedido(): Promise<Actor | null> {
  const sessao = await obterAutenticacao().api.getSession({ headers: await headers() });
  if (!sessao?.user) return null;
  return {
    id: sessao.user.id,
    email: sessao.user.email,
    nome: (sessao.user as { name?: string }).name ?? '',
  };
}

/** As organizações onde este actor é membro. Caminho de identidade do E03. */
export async function organizacoesDoActor(actorId: string) {
  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  return semIdentificadorMalFormado(() => comIdentidade(prisma, actorId, async (db) => {
    const orgs = await db.organization.findMany({
      where: { archivedAt: null },
      select: { id: true, slug: true, nome: true },
      orderBy: { nome: 'asc' },
    });
    const filiacoes = await db.membership.findMany({
      select: { organizationId: true, estado: true },
    });
    return orgs.map((o) => ({
      ...o,
      estado: filiacoes.find((f) => f.organizationId === o.id)?.estado ?? 'REVOGADO',
    }));
  }));
}

/**
 * Resolve sessão + organização pedida + concessões.
 *
 * A ordem das recusas é o contrato do CT-04, e não é intercambiável:
 *
 *   sem sessão            → 401  (não sei quem és)
 *   sem filiação naquela  → 404  (**ausência**: não revelar existência)
 *   filiação inactiva     → 404  (idem — quem foi revogado deixa de a ver)
 *   sem a acção           → 403  (decidido depois, por quem chama)
 */
export async function resolverPedido(orgSlug: string): Promise<PedidoResolvido> {
  const actor = await actorDoPedido();
  if (!actor) return { ok: false, resultado: { tipo: 'sem_sessao' } };

  const orgs = await organizacoesDoActor(actor.id);
  const resolucao = resolverContexto(
    { organizationSlug: orgSlug },
    actor.id,
    orgs.map((o) => ({
      organizationId: o.id,
      organizationSlug: o.slug,
      estado: o.estado as 'ACTIVO' | 'SUSPENSO' | 'REVOGADO',
    })),
  );
  // Tanto "não és membro" como "a tua filiação foi revogada" saem como
  // AUSÊNCIA. Distingui-las diria a quem foi revogado que a organização
  // continua a existir, e a quem nunca foi membro que ela existe de todo.
  if (!resolucao.ok) return { ok: false, resultado: { tipo: 'ausente' } };

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const concessoes = await comEscopo(
    prisma,
    { organizationId: resolucao.contexto.organizationId, userId: actor.id },
    (db) => concessoesDoActor(db, actor.id),
  );
  if (!concessoes) return { ok: false, resultado: { tipo: 'ausente' } };

  return {
    ok: true,
    actor,
    contexto: resolucao.contexto,
    concessoes: concessoes.concessoes,
    membershipId: concessoes.membershipId,
  };
}

/** Corre `fn` com o escopo do inquilino já resolvido. */
export async function comEscopoDoPedido<T>(
  pedido: Extract<PedidoResolvido, { ok: true }>,
  fn: (db: ClienteComEscopo) => Promise<T>,
): Promise<T> {
  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  return semIdentificadorMalFormado(() => comEscopo(
    prisma,
    { organizationId: pedido.contexto.organizationId, userId: pedido.actor.id },
    fn,
  ));
}

/**
 * Um identificador com forma inválida é «não existe», e não «rebentou».
 *
 * ── RV100-024 ─────────────────────────────────────────────────────────────
 *
 * Um segmento de URL que não é UUID chegava directo a uma coluna `@db.Uuid` e
 * levantava 500 **antes** do `notFound()` que a página já tem escrito. Medi 128
 * páginas debaixo de um segmento `[…Id]` e nenhuma validava a forma.
 *
 * A cura vive aqui e não em 128 sítios: a camada de dados dá um NOME à falha
 * (`IdentificadorMalFormado`) e esta função — por onde as páginas passam para
 * falar com a base — traduz o nome na resposta que a web tem para «isso não
 * existe». Uma página nova ganha a protecção por usar o invólucro, que é o que
 * já tem de fazer para ter escopo.
 *
 * E é uma tradução ESTREITA de propósito: só o identificador mal formado. Um
 * erro de base continua a subir como erro de base, porque um 404 sobre uma
 * falha real esconde-a de quem a tem de arranjar.
 */
async function semIdentificadorMalFormado<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    if (erro instanceof IdentificadorMalFormado) notFound();
    throw erro;
  }
}
