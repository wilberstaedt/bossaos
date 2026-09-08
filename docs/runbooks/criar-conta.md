# Criar uma conta no servidor

> Enquanto a política for **«por agora só eu crio contas»**. No dia em que houver
> outra, esta ferramenta sai — ela torna a política executável, não a substitui.

O registo público está fechado (`disableSignUp: true`), e o convite dá **pertença
a uma conta que já existe**, não cria conta. Esta é a porta que falta, e é de
servidor.

## Como se usa

Com a senha vinda de fora, por `stdin`:

```bash
echo -n 'a-senha-escolhida' | node --experimental-strip-types \
  packages/auth/ferramentas/criar-conta.mjs alguem@casa.pt
```

Ou com uma senha gerada, impressa **uma vez**:

```bash
node --experimental-strip-types \
  packages/auth/ferramentas/criar-conta.mjs alguem@casa.pt --gerar
```

Precisa de `AUTH_DATABASE_URL` e `BETTER_AUTH_SECRET` no ambiente. **O segredo
tem de ser o da aplicação** — com outro, a conta nasce e não entra, e isso só se
descobre quando a pessoa tenta.

## O que ela recusa, e porquê

| recusa | razão |
|---|---|
| senha em **argumento** | fica no histórico da shell e visível no `ps` a quem estiver na máquina |
| email **já existente** | duas contas com o mesmo email é um problema de identidade, não uma conveniência |
| `BETTER_AUTH_SECRET` em falta | um valor por omissão criava uma conta que não entra, em silêncio |
| `AUTH_DATABASE_URL` em falta | sem ela não se sabe em que base se estaria a escrever |
| senha com menos de 12 caracteres | — |

**Ela verifica o próprio trabalho:** depois de criar, entra com a senha dada. Se
não entrar, diz que não entrou em vez de dizer que criou — criar linhas não é ter
conta.

## O que ela NÃO faz

**Não dá pertença a organização nenhuma.** A conta nasce sem casa; a pertença
entra pelo convite, que é a porta do produto. E **não é alcançável por HTTP** —
vive em `packages/auth/ferramentas/`, fora do `apps/web/app/`, e o
`provar-criar-conta.sh` afirma-o contra o **manifesto de rotas do build**, não
contra a minha palavra: 0 das 477 rotas a nomeiam.

## A prova

`scripts/provar-criar-conta.sh`, e nenhuma conta real é criada — o endereço é
`.invalid` (RFC 2606) e a base conta-se antes e depois.
