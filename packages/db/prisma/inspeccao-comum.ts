/**
 * O que a semeadura do arnês suja, e como se apanha.
 *
 * ── Porque é que isto é um módulo e não duas cópias ────────────────────────
 *
 * A semeadura limpava a passagem anterior **ao arrancar** e não limpava depois
 * de si. Era o único sítio do projecto onde a regra "quem faz a sujidade
 * apanha-a" não estava aplicada — e o preço apareceu na prova do E09, que corria
 * sobre uma base com um segundo cenário publicado.
 *
 * A correcção óbvia era escrever a limpeza outra vez no fecho. Não é o que está
 * feito aqui, de propósito: **duas listas de tabelas divergem**. Basta a
 * semeadura passar a criar uma linha numa tabela nova e a limpeza do fecho fica
 * a saber de menos, em silêncio. A lista vive num sítio só, e os dois lados
 * chamam-na.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** O endereço público que o navegador visita. Estável, para as rotas serem fixas. */
export const SLUG_DE_INSPECCAO = 'insp-marina-oropesa';

/**
 * O SEGUNDO endereço público, no inquilino B — e é ele que torna o E12 mensurável.
 *
 * O cenário público inteiro vivia na organização A, que é **Starter**. Uma
 * organização Starter não pode ter cores próprias, portanto a rota pública dela
 * serve sempre a paleta BossaOS: medir lá a cor calculada pelo navegador daria
 * verde contra o tema de origem e não mediria nada. É o «verde sobre tema por
 * omissão» que a régua do E12 reprova à cabeça.
 *
 * A organização B é **Pro**. Com endereço público próprio, o arnês pode publicar
 * uma cor pelo produto e voltar a ler a página — que é o ataque escrito na
 * régua: *«leio a cor CALCULADA pelo navegador na rota pública, não a que o CSS
 * declara»*.
 */
export const SLUG_DE_INSPECCAO_B = 'insp-marina-barcelona';

/**
 * Prefixo só da inspecção — diferente do `e09-` das provas. Se partilhassem
 * prefixo, a limpeza de uma apagava o cenário da outra, e o sintoma seria uma
 * inspecção que falha consoante a ordem por que se correram os comandos.
 */
export const PREFIXO = 'insp-';

/** Abre a ligação com a credencial de MIGRAÇÃO, que é a que pode escrever isto. */
export function abrirPrisma(): PrismaClient {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL ou DATABASE_URL em falta');
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, options: '-c timezone=UTC' }),
  });
}

/**
 * Apaga tudo o que a semeadura cria. Idempotente: corre em base limpa sem se
 * queixar, que é o que o fecho precisa quando o arranque falhou a meio.
 *
 * `menu_views` entra na lista porque a passagem do navegador **escreve lá** — a
 * carta pública conta consultas. Não é sujidade da semeadura, é sujidade que a
 * semeadura torna possível, e sai pela mesma porta.
 */
export async function limpar(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE locations SET public_slug = NULL WHERE public_slug LIKE '${PREFIXO}%'`);
  // ── O tema das duas organizações de fixtures ──────────────────────────
  //
  // A passagem do navegador PUBLICA um tema no inquilino B (é o que o E12 mede),
  // e um tema publicado sobrevive à limpeza das outras tabelas — a organização é
  // fixture, não leva prefixo. Sem estas linhas, a corrida seguinte encontrava a
  // cor da anterior já lá e o «antes» do par deixava de ser o tema de origem.
  //
  // `restaura_de_id` primeiro: uma revisão de restauro aponta para outra, e a
  // chave estrangeira é RESTRICT.
  const FIXTURES = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ].map((id) => `'${id}'`).join(',');
  await prisma.$executeRawUnsafe(`
    UPDATE theme_revisions SET restaura_de_id = NULL WHERE organization_id IN (${FIXTURES});
    DELETE FROM theme_revisions WHERE organization_id IN (${FIXTURES});
    DELETE FROM theme_drafts    WHERE organization_id IN (${FIXTURES});
    -- A subscrição é do CENÁRIO do arnês desde 04/09 (ver a semeadura). Quem faz
    -- a sujidade apanha-a: deixá-la para trás era o que fazia as provas de base
    -- e a inspecção herdarem estado uma da outra.
    DELETE FROM subscriptions   WHERE organization_id IN (${FIXTURES});
  `);
  await prisma.$executeRawUnsafe(`
    -- ── Primeiro os PEDIDOS, e pela MESA ──────────────────────────────────
    --
    -- Tudo o resto aqui se reconhece por um prefixo no nome, porque o arnês é
    -- quem escreve o nome. Os pedidos do VISITANTE não: entram pela porta real,
    -- e o número vem da sequência do domínio (A04394), não do arnês. Um arnês
    -- não pode escolher o número de um pedido sem deixar de medir o produto.
    --
    -- E a unidade também não serve de crachá: as unidades são FIXTURES,
    -- partilhadas com pedidos legítimos da semeadura. O crachá que resta é
    -- QUEM abriu o pedido: aberto_por, que a passagem do navegador enche com
    -- o utilizador do arnês, no mesmo domínio @inspeccao.example que já
    -- identifica os convites e os leads aqui em baixo.
    --
    -- A fuga é ANTIGA e grande: A04001 a A04398, centenas de pedidos deixados
    -- por todas as passagens anteriores, a prender as estações da inspecção por
    -- chave estrangeira. Quem estoirava era a LIMPEZA da prova SEGUINTE, longe
    -- de quem a causou — e por isso o vermelho aparecia sempre na prova errada.
    -- ── E22 · o dinheiro sai ANTES dos pedidos ──────────────────────────
    --
    -- As linhas de conta apontam para linhas de pedido; os movimentos apontam
    -- para pagamentos. Apagar por outra ordem prendia tudo por chave estrangeira
    -- e o vermelho aparecia na prova seguinte, longe de quem o causou.
    --
    -- E os gatilhos de imutabilidade recusam apagar pagamentos, devoluções,
    -- ajustes e movimentos — e recusam bem: é essa a garantia da etapa. A saída
    -- NÃO é enfraquecer o gatilho; é dizer que isto é manutenção, e o dono da
    -- tabela pode desligá-los nas suas.
    ALTER TABLE fiscal_documents      DISABLE TRIGGER USER;
    ALTER TABLE provider_events       DISABLE TRIGGER USER;
    ALTER TABLE cash_movements        DISABLE TRIGGER USER;
    ALTER TABLE cash_register_events  DISABLE TRIGGER USER;
    ALTER TABLE bill_lines            DISABLE TRIGGER USER;
    ALTER TABLE bill_adjustments      DISABLE TRIGGER USER;
    ALTER TABLE payments              DISABLE TRIGGER USER;
    ALTER TABLE refunds               DISABLE TRIGGER USER;
    DELETE FROM campaign_deliveries  WHERE customer_id IN (SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM campaigns            WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM campaign_templates   WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM segments             WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM consent_events       WHERE customer_id IN (SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM loyalty_movements    WHERE customer_id IN (SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM loyalty_rewards      WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM feedback_entries     WHERE customer_id IN (SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%') OR origem = 'menu público';
    DELETE FROM customers            WHERE nome LIKE '${PREFIXO}%' OR email LIKE '%@inspeccao.example';
    DELETE FROM stock_movements      WHERE receipt_line_id IN (SELECT rl.id FROM receipt_lines rl JOIN receipts r ON r.id = rl.receipt_id JOIN purchase_orders p ON p.id = r.purchase_order_id WHERE p.numero LIKE '${PREFIXO}%');
    DELETE FROM receipt_lines        WHERE receipt_id IN (SELECT id FROM receipts WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE numero LIKE '${PREFIXO}%'));
    DELETE FROM receipts             WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM supplier_invoice_lines WHERE invoice_id IN (SELECT id FROM supplier_invoices WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM supplier_invoices    WHERE numero LIKE '${PREFIXO}%';
    DELETE FROM purchase_order_lines WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM purchase_orders      WHERE numero LIKE '${PREFIXO}%';
    DELETE FROM supplier_items       WHERE supplier_id IN (SELECT id FROM suppliers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM suppliers            WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM stock_movements      WHERE item_id IN (SELECT id FROM stock_items WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM recipe_lines         WHERE recipe_id IN (SELECT id FROM recipes WHERE nome LIKE '${PREFIXO}%') OR item_id IN (SELECT id FROM stock_items WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM recipes              WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM stock_items          WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM fiscal_documents     WHERE acontecimento LIKE '${PREFIXO}%';
    DELETE FROM fiscal_connectors    WHERE location_id IN (SELECT id FROM locations);
    DELETE FROM provider_events      WHERE evento_id LIKE '${PREFIXO}%' OR bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM payment_connectors   WHERE location_id IN (SELECT id FROM locations WHERE organization_id IN (SELECT id FROM organizations));
    DELETE FROM cash_movements       WHERE register_id IN (SELECT id FROM cash_registers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM cash_register_events WHERE register_id IN (SELECT id FROM cash_registers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM cash_registers       WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM refunds              WHERE payment_id IN (SELECT id FROM payments WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%'));
    DELETE FROM payments             WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM payment_attempts     WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM bill_adjustments     WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM bill_lines           WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM bills                WHERE numero LIKE '${PREFIXO}%';
    ALTER TABLE fiscal_documents      ENABLE TRIGGER USER;
    ALTER TABLE provider_events       ENABLE TRIGGER USER;
    ALTER TABLE cash_movements        ENABLE TRIGGER USER;
    ALTER TABLE cash_register_events  ENABLE TRIGGER USER;
    ALTER TABLE bill_lines            ENABLE TRIGGER USER;
    ALTER TABLE bill_adjustments      ENABLE TRIGGER USER;
    ALTER TABLE payments              ENABLE TRIGGER USER;
    ALTER TABLE refunds               ENABLE TRIGGER USER;
    DELETE FROM guest_calls          WHERE table_session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'));
    DELETE FROM production_events    WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM production_tasks     WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM order_events         WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM order_lines          WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM order_submissions    WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM order_deliveries     WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example');
    DELETE FROM orders               WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example';
    -- ── O crachá é o PRODUTO, e não a unidade ──────────────────────────
    --
    -- As unidades são fixtures e não levam prefixo: puerto, e não insp-alguma.
    -- Filtrar por locations LIKE insp- não apanhava nada, e o mapa ficava a
    -- prender o produto por chave estrangeira. É o mesmo erro que os pedidos me
    -- fizeram no E17, na mesma tabela de fixtures.
    DELETE FROM external_catalog_mappings WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM delivery_connectors  WHERE provedor LIKE '${PREFIXO}%';
    DELETE FROM delivery_areas       WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM reservation_allocations WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%') OR table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM reservations         WHERE criada_por LIKE '%@inspeccao.example' OR criada_por = 'publico';
    DELETE FROM reservation_settings WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%');
    DELETE FROM routing_rules        WHERE station_id IN (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM production_stations  WHERE nome LIKE '${PREFIXO}%';

    -- ── E18 · reservas ──
    DELETE FROM waitlist_areas      WHERE waitlist_id IN (SELECT id FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM waitlist_entries    WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%') OR nome LIKE '${PREFIXO}%';
    DELETE FROM reservation_message_attempts WHERE message_id IN (SELECT id FROM reservation_messages WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%'));
    DELETE FROM reservation_messages WHERE reservation_id IN (SELECT id FROM reservations WHERE criada_por LIKE '%@inspeccao.example') OR location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%');
    DELETE FROM message_templates   WHERE assunto LIKE '${PREFIXO}%';
    DELETE FROM messaging_connectors WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%');
    DELETE FROM reservation_blocks  WHERE motivo LIKE '${PREFIXO}%';
    DELETE FROM capacity_rules      WHERE window_id IN (SELECT id FROM service_windows WHERE nome LIKE '${PREFIXO}%')
                                       OR area_id IN (SELECT id FROM service_areas WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM service_windows     WHERE nome LIKE '${PREFIXO}%';

    DELETE FROM public_slug_owners WHERE slug LIKE '${PREFIXO}%';
    DELETE FROM table_session_events WHERE session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'));
    DELETE FROM guest_sessions       WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM table_sessions       WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM table_combination_members WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM table_combinations   WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM service_tables       WHERE codigo LIKE '${PREFIXO}%';
    DELETE FROM service_areas        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM device_shifts        WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM device_pairings      WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM devices              WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM service_types        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM outbox_tasks         WHERE tipo = 'pedido.entregar';
    DELETE FROM menu_views        WHERE revision_id IN (SELECT id FROM menu_revisions WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%'));
    DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM menu_revisions    WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM menu_categories   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM menus             WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM product_channels  WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM product_allergens WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM price_rules       WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM products          WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM categories        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM modifier_groups   WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM invitations       WHERE email LIKE '%@inspeccao.example';
    DELETE FROM locations         WHERE slug LIKE '${PREFIXO}%';
    DELETE FROM leads             WHERE email LIKE '%@inspeccao.example';
    DELETE FROM demo_requests     WHERE email LIKE '%@inspeccao.example';
    DELETE FROM site_publications WHERE site_id IN (SELECT id FROM sites WHERE seo_titulo LIKE '${PREFIXO}%');
    DELETE FROM site_revisions    WHERE site_id IN (SELECT id FROM sites WHERE seo_titulo LIKE '${PREFIXO}%');
    DELETE FROM site_posts        WHERE site_id IN (SELECT id FROM sites WHERE seo_titulo LIKE '${PREFIXO}%');
    DELETE FROM site_pages        WHERE site_id IN (SELECT id FROM sites WHERE seo_titulo LIKE '${PREFIXO}%');
    DELETE FROM sites             WHERE seo_titulo LIKE '${PREFIXO}%';
  `);
}

/**
 * Conta o que ficou para trás. O fecho **verifica-se a si próprio**: uma limpeza
 * que corre e não limpa é pior do que nenhuma, porque a próxima passagem culpa
 * outra coisa qualquer.
 */
export async function restos(prisma: PrismaClient): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ total: bigint }[]>(`SELECT (
      (SELECT count(*) FROM menus              WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM products           WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM categories         WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM locations          WHERE public_slug LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM public_slug_owners WHERE slug LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM sites              WHERE seo_titulo LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM modifier_groups    WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM locations          WHERE slug LIKE '${PREFIXO}%')
    -- ── A auto-verificação era CEGA ao que a limpeza não via ───────────────
    --
    -- Contava com o mesmo identificador que a limpeza usava — o prefixo no
    -- nome — e por isso não podia detectar nada do que esse identificador
    -- deixava passar. Cinco pedidos do visitante ficaram na base e o fecho
    -- disse «nada ficou para trás», com toda a honestidade e nenhuma
    -- utilidade. Um detector calibrado pelo critério que está a verificar
    -- confirma o critério, não o resultado.
    --
    -- Conta-se agora pela UNIDADE, que é onde os restos realmente estão.
    + (SELECT count(*) FROM orders              WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example')
    + (SELECT count(*) FROM production_stations WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM production_tasks    WHERE station_id IN (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%'))
    + (SELECT count(*) FROM service_tables      WHERE codigo LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM service_windows     WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM reservations        WHERE criada_por LIKE '%@inspeccao.example')
    + (SELECT count(*) FROM reservation_blocks  WHERE motivo LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM delivery_areas      WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM bills               WHERE numero LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM cash_registers      WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM fiscal_documents    WHERE acontecimento LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM stock_items         WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM suppliers           WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM customers           WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM campaigns           WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM purchase_orders     WHERE numero LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM recipes             WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM external_catalog_mappings WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%'))
    + (SELECT count(*) FROM guest_sessions      WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'))
  ) AS total`);
  return Number(r[0]?.total ?? 0);
}
