# Capacidade e reservas

> E00, escrito antes da etapa que as implementa. Traduz o CT-10 em decisões testáveis.
> Verificado contra `docs/bossaos/CONTRATO_TECNICO.md`, secção CT-10.

## O que falha aqui não aparece num relatório

Aparece à porta: duas famílias, uma mesa, sábado às 21h. Ninguém abre um painel para
descobrir que houve sobreposição — descobre-se com as pessoas em pé no corredor. E o
restaurante não culpa a regra de negócio, culpa o software, uma vez e para sempre.

Por isso o padrão de teste desta área é o oposto do habitual: **o caso que interessa é o
que deve ser recusado**, não o que deve passar.

## O intervalo é semiaberto, e é aí que parte em silêncio

`[início, fim)`. Uma reserva que acaba às 21h00 e outra que começa às 21h00 **não se
sobrepõem**. Uma que acaba às 21h01 e outra que começa às 21h00 **sobrepõem-se**.

É um caractere de diferença entre `<` e `<=` e é a origem clássica da mesa vendida duas
vezes — ou, na direcção contrária, do turno das 21h que o sistema recusa a noite inteira
sem ninguém perceber porquê. **Os dois lados do limite são teste**, e um teste que só
verifica o caso sobreposto deixa passar metade do defeito.

O buffer entra antes desta conta, não depois: com buffer de 15 minutos, o fim efectivo é
o fim mais 15. Aplicá-lo depois da verificação é o mesmo que não o ter.

## A combinação de mesas ocupa as componentes

Juntar a 3 e a 4 para oito pessoas não cria uma mesa nova com capacidade própria: ocupa a
3 **e** a 4. Se a combinação e as componentes forem contadas em separado, a mesma
capacidade é vendida duas vezes — e a soma até bate certo, o que é o pior tipo de erro.

**Teste**: reservar a combinação 3+4 e a seguir tentar reservar só a 3, no mesmo intervalo.
Tem de ser recusado.

## Consultar não é reservar

A consulta de disponibilidade é **informativa** e pode estar desactualizada no instante em
que é lida. A confirmação **verifica tudo outra vez**, dentro da transação.

O caso que decide o desenho: dois hosts, dois dispositivos, a mesma mesa livre nos dois
ecrãs, ambos confirmam. Alterações de capacidade por unidade **serializam** com um lock
estável — escolha simples para o piloto, por medida antes de optimizar. Com isolamento
`serializable`, os abortos têm retry limitado e chave idempotente, senão o retry é a
segunda reserva.

**Controlo negativo obrigatório**: desligar o lock e ver o teste de concorrência ficar
vermelho. Um teste que passa com e sem o lock está a testar que a base de dados responde.

## Reagendar não pode deixar ninguém sem nada

Se o reagendamento disputar e falhar, **a reserva anterior mantém-se** e sugerem-se
horários alternativos. Não se cria uma reserva extra para acomodar o conflito, e não se
larga a antiga antes de a nova estar garantida. Um cliente que pediu para mudar de hora e
ficou sem mesa nenhuma é pior do que um cliente que não conseguiu mudar.

## Espera e retenção

A lista de espera **não reserva nada** por existir. Uma oferta de vaga com retenção
consome capacidade enquanto dura e tem expiração explícita.

O que se esquece: **a expiração precisa de relógio, não de evento**. Se a capacidade só é
libertada quando alguém abre o ecrã, uma retenção esquecida bloqueia uma mesa a noite
inteira. A libertação é derivada do tempo na leitura, ou varrida por um processo — nunca
dependente de uma visita à página.

Chegar não é estar sentado. Libertar uma reserva atrasada é **política e acção do host**,
nunca uma limpeza automática silenciosa.

## Tempo

Instantes em UTC; regras recorrentes em fuso IANA. Três casos que não são exóticos:

1. **Hora que não existe** (adianto de verão): 02h30 numa noite em que o relógio salta das
   02h00 para as 03h00.
2. **Hora ambígua** (atraso): 02h30 acontece duas vezes.
3. **Serviço depois da meia-noite**: o turno de sexta acaba no sábado, e o relatório de
   sexta tem de o incluir.

O cliente pode estar noutro fuso que o restaurante. O que conta para capacidade e relatório
é o **carimbo do servidor**, e a hora local é apresentação.

## Mensagem é resultado separado

Uma reserva confirmada com email por enviar **continua confirmada**. Falha de envio não
desfaz a reserva, e sucesso de envio não a confirma. São dois resultados, e a UI diz os
dois — que é a mesma regra do indeterminado no dinheiro.

Tokens de gestão: limitados, revogáveis, **não enumeráveis**. Um token sequencial deixa
ver a reserva do vizinho.

**Depósito de reserva fica desligado** até existir política comercial, pagamento e
tratamento de cancelamento. Não é uma funcionalidade em falta: é uma decisão.

## O que se testa

| Caso | Esperado |
| --- | --- |
| Fim 21h00 · início 21h00 | **aceite** — semiaberto |
| Fim 21h01 · início 21h00 | recusado |
| Buffer 15 min a encostar | recusado |
| Combinação 3+4, depois só a 3 | recusado |
| Dois hosts confirmam ao mesmo tempo | uma aceite, uma recusada — nunca duas |
| Reagendamento disputado | a **anterior** sobrevive |
| Retenção expirada, sem ninguém a abrir o ecrã | capacidade livre |
| 02h30 em noite de mudança de hora | resolvido, não rebentado |
| Email falha | reserva confirmada, envio marcado como falhado |

## A identidade de uma mensagem é o ACONTECIMENTO que a causou

A régua do E19 exige reenvio deduplicado com o par: a mesma mensagem não sai
duas vezes, e uma mensagem **diferente** para a mesma reserva sai. Falta a peça
que torna isso construível — **o que faz duas mensagens serem a mesma.**

As duas respostas fáceis estão as duas erradas:

- **`(reserva, tipo)`** engole envios legítimos. «A sua mesa está pronta» pode
  ter de sair **duas vezes na mesma noite**: a pessoa não veio à primeira, o host
  volta a chamar meia hora depois. Com esta chave, a segunda chamada desaparece
  em silêncio, e a mesa fica vazia com gente à porta.
- **`(reserva, tipo, momento)`** não deduplica nada. Duas tentativas de entrega
  com um segundo de diferença são dois momentos, logo duas mensagens.

**A chave é o acontecimento.** Cada facto que justifica avisar alguém — a
reserva foi confirmada, a mesa ficou pronta, o host chamou outra vez, a casa
cancelou — nasce com identidade própria no momento em que acontece. A mensagem
não tem identidade: **herda a do acontecimento**.

Daí sai tudo o resto sem mais regras:

- **Reentregar** depois de o provedor falhar usa o mesmo acontecimento, logo
  deduplica. É a mesma tentativa, não uma nova.
- **O host chamar segunda vez** é um acontecimento novo, com identidade nova,
  logo entrega. É o par que a régua exige, e sai de graça.
- **Um tipo diferente** para a mesma reserva vem de outro acontecimento, logo
  entrega.

### O que isto obriga

O resultado do provedor guarda-se **contra o acontecimento**, não contra a
reserva. Uma falha de SMS é um facto sobre aquela tentativa; não é um facto
sobre a reserva, e não a pode alterar. O E18 já garante isto do lado da reserva:
a reserva existe independentemente de a mensagem ter chegado. Aqui garante-se o
inverso — **o histórico da mensagem sobrevive à reserva mudar de estado**, senão
ninguém consegue responder à única pergunta que interessa quando um cliente
reclama: *avisámos, ou não avisámos?*
