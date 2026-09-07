# Alvo: a lista de reprovação do North Star, tornada medível

> Régua escrita **antes** da construção, 08/09 00h30, a partir do §8 do
> `NORTH_STAR_VISUAL_V2.md`. O norte diz **quando reprova**; isto diz **como se
> mede**. Sem isto, «continuar com fundo areia em todas as secções» é opinião.

## As treze condições de reprovação, e o instrumento de cada uma

| # | reprova se… | como se mede | limiar |
|---|---|---|---|
| 1 | fundo areia em todas as secções | cores de fundo **distintas** entre secções de topo | **≥ 3** distintas, e o herói **não** é areia |
| 2 | > 10 cartões de texto semelhantes | contar nós com a mesma classe de cartão | **≤ 10** |
| 3 | herói sem interface legível | escala da captura × tamanho de texto no ecrã | texto de 14 px do produto **≥ 11 px** no ecrã |
| 4 | capturas como anexos em molduras vazias | **juízo humano** — declarado, não medido | — |
| 5 | > 8 blocos narrativos | contar `<section>` de primeiro nível | **≤ 8** |
| 6 | coral e lima só como detalhe | área de píxeis por cor sobre a altura total | coral **≥ 8 %**, lima **> 0** |
| 7 | mais texto que produto nas 2 primeiras telas | caracteres vs. área de imagem nos primeiros **1800 px** | área de produto **≥** área de texto |
| 8 | Produto repete a home | sobreposição de frases entre as duas páginas | **< 30 %** de frases comuns |
| 9 | Mesas continua uma lista | existe grelha espacial com forma/capacidade/estado | **≥ 1** mapa, não `<ul>` de texto |
| 10 | mobile é o desktop empilhado | nós/classes diferentes a 390 vs 1440 | **≥ 1** componente só-móvel |
| 11 | métricas ou depoimentos inventados | `validar-dados-ficticios`, e busca por números sem fonte | **0** |
| 12 | regressão funcional, idioma ou acessibilidade | `validar-no-commit`, `validar-superficies`, `validar-tres-linguas` | saída **0** nos três |
| 13 | o executor aprova o próprio resultado | **processo**: quem constrói não assina | — |

## O que esta régua NÃO decide

**Nada do §11.** «Parece a BossaOS», premium, memorável, ritmo — **isso é da
Nathalia**, e nenhuma medição minha substitui o olho dela. Estes treze são o
**piso**: passá-los não faz a direcção boa, só impede que ela seja reprovada por
uma razão que se podia ter medido antes.

**E o inverso também vale:** um número que passe não vale como aprovação. O
estado final desta entrega é `NORTH STAR PRONTA PARA NATHALIA`, nunca «pronta».

## Como se prova, e as três armadilhas de hoje

1. **O controlo negativo é obrigatório em cada guarda nova.** Uma guarda que
   nunca recusou não provou nada — foi a lição do `trap` e a do invariante de
   contagem.
2. **Mede-se a página renderizada, nunca o código.** Ler `background: verde` no
   CSS não prova que a secção é verde: pode estar coberta, pode não aplicar.
   Hoje isso enganou-me três vezes.
3. **Declarar a população.** «0 cartões órfãos» sobre 0 grelhas é verde sobre
   nada. Toda a medição diz **quantos** olhou.

## O «antes» está congelado

`docs/visual/ns2/2026-09-08_483c4a7/` — SHA, ramo, estado da árvore, linha de
base funcional, capturas e o inventário. **Sem o antes, o depois não é uma
melhoria: é uma opinião com capturas.**
