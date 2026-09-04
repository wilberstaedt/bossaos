# A lista de espera: o que é um lugar nela

> Contrato do E19, escrito antes de existir código.
> Par com `capacidade-e-reservas.md` (o motor) e com a régua `ALVO-E19.md`.

## O erro que este documento existe para evitar

Uma lista de espera parece uma fila: chega-se, tira-se senha, espera-se a vez.
Escrito assim, o produto guarda uma coluna `posicao` e mostra-a: **«é o 3.º»**.

Num restaurante isto é **falso no primeiro minuto**. Um grupo de 6 à espera não
bloqueia um grupo de 2 quando o que vaga é uma mesa de 2 — o host senta o de 2,
e faz bem: a alternativa é ter a mesa vazia com gente à porta. O de 6 continua a
ver «é o 3.º» enquanto vê entrar duas pessoas que chegaram depois dele.

**A ordem de chegada não é a ordem de sentar.** Quem mostra a primeira como se
fosse a segunda não está a informar, está a prometer uma coisa que a operação
contradiz — e o cliente vê a contradição acontecer à frente dele, na porta.

## O que se guarda, e o que não se guarda

**Guarda-se:** o momento de chegada, o tamanho do grupo, o contacto, o estado
(à espera, chamado, sentado, desistiu) e as zonas que servem aquele grupo.

**NÃO se guarda uma posição.** Não existe coluna `posicao`, nem `numero_na_fila`,
nem `senha`. É deliberado, e é a mesma garantia por ausência que protege as
sessões de visitante: **ninguém pode mostrar um número errado se o número não
existe em lado nenhum para ser mostrado**. Escrever essa coluna exige uma
migração, e uma migração é revista.

A posição, quando é precisa, **deriva-se** — e deriva-se sempre **dentro do
grupo que cabe nas mesmas mesas**. «É o 2.º dos grupos de 5 ou 6» é verdade e
sobrevive ao de 2 passar à frente. «É o 3.º» não sobrevive a nada.

## O que se mostra a quem espera

Duas frases distintas, que nunca se dizem igual:

- **Enquanto espera:** uma estimativa, dita como estimativa, no texto que a
  pessoa lê. A incerteza está na frase, não num atributo escondido no HTML.
- **Quando a mesa está pronta:** um facto. Muda o verbo, muda o tom, e a
  diferença tem de ser legível **sem ver as duas ao lado uma da outra** — porque
  na vida real nunca se vêem as duas ao lado uma da outra.

Se a estimativa e o facto se disserem da mesma maneira, a distinção não existe,
por muito que exista no código.

## O que o host vê, e porquê é diferente

O host **precisa** de ver a ordem de chegada, porque é a informação que lhe
permite ser justo de propósito quando decide não a seguir. Ele vê quem chegou
primeiro, vê quem cabe na mesa que vagou, e escolhe. **A decisão é dele.**

O que o produto não faz é escolher por ele em silêncio e depois apresentar o
resultado como se fosse uma fila. Se o sistema sugerir um próximo, sugere
dizendo **porquê** — «cabe na mesa 4, que vaga agora» — e a sugestão é
recusável. Um host que não percebe a sugestão deixa de a usar em duas noites.

## Onde isto se prova

- A posição derivada muda quando muda a **composição da espera**, não quando
  muda um contador. Prova: dois grupos de tamanhos diferentes, uma mesa pequena
  a vagar, e a posição do grupo grande a **não** mudar.
- O controlo negativo obrigatório: fazer a derivação ignorar o tamanho do grupo.
  Se a prova continuar verde, ela está a medir uma fila, não uma lista de espera.
- A estimativa e o facto medidos **no texto visível**, cada um sozinho.
