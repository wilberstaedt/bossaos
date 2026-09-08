# A pergunta técnica do `97174d6`, respondida por medição

> «a API do servidor consegue criar a conta sem abrir rota HTTP e sem senha
> escrita à mão» — marcada como **não sei**, porque o símbolo só aparecia em
> plugins no `dist` e ler o núcleo seria adivinhar.

**Resposta: sim, existe. E a coisa que a faz funcionar não se adivinhava.**

Guião: `packages/auth/medicoes/porta-do-servidor.mjs`. Corre contra a base real,
conta antes, limpa, e conta depois.

    utilizadores antes: 131
    disableSignUp no produto: true
    disableSignUp no controlo: false
    produto (bandeira ligada)     RECUSOU EMAIL_PASSWORD_SIGN_UP_DISABLED  linhas=0
    controlo (bandeira desligada) CRIOU                                    linhas=1
    porta interna                 criou=SIM    ENTROU
    controlo da entrada           senha errada -> recusou INVALID_EMAIL_OR_PASSWORD
    utilizadores depois: 131

## As duas metades

**1 · A API pública respeita a bandeira.** O `auth.api.signUpEmail` recusa com
`EMAIL_PASSWORD_SIGN_UP_DISABLED`. **O controlo é o que torna isto legível:** a
MESMA configuração do produto, espalhada, com um só campo trocado, CRIA. Sem ele,
a recusa não distinguia «a API respeita a bandeira» de «eu invoquei mal».

E não há segunda função: das **41** do `auth.api`, só o `signUpEmail` cria
identidade.

**2 · O `$context` tem uma porta, e ela funciona.** O `internalAdapter` expõe
`createUser`, `createAccount`, `linkAccount`, `updatePassword`, e o `ctx.password`
traz o `hash` da própria biblioteca. A conta criada por aí **entra pela porta real
do produto** — o `signInEmail` aceita-a. E a entrada verifica mesmo: com a senha
errada recusa.

Isto satisfaz as duas condições da pergunta: **sem rota HTTP** e **sem senha
escrita à mão** — o hash é o da biblioteca, o que é exactamente o que o
`schema.prisma:465` exige («guardada pela biblioteca, com o algoritmo dela»).

## O detalhe que quase me fez responder ao contrário

A primeira corrida deu **`criou=SIM  NAO ENTROU INVALID_EMAIL_OR_PASSWORD`** — o
modo de falha que o revisor previu por escrito: *um utilizador que existe e não
entra.* Ia concluir «não há porta limpa».

Era **defeito meu**. Comparei as duas linhas na base — a que o `sign-up` real
escreve e a minha — e só uma coluna diferia:

| | `issuer` | `provider_id` | `account_id` | senha |
|---|---|---|---|---|
| `sign-up` real | **`local:credential`** | `credential` | id do utilizador | 161 chars |
| a minha | `credential` (o `@default` do schema) | `credential` | id do utilizador | 161 chars |

Com `issuer: 'local:credential'`, entra.

## O que isto custa, e não escondo

- O `internalAdapter` é **interface interna**. Não tem promessa de estabilidade
  entre versões do `better-auth`, e uma subida pode partir isto em silêncio.
- O `local:credential` é um **literal acoplado ao interior da biblioteca**. Hoje o
  guião fixa-o; se a biblioteca o mudar, a medição fica vermelha — o que é o
  comportamento certo, mas alguém tem de a correr.

## O que isto NÃO decide

**Qual das saídas se usa.** A decisão do `97174d6` foi «nenhuma das três», e esta
é uma quarta, encontrada depois. **Não a implementei**: a pergunta era para
decidir entre cura limpa e remendo, e a decisão é da revisão.

E não responde à pergunta de produto que foi para o Matheus — **como é que um
cliente novo passa a ter conta**. Uma porta de servidor serve arnês e semente;
não é uma resposta de produto para quem recebe um convite.
