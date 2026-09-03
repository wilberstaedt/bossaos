# BossaOS

Base executável do BossaOS. Esta é a etapa **E01**: o repositório arranca, liga-se
a uma base de dados, diz a verdade sobre a própria saúde e tem verificação
contínua. **Não há telas de produto aqui** — entram nas etapas que as desenham.

## O que precisa de ter instalado

| Dependência | Versão | Como obter (macOS) |
| --- | --- | --- |
| Node | fixado em `.nvmrc` (22.23.2) | `fnm install && fnm use` |
| pnpm | fixado em `packageManager` | `corepack enable` |
| PostgreSQL | 16 | `brew install postgresql@16 && brew services start postgresql@16` |
| Mailpit | qualquer | `brew install mailpit` |

O Node é fixado à versão exacta e não a um intervalo. O `prisma@7` recusa
arrancar em Node 23, e descobrir isso a meio de um `install` custa mais do que a
rigidez do ficheiro.

## Arrancar do zero

```bash
fnm use                # a versão do .nvmrc
pnpm install           # instala pelo lockfile e gera o cliente Prisma
./scripts/dev-db.sh    # cria as bases e os DOIS papéis separados
cp .env.example .env   # os valores impressos pelo script acima já lá estão
pnpm db:migrate        # aplica a migração
pnpm --filter @bossaos/web dev
```

`http://localhost:3000` — e as duas sondas em `/api/health` e `/api/ready`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm lint` | ESLint sobre todo o workspace |
| `pnpm typecheck` | TypeScript, pacote a pacote |
| `pnpm test` | testes de `node:test` |
| `pnpm build` | build de produção do Next |
| `pnpm verificar` | os quatro acima, em sequência |
| `pnpm db:migrate` | cria e aplica migração (desenvolvimento) |
| `pnpm db:migrate:deploy` | aplica migrações existentes (CI e produção) |
| `pnpm db:migrate:status` | há migrações por aplicar? há desvio? |
| `pnpm dev:db` | (re)cria bases e papéis locais |
| `pnpm dev:mail` | Mailpit — caixa de correio local em `:8025` |
| `pnpm provar:credenciais` | prova que o runtime não altera o schema |
| `./scripts/provar-prontidao.sh` | prova a prontidão em 4 estados de infra |

Lint e tipos são comandos **separados**. Um `verificar` só existe por conveniência;
quando falha, corra o que interessa isoladamente para saber o que partiu.

## As duas credenciais

Há duas ligações à base de dados, e isso não é redundância:

```
MIGRATION_DATABASE_URL   bossaos_migrate   faz DDL. Só os comandos de migração.
DATABASE_URL             bossaos_app       faz DML. NÃO pode alterar o schema.
```

Se o runtime pudesse alterar o schema, uma injecção bem-sucedida deixaria de ser
leitura indevida e passaria a `DROP TABLE`. A separação está provada por script,
não prometida por comentário:

```bash
pnpm provar:credenciais
```

O script começa por confirmar que a credencial de execução **funciona** antes de
verificar o que ela não pode fazer. Sem essa primeira metade, uma senha errada
daria verde em todas as recusas.

## Saúde e prontidão

São perguntas diferentes e respondem separado:

| Rota | Pergunta | Toca na base? |
| --- | --- | --- |
| `/api/health` | este processo responde? | não |
| `/api/ready` | consegue servir tráfego a sério? | sim |

`/api/ready` distingue três estados, e devolve **503** em todos menos o primeiro:

- `pronto` — base responde e o schema chegou
- `schema_por_migrar` — base viva, migração por correr (um deploy incompleto)
- `base_indisponivel` — não há base, ou a configuração é inválida

Um `/health` que consultasse a base faria o orquestrador reiniciar a aplicação
quando quem caiu foi o Postgres, e reiniciar não cura uma base em baixo.

## Registo

Uma linha JSON por evento, com `request_id` em todas as linhas do mesmo pedido.
Chaves com nome sensível (`password`, `token`, `authorization`, `secret`, …) saem
como `[redigido]`, e ligações com credencial embutida saem com a senha apagada.
Um `x-request-id` vindo de fora só é aceite se tiver formato de identificador —
caso contrário quem o envia escolhe o que fica escrito no nosso log.

## Quando falta uma dependência externa

A regra do projecto: **dependência ausente fica como pendência declarada, nunca
como simulação com ar de pronto.** Na prática:

- **PostgreSQL em baixo** — `pnpm dev:db` pára a dizer o que fazer.
  A aplicação continua a arrancar e `/api/ready` responde `503
  base_indisponivel`. Não há modo "em memória": um serviço que finge base
  saudável mente ao orquestrador, e é isso que o CT-03 proíbe.
- **Mailpit ausente** — `pnpm dev:mail` falha e nada mais é afectado nesta etapa.
  Nenhum código de envio de e-mail existe ainda; quando existir, `MAIL_FROM` e
  `SMTP_*` já estão validados no arranque. Não há fornecedor real configurado, e
  isso é deliberado: entra na etapa que o desenhar.
- **Armazenamento** — `STORAGE_DRIVER=local` grava em `.storage/`. Pôr `s3` sem
  a implementação **atira um erro** em vez de gravar no disco em silêncio.
- **Configuração em falta** — o processo não arranca. A mensagem nomeia as
  variáveis que faltam e nunca imprime o valor de nenhuma.

## Se o build falhar com `useContext` de `null`

Sintoma: `pnpm build` morre a pré-renderizar `/_global-error` com
`TypeError: Cannot read properties of null (reading 'useContext')`.

Causa: **`NODE_ENV=development` exportado na shell**. Acontece a quem carrega o
`.env` antes de construir. O `pnpm build` já fixa `NODE_ENV=production` e é imune;
se estiver a chamar `next build` à mão, fixe-o também.

## Estrutura

```
apps/web        Next 16 (App Router, runtime Node) — sondas e página única
apps/worker     processo de fundo — arranque, ligação e aptidão com request_id
packages/config validação de ambiente e registo com redacção
packages/db     Prisma 7, schema e sonda de base
packages/domain portas do domínio (por agora, a porta de média)
packages/storage condutor de disco local da porta de média
packages/ui     fichas de design partilhadas
```
