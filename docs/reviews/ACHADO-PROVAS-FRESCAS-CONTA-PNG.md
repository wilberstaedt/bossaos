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

---

## A cura barata, feita — 08/09

O filtro entrou no próprio `git log`, que é o que faz **o medido coincidir com o
declarado**:

    FILTRO_DE_PRODUTO=(
      apps/'*.ts' apps/'*.tsx' apps/'*.css'
      packages/'*.ts' packages/'*.tsx' packages/'*.css'
      ':(exclude)*next-env.d.ts'
    )

A referência passou de `d1f6c50` (08:07, **nove PNG e zero código**) para
`b61051c` (07:01, **dois `.ts`**). O `next-env.d.ts` fica de fora como na peça
partilhada: listas divergentes fariam duas guardas medir produtos diferentes.

### O controlo tem dois lados, e nenhum é afirmado

    ok   o filtro tem os dois lados: exclui d1f6c50 (sem código) e conta b61051c (com código)

Os dois commits são **reais e escolhidos na corrida**, não `sha` cravados — um
`sha` no ficheiro envelhecia no dia seguinte. E **a escolha do commit «só
imagens» não vem do filtro**: se eu o definisse como «o que o filtro exclui» e
depois exigisse que o filtro o excluísse, estava a perguntar-lhe se concorda
consigo próprio. Ele é identificado pelas **extensões que tocou**.

Os dois lados recusam por motivos opostos e ambos estão escritos: um filtro que
não exclua nada é o defeito de volta; um que exclua de mais dá verde para sempre.

### Um efeito que não era o objectivo

O portão passou de **13 abstenções para 12**. A que deixou de se abster é a
`validar-capturas-de-marketing`, e a razão é a migração de ontem: **num checkout
o conteúdo é o mesmo e as datas não**. Ao trocar tempo por conteúdo, ela deixou
de precisar do canário e passou a medir onde antes dizia «não sei».

### O que a guarda continua a acusar, e é outra pergunta

**50 artefactos**, e são de três naturezas que ela não distingue:

| | |
|---|---|
| 39 do dossiê **RV100** | evidência de uma interpretação que o North Star substituiu |
| 6 em `ns2/2026-09-08_a3935ea` | as capturas do «depois» — **genuinamente velhas**, são anteriores ao `b61051c` |
| 6 em `ns2/2026-09-08_483c4a7` | o «antes» da Fase 0.4 — **retratam um commit congelado de propósito** |

A última linha é a que interessa: **evidência do passado não é evidência
obsoleta**, e uma guarda que exige que toda a prova seja posterior ao produto vai
acusá-la para sempre. Não é a cura de fundo nem lhe toquei — fica dito, porque é
uma pergunta de âmbito e não de mecanismo.

### O canário

**Onde estava.** Esta guarda continua a ser a única consumidora, e continua a
medir `mtime`.

---

## Revisão do `c37bd6b`, e um achado maior por baixo — 08/09, 11h40

**Aceito a correcção.** Corri-a: a referência passou de `d1f6c50` (nove PNGs) para
`b61051c` (código), o controlo dos dois lados passa, e a acusação caiu de **77 para
50**.

E aceito com aplauso a parte metodológica, que foi dele e não minha: recusou-se a
definir o commit «só imagens» como *aquilo que o filtro exclui*, porque **«estava a
perguntar-lhe se concorda consigo próprio»**. Identificou-o pelas extensões que
tocou. É o defeito da lista tirada da propriedade testada, e ele apanhou-o sozinho.

Efeito lateral que ele mediu e vale registar: o portão passou de **13 abstenções
para 12**. A `validar-capturas-de-marketing` deixou de se abster porque, num
checkout, o conteúdo é o mesmo e as datas não. **Trocar tempo por conteúdo fê-la
medir onde antes dizia «não sei».**

## O achado: a população desta guarda é toda do sujeito errado

Ele deixou-me uma pergunta de âmbito — os 6 artefactos do «antes» da Fase 0.4
retratam um commit congelado de propósito, e uma guarda que exige toda a prova
posterior ao produto vai acusá-los para sempre. **«Evidência do passado não é
evidência obsoleta.»** Fui medir quanto disso havia, e há mais do que ele viu:

```
total em docs/visual:                          77
em pasta datada (YYYY-MM-DD_<sha>):            77
FORA de pasta datada:                           0
```

**Todos.** Cada artefacto vive numa pasta cujo nome já declara a data e o commit que
retrata. E a guarda compara-os todos contra o **HEAD**.

Um dossiê chamado `2026-09-06_e953a87` não pode ser posterior ao produto de hoje —
não por estar desactualizado, mas **por construção**. Logo:

- a acusação cresce monotonamente com a história do projecto;
- e um número que só sobe deixa de informar. **Uma guarda que acusa 50 ensina a ser
  ignorada**, e no dia em que uma acusação for verdadeira ela estará no meio das 50.

Não é um detalhe da implementação: é a escolha fundadora — comparar contra `HEAD`
uma população que se auto-declara histórica.

## A cura, e ela usa o que já construímos hoje

Cada artefacto passa a ser julgado contra **o commit que o seu próprio dossiê
nomeia**, nunca contra o `HEAD`. A pergunta deixa de ser «isto é foto do presente?»,
que uma pasta datada nunca pode satisfazer, e passa a ser **«isto retrata o commit
que diz retratar?»** — que é verificável e que é a pergunta que interessa.

Quatro respostas, e a terceira é a que a torna honesta:

1. o dossiê traz `impressaoDoProduto` (o mecanismo do `bbe68c6`) e ela bate certo
   com a árvore do commit nomeado → **ok**;
2. traz e não bate → **falha**, e nomeia;
3. **não traz** — os dossiês antigos — → **NÃO MEDI**, contado e nomeado. Não se
   inventa um veredicto sobre o que não se pode saber retroactivamente;
4. o sha nomeado não é um commit → **falha**: a declaração caducou.

Isto converte uma guarda que grita 50 vezes numa que ou mede, ou se abstém a dizer
porquê. E o carimbo que o JR construiu esta manhã para as capturas passa a ser a
peça de que ela vive — a mesma peça, a terceira consumidora.

---

## A cura de fundo, feita: cada dossiê contra o seu próprio commit — 08/09

A pergunta mudou de **«isto é foto do presente»** para **«isto retrata o commit
que diz retratar»**. Cada dossiê é julgado contra o `sha` do próprio nome, nunca
contra o HEAD.

### O instrumento, calibrado antes de servir

`impressao_do_commit(sha)` — a mesma impressão, sobre a **árvore de um commit**:
`git ls-tree` filtrado pelas mesmas extensões, e `git cat-file --batch` para o
conteúdo. Apontada primeiro a um sujeito de resposta conhecida:

    commit HEAD : 78a6091a220c5d72  735 ficheiros  (0.90s)
    disco       : 78a6091a220c5d72  735 ficheiros
    CALIBRACAO  : iguais

### O que a guarda diz agora

    NÃO MEDI docs/visual/ns2/2026-09-08_483c4a7 — sem carimbo do conteudo (6 artefactos)
    NÃO MEDI docs/visual/ns2/2026-09-08_a3935ea — sem carimbo do conteudo (6 artefactos)
    FALHOU   docs/visual/rv100/2026-09-06_e953a87 NÃO retrata e953a87 (65 artefactos)
             evidence/masters/mestres.json: 111 diferenca(s) — alterado …/floor/page.tsx; …

**A acusação deixou de ser um número que só sobe** — era 77, depois 50 — e passou
a ser uma frase que se pode agir: aquele dossiê chama-se `e953a87` e as suas
capturas foram refeitas hoje. **O nome afastou-se do conteúdo**, e isso é
verdade, não ruído. Curar é decidir se o dossiê se re-data ou se as capturas
voltam ao commit que ele nomeia — e essa decisão não é minha.

### Os três controlos, exercidos

Um repositório de mentira com um commit real, um dossiê `data_sha`, e **a guarda
corrida lá dentro** — não a lógica dela imitada:

    ok    carimbo que BATE: aceita (saida 0)
    ok    carimbo ESTRAGADO: recusa (saida 1) e nomeia
    ok    SEM carimbo: NAO MEDI (saida 2), e nao verde

E o controlo do controlo, porque três verdes de um contador que nunca acende não
valem nada: plantei a expectativa errada — exigir `0` onde a guarda dá `2` — e o
corredor foi a **saída 1**. Reposto, voltou a **0**.

Para isto ser possível a guarda ganhou `RAIZ_DOSSIES`. Sem ela, os três controlos
só se podiam afirmar.

### O canário ficou, e agora não tem consumidores

Esta guarda deixou de comparar `mtime`, portanto **já não o consulta** — e era a
última. Não o apaguei: a regra é sua e é boa, e quem a aplica agora sou eu a
dizer-lhe que a condição se cumpriu. **O canário está pronto a sair, e a decisão
é do senhor.**

---

## Revisão do `b322845` — a guarda apanhou-nos a nós — 08/09, 12h10

**Aceito, e ela funciona melhor do que eu esperava: a primeira coisa que acusou fomos
nós.**

```
FALHOU  docs/visual/rv100/2026-09-06_e953a87 NÃO retrata e953a87 (65 artefactos)
```

Verifiquei, e a acusação é **verdadeira**. A pasta chama-se `e953a87` e as capturas
lá dentro são de **hoje às 07h56**, tiradas sobre `b61051c` — fomos nós que as
regenerámos para dentro de um dossiê com o nome de outro commit. **O nome da pasta
mente sobre o conteúdo**, e mentia desde as 07h56 sem ninguém dar por isso.

Uma guarda cuja estreia é apanhar o erro de quem a mandou fazer é uma boa guarda.

### O canário: zero chamadores, e por isso sai

O JR deixou-o de pé «à minha decisão, já sem consumidores». Fui verificar em vez de
aceitar — foi por não verificar que quase o apaguei cedo de mais de manhã — e o
refino é este: `pagina-de-aprovacao.py:24` **ainda o importa**, mas
`grep '_reescritos('` não encontra **uma única chamada**. Import morto, zero
consumidores. A condição que eu próprio pus está cumprida.

**Decisão: sai, e a razão não é ser inútil — é que uma guarda que ninguém corre é uma
guarda que ninguém testa.** Fica com ar de rede de segurança e ninguém sabe se ainda
apara. É a mesma família do verde vazio: a aparência de protecção sem a protecção.
A lição que ela encerra — que os `mtime` mentem num clone fresco — está escrita no
`COMO-REVISO` e no histórico, e é isso que se guarda, não o código.

### E o que causou a acusação não se cura na guarda

Cura-se em **não declarar o mesmo facto duas vezes**. Hoje, «que commit é que estas
capturas retratam» está escrito em dois sítios: o **nome da pasta** e a
`impressaoDoProduto` **dentro do manifesto**. Duas declarações do mesmo facto acabam
sempre por discordar, e discordaram — em quatro horas.

O manifesto é o que deve mandar: é escrito pela corrida que captura, é verificável
contra a árvore, e não depende de alguém se lembrar de renomear uma pasta. O nome do
dossiê fica com a **data**, que serve para um humano navegar, e larga o sha.

### Defeito pequeno

A linha `FALHOU` sai **duplicada** na saída. Não muda o veredicto; suja um relatório
que existe para ser lido depressa.

---

## As três, feitas — 08/09

### 1 · O canário saiu, e levou a família

Fui verificar antes de cortar e o alcance era maior do que «um import morto».
**Zero consumidores medidos** para toda a família que media tempo:

| saiu | consumidores |
|---|---|
| `mtimes_reescritos` + `--canario` | 0 (o import em `pagina-de-aprovacao.py` era morto) |
| `mais_recente_do_produto` | 0 fora do módulo |
| `velhas`, `porque_e_que_o_produto_e_mais_recente` | 0 |
| o modo de CLI por caminhos | 0 |

Cortar só o canário deixava o modo por caminhos a medir `mtime` **sem a rede que
o tornava honesto** — pior do que estava. Saiu tudo: **417 → 203 linhas**, e o
módulo exporta agora exactamente as cinco funções que alguém chama.

A razão é a sua e fica escrita no cabeçalho do módulo: *uma guarda que ninguém
corre é uma guarda que ninguém testa*. A lição — os `mtime` mentem num clone
fresco — vive no `COMO-REVISO` e no histórico.

**E um susto meu:** a minha regra de corte comeu o `carimbar`, que tem dois
consumidores. Apanhei-o por listar os exportados depois do corte, em vez de
confiar no diff. Reposto do commit anterior.

### 2 · O manifesto manda, e o nome da pasta só traz a data

O carimbo passou a registar `commit` e `arvoreLimpa`. O segundo não é enfeite: se
a árvore tinha alterações por commitar, as capturas **não retratam commit
nenhum** — retratam uma árvore, e guardar o `sha` calando isso era prometer uma
verificação que não podia passar.

As pastas foram renomeadas, e duas caíam na mesma data — o discriminador passou a
ser um **nome**, que é o que um humano navega:

    2026-09-06_e953a87  →  2026-09-06
    2026-09-08_483c4a7  →  2026-09-08_antes
    2026-09-08_a3935ea  →  2026-09-08_depois

28 ficheiros de código seguiram o nome, e **os caminhos guardados dentro dos
próprios manifestos também** — esses só apareceram quando o gerador rebentou a ler
uma imagem que já não estava ali. Nos comentários que contam a HISTÓRIA repus o
nome antigo: a história aconteceu com o nome antigo.

### 3 · Uma linha por dossiê

    ok  docs/visual/rv100/2026-09-06 retrata o que diz (65 artefactos):
        evidence/demonstracao/composicoes.json = a96b12a | evidence/masters/mestres.json = a96b12a

E ao arrumar a duplicação encontrei pior, na própria guarda que existe para isto:
**um manifesto que não se podia medir desaparecia atrás de outro que batia.**
Verde sobre nada. As abstenções acompanham agora sempre o veredicto.

### Os controlos, exercidos

    ok    carimbo que BATE: aceita (saida 0)
    ok    carimbo ESTRAGADO: recusa (saida 1) e nomeia
    ok    SEM carimbo: NAO MEDI (saida 2), e nao verde

A fixture teve de passar a carimbar com `commit` e `arvoreLimpa` — **com a forma
antiga a guarda abstinha-se, e um controlo que se abstém não é um controlo.** Foi
a corrida que o disse, não eu.
