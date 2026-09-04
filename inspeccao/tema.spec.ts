import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { FICHEIRO_DE_SESSAO, FICHEIRO_DE_SESSAO_B } from './caminhos.ts';
import {
  TOKENS_FIXOS, TOKENS_PUBLICOS, exigirTokensLidos, tokensAplicados,
} from './sonda-tema.ts';
// As mesmas regras que o servidor usa para decidir. Medir contraste no arnês com
// uma segunda conta daria duas verdades sobre contraste — que é o que a régua do
// E12 reprova à cabeça.
import { LIMIAR, razaoArredondada } from '../packages/ui/src/regras.ts';

/**
 * E12 · a cor CALCULADA pelo navegador na rota pública.
 *
 * ── O ataque está escrito na régua, e é este ──────────────────────────────
 *
 * > *«Leio a cor CALCULADA pelo navegador na rota pública, não a que o CSS
 * > declara — foi assim que o E09 me escondeu uma carta servida sem folha de
 * > estilos.»*
 *
 * Uma tela que mostre a cor guardada no formulário mostra o que se escreveu.
 * `getComputedStyle` mostra o que o visitante vê: se o tema não chegar ao
 * `<html>`, se a folha de estilos não carregar, se a variável não existir, o
 * número que sai daqui é o do tema de origem — e o par antes/depois apanha-o.
 *
 * ── E o par, sem o qual isto não mede nada ────────────────────────────────
 *
 * Primeiro lê-se a cor ANTES de publicar. Sem essa leitura, uma implementação
 * que mostrasse sempre a mesma cor — a certa, por acaso — passava.
 *
 * ── Porque é que isto corre no inquilino B ────────────────────────────────
 *
 * A organização A é **Starter** e não pode ter cores próprias: a rota pública
 * dela serve sempre a paleta BossaOS, e medir ali daria verde contra o tema por
 * omissão. A B é **Pro**. É a mesma razão por que a semeadura passou a criar um
 * segundo endereço público.
 */

const ORG_A = 'marina-oropesa';
const ORG_B = 'marina-barcelona';
const UNIDADE_A = 'puerto';
const UNIDADE_B = 'playa';
const CARTA_B = '/r/insp-marina-barcelona/es-ES/menu';
/**
 * A home do site de B — e ela existe por uma medição, não por gosto.
 *
 * Na CARTA pública não há um único elemento pintado com `--bo-publico-primaria`:
 * o botão primário vive na home («Ver carta»). Ler só a carta deixava passar uma
 * implementação que aplicasse o fundo e esquecesse a primária — medir uma parte e
 * dar a outra por medida.
 */
const SITE_B = '/r/insp-marina-barcelona/es-ES';

const TEMA_A = `/es-ES/app/${ORG_A}/${UNIDADE_A}/website/theme`;
const TEMA_B = `/es-ES/app/${ORG_B}/${UNIDADE_B}/website/theme`;

/** Cores legíveis e inconfundíveis. O roxo não aparece em lado nenhum do produto. */
const NOVAS = { primaria: '#3d1f6b', acento: '#a05a2c', fundo: '#f4f0fa' };
/** Cinzento sobre cinzento: o par que a WCAG reprova, e o servidor também. */
const ILEGIVEL = { primaria: '#858585', acento: '#858585', fundo: '#858585' };

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** A cor que o NAVEGADOR calcula, e não a que o CSS declara. */
async function corCalculada(
  pagina: import('@playwright/test').Page, selector: string, propriedade: string,
): Promise<string> {
  return pagina.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s!);
      if (!el) throw new Error(`não encontrei ${s} na página servida`);
      return getComputedStyle(el).getPropertyValue(p!);
    },
    [selector, propriedade] as const,
  );
}

/** Preenche e submete o formulário de cores. Devolve o endereço onde caiu. */
async function guardarCores(
  pagina: import('@playwright/test').Page,
  cores: { primaria: string; acento: string; fundo: string },
): Promise<string> {
  await pagina.goto(`${TEMA_B}/editar`);
  for (const [campo, valor] of Object.entries(cores)) {
    await pagina.fill(`#${campo}`, valor);
  }
  await Promise.all([
    pagina.waitForURL(/\/website\/theme/),
    pagina.getByRole('button', { name: /Guardar/i }).click(),
  ]);
  return pagina.url();
}

// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('a cor publicada chega à rota pública', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: 1280, height: 900 } });

  let antesFundo = '';
  let antesBotao = '';
  /** Os tokens da sonda do revisor, lidos onde o tema entra e onde ele NÃO entra. */
  let antesPublicos: Record<string, string> = {};
  let antesFixosNaSuperficie: Record<string, string> = {};
  let antesPublicosNaRaiz: Record<string, string> = {};

  test('ANTES: as páginas públicas servem a paleta de origem', async ({ page }) => {
    const carta = await page.goto(CARTA_B);
    expect(carta?.status(), 'a carta pública de B não responde').toBeLessThan(400);
    // O elemento existe e tem estilo: se a folha não tivesse carregado, o fundo
    // vinha `rgba(0, 0, 0, 0)` e a comparação de baixo passava por acaso.
    antesFundo = await corCalculada(page, '.bo-publico', 'background-color');
    expect(antesFundo, 'a página veio sem folha de estilos').not.toBe('rgba(0, 0, 0, 0)');
    expect(antesFundo).not.toBe(rgb(NOVAS.fundo));

    const site = await page.goto(SITE_B);
    expect(site?.status(), 'o site público de B não responde').toBeLessThan(400);
    antesBotao = await corCalculada(page, '.bo-publico .bo-botao--primario', 'background-color');
    expect(antesBotao).not.toBe(rgb(NOVAS.primaria));

    // ── E os tokens da sonda do revisor, nos DOIS sítios ──────────────────
    //
    // `.bo-publico` é onde o tema entra; `:root` é onde ele não pode entrar. Ler
    // nos dois transforma «a cor mudou» em duas afirmações diferentes: mudou
    // onde devia, e ficou contida.
    await page.goto(CARTA_B);
    antesPublicos = await tokensAplicados(page, TOKENS_PUBLICOS, '.bo-publico');
    antesFixosNaSuperficie = await tokensAplicados(page, TOKENS_FIXOS, '.bo-publico');
    antesPublicosNaRaiz = await tokensAplicados(page, TOKENS_PUBLICOS, ':root');
    // A guarda do próprio leitor: token vazio é folha que não chegou, e não
    // «nada mudou». Sem ela, uma página sem estilos passaria o antes/depois.
    exigirTokensLidos(antesPublicos);
    exigirTokensLidos(antesFixosNaSuperficie);
    exigirTokensLidos(antesPublicosNaRaiz);
  });

  test('publicar as cores pelo PRODUTO, do formulário ao botão', async ({ page }) => {
    const caiu = await guardarCores(page, NOVAS);
    expect(caiu, 'guardar não voltou ao editor com confirmação').toContain('guardado=1');

    await page.goto(`${TEMA_B}/publicar`);
    await Promise.all([
      page.waitForURL(/publicado=/),
      page.getByRole('button', { name: /Publicar/i }).click(),
    ]);
    expect(page.url()).toMatch(/publicado=[0-9a-f-]{36}/);
  });

  test('DEPOIS: o navegador calcula as cores novas nas rotas públicas', async ({ page }) => {
    const r = await page.goto(CARTA_B);
    expect(r?.status()).toBeLessThan(400);
    const fundo = await corCalculada(page, '.bo-publico', 'background-color');

    await page.goto(SITE_B);
    const botao = await corCalculada(page, '.bo-publico .bo-botao--primario', 'background-color');

    expect(fundo, 'o fundo servido não é o publicado').toBe(rgb(NOVAS.fundo));
    expect(botao, 'a primária servida não é a publicada').toBe(rgb(NOVAS.primaria));
    // O PAR: mudou mesmo. Sem isto, uma página que mostrasse sempre esta cor
    // passava — e passava também se o "antes" já fosse esta cor.
    expect(fundo).not.toBe(antesFundo);
    expect(botao).not.toBe(antesBotao);
  });

  test('as TRÊS cores escolhidas mudam, as duas geradas continuam legíveis, e os SETE fixos não mexem', async ({ page }) => {
    // ── A terceira coisa que o E12 tem de mostrar, medida no navegador ────
    //
    // *«A personalização preserva tipografia, componentes, legibilidade e cores
    // dos estados»* (PRECIFICACAO.md). Um cliente que repinte o vermelho de
    // perigo passa o aceite 1 e quebra a leitura de um ecrã de operação: quem
    // está ao balcão deixa de distinguir um aviso de um erro.
    //
    // A prova de base mede isto na ENTRADA (a recusa por token não temável) e na
    // SAÍDA (`variaveisDoTema` emite cinco). Aqui mede-se onde interessa: no que
    // o navegador tem de pé depois de a cascata resolver.
    await page.goto(CARTA_B);
    const publicos = await tokensAplicados(page, TOKENS_PUBLICOS, '.bo-publico');
    const fixos = await tokensAplicados(page, TOKENS_FIXOS, '.bo-publico');
    const publicosNaRaiz = await tokensAplicados(page, TOKENS_PUBLICOS, ':root');
    exigirTokensLidos(publicos);
    exigirTokensLidos(fixos);

    // ── TRÊS mudam, e não cinco. Uma correcção à premissa da sonda ───────
    //
    // A sonda do revisor diz «os cinco tokens públicos mudam». Medido: mudam
    // três. Os outros dois — `--bo-publico-texto` e `--bo-publico-primaria-texto`
    // — **não são escolhidos, são gerados**: `melhorTextoSobre` calcula-os a
    // partir do fundo e da primária, e é de propósito. Está escrito em
    // `packages/ui/src/tema.ts`: *«quem escolhe o fundo não devia poder escolher
    // também o texto que vai por cima»*.
    //
    // Uma paleta nova escura sobre outra escura gera o MESMO branco, e exigir que
    // ele mude seria exigir que a regra de legibilidade falhasse. Por isso os
    // derivados provam-se de outra maneira, três linhas abaixo: pela razão de
    // contraste contra a cor de onde vieram.
    for (const token of ['--bo-publico-primaria', '--bo-publico-acento', '--bo-publico-fundo']) {
      expect(publicos[token], `${token} não mudou com o tema publicado`)
        .not.toBe(antesPublicos[token]);
    }
    expect(publicos['--bo-publico-primaria']?.toLowerCase()).toBe(NOVAS.primaria);
    expect(publicos['--bo-publico-acento']?.toLowerCase()).toBe(NOVAS.acento);
    expect(publicos['--bo-publico-fundo']?.toLowerCase()).toBe(NOVAS.fundo);

    // E os DERIVADOS são derivados: cada um cumpre o mínimo de texto corrente
    // contra a cor sobre a qual assenta. Uma implementação que os copiasse do
    // tema anterior — ou que deixasse o cliente escolhê-los — cai aqui.
    expect(
      razaoArredondada(publicos['--bo-publico-fundo']!, publicos['--bo-publico-texto']!),
      'o texto gerado não se lê sobre o fundo publicado',
    ).toBeGreaterThanOrEqual(LIMIAR.normal);
    expect(
      razaoArredondada(publicos['--bo-publico-primaria']!, publicos['--bo-publico-primaria-texto']!),
      'o rótulo do botão não se lê sobre a primária publicada',
    ).toBeGreaterThanOrEqual(LIMIAR.normal);
    // Os sete não mudaram — nenhum. E a comparação é com a leitura de antes, e
    // não com uma lista de valores escrita à mão: uma lista escrita à mão
    // envelhece e passa a comparar o tema com ela própria.
    expect(fixos, 'o tema do restaurante tocou em tipografia, estado ou foco')
      .toEqual(antesFixosNaSuperficie);
    // E o tema ficou CONTIDO: na raiz do documento os tokens públicos continuam
    // nos valores de origem. É isto que impede a cor de um restaurante de
    // escorrer para um ecrã de operação que partilhe a mesma folha.
    expect(publicosNaRaiz, 'o tema escapou da superfície pública para a raiz')
      .toEqual(antesPublicosNaRaiz);
  });

  test('e a carta de OUTRO inquilino não muda de cor com isto', async ({ page }) => {
    // A organização A é Starter e continua com a paleta de origem. Se o tema
    // fosse global — ou se a porta pública ignorasse o endereço — esta leitura
    // vinha roxa.
    const r = await page.goto('/r/insp-marina-oropesa/es-ES/menu');
    expect(r?.status()).toBeLessThan(400);
    const fundo = await corCalculada(page, '.bo-publico', 'background-color');
    expect(fundo, 'o tema de B pintou a carta de A').not.toBe(rgb(NOVAS.fundo));
    expect(fundo).toBe(antesFundo);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('o contraste é recusado pelo SERVIDOR, e a recusa vê-se', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: 1280, height: 900 } });

  test('THEME-004 · o par ilegível volta com o número medido no ecrã', async ({ page }) => {
    const caiu = await guardarCores(page, ILEGIVEL);
    expect(caiu, 'o servidor aceitou um par ilegível').toContain('erro=contraste');

    // A recusa é VISÍVEL — um 303 sem ecrã é uma recusa que ninguém lê.
    const aviso = page.locator('.bo-aviso--perigo');
    await expect(aviso).toBeVisible();
    // E traz o NÚMERO. Uma mensagem sem razão medida não distingue "recusei
    // porque medi" de "recusei porque sim".
    await expect(aviso).toContainText(/:1/);
  });

  test('O PAR: as cores legíveis passam pelo mesmo caminho', async ({ page }) => {
    const caiu = await guardarCores(page, NOVAS);
    expect(caiu, 'a recusa acima não era do contraste — recusa tudo').not.toContain('erro=contraste');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('o Starter não consegue — e quem recusa é o servidor', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO, viewport: { width: 1280, height: 900 } });

  test('o ecrã do Starter mostra o bloqueio de plano', async ({ page }) => {
    const r = await page.goto(`${TEMA_A}/editar`);
    expect(r?.status()).toBeLessThan(400);
    await expect(page.locator('.bo-bloqueio, .bo-aviso').first()).toBeVisible();
  });

  test('e o SERVIDOR recusa quem passe ao lado do ecrã', async ({ request }) => {
    // «Não é um ecrã escondido, é o servidor a recusar.» Isto submete o
    // formulário directamente à rota, como quem abre as ferramentas do browser.
    const resposta = await request.post(`/api/org/${ORG_A}/tema/rascunho`, {
      form: {
        idioma: 'es-ES', locationSlug: UNIDADE_A, accao: 'guardar',
        primaria: NOVAS.primaria, acento: NOVAS.acento, fundo: NOVAS.fundo,
      },
    });
    // 402 e não 403: o pedido é legítimo e a pessoa tem autorização — o que
    // falta é o plano.
    expect(resposta.status(), `o servidor respondeu ${resposta.status()}`).toBe(402);
    const corpo = await resposta.json();
    expect(corpo.capacidade).toBe('tema.coresProprias');
  });

  test('A recusa entre inquilinos vê-se no ECRÃ — e não diz que B existe', async ({ page }) => {
    // ── O que foi MEDIDO, e não o que eu esperava ─────────────────────────
    //
    // Escrevi primeiro `toBe(404)`, por analogia com o isolamento do E11, e o
    // produto respondeu outra coisa: o endereço inteiro é de OUTRA organização,
    // e `resolverPedido` devolve a pessoa ao selector de organizações. É uma
    // recusa legítima e visível — nunca serve o ecrã de B.
    await page.goto(`${TEMA_B}/editar`);
    const refusado = new URL(page.url()).pathname;
    expect(refusado, 'o produto serviu o editor de outro inquilino').toBe('/es-ES/auth/organizations');
    await expect(page.locator('h1').first()).toBeVisible();

    const visivel = await page.locator('body').innerText();
    expect(visivel, 'o ecrã de recusa mostrou as cores de B').not.toContain(NOVAS.primaria);

    // E o par que fecha o oráculo de existência: uma organização que NÃO existe
    // tem de dar exactamente a mesma resposta. Se dessem diferente, este endereço
    // passava a confirmar a um estranho que a marina-barcelona é cliente.
    await page.goto('/es-ES/app/nao-existe-nada/playa/website/theme/editar');
    expect(new URL(page.url()).pathname,
      'a organização inexistente respondeu diferente da alheia — há oráculo de existência')
      .toBe(refusado);
  });
});

test.describe('O PAR da recusa entre inquilinos', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: 1280, height: 900 } });

  test('a sessão de B abre o editor DE B', async ({ page }) => {
    // Sem isto, a recusa acima passava num produto que recusa a toda a gente.
    const r = await page.goto(`${TEMA_B}/editar`);
    expect(r?.status(), 'nem o dono consegue abrir o editor').toBeLessThan(400);
    await expect(page.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
/**
 * MÓVEL MEDIDO · THEME-002 a THEME-008.
 *
 * As sete nascem com prova de móvel, como a régua exige desde o E10 — e no
 * inquilino **Pro**, senão as sete mediam o ecrã de bloqueio de plano em vez do
 * editor, e ficavam verdes sobre a tela errada.
 */
const TELAS = [
  { id: 'THEME-002', caminho: `${TEMA_B}/editar` },
  { id: 'THEME-003', caminho: `${TEMA_B}/previa` },
  // O 004 é o ESTADO de recusa do 002, e não uma página própria: é o que o
  // servidor devolve quando as cores não passam. Desenhá-lo à parte fazia dele
  // uma ilustração, e uma ilustração de recusa não prova que a recusa existe.
  {
    id: 'THEME-004',
    caminho: `${TEMA_B}/editar?erro=contraste&primaria=%23858585&acento=%23858585&fundo=%23858585`,
    marcador: '.bo-aviso--perigo',
  },
  { id: 'THEME-005', caminho: `${TEMA_B}/publicar` },
  { id: 'THEME-006', caminho: `${TEMA_B}/exemplos/brasa-norte` },
  { id: 'THEME-007', caminho: `${TEMA_B}/exemplos/oliva-bistro` },
  { id: 'THEME-008', caminho: `${TEMA_B}/plano` },
] as const;

async function visitar(pagina: import('@playwright/test').Page, tela: (typeof TELAS)[number]) {
  const resposta = await pagina.goto(tela.caminho);
  expect(resposta?.status(), `${tela.id} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  const final = new URL(pagina.url()).pathname;
  expect(final, `${tela.id}: a sessão caiu para a entrada`).not.toContain('/auth/');
  expect(final, `${tela.id}: houve um redireccionamento`).toBe(tela.caminho.split('?')[0]);
  await expect(pagina.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  if ('marcador' in tela) await expect(pagina.locator(tela.marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · tema (E12)`, () => {
    test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: largura, height: 900 } });

    test(`as sete telas do tema não transbordam a ${largura} px`, async ({ page }) => {
      test.setTimeout(120_000);
      const problemas: string[] = [];
      for (const tela of TELAS) {
        await visitar(page, tela);
        const transborda = await transbordaNaHorizontal(page);
        if (transborda > 0) problemas.push(`${tela.id} rola ${transborda}px na horizontal`);
        const fora = await elementosForaDoEcra(page);
        if (fora.length > 0) problemas.push(`${tela.id} tem fora do ecrã: ${fora.join(' | ')}`);
      }
      expect(problemas, problemas.join('\n')).toEqual([]);
    });
  });
}

test.describe('tema a 360 px · toque e contraste', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px nas sete', async ({ page }) => {
    test.setTimeout(120_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await alvosPequenos(page, 44);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('o contraste cumpre a WCAG nas sete', async ({ page }) => {
    test.setTimeout(120_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await textosComPoucoContraste(page);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('a lista tem as SETE, e nenhuma repetida', () => {
    // O controlo anti-verde-vazio: uma lista que encolhesse deixava telas por
    // medir e os casos acima continuavam verdes.
    expect(TELAS.length).toBe(7);
    expect(new Set(TELAS.map((t) => t.id)).size).toBe(7);
  });
});
