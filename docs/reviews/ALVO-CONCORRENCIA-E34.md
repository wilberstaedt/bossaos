# Régua dos três cenários concorrentes que faltam — reembolso, stock, acesso

> Escrita a 06/09/2026, **antes** de existir uma linha de prova. Das seis
> famílias que o aceite 3 nomeia, três estão provadas — saldo, reservas e
> deduplicação, em catorze casos. Estas três não estão, e não são as inofensivas.

## A regra que vale para os três

A `validar-concorrencia.sh` já a diz e é o ponto de partida: **concorrência
provada em sequência não prova nada.** Um teste que dispara, **espera pela
resposta**, e dispara outra vez está a testar que o segundo pedido viu o primeiro
já gravado — e isso passa numa implementação que só faz `SELECT` antes do
`INSERT`, que é a pior de todas, porque falha uma vez em cinquenta.

E a segunda, que é onde estes três se decidem: **a unicidade tem de vir da base.**
Se o que separa os dois for uma consulta prévia, não há prova nenhuma.

### E uma terceira, que é a mais fácil de errar

**A asserção tem de valer para as duas ordens.** Um teste concorrente cujo
resultado esperado depende de qual dos dois ganhou não é um teste — é uma moeda ao
ar com uma asserção em cima, e passa ou falha conforme o dia. O que se afirma é um
**invariante**: uma coisa que é verdade *independentemente* de quem chegou
primeiro.

---

## Reembolso — dois reembolsos concorrentes do mesmo pagamento

**Porque importa:** é dinheiro a sair. Um reembolso duplicado devolve duas vezes.

**O caminho real:** os reembolsos chegam por **webhook do adquirente** e passam
pelo `reconciliarComProvedor`, que faz `db.refund.findFirst(...)` antes de criar —
**ler-depois-escrever**, que é a forma exacta da corrida. A J14 já prova
«reprocessar sem duplicar», **em sequência**.

**A base já tem o mecanismo**, e isso muda o que a prova tem de demonstrar:

```
@@unique([organizationId, chaveIdempotente], name: "uma_devolucao_por_chave")
provedorRef String? @unique
```

Portanto a prova **não** existe para descobrir se há protecção. Existe para
demonstrar que **é a restrição que trava o segundo, e não o `findFirst`** — que é
o que ficaria a proteger sozinho no dia em que alguém mudar a ordem das linhas.

| | |
| --- | --- |
| **invariante** | uma linha em `refunds` por chave, e `sum(devolvido) <= capturado` |
| **disparo** | as duas entregas do mesmo evento **em paralelo**, sem uma esperar pela outra |
| **controlo positivo** | o pagamento tem capturado > 0 **e a primeira entrega cria mesmo a linha** — senão zero linhas e soma zero passam à mesma |
| **não conta como prova** | «uma delas devolveu erro». A asserção é a **contagem de linhas na base** e a **soma** |

---

## Stock — dois decrementos concorrentes da última unidade

**Porque importa:** é venda a descoberto. Vende-se o que não há e alguém fica sem
jantar.

**O produto promete isto:** o `pedidos.ts:136` diz que *«o esgotado é rejeitado
com o carrinho preservado»*. Logo existe invariante para medir — não estou a
inventar uma promessa que o produto nunca fez.

| | |
| --- | --- |
| **invariante** | nunca se aceita mais do que existe; o nível na base **não fica negativo** |
| **disparo** | dois pedidos da **última** unidade, em paralelo |
| **controlo positivo** | o nível é **1 antes de disparar**, verificado na base. Com stock ilimitado o caso mede zero contra zero |
| **negativo** | exactamente um aceite e um rejeitado |
| **não conta como prova** | ler o nível da **resposta**. Lê-se da base, depois de os dois acabarem |

---

## Acesso — uma leitura de suporte contra a revogação da concessão

**Porque importa:** é o caminho que acabou de ser construído, e o único dos três
onde a resposta certa **não é determinista** — e é isso que o torna o mais fácil
de errar.

**A subtileza, dita antes de alguém tropeçar nela:** o
`suporte_com_concessao_viva` é `STABLE`. Dentro do instantâneo de uma instrução,
uma leitura que começou antes de a revogação **confirmar** continua a ver a
concessão viva. **Isso é o isolamento do PostgreSQL a funcionar, não um defeito.**
Uma régua que exija «a leitura tem de falhar» está a exigir o impossível, e a
prova que a servir vai ser intermitente.

Por isso o invariante é outro, e vale para as duas ordens:

| | |
| --- | --- |
| **invariante 1** | **rastos = leituras bem sucedidas.** Aconteça o que acontecer, nenhuma leitura passa sem deixar registo |
| **invariante 2** | depois de a revogação estar confirmada, **toda** a leitura seguinte é recusada |
| **disparo** | a revogação e a leitura em paralelo |
| **controlo positivo** | antes de disparar, uma leitura tem de **passar e deixar rasto** — senão o caso mede um caminho já fechado |
| **não conta como prova** | afirmar qual dos dois ganhou |

E há um detalhe de medição que já me apanhou hoje e que fica escrito aqui:
**não se conta o rasto na mesma instrução que o provoca.** Uma CTE que escreve não
é visível ao resto da instrução que a desencadeou — a contagem faz-se **depois**,
noutra instrução, ou lê-se zero e conclui-se um defeito que não existe.

## O que me faz reprovar sem discussão

- Um disparo em que o segundo espera pela resposta do primeiro.
- Uma asserção que depende de qual dos dois ganhou.
- Um controlo positivo ausente — sem ele, todos estes três passam sobre população
  zero.
- O nível, a soma ou a contagem lidos da resposta em vez da base.
