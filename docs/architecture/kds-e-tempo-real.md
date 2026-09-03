# KDS e tempo real

> E00. Traduz o CT-08 (produção) e a parte de tempo real do CT-09 em decisões testáveis.

## O modo de falha desta área não dá erro

Numa cozinha, quando isto parte, não aparece uma mensagem vermelha. Aparece **um prato que
nunca é feito**, e ninguém descobre até o cliente perguntar. Não há registo de erro para
consultar, porque do ponto de vista do software nada correu mal: o pedido simplesmente
nunca chegou ao ecrã.

É por isso que as regras abaixo são quase todas sobre **não perder**, e quase nenhuma sobre
velocidade.

## Nunca descartar um pedido por falta de espaço

O ecrã mostra um conjunto principal; o backlog continua **inteiro e alcançável**. Quantidade
máxima visível, prioridade e ordem de pratos são **regras de visualização**, não regras de
fila.

O erro concreto que isto previne: o KDS mostra doze bilhetes, chegam vinte, e os oito de
baixo desaparecem em vez de ficarem numa segunda página. Parece limpo. É comida que nunca é
feita.

**Teste**: enfileirar mais do que o limite visível e confirmar que o total contado bate com
o enviado, e que os que não cabem continuam alcançáveis.

## O tempo é do servidor

Os temporizadores contam a partir do **carimbo do servidor**, nunca do relógio do tablet.
Um dispositivo com a hora errada não pode fazer um bilhete parecer novo — e o tablet da
cozinha é exactamente o aparelho que ninguém acerta.

O tempo decorrido **sobrevive a recarregar a página**. Um cronómetro que reinicia ao
actualizar mente sobre o que está mais atrasado, que é a única coisa que o ecrã existe para
dizer.

## Som é auxiliar; estado é indispensável

Uma cozinha é barulhenta, e há turnos com o som desligado de propósito. Nenhuma informação
pode existir **só** como um apito: o estado persistente no ecrã e os alertas de estação são
o canal a sério, e o som é um extra por cima.

O mesmo para a notificação: se a única forma de saber que um bilhete chegou foi um aviso
que já passou, o bilhete perde-se sem deixar rasto.

## Retoma, e a ordem das versões

SSE com **cursor** e eventos duráveis; ao detectar um intervalo desconhecido, vai ao estado
autoritativo em vez de adivinhar; e há **fallback de snapshot** quando a retoma não é
possível.

**Uma versão antiga nunca se aplica sobre uma mais recente.** Eventos chegam repetidos e
fora de ordem — isso é normal, não é avaria. O que não pode acontecer é um evento atrasado
reabrir um bilhete que já saiu.

**Teste**: entregar os eventos por ordem inversa e exigir o mesmo estado final.

## Pronto parcial não é pronto

No expo, o estado só passa a completo quando **todas** as tarefas necessárias estiverem
resolvidas. Uma mesa com três pratos em que dois estão prontos é uma mesa que ainda não sai
— e mostrar "pronto" ali faz sair comida fria.

## Alterações depois de enviar

- **Acrescentar depois do envio cria uma rodada nova**, não altera a anterior. A cozinha já
  começou; reescrever o bilhete que ela tem à frente é como mudar as instruções a meio.
- **Cancelar uma linha já em preparação exige motivo** e, conforme política, gerente. O
  produto já foi consumido em tempo e em ingredientes, e isso tem de ficar registado.
- **Recall reabre uma tarefa permitida** sem criar venda nova nem consumo novo. Um recall
  que gera uma segunda venda transforma um engano da cozinha numa cobrança ao cliente.

## Dispositivos e impressão

**Heartbeat não comprova recebimento.** Um dispositivo "activo" que não imprimiu o bilhete
continua activo, e a cozinha não sabe. O estado mostrado é o do **último resultado real**.

Estação offline gera alerta — não um ícone discreto que ninguém olha. E o fallback de
impressão tem adaptador e **estado honesto**: uma impressora que não imprimiu não pode
aparecer como tendo imprimido.

## Os casos

| Caso | Esperado |
| --- | --- |
| 20 bilhetes com limite visível de 12 | os 20 contados e alcançáveis |
| Tablet com o relógio adiantado | o tempo do bilhete não muda |
| Recarregar a página | o cronómetro continua de onde estava |
| Som desligado | nada se perde |
| Eventos por ordem inversa | mesmo estado final |
| Evento atrasado sobre bilhete já saído | não reabre |
| Dois de três pratos prontos | a mesa **não** está pronta |
| Acréscimo após envio | rodada nova |
| Cancelar em preparação sem motivo | recusado |
| Recall | tarefa reaberta, sem venda nova |
| Impressora em baixo com heartbeat vivo | aparece degradada |

**Controlo negativo**: desligar a paginação do backlog e ver o teste dos 20 bilhetes ficar
vermelho. Se ele passa com e sem paginação, o que está a contar é o que o ecrã mostra — que
é exactamente o número que não interessa.
