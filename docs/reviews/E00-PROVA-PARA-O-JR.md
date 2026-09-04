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
