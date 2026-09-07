import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 20 telas do E16, medidas no navegador.
 *
 * ── O que torna esta etapa perigosa ───────────────────────────────────────
 *
 * *«O E15 mentia dizendo "enviado". Este mente REGREDINDO: um ecrã que volta
 * atrás mostra ao cozinheiro um estado que já não é verdade, e ele age sobre ele.
 * Ninguém vai procurar o erro — a comida sai errada e alguém culpa a pessoa.»*
 *
 * A regra de ordem está provada em `packages/domain/src/kds.test.ts`, onde é
 * lógica pura. Aqui mede-se o que só o navegador vê: composição a cinco
 * larguras, alvos de operação, contraste, três línguas — e as duas propriedades
 * que a régua exige ver no ECRÃ, que são a contagem do backlog e o pronto
 * parcial.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

/** 48 px: o KDS lê-se a um metro e meio, de pé, com as mãos ocupadas. */
const TOQUE_DE_OPERACAO = 48;
/** O painel mede-se a 44, e é assim em todas as outras provas deste arnês. */
const TOQUE_DO_PAINEL = 44;

interface Tela {
  id: string;
  caminho: string;
  /** A partir de `/<idioma>`, e não de dentro da estação. */
  absoluto?: true;
  marcador: string;
  toque?: number;
}

function endereco(tela: Tela, idioma: string, a: Alvos): string {
  return tela.absoluto
    ? `/${idioma}${tela.caminho}`
    : `/${idioma}/kds/${a.unidadeDoStaff}/${a.estacaoDeProducao}${tela.caminho}`;
}

function telas(a: Alvos): Tela[] {
  const marcador = (id: string) => `h1[data-tela="${id}"]`;
  return [
    { id: 'KDS-001', caminho: `/kds/${a.unidadeDoStaff}`, absoluto: true, marcador: marcador('KDS-001') },
    { id: 'KDS-002', caminho: '', marcador: marcador('KDS-002') },
    // Com identificador: sem ele mediria a página de «não encontrado», em cinco
    // larguras, a dizer verde. É a razão de o `alvos.ts` falhar alto.
    { id: 'KDS-003', caminho: `/bilhete/${a.tarefaDeProducao}`, marcador: marcador('KDS-003') },
    { id: 'KDS-004', caminho: '/comecar', marcador: marcador('KDS-004') },
    { id: 'KDS-005', caminho: '/prontos', marcador: marcador('KDS-005') },
    { id: 'KDS-006', caminho: '/cursos', marcador: marcador('KDS-006') },
    { id: 'KDS-007', caminho: '/recuperar', marcador: marcador('KDS-007') },
    { id: 'KDS-008', caminho: '/priorizar', marcador: marcador('KDS-008') },
    { id: 'KDS-009', caminho: '/tudo', marcador: marcador('KDS-009') },
    { id: 'KDS-010', caminho: '/espera', marcador: marcador('KDS-010') },
    { id: 'KDS-011', caminho: '/historico', marcador: marcador('KDS-011') },
    // O passe mede-se na estação de EXPO, que é quem o usa. Medi-lo numa estação
    // de preparação media a tela certa no sítio errado.
    { id: 'KDS-012', caminho: `/kds/${a.unidadeDoStaff}/${a.estacaoDeExpo}/passe`,
      absoluto: true, marcador: marcador('KDS-012') },
    { id: 'KDS-013', caminho: `/kds/${a.unidadeDoStaff}/${a.estacaoDeExpo}/saida`,
      absoluto: true, marcador: marcador('KDS-013') },
    { id: 'KDS-014', caminho: '/ajustes', marcador: marcador('KDS-014') },
    { id: 'KDS-015', caminho: `/kds/${a.unidadeDoStaff}/ecras`, absoluto: true,
      marcador: marcador('KDS-015') },
    { id: 'STATE-012', caminho: '/ligacao', marcador: marcador('STATE-012') },
    // As quatro que vivem no painel: quem configura está sentado, e a régua lá
    // é 44 px como em todo o resto do painel.
    { id: 'ONB-008', caminho: '/onboarding/cozinha', absoluto: true,
      marcador: marcador('ONB-008'), toque: TOQUE_DO_PAINEL },
    { id: 'REP-009', caminho: '/app/marina-oropesa/puerto/reports/cozinha', absoluto: true,
      marcador: marcador('REP-009'), toque: TOQUE_DO_PAINEL },
    { id: 'SET-005', caminho: '/app/marina-oropesa/puerto/settings/estacoes', absoluto: true,
      marcador: marcador('SET-005'), toque: TOQUE_DO_PAINEL },
    { id: 'SET-006', caminho: '/app/marina-oropesa/puerto/settings/ecras', absoluto: true,
      marcador: marcador('SET-006'), toque: TOQUE_DO_PAINEL },
  ];
}

/**
 * As colunas de uma linha de CSV, respeitando aspas.
 *
 * Um `split(',')` não serve: o `titulo_atlas` do KDS-003 é `"Mesa 07 · Ticket
 * A104"` e há títulos com vírgula. A partir dessa linha todas as colunas andam
 * uma casa, `etapa_principal` passa a ler o título, e a comparação não dá nada —
 * verde por vacuidade, que é o que a asserção da contagem impede.
 */
function colunas(linha: string): string[] {
  const saida: string[] = [];
  let campo = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') { campo += '"'; i += 1; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === ',' && !dentroDeAspas) { saida.push(campo); campo = ''; }
    else campo += c;
  }
  saida.push(campo);
  return saida;
}

const QUANTAS_TELAS = 20;

test('a população é 20 telas, e 20 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length, 'a lista de telas não tem 20 entradas').toBe(QUANTAS_TELAS);
  const ids = new Set(lista.map((t) => t.id));
  expect(ids.size, `ids repetidos: ${lista.length - ids.size}`).toBe(QUANTAS_TELAS);
});

test('e são exactamente as 20 da MATRIZ, sem faltar nem sobrar', async () => {
  // A régua: *«a população tirada do código do produto» é o que reprovo à
  // cabeça. No E15 pediste isto e tu foste além: leste a matriz e comparaste
  // conjunto a conjunto. Faz o mesmo aqui.*
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1)
    .map(colunas)
    .filter((c) => c[6] === 'E16')
    .map((c) => c[0]?.trim() ?? '')
    .filter((id) => id !== '');
  // Guarda de leitor cego: sem esta linha, dois conjuntos vazios comparam iguais.
  expect(daMatriz.length, 'não li a matriz — a comparação seria vazia').toBe(QUANTAS_TELAS);

  const medidos = telas(alvos).map((t) => t.id).sort();
  expect(medidos, 'a lista medida não é a da matriz').toEqual([...daMatriz].sort());
});

async function visitar(
  pagina: import('@playwright/test').Page, tela: Tela, idioma: string, a: Alvos,
) {
  const caminho = endereco(tela, idioma, a);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  // O marcador é `h1[data-tela=...]`, e não `[data-tela=...]`: no E15 a
  // navegação escrevia o id de cada secção em todas as páginas e o selector
  // ficava sempre satisfeito. Aqui as ligações levam `data-seccao`, e o
  // cabeçalho é o único que se identifica — o controlo negativo 5 prova-o.
  await expect(pagina.locator(tela.marcador).first(), `${tela.id} · o marcador não apareceu`)
    .toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · KDS`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 20 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES', alvos);
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('KDS a 360 px — o tablet da cozinha', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos têm 48 px no KDS, e 44 no painel', async ({ page }) => {
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
 * A BARRA NÃO REPETE O TÍTULO, e não nomeia a estação errada.
 *
 * ── Dois defeitos que só se viam na imagem ────────────────────────────────
 *
 * A tela-mestre M05 mostrava «Cocina caliente» no `h1` **e** na primeira
 * pastilha. Duas causas somadas, e nenhuma delas se via a ler o código:
 *
 * 1. `kdsE16.bilhetes` era **um nome de estação** — «Cocina caliente», «Cozinha
 *    quente», «Hot kitchen» nas três línguas. Não era erro de tradução: era um
 *    rótulo de navegação com o nome de UMA estação, e a captura do estado vazio
 *    prova-o — na estação **Pase**, a pastilha continuava a dizer «Cocina
 *    caliente». **Estava errado em todas as estações menos uma.**
 * 2. A barra mostrava a secção onde já se está, como a do Staff mostrava — foi
 *    a primeira queixa do dono do produto, e a cura ali foi a mesma.
 *
 * Esta guarda mede as duas por PROPRIEDADE e não por texto: nenhuma ligação da
 * barra pode apontar para o caminho actual, e nenhuma pode dizer o mesmo que o
 * `h1`. Um rótulo novo com o nome de outra estação volta a acender isto.
 */
test.describe('a barra do KDS não diz o que o título já diz', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('nenhuma pastilha repete o título nem aponta para onde já se está', async ({ page }) => {
    const falhas: string[] = [];
    let medidas = 0;

    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES', alvos);
      const aqui = new URL(page.url()).pathname;
      const titulo = (await page.locator('h1').first().innerText()).trim();
      const pastilhas = await page.locator('nav[data-teste="navegacao"] a').evaluateAll(
        (as) => as.map((a) => ({
          texto: (a.textContent ?? '').trim(),
          destino: new URL((a as HTMLAnchorElement).href).pathname,
        })));
      if (pastilhas.length === 0) continue;
      medidas += 1;

      for (const x of pastilhas) {
        if (x.destino === aqui) {
          falhas.push(`${tela.id} · a barra aponta para onde já se está: «${x.texto}»`);
        }
        if (x.texto === titulo) {
          falhas.push(`${tela.id} · a pastilha «${x.texto}» repete o título`);
        }
      }
    }

    // ── A SONDA: esta guarda sabe ver um duplicado? ────────────────────────
    //
    // Um zero que confirma o que se espera não mediu nada. Planta-se uma
    // pastilha com o texto do título e exige-se que ela apareça.
    //
    // E planta-se numa tela que TEM barra: à primeira, a sonda correu onde o
    // ciclo tinha parado — uma tela sem navegação — e devolveu «sem barra».
    // Uma sonda que não encontra onde plantar não diz que a guarda é cega;
    // diz que a sonda não mediu, e são coisas diferentes.
    await visitar(page, telas(alvos).find((t) => t.id === 'KDS-005') as Tela, 'es-ES', alvos);
    const sonda = await page.evaluate(() => {
      const barra = document.querySelector('nav[data-teste="navegacao"]');
      const h1 = document.querySelector('h1');
      if (!barra || !h1) return 'sem barra';
      const a = document.createElement('a');
      a.href = window.location.pathname;
      a.textContent = (h1.textContent ?? '').trim();
      barra.appendChild(a);
      const vista = [...barra.querySelectorAll('a')].some(
        (x) => (x.textContent ?? '').trim() === (h1.textContent ?? '').trim());
      a.remove();
      return vista ? 'acendeu' : 'CEGA';
    });
    console.log(`SONDA-BARRA ${sonda}`);
    console.log(`AMBITO-BARRA telas=${medidas} falhas=${falhas.length}`);

    expect(sonda, 'SONDA-CEGA: a guarda não viu um duplicado plantado').toBe('acendeu');
    expect(medidas, 'POPULACAO-ZERO: nenhuma tela do KDS tinha barra').toBeGreaterThan(5);
    expect(falhas, `a barra do KDS repete-se:\n${falhas.join('\n')}`).toEqual([]);
  });
});

test.describe('KDS nos três idiomas', () => {
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
 * O BACKLOG não descarta nada — medido no ecrã, com os dois números.
 *
 * *«Exijo a contagem: com mais de cinco bilhetes, quantos existem na base e
 * quantos o backlog mostra. Os dois números ditos em voz alta — não "o backlog
 * tem itens".»*
 */
test.describe('o limite visível não faz desaparecer bilhetes', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o ecrã mostra menos do que existe, e diz os DOIS números', async ({ page }) => {
    await page.goto(`/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeProducao}`);
    await page.waitForLoadState('networkidle');

    const noEcra = Number(await page.locator('[data-teste="no-ecra"]').innerText());
    const noTotal = Number(await page.locator('[data-teste="no-total"]').innerText());

    // O cenário tem de EXCEDER o limite, senão não mede nada: com tudo a caber,
    // um produto que descartasse passava na mesma.
    expect(noTotal, `só há ${noTotal} bilhetes: o cenário não excede o limite`)
      .toBeGreaterThan(noEcra);

    // Os bilhetes desenhados são os do primeiro ecrã, e não os que existem.
    const desenhados = await page.locator('[data-teste="bilhete"]').count();
    expect(desenhados, 'o ecrã desenhou mais do que diz mostrar').toBe(noEcra);

    // ── E os que não couberam CONTINUAM ALCANÇÁVEIS ─────────────────────
    //
    // É a metade que separa «um ecrã arrumado» de «comida por fazer».
    await page.locator('[data-teste="ha-espera"] a').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1[data-tela="KDS-010"]')).toBeVisible();

    const emEspera = await page.locator('[data-teste="em-espera"] li').count();
    expect(noEcra + emEspera, `${noEcra} no ecrã + ${emEspera} em espera ≠ ${noTotal} no total`)
      .toBe(noTotal);
  });
});

/**
 * PRONTO PARCIAL não é pronto — medido no ecrã do expo.
 *
 * «Uma mesa com três pratos em que dois estão prontos é uma mesa que ainda não
 * sai — e mostrar "pronto" ali faz sair comida fria.»
 */
test.describe('o passe não diz pronto com metade por fazer', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a contagem aparece, e o estado NÃO é pronto', async ({ page }) => {
    await page.goto(`/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeExpo}/passe`);
    await page.waitForLoadState('networkidle');

    const quantos = Number(await page.locator('[data-teste="quantos"]').innerText());
    expect(quantos, 'não há pedidos no passe para medir').toBeGreaterThan(0);

    // ── Mede-se a PROPRIEDADE, e não um par de números ─────────────────
    //
    // A primeira versão procurava `1/2`, porque foi assim que eu semeei. Mas o
    // mesmo pedido tem também a tarefa sem estação, e portanto é `1/3` — o teste
    // reprovou por eu ter escrito o número em vez da regra.
    //
    // A propriedade é: **há prontas, faltam prontas, e o estado NÃO é pronto.**
    // Escrita assim, sobrevive a uma semeadura diferente e continua a medir a
    // mesma coisa. Casar o número era vigiar a forma outra vez.
    const pedidos = page.locator('[data-teste="pedido"]');
    const parcial = await pedidos.evaluateAll((els) => {
      const meio = els.find((e) => {
        const prontas = Number(e.getAttribute('data-prontas'));
        const total = Number(e.getAttribute('data-total'));
        return prontas > 0 && prontas < total;
      });
      return meio === undefined ? null : {
        prontas: meio.getAttribute('data-prontas'),
        total: meio.getAttribute('data-total'),
        estado: meio.getAttribute('data-estado'),
        texto: meio.querySelector('[data-teste="contagem"]')?.textContent?.trim() ?? '',
      };
    });

    expect(parcial, 'o cenário não tem nenhum pedido meio pronto: não mede nada').not.toBeNull();
    expect(parcial!.estado, 'o passe disse PRONTO com trabalho por fazer').not.toBe('PRONTO');
    // E a contagem está ESCRITA, não só no atributo: quem está no passe lê-a.
    expect(parcial!.texto, 'a contagem não está no ecrã')
      .toBe(`${parcial!.prontas}/${parcial!.total}`);
  });

  test('e o KDS-013 NÃO oferece a saída de um pedido meio pronto', async ({ page }) => {
    // A metade prática: se um pedido meio pronto aparecesse aqui, alguém
    // confirmava a saída dele e a comida saía incompleta.
    await page.goto(`/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeExpo}/saida`);
    await page.waitForLoadState('networkidle');
    const prontos = await page.locator('[data-teste="pedido-pronto"]').count();
    const quantos = Number(await page.locator('[data-teste="quantos"]').innerText());
    expect(prontos).toBe(quantos);
  });
});

/**
 * O NÃO ENCAMINHADO aparece — e não numa estação qualquer.
 */
test.describe('o item sem regra é visível a quem configura', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('aparece no KDS-009, e não no quadro da estação', async ({ page }) => {
    const base = `/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeProducao}`;

    await page.goto(`${base}/tudo`);
    await page.waitForLoadState('networkidle');
    const aviso = page.locator('[data-teste="nao-encaminhado"]');
    await expect(aviso, 'o não encaminhado não aparece em lado nenhum').toBeVisible();
    const orfas = await page.locator('[data-teste="orfa"]').count();
    expect(orfas, 'o cenário não tem nenhuma tarefa sem estação').toBeGreaterThan(0);

    // E o PAR: no quadro da estação, essas não estão — senão isto passava com um
    // produto que manda tudo para a primeira estação que houver.
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    const noEcra = Number(await page.locator('[data-teste="no-total"]').innerText());
    const orfasNoQuadro = await page.locator('[data-teste="bilhete"]').evaluateAll(
      (els) => els.filter((e) => e.textContent?.includes('Sin encaminar')).length);
    expect(orfasNoQuadro, 'uma tarefa sem estação apareceu no quadro de uma estação').toBe(0);
    expect(noEcra).toBeGreaterThan(0);
  });
});
