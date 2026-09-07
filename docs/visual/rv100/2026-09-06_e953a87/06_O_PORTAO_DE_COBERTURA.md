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
