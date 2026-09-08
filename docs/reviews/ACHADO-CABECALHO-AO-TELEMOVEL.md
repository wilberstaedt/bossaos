# O hamburguer a meio e o traço coral solto — 08/09

> Sintoma: fotografia do telemóvel do Matheus. Medido ao vivo a **390 px**, no
> renderizado, porque hoje já se errou quatro vezes a afirmar sobre esta página
> a calcular a partir de atributos.

## Os dois eram o mesmo, e a causa não era a que estava suposta

A hipótese era `.bo-mkt__abrir` sem `margin-left: auto`. **Não é isso**, e o
`margin-left: auto` não foi preciso.

Medido antes:

    a.bo-mkt__marca        x=24..169
    button.bo-mkt__abrir   x=214..258        ← a meio
    div.bo-mkt__painel     display=none
    header::after          bg=rgb(245,102,77)  64x3px

O cabeçalho comercial é `flex` com `space-between`, e **um pseudo-elemento de um
contentor de flex É um item de flex**. Com três itens a participar — marca, botão
e `::after` — o `space-between` dá o lugar da direita ao `::after` e o botão fica
no meio. **Um sintoma só, com duas caras.**

## O que era o traço coral, antes de sair

**«O filete da casa».** O `.bo-publico__cabecalho::after` é a faixa curta com a
cor que **um restaurante configura na sua carta** — declarada no CSS como
decoração e não indicador, com a `acento.test.ts` a guardar essa distinção.

Na carta ele está certo: lá o cabeçalho é uma **grelha** com
`justify-items: start`, e o filete cai numa linha própria por baixo do nome. Foi
a variante comercial que trocou o cabeçalho para `flex`, e nessa troca o filete
deixou de ser uma faixa por baixo e passou a ser o terceiro item da linha.

**Sai só do cabeçalho comercial**, com `content: none` — na carta continua a
servir. E sai inteiro em vez de ser reposicionado, porque **a landing não é a
carta de casa nenhuma**: não há restaurante cuja marca ele carregue, e o que
pintava era a cor de recurso.

Medido depois:

    a.bo-mkt__marca        x=24..169
    button.bo-mkt__abrir   x=322..366        ← encostado (390 − 24 de padding)
    PSEUDO-ELEMENTOS       (nenhum)

## A linha verde-lima: proposta, e não decisão

**Não é uma linha desenhada — é texto.** O `p.ns-sinal`, a `#DDEA91`, três linhas
por baixo dos botões ao telemóvel: *«La misma comanda, en los dos sitios…»*

Factos, para a decisão assentar neles:

- **não é acessibilidade:** dá **11,10:1** sobre o verde. A areia daria 13,05:1;
- **é a única ocorrência daquela cor na folha inteira.** Um acento usado uma vez
  não tem família — lê-se como excepção e não como sistema;
- ao telemóvel são **três linhas**, e três linhas de cor de acento deixam de ser
  acento e passam a ser um bloco.

Três saídas, sem eu escolher:

1. **Guardar as palavras, largar a cor** — a mesma areia do lead. A frase continua
   a carregar a prova e para de gritar. Custo: a página fica sem sinal nenhum.
2. **Guardar a cor, encurtar o trabalho** — uma linha em vez de três. Um acento de
   uma linha é acento; de três é um bloco. Custo: mexer no texto.
3. **Ficar como está** — se a intenção é que esta frase seja *a* afirmação da
   página, a cor está a fazer o trabalho dela e o telemóvel só a torna mais alta.

**Não mexi.** Está na lista do Matheus como decisão, e é dele.
