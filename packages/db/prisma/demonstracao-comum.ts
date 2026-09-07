import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * O inquilino de DEMONSTRAÇÃO — constantes e limpeza, sem efeitos ao importar.
 *
 * ── Porque é que existe, separado do arnês ────────────────────────────────
 *
 * O §6.4 manda tirar as capturas comerciais com «dados demonstrativos
 * claramente artificiais». O cenário do arnês não é isso, e a diferença não é
 * de grau: `insp-07 · insp-Terraza`, `painel@inspeccao.example` e «Aún no
 * medido» não são dados artificiais — **são andaime de teste à vista**. Um dado
 * claramente artificial é um restaurante inventado que ninguém confunde com um
 * cliente; um prefixo de arnês é um defeito que sobrou.
 *
 * ── E porque é que NÃO é o cenário do arnês com outro nome ────────────────
 *
 * O cenário do arnês existe para medir casos difíceis: uma linha rejeitada por
 * esgotado, outra por divergência de preço, um prato sem encaminhamento, um
 * limite visível baixo de propósito para o «em espera» encher. Tudo isso é
 * certo para a régua e **errado para uma captura comercial**: numa fotografia
 * do produto, um erro semeado de propósito lê-se como um produto partido.
 *
 * Este cenário é o caminho feliz, curado.
 *
 * ── Não é um cliente verdadeiro, e o nome di-lo ───────────────────────────
 *
 * «Bossa Demo» carrega o nome do próprio produto. É a única forma de um nome
 * ser ao mesmo tempo plausível numa captura e impossível de confundir com um
 * restaurante de alguém: qualquer nome espanhol bonito que eu inventasse
 * («El Ritmo», «Casa Marina») provavelmente existe algures, e o §6.3.11 e o
 * §6.4 são explícitos — não se representa um cliente real sem autorização, e a
 * autorização que o Matheus deixou destrava pendências **dele**, não o
 * consentimento de outra pessoa.
 *
 * Pela mesma razão não há aqui um único endereço de correio inventado: onde o
 * produto mostra quem fez uma coisa, fica um NOME de pessoa. Inventar
 * `maria@algum-sitio` é inventar o endereço de alguém.
 *
 * ── O que separa este cenário do arnês, e nos dois sentidos ───────────────
 *
 * IDs próprios (`d0…`), prefixo nenhum, organização própria. O
 * `limpar-inspeccao.ts` apaga pelo prefixo `insp-` e pelos dois IDs de
 * `fixtures.ts` — **não toca nisto**. E a limpeza daqui apaga só pela
 * organização de demonstração, por isso também não suja as medições do arnês.
 */

export const DEMO = {
  org: 'd0000000-0000-4000-8000-000000000001',
  marca: 'd0000000-0000-4000-8000-000000000002',
  unidade: 'd0000000-0000-4000-8000-000000000003',
  utilizador: 'd0000000-0000-4000-8000-000000000004',
  pertenca: 'd0000000-0000-4000-8000-000000000005',
  categoria: 'd0000000-0000-4000-8000-000000000010',
  menu: 'd0000000-0000-4000-8000-000000000011',
  zona: 'd0000000-0000-4000-8000-000000000012',
  sessao: 'd0000000-0000-4000-8000-000000000013',
  pedido: 'd0000000-0000-4000-8000-000000000014',
  envio: 'd0000000-0000-4000-8000-000000000015',
  estacaoQuente: 'd0000000-0000-4000-8000-000000000016',
  estacaoPasse: 'd0000000-0000-4000-8000-000000000017',
} as const;

/** O nome do inquilino, e o endereço público da carta. */
export const NOME_DA_DEMO = 'Bossa Demo';
export const SLUG_DA_DEMO = 'bossa-demo';

/**
 * Quem aparece no ecrã a ter feito as coisas.
 *
 * É um NOME e não um endereço de correio, e é deliberado: a coluna é de
 * auditoria e o produto imprime-a tal e qual — foi assim que
 * `inspeccao@exemplo.example` foi parar a uma captura da sala. Um nome próprio
 * sozinho não é o contacto de ninguém.
 */
export const QUEM_ATENDE = 'Marta (sala)';

/**
 * A conta com que as capturas entram no produto.
 *
 * Regista-se pela porta real (`/api/auth/sign-up/email`), como o arnês faz e
 * pela mesma razão: uma sessão forjada mede um cookie, não o produto. O domínio
 * `.invalid` é reservado pela RFC 2606 — não resolve, não é de ninguém, e não é
 * `example`, que é o que aparecia nas capturas do arnês.
 */
export const CONTA_DA_DEMO = 'demo@bossaos.invalid';
export const SENHA_DA_DEMO = 'demonstracao-Muito-Longa-2026';

export function abrirPrisma(): PrismaClient {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL ou DATABASE_URL em falta');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/**
 * As tabelas a limpar, **na ordem em que as chaves estrangeiras permitem**.
 *
 * Está escrita à mão e por ordem de propósito: um `TRUNCATE ... CASCADE` daria
 * o mesmo resultado e apagaria de caminho linhas de outros inquilinos que
 * apontem para as mesmas tabelas globais. A demonstração não é dona da base.
 */
const TABELAS_POR_ORDEM = [
  // A reserva do endereço público vem PRIMEIRO, e não é detalhe: a chave
  // estrangeira dela para `organizations` é `ON DELETE RESTRICT`, por isso uma
  // reserva esquecida tranca a limpeza inteira — e o erro aparece longe, na
  // semeadura seguinte, a queixar-se de uma chave estrangeira que ninguém
  // relaciona com um slug. Apanhei-o exactamente assim.
  'public_slug_owners',
  'schedule_intervals',
  'schedule_exceptions',
  'schedule_days',
  'production_tasks',
  'routing_rules',
  'production_stations',
  'order_lines',
  'order_submissions',
  'orders',
  'table_session_events',
  'table_sessions',
  'service_tables',
  'service_areas',
  'menu_publications',
  'menu_revisions',
  'menu_categories',
  'menus',
  'product_allergens',
  'product_channels',
  'price_rules',
  'products',
  'categories',
  'subscriptions',
  'role_assignments',
  'memberships',
] as const;

/**
 * Apaga o inquilino de demonstração e devolve a base ao que era.
 *
 * A ordem inversa da criação e o endereço público solto primeiro: o
 * `public_slug` vive na unidade, que sobrevive à limpeza das filhas, e um slug
 * esquecido faz a semeadura seguinte falhar a reservar o endereço — com o erro
 * a aparecer longe de quem o causou.
 */
export async function limparDemonstracao(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE locations SET public_slug = NULL WHERE organization_id = '${DEMO.org}'`);
  for (const tabela of TABELAS_POR_ORDEM) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM ${tabela} WHERE organization_id = '${DEMO.org}'`);
  }
  // As três de topo não têm `organization_id`; identificam-se por si.
  await prisma.$executeRawUnsafe(`DELETE FROM locations WHERE organization_id = '${DEMO.org}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM brands    WHERE organization_id = '${DEMO.org}'`);
  // As duas contas: a que a sala mostra e a que entra para capturar. A segunda
  // arrasta sessões e credenciais do better-auth, e por isso sai por email.
  await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE user_id IN
    (SELECT id FROM users WHERE id = '${DEMO.utilizador}' OR email = '${CONTA_DA_DEMO}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM accounts WHERE user_id IN
    (SELECT id FROM users WHERE id = '${DEMO.utilizador}' OR email = '${CONTA_DA_DEMO}')`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM users WHERE id = '${DEMO.utilizador}' OR email = '${CONTA_DA_DEMO}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM organizations WHERE id = '${DEMO.org}'`);
}

/**
 * Quantas linhas da demonstração ficaram para trás.
 *
 * A limpeza verifica-se a si própria: uma limpeza que corre e não limpa é pior
 * do que não haver limpeza nenhuma, porque a corrida seguinte encontra a base
 * suja e culpa o código que está a medir.
 */
export async function restosDaDemonstracao(prisma: PrismaClient): Promise<number> {
  let total = 0;
  for (const tabela of TABELAS_POR_ORDEM) {
    const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM ${tabela} WHERE organization_id = '${DEMO.org}'`);
    total += Number(r[0]?.n ?? 0);
  }
  for (const [tabela, onde] of [
    ['locations', `organization_id = '${DEMO.org}'`],
    ['brands', `organization_id = '${DEMO.org}'`],
    ['users', `id = '${DEMO.utilizador}' OR email = '${CONTA_DA_DEMO}'`],
    ['organizations', `id = '${DEMO.org}'`],
  ] as const) {
    const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM ${tabela} WHERE ${onde}`);
    total += Number(r[0]?.n ?? 0);
  }
  return total;
}

/**
 * A IMPRESSÃO do cenário — o que faz «determinístico» ser medível.
 *
 * ── O que entra e o que fica de fora, e porquê ────────────────────────────
 *
 * Entram os valores que a captura MOSTRA: nomes, preços, códigos de mesa,
 * estados, quantidades. Ficam de fora os carimbos de tempo — `created_at`,
 * `iniciada_em` — porque mudam a cada corrida por construção e compará-los
 * daria sempre «não determinístico» sem nada estar errado. Um detector que
 * acusa sempre não distingue nada.
 *
 * Os identificadores entram: são fixos de propósito, e se deixarem de o ser é
 * exactamente o tipo de deriva que isto existe para apanhar.
 */
export async function impressaoDaDemonstracao(prisma: PrismaClient): Promise<string> {
  const partes: string[] = [];
  const consultas: readonly [string, string][] = [
    ['organizacao', `SELECT id, slug, nome FROM organizations WHERE id = '${DEMO.org}'`],
    ['unidade', `SELECT id, nome, slug, public_slug, moeda, fuso FROM locations
                 WHERE organization_id = '${DEMO.org}' ORDER BY id`],
    ['produtos', `SELECT p.nome, p.descricao, p.estado, r.montante_menor, r.moeda
                  FROM products p LEFT JOIN price_rules r ON r.product_id = p.id
                  WHERE p.organization_id = '${DEMO.org}' ORDER BY p.nome`],
    ['mesas', `SELECT codigo, capacidade FROM service_tables
               WHERE organization_id = '${DEMO.org}' ORDER BY codigo`],
    ['sessoes', `SELECT estado, comensais, aberta_por FROM table_sessions
                 WHERE organization_id = '${DEMO.org}' ORDER BY id`],
    ['pedido', `SELECT numero, estado, canal, aberto_por FROM orders
                WHERE organization_id = '${DEMO.org}' ORDER BY numero`],
    ['linhas', `SELECT nome, quantidade, preco_menor, estado FROM order_lines
                WHERE organization_id = '${DEMO.org}' ORDER BY nome`],
    ['estacoes', `SELECT nome, tipo, ordem, limite_visivel FROM production_stations
                  WHERE organization_id = '${DEMO.org}' ORDER BY ordem`],
    ['tarefas', `SELECT estado FROM production_tasks
                 WHERE organization_id = '${DEMO.org}' ORDER BY estado`],
    ['publicacoes', `SELECT canal FROM menu_publications
                     WHERE organization_id = '${DEMO.org}' ORDER BY canal`],
  ];
  for (const [nome, sql] of consultas) {
    const linhas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    partes.push(`${nome}:${JSON.stringify(linhas)}`);
  }
  const { createHash } = await import('node:crypto');
  return createHash('md5').update(partes.join('\n'), 'utf8').digest('hex');
}
