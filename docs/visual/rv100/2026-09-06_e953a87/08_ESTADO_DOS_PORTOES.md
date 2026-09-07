# Os cinco portões do §12 — o que está medido e o que não está

> Escrito enquanto as telas-mestre são capturadas, para que a decisão de emitir
> `PRONTO PARA APROVAÇÃO VISUAL HUMANA` assente num mapa e não numa impressão.
>
> **Três respostas, não duas:** conforme, não conforme, **não medido**.

---

## §12.1 — Portão de marca · 6 critérios

| critério | estado |
| --- | --- |
| logo e ícone aprovados usados correctamente | **conforme** — assinatura `145×50` ligada (era `81×28` solta); `app/icon.png` vem do ícone aprovado |
| identidade reconhecível sem depender só do wordmark | **MEDIDO EM PARTE** |
| coral, verde-lima, verde-escuro e superfícies com funções consistentes | **parcial** — o coral ganhou função em 5 páginas, numa secção escura onde cumpre as três obrigações. **O verde-lima não o medi** |
| tipografia, espaço, raios, bordas e movimento tokenizados | **conforme** — verificado número a número contra o manual na secção 3 |
| não existe identidade antiga ou paralela | **conforme** — os dois corais são um sistema com fronteira medida no ADR 0001, e escrevi a guarda que a mantém |
| tema Starter e personalização respeitam limites | **conforme** — o ecrã desce o botão a secundário e é o servidor que recusa |

## §12.2 — Portão comercial · 8 critérios

| critério | estado |
| --- | --- |
| LP mostra o produto real e a proposta **numa viewport** | **parcial** — cinco composições ligadas e o herói a 1256, mas «numa viewport» é um limite de altura que **não medi** |
| as seis páginas têm conteúdo suficiente | **conforme** — todas reconstruídas com revisão escrita |
| preços vêm da fonte aprovada | **conforme** — `precoDoPlano()`, nada à mão |
| CTAs com hierarquia e destinos funcionais | **parcial** — resta **um** `href="#"` em 419 ficheiros, na maqueta da pré-visualização (P3) |
| não há prova social ou promessa inventada | **conforme** — **zero números** em toda a superfície comercial |
| ES, PT e EN completos | **conforme** — 2402 chaves × 3, com guarda |
| SEO e partilha configurados | **conforme, com uma pendência de produção**: o `NEXT_PUBLIC_SITE_URL` não está definido, e sem ele os canónicos apontam para `localhost` |
| footer institucional completo para o estado real | **conforme** — 11 ligações, e **sem rotas inventadas**: termos e cookies não existem e não se ligam |

## §12.3 — Portão de usabilidade · 6 critérios

| critério | estado |
| --- | --- |
| shells diferenciam as cinco superfícies | **conforme** — alvos de toque por superfície, 44 no público e 48 na operação |
| tarefas frequentes rápidas e claras | **NÃO MEDI** |
| touch, teclado, foco, zoom e conteúdo extremo | **parcial** — acessibilidade dinâmica conforme em 3 superfícies **públicas**; as **com sessão ficam declaradas como dívida**. Expansão de texto conforme em 281 ecrãs; alergénios extensos conforme |
| loading, empty, error, offline, denied, upgrade coerentes | **conforme** |
| KDS legível à distância e Staff com uma mão | **parcial** — o KDS tem tipografia própria de 18 px e alvos de 48; **«uma mão» não medi** |
| não há regressão de comportamento | **conforme** — `marketing.spec.ts` 65/65 com população inteira |

## §12.5 — Portão de cobertura · 6 critérios

| critério | estado |
| --- | --- |
| telas-mestre aprovadas propagadas | **bloqueado por desenho** — é a secção 8, depois da aprovação |
| 396 IDs rastreados | **conforme** |
| 792 composições capturadas ou justificadas | **não conforme — 0 de 792.** Mapeado: 120 alcançáveis por URL, 202 exigem estado, 16 provocam-se |
| não há P1/P2 visual aberto | **conforme** — zero abertos nos 22 achados |
| P3 aceite com decisão, responsável e prazo | **satisfeito por ausência, com a população provada** |
| testes e build passam no commit final | **conforme** — `validar-no-commit.sh` verde contra o commit |

---

## O que isto diz sobre o `PRONTO`

**Quatro critérios estão por medir** — identidade sem wordmark, tarefas
frequentes, «uma mão» no Staff, e a decisão dos P3 aceites — e **quatro estão
parciais** com a parte em falta nomeada.

**E um está não conforme e é estrutural: as 792.** Mas esse **não bloqueia o
`PRONTO`** — o §12.5 é o portão de **cobertura**, e o §8 diz que a propagação e as
capturas vêm **depois** da aprovação humana. Capturá-las antes seria fotografar
telas que a aprovação ainda pode mandar mudar.

**O que o `PRONTO` exige é o §7.1**, e é uma lista curta: as seis implementadas,
testes corridos, preview verificável, `02_MASTER_SCREENS_REVIEW.md`, e a
evidência indexada.

**Este documento é parte dessa indexação, e existe para que o que falta esteja
escrito antes de eu emitir seja o que for.**


## A identidade sem o wordmark — o que foi medido a 07/09

**Medi o canal que é mensurável: o acento.** Contagem de píxeis nas 25 capturas
dos mestres, à resolução nativa, com **controlo positivo** (uma mancha de
`#F5664D` dá 100%) e negativo (branco dá 0%).

| superfície | usa `Wordmark`? | acento nos píxeis |
| --- | --- | --- |
| M01/M02 marketing | **sim** | 586 px — compatível com o próprio ficheiro do wordmark |
| M03 backoffice, principal | **não** | **0** — e continua 0 às tolerâncias 90 e 150 |
| M04 Staff · M05 KDS | **não** | 214–408 px, sinal que cresce suavemente com a tolerância |
| M06 carta pública | **não** | **0** — idem |

**O que isto prova a favor do critério:** no Staff e no KDS o acento está lá
**sem haver wordmark nenhum** — nessas superfícies a identidade não depende dele.

**O que isto deixa por responder:** no backoffice e na carta pública não há
**nem uma coisa nem outra**. O que essas telas carreguem de identidade não é o
acento, e eu não o medi — tipografia, espaçamento e forma também a carregam.

**Fica assim, e é deliberado: eu não fecho este critério.** «Reconhecível» é um
juízo humano e é do Matheus, na aprovação visual. O que eu entrego é o facto que
ele não tinha: **duas das seis telas-mestre não têm acento nenhum.** Se isso é a
calma que um backoffice quer, ou identidade a faltar, decide ele a olhar.


## O critério dos P3 aceites — satisfeito por ausência, e a ausência é provada — 07/09

Um critério sem sujeitos passa por não ter nada que o viole, e é aí que mora o
verde vazio. Por isso não o escrevo como «conforme» seco: escrevo a população.

**A partição fecha.** 24 achados = **9 P1 + 8 P2 + 6 P3 + 1 P4**, e a soma bate
com o total. Os seis P3, um a um: `RV100-014`, `-016`, `-017`, `-018`, `-019`
corrigidos, `RV100-022` MEDIDO. **P3 aceites: zero.** O critério não tem sujeitos
— não porque uma busca não devolveu nada, mas porque a lista inteira foi contada
e cada P3 tem um estado que não é `accepted`.

**E o que a letra deixa de fora, digo à mesma:** há **um** achado aceite, o
`RV100-020`, e é **P4**. Tem decisão registada — «a correcção é no atlas, e quem
o assina é que a faz» — o que nomeia um responsável **por função e não por
pessoa**, e **não tem prazo nenhum**.

Pela letra, não conta: o critério fala de P3. Pelo espírito, é exactamente o caso
que ele quer cobrir. **Não o resolvo sozinho por duas razões:** o dono é quem
assina o atlas, e um prazo é um compromisso — nenhuma das duas coisas é minha
para inventar. **Fica para o Matheus, nomeada, e não escondida atrás de um
critério que tecnicamente passa.**
