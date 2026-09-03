# Alvo da revisão do E04

> **Escrito antes de ver a entrega.** O `docs/progress/E04.md` não existe no momento em que
> gravo isto — o JR está a 19 minutos, com 26 ficheiros em movimento. Passo 0 do
> `COMO-REVISO.md`. Deriva do prompt do E04, do CT-04, do CT-14 e de
> `docs/architecture/autenticacao-e-convites.md`, escrito por mim antes de lhe entregar a
> etapa.

## Suspeita pré-registada

No terminal dele li, a meio: *"Agora a terceira: a revogação faz parar as sessões que já
existem. **E há aqui uma decisão que decide se isso funciona ou não**"*.

Sei qual é a decisão, e é a certa para se hesitar: **a sessão é verificada contra o
servidor a cada pedido, ou é um token assinado em que se confia até expirar?**

Se for a segunda, o critério de aceite 2 — *"utilizador revogado perde acesso sem precisar
limpar a página"* — **não é alcançável**, por muito bem escrito que esteja o resto. Um
token válido continua válido; a revogação só se nota quando ele expira. É um dos poucos
sítios onde a arquitectura decide o comportamento e nenhum teste de unidade o denuncia,
porque o teste normalmente cria a sessão depois de revogar.

**O que vou fazer, e não é ler o código:** criar sessão, revogar, e fazer **o pedido
seguinte com a sessão antiga**. Sem recarregar, sem esperar, sem novo início de sessão. E
se passar, olho para a implementação para perceber se passou pela razão certa ou porque o
teste voltou a autenticar sem dar por isso.

## O par, que é o coração desta etapa

Para cada recurso privado testado:

1. Id de B com sessão de A → **ausência** (não "sem permissão" — ausência).
2. **O mesmo** id com sessão de B → **200**.

Só (1) passa num sistema em que tudo devolve vazio. A prova é a **diferença**. Se a suite
tiver só metade, é achado, não observação.

## Os doze IDs, e só doze

AUTH-001, AUTH-003 a AUTH-009, ONB-009, ORG-007, ORG-008, STATE-014.

Conto-os no `git diff` do `coverage.csv`. **Um décimo terceiro é tão defeito como um em
falta** — e SET-010/011 estão listadas como "a evoluir/rever", o que não é o mesmo que
entregar: se mudarem de estado, quero a justificação escrita.

## O que verifico, e como

| Verifico | Como | Falha silenciosa que procuro |
| --- | --- | --- |
| Revogação imediata | pedido seguinte com a sessão antiga | teste que reautentica sem dar por isso |
| Convite: papel | aceitar com `role` no corpo | o corpo a ganhar ao convite |
| Convite: escopo | um `manager` a convidar um `owner` | escalada por quem convida |
| Convite: uso único | aceitar duas vezes | segunda pertença, ou prolongamento |
| Convite: expirado / adulterado | os dois | assinatura que não cobre o escopo |
| **Último owner** | tentar removê-lo | organização órfã, irrecuperável |
| Host × financeiro | pedido directo à API, não pelo ecrã | botão escondido a fazer de autorização |
| Cozinha × estação | idem | |
| Troca de contexto | operar em B com o que se podia em A | permissões herdadas |
| Criptografia própria | leitura | senha ou recuperação feitas à mão em vez da biblioteca do ADR |
| Auditoria | ler um registo real | segredo copiado para dentro do rasto |

## O que já sei que não aceito

- **Um 403 onde devia ser ausência.** É o oráculo de existência, e está escrito no contrato
  antes desta etapa começar.
- **"O ecrã não mostra a opção"** como prova de autorização. A prova é a API a recusar.
- **MFA "disponível"** sem uma exigência demonstrada nalgum papel ou acção sensível.
- Uma pendência de suporte assistido que na prática seja acesso global implícito à equipa
  da plataforma.

## Aplicar-me a régua (passo 8)

Depois de escrever a revisão: procurar nos **meus** documentos e scripts o mesmo defeito
que tiver encontrado nos dele. Nas duas últimas revisões isto rendeu um defeito meu de cada
vez — e nenhuma das duas vezes eu andava à procura.

---

## Adenda, 15h12 — orientação, **não** veredicto

Marcada como adenda de propósito: a régua acima foi escrita antes de ver a entrega, e isto
foi acrescentado depois de ler código. Emendar a régua em silêncio seria mudar a baliza.

Fui responder à suspeita pré-registada **por leitura**, e a resposta é favorável ao JR:
`packages/auth/src/autenticacao.ts` configura a sessão **sem `cookieCache`**, com o
comentário a dizer que *"não é activada, e isso é uma decisão e não um esquecimento"* — e
há um `packages/auth/src/revogacao.ts` dedicado a explicar a tentação de a activar. A
sessão é resolvida por `getSession` contra o servidor, portanto a arquitectura **permite**
revogação imediata.

**Isto não fecha nada.** Eu escrevi acima que não decidiria isto a ler código, e mantenho:
uma configuração correcta não prova que o caminho de revogação está ligado ao pedido. O
veredicto continua a ser a sonda — criar sessão, revogar, fazer **o pedido seguinte** com a
sessão antiga — e o que muda com esta leitura é só que já sei onde olhar se ela falhar.
