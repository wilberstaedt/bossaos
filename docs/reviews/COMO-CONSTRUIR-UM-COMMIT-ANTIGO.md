# Um worktree constrói — e o que faltava era uma linha de shell

> 08/09. Escrito porque a pergunta levantada era estrutural: **se ninguém
> consegue reproduzir um commit antigo nesta casa, isso vale mais do que qualquer
> captura.** Não é o caso. Constrói.

## O percurso que falhou, e porquê

| tentativa | resultado | causa real |
|---|---|---|
| `pnpm install` com o Node da shell | falhou | versão errada — o `.nvmrc` pede 22.23.2 |
| `pnpm install` com o Node certo | falhou no `postinstall` | `MIGRATION_DATABASE_URL` em falta |
| copiar o `.env` para o worktree | falhou na mesma | **copiar não é exportar** |
| `next build` | dezenas de `TS7006` | sintoma, não causa: cliente do Prisma não gerado |

**A terceira linha é a que interessa.** O `postinstall` corre `prisma generate`,
que em Prisma 7 carrega o `packages/db/prisma.config.ts` — e esse ficheiro
**lança** se `MIGRATION_DATABASE_URL` não estiver no ambiente. Um `.env` no disco
não é uma variável no ambiente: o `pnpm install` não lê ficheiros `.env`. No
repositório principal isto nunca se nota, porque quem lá trabalha já exportou o
ambiente para outra coisa qualquer.

E os `TS7006` eram exactamente o que a revisão suspeitou — **cliente não gerado**.
A verificação apontou a um caminho que também não existe no repositório
principal, e por isso não o confirmou; a confirmação é que, com o cliente gerado,
são **zero**.

## A receita, medida

    git worktree add -f --detach /tmp/<nome> <commit>
    cp .env /tmp/<nome>/.env
    cd /tmp/<nome>
    set -a && . ./.env && set +a          # ← a linha que faltava
    fnm exec --using=22.23.2 pnpm install --frozen-lockfile
    fnm exec --using=22.23.2 pnpm --filter @bossaos/web exec next build

Resultado em `483c4a7`: **install 0**, `✔ Generated Prisma Client (v7.10.0)`,
**build 0**, **`TS7006` 0**.

O `pnpm` usa a loja partilhada, portanto o `install` num worktree é rápido e não
duplica o disco — a corrida levou segundos.

## O que isto NÃO é

**Não é um achado estrutural.** A reprodutibilidade de commits antigos está
intacta; o que faltava era uma linha de ambiente, e agora está escrita. Quem
voltar a bater nisto bate no ficheiro em vez de bater na adivinha.
