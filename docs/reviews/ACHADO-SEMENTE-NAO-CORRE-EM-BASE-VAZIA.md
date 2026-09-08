# A semente de inspecção nunca conseguiu correr numa base vazia

> 08/09. Descoberto ao executar o DROP autorizado. **A reposição parou aqui.**

## O que aconteceu

Depois do `DROP`, do `CREATE`, das migrações e das duas sementes:

    esperado  5 utilizadores
    real      2 utilizadores

A semente da demonstração passou. **A semente de inspecção rebentou:**

    Invalid `prisma.category.create()`
    Foreign key constraint violated on the constraint: `categories_organization_id_fkey`

## Porquê

`semente-inspeccao.ts` **importa `IDS` de `fixtures.ts` e nunca cria as
organizações a que os `IDS` se referem.** Na linha 51 cria a primeira categoria
com `organizationId: IDS.orgA`, e `orgA` não existe. Quem cria `orgA` é
`fixtures.ts::semear()` — e nenhuma das duas sementes o chama.

**Numa base que nunca esteve vazia isto nunca se via:** `orgA` estava sempre lá,
deixada por uma corrida de provas anterior. A semente parecia idempotente e
auto-suficiente porque nunca correu contra o vazio. Foi preciso um `DROP` para o
descobrir, e é o mesmo padrão dos outros dois achados desta semana — a base suja
escondia a dependência.

## Porque é que faltam exactamente três

`semearContasDoArnes()` é a **última** coisa do ficheiro (linha 2247). A semente
morre na linha 51, portanto as três contas do arnês — `painel@`, `painel-b@`,
`painel-c@` — nunca chegam a ser criadas. A conta fecha:

    5 esperados = 2 (demonstração) + 3 (arnês)
    2 reais     = 2 (demonstração) + 0, a semente morreu antes de lá chegar

## De caminho, confirma o achado das caixas pelo outro lado

Base recém-criada: `cash_registers 0`, `cash_register_events 0`,
`cash_movements 0`. Os `6/17/1` que eu tinha medido **não têm nenhuma parte
legítima**: eram resíduo acumulado na totalidade. Ver
[[ACHADO-FUGA-LENTA-NAS-CAIXAS]].

## O que NÃO fiz

Não mexi na semente e não continuei a reposição. Um número errado a seguir a um
`DROP` é o pior sítio para improvisar, e a ordem era parar e dizer.
