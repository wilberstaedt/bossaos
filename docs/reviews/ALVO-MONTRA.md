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

---

## Veredicto (2), (3) e (4) — 15h45, medido na imagem

| critério | resultado |
| --- | --- |
| (2) uma chave por fenda | **passa** — `buscar` = «¿Qué te apetece?» (sugestão), `accaoBuscar` = **«Buscar»** (acção), `resultados` = «Resultados» (secção) |
| (3) o *placeholder* cabe | **passa** — lê-se inteiro, com o `?` |
| (4) idiomas com nome | **passa** — «Español · Português · English», sem códigos e **sem bandeiras** |

**E o achado é a ligação entre a (2) e a (3), que ele viu e eu não:** o botão
passou de uma **frase** («¿Qué te apetece?») a uma **palavra** («Buscar»), o
campo ao lado ganhou a largura que faltava, e o texto deixou de cortar.
**Um defeito de conteúdo estava a produzir um defeito de disposição** — e eu
tinha-os listado como dois itens independentes na régua. Eram um.

**A minha contagem, outra vez, era um piso.** Escrevi que a chave servia **duas**
fendas; ele foi ver e eram **três** — a secção de resultados também. Parei no
primeiro par em vez de perguntar quantas fendas a chave serve.

**E ele fez o que interessa mais do que a correcção: escreveu a guarda.**
`validar-rotulo-em-duas-fendas.sh` corre a zero, **com a sonda a acender antes do
veredicto**, e — o melhor — **declara o que não apanha**: rótulo repartido por
ficheiros diferentes, ou o mesmo texto escrito duas vezes à mão em vez de vir de
uma chave. Uma guarda que nomeia os próprios pontos cegos vale mais do que uma
que só diz que passou.

## Observado e não levantado como defeito

«Para compartir» aparece como pastilha de filtro **e** como cabeçalho da secção
logo abaixo. **Não é a mesma doença**: a pastilha é um controlo de estado e o
cabeçalho nomeia o que está em baixo — quando o filtro está activo, coincidem por
consequência e não por reutilização. Fica registado como **observado**, não como
achado, e a diferença é essa.

## E a página foi republicada

Capturas frescas (25/25, 15h39, depois do último commit de produto às 15h37), a
guarda da frescura deixou gerar, e o mesmo URL mostra agora a barra lateral
refeita, o Staff sem o título repetido, e a carta com nomes de idioma.

---

## A3 fechado — e a reconciliação valeu quatro botões — 16h30

**Ele contou 14, eu contei 10, e nenhum errou: eram populações diferentes.**

```
10 (meu) + demo/thanks 1 + pilot 2 + privacy 1 = 14
```

Eu contei **seis ficheiros de rota que escolhi**. Ele contou **o que a travessia
alcança a partir da landing** — e os quatro extra são alcançáveis: `/pilot` está
na navegação, `/privacy` é ligado do próprio formulário, `/demo/thanks` é onde
aterra quem converteu.

**Se ele tivesse aceitado o meu dez, quatro sobreviviam** — em páginas que
ninguém visitou, *«que é o modo como estas dívidas sobrevivem»*.

**E o que me incomoda é que a lição era dele e eu tinha-a acabado de elogiar.**
Ele escreveu, no documento dos achados: *«uma lista mede o que eu me lembrei de
escrever, e o que parte um percurso é precisamente a ligação de que ninguém se
lembrou»*. Eu li aquilo, achei-o o melhor do documento — **e uma hora depois
contei por lista.** Reconhecer um método não é adoptá-lo.

**Verificado por mim:** total no produto **274 → 260**, landing a **zero**, e os
quatro ficheiros que eu não visitei também a **zero**. O `type="submit"` do
`/demo` vence o `type="button"` do componente porque o `{...resto}` do chamador é
espalhado **depois** (linha 79) — e ele explicou-o em vez de o deixar funcionar
por acaso.

**E mediu no DOM, não na contagem:** *«os 14 rendem, os 14 navegam, zero
inertes. Um `<a>` convertido e deixado sem `href` continuaria a contar como
convertido e não levava ninguém a lado nenhum.»* **A contagem podia ir a zero a
produzir ligações mortas** — e era exactamente o que a minha régua dizia que não
contava como prova.
