# Kiosk e impressão

> Escrito a 05/09, **antes de existir código do E31**. Por fronteira. O estado
> indeterminado do dinheiro está em [dinheiro.md](dinheiro.md); a retenção de
> dados de cliente em
> [dados-e-accoes-sensiveis.md](dados-e-accoes-sensiveis.md). Isto é sobre o que
> acontece quando o produto deixa de saber, porque a coisa passou a ser física.

Todas as etapas anteriores acabavam dentro do sistema. **Esta acaba num pedaço
de papel e num ecrã que fica sozinho num corredor** — e nos dois casos o produto
perde a capacidade de verificar aquilo que afirma.

---

## Fronteira 1 — o cliente vai-se embora

**O aceite mais duro da etapa: dois clientes seguidos não partilham carrinho,
dados nem sessão de pagamento.** E ao lado dele, no mesmo sítio, uma exigência
que puxa ao contrário: **apagar os dados do cliente sem perder a confirmação do
pedido**.

Quem tentar resolver isto no botão de reiniciar vai falhar numa das duas. A
solução não é apagar com esperteza no fim; **é não juntar no princípio.**

O pedido guarda o que precisa para existir — número, linhas, valor, estado. **Os
dados da pessoa vivem à parte, com finalidade e prazo próprios** (contrato do
E27), e o pedido refere-os. Apagar a pessoa não apaga o pedido, porque nunca
foram a mesma coisa. **Garantia por estrutura, não por limpeza.**

E a sessão do kiosk termina de três maneiras — concluída, abandonada por
inactividade, e reiniciada à mão —, e **as três limpam o mesmo**. Um caminho de
saída que limpa menos do que os outros é o que deixa o carrinho do cliente
anterior no ecrã do seguinte.

## Fronteira 2 — alguma coisa é enviada para a impressora

**Aqui o produto deixa de poder verificar o que afirma.** Há três estados, e o
terceiro é o que costuma faltar:

| Estado | O que se sabe |
| --- | --- |
| **por enviar** | está na fila |
| **entregue à ponte** | o software fez a sua parte |
| **confirmado pelo aparelho** | houve resposta do dispositivo |

**«Entregue à ponte» não é «imprimiu».** O papel pode ter acabado, a tampa pode
estar aberta, a impressora pode estar desligada. Chamar impresso ao que foi
enviado é a mesma família de erro que chamar entregue a um HTTP 200.

**E não saber é um estado, não um erro.** Uma comanda em «não sei» aparece na
tela como não sei, e alguém decide. O que não pode acontecer é o produto escolher
por conta própria entre «imprimiu» e «não imprimiu» quando não tem informação —
porque as duas decisões erradas custam coisas diferentes: uma manda o cliente
esperar por comida que ninguém está a fazer, a outra faz a cozinha fazer duas.

## Fronteira 3 — o mesmo documento é enviado outra vez

**Fila idempotente.** O mesmo documento não produz duas comandas — identidade
derivada e restrição na base, como a linha de extracto do E29.

**E a reimpressão distingue-se de um pedido novo NO PAPEL.** Não no ecrã de quem
reimprime: no papel que chega à cozinha, porque é lá que a decisão errada custa.
Uma segunda via sem marca é indistinguível de um segundo pedido, e ninguém na
cozinha tem como saber a diferença.

## Fronteira 4 — o kiosk está offline

**Não captura pagamento e não promete pedido confirmado.** Um kiosk sem rede
pode aceitar que a pessoa escolha; não pode dizer-lhe que está feito.

**E um reiniciar não abandona uma cobrança indeterminada.** É o cruzamento das
duas coisas mais perigosas do produto: o estado que mais dói e o botão que limpa
tudo. Se há uma cobrança por resolver, o reiniciar não a pode fazer desaparecer
do sistema — a pessoa foi-se embora, o dinheiro pode ter saído da conta dela, e
não há ninguém no balcão para reclamar.

## Fronteira 5 — não há hardware

**Sem aparelho real não se declara homologação.** Entrega-se simulador, contrato
de dispositivo e a matriz com as linhas por testar **marcadas como por testar** —
nunca em branco, nunca a verde.

> Esta é a regra do projecto inteiro, escrita para hardware: **há três respostas,
> e a terceira é «não medi».** Uma matriz de homologação com uma linha vazia lê-se
> como uma linha aprovada, e uma linha vazia e uma linha aprovada custam a mesma
> tinta.

E **não se presume** que a impressora aceita chamada directa do navegador, nem
que o equipamento das fotografias é compatível. Uma fotografia de um aparelho não
é uma especificação — foi assim que já li dois caracteres errados numa chave e
construí uma hora de diagnóstico em cima disso.

---

## O que vou exigir como prova

1. **Dois clientes seguidos**, pelos **três** caminhos de saída — concluído,
   inactividade, reinício à mão. Controlo: fazer um dos três limpar menos e ver
   acender.
2. **Apagar a pessoa e o pedido sobreviver.** Controlo: juntar os dois na mesma
   entidade e ver a prova acender — porque aí apagar um apaga o outro.
3. **Enviar duas vezes** — uma comanda. Controlo: desligar a restrição da base e
   ver duplicar.
4. **Reimpressão marcada no papel.** Controlo: tirar a marca e ver a prova
   acender.
5. **Ponte que aceita e aparelho que não responde** — fica «não sei», e a tela
   diz não sei. Controlo: fazer o «não sei» colapsar em «impresso» e acender.
6. **Offline** — não captura e não promete. Controlo: reiniciar com cobrança
   indeterminada e ver a prova acender.
7. **A matriz de homologação** distingue por testar de aprovado, e o que não foi
   testado com aparelho real diz-se por palavras.
