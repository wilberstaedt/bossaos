# Régua do §4.4, o bento de produto — escrita antes de existir medição

*08/09. A secção **já existe** — quatro `.ns-bento__area`, com as classes
`--principal`, `--media`, `--media` e `--larga`. **Nunca foi medida contra o §4.4.***

## O que tem de estar verdadeiro

| # | exige (palavras do norte) | instrumento | limiar |
|---|---|---|---|
| 1 | quatro capacidades | contagem de `.ns-bento__area` | **4** |
| 2 | e são **estas** quatro: catálogo e publicação; reservas e mesas; Staff + KDS; gestão, caixa e estoque | os quatro títulos, nas três línguas | os quatro sentidos presentes |
| 3 | cada área com **captura real ou recorte funcional** | `img` dentro de cada área | **≥ 1 por área**, 4 de 4 |
| 4 | título **curto** | comprimento do `h3` | **≤ 40 caracteres** |
| 5 | **uma frase** de resultado | o parágrafo da área | existe, e é **uma** frase |
| 6 | **tamanhos diferentes**: um grande, dois médios, um horizontal | as **caixas pintadas**, não as classes | ver abaixo |
| 7 | link contextual **quando houver página** | `href` por área vs rotas que existem | 4 de 4 das que têm página |
| 8 | fundo verde profundo | cor computada da secção | verde escuro, não o fundo geral |
| 9 | capturas legíveis | `escala × 14 px`, como na propagação | **≥ 11 px** |
| 10 | nenhuma guarda pré-existente afrouxada | `--diff-filter`, A contra M | zero `M` |

## O critério 6 é o que decide, e mede o pintado — nunca as classes

O norte proíbe pelo nome: «**Não faça uma grade de quatro caixas idênticas.**»

As classes já dizem `--principal`, `--media`, `--media`, `--larga`. **Isso não é
prova de nada.** Hoje, três vezes, uma declaração desmentiu o que a página pinta: a
ranhura que dizia 390 e pintava 477, o `sizes` que prometia 1152 sobre uma caixa
menor, e as três composições que declaram ranhura nenhuma e passam por sorte. Um
nome de classe é uma declaração como as outras.

Mede-se com `getBoundingClientRect`, e com três exigências separadas:

1. **a maior tem área ≥ 1,6× a menor** — se as quatro forem quase iguais, é a grelha
   que o norte proíbe, tenham as classes o nome que tiverem;
2. **as duas médias são semelhantes entre si** (≤ 15 % de diferença de área) — senão
   não são «dois médios», são mais dois tamanhos avulsos;
3. **a horizontal é mesmo horizontal**: `largura ÷ altura ≥ 1,5`.

Se as três não puderem ser medidas ao mesmo tempo, a resposta é **NÃO MEDI**.

## Os dois que se enganam com facilidade

**O 5, «uma frase de resultado».** Um resultado diz o que muda para quem usa; uma
lista de funcionalidades diz o que o produto tem. A parte mensurável é **uma frase**
— um ponto final. Se forem três orações a enumerar campos, é achado e vem a mim, não
se reescreve por iniciativa nossa: é cópia do Matheus.

**O 7, «quando houver página».** O condicional é o risco: é fácil dar por cumprido
porque *algumas* têm link. Existem rotas para `product`, `plans`, `staff`, `kds`,
`pos`, `demo`, `getting-started`, `faq`, `pilot` e `trust`. **Enumerar as quatro
áreas contra essa lista e dizer quantas têm página e quantas têm link** — e se uma
tiver página e não tiver link, é falha, não é escolha de desenho.

## O que esta régua NÃO decide

Se o bento é bonito, e se o verde é o verde certo. E **não decide os textos**: os
quatro títulos e as quatro frases são cópia, e divergência do norte é achado.
