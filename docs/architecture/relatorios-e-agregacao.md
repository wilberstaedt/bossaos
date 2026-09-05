# Relatórios e agregação

> Escrito a 05/09, **antes de existir código do E30**. Por fronteira, não por
> tema. O que o dinheiro é está em [dinheiro.md](dinheiro.md); as quantidades em
> [quantidades-e-unidades.md](quantidades-e-unidades.md); a atribuição a período
> em [conciliacao-e-fecho.md](conciliacao-e-fecho.md). Isto é sobre o que
> acontece quando números **verdadeiros** se juntam e passam a mentir.

Um relatório é a superfície onde um erro deixa de parecer um erro. Não rebenta,
não mostra aviso: **mostra um número, com o mesmo ar de todos os outros.**

---

## Fronteira 1 — um conjunto está vazio

**A fronteira mais importante desta etapa, e a que se erra por omissão.**

Há três respostas, não duas: **um valor**, **zero medido** e **não há dados**. As
duas últimas escrevem-se iguais no ecrã se ninguém as separar, e significam
coisas opostas:

- **`0 €` de vendas ao almoço** — a casa esteve aberta e não vendeu nada. É um
  facto, e é mau.
- **sem dados ao almoço** — ninguém sabe. Pode ter vendido tudo.

Um gerente que lê o primeiro fecha o turno de almoço. Se o que estava lá era o
segundo, fechou-o por engano.

**A regra:** o número que se mostra traz consigo se foi medido. Um agregado sem
linhas devolve **ausência**, e a tela di-lo por palavras — nunca `0`, nunca `—`
sem legenda. E **nunca, em circunstância nenhuma, se inventam dados para encher
um ecrã**: um painel vazio de um cliente real mostra-se vazio.

## Fronteira 2 — um número aparece numa tela

Todo o indicador tem de responder a três perguntas **sem sair da tela**: de que
transacções veio, que filtros estavam postos, e qual é a definição.

**Sem isto um relatório não é verificável, e um número que ninguém consegue
contestar acaba por ser obedecido.** É a mesma exigência do total que desce à
transacção, no E29.

## Fronteira 3 — números de várias unidades encontram-se

Três coisas viajam com o número, ou ele não se agrega:

**A moeda.** Não se somam moedas diferentes (contrato do dinheiro, fronteira 5
do E29). Agrupa-se, ou converte-se com fonte e data à vista.

**O fuso.** «Ontem» em Madrid e «ontem» noutra unidade não são o mesmo intervalo.
O período resolve-se **por unidade**, com a regra do dia de serviço que o E28
fixou, e só depois se soma. Somar primeiro e converter depois é o defeito do
fuso outra vez, num sítio onde ninguém o vê.

**O denominador.** Uma média de médias está errada sempre que os denominadores
diferem — e diferem quase sempre. Duas unidades com ticket médio de 20 € não dão
20 € juntas se uma vendeu 10 mesas e a outra 200. **O numerador e o denominador
viajam juntos, e a média calcula-se no fim.** É a mesma lei da unidade que viaja
ao lado da quantidade.

## Fronteira 4 — a mesma pessoa pertence a duas organizações

**Nunca se consolidam.** Pertencer às duas dá direito a ver as duas, **uma de
cada vez** — não dá direito a um número que some as duas.

É a fronteira onde o isolamento costuma vazar, porque aqui ele parece um
detalhe de conveniência em vez de uma regra: a soma é útil para quem a pede e o
dano é de quem não está na sala. **O alcance é do que se vê, e a consolidação é
uma decisão comercial que ninguém tomou.**

## Fronteira 5 — uma vista sai da tela

**Uma exportação usa os filtros da tela que a gerou.** Um ficheiro que não
corresponde ao que a pessoa estava a ver é pior do que não haver exportação:
ela vai defender números que não viu.

**Um envio agendado só sai depois de destinatários e permissões configurados**, e
o agendado respeita o **escopo de quem o criou** — não o de quem o abre depois.
Um relatório que ganha alcance por mudar de mãos é uma fuga com aspecto de
funcionalidade.

## Fronteira 6 — clonar configuração entre unidades

Copia-se **catálogo e configuração**; nunca **pedidos nem clientes**. A herança
de catálogo mantém-se, e a diferença mostra-se antes de aplicar: quem clona tem
de ver o que vai mudar enquanto ainda pode voltar atrás.

---

## O que vou exigir como prova

1. **Ausência contra zero**, com o par: uma unidade sem dados e outra com zero
   medido, lado a lado, **distinguíveis no ecrã**. Controlo: colapsar as duas e
   ver a prova acender.
2. **Média ponderada** com denominadores diferentes. Controlo: calcular média de
   médias e ver o número mudar — se não mudar, os dados de prova não têm o caso.
3. **Duas unidades em fusos diferentes** à volta da meia-noite. Controlo: somar
   antes de resolver o período e ver o total escorregar de dia.
4. **A mesma pessoa em duas organizações** — dois números, nunca um. Controlo:
   consolidar e ver acender.
5. **Exportação contra tela** — os mesmos filtros, o mesmo conteúdo.
6. **Painel vazio de cliente real** — mostra vazio. Controlo: qualquer dado de
   demonstração num inquilino real acende, sem excepção.
7. **Do indicador à transacção** — desce-se sempre.

E a **semente tem de conter o caso mau**: uma unidade sem dados nenhuns, duas
moedas, dois fusos e denominadores desiguais. Sem isso, o painel mede o caminho
feliz — e o caminho feliz de um relatório é precisamente aquele onde todos os
números parecem certos.
