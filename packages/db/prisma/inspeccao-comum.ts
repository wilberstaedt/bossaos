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

/**
 * O kiosk do arnês — identificador FIXO, e é por isso que ele existe.
 *
 * O endereço do kiosk é `/kiosk/<deviceId>`, e um identificador gerado a cada
 * semeadura obrigava a prova de navegador a descobri-lo primeiro. Uma prova que
 * tem de perguntar à base qual é o endereço que vai visitar mede a base e o
 * ecrã ao mesmo tempo; quando falha, não se sabe qual dos dois caiu.
 */
export const ID_DO_KIOSK_DE_INSPECCAO = 'aaaa1111-1111-4111-8111-9e31c0000001';
export const ID_DA_IMPRESSORA_DE_INSPECCAO = 'aaaa1111-1111-4111-8111-9e31c0000002';

/**
 * O SEGUNDO kiosk, e é ele que torna o KIOSK-007 mensurável.
 *
 * Com um kiosk só, e a funcionar, a tela do terminal pausado renderiza o ramo
 * «já está disponível» — que é honesto e não mede nada. O caso que a etapa
 * existe para resolver é o outro: **uma cobrança indeterminada pausa o
 * terminal**, e sem uma cobrança indeterminada semeada ele nunca aparece.
 *
 * É a mesma decisão da unidade das Canárias no E30: quando um caso não tem
 * dados, corrige-se a semente e não se aceita a prova.
 */
export const ID_DO_KIOSK_PAUSADO = 'aaaa1111-1111-4111-8111-9e31c0000003';

/**
 * O cliente do provedor de SaaS que a semente liga à organização **A**.
 *
 * ── E o evento que alega a B, que é o que torna a etapa mensurável ────────
 *
 * A régua do E32 é explícita: a semente tem de ter DUAS organizações, senão o
 * defeito mais perigoso da etapa é impossível de observar — não há «outra» para
 * onde apontar. Este cliente é da A; o evento semeado diz que é da B.
 *
 * Ele fica visível na PLAT-005, marcado, porque uma tentativa que o sistema
 * recusou é exactamente a coisa que alguém vai querer encontrar daqui a um ano.
 */
export const CLIENTE_SAAS_DE_INSPECCAO = 'insp-cus_A';

/**
 * A chave de API do arnês — **utilizável**, e é preciso que seja.
 *
 * ── Porque é que existe um valor escrito aqui ─────────────────────────────
 *
 * A régua manda medir que o âmbito é declarado por ROTA. Sem uma chave que
 * passe, esse caso não se consegue montar: uma chave inventada é recusada pelas
 * duas rotas por igual, e trocar o âmbito de uma delas não muda nada.
 *
 * Foi assim que o controlo ficou VERDE com o defeito plantado — o buraco era da
 * prova, não do plante. Mesma figura do E31, onde faltava o cliente que se vai
 * embora sem tocar em nada.
 *
 * ── E porque é que isto não é um segredo largado num repositório ──────────
 *
 * Ela só existe na base do ARNÊS, criada pela semeadura e apagada pela limpeza
 * ao fim de cada passagem. Nunca é escrita numa base de produção, e o valor
 * anuncia-o. É a mesma figura da senha `Prova-E07-http-2026` que o
 * `catalogo-http.test.ts` já usa.
 */
export const CHAVE_DE_INSPECCAO = 'bk_arnes-nao-usar-fora-da-inspeccao';

/**
 * A sessão de suporte do arnês — e as DUAS que a semente cria.
 *
 * Uma viva e uma **expirada**. A segunda é a que torna a etapa mensurável: uma
 * sessão que ninguém fechou e que deixou de valer é o caso que decide a
 * fronteira 1, e sem ela a tela mostra um estado só e o par não se vê.
 */
export const ID_DA_SESSAO_VIVA = 'aaaa1111-1111-4111-8111-9e33c0000001';
export const ID_DA_SESSAO_ESQUECIDA = 'aaaa1111-1111-4111-8111-9e33c0000002';

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
    -- ── E33 · plataforma, suporte e governanca ───────────────────────────
    --
    -- A auditoria NAO entra nesta lista: e append-only, e a base recusa apagar.
    -- Uma etapa sobre governanca seria o ultimo sitio onde isso devia ser
    -- possivel, e por isso as linhas ficam. A prova mede as SUAS.
    DELETE FROM support_sessions   WHERE staff_email LIKE '${PREFIXO}%';
    DELETE FROM access_policies    WHERE actualizada_por LIKE '${PREFIXO}%';
    DELETE FROM retention_policies WHERE actualizada_por LIKE '${PREFIXO}%';
    DELETE FROM help_tickets       WHERE aberto_por LIKE '${PREFIXO}%';
    DELETE FROM abuse_reports      WHERE origem LIKE '${PREFIXO}%';
    DELETE FROM platform_incidents WHERE titulo LIKE '${PREFIXO}%';
    DELETE FROM platform_jobs      WHERE tipo LIKE '${PREFIXO}%';
    DELETE FROM platform_secrets   WHERE nome LIKE 'INSP_%';

    -- ── E32 · as integracoes e a cobranca do SaaS ────────────────────────
    --
    -- Os eventos primeiro: a coluna resolvida aponta para organizations com
    -- SET NULL, mas a ordem faz o resto sair limpo. E as facturas do SaaS nao
    -- tocam no dinheiro da refeicao — nao ha chave estrangeira entre as duas
    -- familias, e por isso nao ha ordem a respeitar entre elas.
    DELETE FROM saas_billing_events  WHERE provedor LIKE '${PREFIXO}%';
    DELETE FROM saas_customers       WHERE provedor LIKE '${PREFIXO}%';
    DELETE FROM saas_invoices        WHERE provedor LIKE '${PREFIXO}%';
    DELETE FROM integration_logs     WHERE accao LIKE '${PREFIXO}%';
    DELETE FROM webhook_deliveries   WHERE evento LIKE '${PREFIXO}%';
    DELETE FROM webhook_endpoints    WHERE criado_por LIKE '${PREFIXO}%';
    DELETE FROM integrations         WHERE provedor LIKE '${PREFIXO}%';
    -- O prefixo do NOME e o cracha, e ele nao chega: um plante do E32 punha o
    -- valor da chave no nome, e a linha deixava de casar. Apanha-se tambem pelo
    -- PREFIXO da chave, que o produto escreve e nenhum plante muda.
    DELETE FROM api_keys             WHERE nome LIKE '${PREFIXO}%' OR nome LIKE 'bk\\_%';

    -- ── E31 · o kiosk e a impressão saem PRIMEIRO ─────────────────────────
    --
    -- Antes dos pedidos e das contas: a sessão de kiosk aponta para os dois, e
    -- o envio de impressão aponta para a impressora com RESTRICT. Apagar por
    -- outra ordem prende tudo por chave estrangeira, e quem estoira é a limpeza
    -- da prova seguinte — longe de quem causou o problema.
    --
    -- E o gatilho da sessão fica DESLIGADO durante isto: ele recusa fechar uma
    -- sessão com cobrança indeterminada, o que está certo em serviço e é uma
    -- armadilha numa limpeza. A limpeza não fecha sessões, apaga-as.
    DELETE FROM print_jobs           WHERE conteudo LIKE '%${PREFIXO}%' OR printer_id IN (SELECT id FROM printers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM printers             WHERE nome LIKE '${PREFIXO}%';
    -- Pela CONTA e nao pelo prefixo da chave: o prefixo insp- e partilhado com
    -- outras sementes, e apagar por ele levava tentativas que ja tem pagamento
    -- por cima — a chave estrangeira estoirava e a semeadura falhava inteira.
    -- Medido a 06/09: o vermelho aparecia na semeadura e a causa era a limpeza.
    DELETE FROM payment_attempts     WHERE bill_id IN (SELECT id FROM bills WHERE numero LIKE '${PREFIXO}K-%');
    DELETE FROM kiosk_sessions       WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM bills                WHERE numero LIKE '${PREFIXO}K-%';
    DELETE FROM order_contacts       WHERE customer_id IN (SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM devices              WHERE nome LIKE '${PREFIXO}%';
    ALTER TABLE time_entries DISABLE TRIGGER USER;
    DELETE FROM time_entries         WHERE corrige_id IS NOT NULL;
    DELETE FROM time_entries         WHERE origem = 'insp' OR location_id IN (SELECT id FROM locations WHERE slug IN ('puerto','playa'));
    ALTER TABLE time_entries ENABLE TRIGGER USER;
    DELETE FROM shifts               WHERE nota LIKE '${PREFIXO}%';
    DELETE FROM team_roles           WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM financial_movements  WHERE location_id IN (SELECT id FROM locations WHERE slug LIKE '${PREFIXO}%');
    DELETE FROM reconciliations      WHERE bank_line_id IN (SELECT id FROM bank_lines WHERE account_id IN (SELECT id FROM bank_accounts WHERE nome LIKE '${PREFIXO}%'));
    DELETE FROM bank_lines           WHERE account_id IN (SELECT id FROM bank_accounts WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM statement_imports    WHERE account_id IN (SELECT id FROM bank_accounts WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM bank_accounts        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM locations            WHERE slug LIKE '${PREFIXO}canarias' OR slug LIKE '${PREFIXO}sin-datos';
    DELETE FROM financial_movements  WHERE conceito LIKE '${PREFIXO}%';
    DELETE FROM exchange_rates       WHERE fonte LIKE '${PREFIXO}%';
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
    -- ── O tecto da UNIDADE não tem zona nem turno, e por isso escapava ────
    --
    -- (Sem crases neste comentário de propósito: isto vive dentro de um
    --  template literal, e uma crase aqui fecha-o. Custou-me uma corrida.)
    --
    -- A semente cria duas regras: uma por zona e turno, e uma "toda a unidade"
    -- com area_id e window_id a NULO — para a tela saber dizer "toda a unidade"
    -- em vez de mostrar uma célula vazia. As duas condições acima apanham a
    -- primeira e nunca a segunda.
    --
    -- Medido a 06/09, ao pôr identificadores fixos na semente: 903 linhas em
    -- capacity_rules, todas sem zona e sem turno, uma por cada semeadura desde
    -- que isto existe. Com identificadores aleatórios a fuga era invisível; com
    -- identificadores fixos a segunda semeadura colide e denuncia-a. O limpar
    -- foi escrito para que a inspecção não meça uma página que cresce, e esta
    -- tabela crescia à mesma.
    DELETE FROM capacity_rules      WHERE window_id IN (SELECT id FROM service_windows WHERE nome LIKE '${PREFIXO}%')
                                       OR area_id IN (SELECT id FROM service_areas WHERE nome LIKE '${PREFIXO}%')
                                       OR (area_id IS NULL AND window_id IS NULL
                                           AND location_id IN (SELECT id FROM locations
                                                                WHERE organization_id IN (
                                                                  SELECT id FROM organizations WHERE slug LIKE '${PREFIXO}%'
                                                                     OR id IN (SELECT organization_id FROM locations WHERE slug LIKE '${PREFIXO}%'))));
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
    + (SELECT count(*) FROM team_roles          WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM bank_accounts       WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM financial_movements WHERE conceito LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM time_entries        WHERE origem = 'insp')
    + (SELECT count(*) FROM campaigns           WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM purchase_orders     WHERE numero LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM recipes             WHERE nome LIKE '${PREFIXO}%')
    + (SELECT count(*) FROM external_catalog_mappings WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%'))
    + (SELECT count(*) FROM guest_sessions      WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'))
  ) AS total`);
  return Number(r[0]?.total ?? 0);
}
