# A `marketing.spec.ts` esteve morta um dia inteiro, e o silêncio foi por desenho

> 08/09, encontrado a curar os cantos do §3.3. Escrito em ficheiro porque muda
> uma decisão que não é minha: o tecto da dívida.

## O que aconteceu

A Fase 2 trocou o herói da landing de `.bo-mkt__heroi` para `.ns-heroi`. A
`marketing.spec.ts` procura `.bo-mkt__heroi h1` **dentro do `visitar`**, que
corre *antes* de qualquer verificação.

O efeito não foi um vermelho útil. Foi isto:

| verificação sobre a landing | estado desde a reescrita |
| --- | --- |
| não transborda na horizontal (5 larguras) | **não corria** |
| nenhum elemento fora do ecrã | **não corria** |
| alvos de toque de 44 px a 360 px | **não corria** |
| contraste WCAG a 360 px | **não corria** |
| cada página da família é alcançável da landing | **não corria** |

Sete testes a rebentar no mesmo `expect(locator).toBeVisible()`, e nenhum deles
chegou a medir o que existe para medir.

## Porque é que ninguém viu

A `marketing.spec.ts` está na lista `EM_DIVIDA` da `validar-suites-com-guiao.sh`,
tecto 8, com a frase que a própria guarda escreve:

> *estas falham sem aparecer em relatório nenhum — foi assim que o `divida-movel`
> ficou partido em silêncio.*

**Aconteceu outra vez, na mesma semana, com a mesma causa.** A guarda que avisa
disto está a funcionar; o que falta é alguém pagar a dívida.

## O que já está curado

Os dois marcadores foram reancorados em `.ns-heroi h1` — o da tabela `TELAS` e um
segundo, cravado à mão dentro do teste de alcançabilidade, que sobreviveu ao
primeiro reancoramento. **68 testes verdes**, e as cinco verificações da tabela
acima voltaram a correr e passam.

## O que NÃO está curado, e é decisão do sénior

**A `marketing.spec.ts` continua sem corredor.** Podia acrescentá-la ao
`validar-sistema-ns2.sh`, mas isso seria mentir sobre o âmbito: essa guarda é do
North Star e a `marketing.spec.ts` cobre **oito** telas de marketing, das quais só
uma é a landing do norte.

Baixar o tecto de 8 para 7 exige decidir **quem** a corre, e a lista `EM_DIVIDA` e
o seu tecto são da revisão, não minhas. **O tecto fica em 8 e a dívida fica
declarada** — não a escondi atrás de uma cura que só resolve o sintoma de hoje.
