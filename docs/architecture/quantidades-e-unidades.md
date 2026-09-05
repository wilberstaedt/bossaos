# Quantidades e unidades

> Contrato do E25, escrito a 05/09 **antes de existir código**. O contrato do
> dinheiro (`dinheiro.md`) resolve o dinheiro; as quantidades têm o mesmo
> problema e não tinham contrato nenhum.

## A regra, e é a mesma do dinheiro

**Unidade mínima inteira, com a unidade a viajar junto.** 3,5 kg de farinha é
`3500` + `g`. 200 ml de azeite é `200` + `ml`. Nunca `3.5`.

`0,1 + 0,2` não é `0,3` em vírgula flutuante. No dinheiro isso rouba cêntimos;
aqui **rouba gramas**, e três gramas por prato viram um quilo por mês — que
aparece como uma contagem que não bate, não como um erro.

**A unidade não é decoração.** Um número sem unidade é uma pergunta: `500` de
farinha é meio quilo ou meia tonelada? Viaja com o número, como o código de
moeda viaja com o valor.

## As três dimensões, e não se misturam

**Massa** (`g`), **volume** (`ml`), **contagem** (`un`). São dimensões
diferentes, e somar duas dimensões é sempre um defeito — não um caso raro.

**Exijo que somar `g` com `ml` seja impossível**, não proibido: se o tipo o
aceitar e a regra viver num `if`, alguém há-de escrever o `if` ao contrário.

## A conversão que parece inocente e não é

Uma ficha diz «uma colher de sopa de azeite». Uma colher de sopa **não é uma
unidade de medida**: é 15 ml por convenção, e a convenção muda com quem cozinha.

**A conversão de unidades de receita para unidades de stock é uma decisão do
restaurante, configurada, nunca adivinhada pelo produto.** Se a casa diz que a
colher dela é 12 ml, é 12. Um produto que assume 15 desconta menos azeite do que
saiu, todos os dias, e a diferença aparece no inventário meses depois sem causa
aparente.

**E entre dimensões não há conversão sem densidade.** 100 g de farinha não são
100 ml de farinha. Converter massa em volume exige um número que é do
ingrediente, e que ninguém tem por omissão. **Sem esse número, recusa-se** — é a
mesma regra do fuso: adivinhar é o defeito.

## O que isto obriga

- **Guardar sempre na unidade mínima da dimensão**, e converter só para mostrar.
- **A unidade de exibição é preferência**, não verdade: mostrar `1,5 kg` é
  formatar `1500 g`, e a conta faz-se sempre nos gramas.
- **Uma quantidade sem unidade não se aceita na fronteira** — nem de formulário,
  nem de importação, nem de integração externa.
