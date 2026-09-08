import {
  DEMO, NOME_DA_DEMO, QUEM_ATENDE, SLUG_DA_DEMO,
  abrirPrisma, limparDemonstracao, restosDaDemonstracao, semearContaDeCaptura,
} from './demonstracao-comum.ts';

/**
 * O inquilino de DEMONSTRAÇÃO — o cenário que as capturas comerciais fotografam.
 *
 * Corre com a credencial de MIGRAÇÃO: criar um inquilino do zero atravessa a
 * fronteira entre organizações por definição, e é o único sítio onde isso é
 * correcto.
 *
 * **Idempotente.** Começa por limpar o que semeou da última vez, e todos os
 * identificadores são fixos. Duas corridas seguidas dão o mesmo cenário — que é
 * o que «determinístico» quer dizer no §6.4, e o que
 * `scripts/provar-demonstracao.sh` verifica comparando a impressão das duas.
 *
 * ── O caminho feliz, e é por desenho ──────────────────────────────────────
 *
 * Nada aqui está partido de propósito. O cenário do arnês tem uma linha
 * rejeitada por esgotado, outra por divergência de preço e um prato sem
 * encaminhamento, porque a régua precisa desses casos. Numa fotografia do
 * produto, cada um deles lê-se como um produto avariado.
 *
 * ── A armadilha que me custou uma corrida, escrita onde se lê ─────────────
 *
 * A atribuição de papel do dono vai **sem `brand_id`**. Com marca, o dono fica
 * limitado àquela marca e o painel devolve 404 nas rotas da organização — um
 * 404 que se parece com «a rota não existe» e é «esta pessoa não alcança isto».
 */
async function principal(): Promise<void> {
  const prisma = abrirPrisma();
  try {
    await limparDemonstracao(prisma);

    // ── O inquilino ──────────────────────────────────────────────────────
    // Por SQL, como as fixtures: são tabelas de topo e a credencial de migração
    // é a única que lhes toca.
    await prisma.$executeRawUnsafe(`
      INSERT INTO organizations (id, slug, nome, updated_at)
        VALUES ('${DEMO.org}', '${SLUG_DA_DEMO}', '${NOME_DA_DEMO}', now());
      INSERT INTO brands (id, organization_id, nome, slug, updated_at)
        VALUES ('${DEMO.marca}', '${DEMO.org}', '${NOME_DA_DEMO}', '${SLUG_DA_DEMO}', now());
      INSERT INTO locations (id, organization_id, brand_id, nome, slug, moeda, fuso, updated_at)
        VALUES ('${DEMO.unidade}', '${DEMO.org}', '${DEMO.marca}',
                'Sala principal', 'sala', 'EUR', 'Europe/Madrid', now());
      -- A pessoa que a SALA mostra como responsável da mesa. Não é a conta com
      -- que as capturas entram: essa regista-se pela porta do produto, porque
      -- uma sessão forjada não é uma sessão. O domínio .invalid é reservado
      -- pela RFC 2606 — não resolve, não é de ninguém, e não é example.
      INSERT INTO users (id, email, nome, updated_at)
        VALUES ('${DEMO.utilizador}', 'sala@bossaos.invalid', 'Marta', now());
      INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
        VALUES ('${DEMO.pertenca}', '${DEMO.org}', '${DEMO.utilizador}', 'ACTIVO', now());
    `);
    // Sem `brand_id`: ver o comentário do topo. Separado do bloco acima porque
    // um erro aqui tem de apontar para esta linha e não para cinco.
    await prisma.$executeRawUnsafe(`
      INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
        VALUES (gen_random_uuid(), '${DEMO.org}', '${DEMO.pertenca}', 'OWNER', now())`);

    // Plano PRO: é o único que concede tudo o que as capturas mostram — sala,
    // KDS e caixa. Com o Starter, metade das telas fotografadas seria a recusa
    // por plano, que é honesta e não é o que se está a demonstrar.
    await prisma.$executeRawUnsafe(`
      INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
      SELECT gen_random_uuid(), '${DEMO.org}', p.id, 'ACTIVA', now()
        FROM plan_definitions p WHERE p.codigo = 'PRO'`);
    const assinado = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM subscriptions WHERE organization_id = '${DEMO.org}'`);
    if (Number(assinado[0]?.n ?? 0) !== 1) {
      throw new Error('a demonstração ficou sem plano — o catálogo PRO está semeado?');
    }

    // ── O catálogo ───────────────────────────────────────────────────────
    // Pratos com nome comprido de propósito: uma carta de demonstração com
    // «Café» em todas as linhas fotografa-se bem a qualquer largura e não se
    // parece com uma carta a sério.
    await prisma.category.create({
      data: {
        id: DEMO.categoria, organizationId: DEMO.org, brandId: DEMO.marca,
        nome: 'Para compartir', ordem: 1,
      },
    });

    const PRATOS = [
      ['Croquetas caseras de jamón ibérico con bechamel especiada', 850,
        'Doce unidades, fritas al momento y servidas con alioli suave.'],
      ['Pulpo a la gallega sobre parmentier de patata y pimentón de la Vera', 1890,
        'Cocido a fuego lento y terminado con aceite de oliva virgen extra.'],
      ['Tortilla de patatas con cebolla caramelizada', 1150,
        'Jugosa por dentro, cuajada al punto. Se sirve en porciones para compartir.'],
      ['Arroz de sepia y alcachofas para dos', 2400,
        'Treinta minutos de espera desde que se pide. Mínimo dos personas.'],
      ['Ensalada de tomate de temporada con ventresca', 1450,
        'Tomate de la huerta, cebolleta y ventresca de bonito en aceite.'],
      ['Café solo', 150, 'De tueste natural, molido en el momento.'],
    ] as const;

    const alergenios = await prisma.allergen.findMany({ select: { id: true, codigo: true } });
    const gluten = alergenios.find((a) => a.codigo === 'gluten');

    const criados: { id: string; nome: string }[] = [];
    for (const [nome, preco, descricao] of PRATOS) {
      const p = await prisma.product.create({
        data: {
          organizationId: DEMO.org, brandId: DEMO.marca, categoryId: DEMO.categoria,
          nome, descricao, estado: 'ACTIVO',
        },
        select: { id: true, nome: true },
      });
      criados.push(p);
      await prisma.priceRule.create({
        data: { organizationId: DEMO.org, productId: p.id, montanteMenor: preco, moeda: 'EUR' },
      });
      await prisma.productChannel.create({
        data: { organizationId: DEMO.org, productId: p.id, canal: 'CARTA', visivel: true },
      });
      // O glúten DECLARADO nos que o levam. Não é enfeite: o produto mostra
      // «desconhecido» a quem ninguém declarou, e uma carta de demonstração toda
      // desconhecida fotografa a promessa ao contrário.
      if (gluten && preco !== 150) {
        await prisma.productAllergen.create({
          data: {
            organizationId: DEMO.org, productId: p.id, allergenId: gluten.id,
            estado: 'CONTEM', revistoPor: QUEM_ATENDE, revistoEm: new Date(),
          },
        });
      }
    }

    // ── A carta publicada, e o endereço público ──────────────────────────
    await prisma.menu.create({
      data: {
        id: DEMO.menu, organizationId: DEMO.org, brandId: DEMO.marca,
        locationId: DEMO.unidade, nome: 'Carta', estado: 'ACTIVO',
      },
    });
    await prisma.menuCategory.create({
      data: {
        organizationId: DEMO.org, menuId: DEMO.menu, categoryId: DEMO.categoria, ordem: 1,
      },
    });

    const itens = await prisma.product.findMany({
      where: { organizationId: DEMO.org },
      select: {
        id: true, nome: true, descricao: true,
        precos: { select: { montanteMenor: true, moeda: true }, take: 1 },
        alergenios: { select: { estado: true, allergen: { select: { codigo: true } } } },
      },
      orderBy: { nome: 'asc' },
    });
    const conteudo = itens.map((p) => ({
      productId: p.id, nome: p.nome, descricao: p.descricao,
      precoMenor: p.precos[0]?.montanteMenor ?? null, moeda: p.precos[0]?.moeda ?? null,
      categoryId: DEMO.categoria, categoriaNome: 'Para compartir',
      alergenosPorDeclarar: alergenios.length - 1,
      alergenos: alergenios.map((a) => ({
        codigo: a.codigo,
        estado: p.alergenios.find((d) => d.allergen.codigo === a.codigo)?.estado ?? 'DESCONHECIDO',
      })),
      variantes: [], media: [], preferencias: [],
    }));

    const revisao = await prisma.menuRevision.create({
      data: {
        organizationId: DEMO.org, menuId: DEMO.menu, numero: 1,
        conteudo: conteudo as unknown as object, criadaPor: QUEM_ATENDE,
      },
      select: { id: true },
    });
    await prisma.menuPublication.create({
      data: {
        organizationId: DEMO.org, menuId: DEMO.menu, canal: 'CARTA',
        revisionId: revisao.id, publicadaPor: QUEM_ATENDE,
      },
    });

    // Pela porta que decide, a mesma do produto — não por `UPDATE` directo.
    const r = await prisma.$queryRawUnsafe<{ reservar_endereco_publico: string }[]>(
      `SELECT reservar_endereco_publico('${DEMO.org}'::uuid, '${DEMO.unidade}'::uuid, '${SLUG_DA_DEMO}')`);
    if (r[0]?.reservar_endereco_publico !== 'ok') {
      throw new Error(`a demonstração não reservou o endereço: ${r[0]?.reservar_endereco_publico}`);
    }

    // ── O horário ────────────────────────────────────────────────────────
    //
    // Sem isto a carta pública mostra «Horario sin configurar», e o capturador
    // reprova a composição — bem. Um restaurante de demonstração sem horário
    // fotografa um ecrã de conta por acabar, não um produto a funcionar.
    //
    // ── Aberto sempre, e a razão é DETERMINISMO, não preguiça ───────────
    //
    // A primeira versão semeou uma semana plausível: almoço das 13 às 16, jantar
    // das 20 às 23h30, segunda de descanso. A captura seguinte saiu com
    // «Cerrado ahora» e um aviso a ocupar o terço de cima — porque correu às
    // cinco da manhã.
    //
    // Isso é o defeito, e não o horário: **o §6.4 exige capturas
    // determinísticas**, e uma composição cujo conteúdo depende da hora a que o
    // guião correu não é determinística. Duas corridas dariam duas landings.
    //
    // O que isto custa, dito por extenso: nenhum restaurante abre as vinte e
    // quatro horas, e quem for ver os dados da demonstração vê um horário que
    // não é plausível. Aceito essa troca porque o horário **não aparece na
    // composição** — o que aparece é a carta — e porque a alternativa é uma
    // captura que muda sozinha conforme a hora do dia.
    for (const dia of [1, 2, 3, 4, 5, 6, 7]) {
      const d = await prisma.scheduleDay.create({
        data: { organizationId: DEMO.org, locationId: DEMO.unidade, dia, fechado: false },
        select: { id: true },
      });
      await prisma.scheduleInterval.create({
        data: { organizationId: DEMO.org, diaId: d.id, inicioMin: 0, fimMin: 24 * 60 },
      });
    }

    // ── A sala ───────────────────────────────────────────────────────────
    await prisma.serviceArea.create({
      data: {
        id: DEMO.zona, organizationId: DEMO.org, locationId: DEMO.unidade,
        nome: 'Terraza', tipo: 'TERRACO', ordem: 1,
      },
    });
    const MESAS = [
      ['07', 4], ['08 junto a la ventana', 2], ['Barra alta 12', 6], ['21', 4],
    ] as const;
    const mesas: { id: string }[] = [];
    for (const [codigo, capacidade] of MESAS) {
      mesas.push(await prisma.serviceTable.create({
        data: {
          organizationId: DEMO.org, locationId: DEMO.unidade, areaId: DEMO.zona,
          codigo, capacidade,
        },
        select: { id: true },
      }));
    }
    const mesaAberta = mesas[0];
    if (!mesaAberta) throw new Error('a demonstração da sala não criou mesas');

    await prisma.tableSession.create({
      data: {
        id: DEMO.sessao, organizationId: DEMO.org, locationId: DEMO.unidade,
        tableId: mesaAberta.id, estado: 'ABERTA', comensais: 3,
        abertaPor: QUEM_ATENDE, responsavelId: DEMO.pertenca,
      },
    });
    await prisma.tableSessionEvent.create({
      data: {
        organizationId: DEMO.org, sessionId: DEMO.sessao,
        accao: 'sessao.aberta', actorEmail: QUEM_ATENDE,
      },
    });

    // ── Um pedido, com as linhas TODAS aceites ───────────────────────────
    await prisma.order.create({
      data: {
        id: DEMO.pedido, organizationId: DEMO.org, locationId: DEMO.unidade,
        canal: 'SALA', numero: 'A128', estado: 'ACEITE', abertoPor: QUEM_ATENDE,
      },
    });
    await prisma.orderSubmission.create({
      data: {
        id: DEMO.envio, organizationId: DEMO.org, orderId: DEMO.pedido,
        commandId: 'demo-comando-1', payloadHash: 'demo',
        resposta: { aceites: 3, rejeitadas: 0 } as object, criadoPor: QUEM_ATENDE,
      },
    });
    const paraOPedido = criados.slice(0, 3);
    await prisma.orderLine.createMany({
      data: paraOPedido.map((p, i) => ({
        organizationId: DEMO.org, orderId: DEMO.pedido, submissionId: DEMO.envio,
        nome: p.nome, quantidade: i === 0 ? 2 : 1,
        precoMenor: PRATOS[i]?.[1] ?? 0, moeda: 'EUR',
        estado: 'ACEITE' as const, aceiteEm: new Date(),
      })),
    });

    // ── A cozinha (o KDS) ────────────────────────────────────────────────
    // O §6.4 nomeia o KDS, e é a superfície com menos folga: um quadro vazio
    // não demonstra nada. Duas estações e um limite visível FOLGADO — o do
    // arnês é baixo de propósito para o «em espera» encher, e isso numa
    // captura lê-se como uma cozinha em apuros.
    await prisma.productionStation.create({
      data: {
        id: DEMO.estacaoQuente, organizationId: DEMO.org, locationId: DEMO.unidade,
        nome: 'Cocina caliente', tipo: 'PREPARACAO', ordem: 1, limiteVisivel: 12,
      },
    });
    await prisma.productionStation.create({
      data: {
        id: DEMO.estacaoPasse, organizationId: DEMO.org, locationId: DEMO.unidade,
        nome: 'Pase', tipo: 'EXPO', ordem: 2, limiteVisivel: 12,
      },
    });
    for (const p of paraOPedido) {
      await prisma.routingRule.create({
        data: {
          organizationId: DEMO.org, locationId: DEMO.unidade,
          stationId: DEMO.estacaoQuente, productId: p.id,
        },
      });
    }

    const linhas = await prisma.orderLine.findMany({
      where: { orderId: DEMO.pedido }, select: { id: true }, orderBy: { createdAt: 'asc' },
    });
    // Uma em curso e duas por começar: um quadro que mostra trabalho a andar.
    // Nenhuma pronta e nenhuma sem estação — os dois estados que numa captura
    // se leem como produto avariado.
    for (const [i, linha] of linhas.entries()) {
      await prisma.productionTask.create({
        data: {
          organizationId: DEMO.org, locationId: DEMO.unidade,
          orderId: DEMO.pedido, lineId: linha.id, stationId: DEMO.estacaoQuente,
          estado: i === 0 ? 'EM_PREPARO' : 'POR_INICIAR',
          ...(i === 0 ? { iniciadaEm: new Date() } : {}),
        },
      });
    }

    const ficaram = await restosDaDemonstracao(prisma);
    process.stdout.write(
      `demonstração semeada: ${NOME_DA_DEMO} em /r/${SLUG_DA_DEMO}, `
      + `${PRATOS.length} pratos, ${MESAS.length} mesas, ${linhas.length} tarefas `
      + `(${ficaram} linhas no inquilino)\n`,
    );
  } finally {
    await prisma.$disconnect();
  }

  // A conta por onde as capturas entram. Fica DEPOIS do cenário e fora do
  // `finally` do Prisma: se a semeadura do inquilino falhar, não há sala para
  // fotografar e criar a conta seria deixar uma linha órfã na base.
  await semearContaDeCaptura();
  process.stdout.write('conta de captura pronta (criada na semeadura, sem registo)\n');
}

await principal();
