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
