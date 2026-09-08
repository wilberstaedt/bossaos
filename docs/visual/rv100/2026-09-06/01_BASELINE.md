# RV100 · 01 — Diagnóstico do estado actual

> Commit `e953a87`, 06/09/2026. **Nada aqui foi alterado** — isto é medição.
>
> O §2.2 do RV100 dá treze problemas observados na publicação de 05/09 e manda
> **revalidar cada um**: não manter um problema só porque já lá estava, nem
> mexer no que já foi corrigido. É o que está feito abaixo.

## As treze hipóteses do §2.2

Cinco medidas na fonte, com o mecanismo identificado. As restantes precisam do
navegador e ficam nomeadas, **não presumidas** — presumir é o que este projecto
passou a semana a apanhar.

| # | hipótese de 05/09 | veredicto | medição |
| --- | --- | --- | --- |
| 1 | logo perto de 81 × 28 px, abaixo do mínimo de 120 | **CONFIRMADA** | ver abaixo — é o valor por omissão do componente, não CSS |
| 2 | sete links equivalentes em pílulas | **CONFIRMADA** | `PAGINAS_MKT` tem 6 + demo = 7 `<a>` na mesma `<nav>`, e a folha dá-lhes `border-radius: var(--bo-raio-capsula)` |
| 3 | hero limitado a ~468 px com área direita sem função | **por medir** | precisa do navegador |
| 4 | uma só imagem na home, nenhuma prova do produto | **CONFIRMADA, e pior** | `app/[idioma]/page.tsx` tem **zero** `<img>`, `<Image>`, `<picture>` ou `<svg>` em 87 linhas |
| 5 | coral e verde-lima praticamente ausentes | **CONFIRMADA** | `#F5664D` **4** ocorrências e `#DDEA91` **3**, contra `#102E35` **20** |
| 6 | home, produto, FAQ, planos e demo com a mesma estrutura | **por medir** | leitura comparada das cinco |
| 7 | planos sem os preços aprovados | **CONFIRMADA — e não é descuido** | zero preços na página e zero nas mensagens dos três idiomas. Ver a secção própria |
| 8 | produto descreve três blocos e repete a home | **por medir** | |
| 9 | demo isolada, sem contexto nem próximo passo | **por medir** | |
| 10 | footer reduzido a «Feito com BossaOS» | **CONFIRMADA** | o `<footer>` da `EstruturaPublica` tem `{assinatura}` e um `{rodape}` opcional que a `MolduraMkt` **não passa** |
| 11 | seletor de idioma não visível | **CONFIRMADA no marketing** | não existe componente de troca de idioma em parte nenhuma; os únicos ficheiros que mencionam idioma na interface são do site do restaurante, não da moldura comercial |
| 12 | `title`, description e social incompletos | **CONFIRMADA, com o mecanismo** | há metadata, mas **uma só para a aplicação inteira**: `title: 'BossaOS'` e `description: 'Sistema operativo do restaurante.'` no layout raiz. Nenhuma página de marketing define a sua; sem OG, canonical nem hreflang |
| 13 | nenhuma prova visual de catálogo, mesas, KDS, reservas, TPV | **CONFIRMADA** | consequência directa da 4 |

## O achado 1, com o mecanismo

```
export function Wordmark({ altura = 28 }) {
  width={Math.round((2137 / 736) * altura)}
```

**28 × (2137/736) = 81 px de largura.** Não é uma folha de estilo a encolher a
marca: é o valor por omissão do componente, e **os dois únicos sítios que o usam
chamam-no sem argumento** — `Marketing.tsx` e a página das estruturas internas.

Para cumprir o §4.1: `altura = 42` dá 122 px (o mínimo), `altura = 50` dá 145 px
e `altura = 58` dá 168 px (o topo do alvo recomendado).

## Um achado que o §2.2 não tinha

**O `Icone` aprovado não tem uso nenhum.** `git grep '<Icone'` devolve zero. A
peça foi entregue a 03/09, existe no componente, e nada a chama.

E ao lado disso: **não há favicon.** `apps/web/app/` não tem `icon.*`,
`favicon.*` nem `apple-*` — só existe uma rota de ícone do Staff. O §6.8 exige
«favicon baseado no ícone aprovado e testado em tamanho real», e o §12.1 exige
que ícone e logo aprovados sejam usados correctamente. **Está por cumprir**, e a
peça para o cumprir já cá está.

## O que NÃO se toca

O §1.4 diz que um frontend mais bonito com comportamento perdido é reprovação.
A base contra a qual se mede está no `00_STATUS.md`: 27 guardas sobre o commit,
`provar-plataforma` com 8 controlos, 25 casos de navegador com 7 controlos, e a
separação de credenciais. **Qualquer lote visual volta a passar por ali.**

## O que falta a este diagnóstico

As capturas do §2.1 — quinze superfícies, seis viewports, três idiomas, com
conteúdo determinístico e nomes longos. É a próxima peça, e é trabalho de
navegador, não de leitura.

## O caso 7 merece secção própria: uma decisão cuja premissa expirou

**Não é um defeito de execução.** A `coverage.csv` guarda a decisão, no MKT-001:

> «A tabela de planos **NÃO** publica preços: os escalões são reais, os preços
> não existem em documento nenhum e inventá-los numa página comercial é uma
> promessa a quem os leu.»

Isso estava **certo**. E deixou de estar, no mesmo dia:

| quando | o quê |
| --- | --- |
| 04/09 **02:38** | `ec15bca` — a decisão é registada: «os preços não existem em documento nenhum» |
| 04/09 **04:01** | `37af235` — «Os preços entram no repositório» |

**Oitenta e três minutos.** A decisão foi tomada com a premissa verdadeira e
ninguém voltou lá quando ela caducou. Não há nada no projecto que o pudesse ter
notado: uma decisão que se apoia em «X ainda não existe» não tem gatilho para o
dia em que X passa a existir.

E as fontes **concordam ao cêntimo** — medi:

| plano | `PRECIFICACAO.json` | RV100 §6.5 |
| --- | --- | --- |
| Starter | 1900 / 19000 / implantação 9900 | €19 / €190 / €99 |
| Restaurant | 7900 / 79000 / 29900 | €79 / €790 / €299 |
| Pro | 14900 / 149000 / 49900 | €149 / €1.490 / €499 |

Origem declarada no próprio ficheiro: `BossaOS_Precificacao_e_Modelo_Comercial_v1.pdf`,
02/09/2026, V1. Por unidade física, IVA à parte, anual equivalente a dez
mensalidades.

**O que isto quer dizer para a RV100:** o §6.5 manda publicar, e manda ler a
mesma fonte de configuração que o produto usa em vez de duplicar valores em
conteúdo solto. A fonte existe e é a `PRECIFICACAO.json`. **A decisão antiga não
se contorna em silêncio — cai porque a premissa dela caiu, e isso fica escrito
aqui.**

## O que já dá para dizer sem o navegador

Nove das treze hipóteses estão medidas, e **as nove confirmam-se**. Duas
agravam-se face ao que o §2.2 dizia (a home tem zero imagens, não uma; o footer
não tem sequer rodapé opcional ligado) e duas mudam de natureza: a 7 é uma
decisão caducada e não um esquecimento, e a 12 tem metadata — só que uma para
todo o produto.

As quatro que faltavam estão medidas abaixo, no navegador.

## As quatro de composição — medidas no DOM, 1440 × 900, es-ES

Instrumento: `inspeccao/rv100-baseline.spec.ts`. Não julga; recolhe números e
escreve-os em `evidence/baseline/medidas-1440.json`, com uma captura de página
inteira por superfície. O controlo positivo é exigir que cada página tenha pelo
menos uma secção — sem isso, uma página que não carregou passaria por medição.

| página | rola? | secções | mídia | hero acaba em x |
| --- | --- | ---: | ---: | ---: |
| home | sim (1173) | 3 | 1 | 1256 |
| produto | **não** | 2 | 1 | 728 |
| planos | **não** | 2 | 1 | 728 |
| implantação | **não** | 2 | 1 | 728 |
| piloto | **não** | 2 | 1 | 728 |
| confiança | **não** | 2 | 1 | 728 |
| faq | sim (966) | 2 | 1 | 652 |
| demo | sim (1194) | 2 | 1 | 728 |

**Hipótese 3 — CONFIRMADA, com o número corrigido DUAS vezes.** O conteúdo do
hero acaba em **x = 728** de 1440 em **seis** das oito páginas: os **49% da
direita não têm nada**. A observação de 05/09 dizia 468 px; o valor real é 728.
O problema é o mesmo, a medida não era — e é exactamente por isto que o §2.2
manda revalidar em vez de herdar.

**A segunda correcção é a um número meu, e foi o implementador que a apanhou.**
Eu escrevi aqui «sete das oito» e a minha própria tabela, três linhas acima, diz
seis: a FAQ acaba em 652 e a home em 1256. Fui contar e ele tem razão. Escrevi
uma prosa que a minha própria medição desmentia e não reli uma contra a outra —
a tabela estava certa desde o princípio, o resumo dela é que não estava.

**E a correcção torna o achado mais afiado, não menos.** Com «sete das oito», a
home era uma excepção e mais nada. Com seis, veem-se três regimes: a **FAQ é a
pior de todas** (652, ou seja **55%** de vazio à direita, e não 49), as seis
partilham exactamente o mesmo 728 — que é repetição de molde, não coincidência —
e a **home, a 1256, é a única que ocupa a largura**. Porquê a home e só a home
continua por explicar, e fica registado como número por explicar, não como
número resolvido.

**Hipótese 6 — CONFIRMADA, e a minha primeira medida era fina de mais.** Comparei
as páginas por uma impressão digital de contagens de elementos e **nenhuma se
repetia** — o que me teria feito escrever «não se confirma». Está errado: a
estrutura é a mesma e a impressão é que era fina de mais para a ver. Sete das
oito páginas têm **exactamente duas secções**, a primeira sempre sem título e com
um parágrafo, a segunda com tudo o resto.

**E o que a medida certa mostrou:** **cinco das oito páginas comerciais não rolam
de todo.** Produto, planos, implantação, piloto e confiança cabem inteiras em 900
px. O §6.3 pede uma sequência mínima de **catorze** blocos para a LP.

> Nota de instrumento: a primeira leitura foi `body.getBoundingClientRect()`, que
> num layout de altura 100% devolve o viewport mesmo numa página longa. **Não
> escrevi «cabe num ecrã» com esse número** — voltei a medir com
> `documentElement.scrollHeight`, que é o que responde à pergunta. Os dois davam
> 900; um por acaso, o outro por razão.

**Hipótese 8 — CONFIRMADA.** A página de produto são duas secções, quatro
títulos, quatro parágrafos e **zero mídia**. Descreve; não mostra.

**Hipótese 9 — CONFIRMADA.** A demo tem, além do formulário, **um título e um
parágrafo**. Sem contexto, sem duração, sem o que vem a seguir.

**E uma que atravessa todas:** `mídia = 1` em **todas as oito** superfícies — e
essa uma é a marca. **Não há uma única imagem do produto em nenhuma página
comercial.** A hipótese 4 falava da home; é o site comercial inteiro.

**E a marca mede 81 × 28 px no navegador**, exactamente o que a aritmética do
componente previa. Fonte e ecrã concordam.

## Estado do diagnóstico

**Treze de treze medidas. Treze confirmadas** — duas com o número corrigido, uma
que mudou de natureza (a 7 é uma decisão caducada) e uma que quase escapou por o
meu instrumento ser fino de mais. Falta o §2.1: as capturas nos seis viewports e
nos três idiomas, com conteúdo longo. As de 1440 em es-ES estão em
`evidence/baseline/`.
