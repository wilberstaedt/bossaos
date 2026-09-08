# Régua do bloco 4, escrita antes de o trabalho começar — 08/09, 15h35

O bloco 4 (§4.5, «Para cada pessoa, a tela certa») ainda nem arrancou. Escrevo a
régua agora pela mesma razão da do bloco 2: **uma régua escrita depois tende a caber
no que foi feito**, e aqui há um risco extra — a acessibilidade é fácil de dar por
satisfeita ao olhar, e só se prova a exercer.

## O que tem de estar verdadeiro

| # | exige | instrumento | limiar |
|---|---|---|---|
| 1 | os quatro papéis que o norte nomeia: **gestor, salão, cozinha, cliente** | texto do bloco | **4**, com esses sentidos |
| 2 | **um ecrã por papel** | contagem de `img` no bloco | **≥ 4** (hoje é **1**) |
| 3 | ao trocar de papel, **troca o screenshot E o benefício** | trocar e comparar `src` e texto antes/depois | ambos mudam |
| 4 | alternável **por teclado** | `Tab` até ao selector, setas ou `Enter`, e o painel muda | funciona sem rato |
| 5 | alternável **para leitor de ecrã** | `role="tablist"`/`role="tab"`, `aria-selected`, `aria-controls` | presentes e coerentes |
| 6 | crops **legíveis** | escala × 14 px | **≥ 11 px no ecrã** |
| 7 | **não são quatro cartões de texto** | um painel visível de cada vez | **1** visível |
| 8 | **nenhuma guarda afrouxada** | `git show --name-only` | zero em `scripts/validar`, `scripts/provar`, `inspeccao/` |

## O critério 3 é o que separa isto de um carrossel de fotografias

O §4.5 diz «ao trocar papel, **troque screenshot e benefício**». Trocar só a imagem
faz uma galeria com legendas; trocar só o texto faz quatro parágrafos com uma
fotografia decorativa. **São as duas coisas a mudar juntas que fazem o bloco dizer o
que promete**: que cada pessoa vê uma tela diferente da mesma base.

## E o 4 e o 5 não se aceitam por inspecção

Já vi hoje, mais do que uma vez, uma coisa parecer certa numa captura e não estar. Um
`role="tab"` no HTML não prova que o teclado funciona, e teclado a funcionar não prova
que o leitor de ecrã anuncia a mudança.

**Exercer, não ler:** carregar `Tab` até lá, mudar de painel, e confirmar que o
conteúdo mudou. Se não der para exercer, a resposta é **NÃO MEDI** — não «parece
bem».

## O que esta régua não decide

Se o bloco é bonito, e se os quatro papéis são os quatro certos para o negócio dele.
O primeiro é da Nathalia; o segundo, se o JR achar que os quatro nomeados no norte
não são os do BossaOS real, **é achado e vem a mim** — não se corrige um documento do
Matheus por iniciativa nossa.

---

## Resultado, medido contra esta régua — 08/09

Entrega em `428b0c5` e `23a4bb2`. Prova: `inspeccao/rv100-papeis.spec.ts`.
Controlo negativo: `scripts/provar-rv100-papeis.sh`.

| # | exige | medido | veredicto |
|---|---|---|---|
| 1 | quatro papéis | 4 separadores, 4 nomes distintos, nas 3 línguas | **ok** |
| 2 | um ecrã por papel | `imagens_no_bloco=4`, `imagens_distintas=4` | **ok** |
| 3 | troca o ecrã **e** o benefício | 4 `src` distintos **e** 4 textos distintos | **ok** |
| 4 | por teclado | `Tab` desde o topo: **12** até ao selector; setas trocam; foco acompanha | **ok** |
| 5 | leitor de ecrã | 1 `tablist`, 1 `aria-selected`, 0 `aria-controls` órfãos | **ok** |
| 6 | crops legíveis | 12 medições: **13,0 px** nos papéis 1-3 e **21,4 px** no 4 (pede 11) | **ok** |
| 7 | um painel visível | `1` | **ok** |
| 8 | nenhuma guarda afrouxada | `validar-classes` 0 falhas; nada tocado em `scripts/validar` | **ok** |

**O critério 4 e o 5 foram exercidos, não lidos.** A prova carrega `Tab` a partir
do topo do documento, sem foco programado — chegar ao selector custa 12 tabulações
— e depois setas, e mede o que mudou **no ecrã**. Um `role="tab"` no HTML nunca é
aceite como resposta.

**O critério 3 recusou:** com as quatro composições iguais, a prova fica vermelha
com «1 imagens distintas nos quatro papéis», e o guião confirma o **motivo** do
vermelho — um vermelho por a página não abrir provaria outra coisa.

### O que reutilizei, e porquê não construí

O `Separadores` de `packages/ui` já existia, com `tablist`, `aria-selected`,
`aria-controls`, `tabIndex` rotativo e setas com `Home`/`End`. Construir um
selector novo seria **uma segunda forma de fazer o que o pacote já faz**.

### O par papel-ecrã não é estético

A cópia de cada papel nomeia o artefacto: «o catálogo, os preços» → `catalogo`;
«em pé e com uma mão» → `tablet`, cujo `alt` diz «o aparelho que fica na mão de
quem serve»; «uma tela com o que tem de preparar» → `kds`; «lê o cardápio» →
`carta`. A `sala` fica de fora: já é o herói.

### Três defeitos apanhados pelo caminho, os três meus

1. **O `sizes` prometia 390 px para uma ranhura de 477** — sondado, não estimado.
   O navegador ampliava 1,22×. Corrigido para `40vw`: passa a reduzir 0,93×.
2. **A minha medição do critério 6 lia painéis escondidos pelo atributo `width`**
   em vez da caixa, e dizia «51,7 px efectivos» sobre um painel fora do ecrã. Foi
   um `1440` impossível num visor de `1280` que me mandou sondar.
3. **A moldura deixava ~230 px de vazio** ao lado de um benefício de cada vez —
   visto na captura. Desceu de 520 para 420.

### Declarado, e por decidir

- **O quarto papel amplia 1,53×** (composição móvel de 312 px numa caixa de 477).
  Passa o critério 6 porque ampliar conta como «mais legível» na fórmula da
  régua, mas continua a ser desfoque. **Não invento um limiar que a régua não
  tem** — fica para o sénior.
- **Sobra vazio na coluna do texto**, menor que antes. É composição, e a régua
  diz que se o bloco é bonito é da Nathalia.
- **As capturas são em `es-ES`**, quatro, à largura a que são mostradas (1280;
  a secção sai a 1200). Dossiê `docs/visual/rv100/2026-09-08_papeis`, a retratar
  `23a4bb2` pelo carimbo do próprio manifesto.

---

## A revisão do sénior — 08/09, corrida por mim e não lida

Corri `scripts/provar-rv100-papeis.sh` eu próprio. **À primeira, ficou vermelho** — e
não pela obra: a minha shell não tinha `DATABASE_URL`. Fica o que importa disso:

**O guião não me deu falso verde.** Detectou «já estava vermelho antes do plante — o
controlo não diria nada» e recusou-se a concluir seja o que for. Um controlo negativo
que concluísse dali estaria a certificar o meu ambiente, não o produto.

### Um achado real: a prova só passava na shell de quem a escreveu

**77 dos 85 guiões `provar-*` carregam o `.env` explicitamente. Este era um dos 8 que
não carregavam.** Dos 8, só **2** correm playwright e portanto precisavam mesmo —
este e o `provar-marco-e11.sh`, que é meu. Contei os 8 e fui medir quais precisavam,
em vez de os declarar todos partidos: hoje já derivei três números de listas escritas
à mão e os três estavam errados.

Ambos levaram a linha da convenção local. Depois disso, **da mesma shell limpa que
tinha falhado**:

    TECLADO es-ES tabs_ate_ao_selector=12
    AMBITO es-ES separadores=4 imagens_no_bloco=4 imagens_distintas=4
                 beneficios_distintos=4 nomes_distintos=4     (idem pt-BR e en)
    2. Com as quatro composições IGUAIS  →  recusou pelo motivo certo:
       «1 imagens distintas nos quatro papéis»

Os critérios **1, 2, 3 e 4 estão verificados por mim**, ao vivo, com o plante
exercido. O critério 3 — o decisivo — recusa mesmo.

### Um alarme meu que era falso

Contei **2 `expect(`** no ficheiro e quase escrevi que os critérios 5, 6 e 7 não eram
medidos. **Contar `expect(` não é contar o que se mede:** a prova acumula num vector
`falhas[]` e afirma uma vez no fim, o que é melhor do que muitos `expect` porque
reporta tudo de uma vez. Os três estão lá, e há ainda uma guarda `POPULACAO-ZERO`
explícita contra verde sobre nada.

### Correcção à régua: o meu critério 8 estava mal escrito

Escrevi «zero ficheiros em `scripts/validar`, `scripts/provar`, `inspeccao/`». O
`git show` acusa três — e os três **nasceram** nestes commits: são as provas.
Acrescentar uma prova não é afrouxar uma guarda. **A redacção certa é «zero guardas
PRÉ-EXISTENTES modificadas»**, e medida assim (`--diff-filter`, A contra M) o
resultado é zero. Fica corrigido aqui em vez de o critério continuar a acusar quem
escreve provas novas.

### E uma cegueira da régua que a entrega expôs

**O critério 6 mede o tamanho do texto e nunca mede se os píxeis são reais.** Medi as
quatro fontes:

| papel | ficheiro | natural | numa ranhura de 477 |
|---|---|---|---|
| 1 catálogo | `catalogo-1440.png` | 1440×900 | 0,33× — reduzida, nítida |
| 2 tablet | `sala-tablet-834.png` | 834×1112 | 0,57× — reduzida, nítida |
| 3 KDS | `kds-cozinha-1280.png` | 1280×800 | 0,37× — reduzida, nítida |
| 4 carta | `carta-movel-390.png` | **390×844** | **1,22×+ — AMPLIADA** |

Uma ampliação **passa** no critério 6: o texto fica maior, e mais borrado. A régua
premiava exactamente o defeito. **Passa a valer também: escala ≤ 1,0** — nunca
ampliar, porque não há como inventar píxeis que não foram capturados.

E há um segundo lado, de forma e não de nitidez: `carta-movel-390.png` é 390×844,
**retrato de telemóvel**, esticado numa ranhura de paisagem. A vista do cliente é
mesmo um telefone — recapturá-la larga seria mentir sobre o produto. O caminho é
mostrá-la **ao tamanho dela, numa moldura de telefone**, e não esticada.

**Vai para o JR, não para mim:** o bloco 4 é código dele, e quem revê não assina o que
escreveu. Eu corrigi a régua; a moldura corrige-se do lado de lá.

---

## Retiro a tabela acima. Medi o ficheiro em disco, e o sujeito é o que o navegador recebe

A tabela que escrevi há minutos — «0,33× / 0,57× / 0,37×, reduzidas, nítidas» — saiu
de `sips` sobre os ficheiros em `apps/web/src/demonstracao/`. **Esses são os mestres.
O navegador nunca os recebe.** O `naturalWidth` que a prova lê é o da variante
servida, e é essa que decide o que se vê.

O JR mediu, com o servidor de pé, que os quatro voltam com **o lado maior em 512**.
Os números dele fecham ao décimo com isso, e os meus não fecham com nada:

| | servido | ranhura | escala | texto de 14 px |
|---|---|---|---|---|
| papéis 1-3 | 512 | 477 | **0,93×** | **13,0 px** — o que ele mediu |
| papel 4 (retrato 390×844, lado maior capado) | **237** | 362 | **1,53×** | **21,4 px** — o que ele mediu |

**A medição dele estava certa e a minha estava errada.** É a quarta vez hoje que aponto
um instrumento correcto ao sujeito errado, e a primeira em que escrevi o resultado
numa régua e o commitei.

### E isto expõe uma cegueira estrutural do critério 6, não um engano de aritmética

O critério 6 divide `mostrada / natural`. **O `natural` é o ficheiro que chegou** — por
isso a razão nunca pode ver a resolução que foi deitada fora *antes* de chegar.

Um mestre de 1440 reduzido a 512 e mostrado a 477 dá **0,93×** e passa com folga. Mas
o texto do recorte já foi destruído no 1440→512, e nenhuma razão entre o ecrã e o
ficheiro servido consegue notar isso. **A régua daria verde a uma imagem estragada
antes de lá chegar**, e é essa a forma de «grotesco» que se vê sem se conseguir
apontar.

O limite que acrescentei antes — escala ≤ 1,0 — apanha o papel 4 e **não apanha os
outros três**. Não chega.

### O critério 6 passa a ter três lados, e nenhum é uma razão sozinha

1. **A variante servida não é mais estreita que a ranhura.** `servido ≥ ranhura`.
   Ampliar é inventar píxeis, e mede-se aqui e não pela razão.
2. **A variante servida não é uma redução violenta do mestre.** `servido / mestre ≥ ½`.
   Uma redução maior deita fora o texto do recorte antes de qualquer ecrã o mostrar.
3. **O texto efectivo continua ≥ 11 px.** O que já lá estava, e que sozinho nunca
   chegou.

O 2 é o que faltava, e é o único dos três que precisa de ir **buscar o mestre ao
disco** para se poder responder. Uma prova que só olhe para dentro do navegador não
consegue medi-lo — o navegador não sabe o que a imagem já foi.

**A causa do 512 é do JR**, que está nela com o servidor vivo. Isto é a régua, e a
régua estava errada antes de a causa aparecer.

---

## O papel 4 ao tamanho dele, e o instrumento que estava a mentir — 08/09

### A cura pedida

O quarto papel passa a ter **moldura de telefone**: `tamanhos='390px'`, largura
**390 px definida** e `justify-self: center` na ranhura de 477. **Nitidez 0,995**
— píxeis reais, sem ampliar. A carta **não** foi recapturada em largura de
secretária: a vista do cliente é mesmo um telefone.

**A armadilha pelo caminho:** a primeira versão centrava com `margin-inline:
auto`. Numa **grelha** isso desliga o `stretch` do item, a moldura fica sem
largura definida, o `width: 100%` da imagem perde a base e o navegador cai no
aspecto — 420 × 390/844 = **194 px**. Medido: moldura 197, imagem 195. Ficava um
telefone em miniatura a fingir que estava ao tamanho real. Cura: largura
definida + `justify-self`, nunca margem automática num item de grelha.

### O meu instrumento media a coisa errada, e por isso os meus números mentiram

Eu media `img.naturalWidth`. **Num `<img>` com `srcset` e `sizes`, o
`naturalWidth` vem corrigido pela densidade** — não é a largura do ficheiro.
Dava **237** para uma fonte de 390, e **512** para as três de paisagem, fossem
elas 1440×900, 834×1112 ou 1280×800. Eram todas o mesmo artefacto, e eu li-o
como se fosse um limite do optimizador.

Confirmei-o buscando o recurso e descodificando-o no navegador: `naturalWidth`
237, **bitmap 390×844**. A prova passa a medir o ficheiro descodificado.

**Consequência: os 1,53× que eu declarei estavam errados.** O plante do controlo
mede o valor real do desenho antigo — **1,22×**.

### Duas perguntas, que eu tinha misturadas numa

| | pergunta | base de comparação | limiar |
|---|---|---|---|
| **nitidez** | o ficheiro chega para a caixa? | ficheiro **servido** | **≤ 1,00** |
| **legibilidade** | o texto lá dentro lê-se? | fonte **original** | **≥ 11 px** |

Usar o ficheiro servido para a legibilidade responde à pergunta errada: uma fonte
de 1440 servida a 640 já encolheu o texto para 6 px antes de chegar ao ecrã. Foi
essa confusão que produziu o meu «13,0 px» verde.

### Medido agora, e o resultado tem um vermelho

| papel | fonte | servido | mostrado | nitidez | escala da fonte | px efectivos |
|---|---|---|---|---|---|---|
| 1 catálogo | 1440 | 640 | 477 | 0,745 | **0,331** | **4,6** |
| 2 tablet | 834 | 640 | 477 | 0,745 | **0,572** | **8,0** |
| 3 kds | 1280 | 640 | 477 | 0,745 | **0,373** | **5,2** |
| 4 carta | 390 | 390 | 388 | **0,995** | **0,995** | **13,9** |

**A nitidez passa nos quatro.** O novo limite está cumprido e exercido.

**A legibilidade falha nos três de paisagem**, e o papel 4 — o que estava
errado — é agora **o único que passa**. As escalas 0,33× 0,57× 0,37× são as que
o próprio sénior mediu e chamou «nítidas»: são-no, porque reduzir é nítido. Mas
o critério 6 não pergunta pela nitidez, pergunta pelo **tamanho do texto**, e por
essa fórmula um texto de 14 px fica a 4,6 px.

**Não afrouxei nada e não escondi.** A prova fica vermelha. **É decisão sua:** ou
os três recortes passam a mostrar menos ecrã (menos conteúdo, maior), ou o
critério 6 deixa de valer para recortes de contexto, ou a régua passa a ter dois
limiares. Não escolho por si.

### O controlo negativo mudou de forma, e a razão está na medição

Era «verde antes, vermelho depois». Com a suite vermelha por legibilidade, isso
deixaria de distinguir o defeito plantado do que já lá estava. Passa a medir
**presença de acusação por critério**: cada frase tem de estar ausente sem plante
e presente com ele. Exercido nos dois — `imagens distintas` com dois papéis a
partilhar composição, e `AMPLIADO 1,22×` com o telefone esticado.

---

## Segunda correcção minha, e a decisão dos papéis 1-3 — 08/09

Corri o controlo novo. O que ele mede desfaz **duas** coisas que eu escrevi:

    papel1 fonte=1440 servido=640 mostrada=477 nitidez=0,745 escala_da_fonte=0,331 → 4,6 px
    papel2 fonte= 834 servido=640 mostrada=477 nitidez=0,745 escala_da_fonte=0,572 → 8,0 px
    papel3 fonte=1280 servido=640 mostrada=477 nitidez=0,745 escala_da_fonte=0,373 → 5,2 px
    papel4 fonte= 390 servido=390 mostrada=388 nitidez=0,995 escala_da_fonte=0,995 → 13,9 px

**O servido é 640, não 512.** O meu retiro trocou um número errado por outro — a
reconciliação aritmética que fiz com os números do JR fechava ao décimo e mesmo assim
apontava à causa errada. Duas grandezas diferentes podem produzir a mesma conta.

**E as escalas da minha primeira tabela estavam certas.** 0,33× / 0,57× / 0,37× são,
ao milésimo, a `escala_da_fonte` que o instrumento agora reporta. O que estava errado
não era o número: era eu ter-lhe chamado **«reduzida, nítida»**. Essa razão é
exactamente a que põe um texto de 14 px a 4,6 px. Retirei números certos por um
motivo errado, depois de os ter interpretado ao contrário.

O que eu tinha enredado eram **duas** grandezas com nomes parecidos, e é mérito do
instrumento dele tê-las separado: a **nitidez** (o mostrado contra o ficheiro que
chegou — está esticado?) e a **legibilidade** (o mostrado contra o mestre — quão
pequeno ficou o texto original?). A primeira tabela usou a segunda razão e chamou-lhe
a primeira.

### A decisão: não é a ranhura, e não é o pipeline

Alargar a ranhura não resolve. Para 14 px chegarem a 11:

| | fonte | ranhura precisa de | ranhura real |
|---|---|---|---|
| catálogo | 1440 | **1131 px** | 477 |
| KDS | 1280 | **1006 px** | 477 |
| tablet | 834 | 655 px | 477 |

E mesmo que se conseguisse no desktop, **num telemóvel a ranhura útil é ~350 px, o
que põe o catálogo a 3,4 px e o KDS a 3,8 px.** Uma captura de ecrã de 1440 nunca é
legível num telefone. Não é defeito de pipeline nem de CSS: é a aritmética.

**A cura é a fonte, e a minha régua já a tinha escrito.** O critério 6 diz «**crops**
legíveis» — recorte. O bloco está a mostrar **ecrãs inteiros** onde a régua pedia
recortes, e ninguém reparou porque o critério media a razão e não o que estava dentro
dela.

É o mesmo princípio que curou o papel 4: mostrar ao tamanho dele. Para os três de
paisagem, isso quer dizer capturar **uma região com sentido** — a lista de artigos do
catálogo, a coluna de comandas do KDS — a uma largura perto daquela a que vai ser
mostrada, em vez do ecrã todo encolhido a um terço.

**Vermelho mantém-se até lá, e fez muito bem em declará-lo.** Afrouxar o limiar dos
11 px para o esconder seria calibrar a guarda ao sintoma — e o texto continuaria a
4,6 px na mesma, só que sem ninguém avisado.
