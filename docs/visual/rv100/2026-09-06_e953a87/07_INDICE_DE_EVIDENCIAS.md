# Índice de evidências — o que existe, o que está bloqueado, o que falta

> O §7.1 manda «indexar todas as evidências» antes de emitir
> `PRONTO PARA APROVAÇÃO VISUAL HUMANA`. Isto é esse índice, e escrevo-o antes
> das telas-mestre existirem, porque **a listagem diz mais do que a soma**.

Medido a 07:30 de 07/09. **35 ficheiros em nove pastas; quatro pastas vazias.**

---

## O que está medido

| pasta | ficheiros | o que prova |
| --- | ---: | --- |
| `moldura` | 11 | antes/depois em cinco larguras — a marca de `81x28` não ligada a `145x50` ligada |
| `baseline` | 9 | o diagnóstico do §2: as oito páginas comerciais a 1440 |
| `home` | 4 | o herói de **728 → 1256**, com `ocupaDireita` a virar |
| `confianca` · `demo` · `implantacao` · `planos` · `seo` | 2 cada | antes/depois de cada lote |
| `demonstracao` | 1 | o manifesto das composições |

## As quatro pastas vazias, e só uma delas é um buraco

**Três estão bloqueadas por desenho, e é correcto estarem vazias:**

- **`masters`** — as seis telas-mestre são a secção 7, e a secção 7 começa quando
  a 6 acabar. Faltam a FAQ e os três blocos da home.
- **`rollout`** — a propagação é a secção 8, e o §8 começa **depois** da
  aprovação humana. Uma pasta cheia aqui antes disso seria trabalho deitado fora.
- **`recordings`** — o §7 pede «gravação curta da interacção principal **quando o
  movimento for relevante**». É condicional, e a condição decide-se com os
  mestres à frente.

**Uma não está bloqueada por nada: `accessibility`.**

E essa é a única que aparece como **NÃO MEDI declarado em quatro lotes seguidos**:
«nada de teclado ou leitor de ecrã» na moldura, na home, nas figuras novas e nos
blocos do piloto. **Ninguém a bloqueou — ninguém a fez.**

O que existe do lado do teclado é real e está noutro sítio: o
`inspeccao/foco.spec.ts` prova as três promessas do `<dialog>` nativo — foco
preso, `Escape` a fechar, foco de volta a quem abriu — **e prova-as no catálogo
de desenho**. E o JR mediu porquê: **o produto não tem modais**, os 20 «diálogos»
do atlas são páginas com botão de confirmar.

**O caso real de foco no produto é o menu móvel**, que trata `Escape` e devolve o
foco ao botão, e que foi declarado por medir por quem o escreveu.

## Uma coisa que o índice revelou e que eu não sabia

**As cinco composições de demonstração não estão na pasta de evidências.** Estão
em `apps/web/src/demonstracao/`, porque foram para lá quando o lote seguinte as
ligou à landing — e o `evidence/demonstracao/` ficou só com o manifesto.

**Não é defeito**: uma imagem que o produto serve tem de viver na árvore do
produto. Mas quem procurar a evidência das composições no sítio onde as outras
estão **não as encontra**, e o §12.5 vai pedir 792 capturas indexadas.

**Fica escrito aqui**, que é o que um índice serve para fazer.

## O que falta para o §7.1 poder ser emitido

1. fechar a secção 6 — falta a FAQ, os três blocos da home, e a `/trust` que
   ainda é o bloco 10 da home com mais espaço;
2. construir os seis mestres com os dez entregáveis que o §7 lista;
3. **medir a acessibilidade**, que é o único buraco não bloqueado;
4. indexar — este ficheiro, actualizado.

**E depois parar.** O §7.1 acaba com «pare», e o §12.4 diz que só o Matheus pode
registar `APROVAÇÃO VISUAL HUMANA`.
