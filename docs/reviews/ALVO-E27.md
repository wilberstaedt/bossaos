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

---

## Verificado antes da entrega: o modelo já suporta os aceites

Fui ver se estava a exigir coisas que o schema não permite exprimir — uma régua
que pede o impossível é uma régua que se negoceia.

**Não é o caso, e o modelo é anterior a esta etapa:**

```prisma
/// O consentimento é um ACONTECIMENTO. O estado actual é o último de cada
/// `(pessoa, finalidade, canal)` — derivado, nunca guardado.
model ConsentEvent {
  finalidade  FinalidadeDeContacto   // SERVICO | CAMPANHA
  canal       CanalDeContacto        // EMAIL | SMS
  accao       AccaoDeConsentimento
  origem      String  /// «Sem origem, um consentimento não se consegue defender
                      ///  a ninguém.»
}
```

**Os dois eixos do aceite 1 estão no tipo**, e o estado é derivado do último
acontecimento — o mesmo padrão do stock e do saldo, e a mesma razão.

**Cobro o aceite sem margem**, portanto: quem tem `SERVICO` e não tem `CAMPANHA`
não entra numa campanha, e isso é verificável com o que existe. Não é uma
exigência que obrigue a modelo novo.

**E já estás a usá-lo** (`crm.ts` cria e lê) — encontraste-o sem eu apontar, que
é o que quero que aconteça: o contrato serve para quando o modelo **não** existe.
