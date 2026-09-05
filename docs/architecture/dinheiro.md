# Dinheiro

> E00, escrito antes do E22/E23. Fecha CT-11. É a área onde um erro não é um defeito: é
> uma cobrança a mais no cartão de alguém, ou uma noite de caixa que não fecha.

## Representação, e a regra que não tem excepção

**Unidades mínimas inteiras, com código de moeda.** 10,00 € é `1000` + `EUR`. Nunca
`float`. Nunca `numeric` implícito na aplicação. Quantidades e custos fraccionários
(gramas, percentagens, custo por unidade) usam decimal exacto — e não se misturam com o
tipo do dinheiro.

A escala vem da moeda, não é assumida: nem toda a moeda tem duas casas.

## A divisão, que é o aceite de CT-11

10,00 € por três dá **3,34 + 3,33 + 3,33**. Não 3,33 × 3 com um cêntimo a evaporar-se, e
não 3,34 × 3 com um cêntimo inventado.

A ordem de distribuição do resíduo escreve-se **antes** de implementar checkout, não
depois de aparecer a diferença. E a asserção que cobre isto não é "cada parte é 3,33":
é **a soma das partes ser exactamente o total**, com a distribuição verificada.

Descontos, cortesias e impostos entram no mesmo cálculo, com o mesmo teste: as partes
somam, ao cêntimo.

### A ordem do resíduo, escrita — 05/09

Este documento e o `overview.md` dizem, os dois, que **a ordem de distribuição do
resíduo se escreve antes do checkout**. Nenhum a escrevia. Escrevo-a agora, com o
E22 em construção, porque uma instrução repetida duas vezes e nunca cumprida é
pior do que não existir: dá a impressão de que a decisão está tomada.

**O cêntimo a mais vai para as primeiras partes, por ordem posicional.**
`1000 ÷ 3` dá `[334, 333, 333]`. `1000 ÷ 6` dá `[167, 167, 167, 167, 166, 166]`
— quatro partes absorvem o resíduo de 4, e as duas últimas não.

**Porquê a posição, e não outra coisa:**

- **É determinista.** A mesma conta dividida duas vezes dá exactamente o mesmo
  resultado. Uma regra aleatória, ou baseada em quem paga primeiro, muda os
  valores entre dois ecrãs abertos ao mesmo tempo na mesma mesa — e aí a conta
  passa a depender de quem carregou primeiro.
- **Não se manipula.** Não depende da ordem de pagamento, que ninguém conhece no
  momento da divisão, nem de nada que o cliente escolha.
- **É explicável em voz alta.** «Uma das partes leva um cêntimo a mais» é uma
  frase que um empregado diz a uma mesa sem se sentir mal.

**O que o ecrã tem de fazer, e é metade da regra:** mostrar os valores **como
são**. Nunca «3,33 cada» quando uma das partes é 3,34. O cêntimo aparece, ou a
regra é boa e a interface mente por cima dela.

**A asserção que prova isto** não é «cada parte é 333». É **a soma das partes ser
exactamente o total**, mais a **distribuição verificada** — e o par: uma divisão
exacta (`900 ÷ 3`) continua exacta, `[300, 300, 300]`, senão «soma sempre ao
primeiro» passa o caso do resto e falha o outro.

## Quatro entidades, e cada uma existe porque as outras não servem

| Entidade | O que é | O que **não** é |
| --- | --- | --- |
| `Bill` | A obrigação: o que se deve | Não é o que se recebeu |
| `PaymentAttempt` | A tentativa: saiu daqui | Não prova que chegou |
| `Payment` | O confirmado | Não é reversível por edição |
| `Refund` | A devolução | Não é um `Payment` negativo |

Colapsar duas destas num campo é o erro estrutural desta área. Um `Bill.status = pago`
sem `Payment` é uma afirmação sem prova; um `Payment` editável é histórico que se reescreve.

## O estado que mais dói: indeterminado

Uma tentativa que teve *timeout* **não falhou**. Não se sabe. E o que se faz a seguir
decide se o cliente é cobrado uma ou duas vezes:

> **Reconciliar antes de criar outra cobrança.** Sempre. Sem excepção por pressa de sala.

O retorno do navegador **não é confirmação**. O webhook é que confirma — com assinatura
verificada, tolerância a repetição e a chegar fora de ordem. Um webhook atrasado que chega
depois do seguinte não pode reverter o estado mais recente.

## Captura, anulação e devolução são três coisas

- **Void** (não capturado): desfaz sem movimento de dinheiro.
- **Refund** (capturado): movimento real, limitado ao capturado ainda não devolvido.
- **Cancelar comida**: não devolve dinheiro nenhum por si só.

Refund parcial é **saldo derivado**, não um campo. Repetir o mesmo refund não devolve duas
vezes — é idempotente pela chave. E um refund **não reabre automaticamente saldo a cobrar**:
liga-se o ajuste correspondente e preserva-se a liquidação histórica.

Troco é recebido menos devido. Não é receita.

## Caixa

`esperado = fundo + entradas em dinheiro − saídas em dinheiro`, e só conta o que é
**dinheiro físico**. Cartão e liquidação do adquirente não entram no caixa como notas —
esse é o erro que faz a contagem nunca bater e a equipa desistir de contar.

Movimentos imutáveis. Contagem gera diferença; diferença exige autorização. Reabrir é acto
auditado, com actor e motivo.

## Duas contabilidades que não se tocam

A **assinatura BossaOS** e a **venda do restaurante** têm merchant diferente, cliente
diferente, factura diferente, webhook diferente e titularidade diferente. Misturá-las na
mesma tabela ou no mesmo relatório é o erro que só aparece quando alguém tenta conciliar.

## Fiscal

Emissão é integração separada, com idempotência, estados, rejeição e correção conforme o
fornecedor e o país. **Um PDF bonito não é um documento fiscal**, e chamar-lhe isso é um
problema legal, não um atalho de produto.

Os requisitos verificam-se na etapa (E24), na fonte oficial e na data — não se congelam
aqui.

## O que se testa, e o que não conta

Conta: soma das partes ao cêntimo; dois pagamentos concorrentes na última parcela;
webhook repetido e fora de ordem; refund parcial repetido; caixa com divergência; troco.

Não conta: um teste que soma três valores que o próprio teste escolheu para somarem certo.
O caso que interessa é o que **não** divide bem.
