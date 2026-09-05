# Um pedido para as 20h não é trabalho para agora

> Contrato para o E20. Escrito antes da etapa.
> **Já existe regra?** Não. O `kds-e-tempo-real.md` decide ordem, relógio e
> alertas, mas assume que um pedido é para **agora**. Procurei *futuro*,
> *agendado*, *horário de produção* e *programado* nele e no `state-machines.md`:
> nada.

## O problema

O takeaway traz pedidos para mais tarde. O modelo ingénuo — um pedido é um
pedido, entra na fila quando chega — enche o ecrã da cozinha ao almoço com
trabalho para o jantar. E o ecrã do KDS é um sítio onde **tudo o que aparece é
para fazer**: pôr lá o que não é para agora não é um incómodo visual, é ensinar
a cozinha a ignorar o ecrã.

A resposta oposta — «só aparece quando for a hora» — tem o defeito simétrico: um
pedido que aparece às 19h55 para as 20h é um pedido que não se faz a tempo.

## A regra

**A produção vê um pedido a partir do seu MOMENTO DE PRODUÇÃO, não da hora
pedida.** O momento de produção é **derivado** — hora de entrega menos o tempo
de preparação — e nunca escrito pelo cliente, que não sabe quanto demora.

Três invariantes:

1. **O pedido existe desde que é feito.** Está aceite, está pago se for o caso,
   e o cliente vê-o. Não estar na cozinha não é não existir — é a distinção
   entre *aceite* e *em produção*, que o E16 já guarda com o estado a derivar
   das tarefas.
2. **A passagem é por RELÓGIO, não por evento.** *«Chegou a hora»* é uma
   pergunta que o servidor responde comparando `now()` com o momento de
   produção — nunca «alguém abriu o ecrã e nós aproveitámos». É a mesma lição
   que o `capacidade-e-reservas.md` já escreve para a expiração de retenções:
   se depende de alguém olhar, o pedido das 8h da manhã espera pelo primeiro
   cozinheiro que chega às 11h.
3. **O que aparece, aparece uma vez.** Um pedido que atravessa o momento de
   produção não pode entrar duas vezes na fila se o relógio for consultado duas
   vezes — a versão monótona do E16 já dá a forma para isto.

## Indisponibilidade descoberta antes da hora

Um item esgota às 18h, para um pedido das 20h. **Isso é uma oportunidade, não
uma falha**: há duas horas para avisar quem pediu. O defeito é descobri-lo às
19h58, e o defeito pior é descobri-lo às 18h e não dizer nada.

**Não decido o que se faz com o aviso** — se se sugere alternativa, se se
reembolsa, se se telefona, é do restaurante. O sistema deve **saber** e
**mostrar** que sabe.

## O controlo negativo

1. **Um pedido para daqui a três horas não aparece na fila agora.** Se aparecer,
   é o modelo ingénuo.
2. **O PAR, e sem ele o ponto 1 passa com «esconde tudo»:** o mesmo pedido
   **aparece** quando o momento de produção chega, sem ninguém abrir nada.
   Medido com o relógio a avançar, não com alguém a carregar em recarregar.
3. **Atravessar o momento duas vezes não cria duas entradas na fila.**
4. **Um item esgotado antes da hora** deixa o pedido marcado como problemático
   *antes* do momento de produção, e não no instante em que a cozinha ia começar.

---

## O que ficou por fechar, e o que BLOQUEIA abrir isto ao público

Escrito na assinatura do E20 (`332e9f2`). Nenhuma destas reteve a etapa, e a
razão importa: a régua do E20 não as exigia, e reter por uma coisa que não foi
pedida é mudar as balizas a meio.

### BLOQUEANTE para a etapa que abrir o takeaway ao público

**A hora de entrega não tem limite nenhum — nem passado, nem casa fechada.** Uma
hora no passado dá `producao_em` no passado, e o pedido entra **já** na cozinha
enquanto a pessoa julga tê-lo agendado. Combinar uma coisa e fazer outra, outra
vez, agora pelo outro lado.

Hoje não retém porque as sete telas do E20 são todas `/app/` e `/staff/`: quem
escreve a hora é gente da casa, e o staff é o filtro. **No dia em que o cliente
escrever a hora, o filtro desaparece** — e aí isto passa a ser condição de
entrada da etapa, não uma aresta.

### Duas arestas do `preparoDoPedido`

- **A quantidade não entra na conta.** Dez do mesmo prato dão o mesmo preparo que
  um. Pode estar certo (as estações trabalham em paralelo, e é a mesma panela) ou
  pode estar errado (dez são dez), mas neste momento não é uma decisão — é uma
  ausência.
- **Uma linha livre conta zero.** Um item escrito à mão não tem produto, logo não
  tem `preparo_min`, logo não empurra o momento de produção. O pedido com uma
  linha livre pesada entra em produção como se não a tivesse.
