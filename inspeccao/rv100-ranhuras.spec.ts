import { test, expect } from '@playwright/test';
import { PAGINAS, julgar, medirComposicoes } from './medir-ranhuras.ts';

/**
 * As ranhuras abençoadas, medidas em TODAS as composições do produto.
 *
 * ── Porque é que o tipo não chega ────────────────────────────────────────
 *
 * A união `Ranhura` impede que alguém **declare** uma ranhura sem variante. Não
 * impede que a caixa saia diferente da declaração — que foi exactamente o que o
 * bloco 4 mediu: o `sizes` prometia 390 e a caixa tinha 477. O tipo fecha a
 * porta da frente; isto mede a janela.
 *
 * Mede-se por composição, em cada página que tenha alguma:
 *
 *   nitidez       mostrado ÷ ficheiro servido — nunca acima de 1,00
 *   legibilidade  14 px × (mostrado ÷ captura de origem) — nunca abaixo de 11
 *
 * A medição vive em `medir-ranhuras.ts` e é a MESMA que a matriz de 390 usa.
 * Duas cópias do mesmo resumo concordam até ao dia em que uma muda.
 *
 * ── E o que fica DECLARADO em vez de escondido ───────────────────────────
 *
 * O herói da landing e as três largas da `/product` usam `ranhuraPorDecidir` e
 * **não cabem** nas duas abençoadas: encolher o herói de 720 para 477 tira-lhe a
 * imagem grande, e mantê-lo exige capturar `sala` a 834. As duas opções são
 * legíveis, portanto a régua não decide — é desenho, do Matheus e da Nathalia.
 *
 * Ficam VERMELHAS e nomeadas, que foi a ordem. A falha desta prova é a
 * declaração: enquanto a decisão não vier, isto acusa e diz exactamente quais.
 */

const VISOR = { width: 1280, height: 900 };

/**
 * ── A dívida da ranhura não declarada, ASSINADA ───────────────────────────
 *
 * O buraco que isto fecha: a contagem saltava para o sítio seguinte quando não
 * havia defeito, **antes** de separar declarados de não declarados. Um sítio sem
 * ranhura abençoada cujos números calhassem bons não era contado em lado nenhum
 * — aparecia no registo como `POR DECIDIR` e o resumo dizia `por_decidir=0`.
 *
 * Isso derrotava o motivo do tipo. A união `Ranhura` existe para o décimo quarto
 * sítio não poder nascer errado, e três continuavam a poder **porque hoje os
 * números batem certo**. Uma guarda que só fala quando os números estão maus não
 * consegue dizer que a ESTRUTURA está errada.
 *
 * Agora a ausência de declaração conta-se **haja ou não defeito**, e cada uma tem
 * de estar assinada aqui com o motivo. É a forma da `validar-provas-frescas`:
 * não se obriga nada a ser abençoado, obriga-se a DECIDIR. O que passa a ser
 * impossível é a terceira hipótese — ninguém ter decidido.
 */
const SEM_RANHURA_ASSINADAS: Record<string, string> = {
  '/es-ES #1': 'herói, captura principal: pinta 667 e 667 não é abençoada.'
    + ' O §4.2 exige ≥ 650 px, portanto não cabe em 477 nem em 380.',
  '/es-ES #2': 'herói, KDS sobreposto: pinta 528, fora das duas abençoadas.',
  '/es-ES #3': 'herói, Staff móvel sobreposto: pinta 314. O §4.2 pede-o em tamanho'
    + ' legível e 314 é o que põe o texto nos 11,3 px; 380 tapava a sala.',
  '/es-ES/product #1': '/product, ranhura larga: 1232, por transbordo medido.',
  '/es-ES/product #2': '/product, ranhura larga: 1232.',
  '/es-ES/product #3': '/product, ranhura larga: 1232.',
};

test('todas as composições, nas ranhuras que declaram', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(VISOR);

  const { medidas, falhas } = await medirComposicoes(page, PAGINAS);
  const abencoadas: string[] = [];
  const porDecidir: string[] = [];
  const semDeclaracaoNaoAssinada: string[] = [];
  let semDeclaracao = 0;

  for (const m of medidas) {
    const { linha, problemas } = julgar(m);
    console.log(`RANHURA ${linha}`);

    // ── A ESTRUTURA mede-se antes dos números, e não depois ───────────────
    //
    // Isto vem PRIMEIRO e sem `continue`: um sítio sem ranhura declarada conta
    // mesmo quando os números estão bons. Era aqui que a guarda mentia.
    const chave = `${m.pagina} #${m.indice}`;
    if (m.declarada === null) {
      semDeclaracao += 1;
      if (!(chave in SEM_RANHURA_ASSINADAS)) {
        semDeclaracaoNaoAssinada.push(`${chave} não declara ranhura E NÃO está`
          + ` assinado — ou se declara uma abençoada, ou se assina com o motivo.`
          + ` Números: ${linha}`);
      }
    }

    if (problemas.length === 0) continue;
    // A caixa TEM de bater com a ranhura declarada. Um sítio que declara 477 e
    // pinta 640 volta a ser a declaração a mentir, e o tipo não apanha isso.
    if (m.declarada === null) porDecidir.push(`${linha} — ${problemas.join(', ')}`);
    else abencoadas.push(`${linha} — ${problemas.join(', ')}`);
  }

  // ── E a lista CADUCA ───────────────────────────────────────────────────
  //
  // Uma assinatura que nomeie um sítio que já não existe é falha: sem isto a
  // lista vira arrumação permanente e um dia declara coisas que desapareceram.
  const chaves = new Set(medidas.map((m) => `${m.pagina} #${m.indice}`));
  const caducas = Object.keys(SEM_RANHURA_ASSINADAS).filter((c) => !chaves.has(c));

  console.log(`AMBITO composicoes=${medidas.length}`
    + ` abencoadas_com_defeito=${abencoadas.length} por_decidir=${porDecidir.length}`
    + ` sem_declaracao=${semDeclaracao}`
    + ` sem_declaracao_nao_assinada=${semDeclaracaoNaoAssinada.length}`
    + ` assinaturas_caducas=${caducas.length}`);

  expect(falhas, `páginas que não abriram:\n${falhas.join('\n')}`).toEqual([]);
  expect(medidas.length, 'POPULACAO-ZERO: nenhuma composição foi medida')
    .toBeGreaterThan(0);
  expect(abencoadas, `ranhuras ABENÇOADAS a falhar — estas são defeito:\n${
    abencoadas.join('\n')}`).toEqual([]);
  expect(porDecidir, 'POR DECIDIR, e é desenho e não defeito.\n'
    + `Decisão do Matheus e da Nathalia:\n${porDecidir.join('\n')}`).toEqual([]);
  expect(semDeclaracaoNaoAssinada, 'ESTRUTURA: ranhura não declarada e não assinada.'
    + ' Os números podem estar bons hoje e é por isso que isto é falha:'
    + ' um sítio sem ranhura abençoada pode nascer errado amanhã sem ninguém dar'
    + ` por isso.\n${semDeclaracaoNaoAssinada.join('\n')}`).toEqual([]);
  expect(caducas, 'a lista de assinaturas nomeia sítios que já não existem — caducou:\n'
    + `${caducas.join('\n')}`).toEqual([]);
});
