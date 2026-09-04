# HANDOFF — estado do motor BossaOS

**Etapa atual:** E17 — Pedido por QR e atendimento do cliente (**16 telas**).
**Estado:** **IMPLEMENTADO, AGUARDANDO VALIDAÇÃO.** Declarado pelo JR; não
assinado — ninguém assina a revisão do próprio código.
**Régua:** `docs/reviews/ALVO-E17.md` — não chegou antes da entrega. Construído
contra o contrato, e a entrega mede os quatro controlos que ele numera.
**Contratos que mandam:** `qr-da-mesa-e-o-visitante.md` (escrito para esta etapa:
**rodar não é revogar**) e `autenticacao-e-convites.md` (escopo do convidado).
**Detalhe e achados:** `docs/progress/E17.md`.

**Segunda entrega, depois de RETIDO pelo sénior no ponto 4** — «chamar equipa e
pedir conta com limites de frequência, deduplicação e confirmação de
atendimento». As três faltavam: o ramo `chamar`/`conta` registava e devolvia.

**Limite e deduplicação são a MESMA janela**, vista de dois lados, e a janela é
por **MESA**, não por telemóvel — uma fotografia do QR abre telemóveis sem conta,
e um limite por aparelho não limita nada. Vive na porta `chamar_a_sala`, em
plpgsql com `FOR UPDATE`, porque um limite em memória do processo não é um
limite. A confirmação fecha o ciclo: quem chamou vê **três respostas
distintas** — «avisámos agora», «já tínhamos avisado», «alguém vem a caminho» — e
a sala atende no STAFF-013. Sem a terceira, quem chamou volta a carregar.

O par que a régua pedia está provado: duas chamadas seguidas dão uma, **e** uma
chamada legítima depois da janela passa. Sem a segunda metade, «ignora tudo»
passaria o teste.

**O que está pronto para medir** — códigos de saída lidos directamente, sem canos:
`pnpm verificar` (**0**) · `./scripts/provar-visitante.sh` (5 grupos, **21 casos,
9 defeitos plantados**, 0) · `./scripts/provar-visitante-no-navegador.sh` (**22
casos, 8 defeitos plantados**, 0) · `provar-pedidos.sh` · `provar-producao.sh` ·
`provar-migracoes-do-zero.sh`.

**A regra do contrato está na FORMA:** `guest_sessions` **não guarda a geração do
QR**. Sem esse campo, a comparação que faria a rotação expulsar gente da mesa não
tem o que comparar — é preciso uma migração para a escrever, e uma migração é
revista. Três portas estreitas encerram o resto: `visitante_activo` (activa **e**
mesa por fechar), `mesa_do_qr` (só devolve linha com sessão de mesa ABERTA — é
aqui que a fotografia do QR perde valor) e `abrir_visitante`.

**E a separação vive também no ECRÃ.** O QR-005 tem dois formulários, com
palavras diferentes, e o número das sessões que caem **antes** de confirmar. Um
botão só teria a regra da base certa e o produto errado — e quem decide nunca
saberia que havia duas coisas.

**O controlo obrigatório verifica também o que NÃO devia cair.** Plantar o
colapso faz cair o caso da rotação; se fizesse cair o da revogação, o detector
estaria a medir «alguma coisa parou» em vez da distinção entre os dois actos.

**Um defeito real do produto, que só o navegador viu.** A bolacha do visitante
tinha `path=/r/<slug>` e a porta estava em `/api/publico/mesa`: o navegador nunca
a enviava, e **todos** os POST do visitante caíam em silêncio no
`?sessao=terminou`. A porta mudou-se para dentro do endereço do restaurante. Não
alarguei a bolacha para `/`, que era mais barato e mandaria a credencial da mesa
5 para os outros restaurantes do mesmo domínio. Preso pelo controlo 8.

**E declaro um erro meu de método:** no comité em que declarei o E17 escrevi
«`pnpm verificar` — 0 falhas», e era falso. Corri-o com `| grep` e perdi o código
de saída; a guarda `rotas-com-porta.test.ts` estava vermelha desde antes da
declaração. É a armadilha que o `RETOMAR-JR.md` nomeia. Todas as medições acima
foram refeitas a ler `$?`.

**Dois achados meus:** um controlo negativo derrubava o grupo inteiro, porque a
primeira rotação é o que dá segredo à mesa — um defeito que derruba tudo não
prova que a asserção certa funciona. E o arnês quase teve um falso verde: sem a
bolacha do visitante, as sete telas da visita redireccionam para o STATE-009, e a
asserção do **caminho final** é a única coisa que separa medir a tela de medir o
desvio. O controlo 7 planta essa cegueira.

**Fica declarado como NÃO feito:** as opções do prato no MENU-006 (o catálogo tem
grupos de opções desde o E07; ligá-los ao pedido do visitante não está em
contrato nenhum, e não invento a regra), uma fila de avisos por estação, e a
leitura do QR em aparelho real — verificação humana declarada desde o E09.

**O E16 ficou VALIDADO** a 04/09 no commit `69fe63b` — 20 telas, prova **local**,
com **17 controlos negativos** entre as duas provas. Detalhe em `docs/reviews/E16.md`.

**O E15 ficou VALIDADO** a 04/09 no commit `4ffc913` — 23 telas, prova **local**.
Leva uma correcção de uma linha: o marcador `[data-tela]` por tela não consegue
falhar, porque a navegação escreve o id das 19 secções em todas as páginas.
Ancorar ao cabeçalho (`h1[data-tela=...]`). Detalhe em `docs/reviews/E15.md`.

**A prova foi LOCAL.** A CI continua trancada por facturação do GitHub, e nada
desta etapa correu lá. Quem validar escreve isso.

**O que está pronto para medir:**
`pnpm verificar` (0 falhas) · `./scripts/provar-fila.sh` (11 grupos, 24 casos,
10 defeitos plantados) · `./scripts/provar-staff-no-navegador.sh` (26 casos, 5
defeitos plantados no artefacto real) · `pnpm inspeccionar` (398 casos verdes).

**Três defeitos que só a prova de navegador viu**, e estão escritos no E15.md: as
suspensas eram sempre zero no produto, o índice do STAFF-022 tinha alvos de
22 px, e a recusa de pagamento não olhava à rede — com o caso de prova a dar
verde com a rede **ligada**. Mais um na guarda `validar-classes.sh`, que não lia
`apps/web/src/` desde o E02.

**O E14 ficou VALIDADO** a 04/09 — 18 telas, e a prova foi **local**, porque a CI
está trancada por facturação do GitHub. O resto deste ficheiro é o contexto do
E14 e continua a valer: o que mudou foi a etapa, não o que ali está escrito.

**Dezoito e não vinte:** a matriz tem 18 com `etapa_principal = E14`; as outras 3
que a autorização menciona (CAT-010, CHAN-001, FLOOR-008) estão em
`etapas_relacionadas` — telas anteriores a rever, já validadas.

**Os três aceites são três formas de duas escritas se encontrarem**, e as
garantias estão na FORMA:
1. `order_submissions.command_id` **único na base** — o reenvio depois do commit
   devolve a MESMA resposta. O par: duas chaves diferentes criam dois pedidos.
2. As linhas são **acrescentadas**, nunca reescritas em bloco — o padrão que perde
   trabalho não tem por onde acontecer. A versão optimista é só para as edições, e
   o conflito é **recuperável**: diz o que mudou, por quem, e devolve as linhas.
3. O preço é **copiado** para a linha ao ser aceite, com um **gatilho** na base a
   recusar alterá-lo. O esgotado é rejeitado **com o carrinho preservado**.

**A pergunta de dinheiro está RESPONDIDA:** um pedido escrito offline e aceite
mais tarde vale o **preço do servidor ao aceitar** — porque o preço do cliente é
uma proposta, e o E14 proíbe pelo nome que ele mande. E a divergência **não é
aplicada em silêncio**: a linha é rejeitada com `PRECO_DIVERGENTE` e o carrinho
fica, para quem está à mesa decidir. Fica **por decidir e declarado** se o
restaurante quer honrar o preço antigo — isso é política comercial do dono.

**Combos:** a conta soma **uma** vez, em três portas que falham por motivos
diferentes (restrição na base, `totalDoPedido`, filtro dos relatórios).

**Comandos do E14:** `./scripts/provar-pedidos.sh` (3 grupos, 21 casos, 8 defeitos
plantados) e `pnpm exec playwright test pedidos.spec.ts` (18 telas, 5 larguras).

---

## O que fechou antes

**E13 VALIDADO à 2ª** — 17 telas. `docs/progress/E13.md`.

**E11 — MARCO DO STARTER APROVADO à 2ª.** Reprovado à 1ª com seis falhas, todas de
medição e duas de assinatura minha. Fechadas e **reprovadas por comando**:
`scripts/provar-marco-e11.sh` responde às seis pelo nome. `docs/reviews/E11.md`.

**E10 VALIDADO à primeira** — 04/09. 29 telas. `provar-sites.sh` com 11 passos, 27
casos e **8 controlos negativos**, incluindo o `catch` largo que esconde falha real
de gravação e a **regra preguiçosa** dos domínios. O revisor correu ele próprio os
**254 casos de navegador** em vez de aceitar a declaração. `docs/progress/E10.md`.

**Dívida de móvel do E09: PAGA.** As 5 telas que tinham a assinatura retirada por
nunca terem sido renderizadas foram medidas no navegador e a assinatura foi
restaurada. Era a condição bloqueante do marco.

**E09 VALIDADO à 2ª** — 04/09. Retido por uma medição que via uma só forma de exportar um
verbo; fechado com detector largo, e os **três ataques independentes do sénior** (sem
espaços, `export { h as POST }`, `satisfies`) apanhados. E a regra nova do contrato: o
endereço público não volta ao mundo, com o par que o distingue da regra preguiçosa.
`docs/progress/E09.md`. **Pendência declarada:** as 11 telas sem prova de móvel.

**E08 validado à 2ª** — retido por uma protecção que não conseguia falhar (`redirect:
'manual'` sem um único teste a vigiá-la). `docs/reviews/E08.md`.

**E07 validado à primeira** — a maior das 36 e a terceira seguida a passar sem segunda
volta. `docs/reviews/E07.md`.

**E06 validado à 2ª** — a 1ª validação foi **retirada pela CI**: a cadeia de migrações não
se aplicava do zero, porque uma migração E05 tinha carimbo posterior a uma E06 que dela
dependia. Corrigido renomeando, com `provar-migracoes-do-zero.sh` na CI.

**E05 validado à primeira** — a primeira etapa a passar sem segunda volta.

**E04 validado às 17h45**, à 3ª volta. Reprovado à 1ª (o aceite 3 declarado e não
demonstrado; `packages/auth` a zero sem declaração), retido à 2ª (o registo contradizia-se e
a contagem dizia 91 em vez de 127). Fechado em `370251c`.

**Como o E05 começou antes de ser autorizado, escrito para não ser descoberto por
acidente** — que é o que a regra do `RETOMAR-JR.md` pede:

Entre as 15h21 e as 17h14 o sénior esteve indisponível (sobrecarga do lado do modelo). O
Matheus pediu-me explicitamente para assumir e seguir — *"assume o controle voce agora"*,
*"liga voce o motor e toca ficha no bossa"* — e eu segui, com cinco commits: `f1568fe`,
`3bf1319`, `d0ef2a8`, `adde253` e `1e9b351`. O sénior reviu a atribuição e retirou o tom de
infracção; o que fica, e não depende de culpa, é que **a revisão do E04 teve de medir o
commit `11515f1` em vez da árvore**, porque a árvore passou a ter código de outra etapa.

**O que eu devia ter feito e não fiz:** escrever isto aqui no momento em que decidi, e não
duas horas depois quando o revisor voltou. O trabalho adiantado não é o problema; ele ser
descoberto por acidente é.

Os commits ficaram onde estavam, por decisão do sénior. O E05 foi autorizado às 17h45, com
o `ALVO-E05.md` escrito antes — e com uma declaração de honestidade à cabeça dele, porque
desta vez a régua **não** precedeu todo o código e dizê-lo é o que a mantém útil.

| Etapa | Estado |
| --- | --- |
| E00 — contrato e leitura das fontes | implementado, **aguardando validação**. Sete documentos em `docs/architecture`. Quem os escreveu não os valida: a prova vem no E11, quando se vir se o E02-E10 se construíram a partir deles. |
| E01 — repositório e verificação contínua | **validado** · `docs/reviews/E01.md` |
| E02 — design system, responsividade e idiomas | **validado** à 2ª · `docs/reviews/E02.md`. A 1ª revisão apanhou o acento a pintar um indicador de estado a 2,77:1; corrigido com `acentoSinal` e uma guarda de lista de permissão. |
| E03 — estrutura multi-tenant e isolamento | **validado** à 2ª · `docs/reviews/E03.md`. A 1ª revisão apanhou o verificador a dizer verde com zero medido; corrigido, e a mesma guarda aplicada às outras provas. |
| E04 — autenticação, convites e permissões | **validado à 3ª** · `docs/reviews/E04.md` |
| E05 — planos, entitlements e identidade Starter | **validado à 1ª** · `docs/reviews/ALVO-E05.md` |
| E06 — onboarding e configuração do restaurante | **validado à 2ª** · `docs/progress/E06.md`. A 1ª validação foi retirada pela CI: a cadeia de migrações não se aplicava do zero. |
| E07 — catálogo, produtos, preços e opções | **validado à 1ª** · `docs/reviews/E07.md` |
| E08 — média, traduções, importação e publicação | **validado à 2ª** · `docs/reviews/E08.md` |
| E09 — carta pública e QR de consulta | implementado, **aguardando validação** · `docs/progress/E09.md`. As cinco telas internas da dívida de móvel saíram pagas no E10. |
| E10 — sites dos restaurantes e landing | implementado, **aguardando validação** · `docs/progress/E10.md`. 29 telas, medidas em cinco larguras. |

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

**127 asserções unitárias + 24 de acesso + 13 de recuperação e MFA + 4 de fuso, 0 falhas.**
Por pacote, medido com `./scripts/validar-testes.sh`: domain 38 · ui 37 · i18n 16 ·
config 14 · **auth 12** · db 5 · storage 5, mais o `worker` declarado a zero. A contagem
anterior dizia 91 e não mencionava o `auth` — o pacote que guarda a revogação estava sem
um único teste e saía verde por não haver nada que corresse.

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

## E05 — o que existe agora

**Um motor de entitlements** (`packages/domain/src/capacidades.ts`) com a regra na direcção
certa: **quota por configurar significa NEGADO**, não ilimitado. Três motivos separados onde
um sistema descuidado teria um — `sem_plano` (nunca comprou), `quota_por_configurar`
(comprou, falta o número), `quota_esgotada` (comprou zero, e zero é um número) — porque
`null` lido como infinito oferece o produto inteiro e lido como zero bloqueia quem pagou.

**Três verificações independentes, com três códigos**: plano **402**, autorização **403**,
flag **404**. Um 403 a quem paga manda-o pedir permissões a si próprio.

**O defeito que esta etapa apanhou**: a flag só era consultada se quem chamasse se lembrasse
de a passar, e ninguém se lembrava. A terceira verificação do CT-02 existia no domínio e
**nunca disparava no produto**. Passou a aplicar-se por convenção de nome.

**Um trabalho de fundo a sério** — o `worker` deixou de ser andaime. Efectiva as descidas
agendadas, uma organização por transacção, e não efectiva por cima de operações abertas (o
registo de detectores está vazio porque caixas são E13/E19; o mecanismo está provado com um
detector injectado). A prévia que o ecrã mostra **é a mesma chamada** que o job usa.

**A superfície interna de plataforma**, seis ecrãs que lêem através de inquilinos — a
pergunta que o E03 existe para recusar. Não se desligou a política de linha nem se criou um
quinto papel: funções `SECURITY DEFINER` que devolvem o que cada ecrã mostra e verificam
elas próprias quem chama. `platform_staff` é escrita só pela migração e o runtime nem tem
`SELECT`.

**Controlo interno do piloto**: `scripts/plataforma.mjs`, com a credencial de migração e
tudo auditado, `--motivo` obrigatório. A interface de escrita é E33 — e os ecrãs dizem-no em
vez de terem botões que não fazem nada.

**133 asserções unitárias, 0 falhas**, e **nenhum pacote declarado a zero** pela primeira
vez. `pnpm verificar` a 0 **sem `.env`**.

Duas guardas ganharam defeito corrigido: o `validar-cobertura.sh` lia a coluna errada quando
um campo tinha vírgula entre aspas — e o estado real desse ID nunca chegava a ser verificado
—, e faltava um teste que apanhasse `var(--bo-token-que-não-existe)`, que é como se apaga
texto sem nada ficar vermelho.

## E06 — o que existe agora

**Um motor de horários com TRÊS respostas** — aberto, fechado e **desconhecido**. Um sistema
booleano aqui obriga quem chama a escolher entre mentir a dizer que está aberto e mentir a
dizer que está fechado. Um dia sem linha em `schedule_days` está por configurar; um dia com
linha e `fechado = true` está fechado porque alguém o disse.

**20:00→01:00 é um intervalo, guardado 1200→1500.** A consequência — consultar também o dia
anterior — está num sítio só, em vez de um `if (fim < inicio)` espalhado por todo o código
que lê horários. O fuso é o da unidade, com `Intl`, que é o que acerta em Março e Outubro.

**Moeda e fuso deixaram de ser `NOT NULL`**, e nenhum campo novo tem `@default`. Com eles
obrigatórios, quem cria uma unidade é forçado a arranjar um valor — e o valor que se arranja
quando não se sabe é o da unidade anterior. E `CampoPorEscolher` garante que nenhum
`<select>` do produto pode escolher sozinho a primeira opção da lista.

**Criar não duplica.** A chave de idempotência decide-se na restrição única da base, não num
`if` em TypeScript: duas repetições simultâneas leem as duas "não existe" e criam as duas.
A porta `criar_organizacao_com_dono` cria quatro linhas ou nenhuma, e garante que **não se
cria uma organização a que não se pertence**.

**A lista de arranque tem quatro estados**, e `por_medir` não conta como pendente — se
contasse, a lista nunca ficava verde e o aceite 3 era impossível.

Uma prova minha deixou lixo e partiu a prova de isolamento do E03. Corrigido, com uma guarda
no script que faz a sujidade em vez de na prova seguinte.

## E07 — o que existe agora

**A ausência de declaração de alérgeno vale DESCONHECIDO por TIPO, não por convenção.**
`Declaracao.estado` só aceita `CONTEM | PODE_CONTER | NAO_CONTEM`; "não sei" é não haver
linha. E `estadoDoAlergenio` não recebe o nome do produto nem as fotos — **inferir não é
proibido, é impossível de escrever**. A prova cria uma "Tarta de almendra", não declara nada,
e exige `DESCONHECIDO` para amêndoa.

**A tabela `allergens` é só de leitura para o runtime** (`REVOKE ALL` + `GRANT SELECT`): os
catorze são o Anexo II do Reg. (UE) 1169/2011, são lei e não configuração. Provado com um
`INSERT` que devolve *permission denied*.

**Empate de preços recusa.** Duas regras do mesmo nível devolvem `{erro: 'conflito', regras}`
com os identificadores, nunca a primeira que a base devolvesse. **Dinheiro em inteiros de
unidade mínima**, nunca `parseFloat` — medido: 1145 de 20001 valores em euros truncam para o
cêntimo errado, o primeiro é `0,29`.

**Modificadores validados por chamada directa à API**, em JSON, com os limites lidos **da
base** e não do corpo do pedido. Medido em dois níveis: a função, e a **rota por HTTP** com
sessão real — chamar a função mostra que o motor está certo, não que a rota o usa. O caso
que carrega o aceite manda os limites no corpo (`grupos: [{obrigatorio: false, maximo: 3}]`)
e continua a receber 422, porque a rota vai buscá-los à base.

**Três coisas de etapas anteriores que passaram a mentir e foram corrigidas:** o cartão de
uso dizia que o catálogo chegava depois (agora conta produtos), o item `carta` do arranque
estava `por_medir` (agora mede-se), e a razão do item `qr` apontava ao catálogo em vez da
publicação.

**Uma guarda nova, `validar-classes.sh`:** uma classe `bo-` que o CSS não define não dá erro
em lado nenhum. Encontrou quatro escritas por mim no E07 e **uma quinta anterior**, no
componente de separadores.

**E `instanteNaZona`**, o inverso de `momentoLocal` que o E06 não tinha. O meu primeiro teste
dela não media nada — passava nas duas implementações. Varri 2026 de meia em meia hora em
quatro fusos para descobrir **onde** divergem (6 horas em Madrid, 30 em Los Angeles, 42 em
Sydney, 0 em São Paulo), e a medição mostrou um terceiro caso que eu não tinha: a hora que
**não existe** na madrugada em que o relógio adianta. Agora recusa em vez de devolver a mais
próxima.

**134 asserções em `domain` + 19 em `i18n` + 21 na prova do catálogo + 6 por HTTP, 0
falhas.**
`pnpm verificar` a 0 **sem `.env`**; `pnpm inspeccionar` com 69 verificações no browser,
já com as peças do E07 no catálogo interno; `provar-migracoes-do-zero.sh` a aplicar as 13
migrações contra uma base vazia.

**Aviso de custo para o fecho do E07:** o `provar-catalogo.sh` passou a fazer **dois builds**
(o segundo para o controlo negativo da rota correr contra código compilado). Junta-se ao que
o `CI-CUSTO.md` já dizia — a restruturação em trabalhos paralelos ganha mais um argumento.

## E08 — o que existe agora

**A primeira etapa que aceita ficheiros de estranhos**, e as três armadilhas do CT-14 são
todas defeitos que se apresentam como sucesso: um CSV que abre no Excel, um logótipo que
aparece na página, um link que ainda responde.

**Publicar é atómico por construção.** A revisão nasce e o ponteiro troca no mesmo `COMMIT`,
dentro da transacção que o `comEscopo` já abriu. A prova injecta uma falha REAL depois de as
duas escritas e exige que nem uma nem outra tenham ficado — e mede o outro lado, que a
publicação que corre até ao fim troca mesmo o que está no ar. **A revisão é imutável**, e é
a base que o garante: `REVOKE UPDATE, DELETE ON menu_revisions`.

**CSV neutralizado** — e aspas não protegem, e um número negativo não é uma fórmula.
**Buscar por URL tem três portas**: a forma, o endereço resolvido, e `redirect: 'manual'` —
um destino público que responda 302 para `169.254.169.254` passa pelas duas primeiras.
**A terceira não tinha vigia, e foi por isso que o E08 foi retido à primeira:** o sénior
trocou `manual` por `follow` e tudo ficou verde. O código estava certo; era uma protecção
que não conseguia falhar. Fechada com três casos e o controlo negativo 9d.
**O tipo do ficheiro vem dos bytes**, e a recusa vem antes de escrever no armazenamento.

**Nome igual não é chave de identidade**: a estratégia de importação é obrigatória sem valor
por omissão, e não existe no ficheiro nenhum índice por nome.

**A exportação verifica a permissão duas vezes**, com as concessões lidas outra vez no
descarregamento.

**Mexi numa coisa do E07 que já estava validada:** `ProductTranslation.origemVersao` era a
`version` do produto; passou a ser a impressão do TEXTO. A versão avança com o preço, e
marcar a tradução inglesa como obsoleta por causa do preço é um falso positivo — e falsos
positivos ensinam toda a gente a ignorar o aviso. Nenhum código lia a coluna.

**221 asserções no domínio + 35 na prova contra a base, 0 falhas**, com 34 controlos
negativos ao todo. `pnpm verificar` a 0 sem `.env`; `pnpm inspeccionar` com 69 verificações.

**Toquei no `ci.yml`** para acrescentar um passo (`provar-publicacao.sh`) ao trabalho `base`,
depois de a divisão em três estar commitada. Verifiquei a forma dos 41 passos — cada um tem
`run` ou `uses` — mas **não contra o esquema do Actions**, que é o que a régua pede: não há
`pyyaml` nesta máquina. Fica para quem valida.

## Bloqueio externo: a CI está parada por facturação — 04/09

`scripts/validar-ci-verde.sh` vai continuar a dizer PENDENTE, e **não é do
código**. O GitHub escreve o motivo, inteiro, numa anotação do check-run:

> The job was not started because recent account payments have failed or your
> spending limit needs to be increased.

Cinco trabalhos, duas tentativas, zero passos corridos, log nenhum. **Só o
Matheus resolve** (Billing & plans). Até lá:

- **O verde da CI não existe como prova.** Quem validar uma etapa daqui para a
  frente corre a suite localmente e **escreve que foi local** — «validado» sem
  essa nota vai ser lido como confirmado por uma máquina independente, e não é.
- Passei duas vezes ao lado disto: primeiro chamei-lhe *infra-estrutura* (certo,
  mas vago), depois listei três hipóteses quando bastava ler a anotação. A
  guarda passa a lê-la e a imprimir o motivo verdadeiro.

### E fica fechado o item que o JR me deixou sobre o `ci.yml`

Ele escreveu: verificou a forma dos 41 passos, mas **não contra o esquema do
Actions**, por não haver parser nesta máquina. Não é preciso parser — a
autoridade que conta já respondeu: **o GitHub aceitou o ficheiro e agendou os
cinco trabalhos**, com os cinco nomes declarados, verbatim. Um ficheiro
inválido não chega a criar trabalho nenhum.

O que isto **não** prova, e não vale fingir que prova: que cada `uses:` resolve.
Isso só se sabe a correr, e correr é o que a facturação impede. Fica medido até
onde dá, e dito onde pára.

## Metade das provas nunca correu na CI — 04/09

`scripts/validar-provas-na-ci.sh` (nova) mede-o: **25 provas, 12 na CI, 12 sem
decisão nenhuma.** Ficam de fora, entre outras, a `provar-pedidos.sh` (o E14,
validado esta manhã), a `provar-sala.sh` (E13) e a **`provar-marco-e11.sh`, o
marco Starter inteiro**. Uma regressão em qualquer delas não seria apanhada por
máquina nenhuma — só por alguém se lembrar de correr o script à mão.

A causa está escrita no cabeçalho do `provar-tudo.sh`, que já a tinha resolvido
para si próprio: **uma lista escrita à mão deriva.** O `ci.yml` continuou a
listar doze e envelheceu em silêncio, que é o único modo em que estas listas
envelhecem. O mesmo comentário no `ci.yml` regista que sete das treze guardas
`validar-*` também nunca lá corriam. É o mesmo defeito, duas vezes.

**Não corrigi a CI, de propósito.** Acrescentar doze passos a um ficheiro que eu
não consigo executar — a facturação impede — deixava-me sem saber distinguir «o
YAML partiu» de «é a facturação». Perder essa distinção é pior do que a dívida.

**Fica como pendência com cobrador:** a guarda falha enquanto as doze não
estiverem na CI ou declaradas fora com o motivo. Quando a facturação destrancar,
o primeiro trabalho é acrescentá-las e ver a guarda ficar verde.

### E um defeito meu, dentro da guarda que escrevi para isto

A primeira versão fazia `cat` ao `ci.yml` e procurava o nome do ficheiro. Deu
como «corre na CI» o `provar-tudo.sh` — que aparece lá uma vez, **dentro de um
comentário**. A guarda escrita para apanhar provas que ninguém corre dava verde
a uma prova que ninguém corre, porque alguém lhe escreveu o nome num comentário.

É o defeito que ando a caçar o dia inteiro, e desta vez foi meu, escrito dez
minutos depois de eu o nomear no cabeçalho do próprio ficheiro: **vigiar a forma
de escrita em vez da propriedade.** Agora tira os comentários antes de procurar.

## Uma etapa por assinar que não é minha para assinar: o E00

`AGUARDA=1` desde o princípio, e continua. A condição de validação do E00 —
*«ver se o E02-E10 se construíram a partir dele»* — cumpriu-se quando o E11
passou. **Mas os documentos de arquitectura são do sénior, e ele não assina o
que escreveu.**

A prova está junta e medida em `docs/reviews/E00-PROVA-PARA-O-JR.md`: 17
documentos, **15 intactos ao fim de 15 etapas**, 2 emendados, e 3 assuntos que
tiveram de nascer depois. **Quem decide és tu**, e reprovar é uma resposta
válida — se os três em falta forem o E00 a ter prometido mais do que entregou,
diz-se, e não custa nada agora.

Faz isso quando fechares uma etapa e tiveres contexto de sobra, não a meio.

## Dívidas conhecidas à entrada do E16

Nenhuma bloqueia a etapa. Ficam escritas porque uma dívida que só existe na
cabeça de quem a criou desaparece na sessão seguinte.

**1. Metade das provas não corre na CI.** `scripts/validar-provas-na-ci.sh`
mede-o e falha de propósito: 25 provas, 12 na CI. Entre as que ficam de fora
estão a `provar-pedidos.sh` (E14), a `provar-sala.sh` (E13), a `provar-fila.sh` e
a `provar-staff-no-navegador.sh` (E15), e a **`provar-marco-e11.sh`, o marco
Starter inteiro**. **Depende da facturação do GitHub**, que está trancada desde
04/09 e só o Matheus destranca. Vermelho nessa guarda **não é defeito de código**.

**2. A identidade de dispositivo é uma etiqueta escolhida por quem tem sessão.**
Declarada pelo JR no fim do E15. Não é falha do E15 — é o desenho actual, e o
E15 não prometeu mais do que isso. Passa a ser dívida conhecida: qualquer etapa
que faça uma decisão **depender** do dispositivo (e não do operador) tem de a
fechar primeiro, ou está a confiar num nome que o próprio cliente escolhe.

**3. O 404 fantasma do arnês tem causa e não é do produto.** Uma passagem
anterior — viva ou interrompida a chegar ao fecho tarde — apaga as fixtures por
baixo da que está a medir. Basta um `pnpm inspeccionar` esquecido. **Duas
passagens do arnês nunca se sobrepõem**: quem revê corre na `bossaos_revisao` e
na árvore de revisão, não na base de quem escreve.

## Estado das dívidas — varrido a 04/09

Varri as pendências declaradas nas etapas para ver quais já estavam fechadas sem
ninguém o dizer. **Uma pendência resolvida que continua escrita como aberta
confunde tanto como uma esquecida.**

| declarada em | o quê | estado |
| --- | --- | --- |
| E13 | `devices.rascunhos_por_enviar` é `null` até a fila local nascer | **FECHADA no E15.** Verifiquei as duas metades: antes de o aparelho falar o ecrã diz que **não sabe**, depois mostra o número |
| E14 | *«o consumidor do `command_id` é pendência do E16»* | **Fechada no E16 por outro mecanismo**, e ninguém o escreveu — ver abaixo |
| E15 | identidade de dispositivo é etiqueta escolhida por quem tem sessão | **aberta.** Fecha quando alguma etapa fizer uma decisão *depender* do dispositivo |
| E16/E17 | provas novas não correm na CI | **aberta, externa.** Facturação do GitHub |

### O caso do E14, que vale a nota

O E14 entregou ao E16 a metade do consumidor: *«entrega repetível com efeitos
deduplicados»*. O E16 **não** o resolveu com `command_id` — resolveu-o com a
**versão monótona** e o **cursor**, ambos com controlo negativo próprio («a
versão volta a poder retroceder», «o buraco no cursor é ignorado»).

Está cumprido. Mas **eu assinei o E16 sem verificar que a dívida do E14 fechava
ali**, e ele não o declarou. Ficou fechado por acidente de bom desenho, não por
alguém ter conferido — e da próxima vez que isso acontecer pode ficar aberto pelo
mesmo motivo.

**Regra que fica:** ao assinar uma etapa, verificar também as pendências que
etapas anteriores lhe entregaram. Uma dívida passada de etapa em etapa sem
ninguém a marcar é uma dívida que desaparece do radar sem ser paga.
