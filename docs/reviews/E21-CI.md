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
