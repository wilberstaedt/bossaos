# HANDOFF — estado do motor BossaOS

**Etapa atual:** E04 — autenticação, convites e permissões
**Estado:** implementado pelo JR, **aguardando validação do sénior**.
**Próxima ação:** o sénior valida o E04 contra
`docs/architecture/autenticacao-e-convites.md`, que escreveu no E00. O JR **não** avançou
para E05.

| Etapa | Estado |
| --- | --- |
| E00 — contrato e leitura das fontes | implementado, **aguardando validação**. Sete documentos em `docs/architecture`. Quem os escreveu não os valida: a prova vem no E11, quando se vir se o E02-E10 se construíram a partir deles. |
| E01 — repositório e verificação contínua | **validado** · `docs/reviews/E01.md` |
| E02 — design system, responsividade e idiomas | **validado** à 2ª · `docs/reviews/E02.md`. A 1ª revisão apanhou o acento a pintar um indicador de estado a 2,77:1; corrigido com `acentoSinal` e uma guarda de lista de permissão. |
| E03 — estrutura multi-tenant e isolamento | **validado** à 2ª · `docs/reviews/E03.md`. A 1ª revisão apanhou o verificador a dizer verde com zero medido; corrigido, e a mesma guarda aplicada às outras provas. |
| E04 — autenticação, convites e permissões | implementado, **aguardando validação** · `docs/progress/E04.md` |

**Primeiras telas.** O E02 é a primeira etapa que toca `coverage.csv`: STATE 001-003,
005, 007 e 016. Até aqui o medidor de telas esteve a 0 % e isso era verdade, não uma
avaria — E00 a E01 são transversais e não entregam vista nenhuma. Estão agora a
`implementado aguardando validação`; `scripts/validar-cobertura.sh` diz "Cobertura íntegra".

## E02 — o que existe agora

`packages/ui` (fichas medidas, contraste WCAG, validação de tema no servidor, 11
componentes, 5 estruturas) e `packages/i18n` (es-ES · pt-BR · en, moeda em unidades
mínimas inteiras). Catálogo de inspecção em `/[idioma]/interno/catalogo`, fora das rotas
comerciais; as cinco molduras em `/[idioma]/interno/estruturas/[qual]`.

**69 testes unitários + 69 verificações no browser, 0 falhas.** A inspecção (Playwright,
só Chromium) corre as cinco larguras do aceite, mede contraste de texto **e de indicadores
de estado** no DOM, e prova a armadilha de foco e o regresso ao accionador. Entrou na CI.

**O que a 1ª revisão apanhou, e como ficou.** O sublinhado do separador activo estava
pintado com o Coral Bossa a 2,77:1 sobre a areia — indicador de estado, precisamente o uso
que o meu próprio aviso dizia não poder acontecer. Duas correcções: `acentoSinal`
(`#D85A44`, 3,50 / 3,30 / 3,84 nas três superfícies claras) mais um segundo sinal que não é
cor (peso 700 contra 600); e `acento.test.ts`, uma guarda de **lista de permissão** que
reprova o acento em qualquer papel visual sem justificação escrita, provada com seis
plantações. A segunda plantação apanhou um buraco na própria guarda — uma pseudo-classe
partia o leitor de propriedades — que sem o controlo negativo teria sido entregue.

A lição que fica: **um aviso diz, não impede.** Uma regra sem detector é uma intenção.

Três achados que mudaram código, dos nove em `E02.md`:

- **A minha regra de contraste reprovava a paleta da própria BossaOS.** O Coral Bossa
  sobre a areia dá 2,77 — está publicado no manual. Passou a aviso: a WCAG pede 3:1 a
  gráficos que carregam informação, não a decoração editorial.
- **As fichas de cor do E01 estavam escritas de memória** e seis das oito estavam erradas.
  Há agora um teste que compara o CSS com o TypeScript token a token.
- **CSS que nenhum componente rende não dá erro nenhum** — a barra inferior do telemóvel
  estava escrita e invisível. Escrevi a guarda que apanha classes órfãs e provei-a.

**A comparação com o atlas rendeu quatro correcções** e uma divergência mantida de
propósito (a acção repetida no topo só existe acima de 768 px, como o atlas móvel).

## E03 — o que existe agora

Seis tabelas (`organizations`, `brands`, `locations`, `users`, `memberships`,
`role_assignments`) com **referências compostas** — a base recusa apontar para a unidade de
outra organização — e políticas de linha com `USING` **e** `WITH CHECK`.

**A prova está a 0 falhas, e o controlo negativo funciona**: desligadas as políticas, os
casos 2 e 3 ficam vermelhos e o caso 3 passa a ver as duas marcas. `./scripts/provar-isolamento.sh`,
com o papel real de runtime (`rolsuper=false`, `rolbypassrls=false`, confirmado no arranque)
e também pelo Prisma, porque uma política certa com um ajudante errado vaza na mesma.

O contexto não é convenção, é **tipo**: `comEscopo()` é o único sítio que fabrica um
`ClienteComEscopo` e os repositórios só aceitam esse — passar o `PrismaClient` solto não
compila. Provado enfraquecendo o tipo e vendo o `tsc` ficar vermelho.

**85 testes unitários + 28 asserções de isolamento, 0 falhas.** `coverage.csv` **não mexeu**,
que é o correcto numa etapa sem telas, e há uma verificação no fim do varrimento que o diz.

**A CI já correu e está verde** (commit `ff48eb4`, máquina limpa, base do zero, 3m10, com o
passo do isolamento). A pendência que arrastei do E01 ao E03 deixou de ser verdade.

**O que a 1ª revisão apanhou:** o `provar-isolamento.sh` olhava para o código de saída e
imprimia as contagens sem nunca exigir que fossem maiores que zero — num Node cujo relator
é `spec` e não TAP, dizia "0 grupos verdes" **em verde**. Fechado com três coisas: o passo
1 exige 7 grupos e 28 asserções, o formato passa a ser pedido explicitamente (e a versão do
Node verificada à cabeça), e há um controlo negativo do próprio controlo negativo com cinco
verificações. A mesma guarda foi aplicada às outras duas provas, que contavam falhas e não
verificações.

Três achados que mudaram código, dos seis em `E03.md`:

- **Depois do COMMIT o contexto volta a cadeia VAZIA, não a NULL** — e `''::uuid` rebenta.
  O `NULLIF` que eu tinha posto por precaução é o que impede um erro duro em todas as
  consultas seguintes de uma ligação de pool já usada.
- **O controlo negativo corrompeu as fixtures**: com a política desligada, as escritas
  passaram e moveram a marca de A para B. Causa de fundo: um `assert.rejects` que falha
  **atira**, e o `ROLLBACK` da linha seguinte nunca corre — a transacção fica aberta e um
  `COMMIT` posterior grava o que o teste provava não poder acontecer.
- **A guarda de rotas apanhou a raiz de composição** e, ao declará-la como excepção, mostrou
  a porta lateral que ela abria: qualquer rota podia importar o `obterBase` dela.

## E04 — o que existe agora

Acesso real. Entrar, sair, recuperar, segundo factor, convites de uso único, permissões por
acção e escopo, revogação que **faz parar as sessões que já existem**, e auditoria
append-only. **12 telas**, e é a segunda etapa a mexer no `coverage.csv`.

**O quarto acesso do CT-04 existe:** um papel `bossaos_auth` que vê identidades e sessões e
**não vê uma linha de inquilino**. Medido nos dois sentidos. E fechou uma armadilha do E01 —
o `ALTER DEFAULT PRIVILEGES` fazia as tabelas de sessão nascerem legíveis pelo runtime.

**O par (1)/(2) está provado por HTTP**, com sessões reais: o identificador de B com sessão
de A dá 404; o **mesmo** com sessão de B dá 200. A ausência de um recurso alheio e a de uma
organização inexistente saem **byte a byte iguais**.

**91 testes unitários + 24 asserções de acesso + 4 de fuso, 0 falhas.**

O achado que mais me interessa: **o Prisma lia o relógio duas horas adiantado** e por isso
um convite expirado era aceite. Não era defeito dos convites — seria de todos os prazos,
reservas e turnos. `-c timezone=UTC` nas ligações, com prova e controlo negativo próprios.

E o controlo negativo do acesso **falhou à primeira, e isso foi informação**: desligar a
resolução de contexto não colapsou o par, porque a política de linha do E03 aguentou. Para
o colapsar foi preciso acrescentar uma política de leitura a mais — que é precisamente o
risco do OR entre permissivas que a revisão do E03 foi verificar.

## Divisão de trabalho

O pacote foi desenhado para duas cabeças: quem constrói e quem confere não são a mesma.
O Matheus deu-nos as duas a 03/09.

| Quem | Papel |
| --- | --- |
| **Lúmen** (este terminal) | E00; revisões E11, E21 e E34; contrato, ADRs e decisões; fecho de cada etapa com prova. |
| **Lúmen JR** | Implementação das etapas Codex (E01-E10, E12-E20, E22-E33, E35), uma de cada vez. |

Regra que não se dobra: **quem implementa não assina a própria revisão.** Foi por não
haver isto que o Norte passou uma noite inteira com defeitos que só um conselho externo
viu.

## Decisões já tomadas (ver ADR 0001)

- ORM **Prisma**, não Drizzle. Motivo verificado no registo npm.
- Next.js **16.3.4** (LTS activo). Better Auth **1.7.2**.
- As duas logos são definitivas; D01 do pacote foi corrigido.
- Token de interface `#F5664D`; arte da logo fica `#FB4C39`. Medido por contraste.

## E01 — o que existe agora

Workspace pnpm a correr: `apps/web` (Next 16.3.4, App Router, runtime Node),
`apps/worker`, e os pacotes `config`, `db`, `domain`, `storage`, `ui`.
`pnpm verificar` (lint + tipos + testes + build) sai a 0. **16 testes, 0 falhas.**

Duas provas executáveis que um build verde não dá, ambas na CI:

- `./scripts/provar-separacao-de-credenciais.sh` — o runtime **não** altera o
  schema. O detector foi testado a valer: concedido o privilégio de propósito,
  ficou vermelho; revertido, verde.
- `./scripts/provar-prontidao.sh` — `/api/ready` distingue por HTTP `pronto`,
  `schema_por_migrar` (503) e `base_indisponivel` (503), com `/api/health` a
  responder 200 nos três. CT-03 provado no caminho, não na peça.

**A CI já correu, e passa** (verde a 2026-09-03, 17 passos, 3m03) — o ficheiro é válido e os comandos correm todos
localmente, mas só o primeiro *push* prova. É a primeira coisa a olhar.

Achado que mudou o desenho: **Prisma 7 tirou a URL do schema.** As migrações
lêem `prisma.config.ts`, o runtime recebe a sua por adaptador. A separação de
credenciais deixou de depender de disciplina e passou a viver em dois sítios
incomunicáveis do código.

## Dependências externas por resolver

- SVG das logos (não bloqueia; PNG serve para começar).
- Domínio próprio — `bossaos.mwdeveloper.tech` é o staging, apontado ao VPS da ilora.
- Fornecedor fiscal, pagamento e hardware: por etapa, conforme CT-19.
- **Mailpit** instalado, **não** registado como serviço (RAM desta máquina).
  Corre à mão: `pnpm dev:mail`. Nenhum código de e-mail existe ainda.
- **Better Auth** fixado no ADR mas ainda não instalado — entra na etapa que o usa.
- **Docker não usado**, por decisão: Postgres nativo do Homebrew.
- **Conflito de contrato por resolver (não é do JR):** o CT-03 continua a dizer
  "Drizzle ORM" enquanto o ADR 0001 diz Prisma. Implementado em Prisma, como
  mandado. O texto do contrato devia ser corrigido por quem o assina.
- **Família de ícones** (manual p. 18): não existe. Reproduzi só o glifo de 2×2 pontos que
  o atlas desenha na navegação; inventar um conjunto agora seria trabalho para deitar fora.
- **KDS à distância real de uso:** verificação humana num ecrã de cozinha, por fazer.
- **`eslint-plugin-import` pede `eslint ^9`** e temos a 10.9.1 — aviso de par não
  satisfeito. O lint corre e apanha erros (provado plantando uma violação).
- **Playwright só com Chromium:** diferenças de composição no WebKit e no Firefox não
  estão a ser vistas.
