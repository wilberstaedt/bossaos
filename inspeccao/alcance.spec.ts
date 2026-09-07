import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { resolverAlvos } from './alvos.ts';
import { classificar, endereçoDe, normalizar, SEM_RESOLUCAO_HOJE, RAIZ_DO_PUBLICO, PISO_DE_PORTAS_ABERTAS } from './alcance.ts';

/**
 * O ENUMERADOR das 792 composições — e não as capturas.
 *
 * 792 = 396 IDs × duas superfícies (AF100 linha 130). Isto enumera e classifica
 * os 396; as imagens vêm depois da aprovação humana do §12.4, porque o §8
 * propaga o redesenho a todas as telas e uma captura de hoje é uma fotografia
 * de um desenho que vai mudar.
 *
 * ── O que é medido aqui, e o que é apenas derivado ────────────────────────
 *
 * DERIVADO do atlas: como se alcança cada ID (só-URL, estado-partilhado, ou
 * provocar) e o que lhe falta em parâmetros.
 *
 * MEDIDO no navegador: se o endereço abre HOJE. «Alcançável» é uma afirmação
 * sobre o mundo, e uma afirmação sobre o mundo não se deriva de um CSV. Cada
 * endereço resolvível é visitado, e conta como aberto só com estado 200 **e**
 * com o caminho final na língua pedida — porque 333 das 380 rotas do atlas não
 * trazem prefixo de língua e, pedidas assim, devolvem 200 depois de desviarem
 * para `/es-ES`.
 */

const MAPA = 'docs/progress/alcance-das-composicoes.csv';
const LINGUA = 'en';

interface Porta { endereco: string; estado: number; caminhoFinal: string; abriu: boolean }

async function bater(page: Page, endereco: string): Promise<Porta> {
  // ── Um ponto de API não se navega, pede-se ──────────────────────────────
  //
  // O atlas tem um endereço que devolve um ficheiro (`qr.svg`). O `page.goto`
  // rebentou com «Download is starting», e a leitura ingénua disso seria «a
  // porta está fechada». Não está: não é uma porta, é um recurso. Mede-se com
  // um pedido, e o que se afere é o estado — não há língua no caminho de um SVG.
  if (endereco.startsWith('/api/')) {
    const r = await page.request.get(endereco);
    return { endereco, estado: r.status(), caminhoFinal: endereco, abriu: r.status() === 200 };
  }

  const resposta = await page.goto(endereco, { waitUntil: 'domcontentloaded' });
  const estado = resposta?.status() ?? 0;
  const caminhoFinal = new URL(page.url()).pathname;
  const naLingua = caminhoFinal.startsWith(`/${LINGUA}/`) || caminhoFinal === `/${LINGUA}`;
  return { endereco, estado, caminhoFinal, abriu: estado === 200 && naLingua };
}

test.describe('As 792 composições: por onde se lá chega', () => {
  test('o mapa de alcance, medido e não presumido', async ({ page }) => {
    test.setTimeout(900_000);
    const alvos = await resolverAlvos();
    const composicoes = classificar(alvos);

    // ── População, antes de medir seja o que for ──────────────────────────
    //
    // O atlas está fechado em 396. Um número diferente aqui não é um atlas que
    // mudou — é o leitor partido, e a resposta certa é NÃO MEDI e não um mapa
    // com menos linhas do que devia.
    expect(composicoes.length, `POPULACAO-ZERO: o atlas deu ${composicoes.length} composições e não 396`)
      .toBe(396);

    const porta = new Map<string, Porta>();
    const enderecos = [...new Set(
      composicoes
        .filter((c) => c.endereco !== null && c.falta.length === 0)
        .map((c) => c.endereco as string),
    )].sort();
    expect(enderecos.length, 'POPULACAO-ZERO: nenhum endereço resolve — o arnês não deu alvos')
      .toBeGreaterThan(0);

    for (const e of enderecos) {
      const concreto = endereçoDe(e, alvos, LINGUA);
      if (concreto === null) continue;
      porta.set(e, await bater(page, concreto));
    }

    // ── SONDA, dentro da mesma corrida ────────────────────────────────────
    //
    // Um detector de portas que nunca foi visto a dizer «fechada» pode estar a
    // dizer «aberta» a tudo. Pego num endereço que ABRIU e acrescento-lhe um
    // segmento que não existe: tem de fechar. Sem isto, um `abriu` que fosse
    // sempre verdadeiro daria um mapa inteiro de mentiras com ar de medição.
    const umQueAbriu = [...porta.values()].find((p) => p.abriu);
    expect(umQueAbriu, 'SONDA: nenhuma porta abriu — não há com que provar o vermelho').toBeTruthy();
    const inventado = await bater(page, `${umQueAbriu?.endereco ?? '/'}/nao-existe-de-todo-xyz`);
    expect(inventado.abriu, `SONDA: um endereço inventado foi dado como aberto (estado ${inventado.estado}) — o detector diz «aberta» a tudo`)
      .toBe(false);

    // ── O mapa ────────────────────────────────────────────────────────────
    const linhas = ['id,etapa,natureza,como,endereco,abre_hoje,falta,irmaos'];
    for (const c of composicoes) {
      const p = c.endereco === null ? undefined : porta.get(c.endereco);
      const abre = c.endereco === null ? 'nao-tem-endereco'
        : c.falta.length > 0 ? 'bloqueado'
          : p === undefined ? 'nao-visitado'
            : p.abriu ? 'sim' : `nao(${p.estado})`;
      const falta = c.falta.length > 0 ? c.falta.join(' ') : (c.provocarComo ?? '');
      linhas.push([c.id, c.etapa, `"${c.natureza}"`, c.como, c.endereco ?? '', abre, `"${falta}"`, String(c.irmaos.length)].join(','));
    }
    // CRLF por causa do `.gitattributes` (`*.csv text eol=crlf`). Escrevi-o em
    // LF à primeira e a árvore ficava limpa nesta máquina e SUJA em qualquer
    // checkout novo — o ficheiro apareceria modificado a cada corrida. É a
    // mesma dor que o `.gitattributes` já documenta: a 03/09 o `coverage.csv`
    // virou CRLF e escondeu 12 mudanças reais no meio de 397.
    writeFileSync(MAPA, `${linhas.join('\r\n')}\r\n`);

    // ── O ÂMBITO ──────────────────────────────────────────────────────────
    const conta = (f: (c: (typeof composicoes)[number]) => boolean) => composicoes.filter(f).length;
    const abertos = composicoes.filter((c) => c.endereco !== null && c.falta.length === 0 && porta.get(c.endereco)?.abriu);
    const soUrlAbertos = abertos.filter((c) => c.como === 'so-url').length;
    console.log(
      `AMBITO ids=${composicoes.length} enderecos=${enderecos.length}`
      + ` soUrl=${conta((c) => c.como === 'so-url')}`
      + ` partilhado=${conta((c) => c.como === 'estado-partilhado')}`
      + ` provocar=${conta((c) => c.como === 'provocar')}`
      + ` portasAbertas=${[...porta.values()].filter((p) => p.abriu).length}/${porta.size}`
      + ` idsQueAbrem=${abertos.length} prontosJa=${soUrlAbertos}`
      + ` bloqueados=${conta((c) => c.falta.length > 0)}`,
    );
    for (const p of [...porta.values()].filter((x) => !x.abriu).slice(0, 12)) {
      console.log(`PORTA-FECHADA ${p.endereco} -> ${p.estado} ${p.caminhoFinal}`);
    }
    console.log(`SEM-RESOLUCAO ${SEM_RESOLUCAO_HOJE.join(' ')} · ${RAIZ_DO_PUBLICO}`);

    // A partição tem de fechar. Se não fechar, o mapa não é um mapa.
    expect(conta((c) => c.como === 'so-url') + conta((c) => c.como === 'estado-partilhado') + conta((c) => c.como === 'provocar'))
      .toBe(396);

    // ── O piso: é isto que faz desta contagem uma guarda ──────────────────
    const abertas = [...porta.values()].filter((p) => p.abriu).length;
    expect(abertas, `portas abertas caíram para ${abertas} (piso ${PISO_DE_PORTAS_ABERTAS}) — alguma rota deixou de responder`)
      .toBeGreaterThanOrEqual(PISO_DE_PORTAS_ABERTAS);

    // E o mapa não pode ficar em branco por dentro: se nenhuma porta abriu, o
    // que se escreveu foi uma folha de «não» que parece um levantamento.
    expect(abertos.length, 'POPULACAO-ZERO: o mapa não tem uma única composição que abra — isso é o arnês em baixo, não o produto')
      .toBeGreaterThan(0);
  });

  test('e a normalização do endereço não inventa fusões', () => {
    // Controlo do outro lado: normalizar junta `/[idioma]/x` com `/x`, e uma
    // normalização demasiado larga juntaria telas diferentes no mesmo endereço
    // — inflando «estado-partilhado» e escondendo telas que só-URL alcança.
    expect(normalizar('/[idioma]/platform')).toBe('/platform');
    expect(normalizar('/platform')).toBe('/platform');
    expect(normalizar('/app/[orgSlug]/organization')).toBe('/app/[orgSlug]/organization');
    expect(normalizar('/pos/[locationId]')).not.toBe(normalizar('/kds/[locationId]'));
  });
});
