import { expect, test } from '@playwright/test';
import { resolverAlvos } from './alvos.ts';

/**
 * Um componente claro dentro de uma superfície escura desaparece.
 *
 * ── A doença, três vezes ──────────────────────────────────────────────────
 *
 * 1.00:1 no E07, com um `var()` inexistente a pintar #102E35 sobre #102E35.
 * 1.00:1 nas peças claras dentro do `.bo-kds`. E 1.00:1 no botão primário, que
 * é a acção mais repetida da cozinha — `--bo-primaria` e
 * `--bo-superficie-inversa` são a MESMA cor.
 *
 * As duas primeiras foram curadas com 39 linhas de `.bo-kds .x { … }`: uma lista
 * de pares componente×superfície, escrita sempre DEPOIS de alguém dar pelo
 * defeito. A terceira apareceu na mesma, porque a lista não previne — regista.
 *
 * ── O que esta prova mede ─────────────────────────────────────────────────
 *
 * Não mede classes. Mede o RESULTADO em cada superfície: o que está desenhado
 * distingue-se do que está por trás? Um rácio de exactamente 1,00 quase nunca é
 * uma medição — é uma cor consigo própria, e é a assinatura desta família.
 */

const MINIMO_TEXTO = 4.5; // WCAG 1.4.3
const MINIMO_CAIXA = 3;   // WCAG 1.4.11, componentes

/**
 * Os contornos fracos já conhecidos. Tecto que só desce à mão.
 *
 * Esta prova encontrou uma quarta aparição da família, e maior do que a que me
 * foi apontada: NOVE controlos cujo contorno não delimita. Os campos têm
 * `--bo-borda: #D7DEDA`, que dá **1,29:1** contra o fundo da página onde a
 * 1.4.11 pede 3:1; e o botão secundário tem preenchimento a **1,17:1** com
 * `border: 1px solid transparent`. É defeito verdadeiro, escrito como
 * RV100-025.
 *
 * Não o curo aqui e a razão importa: mudar `--bo-borda` muda TODOS os campos do
 * produto, e um token de desenho global não é meu para decidir — foi-me pedido
 * o botão do KDS. Fica contado, com o número certo, para não passar por
 * ausência. Se aparecer um quinto, o tecto acende.
 */
const TECTO_CONTORNOS_FRACOS = 9;

/** Os controlos cujo contorno já se sabe fraco: campos e botão secundário. */
const CONTORNO_JA_CONHECIDO = /bo-campo__controlo|bo-botao--secundario|bo-botao bo-botao--s/;

test.describe('Superfícies: nada desaparece dentro do seu fundo', () => {
  test('texto e controlos distinguem-se do que está por trás', async ({ page }) => {
    test.setTimeout(600_000);
    const a = await resolverAlvos();
    await page.setViewportSize({ width: 1440, height: 900 });

    const superficies = [
      { id: 'KDS-estacao', url: `/es-ES/kds/${a.unidadeDoStaff}/${a.estacaoDeProducao}`, escura: true },
      { id: 'KDS-unidade', url: `/es-ES/kds/${a.unidadeDoStaff}`, escura: true },
      { id: 'AUTH-login', url: '/es-ES/auth/login', escura: true },
      { id: 'PAINEL-catalogo', url: '/es-ES/app/marina-oropesa/catalogo', escura: false },
    ];

    const maus: string[] = [];
    let medidos = 0;

    for (const s of superficies) {
      const r = await page.goto(s.url, { waitUntil: 'domcontentloaded' });
      expect(r?.status(), `POPULACAO-ZERO: ${s.id} devolveu ${r?.status()}`).toBe(200);
      const achados = await page.evaluate(([minTexto, minCaixa]) => {
        const lum = (c: string) => {
          const p = (c.match(/rgba?\(([^)]+)\)/)?.[1] ?? '').split(',').map(parseFloat);
          const f = (x: number) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(p[0] ?? 0) + 0.7152 * f(p[1] ?? 0) + 0.0722 * f(p[2] ?? 0);
        };
        const razao = (x: string, y: string) => {
          const a = lum(x), b = lum(y);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        // Um fundo com alfa não é um fundo, é uma camada: sobe-se até ao
        // primeiro OPACO, senão mede-se uma cor contra si própria.
        const opaco = (el: HTMLElement | null): string => {
          for (let n = el; n; n = n.parentElement) {
            const c = getComputedStyle(n).backgroundColor;
            if (c && !/rgba\(0, 0, 0, 0\)/.test(c) && !/,\s*0(\.\d+)?\)$/.test(c)) return c;
          }
          return getComputedStyle(document.body).backgroundColor;
        };
        const visivel = (el: HTMLElement) => {
          if (el.closest('[aria-hidden="true"]')) return false;
          const c = el.getBoundingClientRect();
          if (c.width <= 1 || c.height <= 1) return false;
          // Fora do ecrã não é visível. O `.bo-saltar` vive a `top: -100px` até
          // receber foco, e a primeira versão acusou-o de ter 1,1:1 — medindo
          // uma coisa que ninguém vê. É a mesma lição do texto só para leitores
          // de ecrã, e é a segunda vez que a aprendo.
          if (c.bottom < 0 || c.top > window.innerHeight) return false;
          if (c.right < 0 || c.left > window.innerWidth) return false;
          const s = getComputedStyle(el);
          return s.visibility !== 'hidden' && s.opacity !== '0';
        };
        const saida: Array<{ o: string; q: string; r: number }> = [];

        for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
          if (!visivel(el)) continue;
          const s = getComputedStyle(el);
          // 1. Uma caixa preenchida tem de se distinguir do que está atrás.
          const fundo = s.backgroundColor;
          const preenchida = fundo && !/rgba\(0, 0, 0, 0\)/.test(fundo) && !/,\s*0(\.\d+)?\)$/.test(fundo);
          if (preenchida) {
            // ── O que conta é NADA o delimitar ────────────────────────────
            //
            // A primeira versão acusava qualquer caixa com fundo parecido com o
            // de trás: 23 achados, e nenhum era o defeito. Um `div` de layout
            // pinta a mesma cor do pai de propósito, e um `input` branco sobre
            // creme distingue-se pela BORDA — que é o que delimita um campo.
            //
            // A assinatura desta família é outra: uma caixa preenchida que não
            // se distingue do fundo E não tem borda, contorno nem sombra. Aí
            // não há nada a dizer onde ela acaba, e foi isso que aconteceu ao
            // botão do KDS.
            // Uma borda TRANSPARENTE não delimita nada. A primeira versão
            // olhava só para a largura, e o `.bo-botao` tem
            // `border: 1px solid transparent` — foi essa linha que engoliu o
            // defeito exacto para que esta prova foi escrita: o controlo
            // negativo repôs o botão invisível e a guarda ficou verde.
            const opacaEContrasta = (cor: string, atras: string) =>
              !/rgba\(0, 0, 0, 0\)/.test(cor) && !/,\s*0(\.\d+)?\)$/.test(cor)
              && razao(cor, atras) >= minCaixa;
            const atrasDaCaixa = opaco(el.parentElement);
            const temBorda = (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0
              || parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0)
              && opacaEContrasta(s.borderTopColor, atrasDaCaixa);
            const temContorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
              && opacaEContrasta(s.outlineColor, atrasDaCaixa);
            const temSombra = s.boxShadow !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(s.boxShadow);
            const delimitada = temBorda || temContorno || temSombra;
            const interactiva = el.matches('button, a[href], input, select, textarea, [role="button"]');
            const rr = razao(fundo, atrasDaCaixa);
            if (!delimitada && interactiva && rr < minCaixa) {
              saida.push({ o: `controlo sem contorno ${el.tagName}.${String(el.className).slice(0, 20)}`, q: `${fundo} sobre ${atrasDaCaixa}`, r: Number(rr.toFixed(2)) });
            }
          }
          // 2. O texto tem de se distinguir do que está atrás DELE.
          const texto = (el.textContent ?? '').trim();
          if (el.children.length === 0 && texto.length > 0) {
            const atras = opaco(el);
            const rr = razao(s.color, atras);
            if (rr < minTexto) saida.push({ o: `texto «${texto.slice(0, 18)}»`, q: `${s.color} sobre ${atras}`, r: Number(rr.toFixed(2)) });
          }
        }
        return saida;
      }, [MINIMO_TEXTO, MINIMO_CAIXA] as [number, number]);

      medidos += 1;
      for (const x of achados) maus.push(`${s.id} · ${x.o} · ${x.q} = ${x.r}:1`);
    }

    // Os contornos fracos contam-se à parte: são um defeito conhecido e
    // declarado, e misturá-los com o resto fazia a guarda nascer vermelha por
    // uma razão que não é a dela — e uma guarda assim ensina a ser ignorada.
    const contornos = maus.filter((m) => CONTORNO_JA_CONHECIDO.test(m));
    const outros = maus.filter((m) => !CONTORNO_JA_CONHECIDO.test(m));

    // ── E o coral não entra nas superfícies do SERVIÇO ────────────────────
    //
    // O manual é textual: o coral e o cítrico não disputam atenção com o estado
    // dos pedidos. No KDS o coral estava na NAVEGAÇÃO — a secção activa levava
    // `--bo-acento-sinal` na borda — e num ecrã lido a metro e meio o olho vai
    // ao saturado antes de ir ao bilhete atrasado.
    //
    // Mede-se a cor RESOLVIDA e não a regra: as duas que disputavam tinham a
    // mesma especificidade e ganhava a última do ficheiro, coisa que muda quando
    // alguém arruma o CSS.
    const coral: string[] = [];
    for (const s of superficies.filter((x) => x.escura)) {
      await page.goto(s.url, { waitUntil: 'domcontentloaded' });
      const achados = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((el) => {
          const st = getComputedStyle(el);
          return [st.color, st.backgroundColor, st.borderTopColor, st.borderBottomColor,
            st.borderLeftColor, st.borderRightColor].some((c) => /rgb\(216, 90, 68\)/.test(c));
        })
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 24)}`));
      for (const x of achados) coral.push(`${s.id} · ${x}`);
    }
    console.log(`CORAL escuras=${superficies.filter((x) => x.escura).length} ocorrencias=${coral.length}`);
    expect(coral, `o coral está nas superfícies do serviço, a disputar atenção com o estado dos pedidos:\n${coral.slice(0, 6).join('\n')}`)
      .toEqual([]);

    console.log(`AMBITO superficies=${superficies.length} medidas=${medidos} maus=${outros.length}`
      + ` contornosFracos=${contornos.length} tecto=${TECTO_CONTORNOS_FRACOS}`);
    for (const c of contornos.slice(0, 4)) console.log(`CONTORNO-FRACO ${c}`);

    expect(contornos.length, `contornos fracos subiram para ${contornos.length} (tecto ${TECTO_CONTORNOS_FRACOS}) — RV100-025`)
      .toBeLessThanOrEqual(TECTO_CONTORNOS_FRACOS);
    expect(medidos, 'POPULACAO-ZERO: nenhuma superfície foi medida').toBe(superficies.length);
    expect(outros, `há coisas a desaparecer dentro do seu fundo:\n${outros.slice(0, 12).join('\n')}`).toEqual([]);
  });
});
