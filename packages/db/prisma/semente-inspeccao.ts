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

import { createHash } from 'node:crypto';
import { projectarSite } from '@bossaos/domain';
import { IDS } from './fixtures.ts';
import {
  abrirPrisma, limpar, PREFIXO, SLUG_DE_INSPECCAO, SLUG_DE_INSPECCAO_B,
} from './inspeccao-comum.ts';

export { SLUG_DE_INSPECCAO, SLUG_DE_INSPECCAO_B };

/** O convite que a tela AUTH-006 abre. Fixo, para a rota ser fixa. */
export const TOKEN_DE_INSPECCAO = 'insp-convite-para-medir';

async function principal(): Promise<void> {
  const prisma = abrirPrisma();

  try {
    // Limpa a passagem anterior. Sem isto, cada corrida acrescentava uma carta e
    // a inspecção passava a medir uma página que cresce. A lista do que se apaga
    // vive em `inspeccao-comum.ts`, partilhada com o fecho.
    await limpar(prisma);

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


    // ── O SEGUNDO cenário público, no inquilino B (E12) ───────────────────
    //
    // A organização A é Starter e não pode ter cores próprias, portanto a rota
    // pública dela serve sempre a paleta de origem. Medir ali a cor calculada
    // pelo navegador dava verde contra o tema por omissão — o «verde sobre tema
    // por omissão» que a régua do E12 reprova.
    //
    // A B é Pro. Este cenário é o MÍNIMO para haver uma carta no ar onde uma cor
    // publicada se possa ver: uma categoria, um prato, uma revisão publicada e um
    // endereço. Não se copia o cenário de A — o que interessa aqui é a cor, e uma
    // segunda carta grande só tornava a inspecção mais lenta.
    const catB = await prisma.category.create({
      data: {
        organizationId: IDS.orgB, brandId: IDS.marcaB,
        nome: `${PREFIXO}Cocina de mercado`, ordem: 1,
      },
      select: { id: true },
    });
    const pratoB = await prisma.product.create({
      data: {
        organizationId: IDS.orgB, brandId: IDS.marcaB, categoryId: catB.id,
        nome: `${PREFIXO}Arroz de sepia y alcachofas`,
        descricao: 'Arroz seco de sepia con alcachofas de temporada, para dos personas.',
        estado: 'ACTIVO',
      },
      select: { id: true },
    });
    await prisma.priceRule.create({
      data: { organizationId: IDS.orgB, productId: pratoB.id, montanteMenor: 2400, moeda: 'EUR' },
    });
    await prisma.productChannel.create({
      data: { organizationId: IDS.orgB, productId: pratoB.id, canal: 'CARTA', visivel: true },
    });

    const menuB = await prisma.menu.create({
      data: {
        organizationId: IDS.orgB, brandId: IDS.marcaB, locationId: IDS.unidadeB,
        nome: `${PREFIXO}Carta Barcelona`, estado: 'ACTIVO',
      },
      select: { id: true },
    });
    await prisma.menuCategory.create({
      data: { organizationId: IDS.orgB, menuId: menuB.id, categoryId: catB.id, ordem: 1 },
    });
    const revisaoB = await prisma.menuRevision.create({
      data: {
        organizationId: IDS.orgB, menuId: menuB.id, numero: 1,
        conteudo: [{
          productId: pratoB.id, nome: 'Arroz de sepia y alcachofas',
          descricao: 'Arroz seco de sepia con alcachofas de temporada, para dos personas.',
          precoMenor: 2400, moeda: 'EUR',
          categoryId: catB.id, categoriaNome: 'Cocina de mercado',
          alergenosPorDeclarar: 14,
          alergenos: lista.map((a) => ({ codigo: a.codigo, estado: 'DESCONHECIDO' })),
          variantes: [], media: [], preferencias: [],
        }] as unknown as object,
        criadaPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.menuPublication.create({
      data: {
        organizationId: IDS.orgB, menuId: menuB.id, canal: 'CARTA',
        revisionId: revisaoB.id, publicadaPor: 'inspeccao@exemplo.example',
      },
    });
    const rB = await prisma.$queryRawUnsafe<{ reservar_endereco_publico: string }[]>(
      `SELECT reservar_endereco_publico('${IDS.orgB}'::uuid, '${IDS.unidadeB}'::uuid, '${SLUG_DE_INSPECCAO_B}')`);
    if (rB[0]?.reservar_endereco_publico !== 'ok') {
      throw new Error(`não consegui reservar o endereço de B: ${rB[0]?.reservar_endereco_publico}`);
    }
    const cartaB = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM publico_carta('${SLUG_DE_INSPECCAO_B}', 'CARTA'::"Canal")`);
    if (cartaB.length === 0) {
      throw new Error('a carta do inquilino B não responde depois de semeada');
    }

    // ── E um SITE em B, porque a cor primária não se vê na carta ──────────
    //
    // Medido: na carta pública não há um único elemento pintado com
    // `--bo-publico-primaria`. O botão primário vive na home do site («Ver
    // carta»), e é lá que a cor primária de um restaurante aparece de facto.
    //
    // Sem site em B, o arnês só conseguia ler o FUNDO calculado — e uma
    // implementação que aplicasse o fundo e esquecesse a primária passava. É a
    // mesma classe de defeito que a régua descreve: medir uma parte e dar a
    // outra por medida.
    const siteB = await prisma.site.upsert({
      where: { organizationId_locationId: { organizationId: IDS.orgB, locationId: IDS.unidadeB } },
      update: { seoTitulo: `${PREFIXO}Marina Barcelona`, estado: 'PUBLICADO' },
      create: {
        organizationId: IDS.orgB, locationId: IDS.unidadeB,
        seoTitulo: `${PREFIXO}Marina Barcelona`,
        seoDescricao: 'Cocina de mercado en la Barceloneta, con arroces al mediodía.',
        estado: 'PUBLICADO', redes: [],
      },
      select: { id: true },
    });
    await prisma.sitePage.upsert({
      where: {
        organizationId_siteId_tipo: { organizationId: IDS.orgB, siteId: siteB.id, tipo: 'INICIO' },
      },
      update: { visivel: true },
      create: {
        organizationId: IDS.orgB, siteId: siteB.id, tipo: 'INICIO', visivel: true,
        titulo: 'Marina Barcelona, arroces y producto de lonja cada mediodía',
        corpo: 'La carta cambia con la lonja, y el arroz se encarga al llegar.',
      },
    });
    const paginasB = await prisma.sitePage.findMany({
      where: { siteId: siteB.id },
      select: { tipo: true, visivel: true, titulo: true, corpo: true, contacto: true },
    });
    const conteudoB = projectarSite({
      seoTitulo: `${PREFIXO}Marina Barcelona`,
      seoDescricao: 'Cocina de mercado en la Barceloneta, con arroces al mediodía.',
      redes: [],
      paginas: paginasB.map((x) => ({
        tipo: x.tipo as 'INICIO', visivel: x.visivel,
        titulo: x.titulo, corpo: x.corpo, contacto: x.contacto,
      })),
      posts: [],
    });
    const ultimaB = await prisma.siteRevision.findFirst({
      where: { siteId: siteB.id }, select: { numero: true }, orderBy: { numero: 'desc' },
    });
    const revisaoSiteB = await prisma.siteRevision.create({
      data: {
        organizationId: IDS.orgB, siteId: siteB.id, numero: (ultimaB?.numero ?? 0) + 1,
        conteudo: conteudoB as unknown as object, criadaPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.sitePublication.upsert({
      where: { organizationId_siteId: { organizationId: IDS.orgB, siteId: siteB.id } },
      update: { revisionId: revisaoSiteB.id, publicadaEm: new Date() },
      create: {
        organizationId: IDS.orgB, siteId: siteB.id, revisionId: revisaoSiteB.id,
        publicadaPor: 'inspeccao@exemplo.example',
      },
    });
    const doSiteB = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM publico_site('${SLUG_DE_INSPECCAO_B}')`);
    if (doSiteB.length === 0) {
      throw new Error('o site do inquilino B não responde depois de semeado');
    }

    // ── O que as 66 telas da dívida de móvel precisam de encontrar ────────
    //
    // A revisão do marco E11 mandou medir em móvel 66 telas que nunca foram
    // renderizadas. Vinte e sete são do catálogo e várias vivem em rotas com
    // identificador — sem dados, mediriam a página de "não encontrado" e diriam
    // verde, que é a classe de erro que este projecto passa o tempo a fechar.
    //
    // Tudo o que nasce aqui leva o prefixo `insp-` e sai pela mesma porta.
    // Sem `upsert`: a tabela não tem chave única pelo nome, e inventar uma para
    // o arnês seria mudar o modelo por causa de um teste.
    const grupoExistente = await prisma.modifierGroup.findFirst({
      where: { nome: `${PREFIXO}Punto de la carne` }, select: { id: true },
    });
    if (!grupoExistente) {
      await prisma.modifierGroup.create({
        data: {
          organizationId: IDS.orgA, brandId: IDS.marcaA,
          nome: `${PREFIXO}Punto de la carne`, minimo: 1, maximo: 1, obrigatorio: true,
        },
      });
    }

    // Um convite por aceitar, para a tela AUTH-006 ter um endereço real.
    //
    // A base guarda o RESUMO do token e nunca o token — é a decisão do E04, e é
    // a certa: quem tiver a base não fica com os convites em aberto. Por isso o
    // arnês guarda o mesmo resumo que o produto calcularia, com a mesma função,
    // em vez de inventar uma coluna ou de baixar a exigência.
    const resumo = createHash('sha256').update(TOKEN_DE_INSPECCAO, 'utf8').digest('hex');
    await prisma.$executeRawUnsafe(`
      INSERT INTO invitations (id, organization_id, email, papel, token_hash,
                               expires_at, convidado_por_id, updated_at)
      VALUES (gen_random_uuid(), '${IDS.orgA}', 'convidado@inspeccao.example', 'WAITER',
              '${resumo}', now() + interval '7 days', '${IDS.utilizadorA}', now())
      ON CONFLICT (token_hash) DO UPDATE SET
        expires_at = now() + interval '7 days', accepted_at = NULL, revoked_at = NULL`);

    // Uma unidade ARQUIVADA, para o estado STATE-013 poder ser visto. Não se
    // arquiva uma das fixtures: outras provas contam com elas vivas, e uma prova
    // que estraga o cenário de outra é o defeito que o E06 já pagou uma vez.
    await prisma.$executeRawUnsafe(`
      INSERT INTO locations (id, organization_id, brand_id, nome, slug, moeda, fuso, archived_at, updated_at)
      VALUES ('cccc9999-9999-4999-8999-999999999999', '${IDS.orgA}', '${IDS.marcaA}',
              '${PREFIXO}Marina Cerrada', 'insp-cerrada', 'EUR', 'Europe/Madrid', now(), now())
      ON CONFLICT (id) DO UPDATE SET archived_at = now(), updated_at = now()`);

    // ── A SALA (E13), para as dezassete telas terem o que medir ───────────
    //
    // Zonas, mesas, uma sessão ABERTA e dois dispositivos. Sem isto, as telas
    // com identificador — a ficha da sessão, a transferência, o encerramento, a
    // ficha e a revogação do dispositivo — mediam a página de «não encontrado» e
    // diziam verde, que é a classe de erro que este projecto passa o tempo a
    // fechar.
    //
    // Na unidade `puerto` (a mesma do painel), porque é a que a sessão do arnês
    // abre.
    const zona = await prisma.serviceArea.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Terraza`, tipo: 'TERRACO', ordem: 1,
      },
      select: { id: true },
    });
    // Nomes longos de propósito, pela mesma razão que os pratos: uma sala com
    // «1», «2», «3» nunca transborda a 360 px e mede uma coisa que não se parece
    // com a real.
    const mesas = await Promise.all([
      ['07', 4, 0, 0], ['08 junto a la ventana', 2, 1, 0], ['Barra alta 12', 6, null, null],
    ].map(([codigo, capacidade, x, y]) => prisma.serviceTable.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, areaId: zona.id,
        codigo: `${PREFIXO}${codigo as string}`, capacidade: capacidade as number,
        posX: x as number | null, posY: y as number | null,
      },
      select: { id: true },
    })));

    const primeiraMesa = mesas[0];
    if (!primeiraMesa) throw new Error('a semeadura da sala não criou mesas');
    const sessaoDeMesa = await prisma.tableSession.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, tableId: primeiraMesa.id,
        estado: 'ABERTA', comensais: 3, abertaPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.tableSessionEvent.create({
      data: {
        organizationId: IDS.orgA, sessionId: sessaoDeMesa.id, accao: 'sessao.aberta',
        actorEmail: 'inspeccao@exemplo.example',
      },
    });

    await prisma.device.createMany({
      data: [
        {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          nome: `${PREFIXO}Tablet de sala del turno de noche`, estacao: 'SALA',
          estado: 'ACTIVO', ultimoVistoEm: new Date(),
        },
        {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          nome: `${PREFIXO}Pantalla de cocina 01`, estacao: 'COZINHA', estado: 'PENDENTE',
        },
      ],
    });

    await prisma.serviceType.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Comida`, inicioMinutos: 13 * 60, fimMinutos: 16 * 60,
      },
    });

    // ── O SITE do restaurante (E10), publicado ────────────────────────────
    //
    // Sem isto, as telas públicas do E10 mediam a página de "não encontrado" e
    // diziam verde — que é exactamente a classe de erro que este projecto passa
    // o tempo a fechar. Os textos são longos de propósito, pela mesma razão que
    // os nomes dos pratos: uma página com "olá" em cada campo nunca transborda
    // a 360 px e mede uma coisa que não se parece com a real.
    const site = await prisma.site.upsert({
      where: { organizationId_locationId: { organizationId: IDS.orgA, locationId: IDS.unidadeA2 } },
      update: { seoTitulo: `${PREFIXO}Marina Puerto`, estado: 'PUBLICADO' },
      create: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        seoTitulo: `${PREFIXO}Marina Puerto`,
        seoDescricao: 'Cocina de mercado junto al puerto, con producto de temporada.',
        estado: 'PUBLICADO',
        redes: [{ rede: 'instagram', url: 'https://instagram.com/marina-puerto-inspeccao' }],
      },
      select: { id: true },
    });

    const PAGINAS = [
      ['INICIO', 'Bienvenidos a Marina Puerto, cocina de mercado junto al agua',
        'Trabajamos con producto de temporada y proveedores de la comarca.\n\nLa carta cambia cada semana, y lo que no encuentras hoy probablemente vuelva el mes que viene.'],
      ['SOBRE', 'Una mesa para encontrarnos desde mil novecientos veintisiete',
        'La casa abrió como fonda de pescadores y sigue en la misma esquina.\n\nTres generaciones después, la cocina cambió y la costumbre de sentarse mucho rato no.'],
      ['CONTACTO', 'Te esperamos en el puerto de Oropesa del Mar',
        'Estamos a doscientos metros del faro, con aparcamiento en la explanada.'],
    ] as const;

    for (const [tipo, titulo, corpo] of PAGINAS) {
      await prisma.sitePage.upsert({
        where: {
          organizationId_siteId_tipo: {
            organizationId: IDS.orgA, siteId: site.id, tipo,
          },
        },
        update: { titulo, corpo, visivel: true },
        create: {
          organizationId: IDS.orgA, siteId: site.id, tipo, titulo, corpo, visivel: true,
          ...(tipo === 'CONTACTO' ? {
            contacto: {
              morada: 'Paseo del Puerto 14, 12594 Oropesa del Mar, Castellón',
              telefone: '+34 964 000 000',
              email: 'reservas@marina-puerto.example',
            },
          } : {}),
        },
      });
    }

    await prisma.sitePost.upsert({
      where: {
        organizationId_siteId_slug: {
          organizationId: IDS.orgA, siteId: site.id, slug: 'noche-de-vinos-de-la-comarca',
        },
      },
      update: { visivel: true },
      create: {
        organizationId: IDS.orgA, siteId: site.id, slug: 'noche-de-vinos-de-la-comarca',
        titulo: 'Una noche para compartir los vinos de la comarca',
        resumo: 'Seis referencias de bodegas pequeñas, con los viticultores en la sala.',
        corpo: 'Empezamos a las ocho y media y terminamos cuando se acabe el último vino.\n\nLas plazas son limitadas porque la sala es la que es.',
        publicadoEm: new Date('2026-08-15T18:00:00Z'), visivel: true,
      },
    });

    // Publicar pela porta real do produto — não por SQL. A revisão que o
    // navegador vai ver é a mesma que o botão "Publicar" produz; uma semeadura
    // que montasse o retrato à mão media uma coisa que o produto não faz.
    const paginasDoSite = await prisma.sitePage.findMany({
      where: { siteId: site.id },
      select: { tipo: true, visivel: true, titulo: true, corpo: true, contacto: true },
    });
    const postsDoSite = await prisma.sitePost.findMany({
      where: { siteId: site.id },
      select: { slug: true, titulo: true, resumo: true, corpo: true, publicadoEm: true, visivel: true },
    });
    const conteudoDoSite = projectarSite({
      seoTitulo: `${PREFIXO}Marina Puerto`,
      seoDescricao: 'Cocina de mercado junto al puerto, con producto de temporada.',
      redes: [{ rede: 'instagram', url: 'https://instagram.com/marina-puerto-inspeccao' }],
      paginas: paginasDoSite.map((x) => ({
        tipo: x.tipo as 'INICIO', visivel: x.visivel,
        titulo: x.titulo, corpo: x.corpo, contacto: x.contacto,
      })),
      posts: postsDoSite,
    });
    const ultima = await prisma.siteRevision.findFirst({
      where: { siteId: site.id }, select: { numero: true }, orderBy: { numero: 'desc' },
    });
    const revisaoDoSite = await prisma.siteRevision.create({
      data: {
        organizationId: IDS.orgA, siteId: site.id, numero: (ultima?.numero ?? 0) + 1,
        conteudo: conteudoDoSite as unknown as object, criadaPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.sitePublication.upsert({
      where: { organizationId_siteId: { organizationId: IDS.orgA, siteId: site.id } },
      update: { revisionId: revisaoDoSite.id, publicadaEm: new Date() },
      create: {
        organizationId: IDS.orgA, siteId: site.id, revisionId: revisaoDoSite.id,
        publicadaPor: 'inspeccao@exemplo.example',
      },
    });

    // Confirma que a carta responde ANTES de o navegador tentar. Sem isto, um
    // erro de semeadura aparecia como "a inspecção falhou", que manda procurar
    // no sítio errado.
    const carta = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM publico_carta('${SLUG_DE_INSPECCAO}', 'CARTA'::"Canal")`);
    if (carta.length === 0) {
      throw new Error('a carta de inspecção não responde depois de semeada');
    }
    const doSite = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM publico_site('${SLUG_DE_INSPECCAO}')`);
    if (doSite.length === 0) {
      throw new Error('o site de inspecção não responde depois de semeado');
    }
    console.log(
      `semeado: /r/${SLUG_DE_INSPECCAO}/<idioma> com ${itens.length} produtos e o site publicado`);
  } finally {
    await prisma.$disconnect();
  }
}

await principal();
