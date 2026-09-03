# Arquitectura — visão de conjunto

> E00. Fecha o que CT-03 propôs, com as versões verificadas em `versions.md` e as
> decisões em `adr/0001-foundation.md`. Não reabre estratégia nem redesenha telas.

## A forma

Um monólito modular. Dois processos — web e worker — a partilhar o mesmo núcleo de
domínio e a mesma base transacional. Nenhuma superfície tem catálogo ou estado de pedido
próprio: o TPV, o KDS, o Staff, o QR e o site lêem o mesmo `packages/domain`.

| Pasta | Responsabilidade | Depende de |
| --- | --- | --- |
| `apps/web` | Rotas, páginas, layouts, adaptadores HTTP e Server Actions. | domain, db, ui, config |
| `apps/worker` | Outbox, jobs, integrações e tarefas agendadas. | domain, db, config |
| `packages/domain` | Casos de uso, regras, máquinas de estado e **portas**. Zero React, zero Prisma. | config |
| `packages/db` | Schema Prisma, repositórios, políticas de isolamento e migrations. | domain (só tipos) |
| `packages/ui` | Tokens, componentes, acessibilidade e temas. | — |
| `packages/config` | Ambiente validado, uma vez, no arranque. | — |

A regra que sustenta isto: **`packages/domain` não sabe que existe Prisma nem HTTP.**
Define portas; `packages/db` e `apps/*` fornecem adaptadores. É o que permite trocar de
ORM sem reescrever regras — e, depois do que `versions.md` mostrou sobre o Drizzle, essa
opção vale a disciplina que custa.

## As três verificações, e são independentes

CT-02 diz que plano, autorização e flag são coisas diferentes. Em código isso é:

1. **Entitlement** — a organização comprou esta capacidade? Sai de `EntitlementGrant`,
   resolvido no servidor, nunca de uma condição no frontend.
2. **Permissão** — este actor, neste papel, neste escopo, pode fazer isto? Sai da matriz
   de permissões, avaliada com o contexto resolvido.
3. **Flag** — a implementação está libertada? Sai de `FeatureFlag`, e existe para desligar
   algo meio-pronto sem tocar em plano nem em papel.

As três falham de maneiras diferentes e com mensagens diferentes. Um 403 por falta de
plano não pode ler-se como falta de permissão: a primeira vende-se, a segunda concede-se.

## Isolamento: duas camadas, e a de baixo não confia na de cima

CT-04 exige filtro de escopo no domínio **e** políticas de linha no PostgreSQL. Com Prisma
7 o desenho fica assim, e a mudança que o JR encontrou ajuda:

- O `PrismaClient` recebe um **adaptador** (`@prisma/adapter-pg`) com a credencial de
  *runtime*, que **não** é dona das tabelas, não é superuser e não tem `BYPASSRLS`.
- As migrations correm com **outra credencial**, declarada em `prisma.config.ts`. A
  separação passa a ser explícita no ficheiro em vez de implícita no `.env`, que é
  melhor do que o desenho antigo.
- Toda a leitura ou escrita com escopo de inquilino corre dentro de uma transação
  interactiva que começa por `SET LOCAL app.organization_id`. **Sem contexto, a política
  nega.**

O risco desta escolha está nomeado no ADR 0001 e vai a teste no E03: uma consulta que
escape à transação não falha alto, devolve vazio — e vazio lê-se como "não há nada". O
teste tem de correr com o papel real de runtime e provar que a política reprova, não só
que a consulta certa devolve o certo.

## Comandos, eventos e a diferença entre aceitar e confirmar

CT-06 e CT-09. O cliente gera `command_id` antes de enviar e guarda-o. O servidor persiste
comando e resultado **junto com o efeito**, na mesma transação. Repetir a mesma chave com
o mesmo payload devolve o resultado anterior; com payload diferente, conflito.

Os eventos saem por **outbox** gravada na transação do negócio, e o worker entrega com
recibo de deduplicação. O SSE tem cursor: uma tela que perdeu intervalo pergunta o estado
autoritativo em vez de aplicar uma versão velha por cima de uma nova.

Nada disto é sofisticação: é o que separa "o pedido foi aceite" de "eu vi o ecrã dizer que
sim". Num restaurante com wifi mau, é a diferença entre uma comanda e duas.

## Dinheiro

Unidades mínimas inteiras, com código de moeda. Nunca `float`. Quantidades e custos
fraccionários em decimal exacto. A política de arredondamento e de distribuição de
resíduos escreve-se **antes** do checkout, não depois de aparecer um cêntimo a mais.

O aceite do CT-11 é o teste: 10,00 € em três dá 3,34 + 3,33 + 3,33, e a soma das partes
confere ao cêntimo com o total.
