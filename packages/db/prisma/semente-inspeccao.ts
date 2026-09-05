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

import { createHash, randomUUID } from 'node:crypto';
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

    // ── O PLANO das duas organizações, ESTABELECIDO e não herdado ─────────
    //
    // A prova de tema do E12 exige que a organização B seja **Pro** — está
    // escrito no cabeçalho do `tema.spec.ts` — e as fixtures não criam
    // subscrição nenhuma. Localmente isso passou despercebido porque as provas
    // de base (`provas/tema.test.ts`, `planos`, `descidas`) assinam as duas
    // organizações e **deixam a subscrição para trás**: o arnês do navegador
    // herdava o plano de quem tinha corrido antes.
    //
    // Numa base fresca — a da CI — não há nada para herdar. O portão do plano
    // dispara antes do contraste, como tem de disparar, e a rota devolve 402
    // `sem_plano` onde a prova esperava `erro=contraste`. Três corridas iguais,
    // e a assinatura do E12 retirada por isso.
    //
    // **Uma prova que herda estado mede a base, não o produto.** Aqui o estado
    // comercial passa a fazer parte do cenário, como as mesas e a carta.
    for (const [organizationId, codigo] of [
      [IDS.orgA, 'STARTER'], [IDS.orgB, 'PRO'],
    ] as const) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
        SELECT gen_random_uuid(), '${organizationId}', p.id, 'ACTIVA', now()
          FROM plan_definitions p WHERE p.codigo = '${codigo}'
        ON CONFLICT (organization_id) DO UPDATE
          SET plan_id = (SELECT id FROM plan_definitions WHERE codigo = '${codigo}'),
              estado = 'ACTIVA', valido_ate = NULL,
              descer_para_plano_id = NULL, descer_em = NULL, updated_at = now()`);
    }
    // E confirma que ficou, em vez de assumir. Uma semeadura que falha em
    // silêncio devolve o problema à prova, que o reporta no sítio errado.
    const planos = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM subscriptions WHERE organization_id IN ('${IDS.orgA}', '${IDS.orgB}')`);
    if (Number(planos[0]?.n ?? 0) !== 2) {
      throw new Error('a semeadura não conseguiu assinar as duas organizações');
    }

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
    // ── A sessão tem RESPONSÁVEL, e é OUTRA pessoa que não a do arnês ────
    //
    // Sem responsável atribuído, as telas da sala nunca liam um nome — e o
    // defeito do ORG-007 escondeu-se por isso. A junção a `users` pelo cliente
    // com escopo devolve `null` **só quando o responsável é outra pessoa**, que é
    // o caso normal numa sala e não era o caso do cenário.
    //
    // Com o responsável na pertença do utilizador das fixtures, a ficha da sessão
    // desreferencia um nome que o runtime não consegue ler — e o 500 aparece.
    const pertencaDoDono = await prisma.membership.findFirst({
      where: { organizationId: IDS.orgA, userId: IDS.utilizadorA },
      select: { id: true },
    });
    if (!pertencaDoDono) {
      throw new Error('a semeadura não encontrou a pertença do dono para responsabilizar a mesa');
    }
    const sessaoDeMesa = await prisma.tableSession.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, tableId: primeiraMesa.id,
        estado: 'ABERTA', comensais: 3, abertaPor: 'inspeccao@exemplo.example',
        responsavelId: pertencaDoDono.id,
      },
      select: { id: true },
    });
    await prisma.tableSessionEvent.create({
      data: {
        organizationId: IDS.orgA, sessionId: sessaoDeMesa.id, accao: 'sessao.aberta',
        actorEmail: 'inspeccao@exemplo.example',
      },
    });

    // ── Uma mesa e uma sessão SÓ do Staff ──────────────────────────────
    //
    // Pela mesma razão que há dois dispositivos e não um: *«com um só, a segunda
    // visita media o ecrã de um aparelho que a primeira já tinha retirado»*.
    //
    // A sessão acima é a que o `sala.spec.ts` mede, e ele visita as telas de
    // **encerrar** e **transferir** dela. Partilhá-la punha duas provas a medir
    // a mesma linha ao mesmo tempo, em processos diferentes — e um resultado que
    // depende de quem chega primeiro não é um resultado. A 04/09 uma passagem
    // completa deu 404 no STAFF-005 e a seguinte deu verde sem eu tocar em nada;
    // não cheguei a provar a causa, e é exactamente por isso que as fixtures
    // deixam de ser partilhadas.
    const mesaDoStaff = await prisma.serviceTable.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, areaId: zona.id,
        codigo: `${PREFIXO}21 del Staff`, capacidade: 4, posX: 2, posY: 1,
      },
      select: { id: true },
    });
    const sessaoDoStaff = await prisma.tableSession.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, tableId: mesaDoStaff.id,
        estado: 'ABERTA', comensais: 2, abertaPor: 'inspeccao@exemplo.example',
        responsavelId: pertencaDoDono.id,
      },
      select: { id: true },
    });
    await prisma.tableSessionEvent.create({
      data: {
        organizationId: IDS.orgA, sessionId: sessaoDoStaff.id, accao: 'sessao.aberta',
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

    // ── Um PEDIDO (E14), para as telas com identificador terem o que medir ─
    //
    // Sem ele, a ficha do pedido, a edição, a ronda, o cancelamento, a mudança de
    // mesa e a história mediriam a página de «não encontrado» e diriam verde.
    //
    // Com uma linha ACEITE e uma REJEITADA: é o cenário que exercita o aceite 3
    // no ecrã — a rejeitada tem de aparecer, com o motivo, e o resto do carrinho
    // tem de ficar. Um pedido só com linhas boas media metade.
    const pedidoInsp = await prisma.order.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, canal: 'SALA',
        numero: `${PREFIXO}A001`, estado: 'ACEITE',
        abertoPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    const envioInsp = await prisma.orderSubmission.create({
      data: {
        organizationId: IDS.orgA, orderId: pedidoInsp.id,
        commandId: `${PREFIXO}comando-de-inspeccao`,
        payloadHash: 'insp', resposta: { aceites: 1, rejeitadas: 2 } as object,
        criadoPor: 'inspeccao@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.orderLine.createMany({
      data: [
        {
          organizationId: IDS.orgA, orderId: pedidoInsp.id, submissionId: envioInsp.id,
          nome: `${PREFIXO}Arroz de sepia y alcachofas para dos`,
          quantidade: 2, precoMenor: 2400, moeda: 'EUR', estado: 'ACEITE',
          aceiteEm: new Date(),
        },
        {
          organizationId: IDS.orgA, orderId: pedidoInsp.id, submissionId: envioInsp.id,
          nome: `${PREFIXO}Pulpo a la gallega`,
          quantidade: 1, estado: 'REJEITADA', motivoRejeicao: 'ESGOTADO',
        },
        // ── Uma linha rejeitada por PREÇO, com os dois números ──────────
        //
        // É o que o E15 tem de mostrar no ecrã do empregado: o preço que o
        // aparelho propôs — de quando o rascunho foi escrito, sem rede — e o
        // oficial, de quando o servidor aceitou. A régua do E15 é literal: «se a
        // divergência só aparecer num log, o E14 foi bem implementado e mal
        // entregue».
        //
        // Sem esta linha na semeadura, as cinco larguras mediam a tela SEM o
        // painel de divergência — verde sobre a metade fácil. A prova
        // ponta-a-ponta da divergência é outra, e está em `staff.spec.ts`: esta
        // existe para o painel ter o que desenhar em todas as larguras.
        {
          organizationId: IDS.orgA, orderId: pedidoInsp.id, submissionId: envioInsp.id,
          nome: `${PREFIXO}Tortilla de patatas con cebolla caramelizada`,
          quantidade: 1, precoMenor: 1150, moeda: 'EUR', precoPropostoMenor: 950,
          estado: 'REJEITADA', motivoRejeicao: 'PRECO_DIVERGENTE',
        },
      ],
    });
    await prisma.orderEvent.create({
      data: {
        organizationId: IDS.orgA, orderId: pedidoInsp.id, accao: 'pedido.enviado',
        actorEmail: 'inspeccao@exemplo.example',
      },
    });

    // ── Um segundo pedido, do CLIENTE — e é ele que faz o par ────────────
    //
    // O aceite 2 da régua do E15 pede «cliente e empregado ao mesmo tempo,
    // origens conservadas». Com um pedido só, a tela mostrava «Sala» em tudo e a
    // asserção passava com um ecrã que escrevesse «Sala» à mão.
    //
    // O par é o que dá sentido: dois pedidos vivos na mesma unidade, um por
    // `SALA` e outro por `CARTA`, **distinguíveis** no ecrã. E é também o
    // cenário do duplicado que não é duplicado: o mesmo prato pedido pelas duas
    // vias são dois pratos, e é a origem que o explica a quem acha que é engano.
    const pedidoDoCliente = await prisma.order.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, canal: 'CARTA',
        numero: `${PREFIXO}C001`, estado: 'ACEITE',
        abertoPor: 'cliente@exemplo.example',
      },
      select: { id: true },
    });
    await prisma.orderLine.create({
      data: {
        organizationId: IDS.orgA, orderId: pedidoDoCliente.id,
        // O MESMO prato do pedido da sala, de propósito: é o caso em que alguém
        // olha para os dois e conclui que é engano.
        nome: `${PREFIXO}Arroz de sepia y alcachofas para dos`,
        quantidade: 2, precoMenor: 2400, moeda: 'EUR', estado: 'ACEITE',
        aceiteEm: new Date(),
      },
    });

    // ── E17 · o QR da mesa e um visitante VIVO ───────────────────────────
    //
    // Sem uma sessão de visitante aberta, as sete telas da visita mediam o
    // desvio para o STATE-009 — cinco larguras verdes sobre o ecrã errado, que é
    // o falso verde que este arnês existe para impedir.
    //
    // O segredo é FIXO na semeadura, e é a única vez em que isso é aceitável:
    // a prova de navegador precisa de o poder escrever no endereço, e a base
    // continua a guardar só o resumo. Em produção nasce de `randomBytes`.
    const SEGREDO_DO_QR = 'insp-segredo-da-mesa-para-medir';
    await prisma.serviceTable.update({
      where: { id: primeiraMesa.id },
      data: {
        qrSegredoHash: createHash('sha256').update(SEGREDO_DO_QR, 'utf8').digest('hex'),
        qrGeracao: 1,
        qrRodadoEm: new Date(),
      },
    });
    // Uma sessão de visitante viva, presa à sessão de mesa aberta. O token é
    // fixo pela mesma razão: a prova põe-no na bolacha.
    const TOKEN_DO_VISITANTE = 'insp-token-do-visitante-para-medir';
    await prisma.guestSession.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        tableId: primeiraMesa.id, tableSessionId: sessaoDeMesa.id,
        tokenHash: createHash('sha256').update(TOKEN_DO_VISITANTE, 'utf8').digest('hex'),
        ultimaVezEm: new Date(),
      },
    });
    // E uma REVOGADA, para o QR-006 ter os três estados que distingue. Com uma
    // só, a tela media uma lista onde todas as linhas são iguais.
    const mesaRevogada = mesas[1];
    if (mesaRevogada) {
      const sessaoExtra = await prisma.tableSession.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2, tableId: mesaRevogada.id,
          estado: 'ABERTA', comensais: 2, abertaPor: 'inspeccao@exemplo.example',
        },
        select: { id: true },
      });
      await prisma.guestSession.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          tableId: mesaRevogada.id, tableSessionId: sessaoExtra.id,
          tokenHash: createHash('sha256').update('insp-token-revogado', 'utf8').digest('hex'),
          estado: 'REVOGADA', revogadaEm: new Date(),
          revogadaPor: 'inspeccao@exemplo.example',
          revogadaMotivo: 'una foto del QR apareció en un grupo',
        },
      });
    }

    // ── E16 · estações, roteamento e tarefas de produção ─────────────────
    //
    // Duas estações e um prato que vai às DUAS. É o caso que parte o modelo
    // ingénuo — «uma linha, uma estação» —, e sem ele as telas do KDS mediam
    // sempre o caminho fácil: um prato, uma estação, tudo bate.
    //
    // E um prato SEM regra nenhuma, porque «não encaminhado» é um estado real
    // que tem de aparecer no ecrã em cinco larguras. Sem ele, o aviso do KDS-009
    // nunca renderizava e as medições passavam sobre a metade fácil.
    const grelha = await prisma.productionStation.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Cocina caliente`, tipo: 'PREPARACAO', ordem: 1,
        // Baixo de propósito: com três, os cinco bilhetes semeados excedem-no e
        // o KDS-010 tem mesmo o que mostrar. Um limite de doze fazia o «em
        // espera» ficar sempre vazio, e a tela media um ecrã que nunca acontece.
        limiteVisivel: 3,
      },
      select: { id: true },
    });
    const expo = await prisma.productionStation.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Pase`, tipo: 'EXPO', ordem: 2, limiteVisivel: 12,
      },
      select: { id: true },
    });
    const fritadeira = await prisma.productionStation.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Freidora`, tipo: 'PREPARACAO', ordem: 3, limiteVisivel: 12,
      },
      select: { id: true },
    });

    const pratosDaCarta = await prisma.product.findMany({
      where: { organizationId: IDS.orgA, nome: { startsWith: PREFIXO } },
      orderBy: { nome: 'asc' }, select: { id: true, nome: true },
    });
    const comDuasEstacoes = pratosDaCarta[0];
    const soNaGrelha = pratosDaCarta[1];
    if (!comDuasEstacoes || !soNaGrelha) {
      throw new Error('a semeadura do E16 precisa de pelo menos dois pratos na carta');
    }
    // O primeiro vai às DUAS. O segundo só à grelha. O terceiro (se houver) fica
    // SEM regra — e é ele que aparece como não encaminhado.
    for (const stationId of [grelha.id, fritadeira.id]) {
      await prisma.routingRule.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          stationId, productId: comDuasEstacoes.id,
        },
      });
    }
    await prisma.routingRule.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        stationId: grelha.id, productId: soNaGrelha.id,
      },
    });

    // As tarefas do pedido semeado, e mais algumas para o backlog exceder o
    // limite visível de três. Criadas à mão e não pelo motor: a semeadura não
    // passa pelo `enviarPedido`, e o que interessa medir nas telas é o que
    // existe, não como lá chegou — isso tem prova própria.
    const linhasDoPedido = await prisma.orderLine.findMany({
      where: { orderId: pedidoInsp.id }, select: { id: true }, orderBy: { createdAt: 'asc' },
    });
    const primeiraLinha = linhasDoPedido[0];
    if (!primeiraLinha) throw new Error('o pedido semeado ficou sem linhas');

    for (const [i, stationId] of [grelha.id, fritadeira.id].entries()) {
      await prisma.productionTask.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          orderId: pedidoInsp.id, lineId: primeiraLinha.id, stationId,
          // Uma PRONTA e uma por começar: é o «pronto parcial» do KDS-012, e sem
          // ele a contagem `1/2` nunca aparecia no ecrã para ser medida.
          estado: i === 0 ? 'PRONTA' : 'POR_INICIAR',
          ...(i === 0 ? { prontaEm: new Date(), iniciadaEm: new Date() } : {}),
        },
      });
    }
    // Uma tarefa SEM estação: o não encaminhado, visível no KDS-009.
    await prisma.productionTask.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        orderId: pedidoInsp.id, lineId: linhasDoPedido[1]?.id ?? primeiraLinha.id,
        estado: 'POR_INICIAR',
      },
    });
    // E quatro na grelha, para os cinco excederem o limite de três.
    for (let i = 0; i < 4; i += 1) {
      const pedidoExtra = await prisma.order.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2, canal: 'SALA',
          numero: `${PREFIXO}K${String(i).padStart(3, '0')}`, estado: 'ACEITE',
          abertoPor: 'inspeccao@exemplo.example',
        },
        select: { id: true },
      });
      const linhaExtra = await prisma.orderLine.create({
        data: {
          organizationId: IDS.orgA, orderId: pedidoExtra.id,
          nome: `${PREFIXO}Plato de cocina ${i + 1}`, quantidade: 1,
          precoMenor: 900, moeda: 'EUR', estado: 'ACEITE', aceiteEm: new Date(),
        },
        select: { id: true },
      });
      await prisma.productionTask.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          orderId: pedidoExtra.id, lineId: linhaExtra.id, stationId: grelha.id,
          estado: 'POR_INICIAR',
        },
      });
    }
    void expo;

    // ── E20 · takeaway e entrega, com dados para as telas medirem ─────────
    //
    // «Verde sobre fila de retirada vazia» é o que a régua reprova à cabeça. Sem
    // estas linhas, as sete telas mediam «não há pedidos», «nenhuma zona» e
    // «nenhum produto mapeado» — ecrãs reais, e os ecrãs FÁCEIS.
    //
    // Um pedido JÁ na cozinha e outro que AINDA não entrou: são os dois estados
    // que a fila separa, e sem os dois a separação não se vê.
    await prisma.deliveryArea.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Puerto`, codigoPostal: '12594', taxaMenor: 250, moeda: 'EUR',
      },
    });
    const produtoParaMapear = await prisma.product.findFirst({
      where: { nome: { startsWith: PREFIXO } }, select: { id: true },
    });
    if (produtoParaMapear) {
      await prisma.externalCatalogMapping.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          canalExterno: 'parceiro', idExterno: 'burger-4', productId: produtoParaMapear.id,
        },
      });
    }
    for (const [i, minutos] of [-30, 180].entries()) {
      const entregarAs = new Date(Date.now() + minutos * 60 * 1000);
      await prisma.order.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          canal: i === 0 ? 'TAKEAWAY' : 'DELIVERY',
          numero: `${PREFIXO}L${i}`, estado: 'ACEITE',
          abertoPor: 'painel@inspeccao.example',
          entregarAs, preparoMin: 25,
        },
      });
    }
    // E um de takeaway que ainda não entrou na cozinha, para a lista «por entrar»
    // ter o que mostrar.
    await prisma.order.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        canal: 'TAKEAWAY', numero: `${PREFIXO}L2`, estado: 'ACEITE',
        abertoPor: 'painel@inspeccao.example',
        entregarAs: new Date(Date.now() + 180 * 60 * 1000), preparoMin: 25,
      },
    });

    // ── E22 · uma conta, uma caixa, e nenhuma vazia ──────────────────────
    //
    // Uma lista vazia mede o estado «ainda não abriu», que é um ecrã real mas é
    // o ecrã FÁCIL: cabe em qualquer largura, não tem contraste para medir e não
    // tem alvos de toque. Cinco larguras verdes sobre três frases é verde sobre
    // nada — a mesma razão do E18.
    //
    // A conta leva um DESCONTO com motivo, para a tela do POS-004 ter o par que
    // interessa: o total já abatido E a linha que diz porquê. Sem o ajuste, a
    // prova de que «o que se tirou vê-se» media um ecrã onde não se tirou nada.
    const contaDaProva = await prisma.bill.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        numero: `${PREFIXO}C1`, moeda: 'EUR',
      },
    });
    await prisma.billLine.createMany({
      data: [
        { organizationId: IDS.orgA, billId: contaDaProva.id,
          nome: `${PREFIXO}Arroz de sepia`, quantidade: 2, unitarioMenor: 1890 },
        { organizationId: IDS.orgA, billId: contaDaProva.id,
          nome: `${PREFIXO}Agua con gas`, quantidade: 3, unitarioMenor: 250 },
      ],
    });
    await prisma.billAdjustment.create({
      data: {
        organizationId: IDS.orgA, billId: contaDaProva.id, tipo: 'DESCONTO',
        base: 'CONTA', montanteMenor: 500, motivo: 'cliente habitual',
        autorizadoPor: IDS.utilizadorA,
      },
    });

    // Uma caixa ABERTA com movimentos dos dois lados: sem uma saída, a subtracção
    // do esperado nunca era exercida e a tela passava com uma soma.
    const caixaDaProva = await prisma.cashRegister.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        nome: `${PREFIXO}Caja 1`, moeda: 'EUR', fundoMenor: 15000,
      },
    });
    await prisma.cashRegisterEvent.create({
      data: {
        organizationId: IDS.orgA, registerId: caixaDaProva.id,
        tipo: 'ABERTURA', actor: IDS.utilizadorA,
      },
    });
    await prisma.cashMovement.createMany({
      data: [
        { organizationId: IDS.orgA, registerId: caixaDaProva.id, tipo: 'ENTRADA',
          montanteMenor: 4300, motivo: 'venta de barra', actor: IDS.utilizadorA },
        { organizationId: IDS.orgA, registerId: caixaDaProva.id, tipo: 'SAIDA',
          montanteMenor: 1200, motivo: 'compra de hielo', actor: IDS.utilizadorA },
      ],
    });

    // ── E23 · um pagamento capturado, com gorjeta, e um acontecimento ────
    //
    // «Verde sobre zero pagamentos» é reprovação à cabeça. Sem um pagamento
    // confirmado não há comprovativo para medir, e a MENU-016 mediria o ecrã de
    // «não encontramos» — que é o ecrã fácil.
    //
    // A gorjeta vai a zero de propósito num e diferente de zero noutro? Não:
    // vai diferente de zero, porque é isso que distingue «a gorjeta aparece» de
    // «a gorjeta é sempre zero e ninguém nota».
    const tentativaDaProva = await prisma.paymentAttempt.create({
      data: {
        organizationId: IDS.orgA, billId: contaDaProva.id, meio: 'CARTAO',
        montanteMenor: 4780, chaveIdempotente: `${PREFIXO}pago`, estado: 'CONFIRMADA',
        resolvidaEm: new Date(),
      },
    });
    const pagamentoDaProva = await prisma.payment.create({
      data: {
        organizationId: IDS.orgA, billId: contaDaProva.id,
        attemptId: tentativaDaProva.id, meio: 'CARTAO', montanteMenor: 4780,
        gorjetaMenor: 300, provedor: 'sandbox',
        provedorRef: `sandbox:${tentativaDaProva.id}`,
      },
    });
    await prisma.providerEvent.create({
      data: {
        organizationId: IDS.orgA, provedor: 'sandbox',
        eventoId: `${PREFIXO}captura`, tipo: 'captura',
        billId: contaDaProva.id, attemptId: tentativaDaProva.id,
        estadoProvedor: 'CAPTURADO', montanteMenor: 4780, ocorridoEm: new Date(),
      },
    });
    await prisma.paymentConnector.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        provedor: null, merchantId: null, activo: false,
      },
    });
    console.log(`semeado: recibo público ${pagamentoDaProva.reciboPublico}`);

    // ── E24 · um documento ACEITE e um REJEITADO ─────────────────────────
    //
    // «Verde sobre zero documentos» é reprovação à cabeça. E não chega um: sem o
    // aceite, a tela media só «nada é documento fiscal»; sem o rejeitado, o
    // motivo da rejeição nunca apareceria e ninguém notava que não se mostra.
    const docAceite = await prisma.fiscalDocument.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2, billId: contaDaProva.id,
        acontecimento: `${PREFIXO}doc-aceite`, estado: 'ACEITE',
        numeroProvedor: 'FAC-INSP-0001', provedor: 'homologado-de-inspeccao',
        respondidoEm: new Date(),
      },
    });
    await prisma.fiscalDocument.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        acontecimento: `${PREFIXO}doc-rejeitado`, estado: 'REJEITADO',
        motivoRejeicao: 'NIF del cliente inválido', anteriorId: docAceite.id,
        respondidoEm: new Date(),
      },
    });
    await prisma.fiscalConnector.create({
      data: {
        organizationId: IDS.orgA, locationId: IDS.unidadeA2,
        provedor: null, ambiente: 'SANDBOX', nif: null, activo: false,
      },
    });

    // ── E18 · reservas: uma linha em cada lista, e nenhuma vazia ──────────
    //
    // As seis telas desta etapa são listas. Uma lista vazia mede o estado
    // «ainda não configurou», que é um ecrã real mas é o ecrã FÁCIL: cabe em
    // qualquer largura, não tem contraste para medir e não tem alvos de toque.
    // Cinco larguras verdes sobre três frases é verde sobre nada.
    //
    // Por isso semeia-se **uma linha de cada tipo** — um turno, um tecto de
    // zona, um bloqueio — e as definições ficam LIGADAS, senão o SET-007 mostrava
    // sempre o mesmo estado e o par ligado/desligado nunca se via.
    // Uma costura: a prova de navegador desliga isto para verificar que a sua
    // própria guarda de população acende. Sem a costura, o defeito teria de ser
    // plantado na base — e a passagem semeia antes de medir, por isso repunha-o.
    const SEMEAR_RESERVAS = true;
    if (SEMEAR_RESERVAS) {
      await prisma.reservationSettings.upsert({
        where: { locationId: IDS.unidadeA2 },
        update: { activo: true },
        create: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          activo: true, duracaoPadraoMin: 90, bufferMin: 15,
        },
      });
      const turnoInsp = await prisma.serviceWindow.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          nome: `${PREFIXO}Cena de sábado`, diaDaSemana: 6,
          // Acaba ANTES de começar: é o serviço que atravessa a meia-noite, e sem
          // ele a tela media só turnos que cabem dentro do dia.
          horaInicio: '20:30', horaFim: '00:30',
        },
        select: { id: true },
      });
      await prisma.capacityRule.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          areaId: zona.id, windowId: turnoInsp.id, maxComensais: 40,
        },
      });
      // Um tecto da UNIDADE inteira, sem zona: a tela tem de saber dizer «toda a
      // unidade» em vez de mostrar uma célula vazia.
      await prisma.capacityRule.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2, maxComensais: 90,
        },
      });
      await prisma.reservationBlock.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          areaId: zona.id,
          inicio: new Date('2027-01-06T10:00:00Z'), fim: new Date('2027-01-07T02:00:00Z'),
          motivo: `${PREFIXO}Cena privada de empresa`,
        },
      });

      // ── E19 · uma espera VIVA e uma reserva pública com link de gestão ──
      //
      // As telas RES-C-007 e RES-C-010 medem um estado que só existe com dados:
      // sem eles mediriam «não encontramos esta reserva» e «não temos mesa para
      // o teu grupo», que são ecrãs reais mas são os ecrãs FÁCEIS.
      await prisma.waitlistEntry.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          nome: `${PREFIXO}Familia que espera`, contacto: 'espera@inspeccao.example',
          pessoas: 2,
        },
      });
      // O segredo é FIXO na semeadura para a prova o poder pôr no endereço. Em
      // produção nasce de `randomBytes`; aqui tem de ser previsível, e é só aqui.
      await prisma.reservation.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          pessoas: 2, origem: 'PUBLICO',
          inicio: new Date('2027-06-12T20:00:00Z'), fim: new Date('2027-06-12T21:30:00Z'),
          nome: `${PREFIXO}Reserva de la calle`, contacto: 'calle@inspeccao.example',
          chaveIdempotente: `${PREFIXO}reserva-publica`,
          criadaPor: 'painel@inspeccao.example',
          gestaoTokenHash: createHash('sha256')
            .update('insp-segredo-de-gestao-para-medir', 'utf8').digest('hex'),
          gestaoExpiraEm: new Date('2027-06-13T20:00:00Z'),
        },
      });

      // ── Uma reserva de HOJE, com mesa, para o host ter o que ver ────────
      //
      // A agenda, a linha do tempo e o mapa são todos de hoje. Com a reserva de
      // 2027 apenas, as onze telas do host mediam «hoje não há reservas» — que é
      // um ecrã real e é o ecrã fácil.
      //
      // A hora é daqui a uma hora: tem de estar no futuro para o mapa a anunciar
      // como «a chegar», e é isso que o FLOOR-006 revisitado mede.
      const daquiAUmaHora = new Date(Date.now() + 60 * 60 * 1000);
      const reservaDeHoje = await prisma.reservation.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          pessoas: 2, origem: 'HOST',
          inicio: daquiAUmaHora,
          fim: new Date(daquiAUmaHora.getTime() + 90 * 60 * 1000),
          nome: `${PREFIXO}Familia de hoy`, contacto: 'hoy@inspeccao.example',
          chaveIdempotente: `${PREFIXO}reserva-de-hoje`,
          criadaPor: 'painel@inspeccao.example',
        },
        select: { id: true },
      });
      // ── A mesa tem de estar LIVRE, e é esse o ponto ────────────────────
      //
      // Escolhi primeiro a primeira por código, e calhou a `insp-07`, que já tem
      // sessão aberta do E17. O mapa não a anunciava — e com razão: uma mesa
      // ocupada não é uma mesa livre com reserva à vista.
      //
      // O caso inteiro é sobre uma mesa que está MESMO livre e que o host
      // sentaria a um walk-in se ninguém lhe dissesse o que aí vem.
      const mesaParaAReserva = await prisma.serviceTable.findFirst({
        where: {
          locationId: IDS.unidadeA2, codigo: { startsWith: PREFIXO },
          sessoes: { none: { estado: { not: 'FECHADA' } } },
        },
        orderBy: { codigo: 'asc' }, select: { id: true },
      });
      if (!mesaParaAReserva) {
        throw new Error('a semeadura do E19 precisa de uma mesa livre para a reserva a chegar');
      }
      // ── E19 · uma mensagem com tentativas, e um texto escrito ──────────
      //
      // O RES-B-018 sem mensagens mede «ainda não há mensagens», e o RES-B-017
      // sem textos mede «ainda não há textos escritos». São ecrãs reais e são os
      // ecrãs fáceis.
      //
      // O conector fica DESLIGADO de propósito: é o estado por omissão do
      // produto, e é o que as telas têm de saber dizer.
      await prisma.messageTemplate.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          tipo: 'confirmacao', idioma: 'es-ES',
          assunto: `${PREFIXO}Mesa reservada`, corpo: 'Te esperamos en Marina Puerto.',
        },
      });
      const mensagemInsp = await prisma.reservationMessage.create({
        data: {
          organizationId: IDS.orgA, locationId: IDS.unidadeA2,
          reservationId: reservaDeHoje.id, tipo: 'confirmacao', idioma: 'es-ES',
          // A identidade é a do ACONTECIMENTO que a causou. Aqui é semeadura, e
          // por isso cunha-se uma: não há facto anterior a que a ligar.
          eventoId: randomUUID(),
          estado: 'PENDENTE', erro: 'sem provedor configurado',
          assunto: `${PREFIXO}Mesa reservada`, corpo: 'Te esperamos en Marina Puerto.',
        },
        select: { id: true },
      });
      await prisma.reservationMessageAttempt.create({
        data: {
          organizationId: IDS.orgA, messageId: mensagemInsp.id,
          resultado: 'SEM_PROVEDOR', erro: 'o conector de mensageria está desligado',
        },
      });

      if (mesaParaAReserva) {
        await prisma.reservationAllocation.create({
          data: {
            organizationId: IDS.orgA, locationId: IDS.unidadeA2,
            reservationId: reservaDeHoje.id, tableId: mesaParaAReserva.id,
            inicio: daquiAUmaHora,
            fim: new Date(daquiAUmaHora.getTime() + 105 * 60 * 1000),
          },
        });
      }
    }

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
