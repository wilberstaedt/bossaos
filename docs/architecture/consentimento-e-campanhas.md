# Consentimento e campanhas

> Contrato do E27, escrito a 05/09 **antes de existir código**.
> Régua: `docs/reviews/ALVO-E27.md`. Deriva de `dados-e-accoes-sensiveis.md`,
> que já manda o essencial e é anterior a tudo isto.

## Porque é que esta etapa é diferente de todas as anteriores

Até aqui, um defeito estragava um número: um saldo errado, uma conta por fechar,
um custo que não bate. **Aqui um defeito manda uma mensagem a uma pessoa que não
a pediu.** Não se desfaz com uma migração, não se corrige no dia seguinte, e em
Espanha tem coima.

Por isso, nesta etapa, as garantias vão para a **forma** sempre que puderem ir —
e a mais importante delas está na base, não no código.

---

## 1. Existir no CRM não é ter consentido

Uma pessoa pode estar no CRM porque veio jantar. Isso **não** é uma permissão.

**Não existe, em lado nenhum, uma coluna que diga «aceita campanhas».** Nem
booleana, nem tri-estado. A garantia é pela ausência: uma coluna que não existe
não pode ficar a `true` por omissão, por importação, ou por alguém ter marcado a
caixa errada num formulário de reserva.

O que existe é um **registo de acontecimentos**: quem, que finalidade, que canal,
que acção, de onde veio e quando. O estado actual **deriva-se** do último
acontecimento de cada `(pessoa, finalidade, canal)` — como o saldo de stock, o
estado da conta e o momento de produção. Nunca é uma coluna.

## 2. Por FINALIDADE e por CANAL — quatro respostas, não uma

Aceitar ser avisado de que a mesa está pronta **não** é aceitar promoções.
Aceitar email **não** é aceitar SMS.

- Finalidades: `SERVICO` (a mesa está pronta, a reserva foi confirmada) e
  `CAMPANHA` (tudo o que é marketing).
- Canais: `EMAIL` e `SMS`.

São **quatro** consentimentos independentes, e o produto nunca infere um do
outro. Um `SERVICO/SMS` dado à porta não produz `CAMPANHA/SMS` nem
`SERVICO/EMAIL`.

## 3. A finalidade de serviço ACABA — e a de campanha não caduca sozinha

`dados-e-accoes-sensiveis.md` já o diz e é a parte que estes produtos esquecem:
alguém deixa o telefone à porta para ser avisado; meia hora depois está sentado
ou foi jantar a outro lado, e **a finalidade acabou**. Ninguém decide guardar o
número: é o que acontece por omissão quando nada o apaga.

Por isso o consentimento de `SERVICO` nasce com `expira_em`. **Um consentimento
expirado não autoriza nada** — e quem verifica é a base, comparando com o relógio
dela, não a aplicação com o relógio do processo.

## 4. A retirada vale ANTES do próximo envio — e é a base que a faz valer

Não a partir da próxima campanha. Não depois de a fila esvaziar. **Antes do
próximo envio.**

A única maneira de isto ser verdade e não uma declaração é a verificação
acontecer **no instante de gravar cada envio**, e não no instante de construir a
audiência. Entre construir a audiência e enviar a milésima mensagem passam
minutos; uma retirada que chegue nesse intervalo tem de valer.

**A garantia é um gatilho:** `campanha_exige_consentimento()` recusa a inserção
de um envio de campanha para quem não tenha, **naquele instante**, consentimento
vivo de `CAMPANHA` naquele canal.

E a ordem é **gravar antes de despachar** — a mesma decisão da assinatura antes
do efeito no E23. Se a gravação for recusada, não há nada despachado. Um defeito
na aplicação não consegue enviar, porque não consegue registar.

## 5. A audiência é uma REGRA, avaliada no envio

Uma lista exportada e reimportada perde a origem do consentimento, e uma lista
colada não tem origem nenhuma.

O segmento guarda **critérios**, não pessoas. **Não existe tabela de membros de
segmento**, e não existe caminho de importação de contactos — outra vez a
garantia pela ausência. Quem entra na campanha decide-se por consulta, no momento
do envio, sobre quem consentiu.

## 6. Pontos são dinheiro, e o saldo deriva-se

Pontos que valem desconto são valor. **Inteiros**, sem vírgula flutuante, e o
valor em euros de uma recompensa é inteiro em unidade menor com o sufixo `Menor`
— `validar-dinheiro.sh` não leva excepção nesta etapa.

E o saldo de pontos **deriva-se dos movimentos**, com gatilho, exactamente como o
`saldo_mili` do stock no E25. Não há coluna que alguém incremente: um programa de
fidelidade cujo saldo se escreve à mão é um programa onde ninguém consegue
explicar de onde veio um ponto.

A quantidade do movimento é **sempre positiva** e o sinal vem do tipo — `GANHO`
e `AJUSTE` somam, `RESGATE` e `EXPIRACAO` tiram.

---

## O que fica de fora, e é dito

- **Não há envio real.** Não há provedor de email nem de SMS contratado nesta
  etapa: o envio grava-se e fica `POR_ENVIAR`. Isto é **pendência declarada**, e
  a parte que interessa provar — que não se grava um envio sem consentimento — é
  exactamente a que fica provada, porque a recusa acontece na gravação.
- **Não há dedução automática de duplicados.** A CRM-003 junta dois contactos
  quando alguém o decide; o produto não adivinha que duas pessoas são a mesma.
- **Não há importação de listas.** É uma decisão, não uma falta: um caminho de
  importação é o caminho por onde entra a lista sem origem.
