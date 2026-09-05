# Stock e fichas técnicas

> Escrito no E25, **antes do código**, porque a régua exige as decisões escritas
> e não deduzidas do que ficou implementado.

## O que torna esta área diferente

Até aqui um número errado era um número errado. **Aqui manda comprar comida a
mais, ou deixa a cozinha sem ela a meio de um serviço.** É a primeira vez que o
defeito sai do ecrã e vai parar a uma prateleira.

## 1. O saldo DERIVA-SE. Não há coluna que alguém incremente

Entrada, consumo, quebra, ajuste e transferência são **movimentos**, cada um com
momento, autor e razão. O saldo é a soma deles.

Guardar o saldo como número e ir actualizando perde-o na primeira transacção que
reverte — e o sintoma **não é um erro**: é uma contagem que não bate ao fim do
mês, sem ninguém saber desde quando.

Há uma coluna de saldo, sim, mas **ninguém lhe escreve**: é derivada por
**gatilho**, como o `producao_em` do E20. Um valor escrito de fora é
**substituído**. É a diferença entre uma regra que se pode desrespeitar e uma
coisa que não se consegue fazer.

## 2. As quantidades são inteiras. Nunca vírgula flutuante

`0,1 + 0,2` não é `0,3`, e três gramas por prato viram um quilo por mês. É o
mesmo argumento do dinheiro, e a resposta é a mesma: **inteiros numa unidade
mínima**.

A unidade mínima é o **milésimo**: 1 kg é `1_000_000`, 1 g é `1000`, 1 L é
`1_000_000`. O sufixo `Mili` no nome diz qual é a escala, como o `Menor` diz no
dinheiro — e é por esse sufixo que a guarda os reconhece.

## 3. A ficha técnica é uma ÁRVORE, e o ciclo é recusado NA ESCRITA

Um prato consome ingredientes; um ingrediente pode ser uma sub-receita. Vender
um prato desce a árvore **até às folhas**: desconta os ingredientes reais, e não
a sub-receita como se fosse um produto comprado.

**O ciclo é recusado quando se escreve a linha**, por gatilho, com uma travessia
recursiva. Não é detectado em serviço — porque em serviço a recursão acontece a
meio de um sábado, e o que se vê não é um ciclo: é o sistema a parar.

## 4. O consumo acontece quando a linha é SERVIDA

**A decisão, e a razão:** um pedido cancelado antes de produzir não consome nada
— a comida não foi feita. Um pedido produzido e devolvido **consome** — a comida
foi feita, e devolvê-la não a repõe no frigorífico.

Por isso o consumo é lançado na passagem a **servido**, e o movimento é
**imutável**: uma devolução não desfaz o consumo. Se a comida foi para o lixo,
isso é uma **quebra** — outro movimento, com a sua razão. Dois factos diferentes
não se colapsam num só.

## 5. Stock negativo: **VISÍVEL**, e nunca silencioso

As duas saídas defendem-se, e escolho a visível. A razão é operacional:

**A contagem vai estar errada** — é o dado mais previsível desta área. Com
«impossível», uma contagem errada **trava o serviço** com um cliente à frente às
21h, e o que a equipa faz a seguir é lançar um ajuste inventado para desbloquear
— que estraga a contagem ainda mais e apaga o rasto do problema.

Com «visível», serve-se, e a **dívida aparece**: há uma lista de saldos negativos
que a tela mostra, e ela não se apaga sozinha. O erro fica onde alguém o vê e o
pode contar.

**O que não existe é a terceira: negativo silencioso.** Um saldo abaixo de zero
que não apareça em lado nenhum é a contagem a mentir sem ninguém saber — e é
exactamente isso que esta etapa existe para impedir.

## O que se testa

Conta: o saldo escrito de fora ser substituído; o desconto descer até às folhas;
o ciclo ser recusado na escrita; o cancelado antes de produzir não consumir; o
negativo ser permitido **e aparecer**.

Não conta: um teste que soma movimentos que ele próprio escolheu para dar certo.
O caso que interessa é a sub-receita dentro da sub-receita, e o saldo que passa
a zero.
