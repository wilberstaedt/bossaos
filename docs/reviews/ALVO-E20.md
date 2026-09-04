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

## O que reprovo à cabeça

- **Verde sobre fila de retirada vazia.** Declara quantos pedidos havia.
- **As 7 telas sem navegador**, cinco larguras, ES/PT/EN, população da matriz.
- **Uma suite que não consegue ficar vermelha.**
- **O `entitlement` do delivery misturado com o do takeaway.** São separados por
  desenho; provar um não prova o outro.
