# Régua do E16 — KDS de cozinha, barra e expo

> Escrita a 04/09, **antes de existir uma linha de E16**. 20 telas.
> Contratos que mandam: `kds-e-tempo-real.md` (E00) e
> `tarefas-de-producao-e-estacoes.md` (escrito para esta etapa).

## O que torna esta etapa perigosa

O E15 mentia dizendo «enviado». Este mente **regredindo**: um ecrã que volta
atrás mostra ao cozinheiro um estado que já não é verdade, e ele age sobre ele.
A diferença é que ninguém vai procurar o erro — a comida sai errada e alguém
culpa a pessoa.

## Aceite: eventos repetidos e fora de ordem não fazem a tela regredir

**Recuso a demonstração feliz:** entregar eventos por ordem e ver o ecrã
actualizar. Isso mede o caminho que nunca dá problemas.

Exijo os três casos, que falham por motivos diferentes:

1. **Evento repetido** — o mesmo, duas vezes. O ecrã fica igual.
2. **Evento atrasado** — uma versão antiga a chegar **depois** de uma recente.
   O contrato di-lo pelo nome: *«uma versão antiga nunca se aplica sobre uma
   mais recente»*. Aplicar o último que chega é o defeito, e é o que sai de
   graça de qualquer implementação.
3. **Intervalo desconhecido** — falta um evento no meio. Vai ao estado
   autoritativo em vez de adivinhar, com o *fallback* de snapshot.

**E o par que impede isto de ser «ignora tudo»:** um evento **novo e legítimo**
tem de se aplicar. Uma implementação que rejeitasse tudo o que não é sequencial
passava os três casos acima e não mostrava nada a ninguém.

## Roteamento: a unidade é a TAREFA, não a linha

De `tarefas-de-producao-e-estacoes.md`. O modelo ingénuo — uma linha, uma
estação — passa quase todos os testes porque quase todos os pratos são de uma
estação só, e parte no primeiro prato que precisa de duas.

1. **Uma linha com tarefas em duas estações**, e as duas a verem-na.
2. **Uma estação não vê o que não é dela** — verificado no que a **consulta**
   devolve, não no que o ecrã pinta. Se chega ao cliente e é escondido por CSS,
   chegou.
3. **Pronto só quando a última estação acaba** — com a penúltima já pronta, o
   pedido ainda não está.
4. **Item sem regra de roteamento** aparece como **não encaminhado**. Ausência
   de regra não é «cozinha por omissão».

## O relógio é do servidor

*«Os temporizadores contam a partir do carimbo do servidor, nunca do relógio do
tablet»*, e o contrato até lista o caso: **tablet com o relógio adiantado, o
tempo do bilhete não muda.** Exijo esse teste, com o relógio do cliente mexido
de propósito. Sem ele, um `Date.now()` no navegador passa despercebido para
sempre — e o sintoma aparece num restaurante, não aqui.

## O limite de cinco é visual, e isso tem de doer se for falso

*«Todos os pedidos permanecem visíveis no backlog e persistidos.»* Um limite
visual que **descarta** é a diferença entre um ecrã arrumado e comida por fazer.

Exijo a contagem: com mais de cinco bilhetes, **quantos** existem na base e
**quantos** o backlog mostra. Os dois números ditos em voz alta — não «o backlog
tem itens».

## O que reprovo à cabeça

- **Verde sobre fila vazia.** Zero bilhetes passa quase tudo. Cada prova declara
  a população antes de afirmar.
- **Som ou piscar como único estado.** Já está no contrato: um alerta que só
  existe como apito não é estado. O ecrã tem de o dizer depois de uma recarga.
- **As 20 telas sem navegador**, nas cinco larguras, ES/PT/EN.
- **A população tirada do código do produto.** No E15 pedi isto e tu foste
  além: leste a matriz e comparaste conjunto a conjunto, com guarda contra ler
  vazio. **Faz o mesmo aqui** — é a régua nova, e é tua.
- **Uma suite que não consegue ficar vermelha.** Defeito plantado no artefacto
  real, detector a acender na asserção certa, e reposto.
