# HANDOFF — estado do motor BossaOS

**Etapa atual:** E02 — design system, responsividade e idiomas
**Estado:** segunda declaração do JR, **aguardando validação do sénior**.
**Próxima ação:** o sénior revalida o E02. A primeira revisão
(`docs/reviews/E02.md`) não o validou: um defeito medido e uma guarda em falta. Os dois
estão fechados — ver "Segunda declaração" em `docs/progress/E02.md`. O JR **não** avançou
para E03.

| Etapa | Estado |
| --- | --- |
| E00 — contrato e leitura das fontes | implementado, **aguardando validação**. Sete documentos em `docs/architecture`. Quem os escreveu não os valida: a prova vem no E11, quando se vir se o E02-E10 se construíram a partir deles. |
| E01 — repositório e verificação contínua | **validado** · `docs/reviews/E01.md` |
| E02 — design system, responsividade e idiomas | 1ª revisão: **não validado** (`docs/reviews/E02.md`). Corrigido; segunda declaração, aguardando validação · `docs/progress/E02.md` |

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

**A CI nunca correu** — o ficheiro é válido e os comandos correm todos
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
