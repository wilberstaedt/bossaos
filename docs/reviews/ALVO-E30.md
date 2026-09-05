# Régua do E30 — Analytics, relatórios e gestão multiunidade

> Escrita a 05/09, **antes de existir código**. Nove telas. Contrato:
> [`relatorios-e-agregacao.md`](../architecture/relatorios-e-agregacao.md),
> escrito imediatamente antes desta régua e também antes do código.

## O que muda nesta etapa

Todas as anteriores produziam factos. **Esta produz opiniões sobre factos** — e
uma opinião errada aqui não se distingue de uma certa, porque as duas se
apresentam como um número alinhado à direita, com o mesmo tipo de letra que os
verdadeiros.

E há uma coisa que só esta etapa tem: **é a primeira em que o defeito muda o
comportamento de uma pessoa e não do sistema.** Um relatório errado não parte
nada — faz um gerente fechar um turno, despedir alguém, ou tirar um prato da
carta. O código continua verde enquanto a decisão é tomada.

## 1. Ausência não é zero, e este é o aceite que mais me interessa

Três respostas, não duas: um valor, **zero medido**, e **não há dados**. As duas
últimas escrevem-se iguais se ninguém as separar, e significam o contrário uma
da outra.

`0 €` ao almoço quer dizer *a casa abriu e não vendeu*. Sem dados ao almoço quer
dizer *ninguém sabe*. Quem lê o primeiro fecha o turno de almoço; se o que lá
estava era o segundo, fechou-o por engano.

**Exijo o par lado a lado** — uma unidade sem dados e outra com zero medido,
distinguíveis no ecrã — e o controlo que as colapsa e acende. Um relatório que
mostra zero para as duas coisas é reprovação directa, por mais bonito que esteja.

> É o mesmo par que aplico ao meu próprio trabalho o dia inteiro. **O zero de
> «está tudo bem» e o zero de «não medi» escrevem-se igual.** Aqui a diferença
> chega a um restaurante em vez de a mim.

## 2. Nada de dados de demonstração num inquilino real

Um painel vazio de um cliente real **mostra-se vazio**. Nunca se enche um ecrã
com números inventados para ele parecer completo. Controlo: qualquer dado de
demonstração num inquilino real acende, sem excepção declarada.

## 3. O denominador viaja com o numerador

Uma média de médias está errada sempre que os denominadores diferem — e diferem
quase sempre. Duas unidades com ticket médio de 20 € não dão 20 € juntas se uma
vendeu 10 mesas e a outra 200.

**O controlo tem de mudar o número.** Se calcular a média de médias e o
resultado for igual, não é o código que está certo: são os dados de prova que não
têm o caso. Nesse ponto exijo a semente corrigida, não a prova aceite.

## 4. O período resolve-se por unidade, e só depois se soma

«Ontem» em Madrid e «ontem» noutra unidade não são o mesmo intervalo. Com a regra
do dia de serviço que o E28 fixou. Controlo: somar antes de resolver e ver o
total escorregar de dia.

**O defeito do fuso já passou por baixo de um contrato deste produto uma vez.**
Passou porque o contrato dizia a propriedade certa e não dizia o que fazer na
fronteira. Não passa uma segunda vez pela mesma porta.

## 5. Duas organizações não se somam porque a pessoa é a mesma

Pertencer às duas dá direito a ver as duas, **uma de cada vez**. É a fronteira
onde o isolamento vaza mais facilmente, porque aqui parece conveniência: a soma
é útil para quem a pede, e o dano é de quem não está na sala.

## 6. Do indicador desce-se à transacção

Sempre, com os filtros e a definição à vista **sem sair da tela**. Um número que
ninguém consegue contestar acaba por ser obedecido.

## 7. A exportação é o que estava na tela

Mesmos filtros, mesmo conteúdo. Um ficheiro que não corresponde ao que a pessoa
viu é pior do que não haver exportação — ela vai defender números que não viu. E
um agendado respeita o escopo de **quem o criou**, não de quem o abre: um
relatório que ganha alcance por mudar de mãos é uma fuga com cara de
funcionalidade.

## E as portas

O `início` é a **última entrada morta do menu de gestão**, marcada
`porConstruir: 'E30'`. Esta etapa fecha-a. Depois desta, o menu de gestão não
tem uma única entrada que não leve a lado nenhum — e o controlo de portas passa a
ter o produto inteiro do lado de dentro.
