# A semeadura acrescenta linhas de caixa que ninguém pode apagar

> 08/09. Medido ao investigar por que razão a base tinha `cash_registers 6`,
> `cash_register_events 17` e `cash_movements 1` quando só **um** registo e **um**
> evento eram meus.

## A medição

Corri o `packages/db/prisma/semente-inspeccao.ts` uma vez e contei antes e depois:

    antes   registos=6  eventos=17  movimentos=1
    depois  registos=7  eventos=18  movimentos=3

**+1 registo, +1 acontecimento e +2 movimentos por semeadura.**

## Porque é que isso não se desfaz

Os `cash_movements` e os `cash_register_events` são **append-only por gatilho** —
`movimentos_sao_imutaveis` e `acontecimentos_de_caixa_sao_imutaveis` — e o
bloqueio vale **para toda a gente, incluindo `bossaos_migrate`**, que é a dona
das tabelas. Medido hoje, com a mensagem do próprio Postgres:

    REGISTO_IMUTAVEL: cash_movements não se altera nem se apaga;
    a correcção é um registo novo

O `limparDemonstracao` aborta nelas, e por isso **nem a limpeza da demonstração
consegue devolver a base ao que era** quando há caixa semeada.

## O que isto é

**Uma fuga lenta por desenho.** É do mesmo género dos 125 restos de
`@exemplo.example` — corridas que deixam linhas atrás — com uma diferença que
inverte a gravidade: **os 125 eram limpáveis e foram limpos hoje; estas não são
limpáveis por ninguém.** Só desaparecem com a base.

Os 6/17/1 encontrados não são um resíduo antigo: são **muitas corridas
empilhadas**, e o número sobe sempre que alguém semeia.

## Devia a semeadura ser idempotente nestas três tabelas?

**Acho que sim, e a razão não é arrumação.**

O argumento a favor de não ser é sério e é o que existe hoje: a imutabilidade do
rasto de dinheiro é uma garantia do produto, e um seed que «actualizasse» um
movimento existente estaria a fazer, em desenvolvimento, exactamente o que o
produto proíbe em produção. Uma semente que contorna a garantia ensina que a
garantia se contorna.

**Mas idempotente não quer dizer apagar nem alterar.** Quer dizer **não criar
outra vez o que já existe** — e isso respeita a garantia inteira:

- as outras entidades da semente já são idempotentes por identificador fixo (o
  `DEMO.caixa`, o `DEMO.pedido`, todos os `d0000000-…`), e é assim que a
  semeadura pode correr muitas vezes;
- dar identificadores fixos aos registos, acontecimentos e movimentos da
  inspecção fá-los cair na mesma regra: **existe? não cria.** Nada é apagado,
  nada é alterado, e o gatilho nunca é tocado;
- e o efeito colateral é o que interessa: a base deixa de crescer por correr.

**A objecção que fica de pé, e não é minha para resolver:** com identificador
fixo, uma semeadura deixa de conseguir *acrescentar* movimentos novos a cada
corrida — e se alguma prova depende de haver mais movimentos a cada passagem,
isso parte-a. Não medi essa dependência, e não a presumo.

## O que NÃO fiz

Não mexi na semeadura. Isto é desenho, não limpeza, e foi pedido que ficasse
escrito antes de alguém tocar.
