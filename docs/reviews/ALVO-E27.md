# Régua do E27 — CRM, fidelidade e campanhas

> Escrita a 05/09, **antes de existir código**. 14 telas.

## Porque é que esta etapa é a mais fácil de fazer mal sem dar por isso

Nas anteriores, um defeito estragava um número. **Aqui um defeito manda uma
mensagem a uma pessoa que não a pediu** — e isso não se desfaz, não se corrige
com uma migração, e em Espanha tem coima.

E tem a armadilha de todos os produtos de restauração, já nomeada no contrato:

> «**Dados para prestar serviço não dão permissão de campanha.** O telefone que
> alguém deixou para confirmar uma reserva não é uma lista de marketing, e
> transformá-lo nisso é o defeito mais comum de todos os produtos de
> restauração.» — `dados-e-accoes-sensiveis.md`

## 1. O consentimento é POR FINALIDADE e POR CANAL, e não um sim global

Aceitar ser avisado de que a mesa está pronta **não** é aceitar promoções.
Aceitar email **não** é aceitar SMS.

**Exijo o registo com origem e momento**, e o par que separa isto de teatro:
**uma pessoa com consentimento de serviço e sem consentimento de campanha
NÃO ENTRA numa campanha.** Se entrar, a etapa reprova, por muito verde que
esteja o resto.

## 2. A retirada vale ANTES do próximo envio

O contrato já o diz e é o aceite: *«não a partir da próxima campanha, não depois
da fila esvaziar: antes do próximo envio.»*

**Exijo a prova com a retirada a meio de uma campanha em curso** — a que já
começou a enviar. É o caso real, e é o único que distingue uma retirada
implementada de uma retirada declarada.

## 3. Quem entra numa campanha decide-se por REGRA, não por lista colada

Uma lista exportada e reimportada perde a origem do consentimento. **A audiência
é uma consulta sobre quem consentiu**, avaliada no momento do envio.

**Reprovo à cabeça** um caminho que aceite uma lista de contactos sem
consentimento verificável, venha de onde vier.

## 4. Fidelidade é dinheiro, e obedece ao contrato do dinheiro

Pontos que valem desconto são valor. **Unidades mínimas inteiras**, sem vírgula
flutuante, e a `validar-dinheiro.sh` não leva excepção.

**E o saldo de pontos deriva-se dos movimentos**, como o stock no E25 — não é
uma coluna que alguém incrementa. Exijo o gatilho e o controlo que o larga.

## O que reprovo à cabeça

- **Alcance pelo INTERVALO da etapa**, corrido por ti antes de declarares.
- **Telas sem porta**, e **móvel medido afirmado na evidência** — a
  `validar-movel.sh` apanhou-me hoje a assinar 89 telas sem o dizer; não passo
  isso para a frente.
- **Verde sobre zero contactos.** Declara-se a população.
- **Uma prova que só use quem consentiu tudo.** Sem o caso de quem consentiu
  serviço e recusou campanha, não está provado — está demonstrado.
