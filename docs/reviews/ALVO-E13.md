# Régua do E13 — sala, sessões, dispositivos e PIN

> Escrita a 04/09, com o E12 a arrancar e **sem uma linha de E13**. É o padrão com
> melhor histórico do projecto.

Dezasseis IDs — `AUTH 002`, `DEV 001-004`, `FLOOR 001-009 e 011`, `ONB 007`,
`SET 003` — e a primeira etapa em que **duas pessoas mexem na mesma coisa ao mesmo
tempo**. Tudo o que veio antes tinha um dono de cada vez.

## Aceite 1 — «duas aberturas concorrentes produzem UMA sessão»

A palavra é **concorrentes**. Um teste que abre a mesa, espera pela resposta e
abre outra vez **não testa nada** — testa que o segundo pedido viu o primeiro já
gravado. Isso é sequência, não concorrência.

**O meu ataque:** disparar as duas aberturas **sem esperar pela primeira**, e
exigir uma sessão. E depois a pergunta que separa a sorte da regra: **o que
garante a unicidade?** Se for um `SELECT` antes do `INSERT`, é uma corrida com
uma janela mais estreita e o teste passa a maior parte das vezes — que é pior do
que falhar sempre. Quero a restrição na **base**: um índice único que torne a
segunda linha impossível.

Foi isto que o endereço público do E09 acertou e vale repetir: *«não se consulta
antes; duas pessoas a escolher no mesmo segundo leem ambas que está livre»*.

**E o par:** depois de a sessão fechar, a mesa **volta a poder abrir**. Sem isso,
um índice único sobre `(mesa)` sem estado passa o aceite e deixa a mesa
inutilizável para sempre.

## Aceite 2 — «revogar encerra o acesso, INCLUSIVE com PIN correto»

O «inclusive» carrega o aceite todo, e nomeia o defeito: um PIN certo num
dispositivo revogado **não entra**. Se a verificação for só do PIN, passa.

**Três ataques:**
1. Revogar e tentar com o **PIN correto** — a recusa tem de ser pela revogação.
2. Revogar **durante** uma sessão aberta: os comandos seguintes param. Um
   dispositivo que já entrou não fica com licença vitalícia.
3. O PIN correto de **outro** dispositivo, no revogado. Um PIN partilhado pela
   equipa é o caso real, não o improvável.

**E o controlo que dá sentido:** o mesmo dispositivo, **não** revogado, com o
mesmo PIN, **entra**. Sem isso, um sistema que recusasse tudo passava os três.

## Aceite 3 — «transferência mantém origem e destino coerentes»

Transferir uma sessão entre mesas mexe em **duas** linhas, e é onde a coerência se
perde. **A transferência é uma transacção ou não é nada:** se a origem liberta e o
destino falha, a sala fica com uma sessão no ar e uma mesa ocupada por ninguém.

**Ataques:** partir o destino a meio e exigir que a origem **fique como estava**;
transferir para uma mesa **já ocupada** e exigir recusa; e transferir duas vezes
em concorrência, que é o aceite 1 outra vez por outra porta.

**Arquivar respeita sessões abertas:** arquivar uma mesa com sessão aberta ou
recusa, ou fecha a sessão **deliberadamente** — nunca a deixa órfã. A pergunta que
vou fazer é o que acontece à conta de quem está sentado.

## O que reprova à cabeça

- **Concorrência provada em sequência.** É o defeito mais provável desta etapa.
- **Unicidade garantida por consulta prévia** em vez de restrição na base.
- **Revogação verificada só no ecrã.** O servidor recusa, senão é uma sugestão.
- **PIN comparado sem tempo constante**, ou registado em claro no diário.
- **Transferência sem transacção**, provada só pelo caminho feliz.
- **Verde sobre sala vazia:** uma sala sem mesas passa tudo. A prova declara
  quantas mesas existem antes de afirmar seja o que for.

## O que já sei que vou perguntar

O tablet é **partilhado** — está no contrato `offline-e-fila-local.md` do E00, e a
fila é por `org + unidade + utilizador`. Portanto: **o que acontece à fila local
quando o dispositivo é revogado?** Se ficar lá, um empregado despedido leva
pedidos por enviar no aparelho que já não é dele. Não vi isto escrito em lado
nenhum, e é a pergunta que a etapa tem de responder.
