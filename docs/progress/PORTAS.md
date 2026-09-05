# As portas dos módulos entregues

**Não é uma etapa:** é a condição que o E21 pôs para reabrir o marco do
Restaurant, e que o E22 satisfez só para o TPV.
**Contrato:** `docs/architecture/portas-e-navegacao.md`.

---

## O critério, aplicado sem desconto

> «Uma porta por módulo **entregue**.»

Depois do E22 só o TPV a tinha. O menu ainda levava dez entradas em `href: '#'`,
e entre elas estavam **reservas** — as 34 telas que o próprio sénior assinou — e
a **sala inteira**. Um restaurante que chega à caixa e não chega às reservas
continua a ser um restaurante que não se usa.

Seria fácil dizer que o marco reabria porque a peça mais recente ficou boa. Isso
mediria o esforço da última hora em vez de medir o produto.

## O que ganhou porta, e porquê essas

Medido a partir da matriz — módulos com telas em `validado`, agrupados por
família de rota:

| módulo | telas validadas | porta |
| --- | --- | --- |
| catálogo | 26 (CAT-001…) | ligação directa: vive na organização, não numa unidade |
| reservas | 34 (RES-B-001…) | escolha de unidade → `reservations` |
| sala e pedidos | 21 (FLOOR + ORD) | escolha de unidade → `floor` |
| takeaway e entrega | 6 (TAKE + DEL) | escolha de unidade → `takeaway` |
| relatórios | 9 (REP-001…) | escolha de unidade → `reports` |
| caixa | 19 (POS-001…) | já a tinha, do E22 |

**O `relatorios` estava marcado como por construir e não estava.** As REP-001 a
008 são do E14 e estão validadas desde então. Foi a medição da matriz que o
mostrou — eu ia escrever «E29» ao lado de um módulo que já existe.

## Uma regra, e não uma por módulo

Quatro dos seis vivem dentro de uma unidade, e o contrato exige que a unidade se
escolha em algum sítio: «quem tem três restaurantes tem de dizer em qual está
antes de o módulo fazer sentido». Isso seriam quatro páginas de escolha quase
iguais — **quatro regras no dia em que uma mudar**.

Há uma só: `/app/<org>/ir/<modulo>`. O módulo viaja no endereço e o que muda
entre eles é apenas para onde a unidade aponta. Um módulo que não esteja na
tabela dá **ausência** — não é uma página que aceita qualquer palavra e mostra
uma lista vazia.

## O `#` legítimo passou a ser outra coisa

Um `#` num módulo por construir continuava a ser uma ligação: com `href`, com
cursor de mão, apanhável por `getByRole('link')`. Parecia uma porta.

Agora é um campo próprio, `porConstruir`, com a etapa que o vai fazer. Não é
`<a>`, não tem `href`, está esbatido e traz a etapa ao lado. **Um item que parece
uma ligação e não faz nada ensina a pessoa a desconfiar do menu inteiro.**

Ficam assim: **inventário → E25**, **clientes → E27**.

### E duas coisas que não davam para marcar honestamente

- **`início`.** Medido: **nenhuma** das 396 telas do atlas é o painel de topo do
  inquilino. Marquei-o com o E30, que faz a gestão multiunidade e revisita as
  ORG-002/004 — é a etapa mais próxima, e é a atribuição menos certa das quatro.
  Fica dito, para poder ser corrigida.
- **`trabalho` e `mais`, na barra do telemóvel.** Não são módulos por construir:
  não existem em etapa nenhuma. Um marcador exige a etapa que o vai substituir, e
  sem ela não é marcador, é um resto. A barra inferior passou a levar três
  destinos reais — sala, caixa e reservas.

## A prova mede o CAMINHO, e o plante estraga o MENU

Um único `goto` por caso, para onde a sessão aterra. Daí em diante tudo por
cliques: entrada do menu → escolha de unidade → primeira tela do módulo, com o
marcador `data-tela` a confirmar onde se chegou. Guarda de leitor cego no fim: se
nada navegasse, o endereço seria o de partida.

**O controlo negativo repõe o `#` no menu, um módulo de cada vez, e nunca toca
numa tela.** É a única forma de provar que o que se mede é o caminho: um plante
numa tela mediria outra vez a existência da tela, que já está medida vinte etapas
atrás.

E há dois casos que fecham a regra pelo outro lado, sem os quais «uma porta por
módulo» passava com um menu onde tudo é ligação e metade não leva a lado nenhum:
**nenhum `a[href="#"]` no menu**, e **todo o marcador traz uma etapa** — com o
seu próprio controlo, que troca a etapa por uma palavra e obriga a guarda a
acender.
