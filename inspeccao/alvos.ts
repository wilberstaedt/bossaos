import { Client } from 'pg';

/**
 * Os identificadores que as rotas com parâmetro precisam, lidos da base.
 *
 * ── Porque é que não estão escritos à mão ─────────────────────────────────
 *
 * Metade das 66 telas da dívida de móvel vive em rotas com identificador —
 * `/produtos/[productId]`, `/menus/[menuId]`, `/organization/[membershipId]`.
 * Um identificador escrito à mão neste ficheiro fica desactualizado no dia em
 * que a semeadura mudar, e o sintoma é **a página de "não encontrado" a ser
 * medida como se fosse a tela**: cinco larguras verdes sobre um 404.
 *
 * Lê-se da base, e cada leitura **exige** ter encontrado alguma coisa. Um
 * identificador em falta pára a medição em vez de a deixar seguir sobre nada —
 * que é a regra do instrumento que falha alto, e não conta zero.
 */

export interface Alvos {
  menuId: string;
  categoryId: string;
  productId: string;
  groupId: string;
  brandId: string;
  membershipId: string;
  unidadeArquivadaId: string;
  unidadeVivaId: string;
  orgId: string;
  /** E13: a sala. Sem eles, cinco telas mediriam a página de «não encontrado». */
  tableId: string;
  sessionId: string;
  deviceId: string;
  deviceRevogavelId: string;
  /** E14: o pedido semeado, com uma linha aceite e uma rejeitada. */
  orderId: string;
}

const PREFIXO = 'insp-';

/** O convite que a tela AUTH-006 abre. Tem de bater com a semeadura. */
export const TOKEN_DE_CONVITE = 'insp-convite-para-medir';

export const ORG_A = '11111111-1111-4111-8111-111111111111';
export const EMAIL_DO_ARNES = 'painel@inspeccao.example';

async function um(sql: Client, consulta: string, oQue: string): Promise<string> {
  const { rows } = await sql.query(consulta);
  const id = (rows[0] as { id: string } | undefined)?.id;
  if (!id) {
    // Falha ALTA. Sem isto, a medição seguia com `undefined` no endereço e
    // media a página de "não encontrado" em cinco larguras, a dizer verde.
    throw new Error(
      `alvos: não encontrei ${oQue}. A semeadura da inspecção correu? ` +
      'Sem este identificador as telas dessa família mediriam um 404.',
    );
  }
  return id;
}

export async function resolverAlvos(): Promise<Alvos> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL em falta');
  const sql = new Client({ connectionString: url });
  await sql.connect();
  try {
    return {
      menuId: await um(sql, `SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%' LIMIT 1`, 'um menu'),
      categoryId: await um(sql, `SELECT id FROM categories WHERE nome LIKE '${PREFIXO}%' LIMIT 1`, 'uma categoria'),
      productId: await um(sql, `SELECT id FROM products WHERE nome LIKE '${PREFIXO}%' LIMIT 1`, 'um produto'),
      groupId: await um(sql, `SELECT id FROM modifier_groups WHERE nome LIKE '${PREFIXO}%' LIMIT 1`, 'um grupo de opções'),
      brandId: await um(sql, `SELECT id FROM brands WHERE organization_id = '${ORG_A}' LIMIT 1`, 'uma marca'),
      membershipId: await um(
        sql,
        `SELECT m.id FROM memberships m JOIN users u ON u.id = m.user_id
          WHERE m.organization_id = '${ORG_A}' AND u.email = '${EMAIL_DO_ARNES}' LIMIT 1`,
        'a pertença do utilizador do arnês',
      ),
      unidadeArquivadaId: await um(
        sql,
        `SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%' AND archived_at IS NOT NULL LIMIT 1`,
        'uma unidade arquivada',
      ),
      unidadeVivaId: await um(
        sql,
        `SELECT id FROM locations WHERE organization_id = '${ORG_A}'
           AND archived_at IS NULL AND slug = 'puerto' LIMIT 1`,
        'a unidade viva da inspecção',
      ),
      orgId: ORG_A,
      tableId: await um(sql, `SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%' ORDER BY codigo LIMIT 1`, 'uma mesa'),
      sessionId: await um(
        sql,
        `SELECT id FROM table_sessions WHERE estado <> 'FECHADA'
           AND table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%') LIMIT 1`,
        'uma sessão de mesa aberta'),
      // Dois dispositivos, e não um: a ficha mede-se num ACTIVO e a revogação
      // precisa de um que ainda não esteja revogado. Com um só, a segunda visita
      // media o ecrã de um aparelho que a primeira já tinha retirado.
      deviceId: await um(sql, `SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%' AND estado = 'ACTIVO' LIMIT 1`, 'um dispositivo activo'),
      deviceRevogavelId: await um(sql, `SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%' AND estado = 'PENDENTE' LIMIT 1`, 'um dispositivo por aprovar'),
      orderId: await um(sql, `SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' LIMIT 1`, 'um pedido'),
    };
  } finally {
    await sql.end();
  }
}
