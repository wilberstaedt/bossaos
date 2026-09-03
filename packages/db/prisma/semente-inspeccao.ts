/**
 * Semeadura do arnês do navegador.
 *
 * ── Porque é que isto tinha de existir ─────────────────────────────────────
 *
 * As onze telas do E09 estavam na `DIVIDA-MOVEL.txt` por uma razão concreta e
 * escrita: a prova do E09 **cria e destrói o seu próprio endereço público** — o
 * `public_slug` volta a `NULL` no fim, porque quem faz a sujidade apanha-a. E a
 * inspecção de larguras não semeia base nenhuma.
 *
 * Resultado: não havia carta persistente para o navegador visitar. As telas mais
 * dependentes de telemóvel do produto inteiro — a carta que se lê apontando um
 * código impresso na mesa — eram as únicas sem prova de móvel.
 *
 * Esta semeadura resolve isso, e é a mesma que o E10 precisa para os sites
 * públicos.
 *
 * ── Idempotente, e com um prefixo só dela ──────────────────────────────────
 *
 * Corre antes de cada passagem do navegador e não pode acumular. E o prefixo
 * `insp-` é diferente do `e09-` das provas: se partilhassem prefixo, a limpeza
 * de uma apagava o cenário da outra, e o sintoma seria uma inspecção que falha
 * consoante a ordem por que se correram os comandos.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { IDS } from './fixtures.ts';

/** O endereço público que o navegador visita. Estável, para as rotas serem fixas. */
export const SLUG_DE_INSPECCAO = 'insp-marina-oropesa';
const PREFIXO = 'insp-';

async function principal(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL ou DATABASE_URL em falta');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, options: '-c timezone=UTC' }),
  });

  try {
    // Limpa a passagem anterior. Sem isto, cada corrida acrescentava uma carta e
    // a inspecção passava a medir uma página que cresce.
    await prisma.$executeRawUnsafe(
      `UPDATE locations SET public_slug = NULL WHERE public_slug = '${SLUG_DE_INSPECCAO}'`);
    await prisma.$executeRawUnsafe(`
      DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM menu_revisions    WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM menu_categories   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM menus             WHERE nome LIKE '${PREFIXO}%';
      DELETE FROM product_channels WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM product_allergens WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM price_rules      WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%');
      DELETE FROM products         WHERE nome LIKE '${PREFIXO}%';
      DELETE FROM categories       WHERE nome LIKE '${PREFIXO}%';
    `);

    const cat = await prisma.category.create({
      data: {
        organizationId: IDS.orgA, brandId: IDS.marcaA,
        nome: `${PREFIXO}Para compartir`, ordem: 1,
      },
      select: { id: true },
    });

    // Nomes e descrições LONGOS de propósito: a inspecção mede transbordo a
    // 360 px, e uma carta de teste com "Café" em todas as linhas nunca
    // transborda — mediria uma página que não se parece com a real.
    const pratos = [
      ['Croquetas caseras de jamón ibérico con bechamel especiada', 850],
      ['Tortilla de patatas con cebolla caramelizada y pimientos del piquillo', 1150],
      ['Pulpo a la gallega sobre parmentier de patata y pimentón de la Vera', 1890],
      ['Café', 150],
    ] as const;

    const lista = await prisma.allergen.findMany({ select: { id: true, codigo: true } });
    for (const [nome, preco] of pratos) {
      const p = await prisma.product.create({
        data: {
          organizationId: IDS.orgA, brandId: IDS.marcaA, categoryId: cat.id,
          nome: `${PREFIXO}${nome}`,
          descricao: 'Elaborado en casa cada mañana, con producto de temporada.',
          estado: 'ACTIVO',
        },
        select: { id: true },
      });
      await prisma.priceRule.create({
        data: { organizationId: IDS.orgA, productId: p.id, montanteMenor: preco, moeda: 'EUR' },
      });
      await prisma.productChannel.create({
        data: { organizationId: IDS.orgA, productId: p.id, canal: 'CARTA', visivel: true },
      });
      // Um alérgeno declarado e os restantes por declarar: é a ficha real, e é
      // ela que a inspecção tem de conseguir mostrar num ecrã de 360 px sem
      // esconder nenhuma linha.
      const gluten = lista.find((a) => a.codigo === 'gluten');
      if (gluten) {
        await prisma.productAllergen.create({
          data: {
            organizationId: IDS.orgA, productId: p.id, allergenId: gluten.id,
            estado: 'CONTEM', revistoPor: 'inspeccao@exemplo.example', revistoEm: new Date(),
          },
        });
      }
    }

    // **Preso à unidade**, e na SEGUNDA unidade. Duas razões: um menu da marca
    // apareceria no endereço público das outras unidades — e um `public_slug` na
    // mesma unidade que as provas usam fazia as duas disputarem a coluna, com o
    // sintoma a aparecer na prova errada. Aconteceu.
    const menu = await prisma.menu.create({
      data: {
        organizationId: IDS.orgA, brandId: IDS.marcaA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Carta`, estado: 'ACTIVO',
      },
      select: { id: true },
    });
    await prisma.menuCategory.create({
      data: { organizationId: IDS.orgA, menuId: menu.id, categoryId: cat.id, ordem: 1 },
    });

    // A publicação é feita por SQL directo e não pelo serviço: a semeadura corre
    // com a credencial de migração, que não passa pelo `comEscopo`. O que
    // interessa ao navegador é haver uma revisão no ar — a atomicidade da
    // publicação tem prova própria no E08.
    const itens = await prisma.product.findMany({
      where: { nome: { startsWith: PREFIXO } },
      select: {
        id: true, nome: true, descricao: true,
        precos: { select: { montanteMenor: true, moeda: true }, take: 1 },
        alergenios: { select: { estado: true, allergen: { select: { codigo: true } } } },
      },
      orderBy: { nome: 'asc' },
    });
    const conteudo = itens.map((p) => ({
      productId: p.id, nome: p.nome.replace(PREFIXO, ''), descricao: p.descricao,
      precoMenor: p.precos[0]?.montanteMenor ?? null, moeda: p.precos[0]?.moeda ?? null,
      categoryId: cat.id, categoriaNome: 'Para compartir',
      alergenosPorDeclarar: 13,
      alergenos: lista.map((a) => ({
        codigo: a.codigo,
        estado: p.alergenios.find((d) => d.allergen.codigo === a.codigo)?.estado ?? 'DESCONHECIDO',
      })),
      variantes: [], media: [], preferencias: [],
    }));

    const revisao = await prisma.menuRevision.create({
      data: {
        organizationId: IDS.orgA, menuId: menu.id, numero: 1,
        conteudo: conteudo as unknown as object, criadaPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.menuPublication.create({
      data: {
        organizationId: IDS.orgA, menuId: menu.id, canal: 'CARTA',
        revisionId: revisao.id, publicadaPor: 'inspeccao@exemplo.example',
      },
    });

    // O endereço público, pela porta que decide — a mesma do produto.
    const r = await prisma.$queryRawUnsafe<{ reservar_endereco_publico: string }[]>(
      `SELECT reservar_endereco_publico('${IDS.orgA}'::uuid, '${IDS.unidadeA2}'::uuid, '${SLUG_DE_INSPECCAO}')`);
    const resultado = r[0]?.reservar_endereco_publico;
    if (resultado !== 'ok') {
      throw new Error(`não consegui reservar o endereço de inspecção: ${resultado}`);
    }

    // Confirma que a carta responde ANTES de o navegador tentar. Sem isto, um
    // erro de semeadura aparecia como "a inspecção falhou", que manda procurar
    // no sítio errado.
    const carta = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM publico_carta('${SLUG_DE_INSPECCAO}', 'CARTA'::"Canal")`);
    if (carta.length === 0) {
      throw new Error('a carta de inspecção não responde depois de semeada');
    }
    console.log(`semeado: /r/${SLUG_DE_INSPECCAO}/<idioma>/menu com ${itens.length} produtos`);
  } finally {
    await prisma.$disconnect();
  }
}

await principal();
