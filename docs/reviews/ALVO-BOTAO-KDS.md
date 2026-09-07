# Régua da tarefa (2) — o botão primário invisível no KDS

> **Escrita a 14h25 de 07/09, ANTES de ver a entrega**, e com o baseline medido
> **antes de ele desaparecer**. Sem o «antes», o controlo negativo desta tarefa
> deixa de ser possível — e o «antes» morre no instante em que a correcção entra.

## O defeito, medido por mim

```
--bo-primaria:            #102E35   ← .bo-botao--primario enche-se com esta
--bo-superficie-inversa:  #102E35   ← .bo-kds pinta-se com esta
```

**São a mesma cor.** Medição de píxeis na região do botão «Empezar»
(`M05-principal-es-ES-1920x1080.png`, recorte `(460,555)-(700,610)`, 13 200 px):

| cor | área |
| --- | ---: |
| `(16,46,53)` = `#102E35` — a superfície | **93,4 %** |
| `(255,255,255)` — o texto | 1,9 % |
| `(54,79,85)` | 1,8 % |

**Exactamente UMA cor ocupa mais de 2 % da região: o fundo.** Não há
preenchimento, não há contorno contínuo. O botão não está apagado — **não está
lá**.

## Passa se

**1 · A região do botão passa a ter pelo menos DUAS cores acima de 2 %.** Um
preenchimento distinto da superfície, ou um contorno com extensão medível. O
número a bater é o de cima: hoje é 1.

**2 · O par texto/fundo do botão é medido DEPOIS da mudança, e composto.** Se o
preenchimento novo tiver alfa, a cor que conta é a **composta** — um
`backgroundColor` translúcido não é um fundo, é uma camada. Já me deu `1,00:1`
hoje por ignorar isto, e `1,00` quase nunca é uma medição: é uma cor consigo
própria.

**3 · O alvo de 48 px continua de pé, e agora é verificável.** Um alvo que não se
vê não é accionável a metros — a régua do manual pressupõe um limite visível.

## REPROVA se

**4 · For a quadragésima linha de CSS defensivo.** O `estilos.css:757-796` já tem
**39 linhas** escritas para reparar as **duas** vezes anteriores desta mesma
doença, com os comentários a dizer «1.00:1: texto da cor do fundo, ou seja,
invisível» e «1.00:1 outra vez, o mesmo defeito ao contrário». **Uma terceira
remenda por cima confirma o padrão em vez de o fechar.** A pergunta que a
entrega tem de responder: *porque é que um componente claro não sabe em que
superfície está?*

**5 · Se o botão passar a ser a coisa mais saturada do ecrã.** O manual é
textual: «coral e cítrico **não** devem disputar atenção com o estado dos
pedidos». Trocar um botão invisível por um botão que grita é trocar uma violação
por outra — e no KDS a que importa é a segunda, porque ali o que tem de saltar é
o que está a queimar.

## O que NÃO conta como prova

- **«O CSS mudou.»** A pergunta é o que renderiza, e a diferença entre as duas
  está medida acima em píxeis.
- **Uma captura nova sem a antiga ao lado.** Os números do baseline estão nesta
  página exactamente para isso.
- **A minha palavra, ou a dele.** Recapturo e meço eu, com o mesmo recorte.

---

## Veredicto — 14h50, medido por mim

| critério | baseline | agora |
| --- | --- | --- |
| 1 · cores acima de 2 % na região | **1** (só o fundo, 93,4 %) | **2** — fundo 68,0 % + `#F7F4EC` **27,1 %** |
| 2 · o par do botão | `#102E35` sobre `#102E35` = **1,00:1** | `#102E35` sobre `#F7F4EC` = **13,05:1** |
| 4 · não ser a quadragésima linha defensiva | 39 linhas de `.bo-kds .x{}` | **restam ZERO** |
| 5 · não passar a gritar | — | areia, não lima. **Não é saturado** |
| 3 · alvo de 48 px | — | **NÃO MEDI** — não o exercitei |

**A cura é uma inversão, e é a resposta certa à pergunta que a régua fazia.** Em
vez de o componente adivinhar onde está, **a superfície declara o que promete**:
`--bo-accao`, `--bo-sobre-accao`, `--bo-sobre-superficie`, definidos no `:root` e
redefinidos pela superfície escura. O botão pede o **papel** —
`background: var(--bo-accao)` — e nunca uma cor.

> *«Uma superfície nova define os três e ganha os componentes todos; um
> componente novo pede os três e ganha as superfícies todas.»*

**Ele não escreveu a quadragésima linha: apagou as trinta e nove.** Uma correcção
que remove código em vez de o acrescentar é a assinatura de ter apanhado a
doença, e não o sintoma.

E antecipou o critério 5 sem eu lho ter dito: escolheu **claro e não lima** para
a acção em fundo escuro, **porque o lima é o sinal de estado do pedido** e um
botão lima disputaria atenção com ele — que é exactamente o que o manual proíbe.

## A transparência enganou-nos aos dois na mesma noite

O controlo negativo dele **não acendeu à primeira**, e a razão é irmã de um erro
meu de há duas horas:

| quem | o predicado | o que a transparência fez |
| --- | --- | --- |
| **ele** | «tem borda, logo está delimitado» | `border: 1px solid transparent` — **uma borda transparente não delimita nada**, e engoliu o defeito |
| **eu** | «este é o fundo do elemento» | `rgba(255,255,255,.1)` lido como opaco — deu **1,00:1**, branco sobre branco |

**A forma: a transparência derrota qualquer predicado que pergunte «existe um
X?» em vez de «o X faz alguma coisa?».** Uma borda existe e não separa; um fundo
existe e não cobre. **Presença não é efeito** — e os dois instrumentos que
falharam hoje falharam por confundir os dois.

A guarda dele já leva a lição escrita no âmbito: *«um fundo com alfa é uma
camada, não um fundo»*.

---

## Tarefa (3) — o coral fora da navegação do KDS, fechada a 14h55

**A letra:** coral no ecrã do KDS passou de **276 px** para **0**, medido nas
duas capturas (a de antes tirada do próprio `git show` do commit anterior).

**Mas zero coral prova que a violação saiu, não que o intento foi cumprido.** A
regra do manual é **comparativa** — «coral e cítrico não devem disputar atenção
com o estado dos pedidos» —, e o que ela quer é que **o que salta seja o que está
a queimar**. Removê-la podia deixar o ecrã sem nada a saltar, o que cumpre a
letra e falha o propósito.

**Fui medir o outro lado.** Ordenei todas as cores do ecrã por saturação:

| saturação | cor | área |
| ---: | --- | ---: |
| **1,00** | `#8A5100` | 198 px |
| 0,55 | `#F6ECE0` | 2 204 px |
| 0,54 | `#102E35` — a superfície | 96,6 % |

`#8A5100` é o `--bo-estado-aviso`, e `#F6ECE0` é o fundo do par. **A coisa mais
saturada do ecrã do KDS passou a ser a etiqueta de estado do pedido.**

**Passa nas duas leituras**, e é a segunda que interessa: uma regra escrita como
proibição só se verifica de verdade medindo o que ficou no lugar do que saiu.
