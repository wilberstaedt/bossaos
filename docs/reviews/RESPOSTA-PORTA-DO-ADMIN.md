# O plugin `admin`, medido — e deu uma terceira coisa

> Pedido: medir se o `admin.createUser` cria com a bandeira ligada, para saber se
> o caminho público substitui o privado sem custo.
> **Não substitui, e o motivo não é o que qualquer um de nós esperava.**

Guião: `packages/auth/medicoes/porta-do-admin.mjs`. Instância **de medição** — o
plugin é montado a partir das opções do produto e o
`packages/auth/src/autenticacao.ts` **não foi tocado**.

    funcoes do plugin visiveis: setRole createUser adminUpdateUser listUsers listUserSessions
    utilizadores antes: 131
    1 ordem (corpo invalido)      recusou INVALID_EMAIL                linhas=0
    2 bandeira ligada             recusou  Unknown argument `role`     linhas=0
    3 controlo bandeira desligada recusou  Unknown argument `role`     linhas=0
    utilizadores depois: 131

## O que isto responde, e o que não responde

**Não cria — e não é a bandeira que o impede.** As duas corridas, ligada e
desligada, dão **o mesmo erro do Prisma**. O controlo de dois lados não
distinguiu nada porque não havia nada para distinguir: falha antes de chegar à
decisão.

**E prova uma coisa ao contrário, que é a que interessa.** Com a bandeira
**ligada**, a chamada chegou à **escrita na base**. Se o `disableSignUp` fosse
consultado neste caminho, teria recusado antes disso. **Logo o caminho do admin
não consulta a bandeira** — o que o revisor suspeitava por ausência de `grep`
está agora medido, e medido por onde a execução chegou, não por onde o símbolo
aparece.

**O que fica por medir e digo que fica:** se a conta nasceria *utilizável*.
Nunca houve linha, portanto não houve `signInEmail` para correr nem `issuer` para
comparar. A sonda de ordem (corpo inválido → `INVALID_EMAIL`) também mostra que a
validação corre antes de tudo neste caminho.

## A terceira coisa

**O que falta não é permissão nem sessão de administrador. São COLUNAS.** O
volume do Prisma mostra o que o plugin tenta escrever — `role: "user"`,
`banned: false` — e o esquema não as tem:

| tabela | colunas que o plugin exige |
|---|---|
| `users` | `role`, `banned`, `banReason`, `banExpires` |
| `sessions` | `impersonatedBy` |

Portanto **a opção «pública e com promessa de estabilidade» não é gratuita**: custa
uma migração. E a migração não acrescenta colunas neutras.

1. **`role` em `users` cria um segundo conceito de papel.** O produto já tem
   `Papel`, em `memberships` — e é por organização, que é a forma certa para um
   SaaS multi-inquilino. O `role` do plugin é **global por utilizador**. Ficariam
   dois papéis com o mesmo nome e âmbitos diferentes, e o E33 inteiro foi sobre
   quem pode o quê.
2. **`impersonatedBy` em `sessions` é uma segunda via de personificação.** O E33
   construiu a sessão de suporte com quatro condições — temporária, visível ao
   inquilino, com âmbito e com motivo — e um gatilho que guarda a pessoa. A do
   plugin não traz nenhuma delas.

## O que isto NÃO decide

Nada. **Não implementei nenhuma das duas** e não recomendo aqui.

O que mudou é a forma da escolha. Já não é «API privada contra API pública»:

- **API privada** (`internalAdapter`, já medida a funcionar de ponta a ponta):
  sem promessa de estabilidade, zero migrações, zero conceitos novos.
- **API pública** (`admin`): promessa de estabilidade, mas **uma migração que
  instala no produto um papel global e uma personificação paralelos aos que o E33
  desenhou de propósito**.

E continua a não responder à pergunta de produto que foi para o Matheus: **como é
que um cliente novo passa a ter conta.** As duas servem arnês e semente.
