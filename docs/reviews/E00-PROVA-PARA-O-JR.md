# E00 — a prova, para o JR assinar (ou recusar)

> Escrito pelo sénior a 04/09. **Não é uma validação**, é o material para outra
> pessoa a fazer. O E00 é trabalho meu; assiná-lo seria exactamente o que a
> divisão existe para impedir.

## O que o E00 prometia, e como se testa

Sete — depois dezassete — documentos de arquitectura escritos **antes** de haver
código, em `docs/architecture/`. A condição de validação está escrita no
`ETAPAS.md` desde o princípio: *«validação real vem do E11, quando se vir se o
E02-E10 se construíram a partir dele.»*

É um bom teste porque não é uma opinião sobre os documentos: **é o que lhes
aconteceu enquanto treze etapas foram construídas em cima deles.** Um documento
que teve de ser reescrito estava errado. Um assunto que teve de nascer depois
estava em falta.

## A medição

Contada da história do repositório, não da minha memória:

| | |
| --- | --- |
| Documentos escritos no E00 (03/09) | **17** |
| Desses, intactos ao fim de 13 etapas | **15** |
| Desses, que precisaram de emenda | **2** — `catalogo-e-publicacao`, `offline-e-fila-local` |
| Assuntos que tiveram de nascer **depois** | **3** |

Os três que faltavam, e quando se tornaram visíveis:

- **`dominios-e-enderecos`** (04/09) — só apareceu quando uma etapa precisou de
  decidir endereços a sério.
- **`identidade-dentro-do-inquilino`** (04/09) — nasceu do ORG-007, o defeito que
  apareceu **três vezes** antes de alguém escrever a regra.
- **`preco-de-um-pedido-escrito-offline`** (04/09) — a pergunta de dinheiro do
  E14, que o `offline-e-fila-local` levantava sem responder.

## O que eu diria, e porque não conta

Diria que 15 em 17 intactos ao longo de treze etapas é um resultado bom, e que
os três em falta têm um padrão: **os documentos do E00 acertaram no que já se
sabia perguntar, e falharam no que só a construção mostrou.** Os três buracos não
são de descuido — são de sequência. Nenhum deles era respondível a 03/09 sem
inventar.

**Mas isto é o autor a avaliar-se.** Se o julgamento é meu, o E00 fica por
validar de facto, e passa a haver uma etapa assinada por quem a escreveu — que é
a única coisa que este projecto decidiu nunca fazer.

## O que te peço

Olha para os dois emendados e para os três em falta e decide **tu**: são o custo
normal de escrever antes de construir, ou são o E00 a ter prometido mais do que
entregou? Se for a segunda, o E00 fica *reprovado* e diz-se o que faltava — não
custa nada agora e evita que alguém, daqui a dez etapas, cite um documento a
pensar que ele foi verificado.

O `ETAPAS.md` é teu para editar hoje; eu não lhe toco enquanto estiveres no E14.

## Mais prova, recolhida a 04/09 ao preparar as etapas seguintes

Fui verificar se o E18 e o E19 precisavam de contrato novo, como o E16 e o E17
precisaram. **Não precisam** — e o que lá está acerta no ponto difícil:

- **E18, capacidade concorrente.** O documento já manda serializar com lock,
  isolamento `serializable`, retry limitado com chave idempotente. E escreve o
  controlo negativo obrigatório: *«desligar o lock e ver o teste de concorrência
  ficar vermelho. Um teste que passa com e sem o lock está a testar que a base de
  dados responde.»*
- **E19, lista de espera.** *«A lista de espera não reserva nada por existir»*, e
  a parte que se esquece: **«a expiração precisa de relógio, não de evento»** —
  senão uma retenção que expira às 3 da manhã fica presa até alguém abrir um
  ecrã. Está na tabela de casos, com o resultado esperado.

Dois documentos escritos antes de existir código a decidir correctamente etapas
que ainda não começaram, três e duas etapas à frente.

**Continua a não me competir avaliá-lo.** Junto a prova; a decisão é tua, e
reprovar continua a ser resposta válida — os três assuntos que tiveram de nascer
depois não desaparecem porque estes dois acertaram.

## Prova nova de 05/09 — e uma parte dela é CONTRA o E00

Passaram-se o E19 e metade do E20 desde que escrevi isto. Junto o que aconteceu,
dos dois lados, porque um dossiê que só junta o que confirma não serve para
assinar nada.

### A favor: contratos escritos antes foram lidos e cumpridos

- **`lista-de-espera.md`**, escrito enquanto construías o E19. A decisão central
  era não guardar coluna `posicao` — derivar, e derivar dentro do grupo que cabe
  nas mesmas mesas. Cumpriste-a, e a tua prova chama-se «a ordem de chegada não
  é a de sentar».
- **`capacidade-e-reservas.md`**, a identidade da mensagem ser a do
  acontecimento. Apareceu no código como `acontecimento()`, e o controlo
  negativo «caiu a identidade: a segunda chamada foi engolida pela primeira»
  mede exactamente o par que o contrato exigia.
- **`pedidos-para-mais-tarde.md`**, o momento de produção derivado da entrega
  menos o preparo, por relógio. Não só o cumpriste como o puseste **num gatilho
  da base** — mais forte do que o contrato pedia.

### Contra: o defeito mais caro da noite passou por baixo de 25 contratos

O fuso. A hora escolhida por uma pessoa nascia com um `Z` colado, em **todo o
produto**, desde antes do E19. Nenhum dos 25 documentos de arquitectura dizia
«uma hora escolhida por uma pessoa passa pelo fuso da unidade» — eu só o escrevi
**depois** de o encontrar, e marquei-o com a data para não fingir previdência.

Pior: o E18 construiu e provou o `resolverHoraLocal`, com a hora de Verão
resolvida correctamente, e **nada o chamava**. Eu assinei essa etapa.

**O que isto diz sobre a promessa do E00**, e é a pergunta que te faço: contrato
escrito antes reduz defeitos — as três linhas de cima são prova disso — mas
**não os elimina, e falha justamente onde ninguém pensou em escrever contrato
nenhum.** A ausência de um contrato não faz barulho. Um contrato errado
discute-se; um contrato inexistente não tem quem o defenda.

Se achares que isto reprova o E00, reprova. Prefiro o E00 recusado com esta
prova à frente do que aceite sem ela.

## Prova de 05/09 · tarde — o E23, e é a mais forte que tenho

O E23 é a **primeira etapa desde o E20 medida contra uma régua escrita antes de
existir código** — e a diferença é observável, não é impressão minha:

**Os teus controlos negativos batem um a um com os meus aceites**, sem eu ter
tido de os interpretar nem de os traduzir. «Caiu a identidade: o reenvio normal
do adquirente entrou duas vezes» é o aceite 1. «Caiu a ordenação: a chegada
passou a decidir o estado do dinheiro» é o aceite 2. Não houve negociação sobre
o que a régua queria dizer, porque ela existia antes de haver código para
defender.

**E acrescentaste três que eu não pedi**, todos da forma mais forte — impedir em
vez de proibir. O melhor: um controlo que garante que **não existe campo** na
interface para colar um segredo de adquirente. Sem campo, não há chave num
registo. Isso não veio de um contrato meu: veio de teres percebido a ideia por
trás dos contratos e a teres aplicado onde eu não tinha pensado.

**Contra o E00, para equilibrar:** a régua do E22 — a etapa do **dinheiro**, a de
maior risco — **não existia** quando começaste. Escrevi-a a meio, e admiti-o. O
padrão que o E00 promete só funciona quando alguém o executa, e nessa etapa fui
eu quem falhou a executá-lo.

**A pergunta continua a ser tua:** o E00 promete que contrato e régua escritos
antes reduzem defeitos. As duas coisas acima são a prova a favor e a prova
contra, na mesma sessão. Decide com as duas à frente.

---

## O dossiê tinha um erro, e foste tu a encontrá-lo

Apresentei-te como prova mais forte contra o E00 que **«o fuso passou por baixo
de 25 contratos e nenhum falava do assunto»**.

**Estava mal medido.** Foste verificar e encontraste a secção `Tempo` do
`capacidade-e-reservas.md`, anterior ao defeito, a nomear os três casos difíceis
um a um — e a dizer «o que conta é o carimbo do servidor, e a hora local é
apresentação», que é exactamente a regra que o produto violou durante quatro
dias. **Confirmei-o antes de aceitar, e está lá.**

Isto importa por duas razões.

**A primeira:** eu dei-te uma prova errada para julgares o E00. Se a tivesses
aceitado sem verificar, o veredicto assentava num facto falso — e teria sido
mais severo com o E00 do que os factos justificam, ou menos, mas em qualquer
caso mal fundado. **Verificaste a prova de quem te pediu o julgamento**, que é
precisamente o que se espera de quem julga.

**A segunda:** a conclusão verdadeira é pior para o E00 do que a minha, não
melhor. A minha dizia que faltava um contrato — coisa que se resolve escrevendo
um. A tua diz que **o contrato existia, estava certo, e não impediu nada** —
porque lhe faltava a regra de decisão na fronteira, e não o princípio.

Corrigi o registo em `E19-ACHADO-FUSO.md`, com a minha versão errada mantida por
cima e corrigida em vez de apagada.
