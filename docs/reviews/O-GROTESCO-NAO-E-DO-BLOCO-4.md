# O varrimento: 12 dos 13 sítios põem o texto do produto por baixo de 11 px

*08/09, escrito enquanto o JR curava o bloco 4.*

O bloco 4 mostrava capturas de ecrã inteiro encolhidas a um terço, e o texto de 14 px
do produto aparecia a 4,6 px. Curá-lo é meio dia de trabalho. **Antes de o dar por
resolvido fui ver onde mais o mesmo defeito vive**, porque um defeito que nasce da
forma dos ficheiros não fica confinado a quem os usou primeiro.

Há **treze** sítios que renderizam uma composição do produto. O bloco 4 é **um**.

## O que se mede, e porquê esta razão e não outra

`ranhura ÷ mestre × 14 px`. O mestre é o ficheiro capturado; a ranhura é a largura a
que ele é mostrado. Se um ecrã foi capturado a 1440 e é mostrado a 477, tudo o que lá
está dentro encolhe 3,02 vezes — **incluindo o texto**, que era de 14 px e passa a 4,6.

Não é nitidez, é aritmética do conteúdo. Uma imagem pode estar perfeitamente nítida e
ilegível ao mesmo tempo, e foi por isso que a régua do bloco 4 lhe chamou desde o
início «**crops** legíveis» e não «capturas».

## A tabela

| sítio | mestre | ranhura declarada | escala | texto de 14 px | |
|---|---:|---:|---:|---:|---|
| landing · herói (sala) | 1440 | 720 | 0,50× | **7,0 px** | vermelho |
| landing · KDS | 1280 | 380 | 0,30× | **4,2 px** | vermelho |
| landing · catálogo | 1440 | 640 | 0,44× | **6,2 px** | vermelho |
| landing · tablet | 834 | 420 | 0,50× | **7,1 px** | vermelho |
| landing · papéis (a ser curado) | 1440 | 477 | 0,33× | **4,6 px** | vermelho |
| product · sala | 1440 | 1080 (75vw) | 0,75× | **10,5 px** | vermelho |
| product · catálogo | 1440 | 1080 | 0,75× | **10,5 px** | vermelho |
| product · KDS | 1280 | 1080 | 0,84× | **11,8 px** | **o único ok** |
| product · tablet | 834 | 640 | 0,77× | **10,7 px** | vermelho |
| getting-started · tablet | 834 | 600 | 0,72× | **10,1 px** | vermelho |
| ns2 interno · sala | 1440 | 720 | 0,50× | **7,0 px** | vermelho |
| ns2 interno · KDS | 1280 | 640 | 0,50× | **7,0 px** | vermelho |

**Ao telemóvel, onde a ranhura útil é ~350 px, não há um único verde:** o herói fica a
3,4 px, o KDS a 3,8, o catálogo a 3,4, o tablet a 5,9.

O único verde da tabela toda — `product · KDS` — só é verde num visor largo, porque
75vw de 1440 dá 1080. No mesmo sítio, num portátil de 1280, cai para 10,5.

## O que isto quer dizer

**O defeito não é de nenhum bloco. É uma propriedade do conjunto de ficheiros.** Só
existiam mestres de ecrã inteiro (1440, 1280, 834), por isso todo o consumidor herdou
a mesma falha, cada um com uma ranhura diferente e o mesmo resultado.

Foi por isso que ninguém o apanhou antes: cada sítio parece uma decisão de layout
razoável — 720 aqui, 640 ali, 75vw acolá — e nenhum deles é absurdo. **O absurdo está
no que se está a encolher, e isso não se vê a olhar para um sítio de cada vez.**

E é a forma do «está tudo grotesco» que se vê sem se conseguir apontar: não é o
tipo de letra, nem a cor, nem o espaçamento. É que as imagens que existem para
mostrar o produto não deixam ler o produto.

## A cura, e o que ela obriga

A cura do bloco 4 é usar recortes de 560 em vez de ecrãs de 1440 — a 477 dá 11,9 px.
**Essa cura resolve um dos treze sítios.** Os outros doze continuam a importar
`sala-servico-1440` e `kds-cozinha-1280` directamente.

O caminho é fazer das variantes de recorte cidadãs de primeira em `Demonstracao.tsx`
— o JR já lá pôs `catalogoRecorte` — e depois **escolher a variante pela ranhura, e
não pelo nome**. Enquanto a escolha for manual em treze sítios, o décimo quarto nasce
errado outra vez.

## O que eu NÃO medi, e conta

**Estas ranhuras são as DECLARADAS**, lidas do atributo `tamanhos` de cada sítio. Não
são a caixa medida no navegador — e o bloco 4 provou que uma ranhura declarada pode
estar errada: dizia `390px` onde a caixa real era 477, e foi essa mentira que fez o
navegador escolher um ficheiro pequeno de mais.

Portanto os números de cima podem estar deslocados para cima ou para baixo em cada
linha. **O que não muda é a ordem de grandeza:** escalas de 0,3× a 0,5× não se
salvam com um erro de declaração de umas dezenas de píxeis.

Quem mede a caixa real é a prova do JR, e mede-a em quatro sítios. **Os outros nove
continuam por medir ao vivo — e isso é uma pendência, não um verde.**
