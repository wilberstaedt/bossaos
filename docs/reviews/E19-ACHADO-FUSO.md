# E19 — achado medido durante a construção: o fuso da unidade não entra

> Escrito a 05/09 enquanto o JR ainda constrói a etapa. **Não é veredicto** — a
> etapa não foi declarada. É um achado medido, guardado para não se perder, e
> para ele o poder corrigir antes de mais telas assentarem em cima.

## O que medi, linha a linha

1. `reserva-publica.ts:66` — `horariosPublicos` constrói cada hora com
   `Date.UTC(ano, mes, dia, h, m, 0)`. O comentário imediatamente acima diz
   **«das 12h às 23h locais da unidade»**. O código trata `h` como hora UTC.
2. `horarios/page.tsx:49` — a tela mostra `h.quando.toISOString().slice(11,16)`,
   ou seja **lê a hora UTC e apresenta-a como se fosse a hora da casa**.
3. `api/publico/reservar/route.ts` — a submissão reconstrói o instante com
   ``new Date(`${dia}T${hora}:00Z`)``. O `Z` fixa UTC outra vez.
4. `reserva-publica.ts:108` — `reservarDaRua` passa `inicio` **tal e qual**.
   Não há reconversão em lado nenhum do caminho.
5. `schema.prisma:226` — a unidade **tem** `fuso` (IANA), e a linha 3077 diz,
   sobre o turno de reserva: **«Hora LOCAL, e o fuso é o da unidade.»**
   Nada neste caminho lê esse campo.

Dentro do E19 isto é **coerente**: o cliente vê 20:00, marca 20:00, e o registo
diz 20:00Z. Nenhuma tela se contradiz. É por isso que passa despercebido.

## Onde parte, e é aqui que deixa de ser estilo

`reservas.ts:390` compara os dois mundos:

```
const agora = agoraDado ?? await agoraDaBase(db);
const cedoOuTarde = antecedencia(agora, pedido.inicio, ...);
```

`agoraDaBase` é o **relógio verdadeiro**. `pedido.inicio` é hora de parede com
um `Z` colado. Somar-lhes significado é comparar duas coisas diferentes.

**O caso concreto, com a antecedência mínima de 60 minutos que está por omissão:**
são 19h30 em Castellón (17h30Z). Alguém marca «20:00». O produto grava 20:00Z e
calcula que faltam **duas horas e meia** — logo aceita. Faltam **trinta
minutos**. A regra que existe para a cozinha não ser apanhada em cima da hora é
derrotada por exactamente o desvio do fuso: duas horas no Verão, uma no Inverno.

E não é só a antecedência: tudo o que compare uma reserva com o relógio real
herda o desvio — o atraso, a tolerância, o no-show. O `provas/fuso.test.ts`
existe **por causa de um defeito desta mesma família**: um convite expirado era
aceite porque o Prisma lia a renderização local e rotulava-a de UTC.

## O que isto NÃO é

**Não invalida a assinatura do E18.** As provas do motor passam instantes
explícitos, e o grupo 8 resolve a hora de Verão para `Europe/Madrid`
correctamente. O defeito está na **entrada** de horas de parede pela porta
pública, que é código novo da fatia 2, posterior à assinatura.

Também **não é** um buraco de segurança nem perda de dados. É um erro de
significado, que produz valores plausíveis — que é o que o torna caro.

## O que ainda não medi

- Se as telas do host mostram a mesma convenção (provavelmente sim, mas não vi).
- Se a resolução de hora de Verão do E18 chega a ser aplicada a reservas
  criadas por esta porta.

## O que peço, quando ele declarar

Que o instante nasça do **fuso da unidade**, e não de um `Z` colado: a hora de
parede escolhida pelo cliente convertida com `unidade.fuso` no momento de a
transformar em instante. E o par que impede o remendo de passar: uma prova com a
unidade em `Europe/Madrid` e outra num fuso diferente, a mostrar que **o mesmo
"20:00" produz instantes diferentes**. Se produzir o mesmo, o fuso continua a
não entrar.

---

# Correcção ao que escrevi acima — medido a seguir, 05/09

Escrevi que **«a porta pública ignora o fuso»**. É verdade, e é estreito de mais.
Fui medir o resto do produto e a convenção é **de toda a casa**:

```
packages/db/src/host.ts:72                    r.inicio.getUTCHours()
.../reservations/mover/page.tsx:52            r.inicio.toISOString().slice(11,16)
.../reservations/walk-in/page.tsx:55          proxima.inicio.toISOString()…
.../reserve/horarios/page.tsx:49              h.quando.toISOString().slice(11,16)
```

Hora de parede guardada como UTC e lida de volta pelas partes UTC. **Não é um
descuido da fatia nova: é uma convenção implícita que atravessa o produto** — e
que ninguém escreveu em lado nenhum, porque se tivesse sido escrita teria sido
discutida.

## A parte que é minha

**Eu assinei etapas em cima desta convenção sem dar por ela.** O E13 e o E15
tocaram nestas telas de host; o E18 passou por aqui. As minhas réguas exigiram
população, controlo negativo, telas em navegador — e nenhuma perguntou *«que
horas são estas?»*. O defeito não é dele; é uma coisa que eu deixei passar
várias vezes seguidas e que só vi hoje porque a porta nova me pôs a linha
`new Date(...Z)` à frente dos olhos.

## Verificação ao vivo — não é leitura de código

Contra o relógio verdadeiro da base de revisão:

```
agora (SELECT now()) ............ 2026-09-05T01:29:06.337Z
desvio de Europe/Madrid ......... 120 min
"20:00" como o produto o grava .. 2026-09-05T20:00:00.000Z
"20:00" em Madrid, a sério ...... 2026-09-05T18:00:00.000Z
antecedência QUE O PRODUTO CALCULA .... 1111 min
antecedência REAL ..................... 991 min
diferença ............................. 120 min
```

**Duas horas exactas**, que é o desvio do fuso. No Inverno serão sessenta
minutos. A antecedência mínima de 60 min que protege a cozinha é atravessável
durante toda a janela do desvio, o ano inteiro.

## O que isto muda no pedido

Já não é «corrige a porta». É uma **decisão de representação** que tem de ser
escrita antes de mais nada assentar em cima: ou os instantes passam a nascer do
`unidade.fuso` (e então as telas deixam de ler partes UTC), ou a convenção
hora-de-parede fica **escrita e defendida por prova**, e nesse caso `agoraDaBase`
não pode ser comparado directamente com `inicio` em sítio nenhum.

As duas são defensáveis. **A que não é defensável é a de agora**, que tem metade
do produto numa e a comparação com o relógio na outra.

---

# A peça que fecha o achado — e a falha é da minha assinatura

Fui verificar a segunda coisa que tinha deixado por medir: se a resolução de
hora de Verão do E18 chega a ser aplicada. **Não chega.**

```
$ grep -rn "resolverHoraLocal" packages/ apps/ | grep -v test
packages/db/src/reservas.ts:810:export async function resolverHoraLocal(
packages/db/src/index.ts:255:  resolverHoraLocal, agoraDaBase, segredoDeGestao,
```

Uma definição e uma reexportação. **Zero chamadas.** A função existe, está certa,
vai buscar a resposta à tabela de fusos da base por `instante_local(fuso, local)`,
distingue `NORMAL` de `INEXISTENTE` e de `AMBIGUA`, e tem o comentário exacto
sobre porque é que o estado importa — *«resolver 02h30 em silêncio para 03h30 é
resolver, mas quem marcou tem de saber que a casa entendeu outra hora»*.

E a porta pública, a três ficheiros de distância, faz ``new Date(`${dia}T${hora}:00Z`)``.

**Caminho morto** — uma das quatro formas de verde vazio: a máquina certa,
construída e provada, que nada invoca.

## Isto é uma falha da MINHA assinatura do E18

Eu assinei o E18 há poucas horas e escrevi, na tabela dos aceites:

> **A hora de Verão.** Grupo 8, e é onde ele foi além do pedido (…) ele escreveu
> sozinho o discriminador.

Tudo verdade, e **insuficiente**. Verifiquei que a função estava certa e que a
prova sabia ficar vermelha. Nunca verifiquei que alguém a chamava.

Depois do E15 escrevi esta regra para mim, precisamente para isto:

> Para cada aceite, apontar a **linha de produto** que o exercita **e** a
> asserção que fica vermelha se ela desaparecer.

**Não a apliquei ao aceite da hora de Verão.** Se eu a tivesse aplicado, tinha
procurado a linha de produto, não a tinha encontrado, e o E18 tinha sido retido
por isto em vez de assinado. A regra estava escrita; falhei a executá-la.

## O que isto melhora no pedido

A boa notícia é que o pedido fica **mais pequeno**, não maior. Já não é
«construir tratamento de fusos»: é **chamar o que já existe e já está provado**.

A porta pública recebe `dia` e `hora` como hora local da casa — que é o que o
cliente escolheu — e passa por `resolverHoraLocal(db, unidade.fuso, ...)` antes
de haver instante nenhum. O `estado` que ela devolve deixa de ser desperdiçado:
`INEXISTENTE` e `AMBIGUA` são exactamente os dois casos que a tela tem de dizer
à pessoa em vez de escolher em silêncio.

E a prova que impede o remendo: **a mesma "20:00" em duas unidades com fusos
diferentes tem de produzir instantes diferentes.** Se produzir o mesmo, o fuso
continua a não entrar, por muito que a função apareça no meio do caminho.

---

# O achado tem agora um detector — e ele apanhou-me primeiro

`scripts/demonstrar-defeito-do-fuso.sh`. Falha hoje, passa quando o conserto
entrar. Fica **fora da suite** de propósito: um vermelho permanente lá dentro
envenenava todas as medições seguintes.

```
    hora local escolhida ........... 2026-09-05 20:00:00
    resolverHoraLocal Europe/Madrid  2026-09-05T18:00:00.000Z  (NORMAL)
    resolverHoraLocal UTC .......... 2026-09-05T20:00:00.000Z  (NORMAL)
    o que a porta publica grava .... 2026-09-05T20:00:00.000Z

    [controlo] o resolvedor varia com o fuso? sim
    FALHA  a porta publica ignora o fuso
```

O controlo por dentro é o que impede o detector de ser cego: se
`resolverHoraLocal` devolvesse o mesmo para `Europe/Madrid` e para `UTC`, o
teste não estaria a medir fuso nenhum e diria `CEGO` em vez de `FALHA`.

## Da primeira vez, o meu detector acendeu pelo motivo errado

Corri-o antes de migrar a base de revisão. A função `instante_local` não existia
lá, o Node rebentou, saiu com código 1 — e o meu `case` leu esse 1 como se fosse
o defeito. **Anunciou FALHA por uma razão que não tinha nada que ver com o
produto.**

É exactamente a armadilha que passei a noite a apontar aos outros, cometida por
mim, no instrumento que escrevi para a apontar.

O conserto foi obrigar a um **veredicto explícito** na saída (`PASSA`, `FALHA`
ou `CEGO`) e tratar a ausência dele como **NÃO MEDI**, com o código 3 e uma
mensagem que diz que não é prova de defeito nem de ausência dele. Há três
respostas, não duas, e a terceira é a mais frequente.

---

# A consequência que fecha o círculo: o aviso da sala chega tarde de mais

Fui rever a fatia 3 e o `FLOOR-006` está bem feito — ele até citou o raciocínio
que eu tinha posto na régua, e a condição é a certa:

```tsx
{!mesa.sessao && aChegar.get(mesa.id) ? … }   // mesa livre COM reserva a chegar
```

`host.ts:94` calcula a janela assim:

```ts
const agora = await agoraDaBase(db);                        // instante VERDADEIRO
const ate   = new Date(agora.getTime() + dentroDeMinutos * 60_000);   // 120 min
…  reserva: { …, inicio: { gte: agora, lt: ate } }
```

**A aritmética, em Castellão no Verão (+2h), para uma reserva das 20:00:**

| Hora real na casa | `agora` (UTC) | Janela | `inicio` gravado | Aparece na sala? |
| --- | --- | --- | --- | --- |
| 19:00 | 17:00Z | 17:00–19:00Z | 20:00Z | **não** |
| 19:59 | 17:59Z | 17:59–19:59Z | 20:00Z | **não** |
| 20:00 (chegam) | 18:00Z | 18:00–20:00Z | 20:00Z | entra agora |
| 21:30 | 19:30Z | 19:30–21:30Z | 20:00Z | ainda diz «a chegar» |

O aviso **aparece no instante em que os clientes chegam** — quando já não serve
para nada — e continua a dizer «a chegar» durante as duas horas seguintes, com a
mesa já ocupada por eles ou já perdida.

## Porque é que isto importa mais do que o resto

Eu acrescentei o `FLOOR-006` à régua com esta frase:

> uma reserva confirmada para as 20h tem de aparecer na sala **antes** das 20h,
> senão o host vê a mesa livre e senta lá um walk-in

**É exactamente o que acontece hoje.** O mecanismo que pus na régua para impedir
o defeito é anulado pelo defeito do fuso: às 19:00 a mesa aparece livre e sem
aviso nenhum, que é o momento em que o host a dá a outra pessoa.

Nem o código do host está errado, nem a régua estava errada. **A representação
por baixo é que está**, e por isso a fatia parece correcta em revisão de código e
falha em serviço. É a mesma família do resto da noite: a coisa que se lê certa e
mede errado.

Isto sobe a prioridade do conserto acima de qualquer tela nova.
