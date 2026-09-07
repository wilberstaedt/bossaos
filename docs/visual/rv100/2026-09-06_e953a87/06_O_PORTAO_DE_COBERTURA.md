# O portão de cobertura (§12.5) — o que as 792 composições custam mesmo

> Escrito a 07/09 com os dois implementadores a trabalhar noutra coisa, para que
> este item deixe de ser uma linha de critério e passe a ser trabalho com
> tamanho conhecido. **Ninguém o tinha medido.**

---

## O que as 792 são

O RV100 §12.5 exige que «as 792 composições exigidas estejam capturadas ou
justificadas». O número vem do AF100, linha 130:

> «cada ID tem evidência de desktop e mobile, totalizando 792 composições
> verificáveis»

**396 IDs × {desktop, mobile} = 792.** E o AF100 §209 acrescenta os viewports
contratuais para validar: 360 e 390 no telemóvel, 768 no tablet, 1280 e 1440 na
secretária, mais os tamanhos do kiosk/KDS/TPV.

## O que existe hoje: doze, e não são estas

| | quantas | o quê |
| --- | ---: | --- |
| `inspeccao/capturas.spec.ts` | **12** | 6 páginas × 2 medidas (390 e 1440) |
| linha de base da RV100 | 8 | as oito páginas comerciais a 1440 |
| **do §12.5** | **0** | — |

**As doze não contam, e é importante perceber porquê.** O instrumento percorre
uma lista `PAGINAS` escrita à mão com seis entradas, e as seis são
`/interno/catalogo` e as quatro `/interno/estruturas/*`: são as páginas que
mostram o **sistema de desenho**, não telas do produto. Nenhuma delas é um ID do
atlas.

**O padrão está certo e a enumeração é que não é.** O ficheiro faz exactamente o
que deve: duas medidas, etiquetado `@capturas`, **fora da corrida por omissão**
com a razão escrita — *«escrevem ficheiros, e uma verificação que altera o
repositório não devia correr a cada `pnpm inspeccionar`»*. Isso é bom desenho.
O que falta é ele ser conduzido pelo atlas em vez de por uma lista à mão — que é
o mesmo defeito de forma que a CI já teve com as guardas em lista em vez de
glob, e que o `provar-tudo.sh` já resolveu.

## O trabalho a sério: resolver 23 parâmetros

O mapa de ID para rota **existe e está completo** — é o
`docs/progress/coverage.csv`, 396 linhas, com `rota_sugerida`, `desktop` e
`mobile` preenchidos nas 396. Isso é a boa notícia e não é pouca: ninguém tem de
descobrir que URL desenha que ID.

A má é que as rotas são parametrizadas, e são **23 parâmetros distintos**:

| parâmetro | rotas |
| --- | ---: |
| `[orgSlug]` | 222 |
| `[locationSlug]` | 175 |
| `[locationId]` | 64 |
| `[locale]` | 49 |
| `[publicLocationSlug]` | 36 |
| `[idioma]` | 35 |
| `[brandSlug]` | 27 |
| `[stationId]` | 16 |
| `[productId]` | 11 |
| **cauda de 14 outros** | **1 a 8 cada** |

E 35 rotas sem parâmetro nenhum.

**A distribuição é a informação.** Os oito primeiros resolvem-se todos com uma
casa determinística — uma organização, uma unidade, uma marca, uma estação. É
resolver oito valores, não 222 rotas. **A cauda é que é o trabalho**:
`[reservaId]`, `[recibo]`, `[token]`, `[postSlug]`, `[publicOrderId]`,
`[membershipId]`, `[groupId]`, `[query]` — cada um exige uma **entidade que
tenha de existir na base** no momento da captura. Um recibo precisa de uma venda
fechada; um token precisa de um convite por aceitar.

## Um achado que muda o portão: não há uma única justificação

O §12.5 diz «capturadas **ou justificadas**». Fui contar as justificações no
atlas e são **zero**: a coluna `desktop` diz `obrigatório` nas 396, e a `mobile`
diz `obrigatório/adaptado à superfície` nas 396. **Uniformemente, sem uma
excepção.**

Isso quer dizer que hoje o portão exige as 792 inteiras. E há pelo menos um
caso em que isso merece uma decisão em vez de uma captura: **o KDS e o kiosk não
têm contexto móvel real.** Um KDS vive num ecrã de cozinha e um kiosk num
terminal fixo; capturar o KDS a 390 px produz uma imagem que ninguém vai ver na
vida do produto. «Adaptado à superfície» hedgeia, mas não justifica.

**Ou essas ganham justificação escrita, ou alguém captura composições que não
existem.** É decisão, não trabalho, e é melhor tomá-la agora do que às três da
manhã no fim da RV100.

## O que isto significa para a percentagem

Não muda nada do que já está feito. Muda o que falta: **o portão de cobertura é
um corpo de trabalho distinto**, com enumeração, resolução de parâmetros,
semente de entidades e 792 corridas — e não uma linha de conferência no fim.

**E metade dele não depende da aprovação do Matheus.** As capturas dependem —
as telas vão mudar, e capturar antes é deitar fora. Mas a **enumeração**, a
**resolução dos 23 parâmetros** e a **semente da cauda** não dependem de estética
nenhuma e podem ser construídas enquanto se espera. É o item certo para pôr a
correr em paralelo assim que houver mão livre.

---

## Correcção ao que escrevi acima: as justificações não existem, mas a dívida está contada

Escrevi há duas horas que «não há uma única justificação» e usei isso para dizer
que o portão exige as 792 inteiras. **A frase está certa e a leitura estava
incompleta**, e a diferença importa.

É verdade que a coluna `mobile` do `coverage.csv` diz
`obrigatório/adaptado à superfície` nas **396**, sem uma excepção. Mas existe,
desde 04/09, um segundo sítio que eu não tinha ido ver:
**`docs/progress/DIVIDA-MOVEL.txt`**, com **46 IDs** que estão assinados como
validados e **não têm prova de móvel**. A `validar-movel.sh` lê essa lista, deixa
passar os 46 e **reprova qualquer ID novo** nas mesmas condições. Tecto que só
desce à mão.

E o cabeçalho do ficheiro aplica a doutrina das três respostas à cobertura,
melhor do que eu a tinha aplicado aqui:

> «Não são defeitos conhecidos: **são medições que NÃO ACONTECERAM**, e por isso
> não se diz que estão bem. Estão aqui para que a dívida seja contada em vez de
> invisível, e para que a guarda possa reprovar dívida NOVA sem reprovar 66 vezes
> por dia — que é como as guardas acabam desligadas.»

**Dívida declarada não é justificação, e a distinção não é semântica.** Uma
justificação diz *«esta composição não precisa de existir»*; a dívida diz
*«precisa, e ainda não foi feita»*. Os 46 continuam a contar para as 792. O que
muda é o retrato: não é que ninguém tenha olhado para a cobertura móvel — é que
alguém olhou, contou o que faltava e pôs um tecto.

**E há um facto melhor do que o total: 29 dos 46 são `RES-B-001` a `RES-B-029`.**
Sessenta e três por cento da dívida de móvel é **uma família — as reservas**.
Isso torna-a um trabalho, e não uma varredura: medir as reservas em móvel resolve
quase dois terços da lista de uma vez.

**Nota de método, e é a terceira vez esta noite.** Contei a lista com
`^[A-Z]+-[0-9]+` e obtive **17** onde a guarda dizia 46. Não publiquei os 17: fui
ver os bytes das linhas que faltavam e são `RES-B-001`, um ID de **dois
segmentos** que o meu padrão não admite porque espera dígito logo após o
primeiro hífen. **O número em desacordo consigo próprio foi o que impediu o
erro** — se eu tivesse escrito um padrão que desse 46 à primeira por acaso, tinha
publicado 46 sem nunca ver que a dívida era quase toda de reservas.

---

## Segunda correcção, e desta vez o portão está MUITO mais perto do que eu disse

Escrevi que o trabalho eram «23 parâmetros, com oito comuns e uma cauda de
catorze que exige entidades na base». Fui construir a resolução e descobri que
**ela já está construída**: `inspeccao/alvos.ts`, 364 linhas, **36 campos**.

Cruzei os 23 parâmetros das rotas contra o que ele expõe:

| | quantos | quais |
| --- | ---: | --- |
| **resolvem já** | **15** | `productId`, `orderId`, `deviceId`, `menuId`, `categoryId`, `orgId`, `brandId`, `groupId`, `membershipId`, `token`, `query`, `recibo`, e três por sinónimo: `locationId`←`unidadeDoStaff`, `stationId`←`estacaoDeProducao`, `reservaId`←`reservaDeHoje` |
| não resolvem | 8 | abaixo |

**E os oito que faltam não são o que eu disse que eram.** Chamei-lhes «cauda que
exige entidades». São, na maioria, **constantes**:

- `orgSlug` (222 rotas) e `locationSlug` (175) — **verificados**:
  `marina-oropesa` e `puerto` estão no arnês em cinco ficheiros
  (`autenticar.setup.ts`, `alvos.ts`, `analitica.spec.ts`, `ecras-derivados.ts`).
  Não são entidades a criar; são nomes a saber.
- `locale` (49) e `idioma` (35) — as três línguas, e o `IDIOMAS` já existe em
  `inspeccao/ajudas.ts`.
- `publicLocationSlug` (36) e `brandSlug` (27) — **NÃO MEDI**. Presumo que sejam
  igualmente constantes da casa semeada, e presumir não é medir. Ficam assim
  escritos até alguém os ver.

**Sobram três rotas em 396**, e são estas:

```
MENU-009   /r/[publicLocationSlug]/[locale]/menu/orders/[publicOrderId]?view=sent
MENU-010   /r/[publicLocationSlug]/[locale]/menu/orders/[publicOrderId]
PUB-006    /r/[publicLocationSlug]/[locale]/news/[postSlug]
```

Duas entidades: **um pedido público** e **um artigo de notícias**. É isso.

### O que isto muda na estimativa, e porque é que eu a tinha inflacionado

Eu disse «23 parâmetros e uma cauda que custa». A verdade é **quinze já
resolvidos, seis constantes (quatro verificados, dois por ver) e duas entidades
por semear**.

**O erro foi de método e é o mesmo de sempre:** contei o que as rotas *pedem* e
não fui ver o que o arnês *já dá*. Medir a procura sem medir a oferta produz uma
estimativa que só sabe crescer. É a versão de planeamento do erro que hoje já me
deu «zero chamadores» e «zero hex»: **um lado da conta medido com cuidado e o
outro presumido.**

## E uma decisão que tomei neste tick: não medir móvel nas reservas agora

Os `RES-B-001` a `029` são dois terços da dívida de móvel e a tentação era
fechá-los já. **Não os fecho, e a razão é o calendário e não o esforço:** o §8 da
RV100 propaga o redesenho a todas as telas depois da aprovação. Medir agora o
móvel de vinte e nove telas de reserva é produzir evidência de um desenho que
está prestes a mudar — e a evidência exige a frase que afirma que *aquela* tela
foi medida.

Medir antes do redesenho é medir duas vezes. **Fica registado como sequência,
não como pendência:** as reservas medem-se em móvel **depois** da propagação, e
aí resolvem-se 29 das 46 de uma vez.

---

## Terceira medição, e desta vez o portão está mais LONGE — o URL não chega

No tick anterior escrevi que os parâmetros estavam quase todos resolvidos e que
sobravam três rotas em 396. **Isso era verdade sobre parâmetros e falso sobre
alcance**, e a diferença é a maior deste documento.

Os 396 IDs **não são 396 endereços**. São **151 endereços distintos**:

| | quantos |
| --- | ---: |
| IDs alcançáveis só com o URL (endereço único) | **120** |
| IDs que partilham endereço com outro — exigem **estado** | **276** |
| destes, sem URL nenhum — `(na rota que executa a acção)` | **16** |

O `/staff/[locationId]` sozinho carrega **23 IDs**; o `/pos/[locationId]`, 22; o
`/kds/[locationId]/[stationId]`, 16.

**E o atlas já dizia isto, numa coluna que eu não tinha lido.** A `composicao`
classifica cada ID por natureza: 322 «página/painel a compor», 20 «diálogo ou
etapa do fluxo», 13 «estado de rota», 15 «estado transversal», 8 «aba», 4
«variação de rota», 2 «secção da landing page». A informação estava lá desde o
princípio.

### O que isto faz às 792

Uma captura deixa de ser «ir ao URL e fotografar»:

- **~240 capturas** (120 IDs × 2) são quase mecânicas;
- **~552** exigem **chegar a um estado** — abrir um diálogo, trocar de aba,
  avançar um passo de fluxo;
- e **32** (16 × 2) exigem **provocar uma condição** que não tem endereço:
  um erro, uma recusa de plano, uma unidade arquivada. Essas não se navegam,
  fazem-se acontecer.

## O padrão dos meus dois erros, e vale mais do que qualquer dos dois

Dois ticks seguidos oscilei a estimativa, e pelo mesmo defeito de forma:

| tick | o que medi | o que presumi | resultado |
| --- | --- | --- | --- |
| anterior | o que as rotas **pedem** | o que o arnês **já dá** | estimativa **inflacionada** |
| este | os **parâmetros** | o **alcance** | estimativa **deflacionada** |

**Medi um eixo com cuidado e presumi o segundo — duas vezes, em direcções
opostas.** É a mesma família do «zero chamadores» e do «zero hex»: um lado da
conta trabalhado e o outro herdado da minha intuição. A regra que fica:
**quando a estimativa muda muito entre duas medições, a variável nova não é a
resposta — é o eixo que eu não tinha medido.**

---

## Decisão: o `?section=` e os três IDs da landing

O implementador mediu que `/es-ES`, `?section=product` e `?section=plans` servem
HTML **byte a byte igual** (md5 `e703360c…`), por causa do
`dynamic = 'force-static'`, que entrega `searchParams` vazio na pré-renderização.
Ele não decidiu sozinho e fez bem: as duas saídas que via — landing dinâmica a
cada pedido, ou partir os 396 — custam mais do que o defeito.

**Decido que não há alteração de produto, e a razão está no próprio atlas.** A
coluna `composicao` do MKT-002 diz **«seção da landing page»**, e a evidência
escreve o motivo: *«MKT-001/002/003 são secções do mesmo endereço, por parâmetro
— um endereço partilhável não pode mudar com o que o visitante rolou»*.

Quer dizer: **o `?section=` nunca devia servir HTML diferente.** Servir o mesmo
byte é o comportamento correcto para um endereço que se quer partilhável. O
defeito não está no produto — está no **mapa**, que promete no `rota_sugerida` um
parâmetro que distingue e não distingue.

**O que muda é o critério de verificação**, e isso é meu: MKT-002 e MKT-003
verificam-se pela **presença da sua secção na página única**, e não por uma
resposta distinta. Fica escrito aqui e **não toco no `coverage.csv` neste
tick** — dois agentes estão a derivar trabalho desse ficheiro agora, e mexer no
mapa debaixo de quem o lê é como se partem corridas.
