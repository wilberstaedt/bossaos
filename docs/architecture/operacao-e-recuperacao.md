# Operação e recuperação

> E00. Escrito **antes de existir uma base com dados de um cliente lá dentro**, que é a
> única altura em que este documento é barato.
>
> Cobre a linha "Operação" do CT-15 e a regra do CT-04 (*"logs técnicos minimizam dados de
> clientes e não contêm segredos"*). O resto desta página **não está no pacote** — é uma
> lacuna que preencho com uma razão concreta, abaixo.

## Por que existe este documento

A 2026-09-02 fiz a auditoria final de outro produto meu, o Norte. O achado número um não
foi um bug: **não existia cópia de segurança nenhuma da base de produção.** Nenhuma. O
produto estava vivo, com dados reais, e um disco perdido apagava tudo. Ninguém tinha
decidido não fazer cópias — simplesmente nunca chegou a ser tarefa de ninguém, porque
funcionava.

O BossaOS vai ter a faturação de restaurantes. Escrevo isto agora para não repetir a mesma
noite daqui a três meses.

## Cópias de segurança

**Uma cópia que nunca foi restaurada não é uma cópia.** É um ficheiro sobre o qual se tem
uma opinião. A prova é restaurar para uma base descartável e **comparar contagens com a
viva** — organizações, unidades, pedidos, pagamentos, movimentos de caixa. Sem essa
comparação, um dump truncado a meio parece perfeitamente saudável.

Três propriedades, e a terceira é a que costuma faltar:

1. **Frequência que corresponde ao que se aceita perder.** Diária significa aceitar perder
   um dia de vendas. Para pagamentos e caixa, um dia é muito.
2. **Fora da máquina que guarda os dados.** Cópia no mesmo disco ou no mesmo VPS partilha o
   modo de falha com o original, e por isso não é redundância — é uma segunda gaveta no
   mesmo armário a arder.
3. **Restauro exercitado, com data.** Não "temos backup": *"restaurámos a 12 de Outubro,
   demorou 6 minutos, bateu certo"*.

O tempo de restauro é um número que se mede, não se estima. Num sábado à noite a diferença
entre 6 minutos e 3 horas é o serviço inteiro.

## Logs

**Nunca um segredo.** No Norte, o `WORKER_SECRET` saía em texto limpo nos logs da API
**36 vezes**, e os logs não rodavam — ou seja, o segredo ficava em disco para sempre e o
disco enchia. Duas falhas independentes na mesma linha de código.

- Dados de cliente ao mínimo: um identificador chega, o nome e o email não.
- **Rotação e retenção definidas**, senão o disco decide por nós, no pior dia.
- **Correlação obrigatória**: `command_id` e identificador de pedido atravessam a API, o
  trabalho assíncrono e a integração externa. Sem isso, "o pagamento falhou às 21h14" não
  se consegue seguir até à causa.
- Um erro engolido em silêncio é pior do que uma exceção. A fila de avisos do Norte
  **desistia em silêncio ao fim de meia hora** e a métrica escondia-o.

## Migrações

A credencial de execução **não faz DDL** — está provado desde o E01, com controlo negativo.

Mudanças em duas fases: primeiro aditivo (coluna nova, nullable, escrita dupla), depois a
remoção, **num deploy separado**. Uma migração que apaga uma coluna que o código antigo
ainda lê parte a aplicação durante o intervalo em que as duas versões coexistem — e esse
intervalo existe sempre.

Toda a migração tem de ser reversível ou ter um caminho de recuo escrito **antes** de
correr. "É só aditivo, não há risco" é uma frase que já custou uma noite a alguém.

## Integração externa: estado honesto

Impressora, terminal de pagamento, emissor fiscal, envio de email.

**Heartbeat não comprova recebimento.** Um dispositivo "ativo" que não imprimiu o pedido
continua ativo, e a cozinha não sabe. O estado que a interface mostra é o do **último
resultado real**, não o da última vez que a ligação respondeu.

Degradado é um estado, e diz-se. Uma integração em baixo que se apresenta como saudável é
pior do que não ter integração nenhuma: a equipa deixa de vigiar o que acha que está a
funcionar.

## Dados de pessoas

O piloto é em Espanha, logo RGPD, e as reservas trazem nome, telefone e email de clientes
finais que **não são utilizadores do produto**.

O que tem de existir por desenho, e não por pedido futuro: retenção com prazo, apagamento
que chega às cópias e aos logs, e exportação. **Nada disto se acrescenta depois sem dor** —
apagar uma pessoa de um sistema que nunca previu apagar ninguém é arqueologia.

Isto é engenharia, não parecer jurídico. A política é decisão do Matheus; o que fica aqui
é a forma que o código tem de ter para a conseguir cumprir.

## O que se prova, e quando

| Prova | Quando | Falha se |
| --- | --- | --- |
| Restauro comparado com a viva | antes do primeiro cliente real | contagens diferem |
| Nenhum segredo nos logs | contínuo, na CI | uma varredura encontra o padrão |
| Rotação a funcionar | uma vez, medida | o ficheiro cresce sem limite |
| Recuo de migração | por migração | não existe caminho escrito |
| Integração degradada aparece degradada | por integração | mostra saudável com o serviço em baixo |

**Controlo negativo da varredura de segredos**: plantar um segredo falso num log e vê-la
ficar vermelha. Uma varredura que nunca encontrou nada pode estar a olhar para o sítio
errado — foi assim que o `WORKER_SECRET` viveu 36 linhas sem ninguém dar por ele.
