# Alvo da revisão do E05

> **Declaração de honestidade, primeiro.** Nas três etapas anteriores escrevi a régua antes
> de existir uma linha de código. Aqui **não é verdade**, e dizê-lo é o que a mantém útil:
> durante as duas horas em que estive indisponível o JR fez **quatro commits de E05**
> (`f1568fe`, `3bf1319`, `d0ef2a8`, `adde253`).
>
> **O que vi:** a mensagem do commit `adde253` — a ordem das três verificações, os 402
> contra 403, e contar antes de criar.
> **O que não vi, e não vou ver antes de acabar isto:** uma única linha do código deles.
>
> Deriva do prompt do E05, do CT-02, do CT-13 e de
> `docs/architecture/planos-e-limites.md`, que escrevi no E00 — dias de trabalho antes de a
> etapa existir. Essa parte da régua continua intacta.

## O que já sei que é o coração desta etapa

**Quota por configurar significa negado, não ilimitado.** O reflexo de quem escreve é
`if (limite == null) return SEM_LIMITE`, e o CT-02 manda o contrário. Para isso ser sequer
representável, **"não configurado" tem de ser diferente de "configurado a zero"** no modelo
de dados — um `null` lido como `0` bloqueia um cliente que pagou, lido como infinito
oferece o produto inteiro.

**O teste é o par**, e é o mesmo padrão que já usámos no isolamento e na autorização:

1. quota **ausente** → criar a segunda unidade é **recusado**;
2. quota **concedida a 3** → é **aceite**.

Se os dois passam, a verificação não está lá. Se só o primeiro for testado, passa um
sistema que recusa tudo.

## As três verificações, e que elas não se confundam

Plano (comprou?) · autorização (pode?) · flag (existe?). **Independentes, e no servidor.**

O aceite 1 pede *"negação coerente"*: os "nãos" têm de ser distinguíveis. Um 403 a quem paga
manda-o pedir permissões a si próprio; um 402 a quem não tem o papel manda-o comprar o que
já tem. **Vou testar as três combinações**, não uma.

## O que verifico

| Verifico | Como | Falha silenciosa que procuro |
| --- | --- | --- |
| Quota ausente × concedida | o **par**, por HTTP | só o lado da recusa testado |
| Tema Starter | `PUT` directo à API, não pelo ecrã | ecrã a esconder a fazer de guarda |
| **E não altera dados** | ler depois da recusa | recusa que já escreveu |
| Entitlement expirado | rota **e** job | verificado só na rota |
| Flag desligada | idem | |
| Módulo superior | pedido directo | |
| Downgrade | dados e tema anterior preservados | apagar em vez de bloquear |
| Preview de downgrade | bate com o aplicado **na data de teste** | preview calculado por outra via |
| Números inventados | leitura | uma mensalidade, um limite ou um período que ninguém decidiu |

O aceite 1 tem duas metades e a segunda esquece-se: *"retorna negação coerente **e não
altera dados**"*. Uma recusa que já escreveu antes de recusar é pior do que uma aceitação.

## Os IDs

ONB-004; ORG-010, 013, 014; PLAT-002, 003, 004, 006, 010, 011; STATE-006; THEME-001.
**Doze**, contados por colunas e não por diff — como no E04, onde o ficheiro mudou nas 397
linhas por causa do fim de linha e escondia as 12 reais. Com o `.gitattributes` isso não
volta a acontecer, o que também é uma coisa a confirmar.

## O que não aceito

- **Um número comercial inventado.** O CT-02 e o `planos-e-limites.md` são explícitos: sem
  configuração, só a primeira unidade de piloto. Um `MAX_PRODUTOS = 500` "porque parecia
  razoável" é defeito, não conveniência.
- **Cobrança simulada.** Provisionamento de piloto é auditado; cobrança é E32.
- **O ecrã como prova de bloqueio.** A prova é a API a recusar.

## Passo 8, e desta vez com um alvo concreto

Depois de escrever a revisão, procurar nos meus documentos e guardas o mesmo defeito que
encontrar nos dele. E há um por saldar: escrevi `scripts/validar-ordem.sh` e **nunca o vi
correr na CI** — não o liguei lá porque estava vermelho por uma razão legítima. Agora que a
ordem está reposta, tem de entrar ou ser apagado. Uma guarda que existe e não corre é a
terceira coisa pior deste projecto, a seguir a uma que corre e não mede.
