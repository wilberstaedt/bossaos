# Plano do E21 — revisão operacional do Restaurant

> Escrito a 04/09, com o E17 ainda a decorrer. **Esta etapa é minha**, e o plano
> é escrito antes de ver o estado pela mesma razão que as réguas do JR o são:
> um critério inventado depois de olhar mede o que se encontrou.

## O que ninguém provou até aqui, e é o coração desta etapa

Cada etapa provou **a sua fatia**. O E14 provou o motor de pedidos, o E15 a fila
offline, o E16 a produção, o E17 o QR. **Ninguém provou um pedido inteiro a
atravessar tudo.**

O ponto 2 do enunciado pede exactamente isso: *o mesmo pedido* por Staff/QR,
servidor, cozinha/bar, expo e mesa, com acréscimo, cancelamento e perda de
ligação pelo caminho.

**É aqui que os defeitos de integração vivem**, e são de uma família que nenhuma
prova de etapa apanha: cada lado cumpre o seu contrato e o pedido parte na
fronteira. O E16 já deu um aviso disto — o gatilho da produção destapou que o
ecrã de edição do E14, **etapa que eu tinha validado**, deixava escolher à mão
estados que agora derivam das tarefas.

## O que vou exigir de mim próprio

1. **Um só `Order`, seguido pelo id, ponta a ponta.** Não «um pedido criado no
   QR e um pedido visto na cozinha» — o mesmo id, afirmado em cada superfície.
2. **Acréscimo a meio**, com a cozinha já a preparar. O item novo aparece sem
   reabrir o que saiu.
3. **Cancelamento a meio**, e as tarefas nas estações caem com ele — o controlo
   negativo do E16 já guarda isto na base; aqui verifica-se no ecrã.
4. **Perda de ligação em cada superfície**, não numa. O E15 provou-a no
   telemóvel do empregado; falta o cliente do QR e o ecrã da cozinha.
5. **Revogar o dispositivo do empregado com trabalho a meio** e ver as três
   regras cruzarem-se sem se contradizerem: a sessão cai, o rascunho conta-se, e
   o pedido já aceite não desaparece.

## O que reprovo à cabeça, incluindo em mim

- **Provar por superfície e chamar-lhe integração.** Cinco provas verdes, uma por
  ecrã, não provam que o pedido atravessa. Se eu fizer isso, estou a repetir o
  erro que persegui o dia inteiro noutra escala.
- **Verde sobre um pedido que não existe.** Declarar o id e o estado antes de
  afirmar seja o que for.
- **Um ensaio de contingência que só testa o caminho feliz da recuperação.**
  Ponto 5 do enunciado pede ensaio; um ensaio que nunca falha não é ensaio.

## Dívidas que entram nesta revisão

- **A identidade de dispositivo é uma etiqueta escolhida por quem tem sessão.**
  Declarada no E15. O E21 revê *revogação de dispositivo* e *limites por papel* —
  é aqui que essa dívida deixa de ser teórica, porque uma decisão que dependa do
  dispositivo confia num nome que o cliente escolhe.
- **Metade das provas não corre na CI.** Se a facturação continuar trancada, o
  parecer do E21 tem de o dizer: um marco operacional validado só em máquina
  local é um marco com uma nota de rodapé, e a nota tem de estar lá.
