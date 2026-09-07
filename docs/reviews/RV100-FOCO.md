# Revisão — a prova de foco nos momentos reais (do JR)

Pedi-lhe que estendesse o `foco.spec.ts` aos 20 momentos que o atlas chama
diálogo, **com a expectativa escrita de que passasse**, porque o `Dialogo.tsx`
assenta no `<dialog>` nativo. Ele foi bater e a expectativa não se confirmou —
por uma razão maior do que a que procurávamos.

---

## O produto não tem modais

```
Dialogo / Gaveta     importados por 2 ficheiros: o catálogo e o DemoInteractiva
DemoInteractiva      usado por 1 página: o catálogo de desenho
<dialog> cru         zero no produto
```

Verifiquei os três estaticamente e confirmam-se. **Os 20 momentos são páginas com
botão de confirmar** — `organization/plano/cancelar/page.tsx` e
`devices/[deviceId]/revogar/page.tsx` existem como rotas próprias. A natureza no
atlas diz «diálogo/painel **ou etapa do fluxo**» e o que está construído é a
segunda metade.

## E ele corrigiu uma inferência minha, que é a parte que interessa

Eu tinha medido «zero `<dialog>` cru» e escrito que **todos os diálogos passam
pelo componente**. A frase dele:

> «O "zero `<dialog>` cru" que já conhecíamos era verdade e queria dizer **o
> contrário** do que parecia: não "tudo passa pelo componente", mas **"não há
> diálogos"**. Mais um número que existe e não responde à pergunta que lhe fazem.»

**O número estava certo e a leitura era minha.** Peguei num zero e escolhi, sem
dar por isso, a das duas explicações que confirmava o que eu já achava. É a mesma
forma do «dois vinte-e-noves» que ele me corrigiu há duas horas.

## A sonda é a peça central, e ele diz porquê melhor do que eu diria

> «Um detector partido reporta exactamente o mesmo que um produto sem diálogos:
> **zero**. A sonda aponta o MESMO detector ao catálogo, onde existe um
> `<dialog>` de certeza, e exige as três promessas: foco preso dentro, `Escape` a
> fechar, foco de volta a quem abriu. As três seguram. Logo o "0 em 20" é facto
> sobre o produto e não sobre o instrumento — **e sem ela as duas leituras eram a
> mesma linha**.»

E o âmbito no fecho não se pode ler mal:

> *«as três promessas do `<dialog>` estão medidas NO COMPONENTE, no catálogo de
> desenho. Dos 20 momentos que o atlas chama diálogo, 0 passam por um `<dialog>`.»*

## Isto corrobora uma coisa que eu tinha encontrado por outro caminho

Há três horas medi que **as quatro acções destrutivas do produto vivem em rotas
próprias** — `renovar`, `revogar`, `cancelar`, `bilhete` — e chamei-lhe
«separação por rota e não por pixels».

**É a mesma arquitectura vista do outro lado.** Eu tinha encontrado o efeito e
chamei-lhe uma virtude de segurança; ele encontrou a causa e chama-lhe uma
propriedade do produto. **Duas medições independentes, uma só decisão de desenho.**

## Onde o foco importa mesmo, e continua por medir

O produto tem **um** caso real de foco a devolver, e não é nenhum dos 20: **o
menu móvel** que o outro implementador construiu no lote da moldura. O
`MenuMkt.tsx` trata `Escape` e faz `botao.current?.focus()` em dois sítios, com
o comentário a dizer porquê — *«fechar sem devolver o foco deixa a pessoa no topo
da página»*.

E ele próprio declarou-o **por medir**. É para aí que a prova deve apontar a
seguir, e não para vinte diálogos que não existem.

## Uma falha minha, e é de forma

Tentei correr a *spec* directamente **três vezes** — Node errado, depois Node
certo sem ambiente, depois com ambiente e sem saída — antes de ir procurar se o
repositório tinha um guião para isso. **Tinha:** `scripts/validar-foco-nos-momentos.sh`,
que carrega o ambiente como todos os outros fazem.

A casa tem uma maneira de correr as coisas e eu passei-lhe ao lado três vezes.
**Não assinei nada enquanto não corri** — e isso estava certo —, mas gastei três
tentativas onde uma pergunta («há guião?») resolvia.
