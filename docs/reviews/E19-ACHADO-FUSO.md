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
