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
