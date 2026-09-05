# Compras e fornecedores

> Contrato do E26, escrito a 05/09 **antes de existir código**.
> Régua: `docs/reviews/ALVO-E26.md`. Depende de
> `stock-e-fichas.md` e de `quantidades-e-unidades.md`.

## O problema, por baixo dos nomes

O E25 diz o que **há**. O E26 é o que **entra** — e é a primeira vez que o stock
recebe números que **não são nossos**.

A armadilha é de confiança. Uma encomenda é uma **intenção**, uma recepção é um
**facto**, e uma factura é a **versão do fornecedor**. As três discordam com
frequência, e não por avaria: pediram-se 10 caixas, chegaram 8, a factura diz 10.
Isso é uma terça-feira normal.

---

## 1. Três números, e não três estados de um

`encomendado`, `recebido` e `facturado` vivem em **sítios diferentes**, porque
são **factos diferentes, ditos por gente diferente, em momentos diferentes**.

- `purchase_order_lines.encomendado_mili` — o que a casa pediu.
- `receipt_lines.recebido_mili` — o que a casa contou à porta. **Várias
  recepções por encomenda**, porque a entrega parcial é o normal.
- `supplier_invoice_lines.facturado_mili` — o que o fornecedor diz que entregou.

**As diferenças não se guardam: derivam-se.** É a espinha deste projecto desde o
E22 — o estado da conta, o da caixa, o saldo de stock, o `producao_em`. Uma
coluna `divergencia` seria mais um número para ficar errado, e ficaria: bastava
uma segunda recepção escrita por outro caminho.

**E não há um estado que colapse os três.** Um campo `estado: RECEBIDA` obriga a
escolher entre «recebida» e «recebida a menos», e a escolha apaga a diferença
que a casa precisa de ver. O estado da encomenda **deriva** da comparação — e
quem decide se aceita 8 e paga 8, ou se reclama, é a casa.

## 2. Só a RECEPÇÃO mexe no stock

A encomenda não move nada. A factura também não: é papel.

**A garantia é pela ausência.** `stock_movements` ganha `receipt_line_id`, e
**não ganha** `purchase_order_line_id` nem `supplier_invoice_line_id`. Uma coluna
que não existe não pode apontar para o sítio errado — a mesma forma que impediu
o saldo de ser escrito à mão no E25.

**E a identidade é a do acontecimento**, outra vez: índice único parcial sobre
`(receipt_line_id)` para `tipo = 'ENTRADA'`. Gravar a mesma recepção duas vezes é
**uma** entrada. Um duplo carregar no botão à porta das traseiras, com o
camionista à espera, é o cenário provável — não o raro.

O defeito que isto impede tem nome: **a cozinha vê farinha que está dentro de um
camião**, faz a mise en place a contar com ela, e descobre à hora do serviço.

## 3. A unidade de compra não é a unidade de uso

Compra-se um **saco de 25 kg**; a ficha gasta **200 g**. Compra-se uma **caixa de
12**; usa-se **uma**.

`supplier_items` guarda a ligação **por fornecedor e por artigo** — o mesmo
insumo comprado a dois fornecedores tem duas embalagens e dois preços:

- `unidade_de_compra` — o nome do que se compra («saco 25 kg», «caixa 12»).
- `factor_mili` — quantos milésimos da **unidade de uso** dá **uma** unidade de
  compra. Um saco de 25 kg é `25_000_000`, na escala do E25 (1 kg = 1 000 000).

**Sem factor, recusa-se.** `factor_mili` é `NOT NULL` com `CHECK > 0`: não é uma
validação que alguém tem de se lembrar de escrever, é uma linha que a base não
deixa existir. É a mesma regra do fuso e da densidade em
`quantidades-e-unidades.md` — **adivinhar é o defeito**.

A conta da entrada é inteira, de ponta a ponta:

```
entrada_mili = recebido_mili × factor_mili ÷ 1 000 000
```

8 sacos (`8_000_000`) × 25 kg (`25_000_000`) ÷ 1e6 = `200_000_000` = **200 kg**.
Nunca `8 × 25 = 200` em vírgula flutuante, e nunca `1` porque alguém leu o saco
como uma unidade — que é o defeito que só aparece no inventário ao fim do mês,
sem causa aparente.

## 4. O custo sabe de que entrada veio

O mesmo artigo custa diferente em duas entregas. Sem saber de que entrada veio
cada grama, **qualquer conta de margem é ficção**.

`receipt_lines.custo_total_menor` — dinheiro **inteiro em unidade menor**, com
`moeda` ao lado, como manda `dinheiro.md`. É o custo da linha inteira e não o
unitário: um unitário por milésimo arredondava para zero em qualquer artigo
barato, e o erro acumulava-se em silêncio a cada entrada.

**O método de custeio, escrito e não implícito: MÉDIA PONDERADA MÓVEL, derivada
das entradas.** Não é uma coluna. Custo médio de um insumo =

```
soma(custo_total_menor das entradas)  ÷  soma(entrada_mili dessas entradas)
```

Escolheu-se média ponderada e não PEPS porque a farinha do saco novo e a do saco
velho estão no mesmo balde: o produto não sabe qual delas saiu, e um método que
finge saber produz um número exacto que está errado. A média assume o que é
verdade — que se misturaram.

**Está escrito aqui porque um custeio implícito é um número que ninguém
consegue reproduzir**, e a prova exercita-o com duas entradas a preços
diferentes.

---

## O que fica de fora, e é dito

- **Não há pagamento ao fornecedor.** A factura é registo, não é dívida a pagar:
  contas a pagar é outro assunto e não está nesta etapa.
- **Não há aprovação nem limites de gasto.** Quem pode encomendar é a autorização
  do E04, e não uma regra nova.
- **Não há devolução ao fornecedor.** Uma entrada a mais corrige-se por ajuste
  com razão escrita, que o E25 já tem.
