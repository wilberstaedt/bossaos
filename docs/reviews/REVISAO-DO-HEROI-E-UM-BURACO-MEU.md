# Revisão do §4.2, e um buraco que a propagação deixou aberto

*08/09. O JR mediu treze critérios, oito passam, cinco falham, e **não curou nenhum**
— com o motivo certo em cada um. Reviso o que é decisão e o que é trabalho.*

## Primeiro, um achado meu: três sítios passam por sorte

A spec das ranhuras faz `if (problemas.length === 0) continue;` **antes** de separar os
declarados dos não declarados. Consequência: um sítio que **não declara ranhura
abençoada** mas cujos números calham bons **não é contado em lado nenhum**. Aparece no
registo como `ranhura=POR DECIDIR` e o resumo diz `por_decidir=0`.

Três sítios do `/product` estão exactamente aí — medidos agora: caixa 1152, 11,2 px,
sem defeito, **e sem ranhura declarada**.

**Isto derrota o motivo do tipo.** Eu escrevi que a ranhura tinha de deixar de ser um
número à mão «para o décimo quarto sítio não poder nascer errado». Três sítios
continuam a poder, e a guarda cala-se porque hoje os números batem certo. **Uma guarda
que só fala quando os números estão maus não consegue dizer que a estrutura está
errada.**

Cura: contar a ausência de declaração **independentemente** de haver defeito.

## Os cinco do herói: o que é decisão e o que é trabalho

### Trabalho, e não é de ninguém decidir

**#8 e #9 — a terceira superfície não existe.** O norte pede três (mapa/sala, KDS
sobreposto, **Staff móvel** sobreposto) e a página tem duas. O JR fez bem em não julgar
o critério 9: *medir se «liga as três» quando só há duas responderia a outra pergunta.*
Mas a ausência é construível — há capturas de sala ao telemóvel no repositório. **Não
escalo o que o documento já pede e nós conseguimos fazer.**

**#2 — o contentor tem 1200 e o norte pede 1240-1280.** O `getBoundingClientRect` é
caixa de borda, portanto os 1200 são reais: a secção declara 1280 e tem 40 de recuo de
cada lado.

E **a cascata que o JR temia não existe** — fui medir em vez de a supor: o `/product`
pinta **1152**, não `contentor − 128`. Eu próprio cheguei a montar uma tabela com essa
fórmula e ela estava assente no número de **antes** da cura de hoje. Medi, e caiu.

Alargar para 1280 melhora o herói de 11,2 para ~12,5 px. **Trabalho, com a matriz a
correr outra vez a seguir** — é para isso que ela existe.

### Decisão do Matheus, e só dele

**#10 — o estado não é um estado.** O `.ns-sinal` mostra `{k.heroiLegenda}`, uma cadeia
de tradução literal por construção, e o texto nem sequer é um estado: é uma legenda
sobre a comanda. O norte pede «um pequeno status lima comunica *Sincronizado* ou outro
**estado real**».

O JR recusou-se a ligá-lo a um `useEffect` que dissesse sempre «Sincronizado», e a
frase dele é a razão: **seria a mesma fotografia com mais passos.** Subscrevo, e
acrescento o que é meu decidir: **não se publica um estado falso.** Um indicador que
finge ser vivo numa página que vende tempo real é a mentira mais fácil de contar e a
mais cara se um comprador perguntar.

O que fica para ele são duas saídas honestas, e nenhuma é minha: **sinal verdadeiro**
(a landing lê algo vivo da demonstração) ou **emendar o §4.2**.

**#13 — a cópia diverge.** O CTA secundário é `Ver el producto` e o norte diz
`Ver cómo funciona`; o lead é outro texto. **Não se reescreve a cópia do Matheus por
iniciativa nossa** — vai como achado.

## O que o JR fez bem e que ninguém lhe pediu

Mediu o critério 11 **a meio do carregamento**, atrasando as imagens 4 s, porque
molduras vazias só existem enquanto a página carrega. Encontrou duas molduras com
esboço desfocado e escreveu a frase que a régua pedia: **«não é "não vi nenhuma": vi
duas, e nenhuma vazia.»**
