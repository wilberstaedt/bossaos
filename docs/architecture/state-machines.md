# Máquinas de estado

> E00. Fecha CT-08 em contratos. A regra que atravessa tudo: **um restaurante não cabe
> num campo `status`.** Uma mesa pode ter comida em preparo e saldo pendente ao mesmo
> tempo, e essas duas coisas evoluem em ritmos diferentes.

## O erro que este documento existe para impedir

A tentação é um enum por entidade e um campo. Depois aparece a mesa que já pagou metade,
tem um prato cancelado, outro pronto no expo e o cliente a pedir mais uma rodada — e o
campo tem de mentir sobre alguma dessas coisas.

Por isso: **a preparação é agregada a partir das linhas, não guardada no pedido.** O saldo
é derivado dos pagamentos, não escrito na conta. O que se guarda é o facto; o que se mostra
é a leitura.

## Sessão de mesa

```
aberta ──> conta solicitada ──> encerramento pendente ──> encerrada
```

A limpeza e o bloqueio pertencem ao **recurso mesa**, não à sessão — uma mesa a ser limpa
não tem sessão nenhuma. Transferir de mesa **preserva a sessão**: muda o recurso, não a
identidade do serviço. Quem modelar transferência como fechar-e-abrir perde a conta, os
pedidos e a hora de chegada.

## Pedido e linha

| Agregado | Estados |
| --- | --- |
| Pedido | rascunho, aceite, cancelado, encerrado |
| Linha | nova, enviada, hold, preparando, pronta, retirada/servida, cancelada |

**Envio local pendente é estado de sincronização, não de negócio.** Um rascunho que não
saiu do telemóvel do garçom não é um pedido — e a UI diz "No enviado", não "Enviado".

Acréscimo depois do envio cria **nova rodada**, não edita a anterior. Cancelar linha já em
preparo exige motivo e, conforme política, gerente. `recall` reabre uma tarefa permitida
**sem criar venda nova nem consumo novo** — é a diferença entre corrigir e cobrar duas vezes.

## Conta e pagamento, que não são a mesma linha do tempo

```
Bill:    aberta ──> parcialmente liquidada ──> liquidada
                └──> ajustada/anulada (com histórico)

Payment: criado ──> processando/indeterminado ──> confirmado
                                              └──> falhou/cancelado
```

**Indeterminado é um estado, não um erro.** É o pagamento que saiu e não se sabe se
chegou, e é o mais perigoso: criar outra cobrança antes de o reconciliar é cobrar duas
vezes ao cliente. Reconciliar primeiro, sempre.

`Refund` é entidade própria, não uma transição do pagamento. Parcial é saldo derivado do
capturado ainda não devolvido. E **cancelar comida não devolve dinheiro**: são dois actos,
com autorizações diferentes.

## Reserva e espera

```
Reserva: solicitada ──> confirmada ──> chegou ──> sentada ──> finalizada
                    └──> cancelada / no-show (saídas registadas, não apagadas)

Espera:  aguardando ──> chamado ──> aceite pendente ──> sentado
                                └──> expirado / cancelado
```

**Chamar um cliente não cria capacidade.** A oferta de vaga, se segurar recursos, tem
expiração explícita e consome capacidade enquanto durar — senão duas famílias chamadas
para a mesma mesa aparecem as duas.

Chegada ≠ sentada. Libertar uma reserva atrasada é acção do host com política, não um
temporizador que decide sozinho.

## Caixa

```
aberto ──> em contagem ──> encerrado
                       └──> divergente ──> (autorização) ──> encerrado
```

Movimentos **imutáveis**. Correcção gera registo novo. Reabertura é acção auditada, com
actor e motivo. `esperado = fundo + entradas em dinheiro − saídas em dinheiro` — e cartão
não entra no caixa físico como notas.

## Dispositivo e integração

```
não pareado ──> activo ──> degradado/offline ──> revogado
```

**Heartbeat não comprova recebimento de pedido.** Um KDS que responde ao ping e não recebeu
o ticket está "activo" e a cozinha está parada. O estado do dispositivo e a entrega da
comanda são duas medições diferentes, e a segunda é a que importa.

## O que faz uma transição ser legítima

Toda a transição é um **comando** com: pré-condição verificada no servidor, permissão
resolvida, `command_id` idempotente, `expected_version`, e evento na outbox dentro da mesma
transação. Nenhuma delas se ganha por o botão estar visível no ecrã.

## Fechar serviço no Restaurant sem inventar receita

D08 e CT-08. Um restaurante no plano Restaurant não tem TPV. Encerrar a mesa pode significar
"pago fora da BossaOS", com responsável e motivo — e isso **não cria `Payment`, não cria
documento fiscal e não entra em receita processada**. Chamar a soma das comandas abertas de
facturação recebida é o erro que transforma um relatório num problema de contabilidade.
