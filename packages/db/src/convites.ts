import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { podeConceder, type Concessao, type Papel } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Convites.
 *
 * **Um convite é uma credencial.** Tudo neste ficheiro sai daí:
 *
 *  - o que viaja no email é o token; o que fica na base é o SHA-256 dele. Uma
 *    cópia de segurança lida por alguém não dá acesso a nada, e nem nós
 *    conseguimos reemitir o link original;
 *  - **`aceitarConvite` não recebe papel nenhum.** Não é uma regra escrita num
 *    comentário: é a assinatura da função. Se a aceitação pudesse ler `role` do
 *    corpo do pedido, quem foi convidado como `WAITER` aceitava-se como
 *    `OWNER` — o defeito mais banal desta área e o mais caro;
 *  - uso único, prazo, preso ao email, revogável, e nunca acima do escopo de
 *    quem convida.
 */

const BYTES_DO_TOKEN = 32;

/** O resumo que fica guardado. O token em claro só existe no email. */
export function resumoDoToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Compara dois resumos em tempo constante.
 *
 * A comparação normal sai no primeiro byte diferente, e o tempo disso diz
 * quantos bytes acertaram. Com um token de 32 bytes isso não é explorável na
 * prática, mas a comparação certa custa uma linha e não obriga a ter essa
 * conversa outra vez daqui a dois anos.
 */
export function resumosIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface DadosDeConvite {
  email: string;
  papel: Papel;
  brandId?: string;
  locationId?: string;
  /** Prazo em horas. **Configuração**, não uma constante escolhida aqui. */
  validadeHoras: number;
}

export type FalhaAoConvidar =
  | { tipo: 'escopo_acima_do_convidante'; papel: Papel }
  | { tipo: 'ja_e_membro' }
  | { tipo: 'convite_pendente_para_este_email' };

export type ResultadoDeConvite =
  | { ok: true; conviteId: string; token: string; expiraEm: Date }
  | { ok: false; falha: FalhaAoConvidar };

/**
 * Cria um convite. Devolve o token **uma vez** — depois disto ele não existe
 * em lado nenhum a não ser no email de quem foi convidado.
 */
export async function criarConvite(
  db: ClienteComEscopo,
  entrada: {
    organizationId: string;
    convidadoPorId: string;
    concessoesDeQuemConvida: readonly Concessao[];
    dados: DadosDeConvite;
  },
): Promise<ResultadoDeConvite> {
  const { organizationId, convidadoPorId, concessoesDeQuemConvida, dados } = entrada;
  const email = dados.email.trim().toLowerCase();

  // "Convite não pode conceder escopo superior ao de quem convida" (E04).
  const aConceder: Concessao = {
    papel: dados.papel,
    ...(dados.brandId ? { brandId: dados.brandId } : {}),
    ...(dados.locationId ? { locationId: dados.locationId } : {}),
  };
  if (!podeConceder(concessoesDeQuemConvida, aConceder)) {
    return { ok: false, falha: { tipo: 'escopo_acima_do_convidante', papel: dados.papel } };
  }

  const jaPendente = await db.invitation.findFirst({
    where: { email, estado: 'PENDENTE', expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (jaPendente) return { ok: false, falha: { tipo: 'convite_pendente_para_este_email' } };

  const token = randomBytes(BYTES_DO_TOKEN).toString('base64url');
  const expiraEm = new Date(Date.now() + dados.validadeHoras * 3600_000);

  const convite = await db.invitation.create({
    data: {
      organizationId,
      email,
      papel: dados.papel,
      ...(dados.brandId ? { brandId: dados.brandId } : {}),
      ...(dados.locationId ? { locationId: dados.locationId } : {}),
      tokenHash: resumoDoToken(token),
      expiresAt: expiraEm,
      convidadoPorId,
    },
    select: { id: true },
  });

  return { ok: true, conviteId: convite.id, token, expiraEm };
}

/**
 * A que organização pertence este token?
 *
 * Interface mínima, antes de haver contexto. Devolve **só** o identificador da
 * organização — nem papel, nem email, nem validade. Com ele abre-se a transacção
 * com escopo, e aí tudo o resto é lido pela via normal, com a política activa.
 */
export async function organizacaoDoConvite(
  prisma: PrismaClient,
  token: string,
): Promise<string | null> {
  const linhas = await prisma.$queryRaw<Array<{ id: string | null }>>`
    SELECT organizacao_do_convite(${resumoDoToken(token)}) AS id
  `;
  return linhas[0]?.id ?? null;
}

export type FalhaAoAceitar =
  | { tipo: 'nao_encontrado' }
  | { tipo: 'expirado' }
  | { tipo: 'revogado' }
  | { tipo: 'ja_usado' }
  | { tipo: 'email_diferente' };

export type ResultadoDeAceitacao =
  | { ok: true; membershipId: string; papel: Papel }
  | { ok: false; falha: FalhaAoAceitar };

/**
 * Aceita um convite.
 *
 * **Repare no que esta função não recebe: papel, marca, unidade.** Não há por
 * onde os passar. Tudo isso vem da linha do convite, e é essa assinatura — e
 * não um comentário — que impede quem foi convidado como `WAITER` de se aceitar
 * como `OWNER`.
 *
 * Tudo numa transacção: marcar aceite, criar a pertença e a concessão acontecem
 * juntos ou não acontecem. Sem isso, uma falha a meio deixava um convite
 * queimado sem pertença nenhuma, e a pessoa ficava de fora sem forma de voltar.
 */
export async function aceitarConvite(
  db: ClienteComEscopo,
  entrada: { token: string; userId: string; emailDoUtilizador: string },
): Promise<ResultadoDeAceitacao> {
  const resumo = resumoDoToken(entrada.token);

  const convite = await db.invitation.findFirst({
    where: { tokenHash: resumo },
    select: {
      id: true, organizationId: true, email: true, papel: true,
      brandId: true, locationId: true, estado: true,
      expiresAt: true, acceptedAt: true, revokedAt: true, tokenHash: true,
    },
  });
  if (!convite) return { ok: false, falha: { tipo: 'nao_encontrado' } };

  // O `findFirst` já filtrou pelo resumo; esta comparação existe para o tempo
  // não variar com quantos caracteres acertaram, agora que a linha foi lida.
  if (!resumosIguais(convite.tokenHash, resumo)) {
    return { ok: false, falha: { tipo: 'nao_encontrado' } };
  }

  if (convite.estado === 'REVOGADO' || convite.revokedAt) {
    return { ok: false, falha: { tipo: 'revogado' } };
  }
  if (convite.estado === 'ACEITE' || convite.acceptedAt) {
    return { ok: false, falha: { tipo: 'ja_usado' } };
  }
  if (convite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, falha: { tipo: 'expirado' } };
  }
  // "Preso ao email convidado": um convite reencaminhado não serve a outra
  // pessoa, por muito que ela tenha o link.
  if (convite.email !== entrada.emailDoUtilizador.trim().toLowerCase()) {
    return { ok: false, falha: { tipo: 'email_diferente' } };
  }

  // Uso único por CONDIÇÃO, não por leitura anterior: se dois pedidos chegarem
  // ao mesmo tempo, o segundo actualiza zero linhas. A verificação acima é para
  // dar uma resposta útil; esta é a que garante.
  const queimado = await db.invitation.updateMany({
    where: { id: convite.id, estado: 'PENDENTE', acceptedAt: null },
    data: { estado: 'ACEITE', acceptedAt: new Date() },
  });
  if (queimado.count !== 1) return { ok: false, falha: { tipo: 'ja_usado' } };

  const membership = await db.membership.upsert({
    where: {
      organizationId_userId: { organizationId: convite.organizationId, userId: entrada.userId },
    },
    create: { organizationId: convite.organizationId, userId: entrada.userId, estado: 'ACTIVO' },
    update: { estado: 'ACTIVO' },
    select: { id: true },
  });

  await db.roleAssignment.create({
    data: {
      organizationId: convite.organizationId,
      membershipId: membership.id,
      // ─── daqui, e de mais lado nenhum ───
      papel: convite.papel,
      ...(convite.brandId ? { brandId: convite.brandId } : {}),
      ...(convite.locationId ? { locationId: convite.locationId } : {}),
    },
  });

  return { ok: true, membershipId: membership.id, papel: convite.papel as Papel };
}

export async function revogarConvite(db: ClienteComEscopo, conviteId: string): Promise<boolean> {
  const r = await db.invitation.updateMany({
    where: { id: conviteId, estado: 'PENDENTE' },
    data: { estado: 'REVOGADO', revokedAt: new Date() },
  });
  return r.count === 1;
}

export function listarConvites(db: ClienteComEscopo) {
  return db.invitation.findMany({
    where: { estado: 'PENDENTE' },
    select: { id: true, email: true, papel: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
