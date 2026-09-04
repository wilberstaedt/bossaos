# Régua do E19 — Reserva pública, host e lista de espera

> Escrita antes de existir código. **28 telas** — a maior etapa do projecto.
> O E18 já entrega o motor: capacidade, alocação, retenção por relógio, e a
> mensagem como resultado separado. **O E19 é a superfície.** Não repito o que
> ele já prova; exijo o que só aparece quando há gente a usar isto.

## 1. Uma estimativa apresentada como promessa é um defeito

*«Estimativas são informadas como estimativas.»* É a frase mais fácil de cumprir
com uma palavra e falhar na prática.

Quem espera à porta com «20 minutos» no ecrã volta aos 21 a reclamar. **Exijo que
a incerteza esteja no que se vê**, não só no código: o ecrã diz que é estimativa,
e a prova afirma o **texto**, não um atributo escondido. Um `data-estimativa=true`
por cima de uma frase que promete não informa ninguém.

**O par:** quando a mesa está pronta, a mensagem deixa de ser estimativa e passa
a ser um facto. Se as duas se disserem igual, a distinção não existe.

## 2. A fila de mensagens: reenviar sem duplicar

*«Templates transacionais, fila, resultado por provedor, histórico e reenvio
deduplicado.»* É a família que já nos apareceu duas vezes — entrega repetível com
efeitos deduplicados.

Exijo os três, e o terceiro é o que se esquece:
- **reenviar a mesma mensagem não a entrega duas vezes** ao cliente;
- **o resultado do provedor é guardado**, e uma falha dele não apaga o facto de a
  reserva existir — o E18 já prova isso do lado da reserva; aqui prova-se do lado
  da mensagem;
- **o par:** uma mensagem **diferente** para a mesma reserva **é enviada**. Sem
  isto, «engole tudo o que se parece» passa os dois primeiros.

## 3. O relatório: um número sem definição não é comparável

*«Definições de covers, ocupação, cancelamento, origem e no-show.»* Cinco números
que toda a gente acha que sabe o que são e ninguém define igual.

**Exijo a definição escrita ao lado do número, no ecrã.** Um «no-show: 12» sem
dizer se conta a reserva ou as pessoas, e a partir de que minuto, é um número que
o dono vai usar para decidir e que ninguém consegue reproduzir. Não peço a
definição *certa* — essa é do negócio; peço que **esteja lá**.

## 4. O que o servidor decide, e o ecrã não

*«Disponibilidade da tela nunca substitui verificação de servidor. Preferência de
zona não vira garantia sem alocação confirmada.»*

Exijo o caso feio: **o ecrã oferece um horário que entretanto ficou ocupado**, e
o servidor recusa com uma mensagem que serve à pessoa. Uma prova que só teste o
caminho onde o ecrã está actualizado não mede isto — e é este o caso que acontece
num sábado às 21h.

## O que reprovo à cabeça

- **Verde sobre agenda vazia**, e com 28 telas isso é fácil de esconder.
- **As 28 telas sem navegador**, cinco larguras, ES/PT/EN, população da **matriz**.
- **Uma suite que não consegue ficar vermelha.**
- **Mensageria externa activa sem contrato.** O enunciado di-lo: sem provedor
  configurado, o conector fica **desligado e visível como desligado** — não a
  fingir que enviou.

## A população que vou contar — fixada antes da entrega

Da matriz, `etapa_principal = E19`, **28 telas**:

```
PUB-003 RES-C-001 RES-C-002 RES-C-003 RES-C-004 RES-C-005 RES-C-006 RES-C-007 RES-C-008 RES-C-009 RES-C-010 RES-B-001 RES-B-002 RES-B-003
RES-B-004 RES-B-005 RES-B-006 RES-B-007 RES-B-008 RES-B-009 RES-B-010 RES-B-011 RES-B-017 RES-B-018 RES-B-019 REP-008 INT-004 SET-009
```

**E uma tela que não está nesta lista, e tem de mudar à mesma: `FLOOR-006`.**
O mapa de sala ao vivo tem `etapa_principal = E13`, mas a matriz marca-o como
revisitado pelo E15 e pelo **E19** — porque uma reserva confirmada para as 20h
tem de **aparecer na sala** antes das 20h, senão o host vê a mesa livre e senta
lá um walk-in. As 28 são as telas novas; o `FLOOR-006` é a que já existe e passa
a receber dados novos. Contá-la como nova seria errado; deixá-la fora do alvo
seria pior — é exactamente por onde a reserva se perde entre o motor e a sala.

Escrevi «28 telas» três vezes nesta régua e nunca disse **quais** — e isso é
precisamente o buraco que tu me apontaste no E15: **um número sem o conjunto
deixa passar uma tela trocada por outra.** A prova lê a matriz e compara conjunto
a conjunto, como já fazes desde então.
