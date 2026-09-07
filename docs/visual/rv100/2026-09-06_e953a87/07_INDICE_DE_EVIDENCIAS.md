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

---

## A metade estática da acessibilidade — medida, e conforme

A pasta `accessibility` era a única vazia que **nada bloqueava**. Fiz a metade
que se mede sem navegador, para que o que resta fique nomeado em vez de ser «a
acessibilidade».

### Rótulos de campo — conforme

**A minha primeira contagem teria sido 90% ruído.** Havia 162 ficheiros com
`<input>` cru, e muitos sem rótulo à vista. Contei por **tipo** em vez de por
tag:

| tipo | quantos |
| --- | ---: |
| `hidden` | **671** |
| visíveis (checkbox, text, email, time, search, radio, password, date) | **37** |

**Este produto posta formulários pelo servidor**, e 671 campos escondidos não
levam rótulo nenhum. A população a verificar eram 37, não 162.

E os 37 usam **dois padrões, ambos correctos**:

```tsx
<label className="bo-campo">            <label htmlFor="nome">{s.nome}</label>
  <input type="checkbox" … />           <input id="nome" name="nome" required />
  <span>{t.activar}</span>
</label>
```

O primeiro associa por **envolvimento** e não precisa de `htmlFor`; o segundo é a
associação explícita. **A minha comparação por ficheiro somava totais que não se
comparam** — um `grep -c '<label'` contra um `grep -c '<input>'` num ficheiro com
nove campos escondidos.

E o componente `Campo`, em 90 ficheiros, faz o completo: `<label htmlFor>`,
`aria-invalid` no erro, `id` na ajuda e **`role="alert"`** na mensagem de erro.

### Língua, títulos e anel de foco — conformes

**`<html lang={idioma}>`**, dinâmico por língua e não fixo.

**Três páginas de 374 têm mais de um `<h1>` na fonte** — e as três são
`return` separados: na carta pública, o QR inactivo (`MENU-018`), a sessão
terminada (`STATE-009`) e a carta normal. **Um renderiza de cada vez**, e cada
`<h1>` leva um `data-tela` com o ID do atlas. É a mesma armadilha de ramos que me
apanhou na página de fechar contas, e desta vez verifiquei antes de a escrever.

**O anel de foco é uma regra abrangente**, e não por componente:

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible
.bo-inverso :where(a, button, input, select, textarea, [tabindex]):focus-visible
```

**A segunda linha é a que mostra cuidado:** um anel desenhado para superfície
clara é invisível numa escura, e o KDS e a moldura comercial são escuros.

### O que resta, e agora tem nome

Tudo o que falta exige **um navegador**, e é isto:

1. o anel de foco **ser visível** contra cada fundo — a regra existe; que ela
   renda contraste suficiente em todas as superfícies é outra pergunta;
2. **alcance por teclado** de cada acção — que a ordem de tabulação chegue lá;
3. **o que um leitor de ecrã anuncia**, sobretudo nos estados;
4. **zoom a 200%**;
5. **o menu móvel** — `Escape` e devolução de foco ao botão. É o **único caso
   real de foco no produto**, porque o JR provou que não há modais, e foi
   declarado por medir por quem o escreveu.

**Nenhum destes está bloqueado por aprovação nenhuma.** É trabalho por fazer, com
população conhecida.

---

## A dependência que «bloqueia a maior parte da secção 7» — medida, e não bloqueia

O inventário do implementador diz que **uma só dependência** gate a M03, M04,
M05, M06, a mídia dos blocos em falta, o herói a 38–41% e o RV100-023: o
inquilino de demonstração estar ausente. **É a afirmação mais consequente sobre o
que falta, e fui medi-la.**

**Primeiro facto: a base não tem o inquilino de demonstração ausente — tem tudo
ausente.**

```
organizations  →  0
locations      →  0
```

**Isso não é perda: é o estado normal entre corridas.** O arnês semeia e limpa; a
base vazia é o resultado de a última limpeza ter funcionado.

**Segundo facto: o inquilino materializa-se a pedido, e prova-o.** Corri o
`provar-demonstracao.sh`:

```
ok  duas corridas, a mesma impressão (b06bec96…)
ok  controlo negativo: a impressão muda quando um prato muda
ok  kds-cozinha 200 · sala-servico 200 · catalogo 200
ok  sala-tablet 200 · carta-movel 200
ok  todas as composições passaram o controlo de sujidade
```

**E depois de correr, `organizations = 0` outra vez.** Semeia, serve, limpa.

### O que isto desfaz, e o que deixa de pé

**A carta pública não está em falta.** A entrada `carta-movel` do
`capturar-demonstracao.mjs` tem esta rota:

```js
rota: `/r/${SLUG_DA_DEMO}/es-ES/menu`
```

**É exactamente a rota que dava 404** — e serve **200** dentro da janela semeada.
O 404 não é a carta a não existir: é a medição a acontecer **fora da janela**.

**Portanto o RV100-023 não está bloqueado**, e a secção 7 também não. O que é
verdade, e continua a ser, é mais estreito e mais accionável:

> **As capturas da secção 7 têm de correr dentro de uma janela semeada** — que é
> exactamente o que o `capturar-demonstracao.mjs` já faz.

**Não é uma dependência em falta. É um passo que existe e que é preciso invocar.**

### Porque é que registo isto com este cuidado

Era a afirmação mais consequente do inventário, e se ficasse de pé mudava o plano
da secção 7 inteira — alguém iria semear uma casa partilhada à mão, ou pior,
construir uma dependência nova para resolver uma que não existe.

**O que a desfez foi correr a coisa em vez de a raciocinar**, e o sinal foi o
mesmo de sempre: um facto independente — cinco capturas a 200 — que contradizia
o 404.

---

## As telas-mestre, indexadas — §7.1 passo 4, a 07/09

Escrito acima que «a secção 7 começa quando» — começou, e acabou. Isto é o que existe.

**25 capturas, 6 mestres, três línguas.** Todas em `evidence/masters/`, com o índice
medido em `mestres.json` (código HTTP, caracteres visíveis, HTML, viewport, rota).

**Frescura: 25 de 25 são posteriores à última alteração ao produto.** Verificado antes de
apresentar, e é a condição que eu próprio pus para mostrar prova a alguém — a `validar-provas-frescas.sh`
mede-a para toda a árvore, e para esta entrega está verde.

| mestre | viewport | estados capturados |
| --- | --- | --- |
| **M01** Landing desktop | 1440x900 | `principal`×3 |
| **M02** Landing telemóvel | 390x844 | `erro`×1, `principal`×3 |
| **M03** Backoffice | 1440x900 | `denied`×1, `erro`×1, `principal`×3 |
| **M04** Staff sala | 390x844 | `erro`×1, `offline`×1, `principal`×3, `vazio`×1 |
| **M05** KDS cozinha | 1280x800 · 1920x1080 | `offline`×1, `principal`×3, `principal-secundario`×1, `vazio`×1 |
| **M06** Carta pública | 390x844 | `principal`×1 |

**O que MUDOU na recaptura das 11h35:** o `M03 erro` passou de `500 / 95 caracteres /
ecrã desenhado FALSO` para `404 / 414 / VERDADEIRO`. Era a fotografia de um 500 que a cura
do RV100-024 tinha acabado de apagar, e ia para aprovação humana como retrato do produto.
As outras 23 saíram byte a byte iguais — o que, aqui, é sinal de captura determinista e não
de instrumento partido: a diferença é que estas foram recapturadas nas MESMAS condições, e
os brancos das 10h20 eram idênticos entre condições DIFERENTES.

**Fora do índice, e declarado:** as 792 composições da §8 continuam a zero, por desenho —
o plano põe-nas depois da aprovação humana, porque capturá-las antes é fotografar telas que
ainda podem mudar.

