# Régua da montra — landing e carta pública

> Escrita a 07/09 às 15h35, **antes de a entrega existir**. É a ordem nova que o
> Matheus impôs ao pedir «o mais próximo de venda»: o que um comprador vê antes
> de falar com alguém passa à frente do que só quem já comprou vê.

## 1 · Os dois CTA do herói deixam de ser escritos à mão

**O defeito:** o `Botao` fixa `<button type="button">` e não aceita ligação, por
isso qualquer navegação com aspecto de botão é escrita à mão como
`<a className="bo-botao bo-botao--primario">`. O diagnóstico de sistema contou
**283 ocorrências em 172 ecrãs**, e nomeou os dois do herói da landing como **«o
par mais visto do produto»**.

**Passa se** o `Botao` aceitar `href` e os dois CTA do herói passarem a usá-lo.

**Reprova se** aparecer um segundo componente — um `BotaoLigacao` ao lado do
`Botao` — em vez de o que existe ganhar a propriedade. **Dois componentes para
uma coisa é o defeito que estamos a curar, não a cura.**

**Medida:** contar `className="bo-botao` escrito à mão em `apps/web`. Hoje é
283; qualquer número menor prova movimento, e a landing tem de ir a zero.

## 2 · A mesma chave em duas fendas vizinhas

`c.buscar` serve de `placeholder` do campo **e** de rótulo do botão ao lado
(linhas 213 e 214 do mesmo ficheiro). O campo diz *o que se procura*, o botão diz
*o que faz* — a mesma palavra serve mal aos dois.

**Passa se** forem duas cadeias distintas. **Reprova se** a segunda for a
primeira com uma palavra colada; o teste é lê-las em voz alta e perguntar se
alguém as escreveria assim de raiz.

**E o irmão no Staff já foi curado pela classe** — a barra deixou de mostrar a
secção actual. Aqui a classe é outra: **um rótulo, duas fendas.** Se houver
maneira de a guarda apanhar o par, melhor do que corrigir a instância.

## 3 · O *placeholder* está cortado

Lê-se «¿Qué te apetece» sem o `?`. **O campo é mais estreito do que o seu próprio
texto de sugestão** — e um texto que ensina a usar o campo, cortado a meio, ensina
menos do que nada.

**Medida na captura**, não no CSS: o texto tem de caber inteiro a 390 px.

## 4 · Códigos de localização mostrados a quem janta

As pastilhas dizem **`es-ES`, `pt-BR`, `en`** ao cliente sentado à mesa. **Um
código de localização não é uma língua.** Quem janta lê «Español», «Português»,
«English» — na própria língua, que é a convenção que qualquer sítio multilingue
usa.

**Reprova se** ficar a bandeira em vez do nome: uma bandeira é um país e não uma
língua, e o espanhol de Espanha e o de outro sítio partilham bandeira nenhuma.

## O que NÃO conta como prova, aqui

- **O typecheck.** Nenhum destes quatro é de tipos.
- **A contagem de ocorrências sozinha.** 283 a descer para 200 não diz que a
  landing ficou limpa; a landing tem de ir a **zero**, e é esse o número.
- **A minha leitura do diff.** Os quatro vêem-se na captura, e é lá que os meço —
  foi assim que apanhei o duplicado do Staff que sete commits certos não
  mostraram.

---

## Veredicto (1) — 15h50, medido por mim

| critério | resultado |
| --- | ---: |
| a landing a **zero** escrito à mão | **0** — total 283 → 274, e as nove eram dela |
| não nascer um segundo componente | só existe `Botao.tsx` |
| com `href`, ser mesmo uma ligação | `return <a className={classes} …>` (linha 66) |

**E foi mais longe do que a régua pedia.** A união é **discriminada**: com `href`,
o TypeScript **recusa** `disabled` e `aCarregar`. A razão está escrita e é boa —
*«uma ligação desactivada não existe: ou se navega, ou não se põe lá a
ligação»*. **O estado errado deixou de ter nome**, que é a mesma disciplina que a
casa já tinha usado no `LigacaoDeNavegacao`.

**Nota sobre o meu próprio achado, na (2):** eu tinha contado a chave `c.buscar`
em **duas** fendas — *placeholder* e botão. Ele foi ver e são **três**: serve
também de nome da secção de resultados. **A minha contagem era um piso outra
vez** — parei no primeiro par que vi em vez de perguntar quantas fendas a chave
serve. Ele generalizou; eu instanciei.
