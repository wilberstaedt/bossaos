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
