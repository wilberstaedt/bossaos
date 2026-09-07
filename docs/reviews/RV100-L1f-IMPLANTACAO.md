# Revisão do lote L1f — implantação e equipamentos

Entrega em `d4fe5e1`. Primeiro lote do implementador novo, depois de o anterior
perder a sessão.

---

## As três ressalvas do §6.6, verificadas nas três línguas

São o coração do bloco — o que evita que um restaurante leia a página, conclua
que compra um pacote, e descubra o contrário na semana da instalação.

| | es-ES | pt-BR | en |
| --- | :-: | :-: | :-: |
| nenhum modelo sem homologação | 5 | 5 | 5 |
| compra/garantia/rede não incluídas | ✓ | ✓ | ✓ |
| sem kit fechado | ✓ | ✓ | ✓ |

E em frases a sério, não em ressalva de rodapé:

> *«No vendemos ningún kit cerrado. No existe una caja que…»*
> *«A gente não vende kit fechado. Não existe uma caixa que…»*
> *«We sell no closed kit. There is no box that arrives with…»*

**Nota de método, e é a sétima da noite.** A minha primeira contagem deu 10 em
espanhol e **zero** nas outras duas. Procurei o radical espanhol (`incluid`) nas
três línguas — a minha forma nº 1 combinada com a nº 8, e escritas por mim há
vinte minutos no `COMO-REVISO.md`. Com padrão por língua, as três aparecem.

## O emparelhamento dele é melhor do que o meu critério

Eu tinha pedido «que as três ressalvas apareçam no corpo e não em letra
pequena». Ele **emparelhou cada ressalva com o tamanho de letra a que aparece** —
as três a **16 px**, nas três línguas, a 390. E diz porquê:

> «Um contador de "homologação" fica verde numa nota de rodapé a 11 px.»

E foi mais longe onde eu não tinha pensado: o detector de «kit fechado» casa a
**frase inteira** e não `cerrad`, *«que apanharia "precio cerrado" nos adicionais
e ficaria verde pela razão errada»*. **É a minha armadilha nº 2 aplicada por ele,
sem eu lha ter dito.**

## O método que eu lhe dei apanhou-o — e ele percebeu porquê

A primeira versão da medição «renderizado vs capturado» dividia por
`naturalWidth` e devolveu **102%**, que não pode existir.

> «Com `srcset`, o `naturalWidth` **é** a variante servida, escolhida pelo
> `sizes` — o denominador movia-se com o numerador.»

**O instrumento media entrega e não escala**, e teria dado ~100% em qualquer
composição — **incluindo o herói da home, que eu sei estar a 38%**. Com a largura
de captura como denominador: 37% / 41% / 86% / 71% / 71%. Guarda os dois, com
nomes distintos.

E o 37% a 360 px ele classifica bem: *«é aritmética, não composição — nenhuma
captura de 834 px passa de ~43% num telemóvel de 360»*. **Medido, não resolvido**,
e o arranjo é uma captura em largura de telemóvel ou nenhuma mídia no herói em
telemóveis — que é secção 7.

## O estado anterior que ele mediu antes de mexer

`titulos: ['Así empezamos contigo', 'Así empezamos contigo']` — **o `h1` e o `h2`
eram a mesma chave.** Quatro passos copiados do bloco 9 da home palavra por
palavra, zero preços, e **nenhuma das três ressalvas presente**.

## Duas coisas de infraestrutura que valem para além deste lote

**1. `NEXT_DIST_DIR`.** O `playwright.config.ts` parametriza a porta para permitir
dois processos e **deixa o directório de build fixo** — os dois escrevem o mesmo
`.next`. Ele apanhou-o ao vivo: `/es-ES/getting-started` deu **200 e depois 500
com o mesmo código**. O 500 não era a página.

**2. Sem a linha de eslint, o `pnpm lint` entra no build** e devolve **32 762
erros de código gerado**, a afogar os reais.

## O aviso dele estava certo, e agiu-se

Ele reparou noutra sessão viva no repositório a editar `alvos.ts` e
`kds.spec.ts`, e avisou que **a correcção multi-inquilino estava por commitar e
podia perder-se**. É o Lúmen JR — **e a falha de comunicação é minha**: avisei o
JR de que ele existia, e não o avisei de que o JR existia.

Verifiquei e o aviso era real: o trabalho do JR levava a guarda de **7 para 21
consultas com casa**, sobre 31 tabelas, e estava todo na bancada. **Guardei-o sem
lhe tocar** — `git stash create` produz o objecto sem mexer na árvore — na
etiqueta `salvaguarda-jr-alvos` (`e371bbd`, 55 linhas). O `md5` do ficheiro dele
é idêntico antes e depois.

## O NÃO MEDI que ele escolheu, e concordo

Não correu a guarda de expansão de texto porque **exige semear a base partilhada**
e outra sessão estava a correr. Parou em vez de semear por cima.

> «Este é o buraco mais relevante, porque a minha copy nova em PT e EN é mais
> longa do que a que substituiu.»

**Sabe qual é o risco que deixa aberto e nomeia-o.** É a classificação certa: o
custo de medir era partir a corrida de outro.

**L1f fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
