# Revisão — a metade dinâmica da acessibilidade (do JR)

Entregue em `515ca44` e `ea981dc`. **Fecha o único buraco do dossiê que não
estava bloqueado por aprovação nenhuma**, e que aparecia como `NÃO MEDI`
declarado em quatro lotes seguidos.

---

## O que ficou medido

| | medida | resultado |
| --- | --- | --- |
| o menu móvel devolve o foco ao accionador | 1 menu, o único do produto | conforme |
| anel de foco contra o fundo **de trás do anel** | 62 focáveis, 3 superfícies | conforme, mínimo **3:1** |
| acções principais alcançáveis com `Tab` | **18/18** | conforme |
| 200% de zoom sem rolagem horizontal | 3 superfícies | conforme |

**Duas escolhas dele que são melhores do que o que eu pedi.**

Eu tinha escrito «o anel ser visível contra cada fundo». Ele mediu-o **contra o
fundo de trás do anel**, e não contra o elemento — que é onde o anel realmente
se desenha e o sítio onde ele desaparece.

E foi procurar a superfície certa para a variante escura: **o login é a única
superfície `.bo-inverso` do produto**. Uma regra que existe para superfícies
escuras só se prova numa, e ele encontrou-a em vez de a presumir.

## A resposta à décima forma, e é a parte que interessa

Há duas horas registei a forma de erro mais perigosa da noite: **um detector
partido que concorda com a hipótese que devia testar**. E avisei-o de que *«uma
prova de acessibilidade que não encontra problemas tem exactamente essa forma»*.

A defesa que ele construiu não é um controlo negativo genérico. São **quatro
sondas, uma por detector, cada uma a plantar o defeito que aquele detector tem
de encontrar**:

> «um menu que não devolve o foco, **um anel branco sobre branco**, uma acção
> com `tabindex=-1`, e 2000 px numa janela de 640. As quatro acenderam nesta
> corrida.»

E está escrito no guião como regra e não como boa intenção: *«um zero só conta
depois de a sonda do respectivo detector ter acendido **na mesma corrida**»*.

**«Do respectivo» é a palavra que faz a diferença.** Um controlo global provaria
que *alguma coisa* funciona; quatro sondas provam que **cada zero** foi produzido
por um detector que sabe ver.

## Uma armadilha que ele apanhou em si próprio

Está escrita no ficheiro, na linha 63:

> *«procurar "SONDA" na saída dá NÃO MEDI com as sondas verdes. **Já me
> apanhou.**»*

O guião procurava marcadores na sua própria saída — e a saída das sondas contém
esses marcadores. **O instrumento acusava-se a si próprio.** É primo do
`validar-portas-mortas` que acusava a prosa do meu comentário.

## O âmbito, e a distinção que ele faz

> «FORA: as superfícies com sessão (painel, TPV, KDS) não entram aqui. **É dívida
> declarada, não cobertura.**»

**Essa frase é a razão de eu aceitar o verde.** Três superfícies públicas medidas,
e as com sessão nomeadas como dívida — não caladas, não incluídas por
generosidade.

E o foco preso em modal não se mede *«porque o produto não tem modais»* — o que
ele próprio provou há cinco horas, e que fica ligado por referência em vez de
repetido.

## O que isto fecha

A pasta `evidence/accessibility` estava vazia, e eu tinha-a nomeado no índice
como **«a única que nada bloqueava — ninguém a bloqueou, ninguém a fez»**. Está
feita, e a metade estática que eu tinha medido antes está referenciada de lá.

**Nada aqui está aprovado.** É medição, e a estética continua a ser da secção 7 e
do Matheus.
