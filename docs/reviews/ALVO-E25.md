# Régua do E25 — Stock e fichas técnicas

> Escrita a 05/09, **antes de existir código**. INV-001 a INV-012.

## O que torna esta etapa diferente das outras

Até aqui, um número errado era um número errado. **Aqui um número errado manda
comprar comida a mais, ou deixa a cozinha sem ela a meio de um serviço.** O
stock é a primeira etapa em que o defeito sai do ecrã e vai parar a uma
prateleira.

E tem uma armadilha própria: **o stock não é uma coluna, é um saldo derivado de
movimentos.** Quem o guardar como número e o for actualizando à mão perde-o na
primeira transacção que reverte — e o sintoma não é um erro, é uma contagem que
não bate ao fim do mês, sem ninguém saber desde quando.

## 1. O saldo DERIVA-SE dos movimentos, e não se escreve

Entrada, consumo, quebra, ajuste, transferência: cada um é um movimento com
momento, autor e razão. **O saldo é a soma deles**, não uma coluna que alguém
incrementa.

**O par que exijo:** escrever o saldo de fora **é substituído** — como o
`producao_em` do E20, por **gatilho da base** e não por disciplina de quem
chama. E o controlo negativo que larga o gatilho e vê a prova acender.

**Reprovo à cabeça um `UPDATE stock SET quantidade = ...`** em qualquer caminho.

## 2. A ficha técnica é uma ÁRVORE, e o consumo desce por ela

Um prato consome ingredientes; um ingrediente pode ser uma sub-receita que
consome outros. **Vender um prato tem de descer a árvore inteira.**

**Exijo os dois casos e o par:** um prato de um nível desconta o que era de
esperar; um prato com sub-receita desconta **os folhas**, não a sub-receita como
se fosse um produto. E o **ciclo**: uma ficha que se refira a si própria, directa
ou indirectamente, **é recusada na escrita** — não detectada em serviço, quando
o desconto entrar em recursão a meio de um sábado.

## 3. O consumo acontece quando o prato é SERVIDO, não quando é pedido

Um pedido cancelado antes de produzir não consome nada. Um pedido produzido e
devolvido consome — a comida foi feita.

**Exijo a decisão escrita e provada**, seja qual for: o que não aceito é o
momento do consumo ser um acidente de onde alguém chamou a função.

## 4. Stock negativo: ou é impossível, ou é visível

As duas defendem-se. **Impossível** é mais seguro e trava o serviço quando a
contagem está errada — e a contagem **vai** estar errada. **Visível** deixa
servir e mostra a dívida.

O que reprovo é a terceira: **negativo silencioso**, que corre e ninguém vê.
Exijo a escolha feita, escrita, e provada nos dois sentidos.

## O que reprovo à cabeça

- **Alcance pelo INTERVALO da etapa** — `scripts/varrer-alcance-da-etapa.sh`,
  corrido por ti antes de declarares. Falhei esta verificação três vezes de
  maneiras diferentes; agora é um comando, não a minha memória.
- **Telas sem porta.** `portas-e-navegacao.md`. Já custou um marco.
- **Verde sobre stock vazio.** Declara-se quantos movimentos e quantas fichas.
- **Aritmética de vírgula flutuante em quantidades.** 0,1 + 0,2 não é 0,3, e
  três gramas por prato viram um quilo por mês. A guarda do dinheiro cobre
  dinheiro; **as quantidades precisam da mesma disciplina** e ainda não têm
  guarda — se inventares uma, digo-o na assinatura.
- **As 12 telas sem navegador**, cinco larguras, ES/PT/EN.
