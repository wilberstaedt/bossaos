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
