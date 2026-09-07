# Revisão — `validar-expansao-de-texto.sh` (do JR)

Pedida por mim depois de eu medir que a guarda não existia. Verde ao correr, e o
verde tem qualificador.

---

## O que está certo, e é a maior parte

**A sonda faz o que eu exijo e poucas fazem:** injecta uma cadeia longa e exige
que o detector **fique vermelho**; depois confirma que os três ficheiros de
mensagens ficaram **byte a byte**. Verde sem essa sonda seria indistinguível de
um guião que não olha para nada.

**Sete portas de NÃO MEDI**, cada uma a nomear uma maneira diferente de a
medição ficar oca — e duas delas são precisamente as que me apanharam esta
semana:

> «nenhuma cadeia cresce 30% — ou as línguas são iguais, ou o leitor está cego»
>
> «um dos ecrãs não deu texto para medir — sem população, não há verde nem
> vermelho»

**Controlo de população antes de medir:** 337 cadeias crescem 30% ou mais, e o
guião diz «há o que medir» antes de dizer o que quer que seja sobre caber. Bate
com a minha medição independente (148 em pt-BR + 188 em es-ES).

**E a pontaria é boa:** os três ecrãs são os dois do KDS e a página de chaves das
integrações — exactamente onde vivem as duas cadeias de 2,08× que eu tinha
medido. Cada um traz um campo `porque` escrito.

## O qualificador, e é onde eu discordo do formato

O guião diz, com honestidade: *«o que cabe em inglês cabe também em es-ES e
pt-BR, **nos ecrãs medidos**»*. Os ecrãs medidos são **três**.

**O problema não é o âmbito — é que o âmbito não sai do guião.** Numa varredura
de 36 guardas, uma linha verde chamada `validar-expansao-de-texto` lê-se como «a
expansão de texto está tratada». O que ela significa é «nas duas telas do KDS e
numa das integrações, na largura mais apertada, o texto cabe». São coisas
diferentes, e a segunda é a verdadeira.

**Isto não é defeito dele** — está tudo escrito no ficheiro. É defeito da forma
como o corredor apresenta guardas: o nome e o código de saída atravessam, o
qualificador não.

## O que ele chamou adivinhação, e não é

Ele nomeou a fraqueza do próprio desenho, que é a parte que mais gostei:

> «É uma lista, e uma lista envelhece — mas a alternativa era mapear chave para
> ecrã por adivinhação.»

**Fui verificar e não é adivinhação: o mapa deriva-se.** Os namespaces do i18n
trazem o código da etapa no próprio nome, e o atlas tem a etapa por ID:

- **29 dos 59 namespaces de topo** carregam um código (`kdsE16`,
  `integracoesE32`, `catalogoE07`, `fiscalE24`…);
- o `coverage.csv` tem **29 etapas distintas**;
- **as 29 casam — todas.**

Portanto `kdsE16 → E16 → 20 IDs do atlas` e `integracoesE32 → E32 → 13 IDs`. As
duas cadeias de topo deixam de apontar para três ecrãs e passam a apontar para
**trinta e três**, sem ninguém adivinhar nada.

**Com a ressalva honesta:** trinta namespaces **não** têm código (`estado`,
`tema`, `entrar`, `mfa`, `plataforma`…), e esses continuam a precisar de lista à
mão. A derivação não elimina a lista — **corta-a a metade e torna visível a
metade que resta**, que é exactamente o que falta hoje.

## O que peço a seguir

1. **Derivar os ecrãs do `coverage.csv`** pelo código de etapa no namespace, em
   vez da lista de três. A lista fica só para os namespaces sem código, e essa
   fica declarada — como a `EM_DIVIDA` das suites, com tecto que só sobe à mão.
2. **O guião tem de imprimir o âmbito no fecho**, não só no corpo: «N ecrãs
   medidos de M candidatos». Um verde que não diz sobre quantos passou é um
   verde a que falta o denominador — e o denominador em falta já me enganou
   cinco vezes este mês.

**A guarda entra no corredor como está.** É melhor ter uma medição estreita e
declarada do que não ter medição, e nada do que peço acima a invalida.

---

## Segunda volta: os dois pedidos feitos, e ele corrigiu-me no meio

**Pedido 1 — derivar em vez de listar: feito.** De **3 ecrãs para 276**.

**Pedido 2 — imprimir o âmbito: feito, e melhor do que eu pedi.** Eu tinha
pedido «N medidos de M». Ele imprime isso e mais a razão de cada exclusão:

```
âmbito:  276 ecrãs medidos de 281 candidatos, derivados de 219 cadeias que crescem
         fora da medição: 64 com parâmetro por resolver, 6 sem endereço, 8 namespaces em dívida
```

**Um verde que diz o que não olhou.** É a diferença entre «passou» e «passou
sobre isto, e isto ficou de fora por esta razão».

## E a correcção que ele me fez, que é a parte que interessa

Eu escrevi-lhe: *«29 dos 59 namespaces têm código, o `coverage.csv` tem 29
etapas distintas, e **as 29 casam — todas**»*. Ele foi verificar antes de
aceitar:

> «29 trazem código, e esses colapsam em **25 códigos distintos** — não 29. O
> atlas tem 29 etapas distintas, e é uma **coincidência de número**, não a mesma
> contagem: são dois conjuntos diferentes com o mesmo cardinal, que é
> precisamente a forma como **uma confirmação falsa se disfarça de
> confirmação**.»

**Tem razão, e o erro é fino.** Vinte e nove namespaces não são vinte e nove
códigos — vários partilham etapa. Eu vi dois vinte-e-noves e li-os como o mesmo
conjunto. **Dois conjuntos com o mesmo cardinal é exactamente o que uma
coincidência parece quando dá jeito.**

**O que aguenta é a direcção**, e é ele que a nomeia: *«nenhum dos 25 códigos
falha o atlas»*. Isso continua verdade e é o que sustenta a derivação. O que cai
é a simetria que eu tinha sugerido.

**E acrescentou o que eu não tinha visto:** `E02`, `E04`, `E05` e `E06` **não têm
namespace nenhum**, e por isso nunca seriam alcançadas por derivação. A minha
frase deixava crer que a derivação varria as etapas todas; varre 25 e há quatro
que lhe são invisíveis por construção.

## A dívida, contada como deve ser

Tecto de **8** namespaces sem código, cada um com a razão escrita. O `estado` —
as telas do E02 — não se deriva porque o atlas lhes chama «(na rota que executa
a acção)»: **não há endereço a que ir, medi-las exige provocá-las.** Bate certo
com o que eu medi por outro caminho no mesmo tick: 16 IDs do atlas sem URL
nenhum.

E a linha que fecha o desenho: *«um tecto que apanha quem o escreveu está a
fazer o trabalho»*.

**A guarda fica no corredor com âmbito visível.** Os dois pedidos estão feitos e
a correcção que ele me fez fica registada como dele.
