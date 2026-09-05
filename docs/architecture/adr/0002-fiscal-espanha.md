# ADR 0002 — O regime fiscal espanhol: o que foi verificado, onde, e quando

> **Estado:** aceite · **Data:** 2026-09-05 · **Etapa:** E24
>
> Este documento existe porque a régua do E24 o exige por palavras: *«uma etapa
> fiscal que não diga onde foi confirmar não está provada, está suposta»*.

---

## Porque é que este ADR existe antes do código

O sénior recusou-se a escrever os requisitos fiscais na régua, e a razão está lá:
**um requisito fiscal errado escrito com confiança é pior do que requisito
nenhum**, porque passa a ser citado como verdade e ninguém volta a verificar o
que já está escrito.

Eu tenho o mesmo problema, e agravado: o meu conhecimento tem data. Por isso o
que se segue **não é o que eu sei** — é o que fui ler, com o endereço e o dia.

## Fontes consultadas, e o que cada uma disse

### Fonte 1 — Agência Tributária (AEAT), página do regime

- **Endereço:** `https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html`
- **Consultada em:** 2026-09-05
- **Nome oficial do regime:** «Sistemas Informáticos de Facturación (SIF) y
  VERI\*FACTU»
- **Diplomas que a página cita:**
  - Real Decreto 1007/2023, de 5 de diciembre
  - Real Decreto 254/2025, de 1 de abril (modifica o anterior)
  - Orden HAC/1177/2024, de 17 de octubre (especificações técnicas e funcionais)
  - Real Decreto 1619/2012, de 30 de noviembre (obrigações de facturação)
  - Ley 58/2003, artigos 29.2.j e 201 bis
- **O que esta página NÃO diz:** não enumera prazos concretos, não lista o que o
  sistema tem de produzir, e não distingue as obrigações do VERI\*FACTU das dos
  outros sistemas. Fica dito, porque a ausência também é informação.

### Fonte 2 — BOE, texto consolidado do RD 1007/2023

- **Endereço:** `https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840`
- **Consultada em:** 2026-09-05
- **Versão:** texto consolidado, com actualizações referenciadas até 2025-12-03

O que o texto consolidado afirma, com o artigo:

| facto | onde |
| --- | --- |
| Grandes empresas (IS) — sistemas conformes a partir de **2027-01-01** | disp. final, art. 3.1.a |
| Restantes obrigados — a partir de **2027-07-01** | art. 3.1.b, c, d |
| Produtores de sistemas — produto adaptado em **9 meses** após a ordem ministerial | disp. final |
| O registo de alta inclui **parte da «huella» ou hash do registo imediatamente anterior** | art. 10.1.ñ |
| **Código QR** na factura emitida por sistema conforme | art. 6.5.a |
| A frase «Factura verificable en la sede electrónica de la AEAT» ou «VERI\*FACTU» **só** para sistemas que remetem os registos | art. 6.5.b |
| Sistemas que remetem: presunção de conformidade e **dispensa de assinatura electrónica** (só hash) | art. 16.2, 16.3 |
| Sistemas que não remetem: **assinatura electrónica exigida** | art. 12 |

**O que o texto NÃO fixa:** o algoritmo de hash concreto, o conteúdo exacto do
QR, e as consequências detalhadas do incumprimento para lá das infracções gerais.

## O que isto significa para o produto, e o que NÃO significa

**A obrigação ainda não começou.** À data de hoje — 2026-09-05 — faltam cerca de
quatro meses para a primeira data (grandes empresas) e dez para a segunda. O
piloto, o La Societat, cai na segunda: **2027-07-01**.

Isto **não** quer dizer que se pode adiar. Quer dizer uma coisa mais útil: há
tempo para fazer bem, e **não há desculpa para declarar pronto o que não está**.

> # ⚠ PENDÊNCIA EXTERNA — BLOQUEANTE ANTES DE UM RESTAURANTE A SÉRIO
>
> **Os requisitos concretos do regime têm de ser confirmados na fonte por quem
> tenha acesso e responsabilidade, antes de isto tocar num restaurante real.**
>
> O que este ADR regista é uma **leitura de duas páginas oficiais numa data**, e
> não uma homologação. O que está construído são as propriedades que valem em
> qualquer jurisdição — não o formato do regime espanhol, que continua por
> confirmar.
>
> Uma etapa fiscal entregue com a pendência declarada é honesta. Entregue com
> requisitos inventados seria um problema legal com a nossa assinatura.

**O que NÃO foi verificado, e fica declarado:**

- **A Orden HAC/1177/2024 não foi lida.** É ela que traz as especificações
  técnicas — o formato do registo, o conteúdo do QR, o algoritmo. Sem isso, o que
  este produto pode fazer é a **forma** (fila de emissão, estados, encadeamento,
  imutabilidade) e não o **formato**.
- **Nenhum fornecedor homologado foi contratado nem consultado.** Não há
  credenciais, não há endereço de sandbox, não há contrato efectivo.
- **A entidade do piloto não foi classificada.** Se o La Societat é ou não
  «gran empresa» para efeitos do art. 3.1.a não foi confirmado com quem tem os
  dados — e não é coisa que se adivinhe.
- **Nada aqui certifica conformidade.** Este ADR regista uma leitura, não uma
  homologação.

## A regra que o produto segue enquanto isto estiver assim

**A emissão real fica bloqueada**, e o ecrã di-lo. O que o produto emite é um
**recibo informativo**, e diz por palavras que não é documento fiscal — a mesma
frase que o E23 já pôs no comprovativo do cliente.

«Um PDF bonito não é um documento fiscal, e chamar-lhe isso é um problema legal,
não um atalho de produto.»

## Como se revalida isto

Este ADR tem data e tem endereços. **Quem o ler daqui a três meses tem de voltar
às duas fontes**, não a este ficheiro — e se a lei mudou, o que muda é o produto,
não a citação. Um ADR fiscal sem data seria a mesma armadilha que a régua
recusou.
