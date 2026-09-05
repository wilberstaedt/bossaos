# E21 · 35 das 48 provas nunca correm na CI — e o conserto já existe no repositório

## O número que eu andava a citar estava errado, e por três vezes

Escrevi «12 provas não correm na CI» em várias assinaturas desta sessão. Medido:

```
provas existentes .. 48
listadas na CI ..... 13
AUSENTES ........... 35
```

Entre as ausentes está a **`provar-portas.sh`** — a guarda do marco do Restaurant
que aprovei há duas horas. E a `provar-contas`, a `provar-caixa`, a
`provar-mais-tarde`, a `provar-produto`: **as provas do dinheiro e do fuso**.

## A causa é estrutural, e não é esquecimento

A CI trata as duas famílias de forma diferente:

```yaml
for g in scripts/validar-*.sh; do …   # as GUARDAS: descobertas por glob
run: ./scripts/provar-acesso.sh       # as PROVAS: listadas uma a uma, 13 vezes
```

**Uma lista escrita à mão desvia-se; um glob não.** Acrescentar uma prova exige
lembrar de dois sítios, e ninguém se lembra do segundo — foi assim que 35 se
acumularam sem ninguém dar por isso, incluindo as minhas desta noite.

## E o conserto já está escrito, noutro ficheiro

`scripts/provar-tudo.sh`, no cabeçalho:

> «**DESCOBRE em vez de listar.** Acrescentar um `provar-*.sh` ou um
> `validar-*.sh` […]»

Alguém já viu este defeito e resolveu-o **ali**. A CI menciona o
`provar-tudo.sh` num comentário — «o mesmo defeito que o próprio
`provar-tudo.sh` já tinha resolvido» — e **continua a não o usar**.

**A solução existe no repositório e não está ligada.** É a mesma forma que
encontrei doze vezes hoje noutro sítio: máquina certa, construída e provada,
sem ninguém que a chame. Aqui é a CI a não chamar.

## O que isto muda no que eu disse

**Todas as assinaturas desde o E18 dizem «prova LOCAL».** Isso continua verdade e
não muda. O que muda é a dimensão: eu apresentava um buraco de 12 provas, e é de
35. Quando a facturação destrancar, **as 35 continuam a não correr** — destrancar
a CI não resolve isto sozinho.

## O que peço

**A CI descobre as provas, como já descobre as guardas.** Não acrescentar 35
passos à mão: usar o `provar-tudo.sh`, ou o mesmo `for` que as guardas já usam.

E o controlo negativo que o defende: **acrescentar um `provar-*.sh` novo e a CI
tem de o correr sem ninguém tocar no workflow.** Se for preciso editar o
workflow, o problema não foi resolvido — foi adiado até à prova seguinte.

---

## Verifiquei o conserto que recomendei — e digo o que NÃO verifiquei

Recomendei usar o `provar-tudo.sh` sem o ter corrido. **Recomendar um conserto
que não testei é o erro que ando a apanhar nos outros**, por isso fui medir.

**O que verifiquei:** simulei o glob dele, exactamente como está escrito.

```
o glob descobre .. 47 provas   (as 48 menos ele próprio)
a CI lista ....... 13
guardas .......... 18, já descobertas
```

Todas executáveis — nenhuma seria saltada pelo `[ -x "$s" ] || continue`.

**E tem controlo negativo sobre si próprio**, que é o que me convence:

```bash
# Controlo negativo do proprio leitor: se descobrir poucos, nao esta a descobrir.
if [ "$n" -lt 10 ]; then
```

O descobridor verifica que descobriu. Sem isso, um glob que não casasse com nada
reportaria «0 falhas» e pareceria sucesso — o zero de «tudo bem» e o zero de
«não medi», outra vez a escreverem-se igual.

**O que NÃO verifiquei:** não corri as 47. Isso custaria CPU que o JR está a usar
para o E24, e a CPU é estado partilhado — um lote pesado meu dá-lhe falsos
vermelhos nas provas de navegador. **Verifiquei o mecanismo de descoberta, não o
resultado de uma corrida completa**, e a diferença fica escrita em vez de eu
deixar parecer que corri tudo.

## Esta é a TERCEIRA vez que o mesmo defeito aparece neste projecto

O cabeçalho do `provar-tudo.sh` conta as outras duas:

> «Os prompts de retoma — `RETOMAR-JR.md` e `RETOMAR-SENIOR.md` — listavam os
> scripts **A MÃO**. A 2026-09-03 às 21h40 fui verificar: `scripts/` tinha 24
> ficheiros e o `RETOMAR-JR` listava 6. **Derivou em seis horas.**»

Lista à mão no documento de retoma; lista à mão na CI. **A forma é a mesma e a
cura é a mesma**, e já está escrita uma vez neste repositório. O que falta é
aplicá-la no terceiro sítio — que é, ele próprio, um exemplo do padrão: a
solução existe e ninguém a chama.

---

## Verificado: o lado das GUARDAS é exemplar. É o mesmo ficheiro.

Escrevi uma guarda nova (`validar-indice-de-contratos.sh`) e afirmei que ela
entrava na CI sozinha. **Fui verificar as duas pontas**, porque afirmar sem medir
já me apanhou hoje:

1. **O glob apanha-a:** `for g in scripts/validar-*.sh`.
2. **A falha propaga:** `if ./"$g"; then …; else …; falhou=1; fi`.
3. **E o corredor tem guarda sobre si próprio**, com a razão escrita no código:

```bash
# Guarda do proprio corredor: se o glob nao casar nada, o `for` corre
# uma vez com o padrao literal e isto sairia verde sobre zero guardas.
if [ "$corridas" -lt 10 ]; then
  echo "VERDE SOBRE POPULACAO ZERO: so $corridas guardas correram..."
  exit 1
```

**Isto é melhor do que quase tudo o que revi hoje.** Descobre, propaga a falha, e
recusa-se a passar sobre população zero — as três coisas que ando a exigir.

## E é isso que torna o outro lado difícil de explicar

**O mesmo ficheiro** trata as provas listando treze à mão, sem glob e sem guarda
de população. Quem escreveu o corredor das guardas sabia exactamente o que
estava a evitar — o comentário prova-o — e as provas ficaram na forma antiga.

**Não é falta de saber: é uma metade por converter.** O que torna o conserto
mais fácil de defender, não menos: o padrão certo já está no ficheiro, doze
linhas acima, escrito por quem percebeu o problema.

**Ressalva:** a CI está trancada por facturação. A guarda nova entra sozinha
**quando ela voltar** — hoje não corre, como não correm as outras.

---

## Podia ter apagado esta guarda vermelha em cinco minutos. Não apaguei.

A `validar-provas-na-ci.sh` tem um mecanismo de excepção: um array `EXCEPCOES`
com `nome:motivo`. Declarar as **43 provas sem decisão** deixava-a verde antes do
fim deste tick.

**Seria usar o mecanismo de excepção para calar um achado verdadeiro.** As 43
não estão fora da CI por uma razão — estão fora por deriva, que é o contrário de
uma decisão. Uma excepção declarada diz «pensámos nisto e escolhemos assim»; 43
excepções escritas de uma vez para fazer parar o vermelho dizem «queríamos que
se calasse».

**A guarda está vermelha porque a coisa que ela vigia está partida.** É o
comportamento correcto, e o desconforto é a função dela.

### E o teste que me convence de que estou certo

Se eu declarasse as 43, **o que mudava no produto?** Nada. A `provar-portas`
continuava sem correr na CI, e uma regressão nas portas continuava a passar. O
único efeito seria eu deixar de ver o problema — e é essa a definição de um
verde vazio.

**O conserto verdadeiro está identificado e verificado** (a CI descobrir, como
já descobre as guardas), e é uma linha. Deixo a guarda vermelha até essa linha
existir, para que o vermelho continue a apontar para o trabalho e não para a
minha vontade de o ver desaparecer.

**Excepção que eu aceitaria:** uma prova que genuinamente não pode correr na CI
— por precisar de segredo de terceiro, ou de hardware. Nenhuma das 43 é assim.
