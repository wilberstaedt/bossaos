# Régua do §4.2, o herói escuro — escrita antes de existir entrega

*08/09. O herói já é **legível** (11,2 px) e já cumpre os 650 px de captura, porque
foi curado pela propagação. **Nada mais nele foi alguma vez medido.***

O §4.2 é a secção mais densa em números de todo o §4, e é a primeira coisa que um
comprador vê. Escrevo a régua antes, pela razão de sempre: uma régua escrita depois
cabe no que foi feito.

## O que tem de estar verdadeiro

| # | exige (palavras do norte) | instrumento | limiar |
|---|---|---|---|
| 1 | altura mínima | caixa do herói a 1440 | **≥ 760 px** |
| 2 | container | largura do contentor | **1240-1280 px** |
| 3 | grelha | colunas do `grid-template-columns` | **5/7 ou 6/6** |
| 4 | mensagem à esquerda, produto à direita | posição x das duas colunas | texto antes da imagem |
| 5 | captura principal | caixa da imagem do mapa/sala | **≥ 650 px** *(hoje 667 — já passa)* |
| 6 | ler títulos sem ampliar | `escala × 14 px` | **≥ 11** *(hoje 11,2 — já passa)* |
| 7 | KDS sobreposto **com contraste e sombra** | `box-shadow` presente e contraste da borda | sombra ≠ `none` |
| 8 | Staff móvel sobreposto **em tamanho legível** | a mesma conta do critério 6 | **≥ 11 px** |
| 9 | uma linha coral **liga as três superfícies** | elemento coral que toque as três caixas | existe, e toca |
| 10 | um estado **real** («Sincronizado») | o texto do estado vem de dado ou é literal? | **vem de dado** |
| 11 | nada de molduras vazias no carregamento | medir durante o carregamento, não depois | zero molduras sem imagem |
| 12 | primeiro viewport com **marca + promessa + produto + CTA** | os quatro dentro de 900 de altura | **4 de 4** |
| 13 | CTAs | texto e cor | coral «Pedir una demo» + claro «Ver cómo funciona» |

## Os três que decidem, e porquê

**O 10.** «Um pequeno status lima comunica *Sincronizado* ou outro **estado real**.» Um
rótulo fixo que diga «Sincronizado» é uma fotografia de um estado, não um estado — e
numa landing que vende um sistema de tempo real, é a mentira mais fácil de contar e a
mais cara se um comprador perguntar. **Se for literal, é achado e vem a mim.**

**O 11.** Molduras vazias só existem **durante** o carregamento. Medir a página
assente responde a outra pergunta. Se não der para medir a meio, a resposta é
**NÃO MEDI** — nunca «não vi nenhuma».

**O 9.** «Liga» é verbo com consequência geométrica: uma linha coral que exista mas
não toque as três caixas não liga nada. Medir as extremidades, não a presença.

## O que esta régua NÃO decide

Se o herói é bonito, e se «não use perspectiva extrema que torne a UI ilegível» está
cumprido — a segunda é julgamento, e a parte mensurável dela (ilegível) já é o
critério 6. O primeiro é da Nathalia.

**E não decide o texto.** O headline e o lead do norte são literais; se o que está na
página divergir, isso é **achado**, não é correcção nossa — não se reescreve a cópia
do Matheus por iniciativa própria.

---

## Emenda ao critério 5, e é a terceira vez hoje — 08/09, 20h40

O critério 5 dizia: «captura principal ≥ 650 px», medida na caixa da imagem. Passou
com **667** e depois com **740**. E passou sobre **o ecrã errado**.

O `sala-heroi-834` foi capturado de `/pos/{unidade}` ancorado no `h1`, e o que mostra
é a **navegação do TPV** — «Operador, Venta de barra, Historial de cajas». O §4.2 pede
«screenshot principal do **mapa/sala**». O JR viu-o e declarou-o em vez de fechar o
herói.

**O critério mediu uma propriedade real do sujeito errado.** É a terceira vez hoje: a
tabela das escalas que eu tirei dos mestres em disco, a expectativa dos 13,6 px
assente numa caixa declarada, e agora uma largura correcta sobre uma fotografia que
não é a que o documento pede.

E esta dói mais do que as outras duas, porque **escrevi esta régua depois de já ter
escrito a lição**. Ter a regra não é usá-la.

### O que o critério passa a exigir

Uma largura não identifica um ecrã. Onde a régua **nomeia** um ecrã — «mapa/sala»,
«KDS», «Staff móvel» — o critério passa a ter dois lados:

1. **a geometria**, que já lá estava (≥ 650 px, legível, não ampliado);
2. **a identidade**: o manifesto da captura regista de que rota saiu, e essa rota tem
   de ser a do ecrã que o norte nomeia. Uma captura do TPV não serve o «mapa/sala»
   por mais bem dimensionada que esteja.

O segundo lado é verificável sem julgamento e **não custa medição nova** — o
manifesto já grava o caminho. Faltava alguém compará-lo com o que o documento pede.

### Os outros dois achados da fotografia

**O telefone corta texto do KDS** («Marcar lista», «Empezar»). Isto **não é beleza**:
é uma captura que mostra a interface truncada, e uma landing que corta os botões do
produto está a mostrar o produto mal. **É trabalho.**

**A linha coral atravessa texto.** Essa é composição, e a régua diz que a beleza é da
Nathalia. Fica como achado, sem cura nossa.

### E uma coisa que o JR apanhou contra a régua que eu escrevi

O critério 9 pede que a linha «ligue as três superfícies», e ele mediu extremidades
como a régua mandava. **Com `z-index: 0` a linha tocava as três e não se via**, atrás
de superfícies opacas — e o critério passava na mesma. O norte diz «liga
**visualmente**»; tocar é geometria, ver é outra coisa. Corrigiu antes de eu ver.
