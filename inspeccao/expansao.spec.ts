import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { resolverAlvos, type Alvos } from './alvos.ts';
import { universo, resolverRota, TECTO_DA_DIVIDA } from './ecras-derivados.ts';

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
  maus: Array<{ caminho: string; texto: string; excesso: number; prova: string }>;
}

async function transbordos(page: Page): Promise<Medicao> {
  return page.evaluate(() => {
    const maus: Array<{ caminho: string; texto: string; excesso: number; prova: string }> = [];
    let medidos = 0;

    // ── Identidade do elemento, e não o texto dele ─────────────────────────
    //
    // Este caminho existe por causa de um erro meu que só apareceu quando a
    // guarda passou de 3 para 281 ecrãs. Eu guardava os textos que transbordam
    // em inglês e comparava-os com os textos que transbordam em espanhol, para
    // descontar o que já era defeito de desenho. Só que «Postal code» nunca é
    // igual a «Código postal»: o desconto era LETRA MORTA e a guarda acusava de
    // tradução o que já estava partido em inglês. Um elemento é o mesmo nas três
    // línguas pelo sítio que ocupa na árvore, não pelo que diz.
    const caminhoDe = (el: HTMLElement): string => {
      const partes: string[] = [];
      let n: HTMLElement | null = el;
      while (n && n !== document.body) {
        const pai: HTMLElement | null = n.parentElement;
        if (!pai) break;
        partes.unshift(`${n.tagName}:${Array.prototype.indexOf.call(pai.children, n)}`);
        n = pai;
      }
      return partes.join('>');
    };
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
      // Uma caixa de 1 px que esconde o que passa torna invisível TUDO o que
      // está lá dentro, e não só a si própria. O `<th>` acusado media 80 px e
      // estava dentro do ecrã: quem o escondia era um `<thead>` de 1 px com
      // `overflow:hidden`, o cabeçalho de tabela que o telemóvel troca por
      // cartões. Terceira vez hoje que é a mesma receita — a regra («excluir
      // pela propriedade, não pelo nome da classe») estava certa e eu tinha-a
      // aplicado a um nível só.
      const escondido = (() => {
        for (let a: HTMLElement | null = el; a && a !== document.documentElement; a = a.parentElement) {
          const sa = getComputedStyle(a);
          if (sa.visibility === 'hidden' || sa.display === 'none' || sa.opacity === '0') return true;
          const ba = a.getBoundingClientRect();
          if ((ba.width <= 1 || ba.height <= 1) && /hidden|clip/.test(`${sa.overflowX}${sa.overflowY}`)) return true;
        }
        return false;
      })();
      if (escondido) continue;
      if (caixa.width <= 1 || caixa.height <= 1) continue;
      if (caixa.right <= 0 || caixa.left >= window.innerWidth) continue;

      medidos += 1;

      // ── O que «não caber» quer mesmo dizer ────────────────────────────────
      //
      // A primeira versão fazia `caixa.right - pai.right`. Com 281 ecrãs isso
      // rebentou: acusou um `<th>` de sair 147 px do `<tr>`, e um `<tr>` tem
      // caixa de 32 px porque a caixa de uma linha de tabela não é o contentor
      // de nada. O texto não estava cortado — `scrollWidth` era igual ao
      // `clientWidth`. Media a distância a um pai arbitrário e chamava-lhe
      // transbordo.
      //
      // O defeito que esta guarda persegue é texto que fica INVISÍVEL por ser
      // maior do que o sítio onde o puseram. Isso tem três formas, e só três:
      const estilos = getComputedStyle(el);

      //   1. o próprio elemento corta o seu texto (o `text-overflow` clássico)
      const proprioCorta = /hidden|clip/.test(estilos.overflowX);
      const cortado = proprioCorta ? el.scrollWidth - el.clientWidth : 0;

      //   2. um antepassado esconde o que passa da borda dele. Só `hidden` e
      //      `clip` contam: `auto` e `scroll` são scroll POR DESENHO, e um
      //      painel que rola não é uma tradução que não cabe.
      let porAntepassado = 0;
      let rolavel = false;
      let quemCorta = '';
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const sa = getComputedStyle(a);

        // Um antepassado que não sabe dizer a sua largura não pode julgar
        // transbordo. `tr`, `thead` e `tbody` têm `clientWidth` ZERO — não é
        // uma caixa de 0 px, é a ausência de caixa de cliente. Tratei esse zero
        // como borda interior e acusei um `<th>` de sair 178 px de uma linha
        // cuja borda direita eu tinha calculado em 41 px, com o `<th>` inteiro
        // visível dentro do ecrã e o texto por cortar. É o mesmo erro do `<tr>`
        // de 32 px, uma camada acima: usar um número que existe para responder
        // a uma pergunta que ele não responde.
        if (a.clientWidth === 0) continue;

        if (/auto|scroll/.test(sa.overflowX)) { rolavel = true; break; }
        if (/hidden|clip/.test(sa.overflowX)) {
          const ca = a.getBoundingClientRect();
          const borda = parseFloat(sa.borderLeftWidth) || 0;
          porAntepassado = Math.round(caixa.right - (ca.left + borda + a.clientWidth));
          quemCorta = `${a.tagName}.${String(a.className).slice(0, 24)}`
            + `[${sa.display} ovX=${sa.overflowX} caixa=${Math.round(ca.left)}..${Math.round(ca.right)} clientW=${a.clientWidth}]`;
          break;
        }
      }

      //   3. sai do ecrã, e não há nada por onde o alcançar. Se algum
      //      antepassado rola na horizontal, o texto está lá — é chegar-lhe.
      const foraDoEcra = rolavel ? 0 : Math.round(caixa.right - document.documentElement.clientWidth);

      const excesso = Math.max(cortado, porAntepassado, foraDoEcra);

      // ── A falha carrega a sua própria prova ───────────────────────────────
      //
      // Gastei três sondas por fora a tentar perceber uma acusação, e a página
      // já tinha mudado entre a acusação e a verificação. Uma medição que não
      // diz COMO mediu obriga a repetir a corrida para a julgar — e a corrida
      // seguinte é outro estado do mundo.
      const regra = excesso === cortado ? 'cortado-em-si'
        : excesso === porAntepassado ? 'cortado-por-antepassado'
          : 'fora-do-ecra';
      if (excesso > 1) {
        maus.push({
          caminho: caminhoDe(el),
          texto: texto.slice(0, 80),
          excesso,
          prova: `${regra} ${el.tagName} caixa=${Math.round(caixa.left)}..${Math.round(caixa.right)}`
            + ` ecra=${document.documentElement.clientWidth} scroll=${el.scrollWidth}/${el.clientWidth}`
            + (quemCorta ? ` corta=${quemCorta}` : ''),
        });
      }
    }
    return { medidos, maus };
  });
}

/**
 * O endereço de um ecrã do atlas, na língua pedida.
 *
 * ── Uma armadilha que quase passou ────────────────────────────────────────
 *
 * O router é `app/[idioma]/…`, mas **333 das 380 rotas do atlas estão escritas
 * sem o prefixo** (`/app/[orgSlug]/…`). Pedir uma delas assim devolve 200 — e
 * não porque funcione: o servidor **redirige para `/es-ES`**, o idioma por
 * omissão. A minha primeira sonda visitou 12 ecrãs «em inglês» e mediu espanhol
 * nos doze, e a linha base em inglês teria sido espanhol comparado consigo
 * próprio. Daí a normalização aqui, e daí os dois controlos em `medir`.
 */
function enderecoNa(molde: string, alvos: Alvos, lingua: string): string | null {
  const semPrefixo = molde.replace(/^\/\[(locale|idioma)\]/, '');
  const resolvido = resolverRota(semPrefixo, alvos, lingua);
  return resolvido === null ? null : `/${lingua}${resolvido}`;
}

type Falha = { porque: 'estado' | 'lingua' | 'vazio'; detalhe: string };

/** Mede um ecrã numa língua, ou diz porque não o mediu. Nunca finge que mediu. */
async function medir(
  page: Page, molde: string, alvos: Alvos, lingua: string,
): Promise<{ ok: true; medicao: Medicao } | { ok: false; falha: Falha }> {
  const endereco = enderecoNa(molde, alvos, lingua);
  if (endereco === null) return { ok: false, falha: { porque: 'vazio', detalhe: 'rota não resolve' } };

  const resposta = await page.goto(endereco, { waitUntil: 'domcontentloaded' });

  // ── Controlo 1: a página existe ──────────────────────────────────────────
  // A página de «não encontrado» TEM texto, e está traduzida. Sem isto ela
  // entrava na contagem como se fosse um ecrã do produto, e o denominador
  // passava a mentir para cima — que é a forma de um âmbito enganar.
  const estado = resposta?.status() ?? 0;
  if (estado !== 200) return { ok: false, falha: { porque: 'estado', detalhe: `${estado} em ${endereco}` } };

  // ── Controlo 2: é MESMO a língua que eu pedi ─────────────────────────────
  // Comparar `en` com `es-ES` só significa alguma coisa se as duas visitas
  // forem a línguas diferentes. Se o caminho final não começa pela língua
  // pedida, houve desvio e o que se mediria era uma página contra si própria.
  const caminho = new URL(page.url()).pathname;
  if (!caminho.startsWith(`/${lingua}/`) && caminho !== `/${lingua}`) {
    return { ok: false, falha: { porque: 'lingua', detalhe: `pedi ${lingua}, dei em ${caminho}` } };
  }

  const medicao = await transbordos(page);
  if (medicao.medidos === 0) return { ok: false, falha: { porque: 'vazio', detalhe: endereco } };
  return { ok: true, medicao };
}

test.describe('A tradução cresce, e o ecrã não cresce com ela', () => {
  test('o que cabe em inglês tem de caber na língua do piloto', async ({ page }) => {
    test.setTimeout(600_000);
    const alvos = await resolverAlvos();
    const en = idioma('en');

    // ── População primeiro ────────────────────────────────────────────────
    //
    // Zero candidatas não é «não há risco»: é o leitor cego. Se as três línguas
    // tiverem o mesmo tamanho, ou se os ficheiros não se lerem, esta prova não
    // mede nada — e tem de o dizer em vez de passar.
    const porLingua = { 'es-ES': candidatas(en, idioma('es-ES')), 'pt-BR': candidatas(en, idioma('pt-BR')) };
    const total = porLingua['es-ES'].length + porLingua['pt-BR'].length;
    expect(total, 'POPULACAO-ZERO: nenhuma cadeia cresce 30% — o leitor está cego ou os ficheiros são iguais')
      .toBeGreaterThan(0);

    // ── O universo, derivado e não escolhido ──────────────────────────────
    const chaves = [...new Set([...porLingua['es-ES'], ...porLingua['pt-BR']].map((c) => c.chave))];
    const u = universo(chaves, alvos, 'en');
    expect(u.divida.length, `a dívida de namespaces sem código subiu para ${u.divida.length} (tecto ${TECTO_DA_DIVIDA}): ${u.divida.join(' ')}`)
      .toBeLessThanOrEqual(TECTO_DA_DIVIDA);

    await page.setViewportSize(LARGURA_APERTADA);

    const linhas: string[] = [];
    const naoMedidos: string[] = [];
    let medidos = 0;

    for (const ecra of u.visitaveis) {
      // O inglês primeiro: é ele que diz o que era para caber.
      const base = await medir(page, ecra.molde, alvos, 'en');
      if (!base.ok) { naoMedidos.push(`${ecra.id} en:${base.falha.porque}`); continue; }
      const jaTransbordavaEmIngles = new Set(base.medicao.maus.map((t) => t.caminho));
      medidos += 1;

      for (const lingua of ['es-ES', 'pt-BR'] as const) {
        const outra = await medir(page, ecra.molde, alvos, lingua);
        if (!outra.ok) { naoMedidos.push(`${ecra.id} ${lingua}:${outra.falha.porque}`); continue; }
        for (const t of outra.medicao.maus) {
          if (jaTransbordavaEmIngles.has(t.caminho)) continue; // desenho, não tradução
          linhas.push(`${ecra.id} · ${lingua} · +${t.excesso}px · «${t.texto}» · ${t.prova}`);
        }
      }
    }

    // ── O ÂMBITO, para o guião o poder imprimir no fecho ───────────────────
    //
    // Um verde chamado `validar-expansao-de-texto` lê-se como «a expansão está
    // tratada». Só é verdade dentro do denominador, e numa varredura de 36
    // guardas o nome e o código de saída atravessam mas o qualificador não.
    // Por isso o número sai daqui em linha própria, e o guião repete-o no fecho.
    console.log(
      `AMBITO medidos=${medidos} candidatos=${u.visitaveis.length}`
      + ` semEndereco=${u.semEndereco.length} porResolver=${u.porResolver.length}`
      + ` divida=${u.divida.length} chaves=${chaves.length}`,
    );
    for (const n of naoMedidos.slice(0, 20)) console.log(`NAO-MEDIDO ${n}`);

    // Um universo derivado que não deu um único ecrã medido é o leitor cego
    // outra vez — e agora com mais formas de cegar: o atlas mudar de colunas, o
    // arnês não ter sessão, o prefixo de língua deixar de existir.
    expect(medidos, `POPULACAO-ZERO: nenhum dos ${u.visitaveis.length} ecrãs derivados deu texto para medir`)
      .toBeGreaterThan(0);

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
