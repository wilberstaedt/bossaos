import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * O texto CRESCE quando se traduz, e o ecrã não cresce com ele.
 *
 * ── O caso não é hipotético, e está medido ────────────────────────────────
 *
 * Contra o inglês, o `es-ES` cresce em média **1,09×** sobre as 1322 cadeias de
 * 12 ou mais caracteres, e **189 delas (14%) crescem 30% ou mais**. O `es-ES` é
 * a língua do PILOTO — La Societat, Castellón — e por isso não é uma língua
 * entre outras: é aquela em que o produto vai ser usado primeiro.
 *
 * O pico é o `integracoesE32.reprocessar`: «Retry safely» passa a «Reintenta de
 * forma segura», **2,08×**. Logo a seguir o `kdsE16.estacao`, «Your station»
 * para «Tu estación de trabajo» — e o KDS é a superfície com **menos folga**,
 * porque corre a 18 px por ser lido ao longe.
 *
 * ── Transbordo mede-se no DOM, não em letras ──────────────────────────────
 *
 * Contar caracteres diz que uma cadeia é comprida; não diz que ela não cabe.
 * Quem decide é a caixa: `getBoundingClientRect` e `scrollWidth`. Uma cadeia de
 * 60 caracteres cabe num painel largo e não cabe num cartão de fila.
 *
 * ── E o que se mede é a DIFERENÇA, não o transbordo ───────────────────────
 *
 * Um ecrã que transborda nas três línguas tem um defeito de desenho, e há outra
 * guarda para isso. Esta existe para o defeito que só aparece traduzido: **cabe
 * em inglês e não cabe em espanhol**. Por isso cada ecrã é medido primeiro em
 * `en`, e só o que lá cabia conta como falha aqui.
 */

const RAZAO_MINIMA = 1.30;
const LARGURA_APERTADA = { width: 360, height: 780 };

type Cadeias = Record<string, string>;

function folhas(o: Record<string, unknown>, pref = ''): Cadeias {
  const saida: Cadeias = {};
  for (const [k, v] of Object.entries(o)) {
    const nome = pref ? `${pref}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(saida, folhas(v as Record<string, unknown>, nome));
    else saida[nome] = String(v);
  }
  return saida;
}

const idioma = (n: string): Cadeias =>
  folhas(JSON.parse(readFileSync(`packages/i18n/src/mensagens/${n}.json`, 'utf8')) as Record<string, unknown>);

/** As cadeias que crescem o suficiente para valer a pena ir ver ao ecrã. */
function candidatas(base: Cadeias, outra: Cadeias): Array<{ chave: string; razao: number; texto: string }> {
  return Object.entries(base)
    .filter(([, v]) => v.length >= 12)
    .map(([k, v]) => ({ chave: k, razao: (outra[k]?.length ?? 0) / v.length, texto: outra[k] ?? '' }))
    .filter((c) => c.razao >= RAZAO_MINIMA)
    .sort((a, b) => b.razao - a.razao);
}

/**
 * O que transborda nesta página, medido na caixa.
 *
 * Duas formas, porque são dois defeitos: o texto cortado dentro do seu elemento
 * (`scrollWidth` maior do que `clientWidth`) e o elemento a sair da caixa do pai
 * (a direita dele para lá da direita do pai). A primeira esconde palavras, a
 * segunda parte a página.
 */
interface Medicao {
  /** Quantos elementos de texto foram efectivamente medidos nesta página. */
  medidos: number;
  maus: Array<{ texto: string; excesso: number }>;
}

async function transbordos(page: Page): Promise<Medicao> {
  return page.evaluate(() => {
    const maus: Array<{ texto: string; excesso: number }> = [];
    let medidos = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const texto = (el.textContent ?? '').trim();
      if (texto.length < 12 || el.children.length > 0) continue;
      const caixa = el.getBoundingClientRect();

      // ── O que não é lido com os olhos não transborda aos olhos ───────────
      //
      // O `bo-so-leitor` é a receita canónica do texto só para leitores de
      // ecrã: caixa de 1 px e `clip-path: inset(50%)`. Medido à letra, ele
      // «transborda» +223 px sempre — e isso não é um defeito, é o desenho a
      // funcionar. O que se exclui aqui é a PROPRIEDADE (a caixa renderizada
      // não é visível), não o nome da classe: excluir por nome era voltar a
      // medir a grafia em vez do facto, e era mentir no dia em que a classe
      // mudasse de nome.
      const estilo = getComputedStyle(el);
      const invisivel =
        caixa.width <= 1 ||
        caixa.height <= 1 ||
        estilo.visibility === 'hidden' ||
        estilo.opacity === '0' ||
        caixa.right <= 0 ||
        caixa.left >= window.innerWidth;
      if (invisivel) continue;

      medidos += 1;
      const cortado = el.scrollWidth - el.clientWidth;
      const pai = el.parentElement?.getBoundingClientRect();
      const saiu = pai ? Math.round(caixa.right - pai.right) : 0;
      const excesso = Math.max(cortado, saiu);
      if (excesso > 1) maus.push({ texto: texto.slice(0, 80), excesso });
    }
    return { medidos, maus };
  });
}

interface Ecra { id: string; caminho: (a: Alvos, l: string) => string; porque: string }

/**
 * Os ecrãs onde as cadeias que mais crescem vivem.
 *
 * É uma lista, e uma lista envelhece — mas a alternativa era mapear chave para
 * ecrã por adivinhação. Estes dois são os que a medição nomeou: o `kdsE16` e o
 * `integracoesE32` são os namespaces das duas cadeias de topo.
 */
const ECRAS: Ecra[] = [
  {
    id: 'KDS-001',
    caminho: (a, l) => `/${l}/kds/${a.unidadeDoStaff}`,
    porque: 'a superfície com menos folga: corre a 18 px por ser lida ao longe',
  },
  {
    id: 'KDS-002',
    caminho: (a, l) => `/${l}/kds/${a.unidadeDoStaff}/${a.estacaoDeProducao}`,
    porque: 'a fila da estação, onde os cartões são estreitos por desenho',
  },
  {
    id: 'INT-008',
    caminho: (_a, l) => `/${l}/app/marina-oropesa/puerto/integrations/chaves`,
    porque: 'onde vive o `integracoesE32.reprocessar`, a cadeia que mais cresce',
  },
];

test.describe('A tradução cresce, e o ecrã não cresce com ela', () => {
  test('o que cabe em inglês tem de caber na língua do piloto', async ({ page }) => {
    const alvos = await resolverAlvos();
    const en = idioma('en');
    const linhas: string[] = [];

    // ── População primeiro ────────────────────────────────────────────────
    //
    // Zero candidatas não é «não há risco»: é o leitor cego. Se as três línguas
    // tiverem o mesmo tamanho, ou se os ficheiros não se lerem, esta prova não
    // mede nada — e tem de o dizer em vez de passar.
    const porLingua = { 'es-ES': candidatas(en, idioma('es-ES')), 'pt-BR': candidatas(en, idioma('pt-BR')) };
    const total = porLingua['es-ES'].length + porLingua['pt-BR'].length;
    expect(total, 'POPULACAO-ZERO: nenhuma cadeia cresce 30% — o leitor está cego ou os ficheiros são iguais')
      .toBeGreaterThan(0);

    await page.setViewportSize(LARGURA_APERTADA);

    for (const ecra of ECRAS) {
      // O inglês primeiro: é ele que diz o que era para caber.
      await page.goto(ecra.caminho(alvos, 'en'));
      await page.waitForLoadState('networkidle');
      const emIngles = await transbordos(page);

      // O filtro do invisível pode, ele próprio, esvaziar a população. Se um
      // ecrã não deu UM elemento para medir, não há verde possível: ou a rota
      // não abriu, ou o detector passou a excluir tudo.
      // O prefixo é um sinal para o guião: população vazia é NÃO MEDI (saída 2),
      // e não «o texto não cabe» (saída 1). Sem ele, um ecrã que deixasse de
      // abrir seria reportado como um defeito de tradução que não existe.
      expect(emIngles.medidos, `POPULACAO-ZERO: ${ecra.id} não deu texto nenhum para medir em inglês — ${ecra.porque}`)
        .toBeGreaterThan(0);
      const cabiaEmIngles = new Set(emIngles.maus.map((t) => t.texto));

      for (const lingua of ['es-ES', 'pt-BR'] as const) {
        await page.goto(ecra.caminho(alvos, lingua));
        await page.waitForLoadState('networkidle');
        for (const t of (await transbordos(page)).maus) {
          if (cabiaEmIngles.has(t.texto)) continue; // já transbordava em inglês: é desenho, não tradução
          linhas.push(`${ecra.id} · ${lingua} · +${t.excesso}px · «${t.texto}»`);
        }
      }
    }

    expect(linhas, `o texto traduzido não cabe onde o inglês cabia:\n${linhas.join('\n')}`)
      .toEqual([]);
  });

  test('SONDA: o detector consegue ficar VERMELHO', async ({ page }) => {
    // ── Sem isto, um detector partido diz «nada transborda» para sempre ───
    //
    // A sonda injecta a cadeia no DOM e não no ficheiro: os ficheiros de i18n
    // estão a ser editados por outro agente enquanto isto corre, e escrever
    // neles — mesmo para repor — era mexer no trabalho de quem está a trabalhar.
    // O que aqui se prova é a MEDIÇÃO, que é a parte que pode estar cega.
    const alvos = await resolverAlvos();
    await page.setViewportSize(LARGURA_APERTADA);
    await page.goto(`/en/kds/${alvos.unidadeDoStaff}`);
    await page.waitForLoadState('networkidle');

    const antes = (await transbordos(page)).maus.length;
    await page.evaluate(() => {
      const caixa = document.createElement('div');
      caixa.style.cssText = 'width:80px;overflow:hidden;white-space:nowrap';
      const dentro = document.createElement('span');
      dentro.textContent = 'Reintenta de forma segura y vuelve a intentarlo más tarde';
      caixa.appendChild(dentro);
      document.body.appendChild(caixa);
    });
    const depois = (await transbordos(page)).maus;
    expect(depois.length, 'a cadeia longa injectada não fez o detector acender')
      .toBeGreaterThan(antes);
    expect(depois.some((t) => t.texto.includes('Reintenta de forma segura'))).toBe(true);
  });
});
