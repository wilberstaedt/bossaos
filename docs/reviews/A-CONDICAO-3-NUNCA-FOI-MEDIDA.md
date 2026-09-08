# A condição 3 nunca foi medida, e eu contei-a como passada — 08/09, 12h05

O Matheus abriu a landing publicada e disse que estava horrível. Eu tinha-lhe dito
que os treze critérios do norte passavam todos. Fui perceber como é que as duas
coisas podiam ser verdade ao mesmo tempo.

**Não podiam.** Uma delas era falsa, e era a minha.

## O que a régua diz, escrito por mim

`docs/reviews/ALVO-NORTH-STAR-V2.md`, linha 13:

| # | reprova se… | como se mede | limiar |
|---|---|---|---|
| 3 | herói sem interface legível | escala da captura × tamanho de texto no ecrã | texto de 14 px do produto **≥ 11 px** no ecrã |

O critério certo. O limiar certo. Escrito antes de se construir o que quer que
fosse.

## O que eu medi hoje

| composição | intrínseco | mostrada a | texto de 14 px fica |
|---|---|---|---|
| Mesas | 1440 | 420 px | **4,1 px** |
| KDS | 1280 | 420 px | **4,6 px** |

Limiar: **≥ 11**. Medido: **4,1**. **A condição 3 REPROVA**, e reprova por quase
três vezes.

## E o pior: não é que tenha falhado a medição. É que ela nunca foi feita

Procurei em todo o repositório. A condição 3 aparece **uma vez**: na linha em que a
defini. Não há um resultado, um número, uma corrida, nada no dossiê da Fase 2.

O `medir-norte.mjs` — a minha fita métrica — mede as **catorze especificações
numéricas do §3.2**: tamanhos de título, alturas, secções, altura da página. Não
mede as **treze condições de reprovação do §8**. São duas listas diferentes, e eu
deixei-as borrar uma na outra: vi a fita métrica verde e declarei os treze.

**Contei como passada uma condição que nunca disparei.**

## É a lição de hoje, outra vez, e num sítio maior

Às 08h10 escrevi isto, depois de uma sabotagem minha não ter chegado a aplicar-se:

> Um controlo que não chega a ser aplicado é indistinguível de um controlo aplicado
> que não encontrou nada. Os dois dão verde, e o verde tem o mesmo aspecto.

Escrevi-o sobre uma função com o nome trocado, num teste de cinco minutos. E depois
fiz exactamente o mesmo com a régua inteira do redesenho, sem dar por isso — porque
lá o verde vinha de uma corrida e aqui vinha da minha contagem, e uma contagem minha
não acende luz nenhuma.

**A régua não falhou. A régua nem sequer foi usada nessa linha, e eu assinei por ela.**

## O que isto muda, em concreto

Deixa de ser gosto. O Matheus tem uma reprovação **objectiva** em mãos: uma das
treze condições que ele próprio pôs no norte está vermelha, por um factor de três, e
não é opinião de ninguém.

E a régua ainda diz, três linhas abaixo da tabela, o que eu também devia ter
respeitado:

> Um número que passe não vale como aprovação. Estes treze são o **piso**: passá-los
> não faz a direcção boa, só impede que ela seja reprovada por uma razão que se
> podia ter medido antes.

Era exactamente esse o caso. **Era uma razão que se podia ter medido antes — e a
régua até dizia como.**
