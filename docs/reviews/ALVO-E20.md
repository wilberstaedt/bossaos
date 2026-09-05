# Régua do E20 — Takeaway e delivery

> Escrita antes de existir código. **7 telas:** STAFF-021, TAKE-001/002/003 e
> DEL-001/002/003, da matriz.
> **O contrato do momento de produção já está escrito**
> (`pedidos-para-mais-tarde.md`): a produção vê o pedido a partir do seu momento
> de produção, derivado e nunca escrito pelo cliente, e a passagem é por relógio
> e não por evento. Não repito. Exijo o resto.

## 1. Um só banco de pedidos, e é aqui que se estraga

*«Crie filtros e telas por canal sem manter bancos de pedidos independentes.»* A
tentação é uma tabela de takeaway ao lado — parece mais simples e é a decisão
mais cara do projecto depois de tomada. O canal é uma **dimensão** do `Order`
que existe desde o E14, não um objecto novo.

**Exijo o par que só um modelo unificado passa:**
- um pedido de takeaway aparece no KDS **pelas mesmas tarefas** de produção do
  E16 — não por um caminho paralelo;
- e um filtro por canal **esconde-o da sala** sem o tirar da cozinha.

Se houver duas tabelas, o segundo caso passa e o primeiro parte — ou pior, os
dois passam e os números do relatório deixam de bater.

## 2. A área servida: a recusa é do servidor, e é útil

Um endereço fora da área tem de ser **recusado**, e a pessoa tem de perceber
porquê antes de ter escrito o resto da morada.

**O par:** um endereço **dentro** da área é aceite. Sem ele, «recusa sempre»
passa — e é o defeito mais provável, porque recusar é o caminho seguro para quem
implementa.

## 3. A taxa é configurada, nunca inventada

Se não houver taxa definida para aquela área, o sistema **não escolhe uma**. Diz
que não está configurada. É a mesma regra que já usámos duas vezes: **ausência
não é política**, e um valor por omissão que ninguém decidiu é uma decisão do
dono tomada por nós.

## 4. O conector externo desligado é VISÍVEL como desligado

*«Sem contrato/provedor, mantenha o conector desabilitado.»* Desligado e a
**dizer que está desligado** — não a aceitar pedidos que ninguém vai buscar. Uma
integração que finge é pior do que uma que falta, porque a que falta vê-se.

## 5. A hora de entrega é hora da casa — acrescentado a 05/09

Escrito depois de encontrar o defeito no E19, e posto aqui **antes** de o E20
começar, para não se repetir. Não é previdência: é a mesma pedra vista de cima.

O E20 é a etapa mais exposta a isto de todo o projecto, porque aqui a hora não
serve para *avisar* alguém — serve para **arrancar a cozinha**. O contrato
`pedidos-para-mais-tarde.md` diz que a produção vê o pedido a partir do seu
momento de produção, **derivado da hora de entrega menos o preparo**, e que a
passagem é por **relógio**. Se a hora de entrega nascer errada, o momento de
produção nasce errado com ela, e o erro chega ao fogão.

Com o desvio de `Europe/Madrid`: um pedido para as **20:30** com 25 minutos de
preparo devia entrar em produção às 20:05. Com a hora de parede gravada como
UTC, entra às **22:05 locais** — comida feita duas horas depois de a pessoa a
ter vindo buscar. No Inverno, uma hora. E na noite da mudança, ninguém sabe.

**O aceite:** toda a hora escolhida por uma pessoa passa por
`resolverHoraLocal(db, unidade.fuso, local)` antes de existir instante.

**Reprovo à cabeça:**

- **`new Date(...Z)` ou `Date.UTC(...)`** em qualquer caminho que receba hora de
  uma pessoa.
- **A prova do momento de produção medida só em minutos relativos.** «Entra 25
  minutos antes» é verdade em qualquer fuso e não prova nada. Exijo a hora
  **absoluta** verificada contra o relógio da base.
- **Uma unidade só.** A mesma hora de entrega em dois fusos tem de produzir
  momentos de produção diferentes.

Contexto: `docs/reviews/E19-ACHADO-FUSO.md`.

## O que reprovo à cabeça

- **Verde sobre fila de retirada vazia.** Declara quantos pedidos havia.
- **As 7 telas sem navegador**, cinco larguras, ES/PT/EN, população da matriz.
- **Uma suite que não consegue ficar vermelha.**
- **O `entitlement` do delivery misturado com o do takeaway.** São separados por
  desenho; provar um não prova o outro.

## Observado durante a construção — 05/09, fatia 1

Não é veredicto: a etapa não foi declarada. Registo para não se perder.

**A armadilha que pus no aceite 5 foi apanhada.** Eu tinha escrito que a prova
do momento de produção não pode ser medida em minutos relativos, porque «entra
25 minutos antes» é verdade em qualquer fuso. O grupo 1 do `mais-tarde.test.ts`
chama-se **«O momento de produção, em hora ABSOLUTA»** e traz os casos certos,
incluindo o par dos dois fusos e um que nomeia a origem: *«e NÃO é a hora de
parede lida como UTC — o defeito do E19, aqui no fogão»*.

**E foi além.** A derivação não está no código da aplicação: é um **gatilho da
base**, `BEFORE INSERT OR UPDATE`, que reescreve `producao_em` a partir de
`entregar_as - preparo_min`. Um valor escrito de fora é substituído — pela
aplicação, por um script, ou por um `UPDATE` à mão. É a forma mais forte da
garantia, a mesma família da bolacha com `path=/r/<slug>`: **não é uma regra que
alguém tem de respeitar, é uma coisa que não se consegue fazer.**

Fica por verificar na revisão, e não presumo: se o gatilho tem controlo negativo
(uma escrita de fora que TEM de ser substituída, medida), e se o `preparo` do
pedido é mesmo o **maior** das linhas e não a soma — as linhas preparam-se em
paralelo, e somá-las inventaria espera que não existe.

### Duas arestas do `preparoDoPedido`, para perguntar na revisão

Verifiquei o que tinha deixado em aberto: **é o `Math.max`, não a soma**, com a
razão certa escrita por cima. Está bem, e bate com
`tarefas-de-producao-e-estacoes.md`.

Ao ler, duas coisas que **não são defeito** mas também não foram decididas em
lado nenhum. Pergunto-as na revisão em vez de as assumir:

1. **A quantidade não entra.** Cinco doses de batata contam como uma. Para uma
   fritadeira isso é provavelmente certo — é uma fritada, não cinco. Para um
   prato montado à mão, cinco podem ser mesmo cinco vezes. A escolha actual é
   defensável; o que não existe é a escolha **escrita**.

2. **Uma linha sem produto contribui zero.** `l.productId ? [l.productId] : []`
   salta as linhas livres. Um «sem cebola, e faça-me isto à parte» escrito à mão
   não tem preparo associado — e é justamente o pedido que costuma demorar mais.
   Se o produto permite linhas livres com peso real na cozinha, o zero é uma
   subestimativa silenciosa: o momento de produção nasce tarde e o pedido sai
   atrasado sem ninguém perceber porquê.

Nenhuma bloqueia a etapa à cabeça. As duas são do tipo que só se descobre em
serviço, e nessa altura aparecem como «a cozinha está sempre atrasada às
sextas» — um sintoma que ninguém liga a uma linha de código.

### Varredura dos aceites 2 a 4, antes da declaração

Fui verificar os restantes em vez de esperar. Nenhum é veredicto — a etapa não
foi declarada — mas nenhum me levanta bandeira:

- **Aceite 4, o conector desligado.** Grupo 4 tem o par: *«um pedido externo com
  o conector desligado é RECUSADO»* e *«E O PAR: com provedor e mapa, ENTRA»*,
  mais o discriminador de idempotência *«um id externo DIFERENTE é um pedido
  novo»*. E o produto **recusa**, em vez de aceitar e pôr de lado — que é a
  diferença que separa um erro visível de pedidos a desaparecer em silêncio.
- **Aceite 3, a taxa.** Lida de `area.taxaMenor`, em unidade menor inteira, sem
  literal nem valor por omissão em lado nenhum do caminho. Está como o contrato
  do dinheiro exige.
- **Aceite 2, a cozinha só vê o que é para agora.** Com o par por relógio: *«o
  MESMO pedido aparece quando o momento chega — sem ninguém abrir nada»*, e
  *«atravessar o momento DUAS VEZES não cria duas entradas»*.

**E um grupo que eu não pedi:** «5. O item que esgota ANTES da hora». Um prato
encomendado para as 20:30 que acaba às 19:00 é um problema só dos pedidos
agendados — não existe no serviço à mesa, onde se pede e faz-se. Não estava na
minha régua e devia estar.

**Guarda do dinheiro, corrida a 05/09 contra a árvore do E20: 0 falhas.** O único
`Number()` do `mais-tarde.ts` está numa contagem para gerar o número do pedido
(`X00001`), e a guarda não o acusa — porque tem controlo dos dois lados: «apanha
as três conversões de dinheiro **e não acusa as três legítimas**». É a
calibração que exigi depois de ela ter acusado o `total` de zona no E18, que
conta pessoas.

### Pergunta para a revisão: a hora de entrega não tem limites

Medido: `RecusaDeAgendamento` tem três valores — `SEM_FUSO`, `HORA_INEXISTENTE`
e `SEM_LINHAS`. **Não há recusa para hora no passado, para casa fechada, nem
para uma data absurdamente longe.** Procurei no caminho todo, incluindo a rota:
não está noutro sítio.

O E18 tem `antecedenciaMinMin` e `antecedenciaMaxDias` para reservas. O E20 não
tem equivalente para pedidos.

**O que acontece hoje, e é pior do que parece:** uma hora no passado dá
`producao_em` no passado, e a condição da fila é `producao_em <= agora`. O
pedido **entra imediatamente na cozinha**, embora a pessoa julgue tê-lo
agendado. Uma hora com a casa fechada é aceite e aparece às 03h40 a ninguém.

**A nuance que baixa a urgência, e que não escondo:** a rota é
`api/org/<orgSlug>/levar` — é **staff**, não é pública. Quem escolhe a hora é
alguém do restaurante, e um erro de dedo é menos provável e mais corrigível do
que um cliente na rua. O E20 tem 7 telas e, se alguma delas abrir isto ao
público, a pergunta deixa de ser pergunta.

**E a parte que é minha:** a régua do E20 também não exigia isto. É a segunda
vez esta noite que o defeito mora onde nenhum contrato foi escrito — como o
fuso. Ver `E00-PROVA-PARA-O-JR.md`: *um contrato errado discute-se; um contrato
inexistente não tem quem o defenda.*
