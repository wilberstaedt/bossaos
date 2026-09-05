# E21 · Primeiro achado: 30 funções de etapas assinadas que o produto não alcança

> Varredura de 05/09. 389 funções exportadas de `packages/db/src` e
> `packages/domain/src`, contra 469 ficheiros de produto — provas, inspecções e
> `node_modules` fora. Fronteira de palavra, porque `apresentar(` contém
> `sentar(` e o meu primeiro varrimento contava isso como chamada.

## Porque é que esta varredura existe

Foi assim que o E19 foi retido: suite inteiramente verde, 35 controlos negativos
a acender, e o `enfileirar` com **zero chamadas** — o histórico de mensagens
estava sempre vazio, e nenhuma prova o disse porque todas alcançavam a função
directamente. **Verde não é alcance.**

E foi assim que apanhei uma falha minha uma hora depois de assinar o E20: tinha
verificado o alcance de **cinco** funções quando havia **oito**. Amostragem
disfarçada de verificação.

## O resultado, triado pela etapa que introduziu cada função

| Etapa | Sem chamador |
| --- | --- |
| E01, E04–E10, E12, E16 | 24 |
| E18 | 4 (`listarReservas`, `sentar`, `sobrepoe`, `varrerRetencoesExpiradas`) |
| E19 | 3 (`desistir`, `sentarQuemEsperava`, `sugestoesParaMesa`) |
| E20 | 3 (`agendadosPorEntrar`, `marcarParaEntrega`, `receberPedidoExterno`) |
| **Total de etapas ASSINADAS** | **30** |
| Sem data pelo meu método | 23 |

**Das 23 sem data, 12 estão explicadas:** são o E22 que o JR escreve agora —
`contas.ts` está por commitar (`??`), e por isso o `git log -S` não as encontra.
Não são achado. **As outras 11 não as datei, e digo-o assim** — `repositorios.ts`
(7), `chaves.ts` (3), `escopo.ts` (1). Não medi ≠ limpo.

## O que ainda NÃO fiz, e é o que dá valor a isto

**Não classifiquei as 30.** Sem chamador não é sinónimo de defeito, e apresentar
as 30 como defeitos tornaria o relatório inútil ao segundo dia. Há pelo menos
três casos diferentes lá dentro, e só a leitura de cada uma os separa:

1. **Capacidade prometida que não existe** — a classe do `enfileirar` no E19. É
   defeito, e é o que interessa encontrar. Candidato forte:
   `receberPedidoExterno`, sem porta para um pedido externo chegar.
2. **API de biblioteca deliberadamente não usada** — as do `qr.ts`
   (`descodificar`, `sindromes`, `penalidadePorMascara`) cheiram a isto: nós
   **geramos** códigos QR; quem os lê é a câmara do telemóvel. Se for esse o
   caso, não há nada a consertar e há uma linha a escrever.
3. **Higiene por ligar** — `varrerRetencoesExpiradas`. Não retém capacidade (o
   E18 prova que ela se liberta pelo relógio), mas a lista cresce para sempre.

**A próxima passagem do E21 é ler as 30 e pôr cada uma num destes três.** É o
trabalho que não se pode automatizar: a varredura diz *onde olhar*, não *o que
concluir*.

## A regra que já mudou por causa disto

**A verificação de alcance é exaustiva por etapa, não amostrada.** Escolher a
olho reproduz o viés que a varredura existe para eliminar — eu olho para as
funções de que me lembro, e as esquecidas são justamente as que ninguém chama.
