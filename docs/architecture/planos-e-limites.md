# Planos, quotas e limites

> E00. Traduz o CT-02 em decisões testáveis. Escrito antes do E33 (planos) porque o E03
> está a construir a `Organization` **agora**, e é nela que a assinatura assenta.

## Três verificações independentes, e nenhuma é a interface

O contrato di-lo em uma linha e vale a pena não a comprimir:

| Verificação | Responde a | Exemplo de "não" |
| --- | --- | --- |
| **Plano** | esta organização comprou esta capacidade? | Starter a pedir KDS |
| **Autorização** | esta pessoa pode fazer isto? | Waiter a pedir relatório financeiro |
| **Flag** | isto está construído e libertado? | módulo fiscal ainda em E24 |

São **independentes** e correm **no servidor**. Um botão escondido não é nenhuma das três:
é decoração por cima de uma rota que continua a responder a quem lhe chamar directamente.
O ecrã esconde para não frustrar; o servidor recusa para proteger. Quem confunde os dois
descobre-o quando alguém abre as ferramentas do browser.

## A regra que se implementa ao contrário por instinto

> *"Se ela não estiver configurada, **não liberar expansão comercial por ausência de
> limite**."* — CT-02

O reflexo de quem escreve o código é `if (limite == null) return SEM_LIMITE`. É o
contrário. **Quota por configurar significa negado**, não ilimitado.

E há uma distinção que tem de existir no modelo de dados, senão esta regra não é
representável: **"não configurado" não é o mesmo que "configurado a zero"**. Um `null` que
o código lê como `0` ou como `∞` são dois erros opostos, e ambos aparecem em produção — um
bloqueia um cliente que pagou, o outro oferece o produto inteiro.

**Teste, e é o par que interessa:** com a quota ausente, criar uma segunda unidade é
recusado; com a quota concedida a 3, é aceite. Se os dois casos passam, a verificação não
está lá.

## Números não se inventam no código

Utilizadores, produtos, unidades, pedidos, armazenamento e preço são **configuração
comercial**. O código traz a **estrutura** — a quota, a leitura, a recusa, a mensagem — e
os valores entram na configuração, decididos pelo Matheus.

Isto não é desculpa para adiar: a estrutura constrói-se toda agora, com a quota a apontar
para configuração vazia. O que não se faz é escrever `MAX_PRODUTOS = 500` porque parecia
razoável, e descobrir daqui a um ano que o número está em três sítios e nenhum é o certo.

## Descer de plano

Preservar dados. Bloquear operações novas. Reverter o tema público ao padrão. Avisar com
data. E não efectivar enquanto houver sessões, caixas ou operações incompatíveis abertas —
apresenta-se a pendência à gestão em vez de fechar à força o que está a meio.

Período de tolerância por incumprimento é **política configurável**, não uma data
escolhida por quem escreve o código.

## A regra que protege o dinheiro, e que se esquece sempre

> *"Perder o direito de criar vendas não pode apagar obrigações nem impedir resolver um
> pagamento pendente."*

Recebimentos, webhooks e reembolsos de transações **que já existem** continuam a ser
processados para conciliação, mesmo depois de o módulo ser removido do plano.

O erro que isto previne é concreto e é grave: o restaurante desce de plano, o módulo de
pagamentos desliga, e um pagamento em estado **indeterminado** fica sem forma de ser
reconciliado. O dinheiro existe no adquirente e deixa de existir no sistema. É a mesma
família do que está em [dinheiro](./dinheiro.md): indeterminado não é falhado, e nada que
desligue um módulo pode transformar um no outro.

**Teste**: remover o módulo de pagamentos de uma organização com um pagamento por
reconciliar, e confirmar que o webhook desse pagamento **continua a ser aceite** e que o
reembolso continua possível. Criar uma venda nova, essa sim, recusada.

## O que não se presume

- Um add-on no Starter **não** liberta os módulos operacionais todos.
- Kiosk precisa de pedidos, e se cobrar, precisa de pagamentos.
- MFA existe em **todos** os planos, e a auditoria básica é sempre gerada — segurança não
  é uma capacidade que se compra num escalão acima.
- A estrutura suporta várias unidades em todos os planos; o que separa não é a arquitectura,
  é a quota concedida. Sem quota, mantém-se o piloto de uma unidade.

## Os casos

| Caso | Esperado |
| --- | --- |
| Quota de unidades por configurar | **recusado** |
| Quota concedida a 3, a criar a 2.ª | aceite |
| Starter a chamar a rota do KDS directamente | recusado **no servidor** |
| Waiter com plano Pro a pedir o financeiro | recusado por autorização, não por plano |
| Capacidade paga mas flag desligada | recusado, e a mensagem diz que ainda não existe |
| Descida com caixa aberta | não efectiva; pendência à gestão |
| Webhook de pagamento antigo após remover o módulo | **aceite** |
| Venda nova após remover o módulo | recusada |

**Controlo negativo**: desligar a verificação de plano e ver os casos de recusa ficarem
verdes. Se continuarem verdes com ela ligada e desligada, o que está a recusar é outra
coisa — provavelmente a autorização, e nesse dia o teste do plano nunca existiu.
