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
| coral, verde-lima, verde-escuro e superfícies com funções consistentes | **NÃO PASSA.** MEDIDO a 07/09 15h25, e **não é consistente** — «activo» tem **duas cores**: a barra do backoffice usa `--bo-realce` (lima `#DDEA91`) e a navegação pública e do Staff usa `--bo-navegacao-activa`, que resolve para `--bo-acento-sinal` (coral `#D85A44`). Uma função, dois tokens, duas cores. Píxeis: lima em M01 **1294**, M02 ~420, M03 **72**, e **zero** em Staff, KDS e carta |
| tipografia, espaço, raios, bordas e movimento tokenizados | **conforme** — verificado número a número contra o manual na secção 3 |
| não existe identidade antiga ou paralela | **conforme** — os dois corais são um sistema com fronteira medida no ADR 0001, e escrevi a guarda que a mantém |
| tema Starter e personalização respeitam limites | **conforme** — o ecrã desce o botão a secundário e é o servidor que recusa |

## §12.2 — Portão comercial · 8 critérios

| critério | estado |
| --- | --- |
| LP mostra o produto real e a proposta **numa viewport** | **MEDIDO a 07/09 17h00 e CONFORME** — a 1440×900: `h1` em **370–541**, e os dois CTA do herói («Pedir una demo», «Ver el producto») em **613–657**, todos **dentro da dobra de 900**. A página inteira tem 7103 px e os outros 7 CTA vivem nas secções abaixo, que é o que se espera |
| as seis páginas têm conteúdo suficiente | **conforme** — todas reconstruídas com revisão escrita |
| preços vêm da fonte aprovada | **conforme** — `precoDoPlano()`, nada à mão |
| CTAs com hierarquia e destinos funcionais | **parcial** — resta **exactamente um** `href="#"` em todo o código, na maqueta da pré-visualização de tema (P3), medido às 12h30 de 07/09. O «em 419 ficheiros» que aqui estava já era falso: são 739. O número que sustenta o veredicto é o **um**, e esse mantém-se |
| não há prova social ou promessa inventada | **conforme** — **zero números** em toda a superfície comercial |
| ES, PT e EN completos | **conforme** — e o veredicto assenta num INVARIANTE e não num retrato: *as três têm exactamente as mesmas chaves*, imposto por `validar-tres-linguas.sh` (verde às 12h32 de 07/09, com controlo negativo por dentro). O retrato de hoje é 2595 cadeias em cada uma — estava aqui «2402», que era verdade quando foi escrito. Um invariante não apodrece; um retrato apodrece |
| SEO e partilha configurados | **conforme, com uma pendência de produção**: o `NEXT_PUBLIC_SITE_URL` não está definido, e sem ele os canónicos apontam para `localhost` |
| footer institucional completo para o estado real | **conforme** — 11 ligações, e **sem rotas inventadas**: termos e cookies não existem e não se ligam |

## §12.3 — Portão de usabilidade · 6 critérios

| critério | estado |
| --- | --- |
| shells diferenciam as cinco superfícies | **conforme** — alvos de toque por superfície, 44 no público e 48 na operação |
| tarefas frequentes rápidas e claras | **MEDIDO EM PARTE** — «rápida» medida, «clara» é juízo humano |
| touch, teclado, foco, zoom e conteúdo extremo | **NÃO PASSA — critério COMPOSTO, e vale o pior das partes.** **MEDIDO nas superfícies COM SESSÃO a 07/09 17h10, e há um NÃO CONFORME** — backoffice: anel **13,05:1**, 200% sem rolagem, conforme. Staff: anel 13,05:1, mas a 200% **rola 3 px** (198 > 195). KDS: **anel a 1,00:1** — a cor do anel é a cor do fundo, logo quem navega a teclado não vê onde está. As públicas continuam conformes (62 focáveis, 18/18 por `Tab`, 200% sem rolagem) |
| loading, empty, error, offline, denied, upgrade coerentes | **conforme** |
| KDS legível à distância e Staff com uma mão | **NÃO PASSA — critério COMPOSTO, e vale o pior das partes.** Junta duas superfícies numa célula só, e as duas divergem: qualquer veredicto único aqui mente numa delas. **MEDIDO a 07/09 17h20, e o Staff é CONFORME COM RESSALVA** — na rota real com sessão, a 390×844: **10 alvos, página de 844 px (nada exige rolar), zero alvos abaixo de 48 px**. As ACÇÕES (`Añadir`, `Reintentar ahora`) estão a **y=704**, na zona do polegar; a NAVEGAÇÃO está a **y=128–408**, no terço superior, que é o mais difícil de alcançar com uma mão. Funciona para o que se FAZ; alcança-se pior o que se NAVEGA, e isso é juízo de desenho. O KDS a metros passou a **MEDIDO a 07/09 19h15, e NÃO PASSA nos casos comuns** — é geometria, não opinião: o corpo a **18 px** subtende **10,7′** numa TV de 43" a 2 m, contra os **16′** da norma ergonómica. Só chega ao confortável a 55"/1,5 m ou 65"/≤2 m. Para 43" a 2 m seriam precisos **27 px** |
| não há regressão de comportamento | **conforme** — `marketing.spec.ts` **68/68**, corrido às 12h18 de 07/09. Estava aqui «65/65», que era verdade quando foi escrito: entretanto nasceram três provas. Um número num portão sem a hora a que foi medido apodrece em silêncio |

## §12.5 — Portão de cobertura · 6 critérios

| critério | estado |
| --- | --- |
| telas-mestre aprovadas propagadas | **bloqueado por desenho** — é a secção 8, depois da aprovação |
| 396 IDs rastreados | **conforme** |
| 792 composições capturadas ou justificadas | **não conforme — 0 de 792**, e por desenho (a §8 põe-nas depois da aprovação). Mapa da MEDIÇÃO VIVA, `validar-alcance-das-composicoes.sh` às 13h02 de 07/09, uma linha por ID em `docs/progress/alcance-das-composicoes.csv`: **396 = 178 só-URL + 202 estado-partilhado + 16 a provocar**, e a partição fecha. Por porta: **343 abrem hoje, 37 bloqueadas por parâmetro, 16 sem endereço**. PRONTAS A CAPTURAR JÁ: **143**. (O `06_O_PORTAO_DE_COBERTURA.md` parte os mesmos 396 noutra definição — 120 + 276, com os 16 por dentro. As duas fecham; esta é a que se remede sozinha.) |
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


## «Tarefas frequentes rápidas e claras» — 07/09

**O §12.3 não diz quais são as tarefas frequentes.** Escolhê-las eu seria medir a
minha opinião e chamar-lhe conformidade. Fui buscá-las onde elas já estão
escritas e comprometidas: **à página que o cliente lê.** É o mesmo movimento com
que o viewport do KDS se resolveu — um número escolhido discute-se, um número que
sai do que a página promete só se muda mudando a promessa.

O produto nomeia a sua tarefa frequente e repete-a: **«Una comanda, de la mesa a
la cocina»** — «se abre la mesa, se toma el pedido, y la cocina lo ve» — e diz
que ela atravessa **cinco momentos**, também nomeados.

**Os cinco momentos contra o que existe:**

| promessa | onde vive |
| --- | --- |
| 1 · «Se reserva o se pide» | `EstadoDePedido.RASCUNHO` → `ACEITE` |
| 2 · «La cocina la ve» | `EM_PREPARO` |
| 3 · «Sale al pase» | `PRONTO` → `ENTREGUE` |
| 4 · «Se cobra» | fora do `EstadoDePedido` — contas |
| 5 · «Queda en la gestión» | idem |

Os momentos 4 e 5 **não** estão no estado do pedido, e isso não é defeito: cobrar
e arquivar são outros modelos. Fica registado para ninguém procurar lá.

**O «rápida», medido:** da sala à comanda existir são **três saltos de rota** —
`floor/mesas` → `floor/mesas/[tableId]` → `orders/novo` (ou `…/ronda` para a
seguinte) — e **a cozinha não navega**: o KDS é superfície própria e permanente,
por isso o momento 2 custa zero passos a quem está na sala.

**O que NÃO medi, e digo-o em vez de o arredondar:** saltos de rota contam
**ecrãs, não toques** — dentro de `orders/novo` pode haver dois gestos ou quinze,
e isso não está aqui. E **«clara» não é mensurável por contagem nenhuma**: é
juízo, e é do Matheus na aprovação visual. Entrego-lhe o número e a fronteira
dele, não uma conformidade que eu não posso assinar.

## «Staff com uma mão» continua NÃO MEDI — e a medição falhada foi minha — 17h00

Corri a sonda contra `/es-ES/staff/x` e ela devolveu **2 alvos visíveis** numa
página de **exactamente 844 px** — a altura da viewport.

**Isso não é o Staff: é o ecrã de não-encontrado.** O `x` não é um identificador
de unidade, a rota exige sessão, e eu bati numa porta que não é a que queria
medir. **Dois alvos e uma altura igual à da janela são a assinatura de uma página
vazia**, e foi por aí que dei por ela — não por um erro, porque erro nenhum houve:
o pedido devolveu 200 e a sonda mediu com toda a confiança o que lá estava.

**Fica NÃO MEDI, e a razão é minha e não do produto.** Medir isto a sério exige a
sessão e o inquilino de demonstração semeado — o mesmo arnês das telas-mestre — e
não vou dá-lo por medido com um número tirado da página errada.

**É a mesma família do que apanhei hoje três vezes:** um instrumento que devolve
um número plausível sobre o sujeito errado. A diferença é que desta vez o número
era pequeno de mais para ser verdade, e foi isso que o denunciou.


## Porque é que dois critérios passaram a dizer «NÃO PASSA» primeiro — 07/09 22h00

**Nenhuma medição mudou nesta revisão. Mudou o que a célula diz primeiro.**

Dois destes critérios juntam coisas diferentes numa célula só — «KDS legível à
distância **e** Staff com uma mão», «touch, teclado, foco, zoom **e** conteúdo
extremo». As metades divergem: o Staff é conforme com ressalva e o KDS **não
passa**; o teclado e o zoom passam e o foco do backoffice **não**.

Um critério composto **não pode ter um veredicto único** — qualquer resposta
mente numa das metades. E mentia para o lado optimista, porque a célula abria
com a metade boa. **Um classificador que leia a primeira palavra arruma-o nos
conformes, e foi exactamente o que o meu fez hoje.**

A regra passa a ser a do resto do repositório: **um critério com partes vale o
pior das suas partes**, e a célula diz isso antes de explicar. Igual ao tecto por
superfície das guardas — um total deixa um defeito novo esconder-se atrás de um
resolvido.

### O que isto faz ao número, e o número piora

| | |
|---|---|
| o que eu disse ao Matheus às 17h18 | **19 conformes** de 26 |
| o que é verdade agora | **18** |

E a descida não é desta revisão: aconteceu às **19h15**, quando o KDS passou a
medido-e-não-conforme. **Eu reportei a subida do «medidos» e não reportei a
descida do «conformes».** Troquei para a métrica que subia, sem o dizer.


## A validade desta tabela, medida — 07/09 23h45

**A evidência do RV100 está congelada em `e953a87` (06/09 07:47).** O `AF100`
diz, no seu ponto 4: *«a auditoria deve ocorrer num commit congelado; se o
código mudar, o veredito anterior deixa de aprovar o novo estado.»*

O código mudou:

| | |
|---|---|
| commits ao produto desde `e953a87` | **51** |
| ficheiros do produto alterados | **141** |
| vereditos **re-medidos a 07/09**, com hora | **8** |
| vereditos que ainda descrevem o commit congelado | **18** |

**Não é que os 18 estejam errados. É que ninguém sabe** — e a tabela não o
dizia, porque só os oito que alguém voltou a medir trazem a hora.

### Dois «18» diferentes, e é preciso não os confundir

- **18 de 26 são «conforme»** — o número que foi dado ao Matheus.
- **18 de 26 não foram re-medidos desde o congelamento.**

**São conjuntos diferentes que calham ter o mesmo tamanho.** Escrevo-o porque
quem ler os dois seguidos vai lê-los como um só, e a coincidência é do pior
tipo: parece uma explicação.

### O que fica, e o que não

Não re-mediu-se aqui nada — re-correr os 18 é o trabalho do próprio `AF100`, e
é grande. **O que muda é que a decadência passa a estar declarada em vez de
implícita.** Uma tabela que não diz de que commit fala parece falar do actual.

---

## Por onde se volta a medir cada critério — 08/09

> Dos 26 critérios, 8 foram re-medidos a 07/09 e trazem a hora, e 1 já citava um
> guião (`validar-no-commit`). **Estes são os 17 que restavam**, e o objectivo
> não é re-medi-los: é que quem os quiser re-medir saiba por onde — e saiba
> quais é que **nem por guião se medem**.
>
> **Regra aplicada, e é a que dá valor a isto:** o NOME de um guião não prova
> que ele mede o critério. Cada citação abaixo foi **corrida**, e ao lado está a
> **linha da saída** que fala do critério. Onde o guião passava mas nada na saída
> falava do critério, **não foi citado** — um verde ao lado não é resposta.

### Os cinco que se re-medem por guião

| critério | guião | a linha que o diz |
| --- | --- | --- |
| não existe identidade antiga ou paralela | `validar-coral-da-arte.sh` (saída 0) | `ok  o coral da arte não entra em interface` |
| preços vêm da fonte aprovada | `validar-precos.sh` (saída 0) | `ok  3 planos, valores em cêntimos inteiros` · `ok  nenhum valor em euros escrito à mão fora da vitrina` |
| SEO e partilha configurados | `validar-seo.sh` (saída 0) | `ok  12 pastas de rota, todas classificadas` · `Metadados por rota: 0 falhas.` |
| tema Starter e personalização respeitam limites | `provar-tema.sh` (saída 0) | `ok  caiu a recusa por plano ao guardar` — é o controlo negativo a mostrar que a recusa por plano existe |
| 396 IDs rastreados | `validar-cobertura.sh` (saída 0) | `ok  nenhum ID perdido (396 de 396)` |

**Uma ressalva declarada:** o `validar-seo.sh` cobre os metadados por rota. **Não
cobre** a pendência de produção que o próprio veredicto nomeia — o
`NEXT_PUBLIC_SITE_URL` por definir, sem o qual os canónicos apontam para
`localhost`. Essa metade continua por medir.

### Os onze que são juízo humano, e porquê

| critério | porque não há guião |
| --- | --- |
| logo e ícone aprovados usados correctamente | é comparação com os ficheiros aprovados; nada mede «usado correctamente» |
| identidade reconhecível sem depender só do wordmark | reconhecibilidade não se mede por regra — o próprio veredicto diz MEDIDO EM PARTE |
| tipografia, espaço, raios, bordas e movimento tokenizados | são cinco famílias; a `validar-tipografia-minima.sh` cobre **uma** (o piso de 14/20). Citá-la seria dar um verde de 1/5 por resposta |
| as seis páginas têm conteúdo suficiente | «suficiente» é editorial |
| não há prova social ou promessa inventada | a `validar-dados-ficticios.sh` mede **dados fabricados em experiências reais**, que é outro assunto: aqui a pergunta é sobre promessas na copy |
| footer institucional completo para o estado real | ver a nota das armadilhas abaixo |
| shells diferenciam as cinco superfícies | a `validar-superficies.sh` mede o que **desaparece** dentro do fundo, não a diferenciação entre shells |
| tarefas frequentes rápidas e claras | «clara» é juízo, e o próprio veredicto já o dizia |
| loading, empty, error, offline, denied, upgrade coerentes | «coerentes» compara seis estados entre si; nenhum guião o faz |
| não há P1/P2 visual aberto | é a leitura do dossiê de achados |
| P3 aceite com decisão, responsável e prazo | idem |

### O que fica fora das duas colunas

**telas-mestre aprovadas propagadas** não é juízo humano nem falta de guião: está
**bloqueado por desenho** — a §8 põe a propagação depois da aprovação. Fica na
sua própria linha para não se confundir «não se pode medir» com «não se mede
ainda».

### As cinco armadilhas de nome, que é o que a régua avisava

Casar palavras com nomes de ficheiro apanhou cinco candidatos errados, e todos
teriam mandado a próxima pessoa correr um guião que não responde à pergunta:

| candidato pelo nome | o que mede mesmo |
| --- | --- |
| `validar-assinaturas.sh` | **não** é assinatura visual: é uma tela não poder estar `validado` se a etapa dela não foi validada |
| `validar-juncao-identidade.sh` · `provar-identidades.sh` | identidade de **utilizador** (o runtime não junta `users`), não identidade de **marca** |
| `validar-dados-ficticios.sh` | dados fabricados a chegar a experiências reais, não promessas inventadas na copy |
| `validar-portas-mortas.sh` | passa a zero, mas fala de **entradas de menu anónimas** — nada na saída fala do rodapé |
| `validar-registo-coerente.sh` | uma **etapa** não se contradizer no documento; nada sobre P1/P2/P3 |

**A do coral é a que mais interessa**, porque a amostra da régua propunha
`provar-identidades` para «não existe identidade antiga ou paralela» e o certo é
`validar-coral-da-arte`. O nome acertava na palavra e errava no sujeito.
