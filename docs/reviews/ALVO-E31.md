# Régua do E31 — Kiosk, terminais e impressão

> Escrita a 05/09, **antes de existir código**. Onze telas. Contrato:
> [`kiosk-e-impressao.md`](../architecture/kiosk-e-impressao.md), escrito
> imediatamente antes desta régua e também antes do código.

## O que muda nesta etapa

Todas as anteriores acabavam dentro do sistema. **Esta acaba num pedaço de papel
e num ecrã sozinho num corredor** — e nos dois sítios o produto perde a
capacidade de verificar aquilo que afirma.

É a etapa onde «verde não é alcance» deixa de ser sobre código: **o teste passa e
não sai papel.**

## 1. Dois clientes seguidos, pelos TRÊS caminhos de saída

Concluído, inactividade, reinício à mão. **As três limpam o mesmo.** Uma prova
que só testa o caminho concluído não mede nada — o caso real é a pessoa que se
farta e vai embora a meio, e é esse que deixa o carrinho no ecrã do seguinte.

## 2. Apagar a pessoa sem perder o pedido — e resolvido no princípio

O aceite pede as duas coisas ao mesmo tempo, e quem tentar resolvê-las no botão
de reiniciar falha numa. **A solução não é apagar com esperteza no fim; é não
juntar no princípio.** Dados da pessoa à parte, com finalidade e prazo, e o
pedido a referi-los.

Controlo que exijo: **juntar os dois na mesma entidade e ver a prova acender**,
porque aí apagar um apaga o outro. Se a prova passar com os dados juntos, ela não
está a medir a separação — está a medir que o botão hoje funciona.

## 3. «Entregue à ponte» não é «imprimiu», e «não sei» é um estado

Três estados: por enviar, entregue à ponte, confirmado pelo aparelho. **Chamar
impresso ao que foi enviado é a mesma família de erro que chamar entregue a um
HTTP 200** — e essa já me custou um incidente real noutro produto.

**O produto não escolhe por conta própria** entre imprimiu e não imprimiu quando
não tem informação. As duas decisões erradas custam coisas diferentes: uma manda
o cliente esperar por comida que ninguém está a fazer, a outra faz a cozinha
fazer duas.

Controlo: fazer o «não sei» colapsar em «impresso» e acender.

## 4. A reimpressão distingue-se NO PAPEL

Não no ecrã de quem reimprime — no papel que chega à cozinha, **porque é lá que
a decisão errada custa**. Uma segunda via sem marca é indistinguível de um
segundo pedido, e ninguém na cozinha tem como saber.

## 5. Offline não promete, e o reiniciar não abandona cobrança

O cruzamento das duas coisas mais perigosas do produto: **o estado indeterminado
e o botão que limpa tudo**. Se há cobrança por resolver, o reiniciar não a faz
desaparecer — a pessoa foi-se embora, o dinheiro pode ter saído da conta dela, e
não há ninguém no balcão para reclamar.

## 6. Sem aparelho real não há homologação declarada

A matriz tem as linhas por testar **marcadas como por testar**. Nunca em branco.

> **Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma
> tinta.** É a regra do projecto inteiro, aplicada a hardware: há três respostas,
> e a terceira é «não medi».

E não se presume nada a partir de fotografias de equipamento. Uma fotografia não
é uma especificação.

## O que aceito como pendência

**Homologação física.** Não temos as impressoras do piloto aqui, e simular não
é homologar. O que exijo é que o simulador **respeite o contrato de dispositivo**
e que a matriz diga, por palavras, o que ficou por medir com aparelho a sério —
para que ninguém leia silêncio como aprovação.
