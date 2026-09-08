# Fechar o registo tirou a única porta por onde nasce uma conta

> 08/09, encontrado a tentar recapturar as três da sala. **Muda uma decisão que
> não é minha, por isso está em ficheiro e não numa mensagem.**

## O que me travou

A recaptura reprovou na primeira coisa que faz:

    Error: a inscrição da conta de demonstração falhou: 400

O capturador entra pela porta do produto. A conta de demonstração é **apagada
pela limpeza a cada corrida** — o `limparDemonstracao` remove as duas contas, e
a segunda «arrasta sessões e credenciais do better-auth». Logo cada corrida tem
de a criar, e a criação passava pelo `sign-up/email`.

**Eu fechei essa porta em `fe64a4b`.** O sintoma é meu.

## E ao seguir o sintoma, o achado é maior do que ele

Quatro pedidos ao servidor de produção local, sem cookies, com o controlo
primeiro — porque a régua do registo diz que se mede a RESPOSTA e nunca a
configuração:

| pedido | resposta | o que prova |
|---|---|---|
| `POST /api/auth/rota-inventada-xyz` | **404** | o controlo: 404 = rota não registada |
| `POST /api/auth/sign-in/email` | **401** `INVALID_EMAIL_OR_PASSWORD` | a rota existe e verifica |
| `POST /api/auth/sign-up/email` | **400** `EMAIL_PASSWORD_SIGN_UP_DISABLED` | a cura está viva |
| `POST /api/convites/aceitar` | **401** `sem_sessao` | **aceitar um convite exige sessão** |

E no código, por varrimento: **nada em `packages/`, `apps/` ou `scripts/` insere
em `accounts`.** Os dois sítios que a nomeiam — `demonstracao-comum.ts` e
`inspeccao-comum.ts` — só apagam.

**A cadeia fecha-se sobre si própria:**

1. Uma conta nova só podia nascer no `sign-up/email`, que agora recusa.
2. O convite não a cria: dá **pertença** a uma conta que já existe, e a `FormaDeConvite`
   envia **só o token** — os campos de nome e senha estão lá e não são submetidos
   («o que se mostra não é o que se envia», diz o próprio ficheiro).
3. Não há terceira porta.

**Quem nunca teve conta não consegue usar o convite dele.** Os 131 utilizadores
desta base existem porque nasceram *antes* da cura; numa base limpa, ou noutra
máquina, o arnês de inspecção cai no mesmo 400 que a demonstração.

O item 3 da `ALVO-REGISTO-ABERTO.md` dizia **«o convite não pode partir — é por
lá que entra toda a gente.»** A rota do convite não partiu; o que partiu é o
degrau anterior a ela, e eu declarei-a intacta tendo medido só a rota.

## O que NÃO fiz, e porquê

Havia três saídas e nenhuma é minha para escolher a meio de uma recaptura:

1. **Reabrir o `sign-up`** — desfaz a cura de segurança que está no primeiro
   lugar da lista do Matheus. Não.
2. **Escrever a credencial por SQL** com o `hashPassword` do próprio
   `better-auth`. Tecnicamente serve, e **atravessa um contrato do E04**, escrito
   no `schema.prisma:465`: *«Guardada pela biblioteca, com o algoritmo dela.
   Nunca por nós.»*
3. **Deixar a conta de demonstração viva** em vez de a apagar. Muda o controlo 4
   do `provar-demonstracao.sh`, que conta linhas antes e depois para provar que a
   demonstração não deixa sujidade — e enfraquecer um controlo para desbloquear
   uma captura é o padrão que passámos a noite a apanhar.

## O estado da recaptura

**As três da sala continuam por refazer, e a guarda continua vermelha.** Não
inventei uma passagem: a `validar-capturas-de-marketing` reprova com as 24
anteriores à fonte, e assim fica até haver uma porta.

O resto do `provar-demonstracao.sh` correu e está verde: semeadura determinista
com controlo negativo, o KDS existe nos três idiomas, e a limpeza devolveu a base
ao que era (`2/3/3/0/0/131` antes e depois).
