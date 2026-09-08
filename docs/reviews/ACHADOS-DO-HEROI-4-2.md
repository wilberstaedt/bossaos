# O §4.2 medido: oito verdes, cinco achados — 08/09

    AMBITO_HEROI criterios=13 ok=8 falha=5 nao_medi=0 texto_divergente=1

`inspeccao/rv100-heroi.spec.ts`, com `scripts/provar-rv100-heroi.sh` a exercer a
metade verde. **Nenhum dos cinco foi curado**: quatro são achados que vão ao
sénior, e o quinto cascateia sobre trabalho já fechado.

## Os oito que passam

| # | critério | medido |
|---|---|---|
| 1 | altura ≥ 760 | **921 px** |
| 3 | grelha 5/7 ou 6/6 | `476,7px 667,3px` — duas colunas |
| 4 | mensagem à esquerda | texto x=136, produto x=637 |
| 5 | captura ≥ 650 | **667 px** |
| 6 | títulos sem ampliar | **11,2 px** |
| 7 | KDS com sombra | `rgba(16,46,53,.34) 0 18px 44px` |
| 11 | sem molduras vazias no carregamento | **2 molduras a meio, 0 vazias** |
| 12 | marca + promessa + produto + CTA no 1.º ecrã | 75 / 112 / 701, todos < 900 |

**O 11 foi medido a meio e não depois**, como a régua exige: atrasei as imagens
4 s e medi no `domcontentloaded`. As duas molduras aparecem com **esboço
desfocado** (`placeholder="blur"`), que não é moldura vazia — é o desenho a
carregar. Sem esse esboço, seriam duas caixas de 417 e 441 px de altura com nada
lá dentro. **Não é «não vi nenhuma»: vi duas, e nenhuma vazia.**

## Os três que decidem, e os três são achado

### 10 · o estado não é um estado

O norte pede «um pequeno status lima comunica *Sincronizado* ou outro **estado
real**». O que está na página é `.ns-sinal` com `{k.heroiLegenda}` — **uma cadeia
de tradução, literal por construção.** E há uma segunda camada: o texto nem sequer
é um estado. É uma legenda —

> «La misma comanda, en los dos sitios: se toma en la mesa y aparece en cocina
> sin que nadie la vuelva a escribir.»

Não diz «Sincronizado» nem nada que se lhe pareça. **Não o liguei a dado nenhum e
não o reescrevi.** Ligar um rótulo a um `useEffect` que diz sempre «Sincronizado»
seria a mesma fotografia com mais passos.

### 8 e 9 · a terceira superfície não existe

O norte pede **três**: mapa/sala principal, KDS sobreposto, **Staff móvel
sobreposto**. A página tem **duas**. O critério 8 falha por ausência, e o 9 —
«uma linha coral liga visualmente as três superfícies» — **não se pode medir com
duas**: o que falta não é a linha, é a superfície que ela ligaria.

Há um `::before` no `.ns-heroi__media` que pode ser a ligação. Não o julguei:
medir se «liga as três» quando só há duas responderia a outra pergunta.

## Os outros dois

### 2 · o contentor tem 1200 e o norte pede 1240-1280

Não é copy e é curável — **mas cascateia sobre a propagação das ranhuras, fechada
esta manhã.** O transbordo da `/product` foi calculado a partir de `1200 − 128 =
1072`; com 1280 passa a 1152, e a promessa de `1152px` que lá está deixa de bater
com a caixa. É a mesma distância entre declarado e pintado três vezes corrigida
hoje, e não a reabro por iniciativa própria.

### 13 · o CTA secundário diverge, e o lead também

| | norte | página |
|---|---|---|
| CTA 1 | `Pedir una demo` | `Pedir una demo` ✔ |
| CTA 2 | `Ver cómo funciona` | **`Ver el producto`** |
| lead | «Carta, reservas, sala, cocina y gestión sobre la misma base. Menos herramientas sueltas. Menos errores en pleno servicio.» | «Carta, sala, cocina y web trabajando sobre la misma base. Sin exportar, sin volver a escribir, sin copiar precios de una hoja a otra.» |

O headline bate exactamente. **Os dois textos que divergem são copy do Matheus e
a prova ACUSA em vez de corrigir** — mudar o `verProduto` para «Ver cómo
funciona» seria reescrever a cópia dele por iniciativa nossa.

E há uma diferença de sentido, não só de palavras: o lead do norte nomeia
**reservas** e **gestão**, e o da página troca-as por **web**. Isso é decisão de
posicionamento, não de estilo.

## O controlo, e porque foi feito agora

Cinco critérios vermelhos provam que a prova sabe recusar — **desses cinco**. Os
oito verdes estavam por provar, e um verde que nunca recusou nada é a forma que
já corrigi duas vezes hoje. O plante tira a sombra da moldura sobreposta:

    ok  oito critérios verdes antes do plante
    ok  o 7 recusou: sombra=none
    ok  e arrastou zero: sete verdes ficam verdes

**A segunda linha é a que o torna prova.** Um plante que apagasse metade do
quadro estaria a medir a minha edição e não o critério.

---

## Curados três, e a fotografia continua a não estar bem — 08/09

    AMBITO_HEROI criterios=13 ok=11 falha=2 nao_medi=0 texto_divergente=1

**Onze de treze.** As duas que restam são as que vão ao Matheus: o estado (10) e a
cópia (13 + lead).

| # | antes | agora |
|---|---|---|
| 2 | contentor 1200 | **1280** |
| 6 | 11,2 px | **12,0 px** |
| 8 | superfície inexistente | **11,0 px** |
| 9 | não se podia medir | **toca 3 de 3** |

O contentor: **a cascata que eu temia não existia** e o sénior mediu-a em vez de a
supor. Alargar deu mais 73 px à captura do herói.

### A cascata apanhou-me duas vezes, e da segunda por especificidade

A terceira superfície ficou em fluxo e caiu para uma terceira linha da grelha —
`y 993-1366`, fora da moldura. A regra `.ns-heroi__media > *:not(...)` tem
especificidade **0,2,0** e ganhava à minha `.ns-heroi__terceira` de **0,1,0**
*independentemente da ordem*. Hoje de manhã a cascata apanhou-me por ordem; à
tarde por especificidade.

### A linha coral: um elemento, e à frente

Passou de `::before` a elemento real porque **a régua manda medir extremidades e
um pseudo-elemento não dá caixa a quem mede**. E depois: com `z-index: 0` ela
tocava as três caixas e **não se via**, atrás de superfícies opacas. O critério 9
passava na mesma — «tocar» é geometria e o norte diz «liga **visualmente**».
**Verde sobre nada, na guarda que eu próprio escrevi.** Só o vi ao olhar para a
captura. Está a `z-index: 3`.

E a posição saiu de uma medição: as três só se cruzam numa faixa de **12 px**
(547-559 a 1440), porque a sala acaba onde o KDS começa. Fora dela o critério
recusa — e recusou, quando o KDS estreitou e mudou de altura.

### Os dois tamanhos são uma conta, não um gosto

Para o KDS ler a 11 px precisa de 440; o Staff precisa de 306. **São 746 numa
coluna de 714** — a sobreposição é forçada. Encostei os dois ao mínimo: KDS 62%
(11,1) e Staff 43% (11,0), o que os põe a tocar-se em 35 px em vez de 128.

Medi primeiro com 74% e 44%, **os números passaram, e fui ver a captura: o
telefone cobria o KDS quase todo.**

## O que fica mal, e não invento a cura

**A fotografia ainda não está bem, e digo-o em vez de a dar por fechada:**

1. **A captura principal não é um mapa/sala.** O `sala-heroi-834` saiu de
   `/pos/{unidade}` ancorado no `h1` e mostra a **navegação do TPV** — «Operador,
   Venta de barra, Historial de cajas». O §4.2 pede «screenshot principal do
   **mapa/sala**». O critério 5 só mede a largura, portanto passou sobre o ecrã
   errado — a mesma família do recorte que eu quase entreguei esta manhã.
2. **O telefone ainda corta texto do KDS** («Marcar lista», «Empezar»).
3. **A linha atravessa texto** em vez de correr por um espaço livre.

Os três são de composição e a régua diz que a beleza é da Nathalia — mas **o 1 não
é beleza, é o ecrã errado**, e fica como achado a par dos outros dois.

## O buraco da declaração, fechado

`sem_declaracao` passa a contar-se **haja ou não defeito**, e cada ausência tem de
estar assinada. O terceiro plante do controlo tira a declaração a um sítio cujos
números continuam bons e exige que a guarda o apanhe:

    ok  apanhou a declaração que falta, mesmo com os números bons
    ok  e não inventou defeito nenhum: os números continuam bons

E a guarda de população da matriz estreita **disparou sozinha** quando a terceira
superfície apareceu: 13 → 14. Era para isso que existia.
