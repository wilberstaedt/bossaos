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
  /** E15: a unidade onde o Staff PWA corre. É a `puerto`, a mesma do painel. */
  unidadeDoStaff: string;
  /**
   * E15: a sessão de mesa **só do Staff**.
   *
   * Não é a `sessionId`, de propósito — e é a mesma decisão dos dois
   * dispositivos, uma linha acima. O `sala.spec.ts` mede as telas de encerrar e
   * transferir da `sessionId`, e partilhá-la punha duas provas a mexer na mesma
   * linha ao mesmo tempo, em processos diferentes.
   *
   * A 04/09 uma passagem completa deu 404 no STAFF-005 e a seguinte deu verde
   * sem ninguém tocar em nada. A causa não ficou provada — e é por isso que a
   * partilha acaba: um resultado que muda sozinho não é um resultado, e a saída
   * não é repetir até dar verde.
   */
  sessionIdDoStaff: string;
  /** E16: a estação de PREPARAÇÃO onde o KDS mede. Tem bilhetes a mais de propósito. */
  estacaoDeProducao: string;
  /** E16: a estação de EXPO. Sem ela, o KDS-012 media um quadro de preparação. */
  estacaoDeExpo: string;
  /** E16: uma tarefa concreta, para a ficha do bilhete não medir um 404. */
  tarefaDeProducao: string;
  /** E17: a mesa com QR emitido, e o SEGREDO em claro — só a semeadura o sabe. */
  mesaComQr: string;
  /** E17: a sessão de visitante VIVA. Sem ela, as sete telas da visita mediam o desvio. */
  visitanteVivo: string;
  /** E19: a espera VIVA. Sem ela, o RES-C-010 media «não temos mesa para o teu grupo». */
  esperaViva: string;
  /** E19: a reserva de HOJE, com mesa. Sem ela, as telas do host mediam a agenda vazia. */
  reservaDeHoje: string;
  /** E20: o pedido de takeaway JÁ na cozinha. Sem ele, o TAKE-002 media um 404. */
  pedidoParaLevar: string;
  /** E22: a conta com desconto, e a caixa aberta com movimentos dos dois lados. */
  contaDoTpv: string;
  caixaDoTpv: string;
}

const PREFIXO = 'insp-';

/** O convite que a tela AUTH-006 abre. Tem de bater com a semeadura. */
export const TOKEN_DE_CONVITE = 'insp-convite-para-medir';

/**
 * E17: o segredo do QR e o token do visitante, fixos na semeadura.
 *
 * A prova precisa de os poder escrever — um no endereço, o outro na bolacha — e
 * a base continua a guardar só o resumo. É a única vez em que um segredo é fixo,
 * e existe porque a alternativa era a prova não conseguir entrar pela porta que
 * está a medir.
 */
export const SEGREDO_DO_QR = 'insp-segredo-da-mesa-para-medir';
export const TOKEN_DO_VISITANTE = 'insp-token-do-visitante-para-medir';
/** E19: o segredo do link de gestão. Fixo na semeadura, e só lá. */
export const SEGREDO_DE_GESTAO = 'insp-segredo-de-gestao-para-medir';

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
      // ── `LIMIT 1` sem ordem não é um alvo, é uma lotaria ─────────────────
      //
      // Isto era `numero LIKE '${PREFIXO}%' LIMIT 1`, e havia **nove** pedidos a
      // casar: A001, C001, quatro do KDS e os três do E20. Só o A001 tem a linha
      // aceite e a rejeitada lado a lado, que é o que o `pedidos.spec` mede — os
      // outros oito fazem-no ficar vermelho a dizer «a linha aceite desapareceu».
      //
      // Passava por sorte da ordem física das linhas, e já eram seis bilhetes
      // antes do E20; as três linhas novas só mudaram o baralho. Um resultado que
      // depende da ordem em que a base devolve linhas não é um resultado.
      //
      // O alvo passa a dizer o nome do pedido que significa.
      orderId: await um(sql, `SELECT id FROM orders WHERE numero = '${PREFIXO}A001'`, 'o pedido insp-A001'),
      unidadeDoStaff: await um(
        sql,
        `SELECT id FROM locations WHERE organization_id = '${ORG_A}'
           AND slug = 'puerto' AND archived_at IS NULL LIMIT 1`,
        'a unidade do Staff'),
      sessionIdDoStaff: await um(
        sql,
        `SELECT s.id FROM table_sessions s
           JOIN service_tables t ON t.id = s.table_id
          WHERE s.estado <> 'FECHADA' AND t.codigo = '${PREFIXO}21 del Staff' LIMIT 1`,
        'a sessão de mesa do Staff'),
      estacaoDeProducao: await um(
        sql,
        `SELECT id FROM production_stations
          WHERE nome LIKE '${PREFIXO}%' AND tipo = 'PREPARACAO' AND archived_at IS NULL
          ORDER BY ordem LIMIT 1`,
        'a estação de produção da inspecção'),
      estacaoDeExpo: await um(
        sql,
        `SELECT id FROM production_stations
          WHERE nome LIKE '${PREFIXO}%' AND tipo = 'EXPO' AND archived_at IS NULL LIMIT 1`,
        'a estação de expo'),
      tarefaDeProducao: await um(
        sql,
        `SELECT id FROM production_tasks
          WHERE station_id IN (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%')
          ORDER BY criada_em LIMIT 1`,
        'uma tarefa de produção'),
      mesaComQr: await um(
        sql,
        `SELECT id FROM service_tables
          WHERE codigo LIKE '${PREFIXO}%' AND qr_segredo_hash IS NOT NULL LIMIT 1`,
        'uma mesa com QR emitido'),
      visitanteVivo: await um(
        sql,
        `SELECT g.id FROM guest_sessions g
           JOIN table_sessions ts ON ts.id = g.table_session_id
          WHERE g.estado = 'ACTIVA' AND ts.estado <> 'FECHADA'
            AND g.table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')
          LIMIT 1`,
        'uma sessão de visitante viva'),
      esperaViva: await um(
        sql,
        `SELECT id FROM waitlist_entries
          WHERE nome LIKE '${PREFIXO}%' AND estado = 'A_ESPERA' LIMIT 1`,
        'uma espera viva'),
      reservaDeHoje: await um(
        sql,
        `SELECT id FROM reservations
          WHERE chave_idempotente = '${PREFIXO}reserva-de-hoje' LIMIT 1`,
        'a reserva de hoje do arnês'),
      pedidoParaLevar: await um(
        sql,
        `SELECT id FROM orders WHERE numero = '${PREFIXO}L0' LIMIT 1`,
        'o pedido de takeaway do arnês'),
      // Nomeados, e não `LIKE ... LIMIT 1`: um alvo sem ordem é uma lotaria que
      // passa por sorte da ordem física das linhas. Aprendido no E20, à custa
      // de uma prova do E16 que caiu por causa de três linhas novas.
      contaDoTpv: await um(
        sql, `SELECT id FROM bills WHERE numero = '${PREFIXO}C1'`, 'a conta insp-C1'),
      caixaDoTpv: await um(
        sql, `SELECT id FROM cash_registers WHERE nome = '${PREFIXO}Caja 1'`,
        'a caixa insp-Caja 1'),
    };
  } finally {
    await sql.end();
  }
}
