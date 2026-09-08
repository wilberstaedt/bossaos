# A guarda de frescura recusa quando um ficheiro é tocado sem mudar — 08/09, 08h00

## O que aconteceu

Às 06h59 o `pagina-de-aprovacao.py` gerou a página com **25/25 capturas posteriores
à fonte mais recente do produto** — a guarda aceitou por si. Às 08h00 corri o mesmo
gerador e ele **recusou**: «25 capturas anteriores à fonte mais recente do produto».

Entre os dois momentos ninguém mudou o produto.

## A medição

| | quando |
|---|---|
| captura mais recente | 08/09 **06:58:51** |
| `apps/web/src/staff/PainelDaFila.tsx` | 08/09 **07:00:30** |
| `apps/web/app/[idioma]/app/[orgSlug]/catalogo/page.tsx` | 08/09 **07:00:30** |

E o que decide tudo:

```
git status --short <os dois ficheiros>   →   VAZIO
```

**O conteúdo é idêntico ao commit.** Os últimos commits que lhes tocaram a sério são
antigos — `59c1161` e `e655130`. Alguma coisa às 07h00:30 reescreveu-os com o mesmo
texto, quase de certeza um formatador a gravar o que já lá estava.

## Porque é que isto importa

A guarda compara **`mtime`**. Uma ferramenta que reescreve um ficheiro sem o alterar
move o `mtime` e envelhece, de uma vez, **todas** as capturas do repositório. É uma
recusa falsa, e é cara: a resposta óbvia é recapturar, o que exige um build inteiro —
numa máquina que hoje está em **ATENÇÃO** e com histórico de quatro kernel panics.
**Manda-se alguém gastar meia hora e um risco real para curar uma coisa que não
aconteceu.**

Falha para o lado seguro, e isso é uma virtude — mas o custo do lado seguro aqui não
é zero, e o sinal não distingue «o produto mudou» de «alguém gravou por cima».

O canário que já existe (`mtimes_reescritos`) **não apanha isto**: foi desenhado para
o caso do `clone`/`worktree`, em que o git reescreve **tudo** ao mesmo tempo. Aqui
moveram-se **dois** ficheiros. O instrumento está correcto e o sujeito é outro.

## A cura, e porque não a fiz agora

O sujeito certo é o **conteúdo**, não o carimbo do ficheiro: o produto está mais
recente que as capturas se **(a)** algum ficheiro de produto tem alterações por
commitar, ou **(b)** o commit de produto mais recente é posterior às capturas. As
duas perguntas são sobre conteúdo e nenhuma se move quando um formatador grava.

Não a implementei, e a razão é de risco e não de esforço: `mais_recente_do_produto`
é importada por outras guardas, e mexer no coração de um instrumento partilhado às
08h00, sozinho, com o JR a descansar contexto e o Matheus a dormir, é trocar um
incómodo medido por um risco não medido.

**Cura mais barata, se a de cima parecer grande:** quando recusar, perguntar se os
ficheiros acusados têm alterações por commitar. Se não tiverem, dizê-lo na recusa —
«o conteúdo é o do commit; só o `mtime` mexeu». Não muda o veredicto, e impede que a
próxima pessoa gaste um build a curar o que não está partido.

## O que ficou por exercer, e é meu

Pus no gerador o **carimbo** que esta página não tinha — a data e o commit
capturados, para o leitor poder fazer sozinho a conta que eu tive de fazer com
`git log`. O código está escrito, com o motivo, e **nunca correu**: a primeira
geração que o usaria foi a que a guarda recusou. Não o dou por feito.

Publiquei, essa sim, a página que o JR gerou às 06h59 — a que a guarda aprovou por
si. Não lhe colei carimbo à mão: a página é legítima, e um carimbo escrito por mim
ao lado de uma garantia gerada pela máquina confunde quem os lê a seguir.
