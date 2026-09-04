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
    DELETE FROM public_slug_owners WHERE slug LIKE '${PREFIXO}%';
    DELETE FROM table_session_events WHERE session_id IN (SELECT id FROM table_sessions WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'));
    DELETE FROM table_sessions       WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM table_combination_members WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%');
    DELETE FROM table_combinations   WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM service_tables       WHERE codigo LIKE '${PREFIXO}%';
    DELETE FROM service_areas        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM device_shifts        WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM device_pairings      WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM devices              WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM service_types        WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM production_events    WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM production_tasks     WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM routing_rules        WHERE station_id IN (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%');
    DELETE FROM production_stations  WHERE nome LIKE '${PREFIXO}%';
    DELETE FROM order_events         WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM order_lines          WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM order_submissions    WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%');
    DELETE FROM orders               WHERE numero LIKE '${PREFIXO}%';
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
  ) AS total`);
  return Number(r[0]?.total ?? 0);
}
