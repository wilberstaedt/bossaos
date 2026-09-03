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
