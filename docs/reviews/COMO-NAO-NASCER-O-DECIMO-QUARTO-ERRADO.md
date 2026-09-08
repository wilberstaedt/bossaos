# A propagação não é escolher variantes: é deixar de poder declarar uma ranhura sem variante

*08/09. Escrito depois do varrimento que encontrou 12 dos 13 sítios por baixo dos 11 px,
e antes de tocar em qualquer um deles.*

A cura do bloco 4 foi trocar um mestre de 1440 por um recorte de 560. A tentação
seguinte é repetir isso doze vezes. **Não vai funcionar, e a aritmética diz porquê.**

## A banda

Duas exigências ao mesmo tempo, e vêm dos dois lados do critério 6:

    nitidez        fonte ≥ ranhura            (ampliar é inventar píxeis)
    legibilidade   14 × ranhura / fonte ≥ 11  →  fonte ≤ 1,273 × ranhura

Uma fonte só serve uma ranhura se cair **dentro da banda `[r, 1,273r]`** — que é
estreita: 27 % de folga, e nada mais. Não há um ficheiro que sirva duas ranhuras
distantes, e não há ranhura que aceite qualquer ficheiro.

## Porque é que «escolher a variante» não chega

Das **sete** ranhuras declaradas hoje, só **três** têm alguma variante na banda:

| ranhura | banda | há variante? |
|---:|---|---|
| 380 | 380-484 | 390 |
| 420 | 420-535 | **nenhuma** |
| 477 | 477-607 | 560 |
| 600 | 600-764 | **nenhuma** |
| 640 | 640-815 | **nenhuma** |
| 720 | 720-916 | 834 |
| 1080 | 1080-1375 | 1280 |

E mesmo essas três só valem **para alguns ecrãs**, porque as variantes existem por
ecrã e não em geral:

| ranhura | ecrãs servidos | ecrãs sem fonte na banda |
|---:|---|---|
| 380 | 8 de 9 | tablet |
| 477 | 7 de 9 | **sala, carta** |
| 720 | 1 de 9 | todos menos tablet |
| 1080 | 1 de 9 | todos menos KDS |

**As ranhuras largas praticamente não têm cobertura.** Só 390 e 560 são larguras com
conjunto quase completo. Eu próprio cheguei a escrever uma proposta de quatro larguras
abençoadas antes de medir isto — a tabela fechava, e fechava sobre ecrãs que não
existem.

## A inversão

Não se escolhe uma variante para a ranhura que o layout calhou de querer. **Escolhe-se
um conjunto pequeno de ranhuras abençoadas, e o layout passa a só poder usar essas.**

Duas chegam, e são as que já têm conjunto: **~380 ao telemóvel e ~477 no ecrã largo.**
Dá 13,6 px e 11,9 px, ambos acima dos 11.

Para completar o conjunto faltam **nove capturas**: `sala` e `carta` a 560 (2 ecrãs ×
3 línguas) e `tablet` a 390 (1 × 3). Nada mais — os restantes já existem.

## E a parte que impede a reincidência

Completar o conjunto arruma os treze sítios de hoje. **Não impede o décimo quarto.**

Hoje a `Composicao` recebe `tamanhos` como texto livre — `"(min-width: 1024px) 640px,
100vw"` — e texto livre aceita qualquer número, incluindo os quatro que não têm
variante nenhuma. Quem escrever o próximo sítio vai escolher outro número razoável, e
vai estar errado da mesma maneira, e o build vai passar.

**A ranhura tem de deixar de ser texto e passar a ser um tipo:** uma união das larguras
abençoadas, com a folha de estilos a derivar a largura real dessa mesma constante. Um
sítio que declare uma ranhura sem variante deixa de compilar — que é o mesmo princípio
do aceite 1 do E01, onde o build falha se os tipos falharem.

Enquanto a escolha for um número escrito à mão em treze sítios, o décimo quarto nasce
errado. **A guarda não é a variante certa: é não se conseguir declarar a errada.**

## O que fica por decidir, e é de desenho

Colapsar para duas ranhuras quer dizer que **o herói da landing deixa de ter uma imagem
grande** — passa de 720 para ~477. A alternativa é capturar `sala` a 834 e manter os
720, e custa mais três capturas.

Isso é decisão do Matheus e da Nathalia, não minha: a régua mede legibilidade, e as
duas opções são legíveis. **Registo as duas com o preço de cada uma e não escolho.**

---

## Executado — 08/09

### UM · o conjunto das duas larguras está completo

Nove capturas novas: `sala` e `carta` a 560 (2 × 3) e `tablet` a 390 (1 × 3).
Saem do inquilino `bossa-demo` pelo mesmo capturador dos recortes do bloco 4, com
a guarda de identidade do ecrã. Duas formas, e a diferença é de propósito:

- **560 é recorte** — janela de largura fixa ancorada numa região com sentido.
- **390 é visor inteiro** — põe-se o navegador a 390×844 e fotografa-se. A 390 o
  produto tem desenho próprio; recortar 390 de um ecrã largo mostraria um terço
  de um layout que ninguém vê assim.

### DOIS · a ranhura é um tipo, e o CSS deriva da mesma constante

`RANHURAS = { estreita: 380, larga: 477 }`, `type Ranhura = keyof typeof RANHURAS`.
O `sizes` deriva da constante **e o `max-width` também**, por `--bo-ranhura` que o
componente escreve. Era essa a distância que o bloco 4 mediu: o `sizes` prometia
390 e a caixa tinha 477. **Agora a declaração e a caixa não podem discordar.**

A saída tem nome próprio — `ranhuraPorDecidir` — em vez de um `tamanhos?: string`
opcional, para `grep` dar a lista exacta e ninguém lá cair por distracção.

**A guarda provou-se ao falhar:** assim que o tipo entrou, o build recusou os
**oito** sítios de texto livre de uma vez. É o aceite 1 do E01.

### TRÊS · migrados, e a lição foi que a ranhura não chega

Migrar a ranhura e deixar a fonte **não cura nada**: com as ranhuras já a 477, seis
composições continuavam a servir mestres de 1440 e davam 4,6 px. A ranhura e a
fonte migram **juntas**, e é isso que o `rv100-ranhuras.spec.ts` mede.

Um caso mereceu decisão: a caixa do bento pinta **420**, que é uma das ranhuras
sem fonte na banda. Não se alargou a caixa nem se inventou largura: **declarou-se
a estreita**, e o `max-width` fecha-a nos 380. Precisou de uma fonte de 390 de
largura REAL (`tabletEstreito`) — a variante estreita do `<picture>` só entra
abaixo de 768, portanto declarar `estreita` num ecrã de secretária continuava a
servir a de 560.

### Medido: 13 composições, 4 páginas

    AMBITO composicoes=13 abencoadas_com_defeito=0 por_decidir=4

| página | ranhura | fonte | mostrado | nitidez | px |
|---|---|---|---|---|---|
| `/` bento catálogo | 477 | 560 | 477 | 0,852 | **11,9** |
| `/` bento tablet | 380 | 390 | 380 | 0,990 | **13,6** |
| `/` papéis | 477 | 560 | 477 | 0,852 | **11,9** |
| `/product` carta | 380 | 390 | 380 | 0,990 | **13,6** |
| `/product` tablet | 477 | 560 | 477 | 0,852 | **11,9** |
| `/getting-started` | 477 | 560 | 477 | 0,852 | **11,9** |
| `/interno/ns2` ×2 | 477 | 560 | 477 | 0,852 | **11,9** |

### Vermelhas e declaradas, como mandado

| página | ranhura | fonte | mostrado | nitidez | px |
|---|---|---|---|---|---|
| `/` herói sala | por decidir | 1440 | 667 | 0,889 | **6,5** |
| `/` herói kds | por decidir | 1280 | 494 | **1,286** | **5,4** |
| `/product` sala | por decidir | 1440 | 1072 | 0,993 | **10,4** |
| `/product` catálogo | por decidir | 1440 | 1072 | 0,993 | **10,4** |

O herói pequeno **amplia 1,286×** — não é só ilegível, é ampliado. Fica aqui e
não se cura: mexer no herói é a decisão de desenho que não é nossa.

`/product` KDS passa (11,7) e por isso não está nesta lista.
