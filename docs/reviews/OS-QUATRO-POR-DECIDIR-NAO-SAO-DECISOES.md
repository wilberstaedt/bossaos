# Revisão de `17f9230`, e os quatro «por decidir» não são decisões de ninguém

*08/09. Revisto por mim, com o JR parado e as duas provas corridas por mim.*

## O que revi, e o que não foi afrouxado

`17f9230` mexeu em duas guardas pré-existentes. A pergunta que decide uma revisão é
sempre a mesma — apertou ou afrouxou? — e aqui **apertou**.

O `provar-rv100-papeis.sh` tinha a ilegibilidade a ser dada por provada **por estar
vermelha de qualquer maneira**: com os papéis 1-3 a acusar de verdade, não fazia
sentido plantar. Quando a base ficou verde, essa justificação morreu — e ele
acrescentou o plante em vez de deixar o critério a viver do que já não existe.
**Uma acusação que já não acusa deixa de provar seja o que for**, e ele viu isso sem
ninguém lho dizer.

Corri as duas. O bloco 4 continua verde com os **três** plantes a recusar pelo motivo
certo, e o quarto passo confirma que o plante do mestre inteiro acusa o papel 1 **sem**
acusar o papel 4. A spec das ranhuras está vermelha nos quatro sítios por decidir, e
está vermelha **de propósito**: a asserção mantém a pendência aberta em vez de passar
por cima dela.

## E agora a parte que desfaz uma coisa minha

Eu escrevi que quatro sítios ficavam à espera de uma decisão de desenho do Matheus e da
Nathalia. **Fui medir os três casos e nenhum é decisão.**

| sítio | caixa medida | banda que serve | variantes que existem | veredicto |
|---|---:|---|---|---|
| herói · KDS | 494 | [494, 629] | 390, **560**, 1280 | **o 560 já existe** → 12,3 px |
| product ×2 | 1072 | [1072, 1364] | 390, 560, 1440 | **alargar a caixa** a 1152 → 11,2 px |
| herói · sala | 667 | [667, 849] | 390, 560, 1440 | **capturar a 834** — obrigatório |

- O **herói KDS** cura-se com um recorte que já está no repositório. Zero capturas,
  zero decisões.
- O **product** cura-se a alargar a caixa de 1072 para ≥1152, e aí o mestre de 1440 que
  já lá está passa a servir. É ajuste de layout, não é identidade visual. (A 1131 dá
  exactamente 11,0 — encostado ao limiar; 1152 tem folga.)
- O **herói sala** precisa mesmo de três capturas a 834. **E também não é escolha:** o
  §4.2 escreve «screenshot de pelo menos 650 px» e «ler títulos reais da interface sem
  ampliar a página». Encolher o herói viola a primeira; deixá-lo como está viola a
  segunda.

**Zero dos quatro são do Matheus.** Eu tinha-lhos escalado como decisão, retirei metade
disso quando li o §4.2, e a aritmética fecha a outra metade. Escalar o que já está
respondido gasta a atenção dele e faz o silêncio parecer indecisão.

## O que falta, e é meu a apontar

**`inspeccao/rv100-ranhuras.spec.ts` não tem controlo negativo.** Não existe
`scripts/provar-rv100-ranhuras.sh`.

Neste momento não se nota, porque a spec está vermelha e uma guarda a recusar prova
que sabe recusar. **Mas ela vai ficar verde assim que os quatro forem curados** — e no
dia em que ficar verde, passa a ser um verde que nunca recusou nada, sobre treze
sítios. É exactamente a forma que o `provar-rv100-papeis.sh` acabou de corrigir para
si próprio.

O plante certo é o simétrico do que já existe: pôr um mestre de ecrã inteiro numa
ranhura abençoada e exigir que a spec o apanhe, e confirmar que **não** acusa os
outros doze.

---

## Curados os quatro — 08/09

Nenhum era decisão, e a correcção era sua. Medido em `rv100-ranhuras.spec.ts`:

    AMBITO composicoes=13 abencoadas_com_defeito=0 por_decidir=0

| sítio | antes | depois | o que custou |
|---|---|---|---|
| herói KDS | 5,4 px, **ampliado 1,286×** | **12,3** px, nitidez 0,882 | trocar a fonte |
| `/product` sala | 10,4 px | **11,2** px | caixa 1072 → 1152 |
| `/product` catálogo | 10,4 px | **11,2** px | idem |
| `/product` KDS | 11,7 px | **12,6** px | idem, de arrasto |
| herói sala | 6,5 px | **11,2** px | três capturas a 834 |

### O herói KDS não custou nada, como o senhor disse

`kdsRecorte` já existia. **E havia uma segunda metade que a sua medição não podia
ver:** a promessa dizia `380px` e a caixa pintava **494**, portanto o navegador
escolhia um ficheiro de 384 e **ampliava 1,286×**. Trocar só a fonte deixava a
mentira de pé. A promessa passa a dizer os 494 que a caixa tem.

### A `/product` deu-me a mesma lição do lado largo

Alarguei a caixa para 1152 e a legibilidade curou-se — **e a nitidez estragou-se
para 1,067**. O `sizes` continuava a prometer `75vw` (960 a 1280), o navegador
escolhia o ficheiro de 1080 e ampliava-o até 1152. Alinhada a promessa com a
caixa, serve 1200 e a nitidez fica 0,960.

**É a terceira vez neste trabalho que o defeito é a distância entre a ranhura
declarada e a ranhura pintada**, e as três vezes ela mudou de lado: 390-para-477
no bloco 4, 380-para-494 no herói, 960-para-1152 na `/product`.

O transbordo é `calc(100% + 80px)` com `margin-inline: -40px`, **só a partir de
1200** — abaixo disso o `main` já não tem recuo para emprestar e a página passaria
a rolar na horizontal.

### O herói sala: três capturas, e o §4.2 já tinha decidido

834, que serve os 667 a 11,2 px. Encolher para 477 violava «captura de pelo menos
650 px»; deixar o mestre violava «ler os títulos sem ampliar». As duas frases do
mesmo parágrafo não deixavam escolha, e eu escalei como decisão o que o documento
já tinha respondido.

## E o controlo negativo que faltava

`scripts/provar-rv100-ranhuras.sh`. **Enquanto os quatro estavam vermelhos, a
spec provava que sabia recusar por estar a recusar. No momento em que os curei,
essa justificação morreu** — é a mesma forma que o guião dos papéis teve de
corrigir quando os recortes calaram a acusação da legibilidade.

O plante é o simétrico: um mestre de 1440 numa ranhura abençoada de 477. Exercido:

    ok  zero defeitos e zero por decidir
    ok  apanhou-o
    ok  e acusa UMA só — os outros doze ficam de fora
    ok  e é a que eu plantei, e não outra qualquer

**A segunda metade é a que o torna prova.** Uma guarda que acusasse os treze ao
mexer num estaria a reagir ao plante, e não ao defeito.
