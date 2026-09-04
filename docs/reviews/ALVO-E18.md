# Régua do E18 — Motor de reservas e capacidade concorrente

> Escrita antes de existir código. **6 telas:** RES-B-012, 013, 014, 015, 016 e
> SET-007, da matriz.
> **O contrato já decide a concorrência** (`capacidade-e-reservas.md`, do E00):
> lock a serializar, `serializable`, retry com chave idempotente, e o controlo
> negativo obrigatório — *desligar o lock e ver o teste de concorrência ficar
> vermelho*. Não repito o que já está decidido. Exijo o que ele não cobre.

## 1. A disponibilidade é do INTERVALO, não do instante

O enunciado di-lo: *«calcule disponibilidade para o intervalo inteiro»*. O
defeito ingénuo verifica só a hora de início — e uma reserva de duas horas às
20h passa por cima de outra às 21h sem ninguém ver erro.

**Exijo:** uma reserva das 20h às 22h e um pedido para as 21h **na mesma mesa**
recusado. E o par, sem o qual «recusa sempre» passava: **um pedido para as 22h30
é aceite**, porque o intervalo já acabou.

## 2. A ocupação é partilhada, e é aí que estas coisas partem

*«Compartilhe ocupação com TableSession e walk-ins.»* Duas fontes de verdade
sobre a mesma mesa é a definição do problema.

**Exijo os dois sentidos**, porque um só passa com metade da implementação:
- um **walk-in sentado** na mesa 5 impede a reserva das 20h na mesa 5;
- e uma **reserva confirmada** para as 20h impede o walk-in às 19h45 se o buffer
  não couber.

Verificado no que a **consulta de disponibilidade devolve**, não no ecrã.

## 3. A hora de Verão, que é onde isto se descobre tarde

*«Timestamps UTC e regras de timezone da unidade; intervalos atravessando dia e
mudanças de horário de verão.»* Em Espanha isso acontece duas vezes por ano, às
03h, e o restaurante está fechado — por isso ninguém repara até reparar.

**Exijo os dois casos, que são assimétricos:**
- na noite em que o relógio **avança**, uma hora **não existe**: uma reserva
  marcada nela tem de ser recusada ou movida, nunca gravada em silêncio;
- na noite em que **recua**, uma hora **acontece duas vezes**: duas reservas
  «às 02h30» são momentos diferentes, e a disponibilidade tem de as distinguir.

Um teste que só corra em datas normais não mede nada disto. **A data faz parte
do cenário**, e tem de estar escrita na prova.

## O que reprovo à cabeça

- **Verde sobre agenda vazia.** Declara quantas reservas e sessões existiam.
- **A tela a decidir.** *«Disponibilidade da tela nunca substitui verificação de
  servidor»* — o pedido tem de ser recusado pelo servidor mesmo quando o ecrã
  deixou carregar.
- **As 6 telas sem navegador**, cinco larguras, ES/PT/EN, e a **população lida da
  matriz**, conjunto a conjunto.
- **Uma suite que não consegue ficar vermelha.** No E17 foram dezassete
  controlos; a fasquia está posta.
