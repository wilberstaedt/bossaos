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
