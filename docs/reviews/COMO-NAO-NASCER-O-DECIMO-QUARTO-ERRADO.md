# A propagação não é escolher variantes: é deixar de poder declarar uma ranhura sem variante

*08/09. Escrito depois do varrimento que encontrou 12 dos 13 sítios por baixo dos 11 px,
e antes de tocar em qualquer um deles.*

A cura do bloco 4 foi trocar um mestre de 1440 por um recorte de 560. A tentação
seguinte é repetir isso doze vezes. **Não vai funcionar, e a aritmética diz porquê.**

## A banda

Duas exigências ao mesmo tempo, e vêm dos dois lados do critério 6:

    nitidez        fonte ≥ ranhura            (ampliar é inventar píxeis)
    legibilidade   14 × ranhura / fonte ≥ 11  →  fonte ≤ 1,273 × ranhura

Uma fonte só serve uma ranhura se cair **dentro da banda `[r, 1,273r]`** — que é
estreita: 27 % de folga, e nada mais. Não há um ficheiro que sirva duas ranhuras
distantes, e não há ranhura que aceite qualquer ficheiro.

## Porque é que «escolher a variante» não chega

Das **sete** ranhuras declaradas hoje, só **três** têm alguma variante na banda:

| ranhura | banda | há variante? |
|---:|---|---|
| 380 | 380-484 | 390 |
| 420 | 420-535 | **nenhuma** |
| 477 | 477-607 | 560 |
| 600 | 600-764 | **nenhuma** |
| 640 | 640-815 | **nenhuma** |
| 720 | 720-916 | 834 |
| 1080 | 1080-1375 | 1280 |

E mesmo essas três só valem **para alguns ecrãs**, porque as variantes existem por
ecrã e não em geral:

| ranhura | ecrãs servidos | ecrãs sem fonte na banda |
|---:|---|---|
| 380 | 8 de 9 | tablet |
| 477 | 7 de 9 | **sala, carta** |
| 720 | 1 de 9 | todos menos tablet |
| 1080 | 1 de 9 | todos menos KDS |

**As ranhuras largas praticamente não têm cobertura.** Só 390 e 560 são larguras com
conjunto quase completo. Eu próprio cheguei a escrever uma proposta de quatro larguras
abençoadas antes de medir isto — a tabela fechava, e fechava sobre ecrãs que não
existem.

## A inversão

Não se escolhe uma variante para a ranhura que o layout calhou de querer. **Escolhe-se
um conjunto pequeno de ranhuras abençoadas, e o layout passa a só poder usar essas.**

Duas chegam, e são as que já têm conjunto: **~380 ao telemóvel e ~477 no ecrã largo.**
Dá 13,6 px e 11,9 px, ambos acima dos 11.

Para completar o conjunto faltam **nove capturas**: `sala` e `carta` a 560 (2 ecrãs ×
3 línguas) e `tablet` a 390 (1 × 3). Nada mais — os restantes já existem.

## E a parte que impede a reincidência

Completar o conjunto arruma os treze sítios de hoje. **Não impede o décimo quarto.**

Hoje a `Composicao` recebe `tamanhos` como texto livre — `"(min-width: 1024px) 640px,
100vw"` — e texto livre aceita qualquer número, incluindo os quatro que não têm
variante nenhuma. Quem escrever o próximo sítio vai escolher outro número razoável, e
vai estar errado da mesma maneira, e o build vai passar.

**A ranhura tem de deixar de ser texto e passar a ser um tipo:** uma união das larguras
abençoadas, com a folha de estilos a derivar a largura real dessa mesma constante. Um
sítio que declare uma ranhura sem variante deixa de compilar — que é o mesmo princípio
do aceite 1 do E01, onde o build falha se os tipos falharem.

Enquanto a escolha for um número escrito à mão em treze sítios, o décimo quarto nasce
errado. **A guarda não é a variante certa: é não se conseguir declarar a errada.**

## O que fica por decidir, e é de desenho

Colapsar para duas ranhuras quer dizer que **o herói da landing deixa de ter uma imagem
grande** — passa de 720 para ~477. A alternativa é capturar `sala` a 834 e manter os
720, e custa mais três capturas.

Isso é decisão do Matheus e da Nathalia, não minha: a régua mede legibilidade, e as
duas opções são legíveis. **Registo as duas com o preço de cada uma e não escolho.**
