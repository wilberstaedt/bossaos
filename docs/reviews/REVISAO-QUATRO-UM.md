# Revisão das três correcções do §4.1, e a decisão do CTA móvel — 08/09, 14h35

## O que não consegui verificar, e digo-o primeiro

Corri a fita métrica do §4 contra a landing **publicada** e deu os mesmos **11
desvios**. Não é falha das correcções dele: elas estão **commitadas e não
publicadas**. A fita mede o que está no ar, que é o que o Matheus vê.

Portanto esta revisão é **do código e do raciocínio**, e a verificação pela fita fica
para depois da próxima publicação. Declarado, como das outras vezes.

## O que aceito, e porquê

**O selector de idiomas.** Reutilizou o `GrupoMkt`, que já é o mecanismo de agrupar
desta barra, em vez de construir um selector novo — «um selector novo seria uma
segunda forma de fazer a mesma coisa». E o rótulo mostra o **idioma actual**, porque
«um selector que não diz o que está seleccionado obriga a abri-lo para saber onde se
está». As duas razões são de desenho e são boas.

**O CTA coral, e o tamanho que subiu com a cor.** Esta é a mais interessante, e não
é preferência: **sobre coral não há cor de texto que chegue a 4,5:1** — o tecto é
3,84 com branco e 3,73 com o verde. A 16 px normais, pintar o CTA de coral seria uma
falha de contraste. A 19/700 entra na faixa de **texto grande** da 1.4.3, onde o
limiar é 3.

Ou seja: **cumprir o §4.1 na cor obrigou a mexer na tipografia para continuar legal.**
É a mesma impossibilidade do coral que já tínhamos provado noutro sítio, e a saída é
a mesma. Confirmado por medição — `superficies=12 medidas=12 maus=0` — e não pela
palavra dele.

## A decisão que ele me escalou: o CTA no cabeçalho móvel

Ele confirmou o que a fotografia mostrava: a 390 o cabeçalho tem só a marca e o
hambúrguer. **E não o corrigiu, de propósito**, com a razão certa: o CTA existe, mas
vive dentro da `<nav>` do painel, e é dessa `<nav>` que a `marketing.spec.ts` prova
que as sete rotas se alcançam da landing. Tirá-lo de lá parte essa prova, e a
alternativa seria **alargar o selector da guarda** — «mexer numa guarda para acomodar
desenho».

**Fez bem em parar.** Não se afrouxa uma guarda para caber um desenho: é o mesmo
princípio pelo qual eu, meia hora antes, declarei os globais do navegador **no meu
ficheiro** em vez de os abrir a todos os `scripts/**`.

**A minha decisão: duplicar, não mover.** O CTA fica onde está, dentro da `<nav>`, e
a prova das sete rotas continua a passar intacta. Acrescenta-se **uma segunda
instância** no cabeçalho, visível a 390. Não há conflito: o painel está fechado, o
utilizador vê um botão, e nenhuma guarda é tocada.

Se aparecer alguma guarda a contar CTAs e a reprovar por serem dois, **isso é
achado**, não obstáculo — quero saber, e nesse caso volta a mim.
