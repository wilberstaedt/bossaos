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
