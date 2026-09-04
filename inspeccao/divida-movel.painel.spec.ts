import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 60 telas da dívida de móvel que vivem atrás de sessão.
 *
 * ── O que a revisão do marco pediu, e o que isto entrega ──────────────────
 *
 * > *«Dos 112 IDs até ao marco, 66 nunca foram renderizados em móvel, e fui eu
 * > que os assinei com prova só de desktop. O arnês que faltava existe desde o
 * > E10 e já pagou as 11 telas do E09 pelo mesmo caminho — agora faz o mesmo às
 * > 66.»*
 *
 * Seis são anteriores à sessão e vivem em `divida-movel-auth.spec.ts`. As outras
 * sessenta estão aqui, medidas nas cinco larguras do aceite: transbordo
 * horizontal, elementos fora do ecrã, alvos de toque a 44 px e contraste WCAG.
 *
 * ── Três IDs são ESTADOS e não rotas, e cada um afirma o seu bloco ────────
 *
 * STATE-006 (bloqueio de plano), STATE-013 (unidade arquivada) e STATE-014
 * (confirmar identidade) partilham rota com outra tela. Medir a rota uma vez e
 * dar os dois IDs por medidos seria a medição que não aconteceu — a mesma que
 * pôs 66 telas nesta dívida. Cada um exige o seu marcador.
 *
 * ── E as condições dos estados são SEMEADAS, não esperadas ────────────────
 *
 * O bloqueio de plano só aparece se a organização não tiver a capacidade: a
 * `marina-oropesa` é STARTER, e é isso que o faz aparecer. A unidade arquivada
 * nasce arquivada na semeadura, e é uma unidade `insp-` própria — arquivar uma
 * fixture partiria as provas que contam com ela viva.
 */

const ORG = 'marina-oropesa';
const UNIDADE = 'puerto';
const APP = `/es-ES/app/${ORG}`;
const LOC = `${APP}/${UNIDADE}`;

interface Tela {
  id: string;
  caminho: string;
  /** Quando o ID é um bloco dentro da página, e não a página inteira. */
  marcador?: string;
}

function telasCom(a: Alvos): Tela[] {
  const CAT = `${APP}/catalogo`;
  const ORGZ = `${APP}/organization`;
  return [
    // ── E04 ──────────────────────────────────────────────────────────────
    { id: 'AUTH-007', caminho: '/es-ES/auth/organizations' },
    // O escolhedor de unidade exige saber de que organização: sem `?org=`,
    // manda escolher a organização primeiro — e mediríamos esse desvio.
    { id: 'AUTH-008', caminho: `/es-ES/auth/locations?org=${ORG}` },
    { id: 'ONB-009', caminho: '/es-ES/onboarding' },
    // ── Estas três voltaram à lista, e conta como voltaram ────────────────
    //
    // Estiveram fora porque as rotas rendiam **500**: liam `users` pelo cliente
    // do runtime, que só vê a própria linha. A correcção 5 pô-las de pé por uma
    // porta estreita — `identidades_da_organizacao` — sem alargar nada.
    //
    // A medição delas em móvel só vale por a tela renderizar de verdade, e é
    // isso que a visita afirma: estado abaixo de 400, e o cabeçalho visível.
    { id: 'ORG-007', caminho: ORGZ },
    { id: 'ORG-008', caminho: `${ORGZ}/${a.membershipId}` },
    { id: 'STATE-014', caminho: `${ORGZ}/${a.membershipId}`, marcador: '.bo-estado__factos' },

    // ── E05 ──────────────────────────────────────────────────────────────
    { id: 'ONB-004', caminho: '/es-ES/onboarding/plano' },
    { id: 'ORG-010', caminho: `${ORGZ}/plano` },
    { id: 'ORG-013', caminho: `${ORGZ}/uso` },
    { id: 'ORG-014', caminho: `${ORGZ}/plano/cambiar` },
    { id: 'PLAT-002', caminho: '/es-ES/platform' },
    { id: 'PLAT-003', caminho: `/es-ES/platform/${a.orgId}` },
    { id: 'PLAT-004', caminho: `/es-ES/platform/${a.orgId}/entitlements` },
    { id: 'PLAT-006', caminho: '/es-ES/platform/implantacoes' },
    { id: 'PLAT-010', caminho: '/es-ES/platform/flags' },
    { id: 'PLAT-011', caminho: '/es-ES/platform/planos' },
    { id: 'THEME-001', caminho: `${LOC}/website/theme` },
    // O bloqueio de plano vive na mesma rota do tema, e só aparece porque a
    // organização é STARTER. É o seu bloco que se afirma, não a rota.
    { id: 'STATE-006', caminho: `${LOC}/website/theme`, marcador: '.bo-bloqueio, .bo-aviso' },

    // ── E06 ──────────────────────────────────────────────────────────────
    { id: 'ONB-001', caminho: '/es-ES/onboarding/organizacao' },
    { id: 'ONB-002', caminho: '/es-ES/onboarding/marca' },
    { id: 'ONB-003', caminho: '/es-ES/onboarding/unidade' },
    { id: 'ONB-010', caminho: '/es-ES/onboarding/pronto' },
    { id: 'ORG-001', caminho: `${ORGZ}/perfil` },
    { id: 'ORG-002', caminho: `${ORGZ}/marcas` },
    { id: 'ORG-003', caminho: `${ORGZ}/marcas/${a.brandId}` },
    { id: 'ORG-004', caminho: `${ORGZ}/unidades` },
    // A ficha e os horários medem-se numa unidade VIVA: os horários de uma
    // unidade arquivada dão 404, e medir isso seria medir a ausência.
    { id: 'ORG-005', caminho: `${ORGZ}/unidades/${a.unidadeVivaId}` },
    { id: 'ORG-006', caminho: `${ORGZ}/unidades/${a.unidadeVivaId}/horarios` },
    // O estado da unidade arquivada tem de ser visto numa unidade arquivada —
    // é a única condição em que ele existe.
    { id: 'STATE-013', caminho: `${ORGZ}/unidades/${a.unidadeArquivadaId}`, marcador: '.bo-aviso' },
    { id: 'ORG-015', caminho: `${ORGZ}/plano/cancelar` },
    { id: 'SET-001', caminho: `${LOC}/settings` },
    { id: 'SET-002', caminho: `${LOC}/settings/idiomas` },

    // ── E07 ──────────────────────────────────────────────────────────────
    { id: 'CAT-001', caminho: CAT },
    { id: 'CAT-002', caminho: `${CAT}/menus` },
    { id: 'CAT-003', caminho: `${CAT}/menus/${a.menuId}` },
    { id: 'CAT-004', caminho: `${CAT}/menus/${a.menuId}/ordem` },
    { id: 'CAT-005', caminho: `${CAT}/categorias` },
    { id: 'CAT-006', caminho: `${CAT}/categorias/${a.categoryId}` },
    { id: 'CAT-007', caminho: `${CAT}/produtos` },
    { id: 'CAT-008', caminho: `${CAT}/produtos/novo` },
    { id: 'CAT-009', caminho: `${CAT}/produtos/${a.productId}` },
    { id: 'CAT-010', caminho: `${CAT}/produtos/${a.productId}/precos` },
    { id: 'CAT-011', caminho: `${CAT}/produtos/${a.productId}/variantes` },
    { id: 'CAT-012', caminho: `${CAT}/produtos/${a.productId}/opcoes` },
    { id: 'CAT-013', caminho: `${CAT}/produtos/${a.productId}/alergenos` },
    { id: 'CAT-016', caminho: `${CAT}/produtos/${a.productId}/canais` },
    { id: 'CAT-017', caminho: `${CAT}/produtos/${a.productId}/disponibilidade` },
    { id: 'CAT-018', caminho: `${CAT}/opcoes` },
    { id: 'CAT-019', caminho: `${CAT}/opcoes/${a.groupId}` },
    { id: 'CAT-022', caminho: `${CAT}/alergenos` },

    // ── E08 ──────────────────────────────────────────────────────────────
    { id: 'CAT-014', caminho: `${CAT}/produtos/${a.productId}/fotos` },
    { id: 'CAT-015', caminho: `${CAT}/produtos/${a.productId}/traducoes` },
    { id: 'CAT-023', caminho: `${CAT}/media` },
    { id: 'CAT-024', caminho: `${CAT}/traducoes` },
    { id: 'CAT-025', caminho: `${CAT}/menus/${a.menuId}/publicar` },
    { id: 'CAT-026', caminho: `${CAT}/menus/${a.menuId}/historico` },
    { id: 'CAT-027', caminho: `${CAT}/importar` },
    { id: 'ONB-005', caminho: '/es-ES/onboarding/importar' },
    { id: 'ONB-006', caminho: '/es-ES/onboarding/menu' },
    { id: 'SET-012', caminho: `${ORGZ}/exportar` },
  ];
}

let alvos: Alvos;
let TELAS: Tela[];

test.beforeAll(async () => {
  alvos = await resolverAlvos();
  TELAS = telasCom(alvos);
});

async function visitar(pagina: import('@playwright/test').Page, tela: Tela) {
  const resposta = await pagina.goto(tela.caminho);
  expect(resposta?.status(), `${tela.id} · ${tela.caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  const final = new URL(pagina.url()).pathname;
  // A afirmação que impede o falso verde: cheguei ao endereço que pedi. Sem ela,
  // sessenta telas mediriam o mesmo ecrã de entrada e diriam verde nas sessenta.
  expect(final, `${tela.id}: houve um redireccionamento`).toBe(tela.caminho.split('?')[0]);
  // E a mensagem própria para o caso mais provável — a sessão ter caído —, mas
  // só nas telas que NÃO são de entrada: o AUTH-007 e o AUTH-008 vivem em
  // `/auth/` de propósito, e acusá-las era a guarda a apanhar o alvo certo.
  if (!tela.caminho.startsWith('/es-ES/auth/')) {
    expect(final, `${tela.id}: a sessão caiu para a entrada`).not.toContain('/auth/');
  }
  await expect(pagina.locator('h1').first()).toBeVisible();
  if (tela.marcador) await expect(pagina.locator(tela.marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · dívida de móvel`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test(`as ${largura} px: nenhuma transborda nem esconde acções`, async ({ page }) => {
      // Cinquenta e sete telas num caso só: o limite de 30 s do Playwright não
      // chega, e o que ele produzia era um tempo esgotado a meio da lista — que
      // se lê como defeito e não é.
      test.setTimeout(300_000);
      // Um caso por largura e não um por tela: são sessenta telas × cinco
      // larguras, e trezentos arranques de navegador custam mais do que a
      // granularidade vale. A mensagem de falha nomeia a tela.
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

test.describe('dívida de móvel a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px em todas', async ({ page }) => {
    test.setTimeout(300_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await alvosPequenos(page, 44);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('o contraste cumpre a WCAG em todas', async ({ page }) => {
    test.setTimeout(300_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await textosComPoucoContraste(page);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });
});

test.describe('a varredura mede mesmo sessenta telas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a lista tem as 60, e nenhuma repetida por engano', () => {
    // O controlo anti-verde-vazio desta prova. Sem ele, uma lista que encolhesse
    // — por um erro de edição, por um `filter` distraído — deixava telas por
    // medir e os casos acima continuavam verdes.
    expect(TELAS.length, `a lista tem ${TELAS.length} entradas`).toBe(60);
    const ids = TELAS.map((t) => t.id);
    expect(new Set(ids).size, 'há IDs repetidos na lista').toBe(60);
  });

  test('e nenhum endereço ficou com um identificador por resolver', () => {
    // `undefined` num endereço dá 404, e 404 mede a página de "não encontrado".
    for (const tela of TELAS) {
      expect(tela.caminho, `${tela.id} tem um identificador por resolver`)
        .not.toContain('undefined');
    }
  });
});
