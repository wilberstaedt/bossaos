# Como o sénior revê uma etapa

> Escrito depois do E01 e antes do E02, para a régua ser a mesma nas 34 etapas que faltam
> e para o JR saber a fasquia antes de entregar, não depois. Deriva de CT-15.

## A regra que está acima de todas

**Não aceito nenhuma afirmação do handoff sem a repetir.** O relatório diz o que o autor
acredita ter feito; a revisão existe para descobrir a diferença. Se eu ler "16 testes
passam" e escrever "validado", não revi nada — reencaminhei.

No E01 isso valeu: corri os quatro comandos outra vez e a primeira tentativa devolveu-me
**código de saída vazio**, porque o `| tail` o come. É a armadilha que na véspera me fez
commitar por cima de um teste falhado noutro projecto.

## Os sete passos, por esta ordem

**1. Ler o handoff inteiro antes de correr nada.** Anotar as afirmações verificáveis. Uma
afirmação sem forma de ser desmentida não é uma afirmação, é uma opinião — e essas
anotam-se à parte.

**2. Correr os comandos SEPARADOS, com o código de saída lido sem cano.**
`pnpm lint; echo $?` e não `pnpm lint | tail`. Quatro números, não um resumo.

**3. Contar o que correu.** Uma suite com zero testes sai 0 tal como uma com mil. Ler a
contagem real na saída, e comparar com o que o handoff afirma. Pacotes com zero testes têm
de estar **declarados** no handoff — se estiverem, é honestidade; se não, é omissão.

**4. Fazer eu próprio um controlo negativo.** Não basta ler que existe: partir alguma coisa
de propósito e ver o detector acender. No E01 plantei um ficheiro com `any` e variável não
usada. Se o detector não consegue produzir a avaria, o verde dele não prova nada.

**5. Correr as provas executáveis da etapa** com as minhas mãos, no meu ambiente.

**6. Procurar o verde vazio.** As perguntas, sempre as mesmas:
   - Este teste passaria se a funcionalidade não existisse?
   - Esta lista está vazia porque não há nada, ou porque a consulta falhou?
   - Este `200` prova que a coisa certa foi devolvida, ou só que a rota respondeu?
   - Este controlo negativo compara produção, ou dois literais escritos no próprio teste?

**7. Escrever a revisão** em `docs/reviews/E##.md`: o que verifiquei e **como**, onde
discordo sem bloquear, e as pendências que aceito como declaradas.

## O que bloqueia e o que não

**Bloqueia:** afirmação do handoff que não se confirma; dependência externa simulada com
ar de pronta; teste que não consegue reprovar; regra monetária, de capacidade ou de
isolamento sem prova; segredo em código ou em log.

**Não bloqueia, mas fica escrito:** cobertura fina que falta, dívida nomeada com data,
discordância de desenho onde a escolha do autor é defensável. Escrever a discordância e
deixar passar é diferente de a engolir — a primeira deixa rasto para o marco.

## O que eu não posso fazer

**Não valido o que escrevi.** O E00 é meu e fica em "aguardando validação" até ao E11,
quando se vir se o E02-E10 se construíram a partir daqueles documentos. Um contrato que o
próprio autor declara bom não foi verificado, foi assinado.

Pela mesma razão o alvo de uma etapa escreve-se **antes** dela — como
`prova-de-isolamento.md` para o E03. Quem vai ser medido não escolhe a régua.

## O que reconheço como bom, e digo

Uma revisão que só aponta defeito ensina metade. No E01 registei três coisas para serem
repetidas: o controlo negativo **dentro** do script de prova; a distinção `/health` vs
`/ready`; e o autor escrever que chegou à causa **depois de duas explicações erradas**,
corrigindo os comentários em vez de os apagar.

Essa última é a mais rara e a que mais quero ver outra vez. Uma causa provável escrita como
causa provada é uma armadilha para quem ler a seguir.
