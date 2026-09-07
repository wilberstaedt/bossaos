# Alvo: cada veredito de portão diz por onde se volta a medir

> Régua escrita antes da entrega, 07/09 23h50.

## O que está medido

A evidência do RV100 está congelada em `e953a87`. Desde então: **51 commits ao
produto, 141 ficheiros**. Dos **26** critérios de portão, **8** foram re-medidos
a 07/09 e trazem a hora; **18** ainda descrevem o commit congelado.

E ao contar quantos desses 18 se podem simplesmente voltar a correr:

| | |
|---|---|
| citam um guião no seu veredito | **1** (`validar-no-commit`) |
| não citam nada | **17** |

**Eu tinha despachado isto com «re-correr os 18 é grande».** Estava certo por
acaso e pela razão errada: não é que haja muitos guiões a correr — **é que os
vereditos não estão ligados a guião nenhum.**

## Mas os guiões existem

Amostra de seis, por nome:

| critério | candidato que já existe |
|---|---|
| 396 IDs rastreados | `validar-cobertura.sh` |
| não existe identidade antiga ou paralela | `provar-identidades.sh`, `validar-juncao-identidade.sh` |
| preços vêm da fonte aprovada | `provar-planos.sh`, `provar-planos-mkt.sh` |
| SEO e partilha configurados | `validar-seo.sh`, `provar-seo-mkt.sh` |
| não há prova social ou promessa inventada | **nenhum óbvio** |
| footer institucional completo | **nenhum óbvio** |

**Quatro em seis já têm por onde ser re-medidos, e a tabela não o diz.**

## O alvo

Para cada um dos 17: **ou o veredito passa a citar o guião que o re-mede, ou
diz explicitamente que não há guião e que é juízo humano.** As duas respostas
servem; o que não serve é a ambiguidade actual, em que não se distingue «não
mediram» de «não se pode medir».

## Como se prova, e o aviso é o principal

**O nome de um guião NÃO prova que ele mede o critério.** Esta lista saiu de
casar palavras com nomes de ficheiro, que é o instrumento mais fraco que há e
que já me enganou hoje — `grep` encontra texto, não comportamento.

Portanto, para cada citação que se escrever:

1. **Correr o guião** e mostrar a saída.
2. **Mostrar a linha da saída** que corresponde ao critério. Se o guião passa
   mas nada na saída fala do critério, **não serve** — é um verde ao lado.
3. Onde não houver guião, escrever **juízo humano** e porquê, sem inventar um
   candidato para preencher a coluna.

**Uma citação errada é pior do que nenhuma:** manda a próxima pessoa correr um
guião que não responde à pergunta, e o verde dele vale como resposta.

## O que NÃO é o alvo

Re-medir os 17. Isso é o `AF100` inteiro. Isto só faz com que, quando alguém os
quiser re-medir, saiba por onde — e saiba quais é que nem por guião se medem.
