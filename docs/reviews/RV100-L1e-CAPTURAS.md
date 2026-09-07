# Revisão do lote L1e — as capturas ligadas

Entrega em `e2a1418`.

---

## O 728 caiu, e verifiquei as duas pontas na evidência, não na tabela dele

| largura | antes | depois | `ocupaDireita` |
| ---: | ---: | ---: | --- |
| 1280 | 648 | **1176** | `false` → **`true`** |
| 1440 | **728** | **1256** | `false` → **`true`** |

**E confirmei que o número vem da métrica certa.** O 1256 é exactamente o valor
que a home dava *antes de qualquer trabalho*, quando a métrica somava o máximo
`right` de **todos** os descendentes e um `<p>` de largura total a saturava. Se
o novo 1256 viesse dali, não provava nada.

Vem do `folhaAteX` — «máximo `right` das **folhas com conteúdo**, elementos sem
filhos». E a aritmética fecha: a caixa é **1072**, centrada em 1440, logo
`(1440−1072)/2 + 1072 = 1256`. **O conteúdo chega mesmo ao bordo direito do
contentor.** A 1280 dá 1176 pela mesma conta.

`ocupaDireita` a virar de `false` para `true` nas duas larguras é um segundo
sinal independente a dizer o mesmo.

**A regra aplicou-se sem cláusula e passou.** No L1b eu não lha apliquei porque a
saída era minha e ele usou-a; ontem à noite ele próprio destruiu a saída ao
construir o motor de prova, avisei-o disso antes de começar, e o herói mudou.

## O meu achado do KDS: confirmado, e diagnosticado melhor do que eu tinha

Eu tinha visto na imagem que a etiqueta encostava ao nome do prato e escrito que
**não era truncagem**, por não haver regra de corte. Ele mediu no DOM: **folga de
`0 px`**, `text-overflow: clip`, `white-space: normal`, `line-clamp: none`.

**A causa é melhor do que a minha observação.** A regra que dá `flex` e `gap`
àquela linha é `.bo-publico__produto > a`. O bilhete do KDS **não tem `<a>`** —
põe os dois `<span>` directamente no `<li>`. Logo `display: list-item`, o `gap`
fica inerte, e os dois `inline` encostam.

**A carta pública tem o `<a>` e por isso nunca mostrou o defeito.** Mesmo
componente, duas superfícies, e o defeito só aparece numa — que é exactamente
por que razão o encontrei numa captura e não numa varredura de CSS.

Corrigido com margem e não com `flex`, porque mudar o `<li>` reordenava a
descrição e as acções. **0 → 12 px**, e verifiquei olhando outra vez para a
captura: as três etiquetas descolaram.

## A medição que mudou o desenho dele — e é a melhor coisa do lote

Ele comparou a largura a que cada imagem **é renderizada** com a largura a que
**foi capturada**. A `/product` punha a sala e o KDS lado a lado: **37% cada**.
Empilhadas: **74% e 84%**.

> «Títulos aguentam, o corpo não.»

**Isto é o §6.4 a ser cumprido pela razão certa**, e não pela letra: a regra diz
*«não esconda UI má dentro de blur, perspectiva extrema ou mockup minúsculo»*, e
a forma de a cumprir não é evitar a palavra «mockup» — é **medir a que escala a
interface fica legível** e compor a partir daí.

**E não escondeu o que ficou mal:** no herói as duas imagens ficam a **41% e
38%**, e ele diz o número. Subir isso exige recortar ou recapturar mais estreito,
e as duas são decisões de composição — que é a secção 7 e é do Matheus. **Fica
medido, não resolvido**, e essa é a classificação correcta.

## A `/product` deixou de ser a home

**11 chaves com 10 partilhadas → 21 com 6.** Verifiquei o que são as seis: `altSala`
e `altKds` descrevem **as mesmas duas imagens**, `heroiLegenda` liga-as,
`demoAviso` é deliberadamente uniforme, e `pedirDemo`/`verPlanos` são rótulos.
**Nenhuma é conteúdo repetido.**

## O tablet, fechado como devia

`sala-tablet-834` — retrato de iPad. Cinco composições, quatro larguras: 390,
834, 1280, 1440. **Não chamou 1280 de tablet**, que era a tentação que ele
próprio tinha nomeado no lote anterior.

## O que fica aberto, com as palavras dele

Formatos de origem por optimizar. **O herói a 38–41% por resolver.** As outras
cinco páginas comerciais continuam sem mídia. Nada de teclado nem leitor de ecrã
sobre as figuras novas.

**L1e fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
