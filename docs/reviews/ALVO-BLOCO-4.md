# Régua do bloco 4, escrita antes de o trabalho começar — 08/09, 15h35

O bloco 4 (§4.5, «Para cada pessoa, a tela certa») ainda nem arrancou. Escrevo a
régua agora pela mesma razão da do bloco 2: **uma régua escrita depois tende a caber
no que foi feito**, e aqui há um risco extra — a acessibilidade é fácil de dar por
satisfeita ao olhar, e só se prova a exercer.

## O que tem de estar verdadeiro

| # | exige | instrumento | limiar |
|---|---|---|---|
| 1 | os quatro papéis que o norte nomeia: **gestor, salão, cozinha, cliente** | texto do bloco | **4**, com esses sentidos |
| 2 | **um ecrã por papel** | contagem de `img` no bloco | **≥ 4** (hoje é **1**) |
| 3 | ao trocar de papel, **troca o screenshot E o benefício** | trocar e comparar `src` e texto antes/depois | ambos mudam |
| 4 | alternável **por teclado** | `Tab` até ao selector, setas ou `Enter`, e o painel muda | funciona sem rato |
| 5 | alternável **para leitor de ecrã** | `role="tablist"`/`role="tab"`, `aria-selected`, `aria-controls` | presentes e coerentes |
| 6 | crops **legíveis** | escala × 14 px | **≥ 11 px no ecrã** |
| 7 | **não são quatro cartões de texto** | um painel visível de cada vez | **1** visível |
| 8 | **nenhuma guarda afrouxada** | `git show --name-only` | zero em `scripts/validar`, `scripts/provar`, `inspeccao/` |

## O critério 3 é o que separa isto de um carrossel de fotografias

O §4.5 diz «ao trocar papel, **troque screenshot e benefício**». Trocar só a imagem
faz uma galeria com legendas; trocar só o texto faz quatro parágrafos com uma
fotografia decorativa. **São as duas coisas a mudar juntas que fazem o bloco dizer o
que promete**: que cada pessoa vê uma tela diferente da mesma base.

## E o 4 e o 5 não se aceitam por inspecção

Já vi hoje, mais do que uma vez, uma coisa parecer certa numa captura e não estar. Um
`role="tab"` no HTML não prova que o teclado funciona, e teclado a funcionar não prova
que o leitor de ecrã anuncia a mudança.

**Exercer, não ler:** carregar `Tab` até lá, mudar de painel, e confirmar que o
conteúdo mudou. Se não der para exercer, a resposta é **NÃO MEDI** — não «parece
bem».

## O que esta régua não decide

Se o bloco é bonito, e se os quatro papéis são os quatro certos para o negócio dele.
O primeiro é da Nathalia; o segundo, se o JR achar que os quatro nomeados no norte
não são os do BossaOS real, **é achado e vem a mim** — não se corrige um documento do
Matheus por iniciativa nossa.
