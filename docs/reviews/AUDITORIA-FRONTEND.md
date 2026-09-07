# Auditoria de frontend — o que o «está feio» era, medido

> Pedida pelo Matheus a 07/09 às 13h33: «essa auditoria de frontend tem que rodar
> especialistas e skills de frontend, pq do jeito que tá tá feio, já tem a
> identidade visual e logos, então arruma pfv antes de replicar pras 300 telas».
>
> Quatro agentes, **uma só régua** — a do manual de marca, já verificada em
> `03_DIRECAO_DE_MARCA.md`. Se cada um lesse o manual por si, eu ficava com quatro
> gostos em vez de uma medição.

## O diagnóstico, e agora tem ficheiro e linha

A direcção de marca já dizia que **o sistema de tokens está construído e é fiel
ao manual número a número**. Faltava explicar porque é que os ecrãs parecem
montados à mão apesar disso. A resposta apareceu:

> `apps/web/src/staff/NavegacaoDoStaff.tsx:82` → `className="bo-publico__seccoes"`
>
> **A navegação do Staff veste a folha de estilos do SITE PÚBLICO.** Herda o raio
> de cápsula (999 px) de uma etiqueta, quando a régua manda 10 px para controlos.
> É por isso que «tudo vira pastilha»: é o link do site público, com o CSS do
> site público, num ecrã de salão.

Não é falta de marca. É **falta da camada de composição** entre os tokens e o
ecrã — e cada tela foi vestida com a classe que estava à mão.

## Os dois que pagam mais, e são uma linha cada

Dois agentes, em superfícies diferentes e sem se falarem, **caíram no mesmo
token**. Convergência de lentes independentes levanta um achado de ecrã a achado
de classe:

| token | a régua manda | está | alcance medido |
| --- | --- | --- | --- |
| `.bo-estado__sobrancelha` (`estilos.css:405`) | rótulos 14/20, **nunca abaixo de 14 px** | **12 px** | **328** usos |
| `.bo-pagina` (`estilos.css:888`) | conteúdo até **1200 px** | **1100 px** | **291** ficheiros |

**Verificado por mim, não aceite dos agentes.** E é exactamente por isto que
replicar antes de arranjar sairia caro: o defeito ia cozido nas 300 telas, e
depois custava 300 correcções em vez de duas linhas.

## O resto, por superfície

**Staff (M04)** — links do índice a renderizar **azul sublinhado do navegador**,
porque `.bo-staff .bo-lista a` define só disposição e nunca `color` nem
`text-decoration` (verificado: `estilos.css:663-667`). O título repetido que o
Matheus viu tem causa exacta — `SECCOES_DO_STAFF` inclui a secção actual, e as
duas usam a mesma chave `staffE15.turno`; aparece **três** vezes na página de
índice. Nenhum bloco usa `.bo-cartao`, que existe e é usado em 15 sítios do
produto. E o `actor.nome` **já existe** (`sessao.ts:45`) e está a ser ignorado a
favor do email.

**Backoffice (M03)** — a área de conteúdo não usa **nada** do que o próprio
sistema já construiu para o caso: o componente `Estado`/`factos`, a `.bo-tabela`
e o `.bo-estado__numero` existem e são usados noutros ecrãs; este escreve
`<p>` e `<span>` sem classe. Os rótulos («Timezone», «Lines», «Average per
line») **estão no dicionário e não são referenciados**. E a migalha diz sempre
«People and access» porque está fixa no layout.

## Onde eu paro

Isto é implementação, e implementação não é minha. Passo ao JR com a ordem de
retorno: **primeiro os dois tokens** (duas linhas, 328 e 291 ecrãs), depois a
classe própria para a navegação do Staff, depois o resto por severidade.

Os achados marcados como **gosto sem regra** ficam para o Matheus. Eu só mando
corrigir o que viola a régua — a diferença entre as duas colunas foi exigida a
cada agente, e é o que impede uma auditoria de virar preferência.

---

## Os quatro entregaram. O que eu verifiquei, e o que muda o plano

**Três dos quatro agentes, em superfícies diferentes, caíram no MESMO token** —
`.bo-estado__sobrancelha` a 12 px contra os 14 da régua. Convergência de lentes
independentes é o sinal mais forte que uma auditoria pode dar: deixa de ser
achado de ecrã e passa a ser defeito de classe.

### Os dois achados que eu não esperava, e verifiquei um a um

**1 · O botão primário do KDS é invisível.**

```
--bo-primaria:            #102E35   ← .bo-botao--primario enche-se com esta
--bo-superficie-inversa:  #102E35   ← .bo-kds pinta-se com esta
```

**São a mesma cor.** A acção mais repetida da cozinha — «Empezar», «Marcar
lista» — é texto branco a flutuar sem caixa. O agente mediu por píxel na região
do botão: só existem duas cores, o fundo a 86 % e o texto a 14 %. **Zero
preenchimento.**

E não é um acaso isolado: é a **terceira** vez que a mesma família de defeito
aparece. O próprio `estilos.css` tem o recibo das duas primeiras, em 39 linhas de
CSS defensivo escritas para as reparar — *«isso dava 1.00:1: texto da cor do
fundo, ou seja, invisível»* (linha 761) e *«dava 1.00:1 outra vez — o mesmo
defeito ao contrário»* (linha 790). **Um componente claro colocado numa
superfície escura, três vezes, porque não há quem lhe pergunte em que superfície
está.**

**2 · Um token com quatro suítes de prova e zero consumidores.**

```
--bo-publico-acento:  1 definição · 0 regras que o consomem · 4 ficheiros de prova
```

É o único canal de cor de marca que um restaurante pode configurar na carta.
É **calculado** por restaurante, **injectado** no DOM, e **coberto por quatro
suítes** — e **nenhuma regra CSS o usa**. As provas passam todas: testam o
cálculo, nunca a renderização.

**Isto fecha uma medição minha de há duas horas.** Contei os píxeis de acento nas
25 capturas e a carta pública deu **zero**. Registei o facto e deixei o juízo ao
Matheus — «calma deliberada ou identidade em falta?». **Era identidade em falta,
e a peça existe, testada, desligada.** Eu tinha o sintoma; faltava-me a causa.

### O que isto ensina, e é a forma mais pura da noite

**Quatro provas verdes sobre um token que não pinta nada.** Nenhuma delas mente:
o cálculo está certo, a injecção está certa, a cobertura é real. **Elas provam
tudo excepto que alguém vê o resultado** — e é exactamente por isso que o
`grep -c 'var(--bo-publico-acento'` a devolver **0** vale mais do que as quatro
juntas. Um token é motor; sem uma regra que o consuma, não tem carroçaria.

---

## Tarefa (4) fechada — e o ciclo fecha-se com o instrumento com que abriu

**O token morto passou a pintar.**

| | antes | agora |
| --- | ---: | ---: |
| regras que consomem `var(--bo-publico-acento)` | **0** | **1** |
| píxeis de acento na carta pública | **0** | **188** |

**O «antes» era meu, de há três horas.** Contei os píxeis de acento nas 25
capturas, a carta deu zero, e eu registei o facto **recusando-me a decidir** se
era calma deliberada ou identidade em falta — porque isso é juízo do Matheus.
A auditoria encontrou a causa (quatro suítes de prova, zero consumidores), o JR
ligou-a, e **a mesma contagem confirma a cura**.

**O arco completo tem a forma que eu quero em toda a revisão:** o mesmo
instrumento nas duas pontas, com a causa medida por terceiros no meio. Eu tinha
o sintoma e não o inventei em diagnóstico; alguém achou o mecanismo; a cura
verifica-se contra o número original.

**E as quatro suítes continuaram verdes o tempo todo — antes e depois.** Nunca
mentiram: testavam o cálculo do token, e o cálculo estava certo. **O que valia
mais do que as quatro era um `grep -c` a devolver zero consumidores** — uma
pergunta que nenhuma delas fazia.

## As três correcções que devolvi, verificadas

| o que eu apontei | como ficou |
| --- | --- |
| `.bo-pagina` com `1200px` à mão | **`max-width: var(--bo-largura-maxima)`** — passou a perguntar em vez de afirmar |
| lotação da mesa a 12 px, fora das três rotas medidas | **14 px/20 px** |
| população do «nunca abaixo de 14 px» | **4 → 1**, e o que resta é `.bo-mkt__seta`, o glifo `▾` com `aria-hidden` |

A última é a que tem a forma certa: **uma partição que fecha com a excepção
declarada**, e não um piso. O que sobra sobra por uma razão escrita — não é
texto, é um símbolo — e o crachá discutível e o CSS morto saíram os dois.

---

## As sete fechadas — verificação minha, 15h20

| # | o que era | verificado |
| --- | --- | --- |
| 1 | sobrancelha 12 px · página 1100 px | 14/20 · `var(--bo-largura-maxima)`; população do «nunca abaixo de 14» de **4 → 1**, e o que resta é o glifo `▾` |
| 2 | botão do KDS invisível | **1,00:1 → 13,05:1**; cores acima de 2 % na região: **1 → 2**; **−39 linhas** de CSS defensivo |
| 3 | coral na navegação do KDS | **276 px → 0**, e o mais saturado do ecrã passou a ser `#8A5100`, a etiqueta do pedido |
| 4 | token com 4 provas, 0 consumidores | consumidores **0 → 1**; acento na carta **0 → 188 px** |
| 5 | Staff a vestir a folha do site público | `bo-publico__seccoes` → **`bo-seccoes`**, raio de **controlo** e `--bo-toque-operacao` por token |
| 6 | conteúdo do backoffice sem componentes | `.bo-tabela` + 5 `.bo-estado__numero` onde eram zero; migalha derivada |
| 7 | 4.ª instância do `activa: true` | **saiu** das duas rotas reais; o catálogo de desenho mantém os 2 usos legítimos |

## E um erro meu no fim, que é o que eu tinha avisado

**Quase reportei a migalha como por corrigir.** O `grep` no chamador ainda mostra
`migalha={m.pessoas.titulo}`, e eu ia dá-la como aberta. **Está curada, e no
componente:**

```
const migalhaDaRota = navegacao.find(…)?.rotulo ?? migalha;
```

**A derivação vence e o valor passado é o RECURSO** — o inverso exacto da porta
de fuga do `activa`, onde o passado vencia e por onde o defeito sobreviveu quatro
vezes. **A mesma forma de código com a precedência trocada é uma cura num sentido
e um buraco no outro**, e ler o chamador não distingue as duas: só a ordem do
`??` o faz.

Eu tinha escrito essa lição há duas horas e ia cair nela pelo outro lado. **Ver o
chamador nunca chega — a pergunta é sempre qual dos dois ganha.**

---

## Olhei para a captura antes de republicar, e sobrava a queixa nº 1 — 15h30

As sete estão verificadas e o Staff melhorou a sério: as pastilhas passaram de
cápsula a **rectângulo de controlo**, o `demo@bossaos.invalid` deu lugar a
**«Bossa Demo»**, a sobrancelha cresceu para 14 px, e os itens passam a caber
dois por linha.

**Mas o título «Tu turno, a la vista» continua a aparecer DUAS vezes** — como
cabeçalho e outra vez como primeira pastilha. É **a primeira coisa que o Matheus
nomeou** quando abriu esta conversa sobre o Staff.

O que aconteceu tem uma forma que vale a pena: ele corrigiu o rótulo
**acessível** da barra (`aria-label={s.seccoes ?? s.turno}`), que era metade do
achado, e o **visível** ficou. `SECCOES_DO_STAFF:30` continua com
`{ rota: '', chave: 'turno' }`, a pastilha rende `s[x.chave]` e a página põe
`titulo={s.turno}`. **A mesma cadeia i18n, duas vezes, no mesmo ecrã.**

**E o que me fez apanhá-lo foi olhar para a imagem e não para o diff.** Os sete
commits estavam todos certos no que diziam; nenhum dizia «o título deixou de
aparecer duas vezes», e eu podia ter fechado tudo sem dar por isso. **Um diff
mostra o que mudou; só a captura mostra o que ficou.**

**Segurei a republicação.** Já lhe mandei uma vez uma página que continha o
defeito de que ele se tinha queixado — a lição da frescura veio daí. **Mandar-lha
outra vez com a queixa de abertura ainda lá dentro seria a mesma falha por outro
caminho**, e desta vez sem a desculpa de não ter olhado.

---

## A mesma chave em duas fendas vizinhas — é classe, não acaso — 15h45

Fui olhar para a **carta pública** com o mesmo olho que apanhou o duplicado do
Staff, e encontrei o mesmo defeito outra vez, noutro ecrã e noutra equipa de
código:

| ecrã | a chave | as duas fendas |
| --- | --- | --- |
| Staff | `s.turno` | `<h1>` da página **e** primeira pastilha da barra |
| Carta pública | `c.buscar` | `placeholder` do campo **e** rótulo do botão ao lado |

```
213:  placeholder={c.buscar} className="bo-campo__controlo" />
214:  <button type="submit" …>{c.buscar}</button>
```

**Duas instâncias independentes fazem disto uma classe.** E o mecanismo é
compreensível: quando há **um rótulo e duas fendas**, reutilizar a chave é o
caminho de menor resistência — o campo precisa de dizer o que se procura, o botão
precisa de dizer o que faz, e a mesma palavra serve mal aos dois.

**E nenhum diff a mostra**, porque **as duas linhas estão certas cada uma por
si**. Só a imagem mostra que estão lado a lado. É a mesma razão pela qual segurei
a republicação: um diff mostra o que mudou, a captura mostra o que ficou.

**Mais duas coisas na mesma tela, medidas e não impressões:**

- O *placeholder* está **cortado** — lê-se «¿Qué te apetece» sem o `?`. O campo é
  mais estreito do que o seu próprio texto de sugestão.
- As pastilhas de idioma mostram **`es-ES`, `pt-BR`, `en`** a um cliente sentado
  à mesa. Um código de localização não é uma língua — quem janta lê «Español».

**O que a carta ganhou** fica dito também: o acento está lá, **188 px** de coral
num filete sob «Abierto ahora» — editorial, discreto, e sem disputar com nada.
