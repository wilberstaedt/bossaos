# A landing em secretária, medida — 08/09 00h20

> Escrito depois de eu ter dado ao Matheus direcção de desenho **a olhar para
> cinco fotografias**. Isto mede o que eu afirmei. Onde a medição me corrige,
> está corrigido.

Medido ao vivo em `bossaos.mwdeveloper.tech/es-ES`, viewport 1440×900.

## O que eu disse, e o que a medição diz

| eu disse (de olho) | medido | |
|---|---|---|
| «seis grelhas de cartões» | **10** | **errei, e para menos** |
| «cartões órfãos, acontece duas vezes» | **5 das 10 grelhas** | **errei, e para menos** |
| «zero imagens abaixo da dobra» | **0**, de **3** na página inteira | confirmado |
| «as telas do herói a um terço» | **41 %** e **38 %** | quase — e o efeito é o mesmo |
| «"Aprende con la operación real" quase vazia» | **251 px para 170 caracteres** | confirmado |

**As cinco fotografias não chegavam para ver metade das grelhas.** As que faltam
— «Lo que cada parte hace», «El software es lo que pagas», «Media hora con tu
carta delante» — estão abaixo do que ele fotografou. **Dei-lhe um número que
saiu do enquadramento das fotos, não da página.**

## As grelhas, e onde ficam os órfãos

| itens | colunas | sobra | secção |
|---:|---:|---:|---|
| 4 | 3 | **1** | Hoy la misma información vive en cuatro sitios |
| 3 | 3 | 0 | Una base para cada parte del servicio |
| 4 | 3 | **1** | Cada uno ve lo suyo, sobre la misma base |
| 3 | 3 | 0 | Un plan para tu restaurante |
| 5 | 2 | **1** | Un servicio, de principio a fin |
| 4 | 3 | **1** | Lo que cada parte hace |
| 4 | 3 | **1** | El software es lo que pagas |
| 4 | 2 | 0 | Así empezamos contigo |
| 3 | 3 | 0 | Una base para trabajar con confianza |

**Metade das grelhas deixa um cartão sozinho numa fila.** Não é acaso de uma
secção: é o que acontece sempre que quatro itens entram numa grelha de três.

## A densidade, e a secção mais vazia

Texto por píxel de altura, as três mais vazias:

| densidade | altura | caracteres | secção |
|---:|---:|---:|---|
| 0,41 | 759 px | 312 | *herói* — é suposto, tem a imagem |
| **0,68** | **251 px** | **170** | **Aprende con la operación real** |
| 0,70 | 295 px | 207 | Media hora, con tu carta delante |

## O tamanho das telas do produto

| | original | servido | mostrado | |
|---|---:|---:|---:|---|
| `sala-servico-1440` | 1440 | **720** | 588 | **41 %** |
| `kds-cozinha-1280` | 1280 | **720** | 482 | **38 %** |

A 40 %, texto que no produto tem 14 px chega ao ecrã a **~5,5 px**. **A única
coisa que mostra o produto não se lê.** O `servido=720` é o defeito do `sizes`
já corrigido no código e ainda não publicado — mas corrigi-lo dá nitidez, **não
dá tamanho**.

## A página inteira

**7103 px de altura. Três imagens, todas no herói.** Depois do primeiro ecrã,
são ~8 ecrãs de caixas de texto sobre o mesmo bege.

## O que isto muda no que eu lhe disse

**A direcção estava certa e a magnitude estava errada — sempre para menos.**
Seis eram dez; duas eram cinco. E o erro tem uma causa que vale mais do que os
números: **eu medi o enquadramento das fotografias dele e chamei-lhe a página.**
