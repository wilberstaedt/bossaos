# Alvo: o registo por email está aberto e ninguém o quis

> Régua escrita antes da entrega, 07/09 23h40.

## O que está medido

`packages/auth/src/autenticacao.ts:63` liga `emailAndPassword: { enabled: true }`
e **não define `disableSignUp`**. No `better-auth` 1.7.2 isso regista
`POST /api/auth/sign-up/email` — **exista ou não uma página**.

Medido localmente sobre o build de produção, com controlos:

| pedido | resposta | o que prova |
|---|---|---|
| `POST /api/auth/rota-inventada-xyz` | **404** | o controlo: 404 = rota não registada |
| `POST /api/auth/sign-in/email` | **400** | rota que sabemos existir devolve validação |
| **`POST /api/auth/sign-up/email`** | **400** | *«[body.name] expected string… [body.email]… [body.password]…»* |

**A rota existe e valida um registo.** Não é dedução do código minificado: é a
resposta do próprio servidor.

E o `GET` **não servia** para perguntar isto — `sign-in/email` também dá 404 em
`GET`, porque o `better-auth` responde 404 a método errado. O primeiro
instrumento foi descartado por um controlo, não por intuição.

## O que NÃO está medido, e não vou medir

**O que uma conta criada assim consegue alcançar.** Sem `Membership` nem
`Organization`, é provável que caia num vazio — **mas eu não testei**, e não
crio contas para o descobrir. **A exposição está provada; a consequência não.**
Quem escrever a cura mede isto ou diz que não mediu.

## O alvo

1. `disableSignUp: true` no `emailAndPassword`. O produto é **por convite** —
   está escrito no próprio ficheiro, na linha sobre o convite provar o email.
   Isto faz o código **corresponder ao contrato que já declara**.
2. Uma prova que corra sempre: `sign-up/email` tem de passar a **404**, e
   `sign-in/email` tem de **continuar a 400**. As duas na mesma corrida, senão
   um 404 global passa por cura.
3. O convite **não pode partir**. É por lá que entra toda a gente.

## Como se prova

- **Controlo negativo obrigatório:** desligar a cura e mostrar que a prova
  falha. Uma guarda que nunca recusou não provou nada.
- **A prova mede a RESPOSTA do servidor**, nunca a configuração. Ler
  `disableSignUp: true` no ficheiro não prova que a rota deixou de existir —
  foi exactamente ler a interface que me fez afirmar o contrário hoje.
