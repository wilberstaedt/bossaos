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
