import { expect, test } from '@playwright/test';

/**
 * RV100-024, a medição que faltava: o CÓDIGO que sai, e não quem chama o quê.
 *
 * ── Porque é que esta prova existe ────────────────────────────────────────
 *
 * A primeira guarda deste achado media ADOPÇÃO: contava páginas que alcançam um
 * invólucro que traduz, e deu **128 de 128 verde** enquanto duas rotas reais
 * devolviam **500**. Um número de cobertura não é um resultado — e foi por isso
 * que o revisor fechou o achado com o defeito lá dentro.
 *
 * O que aqui se mede é o que o cliente recebe. Um id mal formado numa rota que
 * EXISTE tem de dar 404. Um caminho inventado dá 404 por outra razão e não
 * prova nada: por isso cada rota medida é uma rota do produto, e cada uma leva
 * o seu par de controlo com um UUID válido que não existe — se esse não der
 * 404 também, o que se está a medir não é a forma do id.
 *
 * ── Os dois caminhos, e a diferença que os separou ────────────────────────
 *
 * A sessão perguntava `instanceof` e o ecrã perguntava `code`. A classe não
 * copiava o `code`, portanto as duas verificações nunca podiam concordar: no
 * mesmo build, a sessão dava 500 e o ecrã dava 404. Ambos os caminhos são
 * medidos aqui, e é isso que impede a cura de voltar a ser meia.
 */

/** Uma rota do produto, o id mal formado, e o par de controlo. */
interface Alvo { id: string; caminho: string; via: 'sessao' | 'ecra'; controlo: string }

const UUID_INEXISTENTE = '11111111-2222-4333-8444-555555555555';
const MAL_FORMADO = 'nao-e-um-uuid';

const ALVOS: Alvo[] = [
  {
    id: 'ORG-unidades',
    via: 'sessao',
    caminho: `/es-ES/app/marina-oropesa/organization/unidades/${MAL_FORMADO}`,
    controlo: `/es-ES/app/marina-oropesa/organization/unidades/${UUID_INEXISTENTE}`,
  },
  {
    id: 'ORD-ficha',
    via: 'sessao',
    caminho: `/es-ES/app/marina-oropesa/puerto/orders/${MAL_FORMADO}`,
    controlo: `/es-ES/app/marina-oropesa/puerto/orders/${UUID_INEXISTENTE}`,
  },
  {
    id: 'KIOSK',
    via: 'ecra',
    caminho: `/es-ES/kiosk/${MAL_FORMADO}`,
    controlo: `/es-ES/kiosk/${UUID_INEXISTENTE}`,
  },
  {
    id: 'CARTA-produto',
    via: 'ecra',
    caminho: `/r/insp-marina-oropesa/es-ES/menu/produto/${MAL_FORMADO}`,
    controlo: `/r/insp-marina-oropesa/es-ES/menu/produto/${UUID_INEXISTENTE}`,
  },
];

test.describe('RV100-024: um id mal formado sai como 404', () => {
  test('o código que sai de cada rota real, e não quem chama o invólucro', async ({ page }) => {
    test.setTimeout(600_000);

    const falhas: string[] = [];
    let medidas = 0;
    const porVia: Record<string, number> = { sessao: 0, ecra: 0 };

    for (const a of ALVOS) {
      // ── O controlo primeiro: a rota EXISTE e sabe dizer «não existe» ─────
      //
      // Um caminho inventado dá 404 sozinho e não prova nada. Se este par não
      // der 404, a rota mudou de sítio e a medição seguinte não mede a forma
      // do id — mede a ausência da rota.
      const controlo = await page.request.get(a.controlo);
      if (controlo.status() !== 404) {
        falhas.push(`POPULACAO-ZERO: ${a.id} · o controlo com UUID válido deu ${controlo.status()}`
          + ' — a rota não existe ou não sabe dizer «não existe»');
        continue;
      }

      const r = await page.request.get(a.caminho);
      medidas += 1;
      porVia[a.via] = (porVia[a.via] ?? 0) + 1;
      if (r.status() !== 404) {
        falhas.push(`${a.id} (${a.via}) · id mal formado deu ${r.status()} e não 404 · ${a.caminho}`);
      }
    }

    console.log(
      `AMBITO rotas=${ALVOS.length} medidas=${medidas}`
      + ` sessao=${porVia.sessao} ecra=${porVia.ecra} falhas=${falhas.length}`,
    );

    // As duas vias TÊM de estar medidas. Foi a diferença entre elas que
    // escondeu o defeito: uma verde e a outra vermelha, no mesmo build.
    expect(porVia.sessao, 'POPULACAO-ZERO: nenhuma rota do caminho de SESSÃO foi medida')
      .toBeGreaterThan(0);
    expect(porVia.ecra, 'POPULACAO-ZERO: nenhuma rota do caminho de ECRÃ foi medida')
      .toBeGreaterThan(0);
    expect(medidas, `POPULACAO-ZERO: só ${medidas} das ${ALVOS.length} rotas foram medidas`)
      .toBe(ALVOS.length);

    expect(falhas, `um id mal formado não sai como 404:\n${falhas.join('\n')}`).toEqual([]);
  });
});
