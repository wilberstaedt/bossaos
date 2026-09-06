# Formação — um guião por papel

> O orçamento não é infinito: a implantação assistida vende-se com **2 h no
> Starter, 4 h no Restaurant, 8 h no Pro**
> ([`PRECIFICACAO.json`](../bossaos/PRECIFICACAO.json)). Uma formação que precise
> de mais do que isso não é formação: é o produto a pedir desculpa.
>
> Cada guião abaixo tem um **teste**, e o teste é a pessoa a fazer a tarefa
> **sozinha**, com o formador calado. Ver alguém fazer não é saber fazer, e
> «percebeu?» com aceno de cabeça é a forma mais barata de mentir a nós próprios.

## Regra que atravessa todos os papéis

**Quando o sistema cai, a casa não pára.** Papel e caixa registadora, e o pessoal
já treinou com eles — é o último guião de cada papel, e não é opcional. Uma casa
que só sabe trabalhar com o sistema fecha quando o sistema fecha.

---

## 1. Sala — `WAITER`, ~25 min

**O que faz:** abre mesa, lança pedido, divide conta, fecha.

**Guião**
1. Abrir mesa e lançar três linhas, uma com observação («sem cebola»).
2. Ver o pedido a chegar à cozinha — **no ecrã da cozinha, não no dele**. Ninguém
   acredita que o pedido saiu até o ver do outro lado.
3. Anular uma linha **já enviada** e ver a cozinha ser avisada.
4. Dividir a conta em duas e fechar uma delas.

**Teste (sozinho):** mesa nova, quatro linhas, uma anulação depois de enviada,
conta dividida a dois. Sem perguntas.

**Quando o sistema cai:** comanda de papel, duplicado para a cozinha, e a conta
soma-se à mão. Quando voltar, as comandas entram como pedidos normais pela
caixa — **não há importação especial para isso**, é serviço.

---

## 2. Cozinha e bar — `KITCHEN`, `BARTENDER`, `EXPO`, ~20 min

**O que faz:** recebe, marca em preparação, marca pronto.

**Guião**
1. Ler o ecrã da estação: o que é dela e **só** o que é dela.
2. Marcar em preparação e pronto; ver a sala a saber.
3. **Recusar uma linha** com motivo — acabou o produto. O motivo é uma frase, e
   chega à sala como frase.
4. Ver o que acontece a uma linha com alergénio **DESCONHECIDO**: não diz «não
   contém», diz que ninguém confirmou. Quem serve tem de perguntar.

**Teste (sozinho):** limpar a fila de seis linhas, recusar uma com motivo, e
dizer em voz alta o que faria com a linha de alergénio desconhecido.

**Quando o sistema cai:** comanda de papel espetada, e a ordem é a de chegada.
O ecrã volta com a fila que tinha; o que passou em papel não aparece lá, e não
deve — nunca aconteceu no sistema.

---

## 3. Caixa — `CASHIER`, ~20 min

**O que faz:** cobra, devolve, fecha o dia.

**Guião**
1. Cobrar em numerário e em cartão.
2. Fazer uma devolução parcial e ver o rasto ficar.
3. Fecho de dia: o total é **derivado dos movimentos**, e não um número que
   alguém escreve. Se não bater, o que está errado são os movimentos.

**Teste (sozinho):** um dia curto — quatro vendas, uma devolução, fecho — e
explicar de onde vem o total.

**Quando o sistema cai:** caixa registadora, talões guardados por ordem, e à
volta lançam-se as vendas. **Não se apaga nada para «ficar coerente»**: um
serviço que aconteceu aconteceu.

---

## 4. Reservas e porta — `HOST`, ~20 min

**O que faz:** reserva, lista de espera, sentar.

**Guião**
1. Criar reserva, mudar hora, cancelar — e ver a mensagem que o cliente recebe.
2. Pôr alguém em espera e chamar.
3. Sentar uma reserva numa mesa e ver a sala a saber.

**Teste (sozinho):** noite com duas reservas, um atraso, um walk-in para espera.

**Quando o sistema cai:** livro de papel com hora, nome e número de pessoas. As
mensagens automáticas **não saem** enquanto estiver em baixo — quem tem uma
reserva não avisada é telefonema, e isso diz-se ao gerente na hora.

---

## 5. Gerência da unidade — `VENUE_MANAGER`, ~30 min

**O que faz:** carta, horários, pessoal, e é quem chama quando cai.

**Guião**
1. Mudar preço e disponibilidade de um produto, e ver no QR do cliente.
2. Editar alergénios — e ver que **vazio fica DESCONHECIDO**, nunca «não contém».
3. Convidar um funcionário e atribuir papel; retirar o papel e ver o acesso a
   fechar.
4. Ler o rasto: **quem** fez, não que papel fez.
5. Correr o [`falha.md`](../runbooks/falha.md) de cima a baixo, uma vez, a frio.

**Teste (sozinho):** subir um produto novo com alergénios, dá-lo por esgotado, e
dizer os quatro passos de diagnóstico do `falha.md` sem ler.

---

## 6. Cliente no QR — não é papel, é visitante, ~0 min de formação

Não se treina o cliente: **se ele precisar de formação, o produto está errado.**
O que se treina é a sala a **explicar em duas frases**: aponta a câmara, a carta
abre no idioma do telemóvel, e pede-se dali ou pela pessoa.

**Teste:** um empregado explica a um colega que nunca viu o produto, em menos de
trinta segundos, e o colega chega à carta sozinho.

---

## O que fica registado

Quem passou o teste, quando, e por quem — em [`pilot.md`](pilot.md). Um papel sem
ninguém testado é **pendente**, e escreve-se por palavras. Nunca em branco: uma
linha vazia lê-se como uma linha aprovada.
