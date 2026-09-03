# Domínios e endereços públicos

> Escrito a 04/09 para o **E10**, cujo aceite 3 diz: *«um domínio já vinculado ou
> sem comprovação de controle não pode ser tomado por outro tenant»*. Não havia
> contrato nenhum sobre isto — os acertos de "domínio" nos documentos anteriores
> são todos modelo de domínio, que é outra coisa.

## O problema é sempre o mesmo: um espaço de nomes global

O produto tem **dois** endereços públicos, e ambos vivem num espaço de nomes onde
só cabe um dono de cada nome:

| | Onde vive | Quem o atribui |
| --- | --- | --- |
| `Location.publicSlug` | `…/r/{slug}` no domínio da BossaOS | nós |
| Domínio próprio | `carta.orestaurante.com` | o **DNS**, que não é nosso |

A diferença que muda tudo: **o slug é nosso e o domínio não é.** No slug, a nossa
base é a verdade. No domínio, a verdade está num sistema de terceiros que pode
mudar sem nos avisar — e é por isso que a posse tem de ser **provada** e
**reverificada**, não declarada uma vez.

## Regra 1 — vincular exige prova de controlo, não afirmação

Escrever `carta.orestaurante.com` numa caixa de texto não prova nada: qualquer
inquilino pode escrever o domínio de qualquer outro. A prova é uma acção que só
quem controla o DNS consegue fazer — um registo `TXT` com um valor que **nós**
geramos, aleatório, ligado àquele inquilino e àquele domínio.

**Só depois de o ver é que o domínio serve conteúdo.** Antes disso existe como
pedido pendente, e um pedido pendente não responde a pedidos.

## Regra 2 — verificado uma vez não é verificado para sempre

Um domínio deixa de apontar para nós quando o cliente muda de fornecedor, deixa
expirar o registo ou reconfigura o DNS. O nosso registo diria «verificado» para
sempre, porque a verificação foi um instante e não um estado.

**Reverificar periodicamente**, e tratar a falha como **indeterminado** e não como
perdido: um DNS que não responde não é um domínio que mudou de dono. Perder a
posse é uma conclusão que exige ver **outro** dono, não deixar de ver o nosso.
(É a mesma regra do vault: *indeterminado não é reprovado*.)

## Regra 3 — o nome não volta ao mundo

Vale para as duas colunas da tabela, e é a regra que fecha o aceite 3:

**Um endereço que alguma vez esteve vinculado fica reservado a quem o teve.**
Desvincular tira-o do ar; não o oferece ao próximo. Libertar mesmo é acção
deliberada de administração da plataforma, com prazo à vista e registada.

O motivo é físico e não teórico: o QR vai **impresso** em mesas e montras, e o
domínio anda em cartões, ementas e anúncios pagos. Um nome que muda de dono em
silêncio redirecciona pessoas reais para o concorrente. O papel não se actualiza.

## Regra 4 — a unicidade da base não é a defesa que parece

`@unique` impede **dois ao mesmo tempo**. Não impede **dois em sequência**, e a
sequência é o caso real. São ataques diferentes: o primeiro falha ruidosamente na
base; o segundo passa por uma operação legítima e não deixa rasto de que houve
troca de dono.

Confundi-los é fácil, e a consequência de os confundir é achar que o problema já
está resolvido por um índice.

## Como se prova, com o controlo que dá sentido ao teste

1. **Vincular sem prova de DNS não serve conteúdo.** Controlo: com a prova posta,
   passa a servir — senão o teste passaria com uma implementação que recusasse tudo.
2. **B não pode reclamar um domínio que A largou.** Controlo: **A tem de conseguir
   retomá-lo** — senão o teste passaria com uma implementação que proibisse todos
   os nomes já usados, que é outra regra e está errada.
3. **DNS que não responde não perde a posse.** Controlo: DNS que responde a
   apontar para **outro** dono, esse sim, marca o estado como contestado.
4. **Dois inquilinos, sempre.** Um inquilino a reclamar um nome livre não prova
   nada sobre o segundo. A prova de posse exige o segundo em cena.

## O que fica dependente do mundo real, e é declarado

A propagação de DNS não é nossa e não se simula com verdade. O que se prova em
casa é a **máquina de estados** — pendente, verificado, indeterminado, contestado
— e a recusa de servir enquanto não estiver verificado. A propagação real é
**pendência declarada**, nunca um passo dado como concluído porque o código
compila.
