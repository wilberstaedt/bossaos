# A guarda de frescura recusa quando um ficheiro é tocado sem mudar — 08/09, 08h00

## O que aconteceu

Às 06h59 o `pagina-de-aprovacao.py` gerou a página com **25/25 capturas posteriores
à fonte mais recente do produto** — a guarda aceitou por si. Às 08h00 corri o mesmo
gerador e ele **recusou**: «25 capturas anteriores à fonte mais recente do produto».

Entre os dois momentos ninguém mudou o produto.

## A medição

| | quando |
|---|---|
| captura mais recente | 08/09 **06:58:51** |
| `apps/web/src/staff/PainelDaFila.tsx` | 08/09 **07:00:30** |
| `apps/web/app/[idioma]/app/[orgSlug]/catalogo/page.tsx` | 08/09 **07:00:30** |

E o que decide tudo:

```
git status --short <os dois ficheiros>   →   VAZIO
```

**O conteúdo é idêntico ao commit.** Os últimos commits que lhes tocaram a sério são
antigos — `59c1161` e `e655130`. Alguma coisa às 07h00:30 reescreveu-os com o mesmo
texto, quase de certeza um formatador a gravar o que já lá estava.

## Porque é que isto importa

A guarda compara **`mtime`**. Uma ferramenta que reescreve um ficheiro sem o alterar
move o `mtime` e envelhece, de uma vez, **todas** as capturas do repositório. É uma
recusa falsa, e é cara: a resposta óbvia é recapturar, o que exige um build inteiro —
numa máquina que hoje está em **ATENÇÃO** e com histórico de quatro kernel panics.
**Manda-se alguém gastar meia hora e um risco real para curar uma coisa que não
aconteceu.**

Falha para o lado seguro, e isso é uma virtude — mas o custo do lado seguro aqui não
é zero, e o sinal não distingue «o produto mudou» de «alguém gravou por cima».

O canário que já existe (`mtimes_reescritos`) **não apanha isto**: foi desenhado para
o caso do `clone`/`worktree`, em que o git reescreve **tudo** ao mesmo tempo. Aqui
moveram-se **dois** ficheiros. O instrumento está correcto e o sujeito é outro.

## A cura, e porque não a fiz agora

O sujeito certo é o **conteúdo**, não o carimbo do ficheiro: o produto está mais
recente que as capturas se **(a)** algum ficheiro de produto tem alterações por
commitar, ou **(b)** o commit de produto mais recente é posterior às capturas. As
duas perguntas são sobre conteúdo e nenhuma se move quando um formatador grava.

Não a implementei, e a razão é de risco e não de esforço: `mais_recente_do_produto`
é importada por outras guardas, e mexer no coração de um instrumento partilhado às
08h00, sozinho, com o JR a descansar contexto e o Matheus a dormir, é trocar um
incómodo medido por um risco não medido.

**Cura mais barata, se a de cima parecer grande:** quando recusar, perguntar se os
ficheiros acusados têm alterações por commitar. Se não tiverem, dizê-lo na recusa —
«o conteúdo é o do commit; só o `mtime` mexeu». Não muda o veredicto, e impede que a
próxima pessoa gaste um build a curar o que não está partido.

## O que ficou por exercer, e é meu

Pus no gerador o **carimbo** que esta página não tinha — a data e o commit
capturados, para o leitor poder fazer sozinho a conta que eu tive de fazer com
`git log`. O código está escrito, com o motivo, e **nunca correu**: a primeira
geração que o usaria foi a que a guarda recusou. Não o dou por feito.

Publiquei, essa sim, a página que o JR gerou às 06h59 — a que a guarda aprovou por
si. Não lhe colei carimbo à mão: a página é legítima, e um carimbo escrito por mim
ao lado de uma garantia gerada pela máquina confunde quem os lê a seguir.

---

## Metade curada — 08/09, 08h15

Fiz a cura barata, e **de propósito não fiz a outra**.

**O que mudou:** a recusa deixou de dizer só «está velho». Agora nomeia o que ficou
mais recente que a última captura e, para cada um, se mudou de conteúdo ou se só lhe
mexeram a data. Quando **nenhum** mudou, di-lo e acrescenta que recapturar não cura.
Ao vivo, neste repositório:

```
O que ficou mais recente que a ULTIMA captura:
    07:00:30  apps/web/src/staff/PainelDaFila.tsx  <- so o mtime - o conteudo e o do commit
    07:00:30  apps/web/app/[idioma]/app/[orgSlug]/catalogo/page.tsx  <- so o mtime ...

NENHUM deles mudou de conteudo: foram gravados por cima iguais.
Recapturar NAO cura isto - a comparacao e por data de ficheiro,
e o produto que as capturas mostram continua a ser o mesmo.
```

**O veredicto não mudou:** continua a recusar, e continua a sair 1. Isso é escolha,
não meio caminho — ver abaixo.

**Prova, dos dois lados.** Um detector que dissesse «só o mtime» para tudo dava
exactamente o mesmo ecrã acima e não provava nada. Pus um ficheiro `.ts` novo em
`packages/domain/src/` e voltei a correr:

```
07:10:04  packages/domain/src/CONTROLO-NEGATIVO-TEMPORARIO.ts  <- MUDOU (tem alteracoes por commitar)
```

A etiqueta mudou **e** a conclusão «NENHUM deles mudou» desapareceu, que é a parte
que interessa: a frase que pouparia o build só aparece quando é verdadeira. Removido
o ficheiro, tudo voltou ao estado anterior; a árvore ficou limpa.

## Porque é que parei aqui

A cura completa — medir **conteúdo** em vez de data — arrisca o único erro que esta
guarda não pode cometer. Se eu enganar-me a decidir que um ficheiro «não mudou»,
produzo um **verde falso**, e um verde falso aqui significa mostrar à Nathalia
capturas de um produto que já não existe, com uma garantia por cima a dizer que são
recentes. A cura que fiz só pode enganar para o lado de dizer demais.

Escrevo isto porque a diferença não é de tamanho, é de direcção: **entre duas curas,
a que erra para o lado seguro faz-se sozinha; a que erra para o lado perigoso espera
por quem a reveja.**

## Por rever — não assino o que escrevi

`scripts/frescura_do_produto.py` (função nova) e `scripts/pagina-de-aprovacao.py` (a
recusa) são meus. Falta o JR olhar. E fica de pé o que já estava declarado: **o
carimbo que pus no gerador continua sem nunca ter corrido**, porque a geração que o
usaria é justamente esta, que a guarda recusa — e com razão de forma, ainda que não
de fundo.

---

## O bloco podia faltar em silêncio, e quem o viu não soube porquê — 08/09, 08h30

O JR reviu o código e devolveu isto, que é a parte que interessa:

> Uma coisa que não consigo explicar, e digo-o em vez de a arrumar. Na primeira
> invocação deste lote, mesmo comando e mesmos dois ficheiros na mesma data, o bloco
> não imprimiu. (…) **Não tenho terceira teoria e não construo uma.**

Tinha razão em não construir. A causa é minha e é de limiar.

**A recusa e a diagnose olhavam para números diferentes.** A recusa dispara se
**alguma** captura for mais velha que o produto. A minha diagnose listava o que era
mais recente que a captura **mais nova**. Um ficheiro de produto tocado *entre* a
captura mais velha e a mais nova satisfaz a primeira e não a segunda — a guarda
recusa e a explicação fica muda.

Reproduzido com números, sem tocar no repositório:

```
capturas: [100, 110, 120]   produto: 115
recusa dispara?    True (2 capturas velhas)
diagnose imprime?  False
```

Com **25 capturas escritas ao longo de segundos**, um ficheiro gravado a meio cai
nessa janela. Não é um caso raro: é o caso normal de quem grava enquanto se captura.

**A cura é usar o limiar da recusa** — a mais velha das capturas acusadas. E isso dá
uma propriedade melhor do que «costuma aparecer»: se existe uma captura mais velha
que o produto, então o produto mais recente é, por definição, mais recente que essa
captura. **A lista não pode ser vazia.** Verifiquei sobre mil configurações
aleatórias de capturas e produto: zero casos de recusa com diagnose vazia.

E, ao corrigir, apanhei-me a deixar o cabeçalho a dizer «mais recente que a ÚLTIMA
captura» quando o limiar já era outro. Corrigido antes de commitar. **Um rótulo que
descreve mal o próprio sujeito foi o defeito de toda esta noite; não o ia deixar
escrito na cura dele.**

### O que isto diz sobre o modo de trabalhar

O JR não sabia a causa e escreveu a observação em bruto, sem a arredondar e sem
inventar explicação. Se a tivesse arrumado com uma teoria plausível — «terá sido o
buffer» — eu teria lido a teoria em vez do facto, e o buraco ficava lá. **Uma
anomalia relatada crua vale mais do que uma anomalia explicada por adivinhação**, e
foi a recusa dele em ter uma terceira teoria que tornou esta causa encontrável.

---

## A cura que eu propus tem um buraco, e é do lado perigoso — 08/09, 09h15

Voltei a olhar para a cura que deixei escrita aqui em cima — «o produto é mais
recente se algum ficheiro tem alterações por commitar, ou se o commit de produto
mais recente é posterior às capturas» — e ela **falha no caso da reversão**:

```
commit antigo (t=10) → alguém edita (t=50) → CAPTURA-SE com a edição (t=60)
                                           → alguém reverte para o commit (t=70)
```

As capturas mostram código editado que **já não existe no produto**.

| regra | produto | captura | veredicto |
|---|---|---|---|
| por `mtime` | 70 | 60 | **RECUSA** — certo |
| por conteúdo (a minha) | 10 | 60 | **VERDE** — errado |

A regra grosseira apanha-o e a minha, mais fina, não. E falha exactamente na
direcção que esta guarda não pode falhar: **verde sobre capturas que retratam código
que já não existe.** Deixei isto escrito como «a cura», e a pessoa seguinte — que
provavelmente seria o JR — ia implementá-la em boa fé.

### A cura certa: hash no momento da captura

O erro das duas regras é o mesmo, e é o desta noite inteira: **ambas medem TEMPO
quando a pergunta é sobre CONTEÚDO.** Uma mede a hora do ficheiro, a outra a hora do
commit; nenhuma pergunta se o produto é o mesmo.

A pergunta certa responde-se assim:

1. **No momento da captura**, calcular o hash do conteúdo dos ficheiros de produto
   (os mesmos `.ts/.tsx/.css` de hoje) e guardá-lo ao lado das capturas, no
   `mestres.json`.
2. **Na guarda**, recalcular e comparar. Diferente → recusa. Igual → passa.

O que isso resolve, caso a caso:

| situação | hash |
|---|---|
| formatador grava por cima, texto igual | igual → **passa** (o falso de hoje) |
| reversão depois da captura | diferente → **recusa** (o falso da minha proposta) |
| alteração a sério | diferente → **recusa** |
| capturas tiradas de árvore com alterações por commitar | funciona — o hash é da árvore, não do git |

E há um bónus que vale por si: **deixa de depender de `mtime`**. Isso arruma de vez o
problema para que o canário existe — no `clone` ou `worktree` fresco o git reescreve
todas as datas e a comparação fica cega. Com hash, um checkout fresco dá o mesmo
hash, porque o conteúdo é o mesmo. **O canário passa a ser desnecessário**, e isso é
o sinal de que o sujeito passou a estar certo: a defesa contra a medição ilegível
deixa de ser precisa quando se mede a coisa que não mente.

### O que faço com isto

Não implemento. **É trabalho para o JR e revisão para mim** — é essa a divisão, e
uma guarda que decide o que a Nathalia vê não é sítio para eu assinar o meu próprio
código. Fica-lhe o desenho, com os quatro casos acima a servir de teste, e o caso da
reversão a ser o controlo negativo obrigatório: **uma implementação que não recuse a
reversão não implementou isto.**

---

## A cura por conteúdo, implementada — 08/09

**A regra que estava escrita aqui estava errada, e o sénior corrigiu-a antes de
alguém lhe pegar:** usar a data do último commit para ficheiros limpos dá **verde
numa reversão**. Alguém edita, captura com a edição, reverte — o ficheiro fica
limpo, o commit é antigo, e as capturas mostram código que já não existe. **A
regra grosseira do `mtime` apanhava esse caso; a "melhor" não.**

O erro das duas é o mesmo: **medem TEMPO quando a pergunta é de CONTEÚDO.**

### O que foi feito

- `frescura_do_produto.impressao_do_produto(raiz)` — sha256 do conteúdo de cada
  ficheiro de produto, mais um resumo. Mesmo âmbito da `mais_recente_do_produto`,
  de propósito: âmbitos diferentes fariam duas guardas medir produtos diferentes.
  **735 ficheiros em 0,33 s.**
- `diferencas_do_produto` — devolve alterados, novos e desaparecidos, para a
  recusa poder **nomear**. Uma recusa que só diz «mudou» manda procurar às cegas.
- `frescura_do_produto.py --carimbar <manifesto>` — escreve a impressão no
  `mestres.json`. **O carimbo é calculado em Python e não no capturador, que é
  JavaScript:** duas implementações do mesmo resumo concordam até ao dia em que
  uma muda de ordenação, e nesse dia a guarda recusa tudo sem nada ter mudado.
- `provar-mestres.sh` carimba **logo a seguir à captura**.
- `pagina-de-aprovacao.py` recalcula e compara. Sem carimbo, responde **NÃO
  MEDI** — não cai para `mtime` em silêncio.

### Os quatro casos, exercidos

`scripts/provar-frescura-por-conteudo.sh`, sobre uma árvore de mentira — provar
isto no repositório obrigava a editar e reverter o produto para provar uma
guarda:

    ok    produto intacto: aceita
    ok    formatador grava por cima igual: ACEITA (o `mtime` mudou para 1788846731)
    ok    REVERSAO: RECUSA, e nomeia apps/web/src/Ecra.tsx
    ok    alteracao a serio: RECUSA, e nomeia o ficheiro
    ok    arvore com alteracoes por commitar: aceita (o resumo e da arvore, sem git)
    ok    ficheiro NOVO e visto
    ok    ficheiro APAGADO e visto

**A reversão não é afirmada, é exercida** — é o controlo que separa esta
implementação de uma que só parece funcionar.

### E no caminho real

    frescura: 25/25 capturas sobre o produto de agora (resumo 78a6091a220c5d72, 735 ficheiros)

**A recusa falsa que abriu este documento desapareceu:** os dois ficheiros de
`07:00:30` têm o conteúdo do commit, portanto o resumo não mexeu. E a recusa
verdadeira dispara — acrescentei uma linha a `packages/ui/src/estilos.css` e:

    RECUSO: o produto mudou desde que estas 25 capturas foram tiradas.
        alterado       packages/ui/src/estilos.css

Reposto o ficheiro **com `touch -r`**, para não envelhecer nada.

### O canário: concordo em parte, e NÃO o apaguei

O bónus era verdadeiro para **este** caminho: sem `mtime`, o canário dos
`mtimes_reescritos` não tem função aqui, e por isso saiu do
`pagina-de-aprovacao.py`. **Mas não é apagável.** A `validar-provas-frescas.sh`
continua a comparar `mtime` e consulta o canário — apagá-lo agora cegava-a, e
uma guarda cega é pior do que uma guarda cara. Fica de pé até essa também mudar
de pergunta, e a `validar-capturas-de-marketing.sh` é a terceira que ainda mede
tempo (reprova hoje pela mesma recusa falsa).

---

## Revisão do `bbe68c6`, e as três decisões que ele me deixou — 08/09, 09h40

**Aceito.** Não por ler o relatório: corri eu a prova, e os sete controlos passam,
incluindo o que eu tinha posto como obrigatório.

```
ok  formatador grava por cima igual: ACEITA (o `mtime` mudou para 1788847094)
ok  REVERSAO: RECUSA, e nomeia apps/web/src/Ecra.tsx
ok  alteracao a serio: RECUSA, e nomeia o ficheiro
ok  arvore com alteracoes por commitar: aceita (o resumo e da arvore, sem git)
ok  ficheiro NOVO e visto        ok  ficheiro APAGADO e visto
```

E no caminho real: `frescura: 25/25 capturas sobre o produto de agora (resumo
78a6091a220c5d72, 735 ficheiros)`. A recusa falsa que abriu isto desapareceu.

Uma correcção ao meu próprio processo: quando li o relatório dele pelo fim, não vi o
controlo da reversão e ia perguntar por ele. Estava lá, à frente. **Ler o fim de um
relatório e concluir sobre o todo é o mesmo erro que o `head -6` de manhã** — cortei
a evidência e raciocinei sobre o corte.

### Decisão 1 — o canário FICA, e eu estava errado

Eu escrevi que o hash «torna o canário desnecessário». O JR não o apagou, e explicou:
a `validar-provas-frescas.sh` **continua a comparar `mtime`** e consulta-o; apagá-lo
cegava-a, «e uma guarda cega é pior do que uma cara».

Tem razão, e o erro que eu ia cometer tem nome nesta casa: **um buraco portante.**
Olhei para o canário do alto do caminho que acabara de curar, vi-o inútil *desse*
ponto de vista, e concluí que era inútil. **Uma peça só fica obsoleta quando o último
caminho que a usa deixa de a usar — não quando o primeiro deixa.**

### Decisão 2 — a `validar-capturas-de-marketing.sh` migra, e é a urgente

Está **vermelha agora**, e por falso. Medido por mim:

```
FALHOU  há capturas anteriores à fonte mais recente do produto:
        24 medidas na frescura, 24 anteriores ao produto.
```

São os mesmos dois ficheiros das 07h00:30, com o conteúdo do commit. **Uma guarda
que grita lobo ensina a ignorá-la**, e esta guarda protege justamente as imagens que
um comprador vê primeiro. O desenho já existe, está implementado e provado, e a
população é da mesma forma — capturas contra produto. Passa para o JR.

### Decisão 3 — a `validar-provas-frescas.sh` fica para depois, e digo porquê

Também mede tempo, mas **está verde** e a população é outra (provas contra fontes,
não capturas contra produto). Não grita lobo, e migrá-la exige um desenho próprio em
vez de copiar este. Fica a seguir — e é ela a última consumidora do canário: **quando
migrar, o canário pode sair, e não antes.**

### Sobre o que ele reportou de si próprio

Correu um build com a máquina em ATENÇÃO sem avisar antes, e disse-o sem eu
perguntar. A regra é boa e foi quebrada; o que a mantém viva é exactamente isto —
**uma regra que só se ouve quando é cumprida deixa de ser uma regra e passa a ser uma
decoração.** Fica registado, sem mais.

---

## A `validar-capturas-de-marketing` migrada — 08/09

Era a que estava a **gritar lobo**: saída 1, 24 de 24 «anteriores ao produto»,
pelos mesmos dois ficheiros das 07h00:30 que têm o conteúdo do commit — sobre as
primeiras imagens que um comprador vê. **Agora aceita, e aceita por medição.**

    ok       24 de 24 capturas presentes
    ok       as duas sondas acenderam e saíram
    ok       as 24 mostram o produto de agora e são distintas entre idiomas
    saida=0

### O que mudou, e o que ficou igual

- O `provar-demonstracao.sh` **carimba o `composicoes.json`** logo a seguir à
  captura, como o corredor dos mestres.
- A guarda chama `frescura_do_produto.py --comparar` — **a mesma peça**, não uma
  cópia. As duas guardas fazem agora literalmente a mesma pergunta.
- **A sonda mudou de sujeito com a pergunta.** Já não se planta um ficheiro
  datado de 2000, porque a data deixou de decidir: estraga-se **uma** entrada da
  impressão guardada, só em memória, e exige-se que a comparação acuse. Um
  comparador cego diria «igual» também aí.
- A sonda do idioma fica como estava — mede somas das imagens, e essa pergunta
  não mudou.
- A frase de sucesso deixou de dizer «posteriores ao produto». Uma guarda cuja
  mensagem descreve a pergunta antiga ensina o modelo errado a quem a lê.

### Uma decisão de forma

`mestres.json` é um objecto e `composicoes.json` é uma **lista**. O `carimbar`
envolve a lista (`{"capturas": [...], "impressaoDoProduto": {...}}`) em vez de
escrever um segundo ficheiro ao lado: **a impressão pertence ao manifesto das
capturas que descreve**, e separá-los era garantir que um dia andam
desemparelhados. O capturador reescreve a lista a cada corrida e o corredor
volta a carimbar logo a seguir, portanto a forma converge sempre.

### O controlo negativo, ao vivo

Acrescentei uma linha a `packages/ui/src/estilos.css`:

    FALHOU   o produto MUDOU desde que estas capturas foram tiradas:
             alterado      packages/ui/src/estilos.css
             Isto NÃO é uma data a mexer: é o conteúdo a ser outro.

Reposto com `touch -r`, e a guarda voltou a **saída 0**.

### O canário

**Fica**, e agora com uma só consumidora: a `validar-provas-frescas.sh`. Saiu
deste caminho porque aqui já não há `mtime` — não porque tenha deixado de servir.
Quando essa migrar, com desenho próprio (a população dela é outra: provas contra
fontes, não capturas contra produto), o canário sai. **E não antes.**
