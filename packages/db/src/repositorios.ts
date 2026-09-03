import type { ClienteComEscopo, ClienteComIdentidade } from './escopo.ts';

/**
 * Repositórios com escopo.
 *
 * Todos exigem `ClienteComEscopo` — o tipo que só `comEscopo()` fabrica. Não é
 * documentação: passar o `PrismaClient` solto a qualquer destas funções não
 * compila. O objectivo é que a única forma de escrever uma consulta com escopo
 * seja dentro da transacção que define o contexto.
 *
 * O `organization_id` **não** aparece nos filtros abaixo, e é de propósito: quem
 * o filtra é a política de linha. Repeti-lo aqui daria a ilusão de que o
 * isolamento vive no serviço, e no dia em que alguém esquecesse o filtro nada
 * ficaria vermelho. Assim, se a política falhar, os testes de isolamento falham.
 */

export interface DadosDeMarca {
  nome: string;
  slug: string;
}

export interface DadosDeUnidade {
  brandId: string;
  nome: string;
  slug: string;
  moeda: string;
  fuso: string;
}

// ── Marca ───────────────────────────────────────────────────────────────────

export function listarMarcas(db: ClienteComEscopo) {
  return db.brand.findMany({ where: { archivedAt: null }, orderBy: { nome: 'asc' } });
}

export function obterMarca(db: ClienteComEscopo, id: string) {
  // `findFirst` e não `findUnique`: com RLS, uma linha de outro inquilino
  // simplesmente não existe para esta ligação, e é isso que queremos —
  // ausência, não "proibido". CT-04: não revelar existência.
  return db.brand.findFirst({ where: { id } });
}

export function criarMarca(db: ClienteComEscopo, organizationId: string, dados: DadosDeMarca) {
  return db.brand.create({ data: { organizationId, ...dados } });
}

// ── Unidade ─────────────────────────────────────────────────────────────────

export function listarUnidades(db: ClienteComEscopo) {
  return db.location.findMany({ where: { archivedAt: null }, orderBy: { nome: 'asc' } });
}

export function obterUnidade(db: ClienteComEscopo, id: string) {
  return db.location.findFirst({ where: { id } });
}

export function criarUnidade(
  db: ClienteComEscopo,
  organizationId: string,
  dados: DadosDeUnidade,
) {
  return db.location.create({ data: { organizationId, ...dados } });
}

// ── Papéis ──────────────────────────────────────────────────────────────────

export function papeisDaFiliacao(db: ClienteComEscopo, membershipId: string) {
  return db.roleAssignment.findMany({
    where: { membershipId },
    select: { id: true, papel: true, brandId: true, locationId: true },
  });
}

export function filiacoesDaOrganizacao(db: ClienteComEscopo) {
  return db.membership.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, userId: true, estado: true },
  });
}

// ── Caminho de identidade (sem organização ainda) ───────────────────────────

/**
 * Em que organizações é esta pessoa membro?
 *
 * A única pergunta que se responde antes de haver inquilino. Exige
 * `ClienteComIdentidade`, que só `comIdentidade()` fabrica — e as políticas de
 * leitura por identidade cobrem só `users`, `memberships` e `organizations`.
 */
export function organizacoesDoUtilizador(db: ClienteComIdentidade) {
  return db.organization.findMany({
    where: { archivedAt: null },
    select: { id: true, slug: true, nome: true },
    orderBy: { nome: 'asc' },
  });
}

export function filiacoesDoUtilizador(db: ClienteComIdentidade) {
  return db.membership.findMany({
    select: { id: true, organizationId: true, estado: true },
  });
}

export function euProprio(db: ClienteComIdentidade) {
  return db.user.findFirst({ select: { id: true, email: true, nome: true } });
}

// ── Pertenças e concessões (E04) ────────────────────────────────────────────

/**
 * As concessões de um actor nesta organização.
 *
 * É daqui que sai a resposta a "este actor pode?". Não vem da sessão, não vem
 * da URL: vem da base, a cada pedido, com a política de linha activa. É isso que
 * faz uma revogação notar-se ao pedido seguinte em vez de quando a sessão
 * expirar.
 */
export async function concessoesDoActor(db: ClienteComEscopo, userId: string) {
  const pertenca = await db.membership.findFirst({
    where: { userId, estado: 'ACTIVO' },
    select: {
      id: true,
      roleAssignments: { select: { papel: true, brandId: true, locationId: true } },
    },
  });
  if (!pertenca) return null;
  return {
    membershipId: pertenca.id,
    concessoes: pertenca.roleAssignments.map((r) => ({
      papel: r.papel,
      ...(r.brandId ? { brandId: r.brandId } : {}),
      ...(r.locationId ? { locationId: r.locationId } : {}),
    })),
  };
}

export function pessoasEAcessos(db: ClienteComEscopo) {
  return db.membership.findMany({
    select: {
      id: true,
      estado: true,
      user: { select: { id: true, nome: true, email: true } },
      roleAssignments: { select: { papel: true, brandId: true, locationId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Revoga uma pertença.
 *
 * **Não apaga.** O histórico de quem teve acesso é obrigação, não conveniência —
 * e apagar tornaria impossível responder a "quem podia ver isto em Março".
 *
 * Recusa revogar o ÚLTIMO owner: uma organização sem owner não tem quem lhe
 * devolva o acesso, e a recuperação passa a ser um pedido de suporte.
 */
export async function revogarPertenca(
  db: ClienteComEscopo,
  membershipId: string,
): Promise<{ ok: true; userId: string } | { ok: false; motivo: 'ultimo_owner' | 'nao_encontrado' }> {
  const alvo = await db.membership.findFirst({
    where: { id: membershipId },
    select: { id: true, userId: true, roleAssignments: { select: { papel: true } } },
  });
  if (!alvo) return { ok: false, motivo: 'nao_encontrado' };

  const eOwner = alvo.roleAssignments.some((r) => r.papel === 'OWNER');
  if (eOwner) {
    const owners = await db.roleAssignment.count({
      where: { papel: 'OWNER', membership: { estado: 'ACTIVO' } },
    });
    if (owners <= 1) return { ok: false, motivo: 'ultimo_owner' };
  }

  await db.membership.update({ where: { id: membershipId }, data: { estado: 'REVOGADO' } });
  return { ok: true, userId: alvo.userId };
}
