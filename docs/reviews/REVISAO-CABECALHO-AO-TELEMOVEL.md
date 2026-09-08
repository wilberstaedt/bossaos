# Revisão do cabeçalho: dois sintomas, um defeito — 08/09, 13h05

**Aceito o `57ec604`.** E a causa que ele encontrou não é a que eu lhe dei.

## Eu diagnostiquei mal, e a minha cura teria sido pior do que a doença

Eu disse-lhe: falta `margin-left: auto` no `.bo-mkt__abrir`, por isso o botão senta-se
a seguir à marca.

A causa verdadeira: o cabeçalho comercial é `flex` com `space-between`, e existe um
`.bo-publico__cabecalho::after`. **Um pseudo-elemento de um contentor de flex é um
item de flex.** Com três a participar — marca, botão, `::after` — o `space-between`
dá o lugar da direita ao pseudo-elemento e **empurra o hamburguer para o meio**.

E o `::after` é o «filete da casa»: a faixa com a cor que um restaurante configura na
sua carta. **O traço coral solto que o Matheus viu era o mesmo elemento que empurrava
o hamburguer.** Dois sintomas, um defeito.

**O que a minha cura teria feito:** empurrava o botão para a direita e o cabeçalho
parecia consertado. O `::after` continuava lá, continuava a ser um item de flex, e
continuava a desenhar o traço coral — que eu tinha declarado «não sei o que é».
Teria curado o sintoma que eu via, deixado o que não sabia explicar, e escondido a
causa dos dois. **E eu teria dito ao Matheus que o cabeçalho estava resolvido.**

O que evitou isso foi a instrução de não adivinhar: «encontre-o no ecrã e diga-me o
que era **antes de o tirar**». Ele descobriu o que era, e o que era explicou tudo.

## A cura, e o âmbito

```css
.bo-publico--comercial .bo-publico__cabecalho::after { content: none; }
```

Uma linha, com vinte e três de comentário a dizer porquê — o rácio certo quando a
causa é invisível a quem lê o código depois.

Verifiquei o âmbito: a regra só se aplica sob `.bo-publico--comercial`. A **carta
pública mantém o filete** (linha 1284), que é onde ele faz sentido, porque lá o
cabeçalho é uma grelha com `justify-items: start` e o filete cai numa linha própria.

E sai **inteiro** em vez de reposicionado, com a razão certa e que é dele: *«a landing
não é a carta de casa nenhuma, não há restaurante cuja marca ele carregue.»* Retirar
uma decoração porque está semanticamente errada ali é diferente de a mover porque
está feia.

## O que NÃO verifiquei

**Não reproduzi a 390 por mim.** O `resize_window` do meu browser não muda o viewport
— medi 1440 e a essa largura o botão está oculto. Portanto esta revisão é do **código
e do raciocínio**, e as medições `marca 24..169 / botão 322..366 / pseudo: nenhum` são
dele, não minhas. Declarado, não escondido.

## A linha verde-lima

Ele fez o que eu pedi: **propôs e não decidiu**. E trouxe os factos que fazem a
decisão ser do Matheus e não de gosto de ninguém:

- **11,10:1** de contraste — portanto **não é acessibilidade**, é estética;
- é a **única ocorrência daquela cor** na folha inteira, e um acento usado uma vez
  lê-se como excepção e não como sistema;
- ao telemóvel são **três linhas** — e três linhas de cor de acento deixam de ser
  acento e passam a ser um bloco.

Três saídas: largar a cor, encurtar para uma linha, ou ficar. **Fica na lista dele.**

---

## Os botões: fui verificar e NÃO há achado — 08/09, 13h15

Na fotografia do Matheus os dois botões empilhados pareciam ter larguras diferentes, e
ia entregar isso como defeito. Antes disso fui à captura que o JR tirou a 390
(`docs/visual/ns2/botoes-390.png`), que é a medição que eu não consigo fazer.

**Larguras praticamente iguais.** A diferença vem do comprimento do texto — os botões
têm largura por conteúdo, e em espanhol «Pedir una demo» e «Ver el producto» quase
coincidem. Na fotografia dele, em português, as palavras são mais díspares e a
diferença nota-se mais.

**Não é defeito objectivo, é largura por conteúdo.** Não o entrego, e registo que
verifiquei — porque hoje já escalei três leituras de imagem que não se aguentaram, e
a diferença entre este caso e esses é ter ido ver antes de falar.

## O estado que interessa agora

A cura está **commitada e não publicada**. O Matheus continua a ver o cabeçalho
partido, porque o que está no ar é o `d5543d3` das 11h23 e a correcção veio depois.

Publicar é decisão dele, por commit e por momento — não estico a autorização das
11h17, que era para aquele pacote. **O que me cabe é ter isto pronto e dizer-lho numa
linha, não perguntar outra vez.**
