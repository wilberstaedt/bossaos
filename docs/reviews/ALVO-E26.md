# Régua do E26 — Fornecedores e compras

> Escrita a 05/09, **antes de existir código**. PUR-001 a 004, SUP-001 e 002.
> Seis telas.

## O que esta etapa é, por baixo dos nomes

O E25 diz o que **há**. O E26 é o que **entra** — e é aqui que o stock ganha a
única fonte de verdade que não vem de nós: a factura do fornecedor.

**A armadilha desta etapa é de confiança.** Uma encomenda é uma intenção; uma
recepção é um facto; e uma factura é a versão do fornecedor. **As três discordam
com frequência**, e um produto que assuma que são a mesma coisa dá stock que não
chegou e paga o que não recebeu.

## 1. Encomendado, recebido e facturado são TRÊS números

Não são estados de um. Pediram-se 10 caixas, chegaram 8, a factura diz 10.

**Exijo os três guardados**, e as diferenças **visíveis como diferenças** — não
resolvidas em silêncio por quem escreveu o código. Quem decide se aceita 8 e
paga 8, ou reclama, é a casa.

**O par:** uma recepção que bate com a encomenda **não gera diferença nenhuma**.
Sem isso, «marca sempre divergência» passava o primeiro.

## 2. Só a RECEPÇÃO mexe no stock

A encomenda não move nada — é uma intenção. A factura também não: é papel.
**O stock só muda quando alguém confirma que a mercadoria entrou.**

**Exijo o controlo negativo que faça a encomenda mover o stock**, e a prova a
acender. É o defeito mais fácil de cometer nesta etapa e o mais caro: a cozinha
vê farinha que está num camião.

## 3. A unidade de compra não é a unidade de uso

Compra-se uma **caixa de 12**; usa-se **uma unidade**. Compra-se um **saco de
25 kg**; a ficha técnica gasta **200 g**.

**A conversão é configurada por fornecedor e por artigo, nunca adivinhada** —
`quantidades-e-unidades.md` já o exige, e aqui é onde morde. Um saco lido como
uma unidade dá stock de 1 onde há 25 000 g, e o inventário só o revela ao fim do
mês.

**E sem factor de conversão, recusa-se.** Adivinhar é o defeito — a mesma regra
do fuso e da densidade.

## 4. O preço de compra não é o preço de venda, e varia

O mesmo artigo custa diferente em duas entregas. **Exijo que o custo do stock
saiba de que entrada veio** — sem isso, qualquer conta de margem é ficção.

Não exijo um método específico de custeio: exijo que **esteja escrito qual é** e
que a prova o exercite. Um custeio implícito é um número que ninguém consegue
reproduzir.

## O que reprovo à cabeça

- **Alcance pelo INTERVALO da etapa**, corrido por ti antes de declarares.
- **Telas sem porta.**
- **Verde sobre zero encomendas.** Declara-se a população.
- **Vírgula flutuante em quantidades ou em dinheiro.**
- **Uma prova que só use o caminho onde tudo bate.** Se não houver recepção
  parcial, recepção a mais e factura divergente, não está provado — está
  demonstrado.
