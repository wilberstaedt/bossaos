# Que preço paga um pedido escrito offline

> Contrato. Escrito a 04/09/2026, antes do E14 estar implementado, porque esta é
> uma pergunta de dinheiro e a resposta errada só aparece na conta do cliente.

## A pergunta

Um empregado escreve um pedido às 19:00 no telemóvel, sem rede. O gerente muda o
preço do prato às 19:20. O telemóvel só consegue enviar às 19:40.

**O cliente paga o preço das 19:00 ou o das 19:40?**

## As duas respostas fáceis, e porque ambas estão erradas

**"O preço de quando chegou."** É a que sai de graça de qualquer implementação:
o servidor recalcula tudo à chegada. Está errada porque cobra ao cliente um
preço que ele nunca viu. Ele leu uma ementa, disse sim a um número, e recebe
outro. Em Espanha isso não é uma questão de gosto — é o preço anunciado a
obrigar quem o anunciou.

**"O preço que o aparelho diz."** Parece a correcção óbvia da primeira, e é pior.
Faz do aparelho a autoridade sobre o dinheiro. Um telemóvel com a ementa velha
— ou com a ementa adulterada — passa a definir os seus próprios preços, e o
servidor assina por baixo sem ter como discordar.

## CORRIGIDO a 04/09, algumas horas depois — a regra abaixo estava errada

Deixo o texto original inteiro por baixo, porque apagá-lo esconderia o erro e o
erro é a parte útil.

**Escrevi que o momento que conta é a escrita. Não é: vale o preço do servidor
no momento em que ele ACEITA.** Quem o mostrou foi o JR, ao implementar o E14, e
tem razão por duas coisas que eu não tinha:

1. **O E14 já proibia o que eu propus, pelo nome:** «preço e dados recebidos do
   navegador são propostas; valores oficiais vêm do catálogo e da política do
   servidor». Um rascunho offline é exactamente isso. Eu inventei uma regra nova
   quando já havia uma, e mais antiga do que a minha.
2. **Eu decidi política comercial que não é minha.** Se o restaurante quer honrar
   o preço antigo é decisão do dono. Ele deixou-a como campo por preencher em
   `OrderRules`; eu tinha-a resolvido sozinho e chamado contrato a isso.

**O que sobreviveu**, e é a parte que eu defendia a sério: **nunca se reprecifica
em silêncio.** Na implementação dele a linha divergente é rejeitada com o motivo
`PRECO_DIVERGENTE`, o carrinho fica intacto, e a linha guarda **os dois** preços
— o proposto e o oficial — para o ecrã conseguir explicar. A decisão volta a
quem está à mesa. Era isso que eu queria garantir; o mecanismo dele fá-lo sem
inventar máquina de versões de ementa nem política de ninguém.

**E a metade que impede isto de ser «recusa sempre»:** quando não vem preço
proposto não há divergência — vale o do servidor e a linha passa. Verifiquei a
condição no código (`pedidos.ts:327`) e é essa.

Fica também o que **eu** aprendi: escrevi este contrato a correr, no tick em que
vi que a pergunta estava por responder, e a pressa fez-me saltar a única
pergunta que interessava — *já existe regra sobre isto?* Existia.

---

## A regra (ERRADA — mantida para se ver o que falhou)

O momento que conta é **quando o pedido foi escrito**. A autoridade sobre o que
esse momento valia **não é o aparelho: é a cópia que o servidor tem da ementa
dessa altura.**

É este par que separa a regra certa da preguiçosa. O aparelho é autoridade sobre
**o que foi mostrado ao cliente**; o servidor é autoridade sobre **o que essa
ementa dizia**. Um afirma, o outro confere.

Em concreto, cada linha de pedido viaja com quatro coisas: o artigo, a
quantidade, **o preço em cêntimos que foi mostrado**, e **a versão da ementa de
onde esse preço saiu**. À chegada:

1. **O servidor conhece essa versão e o preço bate certo.** Aceita o preço
   escrito. Uma alteração de preço posterior **nunca anda para trás** sobre
   pedidos já escritos contra a versão anterior.
2. **O servidor conhece essa versão e o preço NÃO bate certo.** O aparelho
   afirmou um número que aquela ementa não continha. Isto não se resolve
   escolhendo um dos dois: é sinal de aparelho avariado ou mexido. O pedido
   **entra em decisão humana** com os dois números à vista.
3. **O servidor não conhece essa versão.** Também decisão humana. Não se inventa
   a ementa que já não existe.

## O que nunca acontece em silêncio

**Nunca se reprecifica sem uma pessoa.** Um pedido que chega e é cobrado por um
preço diferente do que foi mostrado é roubo num sentido e prejuízo no outro, e
nas duas direcções a máquina decidiu sozinha uma coisa que não lhe compete.

Os casos 2 e 3 **não são erros a esconder num log**: são um ecrã, com o que o
cliente viu, o que a ementa dizia, e a diferença. Quem decide é o gerente.

## O controlo negativo desta regra

Uma implementação que passa o teste feliz — pedido escrito, preço mantido — não
prova nada, porque a resposta "o preço de quando chegou" também o passaria
sempre que o preço não muda no meio. **A prova exige mudar o preço entre a
escrita e a chegada** e verificar que a conta ficou no valor antigo. E exige a
segunda metade: mandar uma linha com um preço que aquela versão da ementa não
tinha, e verificar que **não foi aceite nem recalculada em silêncio** — que
parou numa pessoa.

Sem essas duas, o que foi medido foi o caso em que as três regras concordam.

## Ligações

- `catalogo-e-publicacao.md` — versões de ementa e o que é publicado
- `offline-e-fila-local.md` — a fila local, e a regra 3-bis da revogação
- `docs/bossaos/PRECIFICACAO.json` — a fonte dos valores, em cêntimos
