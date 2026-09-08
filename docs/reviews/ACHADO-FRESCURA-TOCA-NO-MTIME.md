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

---

## Metade curada — 08/09, 08h15

Fiz a cura barata, e **de propósito não fiz a outra**.

**O que mudou:** a recusa deixou de dizer só «está velho». Agora nomeia o que ficou
mais recente que a última captura e, para cada um, se mudou de conteúdo ou se só lhe
mexeram a data. Quando **nenhum** mudou, di-lo e acrescenta que recapturar não cura.
Ao vivo, neste repositório:

```
O que ficou mais recente que a ULTIMA captura:
    07:00:30  apps/web/src/staff/PainelDaFila.tsx  <- so o mtime - o conteudo e o do commit
    07:00:30  apps/web/app/[idioma]/app/[orgSlug]/catalogo/page.tsx  <- so o mtime ...

NENHUM deles mudou de conteudo: foram gravados por cima iguais.
Recapturar NAO cura isto - a comparacao e por data de ficheiro,
e o produto que as capturas mostram continua a ser o mesmo.
```

**O veredicto não mudou:** continua a recusar, e continua a sair 1. Isso é escolha,
não meio caminho — ver abaixo.

**Prova, dos dois lados.** Um detector que dissesse «só o mtime» para tudo dava
exactamente o mesmo ecrã acima e não provava nada. Pus um ficheiro `.ts` novo em
`packages/domain/src/` e voltei a correr:

```
07:10:04  packages/domain/src/CONTROLO-NEGATIVO-TEMPORARIO.ts  <- MUDOU (tem alteracoes por commitar)
```

A etiqueta mudou **e** a conclusão «NENHUM deles mudou» desapareceu, que é a parte
que interessa: a frase que pouparia o build só aparece quando é verdadeira. Removido
o ficheiro, tudo voltou ao estado anterior; a árvore ficou limpa.

## Porque é que parei aqui

A cura completa — medir **conteúdo** em vez de data — arrisca o único erro que esta
guarda não pode cometer. Se eu enganar-me a decidir que um ficheiro «não mudou»,
produzo um **verde falso**, e um verde falso aqui significa mostrar à Nathalia
capturas de um produto que já não existe, com uma garantia por cima a dizer que são
recentes. A cura que fiz só pode enganar para o lado de dizer demais.

Escrevo isto porque a diferença não é de tamanho, é de direcção: **entre duas curas,
a que erra para o lado seguro faz-se sozinha; a que erra para o lado perigoso espera
por quem a reveja.**

## Por rever — não assino o que escrevi

`scripts/frescura_do_produto.py` (função nova) e `scripts/pagina-de-aprovacao.py` (a
recusa) são meus. Falta o JR olhar. E fica de pé o que já estava declarado: **o
carimbo que pus no gerador continua sem nunca ter corrido**, porque a geração que o
usaria é justamente esta, que a guarda recusa — e com razão de forma, ainda que não
de fundo.
