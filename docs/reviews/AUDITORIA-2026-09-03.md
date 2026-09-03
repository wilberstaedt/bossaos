# Auditoria adversarial ao código já validado — 2026-09-03

> Feita entre etapas, contra as **cinco regras** de `docs/architecture/README.md`, e não
> contra a lista de aceites de nenhuma etapa. O objectivo é encontrar o que passou pelas
> revisões, incluindo as minhas.

## Achado 1 — um comentário que prometia o que o código não fazia · **corrigido**

`packages/db/prisma.config.ts`. O comentário dizia que, faltando
`MIGRATION_DATABASE_URL`, os comandos de migração falhariam **a dizer o nome da
variável**. O código tinha `?? ''`, e o Prisma respondia `Connection url is empty` — que
não diz qual variável nem onde a pôr.

**Medido, não presumido:** `prisma migrate status` com a variável apagada.
**Corrigido** e provado nos dois sentidos: sem ela, saída 1 nomeando-a e distinguindo-a da
`DATABASE_URL` do runtime; com a `.env` carregada, saída 0 e *"5 migrations found, Database
schema is up to date"*.

Está no **E01, que eu validei**. É a segunda coisa que me escapou nessa etapa — a primeira
foram as fichas de cor inventadas, apanhadas pelo JR no E02. As duas têm a mesma forma: a
minha revisão verificou estrutura e provas, e não leu **o que as afirmações diziam**.

> Inversão de papéis, dita em voz alta: o ficheiro é do JR e a correcção é minha. **Não a
> conto como validada** — fica para os olhos dele.

## Achado 2 — quase dei por provado um lado que nunca correu

Ao verificar a correcção acima, o primeiro teste falhou **dos dois lados**, e eu ia
concluir que o erro era outro. A causa: no segundo caso eu nunca tinha carregado a `.env`,
por isso "com a variável" nunca teve a variável.

Não é um defeito do produto. É o registo de que a armadilha apanha mesmo quem anda o dia
todo a persegui-la, e por isso a regra do **par** só vale se os dois lados forem
verificados como tendo corrido.

## Varredura das rotas de API — **limpa**

Oito rotas. Cinco com guarda; três sem, e as três legitimamente:

| Rota | Guardas | Veredicto |
| --- | --- | --- |
| `api/auth/[...all]` | 0 | é o próprio manípulo de autenticação |
| `api/health` · `api/ready` | 0 | públicos por desenho (E01) |
| `api/convites/aceitar` | 2 | |
| `api/org/[orgSlug]/convites` | 6 | |
| `api/org/[orgSlug]/financeiro` | 2 | **a testar no E04** — é o caso "host não lê financeiro" |
| `api/org/[orgSlug]/marcas/[id]` | 3 | |
| `api/org/[orgSlug]/pessoas/[…]/revogar` | 4 | |

Contar guardas **não prova** autorização — prova que alguém escreveu qualquer coisa. O
`financeiro` com duas fica marcado para a prova por pedido directo à API na revisão do E04,
que é a única que conta.

**Carga dos dois endpoints públicos, lida ao vivo:** `{"estado":"pronto","schema_version":
"e01_base","request_id":…}` e `{"estado":"vivo","ts":…,"request_id":…}`. Sem versões de
biblioteca, sem hospedeiro, sem pilha de erro. O `schema_version` é o nome da migração e
é o que dá sentido ao endereço; fica **anotado para o E32/E33**, quando houver orquestrador
e se decidir se `ready` deve continuar a ser público na internet.

## Padrão procurado e não encontrado

`?? 0`, `|| 0` e `catch {}` em código de produto: seis casos, todos em apresentação de
interface (`?? ''` numa célula de tabela, nome de utilizador em falta). Nenhum a
transformar **um facto de negócio desconhecido em zero** — que é o que o
`modulos-de-gestao.md` proíbe. Fica dito porque o risco nasce no E25-E30: um `?? ''` numa
célula que passe a mostrar custo ou margem torna-se exactamente a mentira que aquele
contrato existe para impedir.
