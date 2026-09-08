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
