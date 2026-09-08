# Régua da matriz ao telemóvel, escrita antes de existir medição

*08/09. O `provar-rv100-ranhuras.sh` corre a **1280** e declara-o. Esta é a metade que
ele declara não medir — e é a metade onde as contas eram piores: antes da cura, o
herói punha o texto a **3,4 px** num telefone.*

## A expectativa, e é de dois lados

`RANHURAS = { estreita: 380, larga: 477 }`, e abaixo de 1024 **a larga cai na estreita
de propósito**. Portanto ao telemóvel os treze sítios colapsam para 380, cuja banda é
**[380, 484]**.

Fui ver que fontes existem, ficheiro a ficheiro e não de memória: **todos os ecrãs têm
um 390** — carta, catálogo, KDS, sala, tablet e os quatro `fluxo-*`. (Cheguei a contar
um `fluxo` sem variante; era artefacto do meu agrupamento, não um ecrã.)

Logo, **se estiver tudo certo**, a medição a 390 devolve:

- `nitidez ≤ 1,0` nos treze — nada ampliado;
- `px_efectivos ≈ 13,6` nos treze (14 × 380 / 390);
- zero por decidir.

**E é isto que faz dela um teste de dois lados.** Sair 13,6 confirma o desenho. Sair
menos de 11, ou nitidez acima de 1, aponta a uma de duas coisas concretas: ou a caixa
real não é 380, ou o navegador não escolheu o 390 — que é precisamente a mentira que a
ranhura declarada já pregou uma vez hoje, quando dizia 390 e a caixa pintava 477.

## O que tem de estar verdadeiro

| # | exige | limiar |
|---|---|---|
| 1 | os treze medidos a 390 de visor | **13**, e uma guarda de população se forem menos |
| 2 | nenhum ampliado | `nitidez ≤ 1,0` |
| 3 | texto legível | `px_efectivos ≥ 11` |
| 4 | a medição usa os **píxeis reais** do ficheiro servido | `fetch(img.currentSrc)`, nunca `naturalWidth` |
| 5 | controlo negativo | planta um mestre inteiro, apanha-o, e **acusa só esse** |
| 6 | nenhuma guarda pré-existente afrouxada | zero `M` em `scripts/validar`, `scripts/provar`, `inspeccao/` |

O 4 não é detalhe: num `<img>` com `srcset` o `naturalWidth` vem corrigido pelo
descritor, e foi o JR que o descobriu hoje. Uma medição de telemóvel que caia nesse
atributo mede o descritor e não o ficheiro.

## O que esta régua NÃO decide

Se o layout de telemóvel é bonito, e se 390 é o telefone certo para representar todos.
**Um visor só não é a matriz toda** — 360 e 430 existem, e se a medição a 390 passar,
fica dito que passou **a 390**, não «no telemóvel».

---

## Medido — 08/09

    AMBITO390 visor=390 composicoes=13 com_defeito=0

Os seis critérios passam. **Passou a 390** — e não «no telemóvel».

| # | exige | resultado |
|---|---|---|
| 1 | treze medidos a 390 | **13**, com guarda de população |
| 2 | nada ampliado | nitidez **0,826-0,932** |
| 3 | texto legível | **11,6-12,9 px** |
| 4 | píxeis reais, nunca `naturalWidth` | `fetch(img.currentSrc)` + `createImageBitmap` |
| 5 | controlo acusa só o plantado | `scripts/provar-rv100-ranhuras-390.sh` |
| 6 | nenhuma guarda afrouxada | duas modificadas, e ambas **apertaram** — abaixo |

### A expectativa de 13,6 não se confirmou, e a razão não é defeito

Saiu **11,6 a 12,9**, não 13,6. O 13,6 assumia caixas de exactamente 380; as
caixas reais a 390 de visor são **322 a 358**, porque a página tem recuo. A conta
`14 × 380/390` estava certa para uma caixa de 380 — só que nenhuma o é. Todas
continuam acima dos 11.

### O teste de dois lados apontou duas vezes, e a primeira fui eu

**Primeira: o instrumento.** A medição dava 6,0 px no herói e 3,3 na `/product`,
e a causa não era o produto. Abaixo de 768 quem serve é o `<source>` estreito —
**a original de 390 entregue tal e qual** — mas eu dividia a caixa pelo `width`
do `<img>`, que é o do mestre largo. Dividia 358 por 834 quando o ficheiro que
chegou tem o texto a 14 px aos 390. **Media a captura errada.**

A distinção é verificável e não é palpite: o caminho do `next/image` passa por
`/_next/image` e o do `<source>` não. É prima do `naturalWidth` que o critério 4
proíbe — a diferença é que dessa vez o número impossível saltou à vista, e desta
o número era plausível.

**Segunda, e essa é do produto:** o herói KDS a **9,5 px**. O navegador escolheu
o 390 — o que não era 380 era **a caixa**: `.ns-heroi__segunda` é `width: 74%`, e
74% de 358 são **265**. Curado com 90% abaixo de 768, o mesmo ponto de corte em
que o `<source>` estreito entra: duas regras que dependem uma da outra partem no
mesmo sítio. Passou a **11,6 px**.

### O plante de 1280 seria MORTO aqui

Lá o plante troca `salaRecorte` pelo mestre `sala`. **A 390 isso não faz defeito
nenhum:** o `sala` tem variante de 390 como todos, o `<source>` serve-a na mesma,
e o número não se mexe. Um plante que não muda a medição teria passado por
controlo exercido sem exercer nada.

O plante que morde a 390 é **tirar-lhe a variante estreita**: sem `<source>`, o
`<img>` serve uma redução do mestre de 560 e o texto cai a **8,9 px**. Exercido,
e acusa **uma só**.

### Critério 6: duas guardas mexidas, e as duas apertaram

1. **`scripts/provar-rv100-ranhuras.sh`** — a contagem de acusações usava
   `[a-z0-9/-]`, que **para no `ES` maiúsculo de `/es-ES`**. Passa a aceitar
   maiúsculas e a desduplicar com `sort -u`, porque o relatório imprime a
   acusação duas vezes. Apertou: deixa de poder falhar em silêncio por caixa de
   letra. **Foi assim que apanhei — o guião dizia que o plante não mordia, e
   mordia.**
2. **`inspeccao/rv100-ranhuras.spec.ts`** — passa a usar `medir-ranhuras.ts`, a
   mesma medição que a de 390. Tinha escrito no módulo «uma implementação e dois
   chamadores» e isso ainda não era verdade. Apertou: a correcção da captura de
   origem passa a valer nos dois visores por construção.

Ambas verificadas pelo controlo de 1280, que continua a passar nos quatro passos.

### O que fica por medir, declarado

**Um visor não é a matriz.** 360 e 430 existem e não foram medidos.
