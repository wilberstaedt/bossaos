# Uma linha de pedido não é uma tarefa de estação

> Contrato. Escrito a 04/09, antes do E16, porque o modelo ingénuo aqui é uma
> decisão de schema — e um schema errado descobre-se tarde e custa migração.
>
> **Antes de escrever isto perguntei o que falhei em perguntar no E14:** já
> existe regra sobre isto? Não existe. O `kds-e-tempo-real.md` decide a ordem
> dos eventos, os temporizadores e os alertas; sobre **roteamento** não diz nada,
> e o `CONTRATO_TECNICO.md` também não.

## O modelo ingénuo, e porque parte

«Cada linha de pedido pertence a uma estação.» É a primeira coisa que se escreve
e passa em quase todos os testes, porque quase todos os pratos são de uma
estação só.

Parte no enunciado do próprio E16: *«um prato pode ter tarefas em mais de uma
estação quando a regra definir.»* Um hambúrguer com batata é grelha **e**
fritadeira. Um menu com bebida é cozinha **e** bar. Com uma estação por linha,
a segunda estação nunca vê o trabalho — e o defeito não dá erro: dá comida em
falta, descoberta pelo cliente.

## A regra

**A unidade da estação é a TAREFA, não a linha.** Uma linha aceite gera **uma ou
mais** tarefas de produção. A relação é um-para-muitos desde o primeiro dia,
mesmo que hoje a maioria tenha uma só — porque o dia em que tiver duas é uma
migração, e não uma configuração.

Daí saem três invariantes:

1. **Uma estação só vê as suas tarefas.** Não é filtragem no ecrã: é o que a
   consulta devolve. A cozinha nunca recebe uma bebida encaminhada só para o
   bar — se a linha chega ao ecrã e é escondida por CSS, chegou.
2. **O estado do pedido DERIVA das tarefas; nunca se escreve directamente.**
   «Pronto» é *todas as tarefas prontas*. Guardar o estado do pedido em paralelo
   cria duas verdades, e a que o expo mostra passa a depender de quem escreveu
   por último. O pronto parcial é uma contagem, não um estado novo.
3. **Cancelar uma linha cancela as tarefas dela** — em todas as estações. Uma
   tarefa órfã numa estação é comida a ser feita para um pedido que já não existe.

## O que NÃO decido aqui, porque não é meu

**Qual estação faz o quê é do restaurante.** É configuração, não código: regras
guardadas, editáveis, por unidade. Não escrevo uma tabela de roteamento neste
documento nem o sistema traz uma por omissão.

E a consequência que interessa, que é a mesma regra que o JR aplicou bem no E14:
**ausência de regra não é «cozinha por omissão».** Um item sem roteamento
definido aparece como **não encaminhado**, visível a quem configura. Mandá-lo em
silêncio para a estação mais provável é inventar uma decisão do dono e esconder
que ela foi inventada.

## O controlo negativo

Uma prova em que **todas** as linhas têm exactamente uma tarefa não distingue
este modelo do ingénuo. Exige-se:

1. **Uma linha com tarefas em duas estações**, e as duas a verem-na.
2. **Uma estação a não ver o que não é dela** — verificado no que a consulta
   devolve, não no que o ecrã pinta.
3. **Um pedido «pronto» só quando a última estação acaba** — com a penúltima já
   pronta, o pedido ainda não está.
4. **Um item sem regra de roteamento** a aparecer como não encaminhado, e não
   numa estação qualquer.

## Ligações

- `kds-e-tempo-real.md` — ordem dos eventos, cursor, temporizadores do servidor
- `state-machines.md` — estados de linha e de pedido
- `preco-de-um-pedido-escrito-offline.md` — onde está escrito o erro que me
  ensinou a perguntar primeiro se a regra já existe
