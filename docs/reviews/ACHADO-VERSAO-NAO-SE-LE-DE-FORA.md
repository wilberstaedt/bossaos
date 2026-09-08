# Não há forma de ler, de fora, que versão está no ar — 08/09, 08h50

## O que fui fazer

Re-medir os factos de produção que estão na lista do Matheus, porque é sobre eles
que ele vai agir quando acordar. Leituras apenas — nada que crie conta.

| | |
|---|---|
| `insp-marina-oropesa` /menu | **HTTP 200** — continua público |
| `insp-marina-barcelona` /menu | **HTTP 200** — continua público |
| `bossa-demo` /menu | HTTP 200 |
| landing `/es-ES` | HTTP 200 |
| `origin/main` | `458814c`, de **05/09** — não mexeu (reflog sem push novo) |
| commits locais por enviar | **592** (eram 574 às 05h58) |
| `disableSignUp` em `origin/main` | **zero** |

## Uma confusão minha, que desfiz

Andei a tratar «publicado no GitHub» e «no ar em produção» como a mesma coisa. Não
são. O `publicar.sh` publica de um **ref local** (`HEAD` por omissão): produção corre
um build que nunca passou pelo GitHub. Por isso `origin/main` estar em 05/09 não diz
nada sobre o que está no ar — e `4cba084`, que eu andava a chamar «o publicado», é
um commit local de 07/09 17h01, quinze minutos antes do deploy das 17h16.

A conclusão do item 00 **aguenta-se na mesma**, e por outro caminho: a cura da porta
entrou em `fe64a4b`, às **22h37** de 07/09, cinco horas depois do deploy. O que está
no ar é anterior à cura, venha de onde vier. Mas a razão que eu dava estava trocada,
e uma razão trocada num registo manda a próxima pessoa verificar a coisa errada.

## O achado

O `publicar.sh` escreve uma marca de versão — `apps/web/public/versao.txt` — antes do
build, e o seu propósito é dizer o que está no ar. **Ela não se lê:**

```
/versao.txt        → redirecciona para /es-ES/versao.txt
/es-ES/versao.txt  → HTTP 404
```

Não é expectativa: a marca entrou no `publicar.sh` a **06/09 00:56** e o deploy no ar
é de **07/09 17:16**, posterior. Devia estar servida e não está — o encaminhamento
de idioma apanha o caminho antes de ele ser servido como ficheiro estático.

**Não confirmei o mecanismo.** Não há `middleware.ts` no repositório, portanto a
minha explicação para o redireccionamento é hipótese, não medição. O que está medido
é o resultado: 404.

## Porque é que isto importa

Sem essa marca, **ninguém consegue verificar de fora que versão está em produção**.
Tudo o que se diz sobre o que está no ar — incluindo o item 00 da lista do Matheus —
assenta em inferência a partir de horas de deploy e datas de commit, não em medição.

E importa mais no momento seguinte, não neste: quando o Matheus mandar publicar, a
pergunta imediata é «entrou?». Hoje a resposta a essa pergunta é um raciocínio, e um
raciocínio não distingue um deploy que correu de um deploy que falhou a meio.

**Uma marca de versão que a própria aplicação esconde é a mesma doença desta noite
inteira:** o instrumento existe, está correcto, e não está apontado ao sujeito.
