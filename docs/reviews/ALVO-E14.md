# Régua do E14 — motor de pedidos e entrega confiável

> Escrita a 04/09, com o E13 a meio e **sem uma linha de E14**.

Vinte IDs, e a primeira etapa onde um defeito **cobra dinheiro duas vezes** ou faz
desaparecer o trabalho de alguém no meio de um serviço. Os três aceites são três
formas diferentes de a mesma coisa falhar: **duas escritas que se encontram**.

## Aceite 1 — «timeout depois do commit, e reenvio com a mesma chave»

A frase que carrega tudo é **depois do commit**. O caso não é a rede falhar antes
de gravar — é gravar, a resposta perder-se, e o cliente reenviar. O servidor já
tem o pedido; o cliente acha que não tem.

**O meu ataque:** gravar, **matar a resposta**, e reenviar com a mesma
`command_id`. Um pedido, não dois. E o par que separa a regra da sorte: **duas
chaves diferentes criam dois pedidos** — senão um sistema que ignorasse o segundo
envio passava o primeiro caso e perdia pedidos legítimos.

O contrato do E00 já o diz e vou verificar que se cumpre: *«o `command_id` nasce no
cliente, antes do envio, e sobrevive ao recarregamento»*. Se morre com o separador
do navegador, a retentativa cria uma segunda cobrança — que é o defeito que ele
existe para impedir.

**E a idempotência é da BASE, não do código.** Um `SELECT` por `command_id` antes
do `INSERT` é a mesma corrida do E13 com outro nome. Quero a restrição única.

## Aceite 2 — «dois operadores sem apagar o trabalho um do outro»

Esta é a que perde trabalho em silêncio. O padrão que falha é o mais natural de
escrever: ler o pedido, juntar o item, gravar o pedido inteiro. **A última escrita
ganha**, e o item do outro desaparece sem erro nenhum.

**Ataques:** dois operadores a acrescentar itens **em paralelo** — disparados
juntos, não em sequência, que é o defeito nomeado na régua do E13 — e no fim os
**dois** itens lá estão. Depois, uma versão desactualizada a gravar: tem de dar
**conflito recuperável**, com o ecrã a dizer o que mudou. «Recuperável» é a palavra:
um 409 que obriga a refazer o pedido do zero cumpre a letra e falha a pessoa.

## Aceite 3 — «preço novo não altera linhas já aceites»

Um preço publicado a meio de um serviço **não mexe no que já foi aceite**. A conta
de quem está sentado não muda porque a cozinha actualizou a carta.

**Ataques:** aceitar uma linha, publicar preço novo, e exigir que a linha **fique**
com o preço de origem — e que uma linha nova use o novo. Sem o segundo caso, um
sistema que ignorasse a publicação passava o primeiro.

E o esgotado: **rejeitado com o carrinho preservado**. Rejeitar limpando o
carrinho é o defeito que faz a pessoa desistir — e passa qualquer teste que só
verifique a rejeição.

## O que reprova à cabeça

- **Idempotência por consulta prévia** em vez de restrição única.
- **Conflito não recuperável** — 409 sem dizer o que mudou.
- **Concorrência provada em sequência.** A `validar-concorrencia.sh` já existe.
- **Preço lido no momento de fechar a conta** em vez de gravado na linha aceite.
- **Carrinho limpo ao rejeitar** um item esgotado.
- **Verde sobre pedido vazio:** um pedido sem linhas passa quase tudo. A prova
  declara quantas linhas existem antes de afirmar seja o que for.

## A pergunta que trago do contrato

`offline-e-fila-local.md` diz que **offline não faz pagamento nem reserva
confirmada** — «não é limitação da primeira versão, é o desenho». O E14 traz
**entrega**. Então: **um pedido enviado offline e aceite mais tarde cobra a que
preço?** O do momento em que foi escrito, ou o do momento em que chegou? O aceite
3 diz que preço novo não mexe em linha aceite — mas ali a linha ainda não tinha
sido aceite quando o preço mudou. Não vi isto decidido, e é dinheiro.

## Respondida — 04/09, antes da entrega

Deixo a pergunta acima de pé, porque o que ela revela é que a régua tinha um
buraco de dinheiro. A resposta está em
`docs/architecture/preco-de-um-pedido-escrito-offline.md`, e passa a ser **aceite
desta etapa**:

**O momento que conta é a escrita. A autoridade sobre o que esse momento valia
não é o aparelho — é a cópia da ementa que o servidor tem.** A linha viaja com o
preço mostrado *e* a versão da ementa; à chegada o servidor confere. Bate certo,
aceita. Não bate, ou versão desconhecida: **pára numa pessoa**, nunca
reprecifica em silêncio.

### O que exijo ver, e o que recuso

Recuso a demonstração feliz — pedido escrito, preço mantido — porque a regra
errada («o preço de quando chegou») passa-a sempre que o preço não muda no meio.
O que essa prova mede é o caso em que as três regras concordam.

1. **Mudar o preço ENTRE a escrita e a chegada** e a conta ficar no valor antigo.
   Sem a alteração no meio, não foi medido nada.
2. **Mandar uma linha com um preço que aquela versão da ementa não continha** e
   verificar que não foi aceite *nem* recalculada — que parou numa decisão
   humana. Esta é a metade que distingue a regra certa de confiar no aparelho.
3. **Declarar quantas linhas o pedido tinha** antes de afirmar qualquer das duas.
