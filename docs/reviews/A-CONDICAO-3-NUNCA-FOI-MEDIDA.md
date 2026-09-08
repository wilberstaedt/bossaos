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

---

## Correcção: ela FOI medida — mas numa largura só

Fui ver o meu instrumento antes de aceitar a caracterização, e ela muda o que
falta fazer.

O `inspeccao/ns2-visual.spec.ts` **tem** a condição 3, e mede a propriedade certa
com o limiar certo:

```ts
const escala = d.capaNatural ? d.capaLargura / d.capaNatural : 0;
const textoNoEcra = 14 * escala;
if (textoNoEcra < 11) falhas.push(`C3: texto de 14px do produto chega a …`);
```

E passou — `C3 capa=667/720 escala=0.93 texto14=13.0px`.

**O que nunca foi medido não é a condição: é a largura onde ela reprova.** O
bloco das onze condições corre a **1440×900** (linha 201), onde a captura vem a
0,93 da natural. A reprovação de 4,1 px é a **390**, onde a mesma captura vem a
0,29 — e essa largura nunca entrou na população deste bloco.

**É a mesma família do dia, e desta vez é minha:** não é um detector cego, é um
detector aceso sobre uma população que não contém o caso que falha. Verde sobre a
metade que passa.

### O que isto muda em concreto

Não é preciso escrever a medição — ela existe. É preciso **alargar a população**
do bloco às duas larguras, e isso é uma linha. Escrever uma medição nova por cima
de uma que já existe deixava duas a dizer coisas diferentes sobre a mesma
condição, que é como se perde a próxima.

### O que NÃO fiz, e porquê

**Não alarguei a população, e não toquei na landing.** As duas mudam o veredicto
de uma superfície que está **publicada desde as 12h**, e a decisão sobre ela está
neste momento com o Matheus. Alargar a população torna o portão vermelho por uma
razão verdadeira — é informação, não estrago — mas é uma luz que se acende a meio
de uma conversa que não é minha.

**Digo e espero.** Está a uma linha, e a cura do produto (a
`sala-estreita-390.png`, que já existe e vem a 1,00) está diagnosticada por si.
