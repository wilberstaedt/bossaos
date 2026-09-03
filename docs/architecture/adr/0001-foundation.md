# ADR 0001 — Fundação: ORM, identidade e o que muda no pacote

**Data:** 2026-09-03 · **Estado:** aceite · **Etapa:** E00

## Contexto

O pacote propôs em D04 um default técnico: monólito modular com Next.js, PostgreSQL,
Drizzle e Better Auth. CT-03 e D04 dizem que o E00 verifica versões e regista ADR antes
do scaffold. A verificação foi feita contra o registo npm e está em `versions.md`.

## Decisão 1 — ORM: Prisma, não Drizzle

**O que a verificação mostrou.** `drizzle-orm@0.45.2` é a última estável e foi publicada
há **159 dias**. Não existe **nenhuma** versão `1.x` estável no registo: a linha 1.0 vive
em `1.0.0-beta.22`, parada há 139 dias. Estável envelhecida e beta parada ao mesmo tempo,
na camada que vai carregar dinheiro, isolamento entre inquilinos e concorrência de
reservas.

**Por que Prisma.** O Matheus corre GlowArt, Samba CRM e Norte em produção com Prisma, e
os padrões que este projecto vai precisar já foram resolvidos por ele lá: migrations
versionadas, `TZ=UTC`, disciplina de `db push` aditivo, e — no Norte — gatilhos
*append-only* e `CONSTRAINT TRIGGER` escritos à mão em SQL, que é exactamente o que
CT-04 e CT-08 exigem aqui. Num projecto de 36 etapas feito por uma pessoa, familiaridade
com a ferramenta não é conforto: é menos superfície onde errar.

**O que se perde, dito por extenso.** Drizzle expõe SQL mais directamente e torna o
`SET LOCAL` por transação mais natural para RLS. Com Prisma isso faz-se em transação
interactiva com `$executeRaw` — funciona, mas exige que **toda** consulta com escopo de
inquilino passe pela transação que define o contexto, e isso tem de ser uma regra do
domínio, não uma boa intenção. Fica como risco nomeado para o E03, com teste que corre
com o papel real de runtime e não só pelo ORM, como CT-04 manda.

**Reversibilidade:** alta antes do E07, baixa depois. Se o E03 mostrar que o contexto
transacional não se sustenta, volta-se aqui antes de haver catálogo e dados.

## Decisão 2 — A logo passa a existir, e o D01 muda

O pacote decidiu em D01 que o símbolo estava em aberto e mandou usar só o wordmark. **Já
não está.** O Matheus entregou as duas peças a 03/09, depois de os PDFs terem sido
escritos: `brand/logoname.png` (símbolo + wordmark) e `brand/logoicon.png` (só o símbolo).
São definitivas.

Uso: **ícone** onde o espaço é quadrado ou pequeno — favicon, ícone de app, avatar, KDS,
kiosk. **Wordmark** onde há largura e a marca precisa de ser lida — LP, cabeçalho do
admin, materiais comerciais, rodapé das experiências públicas.

## Decisão 3 — A cor da logo e a cor do token não são a mesma pergunta

O coral da arte entregue é `#FB4C39`; o token do manual é `#F5664D`. Medi o contraste em
vez de escolher por gosto:

| Coral | Sobre branco | Sobre areia `#F7F4EC` | Sobre verde `#102E35` |
| --- | --- | --- | --- |
| Manual `#F5664D` | 3,05 | **2,77** (falha gráfico) | **4,71** (passa texto) |
| Logo `#FB4C39` | 3,39 | **3,08** (passa gráfico) | **4,23** (falha texto) |

Nenhum ganha nos dois. Portanto: **o token de interface continua `#F5664D`**, porque é
contra ele que as 396 vistas foram desenhadas e é ele que passa texto normal sobre o
verde, que é o uso dominante. **A arte da logo fica como foi entregue**, porque é gráfico
e não texto, e sobre a areia comporta-se até melhor. Repintar a logo para casar com o
token pioraria o único sítio onde ela é usada em cima da areia.

CT-13 continua a valer: branco sobre coral não serve para texto comum, em nenhuma das
duas versões.

## Decisão 4 — Falta o vector

Ambas as logos são PNG, com bordas semi-transparentes e ruído de rasterização visível no
ícone. Para favicon, ícone de app e impressão vai ser preciso SVG. **Não é bloqueio** do
E01: o PNG serve para o produto começar. Fica como dependência externa nomeada, na linha
do que CT-19 manda fazer com o que ainda não existe.
