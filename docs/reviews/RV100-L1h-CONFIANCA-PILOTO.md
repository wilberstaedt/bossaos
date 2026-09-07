# Revisão do lote L1h — confiança e piloto

Entrega em `cc2173f`.

---

## Ele corrigiu-me um facto que eu lhe mandei escrever numa página pública

Eu disse-lhe: *«cinco acções exigem servidor — `pagamento`, `reserva.confirmar`,
`conta.fechar`, `desconto.autorizar` e `conflito`»*. Ele **executou a fonte**:

```
ACCOES_QUE_EXIGEM_REDE   →  4 membros
exigeRede('conflito')    →  false
```

**O `conflito` não é uma acção.** É um ramo de resultado da sincronização —
`'conflito' in r`, na linha 148 — e uma variante de erro de preço. Outro
conceito.

**E o mecanismo do meu erro está à vista.** Corri
`grep -oE "'[a-z.]+'" sincronizacao.ts | head -8`, colhi aspas de **qualquer
sítio do ficheiro**, e li as cinco primeiras como os membros da constante. O
`'conflito'` vem antes porque está na linha 148 e a constante está na 195. **Li
uma verificação de propriedade como um item de uma lista.**

É a décima vez esta noite que conto o texto do programa e lhe chamo a coisa que o
programa faz — **e a pior**, porque as outras nove morreram numa medição minha e
esta ia para uma página que um cliente lê.

**A frase dele é a que fica:** *«se eu tivesse escrito "cinco" na página, a guarda
que construí teria contradito a página na primeira corrida»*. **O sistema
funcionou:** eu dei um facto errado, ele foi à fonte, e a guarda que ele
construiu recusá-lo-ia.

**E depois apanhou-se a si próprio:** escreveu «essas quatro» no primeiro
rascunho — *«o número escrito à mão que eu tinha acabado de banir»* — e tirou-o
das três línguas. **O número não está escrito em lado nenhum**; os nomes vêm da
constante que o produto usa para recusar, e o mapa é
`Record<AccaoQueExigeRede, string>`, portanto uma acção nova **parte o build**.

E provou isso contra o tipo real, com controlo positivo: membro em falta →
`TS2741`; chave que não é membro → `TS2353`; mapa correcto → **compila limpo** —
*«sem o qual os outros dois podiam estar a falhar porque o tipo está partido»*.

## O verde de população encolhida quase o apanhou — e o aviso foi o denominador

A `marketing.spec.ts` foi de 65 para **58, sete vermelhos**. E:

> «A primeira corrida usou `--reporter=line`; a cauda dizia "58 passed" e **não
> listava falhas**. O único indício era o **denominador** — 65 nos dois lotes
> anteriores.»

**É exactamente a classe que este repositório persegue há dias**, e apanhou-o com
o relatório a dizer-lhe que estava tudo bem. A causa era legítima — a âncora do
MKT-010 era `.bo-mkt__passos`, e **esse elemento era o defeito que este lote
removeu** (RV100-013).

E a alternativa que ele recusou é a parte que interessa: *«manter um
`.bo-mkt__passos` na página só para o selector casar — inventar uma sequência de
passos que não é verdade para satisfazer um instrumento»*. **Fabricar conteúdo é
pior do que mover uma âncora**, e a correcção mede-se: **uma linha de código,
zero linhas com `expect`**.

## O método dele para «sem terceiros» é melhor do que o meu critério

Eu tinha escrito «que o piloto não nomeie terceiros». Ele viu o buraco:

> **«"Sem nomes de terceiros" não se prova procurando nomes que não conhecemos.»**

Mediu as **formas** que a prova social toma — um depoimento tem uma etiqueta, um
logótipo é uma imagem, um número é um número — e **enumerou o que lá está** em vez
de procurar o que não devia estar.

**Verifiquei por outro caminho e é mais limpo do que ele disse:** as **21 chaves**
do piloto têm **zero dígitos**. Não há um número escrito. O único que a página
mostra é calculado de `precoDoPlano('STARTER')` em execução. **Não se inventa o
que não se escreve.**

## O quarto pilar, com o par positivo

A guarda `validar-pilar-offline.sh` tem dois controlos negativos **e o par
positivo** — compor e enfileirar um pedido continua a **não** exigir rede — *«sem
o qual o pilar podia dizer "nada funciona offline", que é falso na outra
direcção»*.

**As duas direcções do mesmo erro**, e é a mesma disciplina do teste da fila que
eu tinha citado no lote.

## E os números das duas páginas

| | antes | depois |
| --- | ---: | ---: |
| `/trust` chaves partilhadas | **5 de 5** | 41% |
| `/pilot` chaves partilhadas | **8 de 8** | 30% |
| cartões na `/trust` | 3 | 4 |
| citações · imagens no piloto | 0 · 0 | **0 · 0** |

**As duas eram 100% outras páginas.** E as que saíram do piloto são exactamente
as que o RV100-013 nomeia: `passo3`, `passo3Texto`, `passo4`, `passo4Texto`.

## Um segundo defeito da correcção dele própria, e este é pior

O `NEXT_DIST_DIR` do L1f faz o Next reescrever **`apps/web/next-env.d.ts` — um
ficheiro versionado**. Com duas sessões a compilar, oscila; e enquanto aponta
para `.next-revisao`, um build por omissão referencia tipos que não existem.

**Revertido e mantido fora do commit.** E o balanço dele é honesto: *«corrige o
servidor, não os tipos, e toca num ficheiro versionado. **A resposta certa é uma
árvore de trabalho separada** — as duas limitações que encontrei argumentam a
favor disso, não contra.»*

## Aberto, e declarado por ele

A `/trust` continua a ser o bloco 10 da home com mais espaço em tudo **excepto no
quarto pilar** — as 5 chaves partilhadas são os três pilares e o título. **Mesmo
defeito que a `/product` tinha, página diferente, outro lote.**

E a expansão de texto continua **NÃO MEDI**, pela mesma razão de base partilhada.

**L1h fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
