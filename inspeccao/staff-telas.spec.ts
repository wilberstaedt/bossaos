import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';
import { SECCOES_DO_STAFF } from '../apps/web/src/staff/NavegacaoDoStaff.tsx';

/**
 * As 23 telas do E15, medidas no navegador.
 *
 * ── «23 telas sem navegador» é o que a régua reprova à cabeça ────────────
 *
 * *«Cinco larguras, alvos de toque a 44 px, ES/PT/EN. Esta etapa é de telemóvel;
 * medir só a 1280 px é não medir.»* E a lição do E10 é mais forte do que a
 * régua: a prova de navegador encontrou lá cinco defeitos que build verde, tipos
 * verdes e guardas verdes não viam — todos de desenho, nenhum com erro em lado
 * nenhum.
 *
 * ── Cada visita AFIRMA que chegou onde queria ────────────────────────────
 *
 * Um marcador por tela, com o ID do atlas no DOM. Sem ele, uma rota que
 * redireccionasse para a entrada mediria a entrada cinco vezes e diria verde nas
 * cinco — que é o falso verde que o arnês do E10 apanhou e passou a impedir.
 *
 * ── E o Staff usa alvos de OPERAÇÃO, não alvos públicos ──────────────────
 *
 * 48 px e não 44: usa-se em pé, com uma mão, com o restaurante cheio. O número
 * está no CSS (`--bo-toque-operacao`) e a medição usa o mesmo, para não haver
 * duas réguas a discordarem um dia.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

/**
 * Duas réguas, e a diferença é de superfície e não de conveniência.
 *
 * A régua do E15 pede **44 px**, e é o mínimo em todo o produto. O Staff é mais
 * apertado por desenho — 48 px, o `--bo-toque-operacao` do CSS — porque se usa
 * de pé, com uma mão, com o restaurante cheio.
 *
 * O SET-008 **não é uma tela do Staff**: vive no painel, que é onde se
 * configura, sentado. Medi-lo a 48 acusava a barra de navegação do painel
 * inteiro — que tem 44 px de propósito e é assim em todas as outras provas deste
 * arnês. Baixar a régua do Staff para 44 por causa dele seria o inverso, e pior.
 *
 * O que **não** se faz é medir os dois com o número mais baixo e chamar-lhe
 * verde.
 */
const TOQUE_DE_OPERACAO = 48;
const TOQUE_DO_PAINEL = 44;

interface Tela {
  id: string;
  /** Caminho a partir de `/<idioma>/staff/<unidade>`, salvo se `absoluto`. */
  caminho: string;
  /**
   * A partir de `/<idioma>`, e não de dentro da unidade.
   *
   * ── É um campo e não «começa por `/`», e isso custou uma corrida ────────
   *
   * A primeira versão decidia pela forma do texto: caminho com barra à frente
   * era absoluto. Mas `/zonas` também começa por barra, e as telas do Staff
   * ficaram todas a ser pedidas em `/es-ES/zonas` — 404 em cinco larguras.
   *
   * É a lição das guardas outra vez, do lado de cá: quem casa um ESTILO de
   * escrita em vez de uma propriedade acerta por acaso até ao dia em que a
   * escrita muda. A propriedade aqui é «esta tela vive fora da unidade», e agora
   * está dita.
   */
  absoluto?: true;
  /** O que tem de estar visível para a visita contar. */
  marcador: string;
  /** O alvo de toque mínimo. Omitido é o do Staff, 48 px. */
  toque?: number;
}

/** O endereço completo de uma tela, para um idioma. */
function endereco(tela: Tela, idioma: string, a: Alvos): string {
  return tela.absoluto
    ? `/${idioma}${tela.caminho}`
    : `/${idioma}/staff/${a.unidadeDoStaff}${tela.caminho}`;
}

function telas(a: Alvos): Tela[] {
  return [
    { id: 'STAFF-001', caminho: '', marcador: '[data-tela="STAFF-001"]' },
    { id: 'STAFF-002', caminho: '/zonas', marcador: '[data-tela="STAFF-002"]' },
    { id: 'STAFF-003', caminho: '/mesas', marcador: '[data-tela="STAFF-003"]' },
    { id: 'STAFF-004', caminho: '/mesas/nova', marcador: '[data-tela="STAFF-004"]' },
    // Com identificador: sem ele mediria a página de «não encontrado», em cinco
    // larguras, a dizer verde. É a razão de o `alvos.ts` falhar alto.
    { id: 'STAFF-005', caminho: `/mesas/${a.sessionIdDoStaff}`, marcador: '[data-tela="STAFF-005"]' },
    { id: 'STAFF-006', caminho: '/catalogo', marcador: '[data-tela="STAFF-006"]' },
    { id: 'STAFF-007', caminho: `/catalogo/${a.productId}`, marcador: '[data-tela="STAFF-007"]' },
    { id: 'STAFF-008', caminho: '/revisao', marcador: '[data-tela="STAFF-008"]' },
    { id: 'STAFF-009', caminho: '/estacoes', marcador: '[data-tela="STAFF-009"]' },
    { id: 'STAFF-010', caminho: '/andamento', marcador: '[data-tela="STAFF-010"]' },
    { id: 'STAFF-011', caminho: '/cursos', marcador: '[data-tela="STAFF-011"]' },
    { id: 'STAFF-012', caminho: '/entregar', marcador: '[data-tela="STAFF-012"]' },
    { id: 'STAFF-013', caminho: '/avisos', marcador: '[data-tela="STAFF-013"]' },
    { id: 'STAFF-014', caminho: '/mover', marcador: '[data-tela="STAFF-014"]' },
    { id: 'STAFF-017', caminho: '/cancelar', marcador: '[data-tela="STAFF-017"]' },
    { id: 'STAFF-018', caminho: '/conta', marcador: '[data-tela="STAFF-018"]' },
    { id: 'STAFF-022', caminho: '/procurar', marcador: '[data-tela="STAFF-022"]' },
    { id: 'STAFF-023', caminho: '/perfil', marcador: '[data-tela="STAFF-023"]' },
    { id: 'STAFF-024', caminho: '/ligacao', marcador: '[data-tela="STAFF-024"]' },
    // SET-008 vive no painel, e não no Staff: quem configura avisos é quem gere.
    { id: 'SET-008', caminho: '/app/marina-oropesa/puerto/settings/avisos', absoluto: true,
      marcador: '[data-tela="SET-008"]', toque: TOQUE_DO_PAINEL },
    // Os três estados, cada um na rota onde ACONTECE. Desenhá-los à parte fazia
    // deles ilustrações — e uma ilustração de «sem conexão» passa o aceite sem
    // que a fila exista.
    { id: 'STATE-004', caminho: '/staff/offline', absoluto: true,
      marcador: '[data-tela="STATE-004"]' },
    { id: 'STATE-008', caminho: `/mesas/${a.sessionIdDoStaff}?conflito=7`,
      marcador: '[data-tela="STATE-008"]' },
    { id: 'STATE-015', caminho: '/avisos', marcador: '[data-tela="STATE-015"]' },
  ];
}

/**
 * Um 404 numa rota com identificador: a linha ainda existe na base?
 *
 * ── Porque é que a mensagem tem de dizer isto ────────────────────────────
 *
 * A 04/09 uma passagem completa deu «STAFF-005 respondeu 404» e a seguinte deu
 * verde sem ninguém tocar em nada. A mensagem dizia só o código, e distinguir
 * «a linha desapareceu» de «a linha está lá e o produto não a serve» custou uma
 * hora — são causas completamente diferentes e a primeira nem sequer é um
 * defeito do produto.
 *
 * O diagnóstico corre **só quando já falhou**, e com a credencial de migração,
 * que vê tudo. Não muda o veredicto: acrescenta a única coisa que quem lê o
 * relatório vai querer saber a seguir.
 */
async function aLinhaExiste(tabela: string, id: string): Promise<boolean | null> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  const { Client } = await import('pg');
  const sql = new Client({ connectionString: url });
  try {
    await sql.connect();
    const { rows } = await sql.query(`SELECT 1 FROM ${tabela} WHERE id = $1`, [id]);
    return rows.length > 0;
  } catch {
    return null;
  } finally {
    await sql.end().catch(() => undefined);
  }
}

async function visitar(
  pagina: import('@playwright/test').Page, tela: Tela, idioma: string, a: Alvos,
) {
  const caminho = endereco(tela, idioma, a);
  const resposta = await pagina.goto(caminho);
  let diagnostico = '';
  if ((resposta?.status() ?? 0) === 404 && caminho.includes('/mesas/')) {
    const existe = await aLinhaExiste('table_sessions', a.sessionIdDoStaff);
    diagnostico = existe === null
      ? ' — não consegui perguntar à base se a sessão ainda existe'
      : existe
        ? ' — e a sessão AINDA EXISTE na base: o produto é que não a serviu'
        : ' — e a sessão JÁ NÃO EXISTE na base: alguém a apagou a meio da passagem';
  }
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}${diagnostico}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  // O caminho FINAL, sem a busca: um desvio para a entrada media o ecrã de
  // entrada em cinco larguras e dizia verde nas cinco.
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  await expect(pagina.locator(tela.marcador).first(), `${tela.id} · o marcador não apareceu`)
    .toBeVisible();
}

/**
 * As colunas de uma linha de CSV, respeitando aspas.
 *
 * ── Porque é que um `split(',')` não serve aqui ──────────────────────────
 *
 * Escrevi-o assim primeiro. O `titulo_atlas` do STAFF-001 é `"Tu turno, a la
 * vista"` — vírgula dentro de aspas —, e a partir dessa linha todas as colunas
 * andam uma casa para a direita: `etapa_principal` passava a ler o título e a
 * comparação com `E15` não dava nada.
 *
 * O sintoma teria sido a guarda a encontrar zero telas na matriz. E é por isso
 * que a asserção da contagem existe antes da comparação: sem ela, os dois
 * conjuntos ficavam vazios e a igualdade passava por vacuidade — verde sobre
 * nada, exactamente o que este projecto passa o tempo a fechar.
 */
function colunas(linha: string): string[] {
  const saida: string[] = [];
  let campo = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      // Duas aspas seguidas dentro de um campo são uma aspa literal.
      if (dentroDeAspas && linha[i + 1] === '"') { campo += '"'; i += 1; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === ',' && !dentroDeAspas) {
      saida.push(campo); campo = '';
    } else {
      campo += c;
    }
  }
  saida.push(campo);
  return saida;
}

/**
 * A POPULAÇÃO, afirmada antes de qualquer medição.
 *
 * A régua fixou-a antes da entrega: `etapa_principal = E15` são **23 telas**. E
 * exige que a prova conte a própria população — *«sem isso, ‹as telas estão
 * verdes› é uma frase sobre as telas que alguém se lembrou de listar»*.
 *
 * É a lição do E14 aplicada aqui: uma tela que caia da lista tem de **partir o
 * teste**, e não desaparecer em silêncio. Sem esta contagem, um verde sobre
 * vinte e duas é indistinguível de um verde sobre vinte e três — e a diferença é
 * uma tela que ninguém voltou a olhar.
 */
const QUANTAS_TELAS = 23;

test('a população é 23 telas, e 23 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length, 'a lista de telas não tem 23 entradas').toBe(QUANTAS_TELAS);
  // Ids distintos, e não só a contagem: vinte e três entradas com uma repetida
  // são vinte e duas telas medidas e um número certo — que é pior do que um
  // número errado, porque não se vê.
  const ids = new Set(lista.map((t) => t.id));
  expect(ids.size, `ids repetidos: ${lista.length - ids.size}`).toBe(QUANTAS_TELAS);
});

/**
 * E a lista bate com a MATRIZ, que é a fonte — não com o que eu me lembrei.
 *
 * Contar 23 prova que a lista tem 23. Não prova que são **as** 23: uma tela
 * trocada por outra dá o mesmo número. A matriz é lida do CSV, e a comparação é
 * de conjuntos nos dois sentidos — uma a menos e uma a mais são o mesmo defeito.
 */
test('e são exactamente as 23 da matriz, sem faltar nem sobrar', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1)
    .map(colunas)
    .filter((c) => c[6] === 'E15')
    .map((c) => c[0]?.trim() ?? '')
    .filter((id) => id !== '');
  // Guarda de leitor cego: se o CSV não for lido, os dois conjuntos ficam vazios
  // e a comparação passa por vacuidade — que é o verde sobre nada.
  expect(daMatriz.length, 'não li a matriz — a comparação seria vazia').toBe(QUANTAS_TELAS);

  const medidos = telas(alvos).map((t) => t.id).sort();
  expect(medidos, 'a lista medida não é a da matriz').toEqual([...daMatriz].sort());
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · Staff`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test(`as 23 telas não transbordam nem escondem acções`, async ({ page }) => {
      // Uma só visita por tela e por largura, em série: 23 casos × 5 larguras
      // como testes separados são 115 arranques de página para medir a mesma
      // propriedade. O que se perde é granularidade no relatório, e por isso
      // cada asserção NOMEIA a tela — o relatório diz qual, mesmo agregado.
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES', alvos);
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('Staff a 360 px — o telemóvel de quem está de pé', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 48 px no Staff, e 44 no painel', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES', alvos);
      const maus = await alvosPequenos(page, tela.toque ?? TOQUE_DE_OPERACAO);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES', alvos);
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

/**
 * Os três idiomas, a 360 px.
 *
 * O espanhol e o português são mais longos que o inglês, e é neles que a régua
 * parte. Um ecrã que só se mede em inglês passa e depois transborda em produção,
 * onde o produto vive em espanhol.
 */
test.describe('Staff nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma, alvos);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} rola na horizontal`)
          .toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · ${idioma}:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  }
});

/**
 * Nenhuma tela do Staff nasce inalcançável.
 *
 * ── Porque é que isto é um teste e não um cuidado ────────────────────────
 *
 * A barra do topo leva sete secções; as outras dez vivem no índice do STAFF-022.
 * Uma tela sem caminho de navegação está tão morta como uma que não existe, com
 * a diferença de que **responde ao endereço** — e por isso ninguém repara: as
 * cinco larguras dela ficam verdes, e a tela continua fora do alcance de quem lá
 * teria de chegar a trabalhar.
 *
 * A lista sai da mesma tabela que a navegação usa. Duas listas seria a segunda a
 * envelhecer.
 */
test.describe('todas as telas do Staff têm caminho de navegação', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('cada rota da tabela é alcançável por ligação, a partir do turno', async ({ page }) => {
    const base = `/es-ES/staff/${alvos.unidadeDoStaff}`;
    await page.goto(base);
    await page.waitForLoadState('networkidle');

    // Da barra do topo chega-se ao índice; do índice, a todas.
    await page.locator('[data-teste="navegacao"] a[data-seccao="STAFF-022"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="STAFF-022"]').first()).toBeVisible();

    const alcancaveis = await page.locator('[data-teste="todas-as-telas"] a')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));

    const emFalta = SECCOES_DO_STAFF
      .map((x) => `${base}${x.rota}`)
      .filter((rota) => !alcancaveis.includes(rota));

    expect(emFalta, `telas sem caminho de navegação:\n${emFalta.join('\n')}`).toEqual([]);
    // E o índice não inventa rotas que a tabela não tem.
    expect(alcancaveis.length, 'o índice tem mais ligações do que a tabela tem rotas')
      .toBe(SECCOES_DO_STAFF.length);
  });
});
