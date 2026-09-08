# «Última alteração ao produto» conta PNGs — 08/09, 11h10

## Primeiro, uma correcção ao que eu disse

Às 09h40 escrevi, a justificar deixar esta guarda para depois: *«está verde, não
grita lobo»*. **Já não está.** Fui verificar em vez de repetir a frase, e ela está
**vermelha** — saída 1, «77 artefacto(s) de prova são anteriores à última alteração
ao produto».

Uma caracterização de uma guarda tem a validade de uma medição, não de uma opinião,
e eu ia entregar trabalho baseado na minha de há duas horas.

## O que ela mede, e o que diz que mede

Linha 38:

```bash
PRODUTO=$(git log -1 --format='%ct' -- apps packages)
```

O último commit que toca em **qualquer coisa** dentro de `apps/` ou `packages/`. Sem
filtro de extensão.

E o cabeçalho da própria guarda, linha 24, declara outra coisa: *«toda a prova é
posterior à última alteração ao **produto**»* — sendo produto, na peça partilhada que
todas as outras usam, os ficheiros `.ts`, `.tsx` e `.css`.

## A medição

A guarda diz: `última alteração ao produto: d1f6c50`.

O que `d1f6c50` mudou dentro de `apps/` e `packages/`:

```
9 files changed, 0 insertions(+), 0 deletions(-)
  apps/web/src/demonstracao/**/sala-*.png    (nove imagens)
```

Ficheiros `.ts`/`.tsx`/`.css` nesse commit: **zero**.

**Recapturar as imagens da demonstração passa por «alterar o produto» e invalida 77
artefactos de prova.** Nenhuma linha de código mudou.

É a terceira cara do mesmo animal, hoje: **o sujeito declarado e o sujeito medido
não são o mesmo.** A etiqueta diz código, o comando diz «tudo o que estiver debaixo
destas duas pastas».

## Duas curas, e recomendo a primeira agora

**(a) Barata, e faz o medido coincidir com o declarado.** Filtrar por extensão no
próprio `git log`:

```bash
git log -1 --format='%ct' -- 'apps/**/*.ts' 'apps/**/*.tsx' 'apps/**/*.css' \
                             'packages/**/*.ts' 'packages/**/*.tsx' 'packages/**/*.css'
```

Tira o alarme falso de hoje e alinha a etiqueta com a medição. **Controlo negativo
obrigatório:** um commit só com imagens **não** pode contar; um commit com um `.ts`
**tem** de contar. Sem os dois lados, isto não está provado.

**(b) A direcção, não para agora.** O mesmo resumo por conteúdo das outras duas
guardas. Aqui é mais trabalho do que foi nas capturas: lá havia **um** manifesto a
carimbar, aqui são **77 artefactos** produzidos por vários guiões, e cada produtor
teria de registar o resumo do produto no momento em que produz.

Fica dito o que (b) traz e (a) não: (a) continua a comparar **datas de commit**, e
um `.ts` gravado por cima com o mesmo texto e commitado ainda contaria. É o mesmo
buraco que curámos hoje nas capturas, mais estreito.

## O canário

Continua a ser esta a única consumidora, e portanto continua a ficar. Nada muda aí
com (a) — só com (b).
