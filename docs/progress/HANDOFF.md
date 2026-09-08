# HANDOFF — estado do motor BossaOS

**Etapa atual:** CONCLUIDO — as 36 etapas funcionais estão validadas e as 396 telas rastreadas. O trabalho corrente é a **RV100** (`docs/RV100.md`), a reconstrução visual, cujo dossiê está em `docs/visual/rv100/2026-09-06_e953a87/`. **Duas coisas que uma sessão nova tem de saber antes de agir:** o §12.4 diz que só o Matheus pode registar `APROVAÇÃO VISUAL HUMANA` — o Claude emite `PRONTO PARA APROVAÇÃO VISUAL HUMANA` e pára; e há **190+ commits locais por empurrar**, com a CI escura desde 05/09, portanto todo o verde deste repositório é verde **nesta máquina**.
**Estado:** **em revisão.** **35 de 36 etapas validadas**, atlas fechado em **396/396**. O E35 foi **assinado a 06/09** em `d273378` (`docs/reviews/E35.md`) — a última etapa de implementação. Do meu lado não há etapa aberta: o que corre são as **correcções que a revisão do E34 me encaminha**, uma de cada vez.

**Correcção 1, encaminhada e fechada:** o fecho de caixa duplo, em `88f5a62`
(detalhe na secção própria, mais abaixo). Aguarda a verificação do sénior.

> **Duas etapas em voo ao mesmo tempo, com donos diferentes — a primeira vez no
> projecto.** O `estado.sh` deriva a etapa actual como «a primeira que não está
> validada», e por isso diz E34: está certo pela definição dele e não consegue
> dizer que o E35 avançou noutra mão. Fica escrito aqui em vez de se ajustar o
> medidor à resposta — quem chega lê as duas linhas e não vai refazer nem o E34
> nem o E35.

> ## ⚠ AO CHEGAR AOS 100%: PARAR E LER `docs/RV100.md`
>
> Deixado pelo Matheus a 06/09 às 03h20. 841 linhas — reconstrução visual,
> comercial e de usabilidade. O pedido foi **ler o documento inteiro antes de
> tocar em código**. Tem diagnóstico obrigatório e um **portão de aprovação
> humana** nas telas-mestre: há um ponto em que se para e se espera por ele.
>
> **E avisá-lo por push** — nos 100% e quando o RV100 arrancar. Pediu-o antes de
> ir dormir. A ordem e o resto da fila estão em `docs/progress/DEPOIS-DOS-100.md`.
>
> _Reposto a 06/09: a minha reescrita do cabeçalho do E33 apagou este bloco, e a
> `validar-gatilho-rv100.sh` apanhou-o. É a minha própria regra a apanhar-me —
> o que se mexe, repõe-se — e é a segunda vez no mesmo dia._


## O portão antes da Fase 2 — linha de base verde, e cinco plantes eram meus

Três itens, e o `validar-no-commit` fecha a **0 falhas**. Commits `9d2df00`,
`7a520bb` e o dos corredores.

**1 · Os cinco papéis ganharam ficha.** `--bo-sobre-superficie`, `--bo-accao`,
`--bo-sobre-accao`, `--bo-navegacao-activa` e `--bo-foco-contraste`. **A minha
primeira tentativa foi prosa e o teste continuou vermelho:** o `fichas.test.ts`
exige cada `--bo-*` do `:root` na **correspondência** (com valor) ou nas
**derivadas** (a apontar a outra). O do contraste tem valor literal e foi para a
primeira; os outros quatro apontam a outra e foram para as segundas. **Escrever a
razão num comentário não registou nada.** 43/0.

**2 · O acento da linha 1714: justificado, e não trocado.** Medido no
`.bo-mkt__fecho`, que é **verde**: o acento da marca dá **4,71** e o de sinal
3,73. Trocar *piorava* — o rótulo caía abaixo dos 4,5 que texto comum exige. O
token de sinal existe para ganhar sobre a areia; sobre o verde perde. Fica escrito
que **a guarda não sabe distinguir a superfície**: pergunta pelo token e não por
cima de que fundo ele assenta.

**3 · Sete plantes em letra morta, e cinco vieram de mim.**

| plante | porque morreu |
| --- | --- |
| kds, staff, visitante | o `h1 data-tela` mudou de casa quando consolidei o `CabecalhoDePagina` |
| analítica, tpv | a barra lateral que refiz acrescentou `icone` e `grupo` a cada entrada |
| analítica (2.º) | o vazio passou de `<span>` a `<td>` |
| reservas | só a indentação desceu dois espaços |

**Duas alterações minhas mataram cinco controlos negativos ao mesmo tempo, e eu
não corri esta guarda.** Um plante em letra morta não prova nada **e acusa o
produto**: o `exigir_vermelho` corre contra um produto intacto, passa, e o guião
conclui que a asserção é vazia. Todos re-ancorados no sítio onde o texto vive
**agora** — 312 plantes com 7 mortos passaram a **319 com zero**.

**E três vermelhas que o portão destapou por baixo:** o teste das fichas (acima),
dois silenciadores `2>/dev/null` em traps nunca declarados, e **duas suites que
não davam verde nem vermelho** — o `ns2-visual` e o `caminho-da-demo` não eram
nomeados por guião nenhum. Escrevi-lhes corredor e declarei-os no `POR_DESENHO`.

> **Dois enganos meus no caminho, e ambos do mesmo feitio.** Inseri a declaração
> **depois da aspa de fecho** da variável — declarada fora da declaração, e a
> guarda continuou vermelha a dizer a verdade. E os corredores novos chamavam
> **«a suite reprovou»** ao que era *não consegui medir*: num checkout sem build
> acusavam o produto de um defeito que ninguém mediu.

```
validar-no-commit  saída 0
  ok  vê vermelho no de3eb52 e verde no e13b318
  13 NÃO MEDI — as guardas de navegador, declaradas
  ok  todas as guardas verdes sobre o COMMIT, e não só sobre a bancada
  O que se publica está medido: 0 falhas.
```

## North Star v2 — Fase 1 entregue, o sistema mínimo das duas telas-mestre

Fundos e secções, tipografia de display, cabeçalho e rodapé, botões, molduras,
bento, cartões de preço, shell autenticado e a mesa visual com estados. Prefixo
`ns-`: as 396 telas continuam em `bo-` e **nada aqui as toca**. Commit `3929a91`.
**Não é a landing** — essa é a Fase 2.

**Medido na página renderizada** (`/es-ES/interno/ns2`), com a população
declarada, porque a régua proíbe medir no código:

| | |
| --- | --- |
| ritmo | **5 secções, 4 fundos distintos**, herói verde e não areia |
| escala | display **72** a 1440 e **44** a 390; título 48; lead 21 |
| CTA | coral sobre verde **3,73:1**; texto 3,73 com rótulo **grande** (19px/700) |
| bento | 4 áreas, **3 larguras distintas** [773, 379, 379, 1168] |
| mesas | grelha de 6 colunas, 6 mesas, 4 estados, **nenhuma em `<ul>`** |
| shell | barra lateral **248px**, activo com **barra coral** de 3px |

**Sonda:** pintadas todas as secções de areia, a contagem cai a 1 e a guarda
acende. **Regressão:** `validar-classes`, `validar-tres-linguas` e
`validar-superficies` a zero — a última é a que apanharia contraste.

### Os tokens não mudam, e a razão é uma impossibilidade demonstrada

O norte lista coral **`#F5664D`** e o código tem **`#D85A44`**. Não é descuido: o
RV100 escureceu-o para passar 3:1 sobre a areia.

| coral | sobre areia | texto verde-profundo por cima |
| --- | ---: | ---: |
| `#F5664D` (norte/ADR) | 2,77 | 4,71 |
| `#D85A44` (código) | 3,50 | 3,73 |

**Nenhum serve as duas exigências:** para 3:1 sobre areia a luminância tem de ser
**≤ 0,2684**; para 4,5:1 com texto verde, **≥ 0,2795**. Os intervalos não se
tocam — não é escolher melhor. A saída não é um terceiro coral: **é o tamanho do
texto**. A 1.4.3 pede 3:1 para texto grande (≥18,66px negrito), e aí a janela
abre para ≥0,1696, onde o `#D85A44` (0,2233) cabe. O rótulo do CTA é 19px/700
por essa razão medida, e não por gosto.

> **Uma armadilha do arnês, e custou-me tempo.** O ficheiro chamava-se
> `ns2-sistema.spec.ts` e o Playwright **ignorou-o em silêncio**: as expressões
> do `playwright.config` não estão ancoradas, e `/tema\.spec\.ts/` casa com
> «ns2-sis**tema.spec.ts**». Não há erro — o teste apenas não existe. É a mesma
> família do `[idioma]` a ser classe de caracteres: **uma expressão a casar TEXTO
> onde se queria um NOME.** Renomeei para `ns2-visual.spec.ts` e verifiquei que
> não casa com nenhum dos 29 padrões. **Ancorar os padrões é a cura de raiz e
> não a fiz** — mexe na suite de toda a gente e não é desta fase.

**Estado:** Fase 1 entregue e **não aprovada por mim**. A Fase 2 (a landing e a
tela de mesas) só depois da revisão.

## Cada portão diz por onde se re-mede — e cinco nomes mentiam

Dos 17 critérios que não citavam nada: **cinco** re-medem-se por guião, **onze**
são juízo humano e **um** está bloqueado por desenho. Nenhum foi re-medido — o
alvo era dizer por onde. Régua em `docs/reviews/ALVO-PORTOES-CITAM-GUARDA.md`,
commit `d30676e`, tabela em `08_ESTADO_DOS_PORTOES.md`.

| critério | guião | a linha que o diz |
| --- | --- | --- |
| identidade antiga ou paralela | `validar-coral-da-arte.sh` | `o coral da arte não entra em interface` |
| preços da fonte aprovada | `validar-precos.sh` | `3 planos, valores em cêntimos inteiros` |
| SEO e partilha | `validar-seo.sh` | `Metadados por rota: 0 falhas.` |
| tema Starter e limites | `provar-tema.sh` | `caiu a recusa por plano ao guardar` |
| 396 IDs rastreados | `validar-cobertura.sh` | `nenhum ID perdido (396 de 396)` |

**Ressalva declarada:** o `validar-seo.sh` cobre os metadados por rota e **não**
cobre a pendência do `NEXT_PUBLIC_SITE_URL` que o próprio veredicto nomeia.

> **O aviso da régua rendeu cinco armadilhas**, e é a parte que dá valor a isto —
> casar palavras com nomes de ficheiro apanhou cinco candidatos errados:
> `validar-assinaturas` não é assinatura visual (é o estado `validado` de uma
> tela); `juncao-identidade` é identidade de **utilizador**, não de marca;
> `dados-ficticios` é sobre dados fabricados, não promessas na copy;
> `portas-mortas` passa a zero mas **nada na saída fala do rodapé**; e
> `registo-coerente` é sobre etapas, não sobre P1/P2/P3.
>
> **A do coral é a que mais interessa:** a amostra da régua propunha
> `provar-identidades` para «não existe identidade antiga ou paralela», e o certo
> é `validar-coral-da-arte`. O nome acertava na palavra e errava no sujeito.

**Aviso de máquina no início desta entrega:** `mac-health` deu **ATENÇÃO** (4562
MB disponíveis, 109 livres, swap 1,4 GB). Os guiões correram **um de cada vez**,
sem nada em paralelo, e preferiram-se os que não pedem navegador nem build.

## Registo por email fechado — segurança, num domínio público

`emailAndPassword: { enabled: true }` sem `disableSignUp` faz o `better-auth`
1.7.2 registar `POST /api/auth/sign-up/email` **exista ou não uma página**. O
produto é por convite e está escrito no próprio ficheiro: a cura põe o código a
dizer o que ele já declarava. Régua em `docs/reviews/ALVO-REGISTO-ABERTO.md`,
commit `fe64a4b`. Guarda: `scripts/validar-registo-fechado.sh`.

> **O sinal da cura NÃO era o 404 que a régua previa, e isso mediu-se.** O
> `disableSignUp` não desregista a rota — **recusa a operação**:
> `EMAIL_PASSWORD_SIGN_UP_DISABLED`, 400. Uma guarda a exigir 404 ficaria
> vermelha para sempre sobre uma cura que funciona, e a saída fácil seria
> concluir que a cura não pegou e ir procurar outra. O que interessa não é a rota
> desaparecer: é **não se poder criar conta**.

| na mesma corrida | resposta |
| --- | --- |
| rota inventada | **404** — o controlo: 404 significa «não registada» |
| `sign-in/email` | **400** `VALIDATION_ERROR` — uma rota viva responde |
| `sign-up/email` | **400** `EMAIL_PASSWORD_SIGN_UP_DISABLED` |
| convite | `[token]` 404 · `/aceitar` 401 — **vivo** |

**Controlo negativo:** cura desligada → `PASSWORD_TOO_SHORT`, ou seja a rota
aceita registos e só a política de senha a parou; guarda **vermelha, exit 1**.

**E a sonda nunca cria conta:** senha de um carácter — com a cura o
`disableSignUp` responde antes da política, sem ela é a política que recusa.
**131 utilizadores antes e 131 depois.** Uma prova de segurança que precisasse de
criar a conta para saber se podia criá-la seria o próprio defeito a correr.

### A contagem entra na guarda, e destapou que contávamos sujeitos diferentes

As duas notas do sénior — *o 131 é um instantâneo que ninguém re-corre* e *a
sonda é segura por convenção e não por mecanismo* — fecham-se com a mesma linha:
a guarda conta os utilizadores **na própria corrida**. Commit `4c9f488`.

> **E o achado por baixo:** ele viu a base vazia, eu vi 131, e **nenhum dos dois
> contou mal**. Medido: RLS activa em `users`, políticas
> `autenticacao_ve_identidades` e `identidade_propria`, nenhum papel com
> `bypassrls`.
>
> | papel | `users` | porquê |
> | --- | ---: | --- |
> | `bossaos_app` | **0** | só tem `identidade_propria`, e sem identidade não vê nada |
> | `bossaos_migrate` | **131** | dono da tabela, com `relforcerowsecurity=false` |
> | `bossaos_auth` | **131** | tem política própria |
>
> **Isto decidiu o desenho e quase me apanhou:** contar pelo papel do produto
> daria `0 == 0` para sempre — uma guarda incapaz de ver aquilo que guarda,
> verde mesmo que o registo criasse mil contas.

| controlo | resultado |
| --- | --- |
| A · a contagem vê a base | 131 → **132** com uma linha plantada → 131 após apagar |
| B · a guarda recusa | planta entre as duas contagens: **exit 1**, «a PRÓPRIA prova mexeu na população» |

A verificação da contagem vem **antes** do veredicto do registo: se a prova criou
uma conta, o que ela diz sobre o registo deixa de importar, porque ela própria
fez o que veio impedir.

### A consequência: medida, e já não presumida

O sénior escreveu que sem `Membership` era *provável* cair num vazio, e não o
mediu. Mediu-se **sem criar nada**: 125 dos 131 utilizadores desta base já não
têm pertença. Com um deles, pelo `comIdentidade`, sob RLS:

**organizações 0 · filiações 0 · unidades 0 · pedidos 0**

**Âmbito, declarado:** isto mede a **camada de dados** pelo invólucro que o
produto usa. Não percorre todas as superfícies HTTP — uma rota que consultasse
fora do `comIdentidade` não estaria coberta. **A exposição estava provada; a
consequência está agora medida com este limite escrito ao lado.**

## O `sizes` mentia ao navegador — e não eram duas composições, eram quatro

O sénior mediu duas ampliadas e mandou o `sizes` descrever a ranhura verdadeira.
Medi as ranhuras no navegador a várias larguras e o defeito era maior. Commit
`e62b2c0`.

| | antes | depois |
| --- | ---: | ---: |
| `/product` sala e kds a 1440 | **1,49** | 0,99 |
| `/product` sala e kds a 1024 | **1,91** | 0,95 |
| `/product` catálogo a 1024 | **1,27** | 0,95 |
| landing sala e kds a 1024 | **1,04** | 0,87 |
| `/getting-started` tablet a 1024 | **1,16** | 0,87 |
| telemóvel | 0,88 | **0,88** — não regrediu |

O `sizes` é uma promessa: o navegador escolhe o ficheiro por ela **antes** de
saber a largura real, e uma promessa pequena de mais faz-lhe buscar pequeno e
esticar. **Ampliar é o mesmo defeito que encolher, do outro lado.** As ranhuras
medidas ficam como constantes no componente — a ranhura é um facto da composição
da página, e um facto vive num sítio.

**E o `[ ! -d .next ]` passou de acidente a decisão.** Olhava para a raiz com o
build em `apps/web/.next`: nunca encontrava nada e reconstruía sempre. O sénior
concordou em não corrigir o caminho e discordou de deixar como estava — *um
acidente protector é uma armadilha para quem o ler a seguir e o arrumar com a
melhor das intenções*. A condição morta saiu e a decisão ficou escrita.

### A `carta-movel` a 1,65 — FECHADA, e o defeito era a medição

Seguindo a direcção do sénior — *parar de olhar para o `srcset` e medir os bytes
que saem do optimizador* — o alvo caiu do lado do instrumento e não do produto.

| o que se mediu | resultado |
| --- | --- |
| o ficheiro no disco | **390×844** |
| os bytes que o navegador recebeu, chunk `VP8` | **390×844** |
| esses mesmos bytes no decodificador do navegador, sem página | **390×844** |
| o mesmo `currentSrc` recarregado **dentro da própria página** | **390×844** |
| os píxeis renderizados, olhados | **nítidos**, 390 de largura |
| `naturalWidth` do elemento | **237×514** |

**Cinco medições contra uma.** O visitante vê a carta nítida; o `237×514` é uma
leitura do `naturalWidth` naquele elemento que contradiz tudo o que está a
montante, **incluindo um carregamento novo do mesmo URL na mesma página**.

**NÃO se cura, e é decisão tomada com a regra do sénior:** *se o custo da cura
for maior do que o defeito, diz e não cures*. Aqui não há sequer defeito a
curar — há uma métrica a mentir sobre uma imagem que está bem.

**O que fica como aviso, e é o que interessa para a próxima:** qualquer medição
futura de escala **não pode assentar só no `naturalWidth`**. Foi ele que produziu
1,65 e 1,44 sobre uma imagem correcta, e uma guarda construída em cima dele daria
vermelho para sempre num sítio onde não há nada para consertar.

**O porquê do 237 continua sem explicação, e digo-o em vez de inventar uma.**
Não é escolha de `srcset` (237 não está em nenhuma das escadas do `next/image`),
não é o ficheiro, não é o formato e não é o carregamento — a imagem está
`complete` e no ecrã. Fica por explicar e sem custo associado.

**Aviso operacional do sénior, registado:** o trap do `next-env.d.ts` vive nos
seis guiões, portanto **qualquer build manual continua exposto**. Quem construir
fora deles faz `source` do `next-env-intacto.sh` e arma o trap, ou verifica a
árvore antes de comitar.

## O canário e as capturas de telemóvel — duas curas na mesma família

**O canário, e a minha guarda tinha o mesmo cegamento da irmã.** Comparar
`mtime` dos dois lados diz **verde num clone ou worktree fresco**, onde o git
reescreve tudo agora e os dois lados ficam iguais. Vive em
`scripts/frescura_do_produto.py` — **uma implementação, dois leitores**, e restam
**zero** cópias do canário em bash. Commit `a0ed8ad`.

| controlo | resultado |
| --- | --- |
| worktree fresco, `validar-capturas-de-marketing` | **NÃO MEDI, exit 2** |
| worktree fresco, `validar-provas-frescas` | **NÃO MEDI, exit 2** |

> **E um erro meu no caminho:** corri o controlo do worktree **antes** de
> comitar, e o worktree trouxe a versão comitada do módulo — sem canário. Testei
> o código errado e o resultado era plausível. É a forma do dia, e desta vez o
> sujeito errado era a minha própria alteração.

**No telemóvel não se encolhe uma captura: tira-se outra.** Terceira fotografia
do Matheus, já medida pelo sénior — quatro das cinco composições eram de
secretária e chegavam ao telemóvel a um quarto do tamanho. Commit `7c4cf33`.

| | antes | agora |
| --- | ---: | ---: |
| catálogo / sala | 1440→342, texto a **3,3 px** | 390→342, **12,3 px** |
| KDS | 1280→342, **3,7 px** | 390→342, **12,3 px** |
| tablet | 834→342, **5,7 px** | partilha a estreita da sala |

Três capturas novas tiradas a 390 px nos três idiomas — **24 ao todo**. A
escolha é `<picture>` e não duas `<Image>` escondidas: o navegador descarrega as
duas mesmo com `display:none`, e pagar dois ficheiros para mostrar um seria
curar legibilidade com um defeito de desempenho.

**Medido na página servida**, não no código: o telemóvel recebe
`sala-estreita-390` e `kds-estreito-390`; a secretária continua com
`sala-servico-1440`. Guarda a **24/24**, canário ok, duas sondas acesas, exit 0.

**Levantado e não decidido:** a composição `tablet` partilha a estreita da
`sala` — num telemóvel não há layout de tablet para mostrar, mas em `/product` as
duas aparecem e passam a ser a mesma imagem duas vezes. Escolher outro ecrã é
editorial. **E os pratos em espanhol na captura pt-BR estão certos** — são dados
do inquilino, não texto de interface, e o sénior já os escalou ao Matheus.

## As cinco imagens que um comprador vê — um conjunto por idioma, e uma guarda

Duas fotografias do Matheus a dizer que o domínio ainda está feio, e por trás
delas **dois defeitos que nenhuma guarda nossa via**. Régua escrita antes:
`docs/reviews/ALVO-CAPTURAS-DE-MARKETING.md`. Commit `62ca7ce`.

**Estavam em espanhol em todas as línguas** — e não era o idioma a não propagar:
**não existia mecanismo para propagar**. Um conjunto só de cinco PNG, com
`es-ES` cravado nas cinco rotas e no contexto do navegador. Agora há três
conjuntos, a rota é função do idioma e o contexto segue-a; uma sessão só, com o
`storageState` partilhado por três contextos, porque abrir três entradas batia
no limitador de abuso de propósito.

**E estavam sete horas atrasadas** — imagens das 10:15 com dezasseis commits ao
produto desde então. A `carta-movel` mostrava o campo de busca **cortado**, o
defeito corrigido nesse mesmo dia. A página que vende o produto anunciava o que
se tinha acabado de tirar.

**A guarda era o ponto principal, e a mecânica já existia sem estar apontada
aqui.** A `pagina-de-aprovacao.py` recusa-se a gerar se alguma captura for
anterior à fonte mais nova do produto, e nunca fora apontada às únicas cinco
imagens que um comprador vê. Saiu para `scripts/frescura_do_produto.py` — uma
implementação, dois leitores — e a nova é
`scripts/validar-capturas-de-marketing.sh`.

| prova | resultado |
| --- | --- |
| idioma, medido na **imagem** | **3 somas distintas em 3**, nas cinco composições (antes: iguais) |
| idioma, medido na **página** | landing es-ES serve `kds-cozinha.1u663dbd`, pt-BR serve `.3kanb4m` |
| controlo A · frescura | `touch` numa fonte → **recusa**, exit 1; `mtime` reposto → verde |
| controlo B · idioma | duas línguas com a mesma imagem → **recusa**, nomeando a composição |
| sondas | as duas acendem antes de qualquer veredicto |

> **E uma asserção que eu parti e que me apanhou:** o `provar-demonstracao.sh`
> verificava `"$DESTINO/kds-cozinha-1280.png"`, o caminho plano. Com um conjunto
> por idioma esse ficheiro deixou de existir e ele reprovou — fez o trabalho
> dele. Passou a perguntar pelos **três**: um KDS em espanhol e nenhum em
> português era exactamente o defeito que isto veio fechar.

Não toquei nos preços nem no texto de marketing — os dois títulos trocados na
página de planos ficam na lista do Matheus, como a régua manda.

## O `next-env.d.ts` — um defeito latente, e a defesa era vigilância

O sénior provou a hipótese que tinha deixado em aberto: um build com
`NEXT_DIST_DIR` **reescreve** o `apps/web/next-env.d.ts`, que é **versionado** —
ele contém `import "./.next/types/…"`, um caminho que segue o directório de
build. Seis guiões da casa usam a variável (`provar-mestres` e os cinco
`provar-*-mkt`) e **nenhum o repunha**. Commit `b1cf62b`.

**Nunca disparou, e é isso que o tornava perigoso.** O ficheiro mudou uma vez em
toda a história, quando nasceu. Não disparou por **vigilância** e não por
mecanismo — foi apanhado a olhar para a árvore suja antes de comitar. Uma defesa
que depende de alguém reparar funciona até ao dia em que a pessoa tem pressa.

**Duas decisões de desenho.** A mecânica vive numa peça só,
`scripts/next-env-intacto.sh`, porque seis cópias do mesmo trap eram a
duplicação que fechei hoje no `CabecalhoDePagina`. **Mas a peça não põe o
trap:** expõe `guardar`/`repor` e cada guião arma o seu, porque um `trap … EXIT`
posto lá dentro **substituiria** o de quem a lê — e o `provar-mestres.sh` já tem
um, que mata o servidor. Um trap silencioso a apagar outro seria cura pior do que
a doença. Nele, as duas coisas ficam no mesmo trap, e o guardar acontece cedo,
logo a seguir ao `export`, com um trap interino: morrer entre o `export` e o
arranque do servidor repunha na mesma.

| controlo | resultado |
| --- | --- |
| A · com o trap, `NEXT_DIST_DIR=.next-controlo` | ficheiro **limpo**, aponta `.next` |
| B · o mesmo guião com o trap **desligado** | **sujo**, aponta `.next-controlo` |

> **A primeira tentativa do A não valia nada e não a contei:** deu limpo com o
> guião a morrer em `command not found` — o `timeout` não existe no macOS, erro
> do meu instrumento. Verde sobre população zero. Só depois de o `.next-controlo`
> nascer é que o limpo passou a significar alguma coisa — e mesmo assim é o **B**
> que prova que foi o trap, e não o build a não lhe tocar.

**E o comentário que apontava para a causa errada** ficou corrigido no
`provar-mestres.sh`: ele dizia que o `next-env.d.ts` a oscilar era sintoma do
`.next` partilhado por duas corridas. Não era — acontece com **um processo só**,
e é efeito determinista da variável. Um comentário que aponta para a causa errada
é pior do que nenhum: manda a próxima pessoa procurar concorrência onde há uma
variável de ambiente.

## Superfícies: a guarda media quatro de onze, e o buraco era a população

O sénior encontrou porque é que o CTA da landing escapou: a
`validar-superficies.sh` media **quatro** superfícies e o âmbito dizia quais —
duas do KDS, o login, uma do painel. **A landing não era nenhuma delas.** O
detector nunca falhou; a população dele não incluía o sítio onde o defeito
vivia. Commit `e03e101`.

Entram sete públicas: landing, `/demo`, `/faq`, `/plans`, `/product`, `/trust` e
a carta pública. **Onze**, e o âmbito deixa de ser uma frase escrita à mão — a
lista vem agora da medição, porque foi uma frase verdadeira quando foi escrita
que deixou a landing de fora à vista de todos durante um dia.

**O que a extensão encontrou não foi o que se previa.** O `<textarea>` do
formulário de demonstração não tinha classe nenhuma: branco sobre creme, **1,1:1**
— um controlo sem fronteira visível, no campo que a própria rota descreve como o
único que a pessoa teve de pensar. Os quatro campos ao lado levam
`bo-campo__controlo`.

> **E o CTA da landing NÃO acendeu aqui, que é preciso dizer porque era o
> previsto.** Esta guarda mede texto e controlos contra o fundo; **não mede anéis
> de foco**. O anel do CTA é medido pela `validar-acessibilidade-dinamica.sh` e já
> está curado em `3b186e4` — vermelha contra o CSS publicado, verde com a
> correcção.

**Um vermelho tapava o outro.** Ao alargar, o tecto dos contornos rebentou e
terminou o teste **antes** de imprimir o defeito: o relatório dizia `maus=1` e
não dizia qual. Agora tudo o que se encontra sai antes de qualquer asserção, e a
ordem inverte-se — o defeito primeiro, o tecto depois, que é dívida catalogada.

**O tecto passa a ser por superfície.** O `9` era exactamente a população antiga
(4 no login + 5 no painel). Com onze superfícies, um tecto global só dava duas
saídas más: vermelho para sempre, ou levantado para 17 e a tolerar oito novos
**em qualquer sítio**, incluindo uma regressão no login que ninguém veria. Por
superfície é a forma do inventário do cabeçalho: um **conjunto** e não um total,
porque um total deixa somar de um lado o que se tirou do outro.

| controlo | resultado |
| --- | --- |
| A · desfeita a classe do `<textarea>` | **exit 1**, `DESAPARECE MKT-demo` — a extensão serve |
| B · tecto do `MKT-demo` de 5 para 4 | **exit 1**, `MKT-demo 5/4`, com o total inalterado |

## Deploy PREPARADO e não publicado

`bash scripts/publicar.sh` sem `--autorizado-por` — *preparar não é publicar*.
Pacote de **`7b94eff`**, **2155 ficheiros, nenhum segredo**, portões locais
abertos, e pára na autorização como deve. **A landing continua no ar com o anel
a 1,00:1**: a correcção está comitada e não foi ao ar, e a autorização anterior
do Matheus era para aquele momento e aquele commit.

## Anel de foco — o defeito não era só o do KDS, e está no ar

O sénior mediu na instalação publicada: **anel do KDS a 1,00:1**, a cor do anel
igual à cor do fundo. Peguei nele porque a cura que ele nomeou é o contrato de
superfície. Commit `3b186e4`.

**A causa era estrutural e não cromática.** O anel vivia numa regra
`.bo-inverso :where(…):focus-visible` e o `.bo-kds` tinha entrado só na lista de
**tokens**. Duas listas para a mesma pergunta — *«esta superfície é escura?»* — e
quem acrescenta a terceira não recebe erro nenhum ao esquecer uma.

**Passar o token para o contrato não chegou, e foi a medição que o disse.** Com
`--bo-foco-cor` a creme: conforme sobre a página escura (13,05:1) e **invisível**
sobre os botões de acção, que no KDS são creme, e sobre dois remendos claros
(1,06:1 e 1,10:1). Trocar a cor só mudava quais dos fundos ficavam cegos — uma
cor só assume que sabe o que está por trás dela.

**A cura são duas faixas encostadas, de tom oposto:** `outline` mais uma sombra
logo a seguir. As duas contrastam **entre si** 13,05:1, portanto seja qual for o
fundo uma delas destaca-se. Troca uma suposição por uma garantia.

> **E destapou um defeito vivo na landing.** A guarda pública já estava vermelha
> **no CSS publicado**: os dois CTA do herói levam anel `#102E35` sobre faixa
> `#102E35` — **1,00:1 na página que o comprador vê primeiro**. Confirmei que não
> fui eu, correndo-a contra o CSS do `HEAD`.

**A/B nos dois sentidos, porque ensinei as duas guardas a ler a segunda faixa e a
pergunta passou a ser se consertei o produto ou ceguei a medida:**

| | |
| --- | ---: |
| CSS publicado, prova nova do KDS | **48 falhas** a 1,00:1 em 171 focáveis |
| com a correcção | **0** |
| guarda pública nova + CSS publicado | **vermelha**, exit 1, nomeia «faixa única» |
| guarda pública nova + correcção | verde, exit 0 |

A prova do KDS vive no `kds.spec.ts` **porque corre com sessão** — a
`validar-acessibilidade-dinamica.sh` põe o KDS fora do âmbito de propósito, e era
essa a dívida declarada que cobrou no ar. Suite do KDS **21/21**.

> **Um erro meu no caminho, e é o mesmo de sempre:** medi o anel contra o
> preenchimento do próprio botão. Com `outline-offset` positivo o anel desenha-se
> **fora** da caixa, logo quem está atrás dele é o **pai** — acusei 1,00:1 num
> anel que assenta no fundo escuro e dá 13,05:1. A guarda pública já tinha isto
> certo, com o comentário escrito. O instrumento apontado ao sujeito errado, a
> devolver um número plausível.

**Continua por decidir e não é meu:** o `apps/web/next-env.d.ts` está sujo na
árvore partilhada — é versionado e o Next reescreve-o conforme o `distDir` de
cada corrida (já foi `.next-mao` e `.next-acess`). O próximo `git add -A` comita
um ponteiro que só resolve numa máquina. O conserto normal é ignorá-lo, que é o
que o modelo do Next faz por omissão.

## A guarda do cabeçalho — prevenção, e não propagação

**O sénior travou-me a caminho dos 267 e a razão não é prudência:** converter
esses ecrãs é **propagação**, e o §8.3 do RV100 põe a propagação explicitamente
**depois** da aprovação visual humana. *«Arruma antes de replicar.»* A tarefa
está atrás de um portão que não é nosso.

O que cabe deste lado é impedir a próxima geração do problema:
`scripts/validar-cabecalho-pelo-componente.sh`.

**É uma CATRACA e não um portão.** Uma guarda vermelha nos 267 seria vermelha
desde o primeiro dia, e uma guarda permanentemente vermelha é ignorada — a razão
já estava escrita na `validar-provas-frescas.sh`. A dívida existente vive num
inventário (`docs/progress/cabecalho-por-converter.txt`, 267 entradas) e é aceite
tal como está. **O que a guarda recusa é o ecrã 268.**

**O critério reconciliou-se sozinho com a contagem do revisor:** 269 ficheiros
escrevem `bo-estado__cabecalho` e todos escrevem também a sobrancelha; outros 6
usam só a sobrancelha noutra composição e não duplicam. Menos o próprio
componente, **267** — o número a que ele chegou por outro caminho. O sinal é o
**contentor**, que é o que o componente possui.

**Dois controlos, e o segundo pesa tanto como o primeiro.** (A) ecrã novo
escrito à mão → **exit 1**, com o caminho nomeado. (B) uma conversão simulada →
**exit 0**, reportada como progresso com o `--fixar` numa linha. O (B) existe
porque *uma medida que acusa quem está certo é pior do que medida nenhuma*: quem
converte um ecrã não pode ficar com a guarda vermelha na mão, ou o atrito de
fazer a coisa certa passa a ser maior do que o de a adiar.

> **Uma correcção minha no meio:** li o código de saída do controlo B por
> `PIPESTATUS`, que não existe em zsh, e veio vazio. Era o meu instrumento e não
> a guarda — repetido sem o cano, deu 0.

**Fica em aberto e não é meu** — tudo escalado ao Matheus: o A2 (o caminho
comercial não leva a nenhuma superfície do produto), o «Sin enviar: 0» do Staff,
o verde-lima com duas cores para activo, e um quarto que o sénior viu na captura:
o KDS explica numa frase que o tempo vem do selo do servidor. **É verdadeira e a
decisão está certa, mas é uma tela de parede lida a metros por quem não tem mãos
livres.** Terceira superfície com o mesmo padrão: o produto explica-se dentro de
si próprio, e explicar-se ocupa o lugar de mostrar.

## A lista A1/A2/A3 e os três degraus seguintes — fechados numa passagem

**Regra nova, e o sénior fixou-a por escrito:** *uma lista numerada é
autorização até ao fim dela.* O reparo dele entra em cima do que foi entregue,
nunca antes. Deixei de esperar luz verde entre itens.

**A3 — a reconciliação veio antes da correcção, e era esse o ponto.** Ele contou
**10** botões escritos à mão no caminho comercial, eu contei **14**, e nenhum dos
dois errou: eram populações diferentes. Ele contou em seis ficheiros de rota; eu
nos que a travessia alcança a partir da landing. `10 + demo/thanks 1 + pilot 2 +
privacy 1 = 14`. **Corrigir dez deixava quatro vivos** em páginas que ninguém
tinha visitado, que é como estas dívidas sobrevivem. Os 14 passaram a `Botao`
(274 → 260 no produto), a landing continua a **zero**, e medi no DOM e não na
contagem: os 14 rendem, os 14 navegam, **zero inertes**.

**Staff e KDS — o instrumento foram as telas-mestre, não o código.** Dois
achados da auditoria já não existiam quando fui verificar, e não os contei como
abertos. Ficheiro: `docs/reviews/STAFF-E-KDS-ACHADOS.md`.

> **O achado da ronda: não era um duplicado, era um rótulo que mentia.** A M05
> mostrava «Cocina caliente» no `h1` e na primeira pastilha, e eu ia tratá-lo
> como o duplicado do Staff. **A captura do estado vazio é tirada na estação
> Pase — e a pastilha continuava a dizer «Cocina caliente».** `kdsE16.bilhetes`
> estava traduzido como um nome de estação nas três línguas: **errado em todas
> as estações menos uma.** Numa cozinha com quatro, três liam o nome do vizinho.

Corrigidos: o rótulo (`Tickets`/`Bilhetes`/`Tickets`), a barra a mostrar a
secção onde já se está (a classe que o Staff curou), e um `<p>{n}</p>` que no
vazio era literalmente um «0» a meio de um ecrã escuro. Guarda nova dentro do
`kds.spec.ts`, a medir **por propriedade e não por texto**; sonda acende;
controlo negativo repõe o defeito e dá **25 falhas em 14 telas**; suite 20/20.

**Levantado e não corrigido:** o bloco «Sin enviar: 0» do Staff. A fila offline é
funcionalidade real — o defeito é ocupar meio ecrã para dizer que não há nada. É
decisão de produto, com proposta escrita no ficheiro.

**`CabecalhoDePagina` — o diagnóstico dizia 324 ecrãs sem componente; o código
dizia outra coisa.** Ele não existia, mas existiam `CabecalhoDoKds`,
`CabecalhoDaVisita` e `CabecalhoDoKiosk` — **uma forma, três cópias byte a
byte**. Não era «podia haver um componente partilhado»: era **três sítios para
uma decisão**. Nasceu em `packages/ui`, os 36 ecrãs passaram a usá-lo, as três
cópias foram **apagadas** (não ficaram como aliases), e o do Staff mantém nome
porque faz mais — agora compõe.

| | |
| --- | ---: |
| ecrãs no componente | **55** |
| ecrãs que ainda escrevem o bloco à mão | **273** |

Os 273 são a dívida a sério e ficam por fazer. O que se fechou foi a duplicação
**entre componentes**, que era pior por ser invisível: um ecrã escrito à mão
vê-se; três componentes iguais parecem três decisões. Suites das quatro
superfícies: **72/72**. Commits `3474bf6`, `af4c37c`, `d1cb7e9`.

## Caminho da demonstração — A1 corrigido, A2 e A3 levantados

Terceira etapa da ordem por venda. **Os três achados estão em ficheiro**, e a
razão é uma regra nova que fica: *o que muda uma decisão vai para ficheiro, e a
mensagem serve para dizer que o ficheiro existe*. Eu tinha devolvido os achados
numa resposta de terminal, que chega truncada ao sénior — ele foi procurá-los e
não estavam em lado nenhum. Ficheiro: `docs/reviews/CAMINHO-DA-DEMO-ACHADOS.md`.
Régua: `docs/reviews/ALVO-CAMINHO-DA-DEMO.md`. Commits `b64419a` e `eba5453`.

**A1 — a recusa devolvia um formulário vazio. Corrigido, e a minha primeira
causa estava errada.** Publiquei que era o cookie *percent-encoded*: medi o
frasco do navegador e concluí sobre o que o servidor lê, quando o
`cookies().get()` do Next já devolve descodificado. A causa real, medida no
cabeçalho do 303, é que o `destino()` construía o endereço com
`new URL(pedido.url)` e **o anfitrião mudava no meio** — `127.0.0.1` a responder,
`localhost` no `Location`. São sítios diferentes para o navegador: o
`Set-Cookie` fica num, o GET seguinte vai ao outro, e o cookie nunca é enviado.
**A cura é uma linha** — `Location` relativo — e a página não foi tocada.

> **Alcançável por uma pessoa real, e é isso que lhe dá a severidade:** o padrão
> do servidor exige ponto no domínio e o `type="email"` do navegador aceita
> `joao@gmail`. Quem se esquece do `.com` perdia os cinco campos de uma vez.

**A prova cobre a régua inteira** (`inspeccao/caminho-da-demo.spec.ts`): 15
destinos nas três línguas, destino inventado a 404, e — o que a régua punha
acima de tudo — o POST até ao obrigado **e o registo confirmado por `SELECT` na
`demo_requests`**, porque *agradecer por nada é pior do que um erro*. O runtime
não tem `SELECT` nessa tabela de propósito, portanto a confirmação usa a ligação
de migração só para ler, e a consulta leva controlo próprio: devolve zero para
um endereço nunca submetido.

**Controlo negativo nos dois sentidos, e um terceiro A/B que me corrigiu:**
reposto o redireccionamento absoluto a prova fica vermelha nos cinco campos;
desligada a descodificação que eu tinha acrescentado, **continua verde** — foi
assim que soube que a minha correcção não era a cura, e revi-a em vez de a
deixar lá a somar ruído.

**A2 (média, de negócio) e A3 (baixa, dívida) ficam levantados e não corrigidos.**
O A2 — não haver demonstração para clicar — é decisão comercial e não conserto:
das 30 rotas do percurso, nenhuma aponta para uma superfície do produto, e o
inquilino `bossa-demo` é efémero. **E é ele que prende o ponto 4 da régua**: o
aviso de demonstração não pode aparecer no caminho porque o caminho nunca chega
ao ecrã. Fica em NÃO MEDI, preso ao A2.

## Montra — os quatro itens da régua, FECHADOS pelo sénior a 15h50

A régua está em `docs/reviews/ALVO-MONTRA.md`, escrita **antes** de a entrega
existir. Ordem nova do Matheus: o que um comprador vê antes de falar com alguém
passa à frente do que só quem já comprou vê. Commits `ec194bc` e `93da39b`.

**(1)** O `Botao` passou a aceitar `href` — **um componente, dois elementos**, e
não um `BotaoLigacao` ao lado, que era o defeito a curar e não a cura. A landing
foi a **zero** `className="bo-botao` escrito à mão (283 → 274, as nove eram
dela). A união é discriminada: com `href`, o TypeScript recusa `disabled` e
`aCarregar` — uma ligação desactivada não existe.

**(2)** `publicoE09.buscar` servia **três** fendas e não duas: sugestão do campo,
rótulo do botão e nome da secção de resultados. Duas chaves novas nas três
línguas (`accaoBuscar`, `resultados`). E a guarda em vez da instância:
`scripts/validar-rotulo-em-duas-fendas.sh`, com sonda a acender antes do
veredicto e o âmbito a declarar o que **não** apanha.

**(3) O achado desta ronda, e é a ligação com a (2).** O *placeholder* cortado
não era um campo estreito: era o **botão largo**, que levava a mesma frase de 16
caracteres. Medido nos dois estados — com o rótulo longo o campo tem 133 px
úteis, com «Buscar» tem 213, e o texto precisa de 128. **Um defeito de conteúdo
produzia um defeito de disposição**, e a régua listava-os como itens
independentes. Eram um.

> **E a lição fica, porque a minha medição por números teria dito que passava nos
> dois casos:** 128 ≤ 133 por cinco pixéis. Quem tinha razão era o olho. Cinco
> pixéis de folga num texto renderizado não são folga, e o `measureText` de uma
> lona não resolve a fonte como o campo a resolve. **Foi a captura que decidiu**,
> que é exactamente o que a régua mandava — «medida na captura, não no CSS».

**(4)** `es-ES`/`pt-BR`/`en` passaram a Español/Português/English, cada um na
própria língua e com `lang` no elemento. Vive no **domínio** (`NOME_DO_IDIOMA`) e
não no catálogo de traduções: pô-lo lá dava nove entradas para três factos. E não
é bandeira — uma bandeira é um país.

**Pendência que não é minha:** a `validar-provas-frescas.sh` acusa 39 dos 65
artefactos como anteriores ao produto. As 25 telas-mestre estão frescas (15h39,
depois do commit das 15h37); os 39 são o dossiê `docs/visual/rv100/…/evidence/`.
Recapturá-los precisa do seed da demo e da porta — **recurso partilhado com o
outro implementador**, e não lhe toco sem o sénior dizer.

## Correcção 5 — o varredor ganhou quem o chame, e o `sentar` morto foi apagado

**A pergunta era do sénior e a resposta veio com instrumento que funciona:** o
`git grep -E` com `\b` dava zero para os dois, e **o `git grep` não suporta
`\b`** — o zero era do instrumento. Com `-w`, nove ficheiros e três.

### O varredor: faltava a linha, não faltava o worker

`varrerRetencoesExpiradas` estava escrito, exportado e com teste — e com **zero
chamadas no produto**. O `apps/worker/src/index.ts` já é um ciclo que varre e já
corria o `varrerDescidas`.

**O risco é baixo e sei-o por ler a função, não por supor:** a documentação dela
distingue **higiene de correcção** — a capacidade já fica livre sem ela, porque a
`ocupacaoNoIntervalo` compara `oferta_expira_em` com `now()`. O que ela evita é a
lista de espera encher-se de ofertas mortas no ecrã de quem trabalha a sala. Quem
a escreveu previu a pergunta e deixou lá a razão de a correcção não depender
dela; ponto a favor, e é o que torna esta ligação segura.

**Enumerar sem entrar em casa nenhuma**, na forma do `descidas_devidas()`: a
`unidades_com_retencoes_expiradas()` é `SECURITY DEFINER` e **recusa-se a
responder de dentro de um inquilino** — é isso que impede um restaurante de
perguntar quem mais tem ofertas por expirar. E devolve só as unidades que **têm**
trabalho: num ciclo vazio não se abre transacção nenhuma.

**Provado:** o enumerador encontra a unidade, deixa de a listar depois de varrer
(senão o ciclo seguinte varria a mesma coisa), e **o controlo mostra a recusa de
dentro do inquilino**. `provar-reservas.sh` **0 falhas**, 37 casos.

### O `sentar`: apagado, e não fundido

`reservas.ts:701` estava exportado com **zero chamadores**. A rota tem um ramo
`accao === 'sentar'` que **parece** o chamador e não é: chama `sentarReserva`, do
`host.ts`, que é outra função e não um alias.

**Apagado, não fundido, e o motivo está escrito no que ficou:** era a **metade
perigosa** do `sentarReserva` — mudava o estado sem exigir que a pessoa tivesse
chegado, sem ver se a mesa estava ocupada e **sem abrir a sessão de mesa**.
Exactamente o que o comentário do `sentarReserva` diz que não pode acontecer:
«uma reserva sentada sem mesa aberta, e o mapa da sala a mostrar livre uma mesa
com gente lá». Fundi-lo preservava a armadilha com outro nome — quem fosse
corrigir «a função de sentar» encontrava duas, e a errada era a mais simples.

**O que prova que nada partiu não é o `pnpm verificar` passar** — isso prova que
ninguém o chamava. O que ficou é um caso que exige a **propriedade que ele
violava**: nenhuma reserva chega a `SENTADA` sem sessão de mesa aberta. E o
controlo replica a metade perigosa e exige que a propriedade **caia** — senão a
asserção era vazia. `provar-host.sh` **0 falhas**, 19 casos.


## Correcção 4 — a CI descobre as provas, e a lista de excepções caduca

**O número da revisão estava errado e o sénior corrigiu-o antes de mo mandar**:
um guião não correr não quer dizer que a prova não corra. O `pnpm inspeccionar`
é `playwright test` **sem `--project`**, portanto colhe tudo o que `inspeccao/`
tem e as 22 provas de navegador já corriam. A pergunta certa não é sobre guiões,
é sobre **ficheiros**.

**Medi antes de mexer, e confirma-se:** 13 guiões nomeados, **40** ficheiros
`provas/*.test.ts`, **12 alcançados**, **28 nunca corriam**.

**E o cruzamento é o que dói:** dos sete ficheiros com os casos concorrentes que
dão por provadas as famílias do saldo, das reservas e da deduplicação, **seis**
estavam nos 28 — caixa, contas, pedidos, reservas, sala, sites. Só o onboarding
chegava lá. Os invariantes davam-se por provados e só se provavam quando alguém
os corria à mão. Na mesma lista estavam as provas do dinheiro: caixa, contas,
fiscal, financeiro, portas-do-dinheiro, adquirente, stock.

**A cura é a que a casa já tinha uma secção acima:** `for g in scripts/provar-*.sh`,
como as guardas — foi por isso que as cinco guardas de ontem entraram na CI sem
ninguém tocar em lista nenhuma.

**As excepções passam a viver num ficheiro, com motivo escrito**
(`scripts/provas-fora-da-ci.txt`), lido **pela CI e pela guarda** — antes eram
duas listas com a mesma responsabilidade e nenhuma sabia da outra.

**E caducam.** A `validar-provas-na-ci.sh` reprova uma entrada que nomeia um
guião que já não existe, e uma que diz «corre por nome» quando o workflow já não
a nomeia — que é a forma de uma excepção passar de «corre noutro sítio» a «não
corre em lado nenhum» em silêncio. **Provado nas duas formas**, com a entrada
plantada e reposta.

**De 12 para 39 dos 40 ficheiros**, e as seis famílias concorrentes passam todas
a correr.

**O que NÃO posso afirmar:** a CI está trancada por facturação e **não a corri**.
O que corri foi a mesma descoberta localmente — 32 guiões seleccionados, 38
declarados fora — e as guardas. O passo do workflow está escrito e por medir num
servidor.

**E um achado à parte:** `provas/reserva-publica.test.ts` **não é alcançada por
guião nenhum** — nem pela CI, nem à mão. O `provar-reserva-publica-no-navegador.sh`
corre o *spec* de inspecção, que é outro ficheiro. Não a pus como excepção porque
não há motivo para a excepcionar: há um ficheiro de prova sem corredor.


## Correcção 13 — o rasto do suporte podia não acontecer

**Achado do sénior, na revisão do que eu tinha acabado de escrever.** A primeira
composição do `suporte_le_pedido` juntava a sessão **só** na CTE que escreve o
rasto, e prendia as duas metades com `WHERE (SELECT count(*) FROM rasto) >= 0`.
**Zero é maior ou igual a zero.**

Com um `p_sessao` que não casa com sessão nenhuma, o `INSERT` insere zero linhas,
a condição continua verdadeira, e **a leitura devolve os dados sem deixar rasto**.
Reproduzi-o antes de corrigir, numa réplica com a mesma composição e transacção
revertida: com sessão que existe, dados e 1 rasto; **com sessão inventada, os
mesmos dados e o rasto na mesma 1**.

Não havia fuga — o predicado continuava a guardar a leitura. Havia um acesso que
podia acontecer sem ficar escrito, e um segundo efeito da mesma causa: com uma
sessão válida **de outro agente**, o registo nomeava esse outro, porque o
`staff_user_id` saía da sessão que o chamador escolheu.

**E aquele `WHERE` era pior do que parecia:** uma CTE que escreve corre **sempre
e por inteiro**, seja ou não lida pela consulta principal. A condição nunca teve
função — nem para forçar o `INSERT`, que já corria, nem para acoplar as metades.
Decoração com ar de mecanismo.

**A cura junta as duas metades numa só:** a sessão entra no `lido`, com três
condições — é a sessão indicada, é da organização daquele pedido, e é do agente
que está a chamar. Sem isso não há dados **nem** rasto, porque os dois saem da
mesma linha.

**Medido na réplica, com a contagem em instrução separada** — dentro da mesma
instrução o `count` não vê o próprio `INSERT`, e li-o quase mal: inventada →
nada, 0 rastos; de outro agente → nada, 0 rastos; do próprio → dados, 1 rasto.

**Controlo 1c** novo na J15, medido pelas duas pontas: uma sessão que não existe
não devolve dados **e** a contagem de rastos não mexe.

`provar-jornada.sh` **0 falhas** — 8 jornadas, **59 passos**, 4 elos partidos.


## As três jornadas que faltavam — J08, J12 e J15 — e as OITO numa só corrida

**8 jornadas, 58 passos, 0 falhas**, com os quatro elos partidos a acender, a
árvore limpa e os sete gatilhos do rasto repostos. A régua exige a regressão das
anteriores **na mesma execução**, e é o que este número é.

### J08 — pagamento
Conta que nasce da **carta** (o preço é lido do que o estranho vê, e o que falta
deriva dele), primeira parcela em dinheiro, o fecho recusado enquanto a soma não
fecha, segunda parcela por cartão confirmada pelo **adquirente**, o documento
fiscal, e o fechamento medido como **porta que recusa** e não como campo que
muda. O controlo da armadilha — repetir a mesma parcela — dá `EXCEDE_O_DEVIDO`.

**Refutei metade de um critério, com o motivo:** a régua pedia que uma divisão
cujas parcelas somam menos fosse recusada **na criação**. Não existe objecto
«divisão» neste produto: ela emerge de pagamentos parciais, e uma conta meio paga
é um estado legítimo. O sítio onde o produto recusa a soma que não fecha é o
**fechamento**, com `CONTA_POR_LIQUIDAR` — e é lá que se mede. O sénior aceitou.

**E o sénior apanhou-me o inverso:** o primeiro passo prometia por comentário que
o preço vinha da carta e usava um literal, comparando a conta com o mesmo literal
que lhe tinha passado. Prosa a descrever um mecanismo que o código ao lado não
tem — a forma do dia, agora minha. O preço passou a ser **lido**, e a J12 tinha a
mesma família por baixo: contava `data-teste="produto"`, um marcador que não
existe na carta pública.

### J12 — nova unidade
Concessão anterior, unidade pela porta, endereço público, carta publicada, a
**herança contada** contra a mãe (com a mãe provada não-vazia primeiro), o
override na filha e as **duas cartas republicadas** — sem republicar a mãe, o
controlo passava por ela estar velha e não por o override não lhe pertencer.

**Dois achados do produto, medidos:** quem é convidada para uma unidade **vê a
outra na lista** (`listarUnidades` filtra por `archivedAt` e a RLS é por
organização) mas **não consegue mexer** nela — o isolamento que importa aguenta,
o que falha é o índice mostrar o que a pessoa não pode usar. E o emparelhamento
de dispositivos é acto da **organização**, não da unidade: o que é da unidade é o
**aparelho**, e é isso que a jornada mede.

### J15 — suporte, e o defeito maior do dia
Ticket do cliente, pedido real criado na jornada, agente que é **pessoa**, e as
quatro condições do E33 a apanharem-me uma a uma: faltava a **duração**, faltava
**fechar a sessão anterior**, o índice tinha outro **nome**, e faltava o
**motivo** do fecho. Cada recusa foi uma regra a funcionar.

**O acesso de suporte nunca conseguia ler nada.** A rota corre por
`comIdentidade`, que define só `app.user_id`; a `orders` tinha uma política única
com `organization_id = app_organizacao_actual()`. Sem organização no contexto,
**404 para todos os pedidos de todas as casas** — a funcionalidade inteira
inerte. Ninguém tinha visto porque `provar-plataforma.sh` e
`provas/plataforma.test.ts` têm **zero** referências a `api/plataforma/suporte`:
exercitam o `sessaoAutoriza` por dentro, onde o cliente é dono da tabela.

**Não curei sozinho** — é isolamento entre inquilinos. Propus duas opções, o
sénior mediu e decidiu uma terceira que a casa já tinha escolhido no E33:
**política `FOR SELECT` com predicado próprio**. `suporte_com_concessao_viva(org)`
verifica que esta pessoa tem sessão para aquela organização, não terminada, não
expirada, com âmbito que permita ler; a organização vem **da linha**, nunca do
chamador; e é só leitura. A rota **mantém** a verificação explícita, que é o que
produz o 403 honesto — sem ela, «sem concessão» virava «sem linhas» e lia-se como
404, exactamente o que a régua proíbe confundir com controlo de acesso.

**E a auditoria escreve-se na mesma instrução da leitura.** A `audit_events`
exige organização no contexto para inserir, e aqui não há — de propósito. Como o
E33 fez para a concessão: uma função privilegiada que numa só instrução lê, junta
as linhas e insere o rasto, com a CTE do registo alimentada pela da leitura. **Sem
linha lida não há linha escrita.** A garantia não se perde por ser privilegiada:
chama o **mesmo predicado** da política.

### Dois 500 que eram regras a funcionar
O reenvio do webhook (E23) e a segunda sessão por fechar (E33) saíam como avaria.
Os dois curados: `ON CONFLICT DO NOTHING` num, `SESSAO_JA_VIVA` (422) no outro. E
a distinção que os separa: **as recusas de gatilho vêm na mensagem, as de índice
único vêm no `meta`** — o `String(erro)` traz só «Unique constraint failed».

`provar-jornada.sh` **0 falhas** (8 jornadas, 58 passos, 4 elos) ·
`validar-jornada.sh` **0** · `validar-plantes.sh` **0** ·
`validar-alvos-com-casa.sh` **0** · `validar-rls.sh` **0** · `pnpm verificar` **0**.


## Correcção 10 do E34 — o alvo era de outra casa

**O diagnóstico de origem foi retirado pelo sénior** (a cadeia dos identificadores
que derivam entre semeaduras: o `staff-telas.spec.ts` resolve os alvos num
`beforeAll`, depois do `globalSetup`, e não no topo do módulo). Revi os
identificadores fixos que tinha escrito por causa dele — e confirmei a
retractação por medição: **com os 36 alvos pinados e ZERO a derivar, a `staff`
continuava a falhar.**

**A raiz é o ÂMBITO do alvo.** O `alvos.ts` resolvia `menuId`, `categoryId` e
`productId` com `LIKE 'insp-%'` e `ORDER BY nome` **sem filtro de organização** —
enquanto o `brandId`, o `membershipId` e o `locationId` já filtravam por `ORG_A`.
Metade dos alvos sabia de que casa era e a outra metade não. O produto escolhido
era o `insp-Arroz de sepia y alcachofas`, da organização **B**, e a unidade do
Staff é da **A**: a prova pedia um produto de uma casa dentro de outra, e recebia
404. **O 404 estava certo** — era o isolamento entre inquilinos a funcionar.

**Medido antes de aplicar, e o número é mais apertado do que a lista:** dos 32
alvos com organização verificável, **dois** caíam noutra casa (`categoryId` e
`productId`); o `menuId` calhava certo, com a mesma lotaria. E das nove tabelas
que os alvos consultam por `LIKE`, **só três têm linhas em duas organizações** —
`menus`, `categories`, `products`. As outras seis vivem só na A e não levam
filtro que não precisam.

**Resultado:** a `staff` passa de morta a **31 casos de navegador verdes** (23
telas × 5 larguras, mais toque, contraste, três idiomas e a fila), com dez
controlos negativos a disparar.

### E a correcção 7 apanhou a sua primeira presa sozinha

O único vermelho que sobrou na corrida completa foi *«o plante NÃO APLICOU»*: o
controlo 11 exigia `s.count(cracha) == 7` e o ficheiro tem **oito** — sete nos
`DELETE` e uma na contagem do fecho. **Está a oito há pelo menos oito commits**, e
o plante não aplicava desde então: o `assert` disparava, ninguém lia o código de
saída, e o controlo corria contra um ficheiro intacto. Só apareceu porque a
correcção 7 pôs este guião a passar pelo `plantar()`. Trocado por `>= 7` —
um número exacto apodrece na primeira vez que alguém acrescenta um `DELETE` — e
**verificado à parte: o plante aplica e troca os crachás**.

**Fica dito um limite da `validar-plantes`:** ela mede que a **âncora existe**, e
aqui existia; o que falhava era a **contagem**. Um plante pode estar vivo para a
guarda e morto na corrida.

### O que NÃO está medido

A corrida completa da `staff` **depois** do `>= 7` — a que lancei foi
interrompida a meio (`Terminated: 15`), e o vermelho que ela mostrou no controlo
7 é o sinal, não um defeito: na corrida completa anterior esse controlo está
`ok`. E a `visitante`, que usa o mesmo `productId` no `MENU-006`
(`${publico}/menu/produto/${a.productId}/pedir`) e era uma das que falhavam no
corredor: **provável**, não medido.

**E a interrupção deixou rasto:** o `packages/db/src/dispositivos.ts` ficou com o
plante do controlo 8 aplicado. O `trap restaurar` só corre se o processo puder
correr, e um sinal duro não lhe dá essa hipótese. Reposto do git antes de
qualquer commit.


## Correcção 7 do E34 — os plantes em letra morta, e a guarda que os media

**Fechada, e o número mudou depois de eu medir.** A guarda dizia 19 plantes
mortos; são **três**. Os outros 16 — e mais 25 que ela nem via — eram defeito
dela.

### A guarda cometia o defeito que existe para apanhar, duas vezes

**Primeiro: só lia metade da população.** O padrão era `python3 - <<'TAG'`, e
há **162 blocos** invocados como `plantar <<'TAG'`. Media 172 de 334 e reportava
como se fossem todos — nem os contava, nem os declarava. Agora lê as duas
formas, e o autoteste tem **quatro sondas**: vivo e morto em cada forma. Sem as
duas novas, a versão cega passava o autoteste na mesma.

**Segundo: comparava o texto-fonte da âncora, não o valor.** Um
`antigo = "linha um\nlinha dois"` ficava com uma barra e um `n` **literais**,
que nunca casam com uma quebra de linha do ficheiro: **todo o plante multilinha
era dado por morto**. Medido: dos 44 «mortos», **36 estavam vivos**.

**E terceiro, mais pequeno: media o NOME da variável.** Exigia `antigo`, e
metade dos guiões chama-lhe `alvo` ou `agulha`. Passou a ler a âncora do
`assert ... in s`, com a convenção antiga como recurso — e a ordem importa: pô-la
a substituir em vez de somar fez os legíveis caírem de 310 para 245, e reparei
porque medi outra vez.

**De 172 lidos / 19 mortos / 11 por ler → 320 vivos, ZERO mortos, 12 por ler.**
Os 12 são genuinamente dinâmicos (variáveis de ambiente, JSON carregado, cópias
em `/tmp`) e continuam declarados, não concluídos.

### Os três mortos a sério

**`provar-catalogo.sh` — e era o pior.** Plantava em `fichaDeAlergenios`, onde a
regra estava escrita **duas vezes**; o E34 tirou a cópia e a ficha passou a
chamar `estadoDoAlergenio`. O plante ficou em letra morta e o guião passou a
**acusar o produto** do defeito mais perigoso deste projecto — um alérgeno não
declarado a ler-se como «não contém» — sem nunca o ter plantado. Re-ancorado ao
**único** sítio onde a regra vive. Medido depois: `provar-catalogo.sh` **0
falhas**, e o controlo acende — *«caiu a asserção dos catorze desconhecidos»*.

**`provar-pedidos.sh`** — o filtro dos componentes de combo mudou de ficheiro
(`relatorios.ts`, na própria consulta). Tirei o plante em vez de o re-ancorar: o
caso que o controlo nomeia é o **CHECK da base**, que ele já derruba.

**`provar-portas.sh`** — ficou **sem matéria-prima**: não existe um único
`porConstruir` no produto (o E30 fechou o do menu de gestão, o E33 os três da
plataforma). Declara em vez de acusar, como a `validar-assinaturas.sh` quando o
atlas fechou. **E fica dito o que isso significa:** a asserção «dizem QUAL
etapa» corre hoje sobre **zero marcadores** — verde sobre população zero, na
prova.

### E o que impede o regresso: 32 guiões passaram a verificar o plante

Os 172 blocos `python3 - <<` não liam o código de saída. Agora todos passam pelo
`plantar()` — se a âncora mudou, a falha é do **guião** e diz-se assim, em vez
de ser atribuída ao produto. Sobraram dois `python3 - <<` no
`provar-marco-e11.sh`, e não são plantes: calculam valores.

### A atribuição das cinco falhas, corrigida com medição

Das cinco que ele ligou aos plantes mortos, **só o catálogo era**. Corri as
outras quatro: **`mensagens` passa** (0 falhas). **`staff`, `tema` e
`visitante` falham no passo 1 — «com tudo ligado», antes de qualquer plante** —
portanto não são acusações falsas: são vermelhos a sério e ficam para ele, que é
quem está a investigar o corredor.

`validar-plantes.sh` **0 falhas** · `provar-catalogo.sh` **0** ·
`provar-mensagens-no-navegador.sh` **0** · `pnpm verificar` **0**.


## Correcção 4 do E34 — a J14 existe, e destapou o webhook a responder 500 ao reenvio

**Fechada.** `provas/jornada.test.ts` passa de 4 jornadas e 27 passos a **5 e
34**. A J14 vive na porta do adquirente — a única do sistema onde alguém de fora
afirma que **dinheiro entrou**, e a única sem sessão: o que autoriza é a
assinatura.

A corrente: descobrir a organização → a porta recusa assinatura forjada **sem
dizer porquê** → conta por cartão **sinalizada** → o adquirente diz `CAPTURADO`,
o facto fica **preservado** e reconciliado na mesma transacção → **reenvia e nada
duplica** → devolve → **reenvia a devolução e o dinheiro que sai não se duplica**.

### O defeito que ela encontrou: o reenvio devolvia 500

**E o reenvio é o caso normal de qualquer adquirente.** O `receberWebhook`
tentava inserir e apanhava o `P2002` em JS — e o comentário que lá estava
avisava: *«fica anotado por ser frágil: no dia em que alguém acrescentar uma
linha aqui, parte sem aviso»*. Alguém acrescentou, **na rota**: depois de
receber, ela lê `membership.findFirst` para reconciliar. O erro do índice
**aborta a transacção**, o `catch` corre mas já não pode ler nada, e a leitura
seguinte rebenta com `25P02`. Resultado medido: **500 com o corpo vazio**.

E um 500 põe o adquirente a martelar a porta — que é, por escrito, o que a rota
diz que quer evitar. Cura: a forma do E24 que o comentário já nomeava,
`ON CONFLICT DO NOTHING` (`createMany` com `skipDuplicates`), que não levanta
excepção e não aborta nada.

**E medi porque é que ninguém tinha visto:** com o defeito reposto,
`provar-adquirente.sh` dá **0 falhas e 21 casos verdes — incluindo o caso do
reenvio**. A prova de segmento chama a função e não corre a linha que vem
depois; a `portas-do-dinheiro` verifica que a rota **menciona** `receberWebhook`,
lendo o ficheiro como texto. A peça estava provada duas vezes e o caminho estava
partido.

### A alavanca aponta à devolução, e isso mudou depois de medir

`REENVIO_COM_IDENTIDADE_NOVA=1` faz o reenvio trazer outro `eventoId` para o
mesmo facto. Na **captura** isso mete um facto a mais no ecrã e não mexe no
dinheiro — o `capturadoMenor` é uma **atribuição**, o último carimbo manda. Na
**devolução** o `devolvidoMenor` é uma **soma** (devoluções parciais acumulam) e
a chave idempotente do reembolso inclui o montante: o devolvido vai de 40,00 a
80,00, a chave muda, e nasce um **segundo reembolso**. É lá que a identidade é a
única defesa, e é lá que a alavanca tem de doer.

A ordem das asserções decide o que a paragem diz: o **dinheiro primeiro**, o
mecanismo a seguir. Com `repetido` antes, a jornada parava a dizer «entrou como
facto novo» — verdade, e o mecanismo; quem lê precisa de saber o que aconteceu ao
dinheiro.

### E a limpeza deixou de poder deixar a base sem protecção

A minha primeira versão desligava uma **lista escrita à mão** de gatilhos e
voltava a ligá-los no fim. A J14 trouxe duas tabelas novas, a limpeza abortou ao
bater na primeira que faltava, e o `ENABLE` **nunca correu**: a base ficou com
cinco gatilhos desligados, e só o passo 8 deu por isso. Duas mudanças: os
gatilhos **descobrem-se na base** (`pg_trigger` sobre as tabelas que a limpeza
toca), e tudo corre dentro de `BEGIN`/`COMMIT` — `DISABLE TRIGGER` é
transaccional, portanto **deixar a base sem protecção deixa de ser possível** em
vez de depender de o guião chegar ao fim. Provou-se sozinho: quando parei a
corrida a meio com um `kill`, a base ficou com **0 gatilhos desligados**.
(`session_replication_role = replica` era mais curto, e o `bossaos_migrate` não
tem permissão — medido.)

### Pendências declaradas: a integração de pagamentos não é configurável hoje

`WEBHOOK_SEGREDO_*` **não está definido em lado nenhum do repositório** — só é
lido na rota. E **nenhum ecrã mostra o `organizationId`** que o webhook tem de
trazer no cabeçalho `x-bossaos-organizacao`: procurei por `name="organizationId"`
e por marcador de teste, e não existe. Quem configura o adquirente não tem onde
ir buscar o valor. O primeiro passo da J14 existe para isto não passar
despercebido, e **apaga-se no dia em que o produto expuser o identificador**.

`provar-jornada.sh` **0 falhas** (5 jornadas, 34 passos, 4 elos partidos, corrido
**sozinho na base**) · `provar-adquirente.sh` **0** · `validar-jornada.sh` **0**
(vê as três alavancas) · `pnpm verificar` **0**.

**Por fazer, da lista dele:** J08, J12 e J15.


## Correcção 3 do E34 — a J09 existe e percorre-se

**Fechada.** `provas/jornada.test.ts` passa de 3 jornadas e 18 passos a **4 e
27**, e a nova é a da caixa: **abrir → vender e o dinheiro entrar na gaveta →
saída com motivo → cartão por reconciliar → contar → o fecho recusar →
reconciliar → ENCERRAR → e fechar outra vez ser recusado**.

Tudo pelas portas que uma pessoa usa, e o estado vem sempre do que o produto
devolveu: o `registerId` do redireccionamento, o `attemptId` do ecrã da conta, e
**o valor a contar lido do ecrã de fecho** — calculá-lo aqui era reimplementar a
regra do lado da prova.

**A alavanca é `SEM_CONTAGEM=1`**, no modelo do `SEM_MOEDA`: tira-se a contagem,
o fecho tem de parar e o motivo tem de **nomear a contagem**.

### Três coisas que a jornada destapou, e que segmento nenhum via

**1. A J01 estava vermelha desde o E33, e ninguém deu por isso.** O gatilho
`rasto_guarda_a_pessoa` exige que uma acção `plataforma.%` diga quem a fez —
`actor_id` e `actor_email` de uma pessoa. O `scripts/plataforma.mjs` assinava
`plataforma:$USER` **sem `actor_id`**, e por isso deixou de escrever:
`rasto_sem_pessoa`. Como é a única porta para dar plano e concessões, **nenhuma
organização nova conseguia ser habilitada** desde então. A cura não é abrandar o
gatilho — é o guião dizer quem opera: `--por <email>` ou `BOSSAOS_OPERADOR`,
resolvido contra `users`, **sem valor por omissão**. E a jornada cria essa pessoa
pela porta do produto, numa conta diferente da do restaurante: uma organização a
assinar a própria concessão é um restaurante a dar-se um plano.

**2. A recusa sem detalhe chegava ao ecrã como «erro».** É a observação que
deixei escrita na correcção 1 e não tinha tocado — agora está paga, porque a
alavanca da J09 a mediu. A rota do TPV traduzia com `/^[A-Z_]+:/`, e uma
`RecusaDaCaixa` sem detalhe escreve `CAIXA_FECHADA` **sem dois pontos**. Caíam
todas no genérico: `SEM_CONTAGEM`, `CAIXA_FECHADA`, `PAGAMENTO_NAO_E_DINHEIRO`.
As recusas **com** detalhe passavam, e por isso ninguém via metade do defeito.

**3. A limpeza da jornada bate na imutabilidade do rasto.** A J09 deixa
acontecimentos de caixa, movimentos, pagamentos e linhas de conta paga — **cinco
gatilhos que recusam `DELETE`, incluindo à credencial de migração**. Desligam-se
e voltam a ligar, e o passo 7 verifica os **seis**, com a contagem primeiro:
zero desligados sobre zero lidos era verde sobre população zero.

### E um achado contra mim

**O meu controlo 11 da caixa era uma moeda ao ar.** As três inserções da sonda
partilham o `criado_em` — `now()` é o instante da **transacção** —, e o gatilho
desempata por `id`, que é um uuid. O controlo alternava entre verde e vermelho
sem ninguém mexer em nada. Passou a escrever a ordem: três corridas seguidas, 0
falhas. **No produto o empate não acontece** (cada acontecimento é uma
transacção), mas fica dito porque é uma propriedade real da leitura do estado.

`provar-jornada.sh` **0 falhas** — 4 jornadas, 27 passos, 3 elos partidos ·
`validar-jornada.sh` **0** (vê as duas alavancas) · `provar-caixa.sh` **0** ·
`pnpm verificar` **0**.

**Por fazer, e é a lista dele:** J08, J12, J14 e J15. Uma de cada vez.


## Correcção 2 do E34 — o pt-BR misturava duas ortografias

**Fechada.** Não era preferência de ninguém: o ficheiro divergia **do próprio
padrão**. Medi antes de mexer e as contagens do sénior confirmam-se —
`activ` 7 contra `ativ` 34, `contacto` 3 contra `contato` 7, `excepç` 1 contra
`exceç` 5.

**Onze chaves, e a minha varredura mais larga não encontrou mais nenhuma.**
Procurei também `óptim`, `acto`, `adopt`, `objecto`, `direc(c|ç)`,
`proje(c|ç)t` — o conjunto fechou exactamente nas onze que ele nomeou.

| depois | |
|---|---|
| `activ` **0** | → `ativ` 41 |
| `contacto` **0** | → `contato` 10 |
| `excepç` **0** | → `exceç` 6 |

**Só valores, nunca nomes de chave.** `staffE15.dispositivosActivos` **é** o nome
da chave e fica como está: as três línguas partilham o conjunto, e um `sed` de
`activ` pelo ficheiro fora teria partido o pt-BR contra os outros dois. Por isso
a troca foi sobre a cadeia inteira de cada valor.

**Confirmado depois:** as **2344 chaves** continuam idênticas nas três línguas, e
o `git diff` toca **um só ficheiro** — `es-ES` e `en` não foram abertos.

**E a sonda da ortografia prova-se a si própria:** zero achados lê-se de duas
maneiras — «está limpo» e «o detector está cego» —, e escrevem-se igual. Com
«Dispositivos activos» replantado, a sonda apanha **1**, e nomeia a chave.

`packages/i18n` **19 casos, 0 falhas** (inclui «os três idiomas têm exactamente
as mesmas chaves») · `pnpm verificar` **0**.

**Fica dito, e não fiz:** nada impede a regressão. A paridade de **chaves** é
guarda; a **ortografia** de cada língua não é medida por ninguém. É uma dúzia de
linhas no `i18n.test.ts` se quiseres — não avancei por ser lista delimitada.


## Correcção 1 do E34, encaminhada a mim — o fecho de caixa duplo

**Fechado.** O `fecharCaixa` lia o estado, fazia cinco validações e só depois
criava o evento — sem tranca. O estado **deriva do último acontecimento**, e
derivar é uma leitura, não uma trava.

**Primeiro escrevi a prova que falha, como mandado.** E ela passou à primeira
tentativa — com o defeito lá. `Promise.allSettled([fechar(), fechar()])` mede
**intenção** de concorrência: abrir uma transacção interactiva é ela própria uma
ida à base, e a primeira acabava antes de a segunda abrir. Um verde por
temporização é pior do que nenhum teste, porque diz que está protegido.

Medi-o com uma sonda à parte: `pid` 54579 e 54580, a segunda transacção aberta
**antes** de a primeira gravar, e **dois eventos FECHO** na mesma caixa, as duas
chamadas bem sucedidas. Com um **encontro** entre as duas transacções (ambas
abertas antes de qualquer uma ler) a corrida passou a ser determinista e a prova
ficou vermelha: `esperado 1, obtido 2`.

**A cura são duas coisas, e medi que não são a mesma dita duas vezes:**

| desligo | o que acontece |
|---------|----------------|
| só a tranca | o dinheiro fica certo (um FECHO) e **o ecrã fica errado**: `PrismaClientKnownRequestError` `23514` em vez de `RecusaDaCaixa` |
| só o gatilho | a prova em TypeScript fica verde — mas a **base** aceita dois FECHOS por SQL directo |
| os dois | dois FECHOS, as duas chamadas bem sucedidas |

Por isso a asserção da prova é sobre a **classe** da recusa e não sobre o texto,
e o controlo do gatilho entra por **SQL**, que é a porta que a tranca não guarda.

**E é um gatilho com tranca, não um índice único:** a caixa reabre com motivo e
um segundo ciclo TEM de poder fechar. O que é único é o fecho **por ciclo**, e o
ciclo não existe como coluna — escrevê-lo seria inventar um número que se deriva.

**Observação que fica, e não lhe toquei:** a rota do TPV traduz recusas com
`/^[A-Z_]+:/`, e uma `RecusaDaCaixa` sem detalhe tem a mensagem `CAIXA_FECHADA`
**sem dois pontos** — não casa, e o operador lê «erro» em vez do motivo. Vale
para todas as recusas de caixa sem detalhe, não só para esta.

`provar-caixa.sh` **0 falhas** (12 secções, os controlos 10 e 11 novos) ·
`validar-concorrencia.sh` **0** · `validar-rls.sh` **0** · `pnpm verificar` **0**.


## E35 — pacote de implantação e piloto (MEU, aguarda validação)

**Contrato** `docs/architecture/implantacao-e-piloto.md` e **régua**
`docs/reviews/ALVO-E35.md`, os dois escritos antes do código. **Zero telas** — é
a única etapa do projecto sem uma tela nova.

**O que muda:** todas as outras construíram o produto; esta constrói o caminho
até ele estar a funcionar numa casa. E é a primeira cujo contrato não foi escrito
por dedução — o sénior escreveu-o **depois de publicar o staging com nove
paragens**. Não há gatilho na base que impeça uma publicação errada: o que há são
**portões que recusam**, e um portão que ninguém prova a recusar é uma linha de
log.

**Os quatro portões** (`scripts/publicar.sh`, decisões em
`packages/domain/src/implantacao.ts` porque uma decisão em `bash` não se testa):
assinatura (`etapasPorValidar`), commit (`arvoreLimpa` + `git archive`, e o que
sobe existe em git porque não há outra maneira de lá chegar), segredos
(`podeSubir`), versão (`versaoQueResponde`, lida da etiqueta `bossaos.versao`
**pelo Docker e não através do produto**). **Preparar não é publicar:** sem
`--autorizado-por` prepara, prova e PARA, e a autorização vai nas palavras de
quem manda.

**Ensaio de restauração medido** a 06/09 06:19 UTC: **0,56 s**, com amostra
verificada (produtos=5, pedidos=9, movimentos=7, 5 gatilhos de stock repostos) —
e o guião **recusa** emitir RPO ou RTO a partir daí.

**Importação a seco que não abre ligação nenhuma**, com a lista de conferência a
sair antes de a casa aceitar, e o alergénio vazio a virar aviso `DESCONHECIDO` e
nunca «não contém».

**`docs/releases/pilot.md` com três estados** — feito, pendente, **não medido** —
e sem uma única célula em branco, medido com sonda negativa.

**⚠ O achado que pesa mais do que a etapa: reescrevi por cima do `publicar.sh`
e apaguei-o.** O ficheiro é do sénior, tinha corrido a sério, e levava a caixa, a
chave, a porta verificada à mão, o `--env-file .env.prod`, os papéis, a migração
e as duas metades do portão 4. O que escrevi era uma demonstração de portões que
**não publicava nada**, e só dei por isso a ler o `git diff` antes de commitar.
Original **reposto do git**, portões acrescentados **dentro** dele. Três coisas
minhas caíram por não caberem, e a que interessa é esta: **a árvore limpa como
portão estava errada** — o sénior não a exige de propósito (dois agentes na mesma
árvore), e a garantia é o `git archive`, não a regra. Ficou como aviso. A
etiqueta que eu tinha inventado não existe: é `bossaos.versao` em `bossaos_web`.

**E o medidor morre exactamente quando isto estiver pronto.** O `estado.sh`
rebenta se não houver etapa por validar; com `pipefail` e `set -e`, matava o
`publicar.sh` **antes da primeira linha de saída** — zero texto, código 1,
indistinguível de um portão a recusar. Apanhou-o a casa de mentira do controlo,
que tem as 36 validadas. Não mexi no medidor: a falha dele passa a **NÃO MEDI** e
o portão fica pela leitura directa da matriz.

**RETENÇÃO DO SÉNIOR PAGA — a regra e os dados nunca se encontravam.** O ponto
8 tinha duas metades que não se tocavam: o controlo contava `## Degrau ` contra
`**Plano de saída` no documento, e o `degrauPodeSubir` corria sobre objectos
inventados (`{nome:"x", saida:null}`). A regra estava certa e nunca via um degrau
verdadeiro. Ele mediu-o: esvaziou o plano do último degrau **deixando o cabeçalho
intacto** e o controlo deu `degraus=3 saidas=3`, verde. **Contar títulos mede que
alguém escreveu o título.** Cura: `lerDegraus` lê o documento e cada degrau passa
pela regra — e a `saida` sai do **texto**, não da presença do rótulo, senão
reproduzia o defeito que veio corrigir. População medida primeiro (3 degraus), a
sonda que tem de passar, o ficheiro adulterado dele a recusar, e o outro lado a
não acusar os degraus intactos. **Plante:** trocar a leitura por «tem rótulo,
logo tem plano» acende 4 falhas e reprova o `provar-implantacao.sh`.

**Provas (LOCAIS):** `packages/domain` **427 casos, 0 falhas** ·
`scripts/provar-implantacao.sh` **0 falhas** (cenário 0 que TEM de passar + os
quatro portões violados **à vez** + 4 controlos) · `ensaiar-restauracao.sh` **0
falhas** · detalhe e achados em `docs/progress/E35.md`.

**Pendências declaradas:** não há servidor de piloto (o portão 4 nunca leu uma
imagem a sério), não há casa piloto (nenhuma pessoa testada nos seis guiões de
formação), e não há RPO nem RTO porque não há calendário de cópias.


## E33 — assinado a 06/09 em `e953a87` (histórico)

**O que muda:** todas as outras deram poder a quem trabalha na casa. **Esta dá-o
a quem vende o sistema** — a nós. Até aqui protegemos o restaurante de enganos e
de estranhos; **aqui protegemo-lo de nós.** É a única etapa em que o atacante do
modelo de ameaça somos nós próprios a agir de boa fé e com pressa.

**As quatro condições da sessão de suporte, e nenhuma é decorativa.**
**Temporária:** `expira_em` é `NOT NULL` e não há coluna `activa` — estar viva
DERIVA de não ter fim e não ter expirado, porque um booleano é um estado que
alguém escreve e esquece de reescrever. **Visível ao inquilino:** RLS por
organização **para a casa a ver**, e é a única das quatro que não vive na base —
as outras são restrições, esta é um ecrã. **Com âmbito** e **com motivo**, os
dois com `CHECK`. E **a política é da casa**: não há rota da plataforma para a
mudar, e a ausência é a garantia.

**O rasto guarda a PESSOA, não o papel.** Um gatilho recusa `plataforma.%`
assinado por «suporte», «sistema», «bot». É o segundo gatilho do E28 virado para
dentro: a imutabilidade guarda a forma, isto guarda o sentido.

**O ACEITE QUE DECIDE — a fronteira do E05 sobrevive.** Esta é a etapa que traz a
interface de escrita das concessões, e a que teria mais tentação de a abrir pelo
lado de dentro. Não abre: o `REVOKE` está repetido pela terceira vez, e a escrita
passa pela `conceder_capacidade` `SECURITY DEFINER`, que escreve a concessão **e
a auditoria na mesma instrução**.

**Segurança, privacidade e exportação não ficam atrás do plano.** A única
fronteira que não é técnica, e por isso está em SQL: um gatilho recusa oito
capacidades protegidas. Numa constante do produto, muda-se num commit e ninguém
repara; numa migração, muda-se com nome, data e revisor.

**Provas (LOCAIS — a CI continua trancada):** `provas/plataforma.test.ts` **28** ·
`plataforma.test.ts` **29** · `scripts/provar-plataforma.sh` **7 controlos**
(verifica no fim as quatro permissões e os três gatilhos) ·
`inspeccao/plataforma.spec.ts` **25** (19 telas, 5 larguras, ES/PT/EN, 44 px,
WCAG) · `provar-plataforma-no-navegador.sh` **6 controlos** ·
`provar-separacao-de-credenciais.sh` **0** · `pnpm verificar` **0**.

**Detalhe e achados:** `docs/progress/E33.md`. O que mais vale a pena: o
`@default(uuid())` do Prisma é do lado do **cliente**, e há **93 tabelas** com
`id` UUID sem valor por omissão na base — invisível para quem escreve por Prisma,
e a primeira pedra em que tropeça quem escreve SQL directo.

## Retenção do sénior no E33 — a identidade do trabalho, corrigida

**Era omissão.** A identidade de um trabalho era `tipo:alvo:tentativa` com índice
único **global**, e duas casas que pedissem o mesmo colidiam: a segunda nunca
enfileirava. Copiei a forma da impressão do E31, onde funciona **porque o
`documento_id` é um UUID** — e aqui o `alvo` é texto livre.

Uma metade da premissa não se confirmou: `organization_id` é **anulável**, não
`NOT NULL`. É desenho (um trabalho global não é de casa nenhuma), e por isso a
cura leva `coalesce(org, 'plataforma')`.

Medido nas duas direcções: as duas casas passam a caber, e a mesma casa duas
vezes **continua a deduplicar** — que é o par que impede uma correcção de
destruir a razão de a fila existir. Controlo 8b novo, e a verificação final conta
a forma da identidade.


## A tabela do E10 — decisão revertida pelo sénior a 06/09

A `custom_domain_owners` **fica**, e sem RLS. O sénior verificou os três
argumentos e reverteu a ordem de a apagar. O ponto cego ficou escrito no E34: a
varredura de alcance lê TypeScript, e o chamador estava em **SQL** — dentro de
uma `SECURITY DEFINER`, que é precisamente onde vive a lógica que o runtime não
pode fazer sozinho.

A excepção continua declarada na `validar-rls.sh` **com a verificação do GRANT**
(secção 1b): o runtime tem `SELECT` e mais nada, e a guarda mede-o.

## As quatro correcções do E34 estão fechadas — 06/09

Não é etapa nova: são as quatro dívidas que a varredura de alcance do E34 deixou
escritas. **As duas guardas vermelhas que esperavam por elas estão verdes**, e
`validar-desfazer.sh` passa de **2 pares sem desfazer a ZERO**, em 447 substantivos.

**1. `revogarConvite` sem chamador.** A `ORG-007` listava os convites e a rota
não importava a revogação: um convite enviado para o email errado dava acesso ao
sistema de um restaurante e **só se esperava que caducasse**, com a janela a ser
o que alguém tivesse configurado. A rota passa a ter `DELETE`, com `equipa.gerir`,
auditoria `convite.revogado`, e um convite que já não está pendente devolve
**ausência (404)** e não erro — porque não haver o que revogar não é falha.

**2. `apagarExcepcao` sem chamador.** O mesmo defeito nos horários: uma casa
marcava fechado a 25 de Dezembro e não desmarcava. A rota ramifica em
`excepcaoApagar`, e a auditoria regista qual dos dois caminhos correu. **Também
abri a porta no ecrã** — ligar o motor sem a porta era deixar o caminho a existir
sem ninguém lhe chegar. Chave nova `excepcaoApagar` nas três línguas.

**3. As três portas mortas do menu da PLATAFORMA.** Suporte, Incidentes e
Auditoria estavam a `href: '#'`. Passam a `porConstruir: 'E33'`.

**E o `href: '#'` deixou de ser possível nesse item.** O tipo dizia
`href: string` **obrigatório** enquanto o comentário ao lado dizia «não tem
href»: o `'#'` não era descuido de quem escrevia o menu, era **a única forma de
o compilador aceitar o que se queria dizer**. `LigacaoDeNavegacao` é agora uma
união — ou ligação, ou marcador, nunca as duas nem nenhuma — e o compilador
recusa o estado errado antes de a prova de navegação lá chegar. Medido: o item
com as duas coisas dá `TS2322`; só-marcador e só-ligação passam.

**4. A tela pública dos alergénios reimplementava a regra.** Este era o pior dos
quatro, e não pelo tamanho. `validar-alergenios.sh` lê `packages/domain/src/
alergenios.ts`; a tela decidia o estado num encadeado de ternários próprio. **A
guarda vigiava o lado que não corre** — e a cobertura do domínio parecia boa
precisamente porque o teste exercitava a função que a tela não usava.

A cura não foi copiar menos: foi **tirar o segundo caminho**. `avisosPorAlergenio`
vive no domínio, é calculada **a partir** do `avisoDeSeguranca`, e a tela pede-lha.
Uma regra, um sítio, um caminho.

**Medido, e é o controlo que importa:** com `contem: de('CONTEM')` trocado por
`contem: []` no `avisoDeSeguranca`, a leitura passa de `gluten:perigo` a
`gluten:neutro` — um prato **com glúten** a mostrar-se como «ninguém declarou».
Antes desta correcção **esse defeito não conseguia chegar ao ecrã**: o plante
acendia no domínio e a pessoa alérgica continuava a ler o mesmo. Reposto, volta a
`gluten:perigo`.

E a guarda passou a vigiar o lado que corre: secção 4 nova, que reprova cópia da
regra em `apps/web/app/r/` **e** exige que a tela chame `avisosPorAlergenio` —
porque não copiar também se consegue não mostrando nada.

**E faltava metade, apanhada pelo sénior a 06/09.** A `avisosPorAlergenio` não
tinha **um único teste**. O `avisoDeSeguranca` tinha treze; a função nova, que é
a que decide o TOM e a que a tela chama, não aparecia em prova nenhuma. Tirar o
ternário da tela e pô-lo ao lado da regra melhorou a estrutura e **não mediu
nada** — a única diferença era passar a viver num módulo testado, o que faz a
cobertura parecer **melhor do que antes** enquanto a propriedade continua por
medir. É a forma do dia, e desta vez fui eu a produzi-la.

Grupo 5 no `alergenios.test.ts`: um caso por estado (quatro asserções),
`DESCONHECIDO` nunca partilha o tom de `NAO_CONTEM`, a ficha completa não perde
linhas, e um controlo negativo dentro do teste. **Medido com plante na função
real:** trocar o último ramo por `'sucesso'` acende **4 falhas, todas no grupo
5**, e nada mais; reposto, 326 a passar e 0 a falhar.

### Três guardas apanhadas de caminho, e uma delas era minha de há minutos

**`validar-portas-mortas.sh` acusou PROSA.** Reprovou o meu próprio comentário a
explicar porque é que o `href: '#'` era mau — castigou exactamente quem tinha
acabado de fechar as portas. Passa pelo `sem-comentarios.py`, e **o controlo
negativo cobre agora o caso que falhou**: a anónima acusa, a declarada não, o
comentário não.

**`validar-testes.sh` dava NÃO MEDI em `auth`, `config` e `db`** — numa árvore
sem defeito nenhum. O node 23 do ambiente escreve `ℹ pass 14` onde o node 22 do
projecto escreve `# pass 14`: mesmo facto, duas grafias, e a guarda só conhecia
uma. Mesma família das três aspas do `validar-alergenios.sh`. Lê as duas, com
controlo negativo que prova as duas **e** que a ausência continua a ser NÃO MEDI.
Os três pacotes passam a estar medidos: 12, 14 e 7 testes.

**`validar-dinheiro.sh` engolia o erro ao ler o schema** (`2>/dev/null` na linha
136), e `validar-silenciadores.sh` tinha-o vermelho. Se o schema desaparecesse, o
leitor de tipos dizia «não há tipo» para tudo — verde sobre nada. O ficheiro é
verificado uma vez, alto, e a falha aparece.

**E não deixei um silenciador novo:** o meu código chamava o `sem-comentarios.py`
com `2>/dev/null`. Se ele não corresse, a guarda lia zero linhas e dizia «0
falhas» — cega e verde ao mesmo tempo. Pré-voo em ambas as guardas, provado a
mexer: sem o leitor, saída **1**; reposto, **0**.

**Estado das guardas:** 24 de 25 verdes; a 25ª é a `validar-handoff.sh`, vermelha
só enquanto isto estiver por commitar. `pnpm verificar` **0** (medido pelo código
de saída, não pela ausência de texto no ecrã).

**Fica por fazer da lista do E34:** o `leadsDaUnidade` — escrever sem ler. Não
estava nas quatro, e não lhe toquei.

## ⚠ PENDÊNCIA DE MÁQUINA — `pnpm inspeccionar` não correu sobre esta árvore

`mac-health.sh` dá **PERIGO**: 3,1 GB disponíveis, 61 MB livres, uma aplicação de
2,7 GB aberta. **Três corridas do portão foram mortas a meio por falta de
memória** — nenhuma com teste vermelho. Não lancei a inspecção completa nesse
estado e **não uso o número da corrida anterior**, que é anterior aos consertos
desta fatia.

E a interrupção deixou rasto: um plante do guarda de classes ficou no
`catalogo/page.tsx`. Reposto do git, e os outros modificados varridos — nenhum
mais. **Um guião morto a meio deixa o artefacto com o defeito plantado.**

**Contrato:** `docs/architecture/relatorios-e-agregacao.md` (do sénior, por fronteira).
**Detalhe:** `docs/progress/E30.md`.

## ⚠ PENDÊNCIA DECLARADA — sem contabilidade legal e sem leitor de formatos

Taxas, impostos e percentagens são **configuração**, não regra inventada pelo
produto. E a importação recebe linhas em texto cru
(`AAAA-MM-DD;montante;referência`): inventar um leitor de OFX ou CAMT agora era
prometer que se lê o que não se leu.

**Contrato:** `docs/architecture/conciliacao-e-fecho.md` (do sénior, por fronteira).
**Detalhe:** `docs/progress/E29.md`.

## ⚠ PENDÊNCIA DECLARADA — não há cálculo de salário

Guarda-se e mostra-se **tempo**. Converter tempo em dinheiro é convenção laboral,
e escrever uma que não foi verificada seria o erro do E24 outra vez, num sítio
onde custa mais.

**Contrato:** `docs/architecture/ponto-e-escalas.md`, escrito antes do código.
**Detalhe:** `docs/progress/E28.md`.

## ⚠ PENDÊNCIA DECLARADA — não há provedor de envio

Nem email nem SMS. Os envios ficam gravados como `POR_ENVIAR`, e a tela di-lo por
palavras. **Isto não enfraquece o que interessa provar:** a recusa acontece na
GRAVAÇÃO, que é o passo que existe, e não no despacho, que não existe.

**Contrato:** `docs/architecture/consentimento-e-campanhas.md`, escrito antes do código.
**Detalhe:** `docs/progress/E27.md`.

## O texto anterior, mantido por baixo — HISTÓRICO, não estado

> As linhas abaixo descrevem etapas **já assinadas**. Ficam para se ver a
> sequência, e nenhuma delas é o estado de agora. O estado está no topo, e vem
> de `scripts/estado.sh`.


**Etapa atual:** E24 — documentos e integração fiscal (**5 telas**).
**Estado (histórico, E24):** foi retido por alcance, consertado e **assinado**.

**A retenção:** o ciclo do documento fiscal não tinha porta, e arrastava a dívida
do E23 — `receberWebhook`, `reconciliarComProvedor` e `acontecimentosDaConta`
também sem chamador. Nenhum webhook do adquirente podia chegar ao produto, e a
`provar-adquirente` jurava que o reenvio deduplicava **numa porta que não
existia**.

**Duas portas novas:** a do webhook (fora de `/api/org/`, porque o adquirente não
tem sessão — a credencial é a assinatura, o corpo lê-se cru, e responde-se 200
depois de gravar para o adquirente não martelar a porta) e as quatro acções do
ciclo fiscal na rota do TPV, com botões só onde fazem sentido.

**A excepção da guarda não dispensa, troca:** o contador subiu de 5 para 6
conscientemente, e em troca há um caso que verifica a assinatura, o corpo cru, a
ausência de `.json()` e o segredo vindo do ambiente.

**E a prova mede o ALCANCE:** `provar-portas-do-dinheiro.sh` (**10 casos, 8
controlos**, 0), com cada plante a apagar a **chamada** e não o comportamento.
`varrer-alcance-da-etapa.sh 2c1a18f HEAD` → **1 sem chamador**, o `esquecerPrisma`
do E01. O intervalo inteiro do E23 dá o mesmo único.
**Régua:** `docs/reviews/ALVO-E24.md` · **Fontes:** `adr/0002-fiscal-espanha.md`.
**Detalhe:** `docs/progress/E24.md`.

## ⚠ PENDÊNCIA EXTERNA — antes do primeiro talão a um cliente real

**Os requisitos concretos do regime têm de ser confirmados na fonte por quem
tenha acesso e responsabilidade.** Não foi lida a Orden HAC/1177/2024 — a que traz
o formato do registo, o conteúdo do QR e o algoritmo —, não há fornecedor
homologado contratado, e a classificação fiscal da entidade do piloto não está
confirmada. Está no ADR em destaque **e nos ecrãs**: INT-006, POS-020, POS-021 e
CAT-021 dizem-no por palavras.

**Fui às fontes e escrevi de onde tirei.** Duas consultas a 2026-09-05: a página
da AEAT (dá os diplomas, **não** dá prazos nem requisitos técnicos) e o texto
consolidado do RD 1007/2023 no BOE — encadeamento por parte do hash do anterior
(**10.1.ñ**), QR obrigatório (**6.5.a**), a frase «VERI\*FACTU» só para quem
remete (**6.5.b**), e os prazos **2027-01-01** e **2027-07-01**. O piloto cai no
segundo.

**Construiu-se a FORMA, não o formato.** Só é documento fiscal o que está
`ACEITE` **e** com número do fornecedor; emitir duas vezes devolve o mesmo e uma
correcção é documento novo com os dois a ficar; a rejeição é estado com motivo
obrigatório; e apagar, mudar o que identifica o documento ou fazer um aceite
voltar atrás são recusados **por gatilho**.

**Achado que vale para lá desta etapa:** apanhar a colisão de um índice único
**dentro de uma transacção** não serve — o Postgres aborta-a e tudo o que venha a
seguir falha com `25P02`. Passou a `ON CONFLICT DO NOTHING`. O E23 usa a mesma
forma e **funciona por acidente**, porque não há nada depois do `catch`; ficou
anotado no código.

**E três lições sobre medir:** um controlo que cai não é um controlo que mede
(o da identidade era bruto demais e fazia tudo falhar); sem a guarda do motor a
recusa continua a acontecer pela base — **degrada-se a legibilidade do erro, não
a segurança**; e **medir o comprimento de um texto não é medir o que ele diz** —
o rótulo «Motivo del rechazo» sozinho satisfazia a asserção.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-fiscal.sh` (**20 casos, 8 controlos negativos**, 0) ·
`./scripts/provar-fiscal-no-navegador.sh` (**23 casos, 8 controlos**, 0) ·
`./scripts/provar-portas-do-dinheiro.sh` (**10 casos, 8 controlos**, 0) ·
`pnpm inspeccionar` (**609 casos, 0**). Prova **LOCAL**.

---

**Etapa atual:** E23 — pagamentos, webhooks e reembolsos (**12 telas**).
**Estado:** **IMPLEMENTADO, AGUARDANDO VALIDAÇÃO — as duas fatias.**
**Régua:** `docs/reviews/ALVO-E23.md`, escrita **antes de existir código**.
**Detalhe:** `docs/progress/E23.md`.

**A identidade é a do ACONTECIMENTO, e a garantia é um índice** — não há «procura
e se não existir insere», porque entre a procura e a inserção cabe o segundo
processo. O par: o mesmo acontecimento duas vezes tem **um** efeito, dois
acontecimentos diferentes têm **dois**.

**Não há máquina de transições.** Guarda-se o estado que o provedor autoriza com
o instante que **ele** carimbou, e o estado deriva-se do conjunto: a ordem de
chegada não decide porque **não entra na conta**. A devolução que chega antes da
captura não se perde nem se inventa.

**A assinatura verifica-se antes de qualquer efeito**, com `timingSafeEqual`,
sobre o corpo **cru**, e a recusa **não diz porquê** — um erro que explica o que
faltou à assinatura é um manual de como a forjar.

**O segredo não tem onde morar na base:** a tabela do conector não tem coluna
para chave, e há uma prova que as procura no `information_schema` e exige zero. O
conector **não liga sem provedor E merchant**, por `CHECK`.

**Dois achados, e os dois são da prova.** O meu controlo da ordem não plantava o
defeito que descrevia — trocava duas *leituras*, e a assinatura continuava a ser
verificada antes de escrever. E ao consertá-lo vi que **a transacção nos protege
por acidente**: o `throw` desfaz a escrita, mas isso é desenho de outra camada, e
no dia em que um efeito sair da transacção a protecção desaparece sem ninguém
tocar nesta função. **E a varredura das duas ordens não tinha guarda** que
notasse se as duas fossem a mesma — pus o plante a correr a mesma ordem nas duas
voltas e a suite ficou verde.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-adquirente.sh` (**21 casos, 8 controlos negativos**, 0) ·
`./scripts/provar-pagamentos-no-navegador.sh` (**24 casos, 7 controlos**, 0) ·
`pnpm inspeccionar` (**589 casos, 0**).

**As 12 telas.** As três públicas ficaram em `mesa/` e não em `menu/`: medi, e
`menu/` é a carta ANÓNIMA enquanto `mesa/` é quem está sentado com sessão de
visitante — um ecrã de pagamento na carta anónima seria pagamento sem sessão. O
comprovativo lê por porta estreita com `search_path` fixo e leva um identificador
**opaco**, não o `id` do pagamento. A STATE-011 **não tem botão de tentar outra
vez**: diz o contrário. E onde não há adquirente **não há botão** — o cartão não
aparece esbatido, não aparece.

**O achado que mais vale: três telas estavam contadas na população e nunca eram
visitadas.** A contagem dizia 12 e os ciclos de largura, toque, contraste e
idioma corriam sobre 8. **Uma tela contada e não medida é pior do que uma tela em
falta** — a contagem afirma que está coberta. E não o vi a ler código: vi-o
porque um controlo negativo ficou **verde**, com a guarda de população a contar
pagamentos em vez de medir o que eles mostram. Passou a exigir a **gorjeta
visível**, porque uma gorjeta a zero é indistinguível de «a gorjeta nunca
aparece».

**A guarda das rotas apanhou-me duas vezes.** O leitor do comprovativo tocava na
base sem resolver sessão — foi para `src/visitante/`, que é melhor sítio do que o
que eu tinha escolhido. E depois disparou sobre o nome proibido escrito no meu
**comentário**: ela não distingue código de comentário, ao contrário da
`validar-dinheiro.sh`, que já resolveu isto com o `sem-comentarios.py`. Fica
**declarado**; não mexi numa guarda assinada.

**E o alvo de toque, três vezes na mesma etapa:** `<a>` cru fica com 24 px. Três
vezes já não é distracção.

**PENDÊNCIA DECLARADA:** não há credenciais de adquirente nenhum. Está
implementada a **porta** e as provas determinísticas; a integração fica
**pendente** e o pagamento real **não** está declarado pronto. Nada finge ter
falado com um provedor.

---

**Etapa atual:** **AS PORTAS** — a condição que o E21 pôs para reabrir o marco do
Restaurant. Não é uma etapa; é o que falta antes do E23.
**Estado:** **IMPLEMENTADO, AGUARDANDO VALIDAÇÃO.** Detalhe em
`docs/progress/PORTAS.md`. Contrato: `docs/architecture/portas-e-navegacao.md`.

**O E22 fechou com o TPV a ter porta e mais nada.** O menu ainda levava dez
entradas em `href: '#'`, e entre elas **reservas** — as 34 telas assinadas — e a
**sala inteira**. Um restaurante que chega à caixa e não chega às reservas não se
usa.

**Seis módulos entregues passaram a ter porta:** catálogo, reservas, sala e
pedidos, takeaway e entrega, relatórios, e a caixa que já a tinha. A escolha saiu
de **medir a matriz** por família de rota — e foi essa medição que mostrou que o
`relatorios` estava marcado como por construir **e não estava**: as REP-001 a 008
são do E14 e estão validadas desde então. Eu ia escrever «E29» ao lado de um
módulo que já existe.

**Uma regra, e não uma por módulo.** Quatro dos seis vivem dentro de uma unidade
e o contrato exige um sítio onde a unidade se escolha — isso seriam quatro
páginas quase iguais, que são quatro regras no dia em que uma mudar. Há uma só,
`/app/<org>/ir/<modulo>`, e um módulo fora da tabela dá **ausência**.

**O `#` legítimo passou a ser outra coisa.** Era um `<a href="#">`: com cursor de
mão e apanhável por `getByRole('link')` — parecia uma porta. Agora é um campo
próprio, `porConstruir`, sem `href`, esbatido e com a etapa ao lado. Ficam
**inventário → E25** e **clientes → E27**.

**Duas coisas ficam DECLARADAS por não darem para marcar honestamente:** nenhuma
das 396 telas do atlas é o painel de topo do inquilino — o `início` ficou com o
E30, que é a atribuição menos certa das quatro; e `trabalho`/`mais` na barra do
telemóvel não existem em etapa nenhuma, por isso não são marcadores mas restos —
a barra passou a levar três destinos reais.

**A prova mede o CAMINHO e o plante estraga o MENU, nunca a tela** — é a única
forma de não medir outra vez a existência da tela, que já está medida vinte
etapas atrás. Dois consertos meus pelo caminho: a chegada media-se por
`data-tela`, que **só existe em 61 ficheiros** e que a raiz da sala, do catálogo e
dos relatórios nunca adoptou (exigi-lo era exigir que esses módulos mudassem para
a prova passar), e o matcher esperava a frase da asserção de visibilidade quando
quem dispara é a que compara o `href`.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-portas.sh` (**11 casos, 7 controlos negativos**, 0) ·
`pnpm inspeccionar` (**568 casos, 0**).

---

**Etapa atual:** E22 — TPV, contas e caixa (**19 telas**).
**Estado (histórico):** retido, consertado e **assinado**. Declarado
pelo JR; não assinado.

**A retenção foi UMA coisa, e não era do dinheiro: as 19 telas não tinham porta.**
Zero `href` para `/pos/` em todo o produto, e o item «caixa» do menu em `#`. As
telas ligavam-se entre si e faltava a primeira — ninguém com sessão iniciada
chegava ao TPV sem escrever o endereço à mão. «Uma tela provada a que ninguém
chega é uma tela que não existe», e o contrato `portas-e-navegacao.md` que o diz
foi escrito **antes** desta entrega, depois de o E21 ter reprovado o marco do
Restaurant exactamente por aqui.

**O conserto:** a POS-001 passou de `/pos/[locationId]/operador` para `/pos` — a
entrada do módulo, com a escolha de unidade que o contrato exige. O nome dela no
atlas é «Entra en tu caja»: descrevia a entrada desde o princípio e eu tinha-a
feito ser outra coisa. O item «caixa» do menu deixou de ser `#`, **e só esse** —
as outras entradas são módulos de etapas que ainda não existem, que é o `#`
legítimo do contrato; não toquei na navegação do `/app/`.

**E a prova mede o CAMINHO, não a tela.** Um único `goto`, para onde a sessão
aterra; daí em diante tudo por cliques — menu, entrada, escolha de unidade, tela
de trabalho — com guarda de leitor cego sobre o endereço final. O controlo
negativo é o que o contrato nomeia: repor o `#` e a prova acende. É o único
controlo da suite que não mexe numa tela: mexe no menu, e as 19 continuam lá.
**Régua:** `docs/architecture/dinheiro.md`, escrita no E00 **antes** desta etapa,
e CT-11. **Detalhe e achados:** `docs/progress/E22.md`.

**Quatro entidades, e nenhuma colapsada.** A conta é a obrigação; a tentativa saiu
daqui; o pagamento é o confirmado; a devolução não é um pagamento negativo. O
pagamento **não tem estado** — existir É estar confirmado, porque um `Payment`
com `estado = falhou` seria dinheiro que se desconta a somar.

**O estado da conta e o da caixa NÃO são colunas.** Derivam-se — dos pagamentos e
dos acontecimentos. O devido deriva-se por gatilho das linhas menos os ajustes. É
a mesma decisão da posição na lista de espera do E19: sem coluna, ninguém
consegue mostrar um número errado.

**Na caixa, o único número que um humano escreve é o CONTADO.** O esperado sai dos
movimentos e a diferença é a subtracção — e a prova procura uma coluna de
diferença no `information_schema` e exige **zero**, porque uma diferença guardada
é uma diferença que se pode editar até dar zero. Os movimentos **não têm coluna
de meio de pagamento**: tudo o que lá está é dinheiro, e isso não é uma regra, é
uma coluna que não existe.

**O achado que mais vale: a recusa da concorrência era da BASE, não do negócio.**
Apaguei o limite do devido e o caso ficou verde. Medido: com `Serializable` +
cadeado a segunda cobrança cai com `40001`, porque o Postgres tira o retrato da
transacção na **primeira instrução** — o `set_config` do escopo — e quando o
segundo chega ao cadeado o retrato já é anterior ao commit do primeiro. **O
cadeado fá-lo esperar; não o faz ver.** E `40001` diz «tente outra vez», que numa
sala cheia gera chave nova: o caminho por onde se cobra duas vezes. Em
`READ COMMITTED` recusa com `EXCEDE_O_DEVIDO`, e a prova passou a exigir o motivo.

**Imutável sem reversão não é rigor, é uma armadilha.** O gatilho impedia apagar
um ajuste — e bem — mas um desconto por engano ficava para sempre. A correcção é
um registo novo que aponta para o que anula, com índice único.

**O ALCANCE foi verificado ANTES das provas**, como o sénior fez no E20. Havia
**quatro máquinas construídas, provadas e sem chamador** — `juntarLinhasDoPedido`,
`reconciliar`, `corrigirMovimento` e `dividirPorPesos`. Era a retenção do E19
outra vez. Estão ligadas; a medição dá zero órfãs.

**Três defeitos meus no ARNÊS, e os três faziam ausência de medição parecer
sucesso:** um plante cujo `assert` falhava e o guião seguia sem `set -e`, correndo
a suite com o ficheiro intacto; um `exigir_vermelho` que não distinguia «ficou
verde» de «caiu no caso errado»; e um guião que morria no arranque — o bash do
macOS é o 3.2 e não tem `declare -A` — e saía com código **0**. Há agora uma
guarda `CHEGOU_AO_FIM`, provada a acender com uma morte simulada.

**E a guarda do dinheiro estava cega aos campos desta etapa.** `devidoMenor`,
`unitarioMenor` e `recebidoMenor` não têm nenhum dos substantivos da lista dela.
Passou a reconhecer pela **forma** — o sufixo `Menor`, que a própria `dinheiro.md`
manda — e subiu de 10 para 13 campos. O controlo negativo dessa secção, que nunca
existira, destapou um segundo buraco: o padrão exigia espaço depois do tipo, e
`devidoMenor Float` no fim da linha passava.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-contas.sh` (39 casos, **9 controlos negativos**, 0) ·
`./scripts/provar-caixa.sh` (19 casos, **8 controlos**, 0) ·
`./scripts/provar-tpv-no-navegador.sh` (19 telas, **25 casos**, **9 controlos**, 0) ·
`./scripts/validar-dinheiro.sh` (13 campos, 2 controlos, 0) ·
`pnpm inspeccionar` (**560 casos, 0**).

**PENDÊNCIAS DECLARADAS, e nenhuma simulada:** **nenhum provedor de pagamento
real** — não há webhook, não há assinatura verificada, `CARTAO` é um meio
registado e não uma integração, e o ecrã diz isso por palavras. E **nada de
fiscal**, que é o E24: não há recibo que se pareça com documento fiscal.

**A prova foi LOCAL.** A CI continua trancada por facturação do GitHub.

**O E18 ficou VALIDADO** a 05/09 em `cfafed7` — 6 telas, 13 asserções no motor e
19 nas telas, 17 controlos negativos. Passámos os 50 por cento das telas.

**O E17 ficou VALIDADO** a 04/09 — 16 telas, prova **local**, 17 controlos
negativos, e com ele passámos metade das telas do produto: 213 de 396. Levou
consigo uma correcção de arnês transversal: o fecho da semeadura reconhecia o seu
lixo pelo nome, os **pedidos** entram pela porta real com número da sequência, e
398 ficaram na base a prender as estações — com a auto-verificação, calibrada
pelo mesmo crachá, a dizer «nada ficou para trás» de cada vez.

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
| E00 — contrato e leitura das fontes | **validado a 05/09, julgado pelo JR** (`docs/reviews/E00.md`), com veredicto dividido. 27 contratos em `docs/architecture`. Quem os escreveu não os validou — foi para isso que se montaram dois. |
| E01 — repositório e verificação contínua | **validado** · `docs/reviews/E01.md` |
| E02 — design system, responsividade e idiomas | **validado** à 2ª · `docs/reviews/E02.md`. A 1ª revisão apanhou o acento a pintar um indicador de estado a 2,77:1; corrigido com `acentoSinal` e uma guarda de lista de permissão. |
| E03 — estrutura multi-tenant e isolamento | **validado** à 2ª · `docs/reviews/E03.md`. A 1ª revisão apanhou o verificador a dizer verde com zero medido; corrigido, e a mesma guarda aplicada às outras provas. |
| E04 — autenticação, convites e permissões | **validado à 3ª** · `docs/reviews/E04.md` |
| E05 — planos, entitlements e identidade Starter | **validado à 1ª** · `docs/reviews/ALVO-E05.md` |
| E06 — onboarding e configuração do restaurante | **validado à 2ª** · `docs/progress/E06.md`. A 1ª validação foi retirada pela CI: a cadeia de migrações não se aplicava do zero. |
| E07 — catálogo, produtos, preços e opções | **validado à 1ª** · `docs/reviews/E07.md` |
| E08 — média, traduções, importação e publicação | **validado à 2ª** · `docs/reviews/E08.md` |
| E09 — carta pública e QR de consulta | **validado** · `docs/progress/E09.md`. As cinco telas internas da dívida de móvel saíram pagas no E10. |
| E10 — sites dos restaurantes e landing | **validado** · `docs/progress/E10.md`. 29 telas, medidas em cinco larguras. |

**Primeiras telas.** O E02 é a primeira etapa que toca `coverage.csv`: STATE 001-003,
005, 007 e 016. Até aqui o medidor de telas esteve a 0 % e isso era verdade, não uma
avaria — E00 a E01 são transversais e não entregam vista nenhuma. Estão agora a
**validadas**; `scripts/validar-cobertura.sh` diz "Cobertura íntegra".

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

## 07/09 20h50 — o trap assinado, e duas notas por fazer

O controlo duro do `next-env.d.ts` está feito **por mim** e não pela palavra de
quem escreveu a cura: trap ligado com `TERM` a meio deixa `.next` limpo, trap
desligado deixa `.next-controlo` sujo. Mesmo arnês, mesmo sinal. **Assinado.**

A caminho disso fecharam-se duas portas para o mesmo defeito — um caminho errado
em silêncio: o ajudante passou a resolver o caminho **em absoluto** (`a2da008`),
e o ficheiro ausente passou a **abortar** em vez de seguir com a protecção
desligada (`a166152`, emenda do JR na revisão do meu código).

**Por fazer, do JR, menores e não bloqueantes** — ficam aqui para não se perderem
num commit:
- `mktemp -t next-env` é a forma antiga no GNU; funciona no macOS, que é onde
  isto corre hoje.
- Ler o ajudante duas vezes na mesma corrida deixa a primeira cópia temporária
  órfã.

Nada disto abre etapa: a matriz continua em `36/36` e `396/396`, e o que trava é
a aprovação visual do Matheus e as treze decisões que estão com ele.

## 07/09 21h20 — duas fotografias valeram mais que a guarda de 11 superfícies

O Matheus mandou duas fotos do domínio a dizer que ainda está feio. **Tinha
razão, e nenhuma guarda nossa via nada disto** — porque medem contraste e alvos,
não composição nem conteúdo.

**Medido e confirmado:**
- As telas do produto na página de marketing estão **em espanhol em todos os
  idiomas**: cinco PNG fixos, e `pt-BR` e `es-ES` servem os **mesmos ficheiros**.
- As capturas são das **10:15**; **16 commits** tocaram no produto desde então, o
  último às 17:40. A `carta-movel` mostra o campo de busca **cortado** — o
  defeito corrigido hoje. **A página que vende o produto anuncia os defeitos que
  passámos o dia a tirar.**
- Na página de planos: **387 px de preâmbulo** antes do primeiro preço, e a
  página tem 6225 px para três preços.

**Retirado, e a retirada é medição e não recuo:** eu disse que o logótipo por
baixo do relógio era defeito nosso. **Não é.** O `viewport` que sai ao vivo é
`width=device-width, initial-scale=1`, sem `viewport-fit=cover` — logo
`env(safe-area-inset-top)` daria zero, e o cabeçalho é `static` e rola como em
qualquer sítio no Safari. Fui verificar antes de construir a cura e a cura não
existia. Corrigido ao Matheus em três minutos.

**Nova decisão para a lista dele** (não é trabalho por fazer): na página de
planos os dois títulos estão **trocados de sentido** — «O que muda, linha a
linha» encabeça os **cartões** (387–1134 px) e a tabela que compara linha a
linha está em 1610 debaixo de «O que cada plano inclui». A cura é copy, e a copy
é dele.

Entregue ao JR com régua escrita antes: `docs/reviews/ALVO-CAPTURAS-DE-MARKETING.md`.

## 07/09 21h35 — as capturas por idioma, revistas e assinadas

Verifiquei **eu** as duas exigências da régua, em vez de ficar pela palavra dele:

- **Somas distintas:** as cinco capturas têm três somas por idioma, nenhuma
  coincide. E não fiquei pela soma — que só prova que os bytes mudaram, não que
  o idioma está certo. **Abri a `pt-BR/carta-movel` a olho:** interface em
  português, «Português» aceso, «O que você quer?», «Buscar», «Todo o cardápio»,
  e o campo de busca já não corta.
- **Controlo negativo:** toquei em `packages/ui/src/estilos.css` e a guarda
  passou de **saída 0** a **saída 1** com «há capturas anteriores à fonte mais
  recente»; voltou a passar depois de repor. **Recusa mesmo.**

**Um ponto de revisão que veio do meu próprio trabalho:** a guarda dele compara
`mtime` dos **dois** lados, e num checkout fresco o git reescreve tudo — os dois
lados ficam iguais e ela diz verde onde não consegue medir. É o mesmo cegamento
que curei em `932487b`. O canário pertence dentro do `frescura_do_produto.py`
partilhado, **não copiado nas duas guardas**.

### Novo para a lista do Matheus — e é escolha, não defeito

**Os pratos na captura `pt-BR` continuam em espanhol.** Isso está **certo**: são
dados do inquilino, não texto de interface, e um restaurante real teria os seus.
A escolha é dele: manter a demonstração de um restaurante espanhol com interface
portuguesa, ou semear um inquilino de demonstração português só para estas
capturas — o que custa um segundo inquilino para manter.

### Terceiro achado das fotografias, medido

Quatro das cinco capturas são de **secretária** e aparecem no telemóvel a um
quarto do tamanho:

| captura | original | mostrada | escala | texto de 14 px fica a |
|---|---|---|---|---|
| `catalogo-1440` | 1440 px | 342 px | 0,24 | **3,3 px** |
| `sala-servico-1440` | 1440 px | 342 px | 0,24 | **3,3 px** |
| `kds-cozinha-1280` | 1280 px | 342 px | 0,27 | **3,7 px** |
| `sala-tablet-834` | 834 px | 342 px | 0,41 | **5,7 px** |
| `carta-movel-390` | 390 px | 342 px | 0,88 | 12,3 px |

**A página diz «olha o produto» e mostra-o num tamanho em que não se lê nada.**
Mesma família da medição do KDS de hoje: o que conta é o tamanho no ecrã de quem
olha, nunca o do ficheiro.

## 07/09 21h55 — as capturas de telemóvel, revistas e assinadas

Verifiquei no **`currentSrc`**, que é o ficheiro que o navegador escolhe, e não
na marcação `<source>` que o commit mostrava:

| composição | telemóvel (390) | secretária (1440) |
|---|---|---|
| sala | `sala-estreita-390` — escala **0,88** | `sala-servico-1440` |
| kds | `kds-estreito-390` — escala **0,88** | `kds-cozinha-1280` |
| catálogo | `catalogo-estreito-390` — escala **0,88** | `catalogo-1440` |

Era **0,24**. **Assinado.** E a escolha do `<picture>` em vez de duas `<Image>`
escondidas está certa: o navegador descarrega as duas mesmo com `display:none`.

**A decisão que ele levantou confirma-se por medição:** no telemóvel o
`sala-estreita-390` aparece **duas vezes** — a composição `tablet` cai na mesma
imagem. Vai para a lista do Matheus, porque escolher outro ecrã ali é editorial.

### Um alarme falso que apanhei antes de o reportar

O `sala-tablet-834` media `naturalWidth: 0` e uma escala absurda. **Não era
defeito — era carregamento preguiçoso.** Depois de rolar a página: 640 → 640,
escala 1,00. Se eu o tivesse reportado, mandava alguém procurar uma avaria que
não existe.

### E um defeito real, que NÃO é dele

`sala-servico-1440` e `kds-cozinha-1280` são servidos a **720 px** para uma
ranhura de **1072** — ampliados **1,49×**, visivelmente moles na secretária. O
`catalogo-1440`, na mesma ranhura, recebe 1080 e fica a 0,99.

Medi a versão **ao vivo**, anterior à mudança dele: **idêntica**. Não nasceu
agora. E a causa está no `sizes`:

| | `sizes` declarado | ranhura real |
|---|---|---|
| sala, kds | `(min-width: 1024px) 50vw` | 1072/1440 = **74vw** |
| catálogo | `100vw` | 74vw — pede a mais, e acerta |

**A dica mente ao navegador**, ele vai buscar o ficheiro certo para 50vw, e
depois estica-o. Uma declaração que discorda da realidade — a família do dia.

## 07/09 22h15 — o `sizes`, revisto e assinado, e o que eu tinha medido a menos

Verifiquei o `e62b2c0` em **6 larguras × 3 rotas** — 390, 768, 1024, 1280, 1440,
1920 sobre `/product`, a landing e o `getting-started` — e no `currentSrc`:

| | pior escala |
|---|---|
| secretária (≥768) | ~~**1,65** — a `carta-movel`~~ → **RETIRADO a 22h50: 0,99. O número era da métrica, não da imagem** |
| telemóvel (<768) | ~~**1,44**~~ → **RETIRADO: 0,88** |

**Tudo o resto está em 0,99 ou abaixo.** A afirmação dele confirma-se, incluindo
a ressalva. **Assinado.**

### E a lição é minha

Eu medi a **1440 px** e dei o defeito por descrito: duas composições, 1,49×. Ele
mediu **a várias larguras** e encontrou **1,91× a 1024**, e mais duas rotas
afectadas — landing e `getting-started`. **Amostrei um ponto e chamei-lhe o
defeito.** É a mesma lição dos botões escritos à mão, onde a minha lista deu 10
e a travessia dele deu 14.

E a formulação é dele: **«o `sizes` é uma promessa, e o navegador escolhe o
ficheiro por ela antes de saber a largura real»** — logo uma promessa pequena de
mais faz buscar pequeno e esticar. **Ampliar é o mesmo defeito que encolher, do
outro lado.**

### O que eu acrescento ao caso da carta, que fica aberto

Medi os ficheiros, e **eliminam-se como causa**:

| | dimensões |
|---|---|
| `carta-movel-390`, es-ES / pt-BR / en | **390×844** |
| `sala-estreita-390`, `kds-estreito-390`, `catalogo-estreito-390` | **390×844** |

**São idênticos aos que funcionam.** Se o ficheiro é o mesmo e o resultado
difere, a diferença está em **como é renderizada** — não no que foi capturado.
A carta é a única que já era estreita e por isso não passou pelo `<picture>`.

## 07/09 22h30 — o pacote re-preparado em HEAD, e a referência velha retirada

**Reprovei o pacote**, porque o que eu tinha nomeado ao Matheus (`7b94eff`, às
18h19) ficou para trás de **quatro commits ao produto** — precisamente os que
respondem às fotografias dele.

`scripts/publicar.sh HEAD` sem `--autorizado-por`: **portões abertos, saída 0, e
recusou publicar por falta de autorização.** Preparar não é publicar.

Verifiquei o conteúdo em vez de aceitar a etiqueta:

| | |
|---|---|
| pacote | `bossaos-ccef01b.tar`, 26 MB, **2181 ficheiros** |
| capturas por idioma | **9 por idioma**, es-ES / pt-BR / en |
| as três estreitas | `sala-estreita-390`, `kds-estreito-390`, `catalogo-estreito-390` — **presentes** |
| ficheiros com forma de segredo | **1**, e abri-o: `.env.example`, sem um valor real |

**Não disse «nenhum segredo» a partir de uma contagem que não inspeccionei** —
foi assim que já lhe disse coisas que não tinha verificado.

**A referência `7b94eff` fica retirada.** O que está pronto é `HEAD`, e prova-se
outra vez no momento de disparar.


## 07/09 22h50 — retiro os 1,65 e 1,44: a carta não tinha defeito

O JR foi à carta e o alvo caiu **do lado do instrumento**. Verifiquei eu, com um
diferencial que ele não fez — as **seis** imagens da página, mesmo instrumento:

| imagem | `naturalWidth` | recurso decodificado |
|---|---|---|
| `sala-estreita-390`, `kds-estreito-390`, `catalogo-estreito-390` | 390×844 | 390×844 |
| `logoname` | 256×88 | 256×88 |
| **`carta-movel-390`** | **237×514** | **390×844** |

**Cinco concordam, uma não.** A imagem está bem e o visitante vê-a nítida; o que
mente é o `naturalWidth` daquele elemento. Os **1,65 e 1,44 que eu assinei e
disse ao Matheus saíram de dividir pela métrica mentirosa** — a escala real da
carta é **0,88**, igual às outras três.

**Não há excepção: a cura do `sizes` está limpa em tudo.** 0,99 em secretária,
0,88 no telemóvel. O meu «pior caso» era um artefacto.

### E o pior é que eu tinha a contradição no ecrã

Há uma hora imprimi este quadro:

    carta-movel-390    servido  237px -> 342px   escala 1.44
    sala-estreita-390  servido  390px -> 342px   escala 0.88

Dois ficheiros que eu tinha acabado de medir com `sips` como **390×844 ambos**,
a reportarem larguras servidas diferentes, **lado a lado na minha própria
saída**. Não confrontei uma linha com a outra.

**A frase é dele e fica com o nome dele:** *«uma medição que ninguém confronta
com outra é uma opinião com números.»*

E acrescento o que a minha parte ensina: **o confronto não precisava de
instrumento novo.** Precisava de olhar para duas linhas da mesma tabela e
perguntar porque é que discordam. O diferencial mais barato que existe é a
população que já se mediu.

**Fica sem explicação o porquê do 237**, e digo-o em vez de inventar uma — não é
o ficheiro, não é o formato, não é o `srcset`, não é o carregamento. Sem cura,
porque não há defeito: **uma guarda construída sobre `naturalWidth` daria
vermelho para sempre num sítio onde não há nada para consertar.**

## 07/09 23h15 — o guia de teste dele também tinha apodrecido

Segunda coisa minha, em circulação, a ficar para trás no mesmo dia — a primeira
foi a referência de publicação. **O guia das 18h15 avisava do anel de foco e não
avisava das imagens de marketing**, que é justamente o que lhe custou quatro
fotografias.

Medi o domínio **antes** de o corrigir, para o aviso não ser de cor:

| | ao vivo às 23h15 |
|---|---|
| imagens de `/pt-BR/product` e `/es-ES/product` | **os mesmos cinco ficheiros** — ainda espanholas |
| campo de busca da carta | `corta=false` — **essa cura já está no ar** |
| anel de foco do CTA da landing | `rgb(16,46,53)` sobre `rgb(16,46,53)` — **1,00:1 confirmado** |

Note-se o do meio: **eu podia ter escrito que o campo cortado ainda estava por
publicar, e estaria errado.** Está corrigido em produção; o que mostra o defeito
é a *imagem* velha, não o produto. Medir separou as duas coisas.

O guia ganhou uma secção — «Já corrigido, e ainda NÃO está no ar» — com os
quatro pontos e **a hora a que foram medidos**.

**Não abro secção nova na doutrina para isto.** É a regra da validade da prova,
que já lá está, aplicada a artefactos que eu entrego em vez de a capturas.
Aplicar uma regra existente não precisa de uma entrada nova — e há uma hora
medi que este ficheiro cresce muito mais depressa do que é consultado.

## 07/09 23h25 — a afirmação de maior risco do dia, verificada por três eixos

Às 17h39 disse ao Matheus que **limpar as fixtures de produção era seguro,
porque «nada que eu tenha encontrado as volta a criar»**. Isso era **uma busca**,
e a lição do dia inteiro é que uma busca encontra o que alguém se lembrou de
procurar. Se estivesse errada, alguma coisa escreve na base de produção sem eu
saber — e ele apagaria dados que voltariam sozinhos.

Refi-la a tentar **partir** a afirmação, e não a confirmá-la:

| eixo | como | resultado |
|---|---|---|
| **mecanismo** | quem cria `Organization`, em todo o repositório | `fixtures.ts`, `semente-demonstracao.ts`, e **uma migração** |
| **dados** | quem menciona `insp-`, em qualquer extensão | só `inspeccao/*.spec.ts` e dois auxiliares de `packages/db` |
| **execução** | o que corre de facto em produção | servidor + `db:migrate:deploy`; **sem bloco `prisma.seed`**, e o `compose.prod.yml` não corre mais nada |

### O eixo dos dados deu um contra-exemplo, e fui atrás dele

Uma **migração** menciona `insp-marina-oropesa` — e migrações correm em
produção. Eu tinha dito «nem migrações», portanto isto valia a afirmação toda.

É um **comentário**, na linha 8. E a migração **não tem um único `INSERT`,
`UPDATE` ou `DELETE`**.

**`grep` encontra texto, não comportamento** — a mesma lição de hoje de manhã,
mas desta vez aplicada **antes** de eu reportar, e não depois de me
desmentirem.

**A afirmação aguenta**, e agora aguenta sobre três eixos independentes em vez
de uma busca. **Limpar continua a ser decisão dele**, e continua a ser segura.

## 07/09 22h55 — o registo fechado, revisto e ASSINADO, com duas notas

Verifiquei **eu**, e com a forma **mais dura** do teste — corpo **válido**,
senha longa e email bem formado, para eliminar a hipótese de ser a validação a
travar:

| pedido | resposta |
|---|---|
| rota inventada | **404** — o controlo é válido |
| `sign-in/email` | erro de validação — **vivo** |
| **`sign-up/email`, corpo válido** | **`EMAIL_PASSWORD_SIGN_UP_DISABLED`** |
| `/api/convites/token-falso` | 404 — **o convite não partiu** |

Recusa **pela razão certa**, e nenhuma conta criada — confirmei na base que não
existe utilizador com o email da minha sonda. **Assinado.**

**E ele tinha razão contra a minha régua.** Eu exigi 404; `disableSignUp` não
desregista a rota, **recusa a operação**. Cumprir a régua à letra daria uma
guarda vermelha para sempre sobre uma cura que funciona.

### Nota 1 — o «131 → 131» não se consegue voltar a correr

Foi a prova dele de que nada foi criado. ~~**Não a consegui verificar:** a base de desenvolvimento está inteiramente
vazia.~~ **ERRADO, e corrigido às 23h05 — ver a secção seguinte.** A base tem
mesmo 131 utilizadores. Eu contei como `bossaos_app`, que sob RLS vê **zero**.

**A conclusão aguenta** (confirmei-a por outro caminho), mas o número é um
**instantâneo**, e um instantâneo de segurança que ninguém pode re-correr decai
em confiança. Era a mesma frase de hoje: *um número que era verdade quando foi
escrito.*

### Nota 2 — a sonda é segura por CONVENÇÃO, não por mecanismo

O corpo leva **senha de um carácter**: com a cura ligada o `disableSignUp`
responde primeiro, com ela desligada é a política de senha que recusa. Está
documentado e bem raciocinado.

Mas o controlo negativo corre com a cura **desligada**. Se alguém um dia
alongar essa senha para tornar o teste «mais realista», **o controlo negativo
passa a criar uma conta a sério**, e nada no guião o impede.

### As duas notas fecham-se com a MESMA linha

**A guarda contar os utilizadores antes e depois** torna o «131 → 131» um
invariante que corre sempre (nota 1) **e** transforma a segurança da sonda de
convenção em mecanismo (nota 2). Nenhuma delas bloqueia: a cura está provada.


## 07/09 23h05 — o «0 contra 131»: dois contadores certos, e a variável era QUEM pergunta

Eu escrevi, e comitei, que a base de desenvolvimento estava **inteiramente
vazia**. **Está errado.** Verifiquei-o eu, a pedido da explicação dele:

| papel | `select count(*) from users` |
|---|---|
| `bossaos_app` — o do produto, e o do meu `DATABASE_URL` | **0** |
| `bossaos_migrate` — dono da tabela | **131** |

`relrowsecurity = true`, `relforcerowsecurity = false`, políticas
`autenticacao_ve_identidades` e `identidade_propria`. **O dono passa ao lado do
RLS; o papel do produto sem identidade não vê uma linha.**

**Mesma base, mesma tabela, mesma consulta, nenhum erro em lado nenhum, duas
respostas.** Não é o instrumento errado nem o sujeito errado — é uma terceira
variável que nem me ocorreu declarar: **a identidade que faz a pergunta.**

E cometi-o **no tick em que estava a rever alguém por disciplina de medição**,
e escrevi-o como facto sobre cinco tabelas.

### O que ele fez com isto, e é a melhor parte

A guarda conta **pelo papel de migração**, e diz porquê no âmbito: com o papel
do produto o invariante seria **`0 == 0` para sempre** — uma guarda que nunca
poderia falhar. **O meu erro tornou-se a razão documentada da escolha dele.**

### O que verifiquei e o que não

- **Verifiquei:** a guarda corre e passa — `131 → 131`, convite vivo,
  `EMAIL_PASSWORD_SIGN_UP_DISABLED`, saída 0. E a explicação do RLS, papel a
  papel, com a mesma consulta.
- ~~**NÃO verifiquei:** o controlo B dele.~~ **Fechado às 23h15 — ver abaixo.**


## 07/09 23h15 — o controlo B, que eu tinha deixado por verificar

Disse no tick anterior que não tinha refeito o controlo dele — a guarda a
**recusar** quando a população mexe. Um laço aberto por mim, fechado por mim.

**À primeira, falhou-me:** plantei uma linha assim que o servidor respondeu, aos
8 s — **cedo demais**. Caiu *antes* de a contagem inicial ser tirada, e a guarda
viu `132 → 132` e passou.

**Isso é INCONCLUSIVO, não é a guarda a falhar.** A população não mexeu entre as
duas contagens; mexeu antes delas. Se eu tivesse reportado aquele verde como
«a guarda não recusa», tinha acusado uma guarda que funciona — e tinha-o feito
com uma corrida real a apoiar-me.

**À segunda, com o método certo:** a janela é sub-segundo, e contra uma janela
sub-segundo **não se adivinha o instante — aumenta-se a frequência de
amostragem**. Semeei 5 linhas por segundo durante 4 s a partir do arranque:

    SAIDA DA GUARDA = 1
    FALHOU   a PRÓPRIA prova mexeu na população: 137 → 138 utilizadores

**Recusa.** E a base ficou reposta em 131 — plantei com prefixo próprio e apaguei
tudo no fim.

**O invariante da contagem não é decorativo.** Dispara, e diz a coisa certa: não
acusa o produto, acusa **a própria prova** de ter mexido no que estava a medir.

## 07/09 23h25 — a última afirmação por auditar: o isolamento aguenta

Terceira ronda do mesmo método — **quais das minhas afirmações assentam numa
medição só**. A que faltava era a mais consequente depois do registo: eu disse
ao Matheus que a instalação de demonstração tem **senha pública** e que **«não
há lá nada real»**. Isso é, no fundo, uma afirmação sobre **isolamento entre
inquilinos**: se falhar, uma senha pública alcança dados alheios.

**Primeiro fui ver se já estava provado, em vez de construir.** Estava —
`validar-rls.sh`, `provar-isolamento.sh` e `provar-isolamento-no-produto.sh`.
Corri as três:

| guarda | saída | o que mediu |
|---|---|---|
| `validar-rls` | **0** | RLS ligado onde é preciso, e o detector é apanhado a ver uma tabela sem RLS |
| `provar-isolamento` | **0** | 7 grupos, **28 asserções**, sobre dois inquilinos de **nomes parecidos** |
| `provar-isolamento-no-produto` | **0** | **7 casos no navegador, com duas sessões reais** |

**O que as torna boas não é o verde — é o que fazem para o merecer.**

- O controlo negativo da camada da base **desliga as políticas e exige
  vermelho**, e **nomeia quais dos casos medem o RLS** — um vermelho global
  passaria por controlo sem o ser.
- E leva uma asserção de população **dentro** do controlo negativo: *«sem
  política e sem contexto, o runtime vê 2 marcas — a base está viva e cheia»*.
- O da camada do produto planta uma pertença: as **duas recusas por endereço
  caem** (provando que medem pertença) e a **recusa por escopo aguenta**
  (provando que mede outra coisa). Depois repõe, e verifica que **nada ficou
  para trás**.

### E uma coisa que quase me escapou

O `provar-isolamento` devolveu **`NÃO MEDI`, saída 2**, à primeira: versão de
Node errada. **Recusou-se a correr** em vez de ler um relatório que não conhece
e contar zero — e o comentário di-lo: *«uma contagem que não encontra o formato
que espera conta zero, e zero lia-se como tudo bem»*.

**Um `NÃO MEDI` não é uma resposta**, é um adiamento. Corri-o com o Node do
`.nvmrc` e só então tive o verde. Aceitar o 2 como «correu» seria o mesmo erro
que a guarda existe para impedir.

### O balanço das três rondas

Auditar as minhas próprias afirmações deu **um defeito real** — o registo
aberto, que estava no ar — e **duas confirmações**, esta e a das fixtures. A
afirmação aguenta, e agora sei **o que a sustenta** em vez de me lembrar de a
ter feito.

## 07/09 23h35 — a armadilha que eu nomeei voltou a morder, com a cura de segurança dentro

Há dois ticks escrevi: **«nunca nomear um commit numa promessa de publicação»**.
Voltou a acontecer **no mesmo serão** — e desta vez com um defeito de segurança
em jogo.

O pacote que eu preparei às 22h30 era `ccef01b`. Desde então entraram **as duas
alterações de autenticação**. E medi o que está **ao vivo**:

    ocorrências de `disableSignUp` no código publicado: 0

**Se ele autorizasse «o pacote», a cura de segurança não ia.** A porta continua
aberta em produção neste momento.

### E a boa notícia, que fui verificar em vez de supor

Os **portões 1 e 2 correm ANTES da verificação de autorização** — o guião
re-prova sempre, autorizado ou não, e publica `HEAD` por omissão. **O mecanismo
é são.** O risco vivia inteiramente na minha linguagem: só quem for buscar a
referência que eu nomeei publica a versão velha, e a única pessoa a quem eu dei
referências foi ele.

### O pacote novo, verificado por dentro

Re-preparado em `HEAD` (`2cf3dc0`) — portões abertos, saída 0, **recusou
publicar por falta de autorização**. E não fiquei pelo intervalo de commits:

| | |
|---|---|
| `disableSignUp: true` **dentro do tar** | linha 86 de `packages/auth/src/autenticacao.ts` |
| ficheiros | 2183 |
| capturas | 30, os três idiomas |
| com forma de segredo | 1 — `.env.example`, o mesmo de sempre |

**Ler o intervalo de commits diria a mesma coisa e não seria a mesma prova.**
O que vai no ar é o que está no ficheiro dentro do pacote.

## 08/09 00h00 — assinado, e o aviso da minha régua apanhou-me a mim

**Verifiquei correndo**, não lendo: `validar-coral-da-arte` e `validar-precos`
dão saída 0 e **a linha que ele citou está mesmo na saída** — «o coral da arte
não entra em interface», «3 planos, valores em cêntimos inteiros». E os dois
trazem auto-controlo próprio. **Assinado.**

Resultado dele nos 17: **5 por guião, 11 juízo humano, 1 bloqueado por desenho.**
E declarou uma ressalva que ninguém lhe pediu: o `validar-seo` cobre os
metadados por rota e **não** cobre a pendência do `NEXT_PUBLIC_SITE_URL` que o
próprio veredito nomeia. **Um guião que passa não é um critério coberto.**

### A régua avisava contra o meu próprio método, e tinha razão

Eu escrevi na régua que casar palavras com nomes de ficheiro é o instrumento
mais fraco que há — e a seguir apresentei uma amostra feita exactamente assim,
dizendo **«quatro em seis já têm por onde ser re-medidos»**.

Dos meus quatro:

| eu propus | o certo | |
|---|---|---|
| `validar-cobertura` (396 IDs) | igual | **acertei** |
| `validar-seo` (SEO) | igual, com ressalva | **acertei** |
| `provar-planos` (preços) | `validar-precos` | **quase** |
| `provar-identidades` (identidade antiga) | `validar-coral-da-arte` | **errado no sujeito** |

**Metade das minhas correspondências confiantes não resistiu**, e eu tinha-as
dado como «óbvias». O `provar-identidades` é o caso puro: **o nome acertava na
palavra e errava no sujeito** — trata de identidades de **utilizador**, não de
marca.

Ao todo, cinco nomes mentiram-lhe pelo caminho: `validar-assinaturas` (é o
estado `validado` de uma tela, não assinatura visual), `juncao-identidade`,
`dados-ficticios`, `portas-mortas`, `registo-coerente`.

**Escrever o aviso não me imunizou contra o erro que ele descreve.** Escrevi-o
e cometi-o na mesma página. O que valeu não foi o aviso — foi haver **outra
pessoa a correr os guiões**.

## 08/09 00h30 — Fase 1 revista: assinada no mérito, NÃO fechada, e a culpa do que falta é minha

### O que verifiquei correndo, e não lendo

**A aritmética do coral reproduz-se ao número.** Ele encontrou uma contradição
**no próprio norte** — que manda `#F5664D` quando o código tem `#D85A44` — e
mostrou que **nenhum dos dois serve as duas exigências**:

| | L | sobre areia | texto verde por cima |
|---|---:|---:|---:|
| `#F5664D` (o do norte) | 0,2945 | 2,77 | 4,71 |
| `#D85A44` (o do código) | 0,2233 | **3,50** | 3,73 |

Refiz as contas: para 3:1 sobre areia é preciso **L ≤ 0,2684**; para 4,5:1 com
texto verde é preciso **L ≥ 0,2795**. **Os intervalos não se tocam.** Não existe
coral que sirva os dois — e a saída dele não foi inventar um terceiro, foi o
**tamanho do texto**: com texto grande basta 3:1, a janela abre para ≥ 0,1696, e
o `#D85A44` cabe. **O rótulo do CTA é 19 px/700 por uma razão medida, não
estética.**

### O que verifiquei no ficheiro, e declaro que NÃO corri

A sonda existe e é a certa: **repinta todas as secções de areia, reconta os
fundos distintos e exige que a contagem caia a 1** — se o detector não cegar, é
`SONDA-CEGA`. E há `AMBITO` com a população.

**Não a corri ao vivo:** exige `build` e o `mac-health` está em `ATENÇÃO`. Fica
dito, não assumido.

### Fase 1 NÃO fecha, e a razão é minha

**A linha de base continua vermelha, exactamente como estava:** os mesmos 2
testes de UI e o `validar-plantes` a sair 1 com os seis plantes mortos.

Eu escrevi que «a Fase 1 não pode começar por desenhar». **Só que nunca lho
disse.** Registei o vermelho às **00:15** e a entrega da Fase 1 saiu-me por volta
das **00:10** — ele não podia saber, e o que li do trabalho dele mostra que teria
tratado disso primeiro se soubesse.

**A consequência mantém-se independentemente da culpa:** a Fase 2 vai afirmar
«sem regressão», e não há verde de onde partir.

### O portão antes da Fase 2

1. registar os cinco tokens no `fichas.ts`;
2. justificar (ou trocar) o acento em `estilos.css:1714`;
3. **ressuscitar os seis plantes** — são controlos negativos mortos, e um plante
   morto *«não prova nada e ACUSA o produto»*.

## 08/09 00h45 — o portão verificado: três de quatro fechados, e o quarto é o mais fino

Verifiquei **correndo**, e a aritmética **refazendo**:

| | antes | agora |
|---|---|---|
| testes de UI | 41 passam, **2 falham** | **43 passam, 0 falham** |
| `validar-plantes` | saída 1, seis plantes mortos | **saída 0** — `319 plantes ainda pegam`, 0 em letra morta |
| `validar-silenciadores` | saída 1 | **saída 0** — 149 guiões lidos |
| `validar-suites-com-guiao` | saída 1 | **saída 1** — duas suites |

### A decisão do acento é dele e está certa — refiz as contas

Ele **não trocou** para o `--bo-acento-sinal`, e a razão é medida: no
`.bo-mkt__fecho`, que é **verde**,

| | sobre verde |
|---|---:|
| acento da marca `#F5664D` | **4,71** — passa os 4,5 |
| token de sinal `#D85A44` | **3,73** — falha |

**Trocar teria partido exactamente o que a guarda quer proteger.** O token de
sinal existe para ganhar sobre a **areia**; sobre o verde perde. E ele escreveu
no comentário o que a guarda não sabe distinguir: **a superfície** — ela pergunta
pelo token, não por cima de que fundo ele assenta.

### E ele diz que cinco dos sete plantes eram dele

Rastreou-os a duas alterações próprias — o `h1 data-tela` que mudou de casa com a
consolidação do `CabecalhoDePagina`, e o `icone`/`grupo` que a barra lateral
acrescentou às entradas de navegação — e escreveu *«eu não corri esta guarda»*.
**Isso é o que faz uma revisão valer alguma coisa.**

### O quarto, que fica, e é o mais fino de todos

`validar-suites-com-guiao` acusa **duas suites que ninguém nomeia**:
`caminho-da-demo.spec.ts` e **`ns2-visual.spec.ts`**.

A frase da guarda é a melhor do dia: *«uma suite assim não dá verde nem
vermelho: **desaparece**.»*

E a segunda é **a guarda da Fase 1 dele próprio** — a que prova o sistema visual
do norte. **A prova da direcção artística está ela mesma sem prova**: podia
deixar de correr amanhã e nada o diria. É a mesma família da armadilha do
Playwright que ele apanhou há uma hora, em que um ficheiro de teste era ignorado
em silêncio por um padrão não ancorado.

Ele já está a escrever os dois guiões — `validar-caminho-da-demo.sh` e
`validar-sistema-ns2.sh` estão na árvore por comitar. **Não interrompo.**

## 08/09 00h50 — FASE 1 FECHADA, e a linha de base está a zero

Verifiquei **as quatro falhas uma a uma**, correndo:

| | antes | agora |
|---|---|---|
| testes de UI | 41/2 | **43 passam, 0 falham** |
| `validar-plantes` | saída 1, 7 mortos | **0** — `319 plantes ainda pegam` |
| `validar-silenciadores` | saída 1 | **0** — 149 guiões |
| `validar-suites-com-guiao` | saída 1 | **0** — 35 nomeadas, 11 por desenho, 8 de dívida com tecto 8 |

### E fechei a coisa que eu tinha declarado por verificar

No tick anterior escrevi que não corri a prova da Fase 1 ao vivo. **Corri agora**,
pelo corredor que ele escreveu:

    validar-sistema-ns2   saida=0
    AMBITO seccoes=5 bento=4 mesas=6 falhas=0

**5 secções, 4 áreas de bento, 6 mesas, zero falhas** — população declarada, e a
suite mede a página renderizada.

### O corredor não é um nome para calar o acusador

Desconfiei de dois ficheiros de 8 linhas no `--stat` e fui lê-los: as 8 linhas
eram **o diff**, não o ficheiro. O corredor tem três valores, verifica porta
ocupada, suite ausente e `POPULACAO-ZERO`, e **distingue «o servidor não
arrancou» de «a suite reprovou»** — com um comentário a dizer porquê: *«foi assim
que esta guarda ficou vermelha contra o HEAD, num checkout sem build»*. **Ele já
tinha apanhado o falso-vermelho sozinho.**

### O que NÃO corri, e porquê

**O `validar-no-commit` inteiro.** O `mac-health` está em `ATENÇÃO` com **101 MB
livres** e 5 agentes, e esta máquina teve quatro kernel panics sob carga. Corri
as quatro falhas **individualmente**, que é a diferença que estava em causa —
mas não é a mesma coisa que a suite completa, e digo-o em vez de o disfarçar.

**Fase 1 fechada. Fase 2 libertada.**

## 08/09 00h55 — a fita métrica da revisão, calibrada antes de servir

A folha dos catorze números era **um documento**. Quando a Fase 2 aterrar eu vou
querer medi-los num comando, não voltar a sondar à mão. `scripts/medir-norte.mjs`.

**E não é uma guarda.** Mede e relata; não recusa nada, não devolve código de
saída com significado e não entra no `validar-no-commit`. A guarda que fecha o
portão da Fase 2 é do JR e mede a página que **ele** construir. Isto é a fita de
quem revê — **e quem revê não assina o que constrói.**

### Calibrei-a antes de a usar, e é por isso que se pode acreditar nela

Apontei-a à landing em produção, cujos valores eu já tinha medido **à mão** uma
hora antes. Devolveu **os mesmos**: H1 52, H1 móvel 34, H2 26, lead 16, cabeçalho
102, logótipo 145, herói 759, captura 588, 13 secções, 7103 px e 10 689 no
telemóvel.

**Um instrumento novo aponta-se primeiro a um sujeito de resposta conhecida.**
Hoje enganei-me várias vezes por não o fazer — a varredura das guardas cegas, a
lista de candidatos por nome de ficheiro, a contagem que dizia zero por causa de
códigos de cor.

### E deu um número que eu não tinha

**Fundos distintos: 2**, contra um alvo de ≥ 3. O primeiro ponto da lista de
reprovação — «fundo areia em todas as secções» — deixa de ser uma frase e passa
a ser **2 contra 3**.

### O que fica por fazer da Fase 0

**0.4 — capturar «Mesas em tempo real»**, o «antes» da segunda tela-mestre.
Continua por fazer: exige sessão e `build`, o JR está a construir a landing, e a
máquina está em `ATENÇÃO`. **Declarado, não esquecido.**

## 08/09 01h00 — a landing da Fase 2 entregue, e uma discrepância que corrige os dois

Ele entregou a primeira metade e passou às Mesas. Revi o que está comitado sem o
interromper. **Os dez números que ele declara ainda não os verifiquei**: exigem
`build` e servidor, ele está a construir a segunda metade e a máquina esteve em
`ATENÇÃO`. Ficam por medir, declarados.

### Mas um deles discordava do meu, e o desacordo era o achado

Ele escreve **«fundos distintos 1 → 4»**. A minha fita mediu **2** no «antes».
Discordávamos sobre o **antes**, não sobre o depois — e fui ver, à espera de ser
eu o errado.

    12 secções  rgba(0, 0, 0, 0)   transparentes sobre a areia do body
     1 secção   rgb(16, 46, 53)    verde profundo — «Media hora, con tu carta delante»

**A escura não é o rodapé** — verifiquei, `rodape=nao`. É o **CTA final**, e já
estava em verde profundo antes de qualquer redesign.

**Correcção dos dois lados:**

- o «antes» dele está errado: são **2**, não 1, e o delta honesto é **2 → 4**;
- **a minha frase também estava larga.** Escrevi que isto quantificava «fundo
  areia em todas as secções». Não são todas: são **12 de 13**.

Não é um número grande, mas é o tipo de coisa que **infla um resultado** — e a
mudança real que o norte pede não é «a página deixa de ser monocroma», que já
não era: é **o herói deixar de ser areia**, que é outra afirmação e mais difícil.

### O que ele resolveu e vale a pena reter

**O H2 não era um valor errado: era ESPECIFICIDADE.** O `.ns-titulo` saía a 20 px
porque `.bo-publico h2` é (0,1,1) e `.ns-titulo` é (0,1,0) — **perde por
construção, esteja onde estiver no ficheiro**. E curou empatando com
`h2.ns-titulo` e ganhando por ordem, **sem `!important`** — porque o
`!important` *«ganhava a discussão e escondia que a folha tem duas famílias a
disputar o mesmo h2»*.

E declarou um erro próprio: mediu **três vezes** um servidor que não era o que
tinha construído — sete `next-server` vivos e o `next start` a falhar em silêncio
para o log. **É o mesmo erro que eu cometi hoje com a imagem do Docker.**

## 08/09 01h30 — PARADO em dois sítios ao mesmo tempo, e os dois precisam do Matheus

### O que está feito da Fase 2

| | commit |
|---|---|
| a landing reconstruída | `b41cdc4` |
| Mesas em tempo real, de lista a **mapa** (condição 9) | `8d2b2c0` |
| as **onze** condições de reprovação que se medem, a verde | `609a600` |
| o CTA do herói que estava **verde sobre verde** | `3096b78` |

### O que verifiquei desta última, e é a melhor da noite

**1,00:1 confirmado** — verde `#102E35` sobre verde `#102E35`. O CTA do herói
estava literalmente invisível.

**E a frase que o explica é a tese do dia inteiro:** *«não havia contradição
entre medições — eu é que nunca tinha medido a landing.»* O teste do CTA media a
**página interna**, onde a regra que estraga isto não existe. **Duas medições
que não se contradizem porque nunca foram sobre o mesmo sujeito.**

A causa é `.bo-publico .bo-botao--primario` (0,2,0) a pintar a acção com o
**tema público** — o canal que o restaurante configura na sua carta. Certo lá,
sequestra o botão aqui. **Mesma família do anel de foco do KDS.**

E verifiquei a segunda metade: sobre o coral o melhor que existe é **3,84**
(branco) e o verde-escuro dá **3,73**. **Nenhuma cor de texto passa 4,5 sobre
coral.** A 1.4.3 pede 3 para texto grande e o CTA é 19 px/700. **Um limiar que
nenhuma escolha satisfaz não mede: proíbe.**

### Os dois bloqueios

**1 · O JR está a 100 % de contexto** desde as 01h27. Não pode continuar, e
faltam-lhe as duas capturas das Mesas, os testes ES/PT/EN, contraste, foco,
teclado, zoom, conteúdo longo, o preview publicado e a resposta dos sete pontos.
**Retomá-lo é um clique no canvas — não é coisa que eu possa fazer.** O
`RETOMAR-JR.md` está actualizado até ao último commit dele.

**2 · A máquina está em `ATENÇÃO`** com **129 MB livres** e 5 agentes. Não posso
construir para verificar os dez números da landing com a minha fita — e esta
máquina teve quatro kernel panics sob carga.

**Portanto: os números da Fase 2 continuam por verificar da minha parte, e digo-o
em vez de os repetir como se fossem meus.** O que está assinado é o que medi
sozinho: a aritmética do coral, a do acento, o 1,00:1 do herói e o limiar
insatisfazível.

---

## Fase 2 fechada — 08/09, commit `7e072ac`

O JR voltou e fechou a lista. **As seis capturas estão feitas** e o portão
`validar-no-commit` está a **0 falhas sobre o commit**.

### O que a imagem apanhou e o número não

As duas capturas que faltavam obrigaram a olhar, e olhar devolveu **três
defeitos com todos os números do norte verdes**. Não é anedota: é o mesmo padrão
do CTA verde-sobre-verde de ontem, três vezes seguidas no mesmo dia.

**1 · As mesas saíam em azul sublinhado.** A `.ns-mesa` é um `<a>` e a regra
declarava geometria sem declarar cor — o navegador decidiu por ela. **A linha
769 deste mesmo ficheiro já tinha o comentário a descrever exactamente isto**,
escrito noutro dia por outro motivo. O JR repetiu-o e diz que o repetiu.

**2 · A sala não mostrava UMA mesa na primeira viewport de 390.** As sete
pastilhas empilhavam-se e comiam o ecrã inteiro — num ecrã que um empregado abre
de pé. Curado com uma classe própria, `.ns-sala-nav`, e **não** na
`bo-publico__seccoes`: essa está em dezanove sítios e mexer nela era propagar
para a carta pública e o KDS.

> A cura levou **duas tentativas, e a primeira estava errada**. `min-width: 0`,
> computado a `0px`, barra na mesma nos 789. Não era a pista — a `.bo-pagina` já
> tem `minmax(0, 1fr)`. Era o **`margin: 0 auto`** da regra-base: um item de
> grelha com margem automática deixa de esticar e passa a ser dimensionado pelo
> conteúdo. Foi a medição da cadeia de ascendentes que o disse, depois de a
> primeira hipótese ter ficado verde no computado e vermelha no ecrã.

**3 · A landing partia o `larguras.spec.ts`** — que já existia — em três textos
sobre coral: **3,73, 3,73 e 2,45 contra 4,5**. Sobre coral o 4,5 não existe (o
tecto é 3,84 com branco e 3,73 com o verde). Não há cor que salve; só há sair de
cima do coral. Disco do passo invertido (verde com anel coral), nota da secção
com superfície própria, lead do fecho fora do painel. **Nenhuma régua foi tocada
para isto ficar verde** — e o C6 do coral, que caiu a 7,2 % com as curas, voltou
aos 8,2 % pela folga do painel, não pelo limiar.

### O que passou a estar medido, e não estava

| medição | antes | agora |
|---|---|---|
| primeira mesa dentro da dobra | não existia | medida, com controlo negativo que encolhe a dobra até a régua ter de acusar |
| as duas referências em es-ES, pt-BR e en | **nenhuma suite visitava o `/floor`** | 12 combinações medidas, 12 esperadas |
| zoom a 200 % (1.4.10) | não existia nestas telas | 0 px de corte nas duas |
| conteúdo longo | media-se sobre uma sala já partida | 73 caracteres injectados, 0 px de corte |
| foco e teclado | população sem o `/floor` | 40 elementos alcançados, **0 sem anel** |
| contraste da tela Mesas | fora da população | `SALA-mesas` entrou no `superficies.spec.ts` — **12 superfícies, 12 medidas, 0 maus** |

O contraste da tela nova entrou no motor que já existia em vez de ganhar um
segundo: **duas opiniões sobre a mesma pergunta concordam até ao dia em que
discordam** — e foi exactamente o que se viu aqui, com o `superficies` a passar
a landing e o `larguras` a reprová-la no mesmo build.

### Duas guardas que ficaram vermelhas por causa da Fase 2

- **Plante em letra morta:** o `provar-host-no-navegador.sh` ancorava numa linha
  que a reescrita da sala apagou. Reancorado na **lógica** (a derivação do estado
  reservado), não na linha. 319 plantes pegam.
- **Três suites que não eram nomeadas por guião nenhum** — não davam verde nem
  vermelho, **desapareciam**. Correm dentro do `validar-sistema-ns2.sh`, que
  passa a nomear as quatro em dois projectos, e estão declaradas com a razão do
  `expansao.spec.ts` (a descoberta só varre `provar-*.sh`, por desenho).
- E as quatro capturas da landing eram **irreproduzíveis** — guião de uma vez,
  feito à mão. Passam a suite, no projecto **sem sessão**, porque com sessão o
  cabeçalho troca a chamada e a captura deixa de ser a que o visitante vê.

### O que fica levantado e NÃO decidido por mim

1. **O nome do hóspede no cartão da mesa é um email** (`inspeccao@exemplo.example`
   na semente). Em produção é o nome de uma pessoa, num ecrã que fica virado para
   a sala. É decisão de produto, não minha.
2. **A 390 o mapa fica numa coluna.** Cabem duas a 140 px, mas «insp-08 junto a
   la ventana» parte-se em três linhas. Escolhi legibilidade; é reversível numa
   linha e a escolha é discutível.
3. **Seleccionar uma mesa não abre gaveta lateral** — continua a navegar. O §8
   fala de mapa, não diz o que a mesa abre.
4. **Verde a 32,0 %** contra os 35–45 % que o norte dá como orientativos.

### Estado da máquina

`ATENÇÃO` durante todo o lote (≈5 GB disponíveis, swap 1,36 GB). Os builds
correram com cache quente, 12–50 s cada, e nenhum lote pesado foi subido. Sem
kernel panic.

### O que continua por medir, e é dito

No checkout do portão as 13 guardas de navegador dão **NÃO MEDI** — não há build
lá dentro, e é o comportamento correcto delas. **Foram corridas na bancada e
estão verdes ali**: 95 testes verdes na bateria NS2 mais `larguras`, `foco` e
`sala`. Verde na bancada não é verde no portão, e a diferença fica escrita.

## 08/09 02h40 — a lista dele actualizada, e a coisa com pressa posta em primeiro

O portão está emitido e a Fase 3 está bloqueada na Nathalia. **Pendência
registada.** O que avança sem ela é a lista do Matheus, que estava das 22h00 e
não sabia nada da noite do North Star.

**Passou de 16 para 20**, e mudei a ordem por uma razão: **há uma coisa em aberto
no ar e as outras dezanove não têm pressa.**

### O item 00, e é o único urgente

**A porta de registo continua aberta em produção.** Verifiquei agora: o código
publicado tem **zero** ocorrências de `disableSignUp`. Encontrei às 22h30; são
02h40. **Quatro horas.** E há **16 commits ao produto** por publicar, dos quais
este é um.

Pu-lo **acima** de tudo o resto e numa secção própria, porque numa lista de vinte
coisas o que importa não é estar lá: é ser encontrado. **Uma coisa urgente
enterrada no meio de dezanove que não têm pressa é uma coisa que ninguém lê a
tempo.**

### As três que a noite acrescentou

- **17** — o North Star pronto, e **a decisão é da Nathalia**, não dele; o que
  lhe cabe é encaminhar.
- **18** — o email no mapa de mesas, que vem do `sala.ts` e **não do redesign**.
- **19** — os treze cantos a 10 px.
  > **Curado em `b52fc14`, depois de esta lista ser escrita.** Zero abaixo de
  > 14 px no marketing, 18 mantidos no painel — a cura foi por âmbito e a
  > contenção é medida. **Não vale a pena o Matheus abrir este.** Registo-o aqui
  > em vez de riscar o item: quem o fecha é quem o abriu.

### E corrigi um número podre meu

A introdução dizia **«aqui estão as dezasseis»** com vinte itens na página, e
tinha uma frase duplicada da edição anterior. **Um número num texto meu que
apodreceu em quatro horas** — a mesma coisa que passei a noite a apanhar nos
outros. Corrigido antes de publicar, não depois.

---

## O décimo quarto número, e uma suite que estava morta — 08/09

A revisão do sénior (`d257b2a`) encaminhou um achado pequeno e verdadeiro: **o
§3.3 pede cantos entre 14 e 24 px nas áreas de marketing e havia treze elementos
a 10 px.** Está curado, e curar levantou uma coisa pior.

### Os cantos

Os treze eram **botões e ligações, não cartões**, e vinham todos do
`--bo-raio-controlo: 10px` — que tem **dezassete usos** na folha. Mudá-lo na raiz
arrumava a landing e mexia nas 396 telas do painel. **A cura é por âmbito:**

    .bo-publico--comercial { --bo-raio-controlo: var(--bo-raio-cartao); }

Uma linha. 16 px, não 20, porque é o mesmo raio do cartão e assim o botão e o
cartão concordam na área de marketing. **E não é cápsula de propósito** — o §3.3
diz, duas linhas abaixo, «não use pílula para toda navegação ou botão».

**Uma cura por âmbito só está certa se o âmbito segurar**, e isso é medido:

    CANTOS marketing  comRaio=26  abaixoDe14=0
    CANTOS painel     comRaio=29  abaixoDe14=18

As duas metades correm no mesmo teste e pinam o detector **nos dois sentidos**:
um detector cego falhava a segunda linha, um detector preso falhava a primeira.
Se as duas ficarem iguais, o token vazou — e a mensagem do teste di-lo.

### A fita passou a julgar

O `ALVO.raio:[14,24]` estava no `medir-norte.mjs` **desde o início e nunca era
lido**: a fita imprimia a contagem dos raios e nunca a julgava. Treze elementos
passaram por baixo de doze linhas verdes. Agora há veredicto e há os nomes — é a
nota do próprio sénior aplicada ao instrumento dele: *imprimir um número não é
verificá-lo.*

Os outros doze números não se mexeram com a cura: cabeçalho 78, herói 790,
captura 741, blocos 7, altura 5477, fundos 4, telemóvel 9867.

### E a `marketing.spec.ts` estava morta há um dia

Detalhe em `docs/reviews/ACHADO-MARKETING-SEM-CORREDOR.md`. Resumo: a Fase 2
trocou `.bo-mkt__heroi` por `.ns-heroi`, o marcador vive **dentro do `visitar`**,
e por isso **sete testes rebentavam antes de medir** — transbordo em cinco
larguras, elementos fora do ecrã, alvos de 44 px, contraste a 360 e a
alcançabilidade das oito páginas. Nada disso corria.

Reancorado nos dois sítios (o segundo estava cravado à mão dentro do teste e
sobreviveu ao primeiro reancoramento). **68 verdes**, e as cinco verificações
voltaram a correr.

**O que fica por decidir e não é meu:** a suite continua sem corredor, na
`EM_DIVIDA` com tecto 8. Acrescentá-la ao `validar-sistema-ns2.sh` seria mentir
sobre o âmbito — essa guarda é do norte e a `marketing.spec.ts` cobre oito telas.
**O tecto fica em 8 e a dívida fica declarada.**

### Estado

Máquina em **ATENÇÃO** durante todo o lote (5030 MB disponíveis, 751 livres, swap
1,35 GB). Dois builds completos, um servidor de cada vez, sem lote de agentes.

---

## A recaptura das três da sala está BLOQUEADA — 08/09

Detalhe em `docs/reviews/ACHADO-NINGUEM-NASCE.md`. Resumo, porque muda o
primeiro item da lista do Matheus:

**Fechar o registo tirou a única porta por onde nasce uma conta.** Medido no
servidor, com o controlo primeiro: `sign-up/email` dá **400
`EMAIL_PASSWORD_SIGN_UP_DISABLED`**, `convites/aceitar` dá **401 `sem_sessao`**,
e nada no repositório insere em `accounts` — os dois ficheiros que a nomeiam só
apagam. **Quem nunca teve conta não consegue usar o convite dele.**

O capturador da demonstração cria a conta a cada corrida (a limpeza apaga-a de
propósito, com as credenciais do better-auth), e por isso reprova a 400. **O
sintoma é meu e a causa também.**

**As três da sala continuam por refazer** e a `validar-capturas-de-marketing`
continua vermelha com as 24 anteriores à fonte. Não forcei passagem: as três
saídas — reabrir o registo, escrever a credencial por SQL contra o contrato do
`schema.prisma:465`, ou deixar a conta viva enfraquecendo o controlo 4 do
`provar-demonstracao.sh` — são decisões da revisão, não minhas a meio de uma
recaptura.

O resto do `provar-demonstracao.sh` está verde: semeadura determinista com
controlo negativo, KDS nos três idiomas, e a limpeza devolveu a base ao que era
(`2/3/3/0/0/131` antes e depois).

Máquina em **OK** durante o lote (5054 MB disponíveis).

## 08/09 03h00 — a lista dele tem prazo, e agora di-lo

O JR anotou que o **item 19** da lista do Matheus — os treze cantos a 10 px — já
estava curado. Fui à cronologia antes de aceitar, porque a acusação era sobre um
artefacto meu:

| | |
|---|---|
| o meu achado | **02:20** |
| a lista publicada | **02:35** |
| a cura dele | **02:41** |

**A lista estava certa quando saiu.** Ele escreveu «já estavam curados quando ela
foi lida», e isso ainda não aconteceu — ninguém a leu. **Morreu seis minutos
depois de eu a publicar**, não antes.

**Mas o essencial dele está certo e é o que conta:** quando o Matheus a abrir de
manhã, o item 19 estará morto há horas. **A precisão da minha correcção não
salva o leitor.**

### O que fiz, e porquê assim

- **O item 19 fica à vista, riscado e anotado**, não apagado: *«escrevi-o às
  02h35 e morreu às 02h41, e riscá-lo esconderia que esta lista tem prazo.»*
- **A lista ganhou um aviso de prazo no topo**, antes de tudo: diz quando foi
  escrita, diz que continuámos a trabalhar depois, e diz a frase que interessa —
  **«se algo aqui já não bater certo, é porque avançou, não porque estava
  errado.»**

### A coisa que isto ensina, e é nova

Passei o dia a tratar a validade da prova contra **o commit**. Este caso é outro:
**um artefacto escrito para alguém que está a dormir tem validade medida contra a
hora a que essa pessoa acorda**, e nós continuamos a trabalhar nesse intervalo.

**Seis minutos de validade.** Não é o artefacto que apodreceu depressa — é que
estamos a produzir mais depressa do que ele consegue ser lido.

## 08/09 03h10 — RETIRO a recomendação de publicar, e o erro é meu

O JR foi refazer as capturas da sala e **travou**: o capturador reprova a 400 na
inscrição, porque a conta que ele cria a cada corrida nascia pelo `sign-up/email`
que **eu** mandei fechar.

Seguiu o sintoma e o achado é maior. **Verifiquei-o antes de aceitar**, e com um
autoteste ao detector:

| | |
|---|---|
| ficheiros que criam conta ou credencial, no repo | **ZERO** |
| plugins do `better-auth` | só `twoFactor` — **não há plugin de organização** |
| o que `aceitarConvite` faz | dá **pertença**, a uma conta que já tem de existir |

**A cadeia fecha-se sobre si própria.** Com o registo fechado, **não há porta
nenhuma** para uma pessoa que ainda não tem conta — nem a do convite, porque o
convite não a cria.

### O erro é meu e está escrito na minha própria régua

O `ALVO-REGISTO-ABERTO.md`, item 3: **«o convite não pode partir.»** Verifiquei-o
com um pedido à rota `/api/convites/token-falso`, vi-a responder, e declarei o
fluxo intacto.

**A rota nunca partiu. Partiu o degrau anterior a ela.** Medi a rota e declarei o
caminho — a mesma frase que passei a noite a dizer aos outros.

### E o que isto revela é maior do que o erro

**A porta aberta era portante.** Ninguém a desenhou como caminho de entrada — era
um buraco de configuração — **mas era por lá que uma pessoa convidada arranjava
conta antes de aceitar o convite**. O produto diz-se «só por convite» e o convite
nunca soube criar contas: funcionava **por causa do buraco**.

**Fechar um buraco que era load-bearing exige dar-lhe substituto**, e o
substituto é de produto: **o convite passar a criar a conta.**

### O que fiz já

- **Retirei a recomendação de publicar** do item 00 da lista do Matheus, com a
  razão e com a admissão de que estava errado às 02h35.
- **Produção continua com a porta aberta** — o risco de hoje mantém-se, e
  publicar como está seria pior: fechava a entrada de qualquer cliente novo.

**As três saídas que o JR nomeou são da revisão e ele não as tomou a meio de uma
recaptura. Foi a decisão certa.**
