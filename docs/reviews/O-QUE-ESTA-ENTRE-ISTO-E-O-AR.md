# O que está entre o trabalho de hoje e o que o Matheus vê

*08/09, ~19h30. Preparado para a decisão dele ser uma palavra e não uma hora de
verificação.*

## O estado, medido

No ar: **`d5543d3`**, publicado às 11h23 — confirmado em `/api/health`,
`versao_do_build`. Local: **68 commits à frente**.

**Ele pediu a landing actualizada duas vezes hoje e disse «tá tudo grotesco». O que
curou isso está todo por publicar.** Passou a noite a olhar para a versão de que se
queixou.

## O que mudaria à vista

| | |
|---|---|
| ficheiros de produto | **13** (landing, product, getting-started, ns2, `Demonstracao`, `Marketing`, `estilos.css`, os três `i18n`) |
| imagens | **45 novas**, 13 alteradas — os recortes de 560, os estreitos de 390, o `sala-heroi-834` |
| **migrações** | **ZERO** |

Esse zero é o que baixa o risco: **não há mudança de esquema nem de dados.** É código
e imagens. Um deploy destes reverte-se voltando à imagem anterior, que o próprio
guião marca como `:rollback`.

O que ele veria diferente: o texto do produto passa a ser legível em **13 sítios** —
o herói de 7,0 para 11,2 px, o KDS de 4,2 para 12,3, o catálogo de 6,2 para 11,9 —
mais o bloco §4.5 com os quatro papéis e as quatro correcções do cabeçalho.

## O que publicar NÃO resolve, e é preciso dizê-lo antes e não depois

**O `publicar.sh` corre `db:migrate:deploy`. Não corre sementes.**

A cura da conta de demonstração — dar ao `demo@bossaos.invalid` uma `membership` em
`bossa-demo` — vive na **semente**. Portanto **publicar não a leva a produção.** Se a
conta que lhe dei no guia de percurso estiver em prod como está em dev, continua a
entrar sem pertencer a lado nenhum, com o backoffice vazio por baixo, **depois** de
publicar.

**E continuo sem ter medido prod.** Só medi `bossaos_dev`, depois da reposição de hoje.
Não infiro um do outro — já errei três vezes hoje a apontar um instrumento certo ao
sujeito errado. O que é certo é a implicação: *se* o problema existir em prod,
publicar não o cura.

## O que não corri, e porquê

O `publicar.sh` sem `--autorizado-por` corre **só os portões locais** e pára antes de
tocar no servidor — está escrito no próprio guião. Quis corrê-lo para a decisão dele
não trazer surpresas, e **a ferramenta bloqueou-me a execução**. Não contornei.

Fica por correr, e é o primeiro passo de quem publicar. **Não digo que os portões
passam: digo que não os corri.**

## O que falta para publicar

1. **A palavra dele, textual.** O portão 1 exige
   `--autorizado-por "<nome>, <data>: «<as palavras dele>»"`. É por commit e por
   momento, e não transita de uma autorização anterior.
2. Correr a preparação primeiro e ler os portões.
3. Publicar, e verificar de fora: `versao_do_build` no `/api/health` tem de ser o
   commit publicado, e as superfícies públicas têm de responder. **HTTP 200 não é
   entrega** — a versão que responde é que decide.
