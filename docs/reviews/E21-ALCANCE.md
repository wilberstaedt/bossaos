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

---

# Segunda passagem: as categorias, tiradas da leitura e não inventadas antes

Comecei a ler as 30 e as três categorias que eu tinha previsto eram **três de
quatro**. A que faltava só apareceu ao ler.

## 1. Instrumento de verificação — NÃO é defeito (5 classificadas)

`descodificar`, `sindromes`, `penalidadePorMascara`, `modulosDeDadosDaVersao`
(`qr.ts`) e `sobrepoe` (`domain/reservas.ts`).

Existem para **verificar** o produto, não para o servir. O cabeçalho do `qr.ts`
explica porquê: não há biblioteca de QR nas dependências, e acrescentar uma «é
uma decisão que não é minha». Sem descodificador de referência, a prova lê a
matriz de volta com o `descodificar` e confirma que o QR é **real** — «não um
desenho que parece um QR». O `sobrepoe` é a mesma ideia: a referência de
matemática pura contra a qual se mede o que o produto resolve em SQL.

**Nada a consertar.** Fica uma pergunta menor para o E34: código que só serve
para verificar mora no pacote `domain`, que é publicado. Não é defeito; é peso.

## 2. Duplicado superado — APAGAR, não ligar (1 classificada)

`listarReservas` (`db/reservas.ts`). A capacidade existe: a tela de reservas usa
`agendaDoDia`, `atrasadas` e `carregarReservas`, todas alcançáveis. **Ligar o
`listarReservas` seria errado** — passaria a haver dois caminhos para a mesma
coisa, e o segundo sem provas de tela. Sai.

**Esta categoria não estava na minha lista de três.** Só apareceu ao ler, e é a
razão de a leitura não se poder automatizar: a varredura diz *onde olhar*; o que
distingue «ligar» de «apagar» é saber se a capacidade já existe por outro
caminho.

## 3. Higiene por ligar (1 classificada)

`varrerRetencoesExpiradas`. Não retém capacidade — o E18 prova que ela se
liberta pelo relógio — mas a lista cresce para sempre.

## 4. Capacidade prometida que não existe — DEFEITO (1 classificada)

`receberPedidoExterno`. Não há porta por onde um pedido externo chegue. É a
classe do `enfileirar` do E19, e a prova jura que «com provedor e mapa, o pedido
externo ENTRA» chamando a função directamente.

## Estado: 8 de 30 classificadas

**22 por ler.** Não as adivinho, e não as conto como limpas nem como sujas. A
proporção que já se vê — 5 instrumentos, 1 duplicado, 1 higiene, 1 defeito — diz
que apresentar as 30 como defeitos teria sido errado em pelo menos sete casos.

## Mais quatro classificadas — e o E06 mostra a categoria 2 a funcionar bem

`marcarPasso`, `progressoDoArranque`, `podeSeguirParaCatalogo` (E06) e
`diasConfigurados` (E06). **Duplicado superado — apagar.**

As telas de arranque **não leem progresso guardado**: derivam-no, listando o que
existe (`listarUnidades`, `listarZonas`, `listarMesas`, `listarEstacoes`,
`listarMarcas`). É a escolha certa, e é o mesmo princípio do contrato da lista de
espera — **contar mesas é sempre verdade; um contador de progresso pode
divergir**, e diverge no dia em que alguém apaga uma mesa por fora.

Duas destas — `podeSeguirParaCatalogo` e `diasConfigurados` — não têm uso **nem
sequer nas provas**. Isso separa-as das do `qr.ts`: não são instrumento de
verificação, são restos.

**O que isto diz do projecto, e é bom:** em pelo menos dois sítios o produto
escolheu derivar em vez de guardar, e o mecanismo de guardar ficou para trás sem
ninguém o apagar. O defeito aqui não é de correcção — é de arrumação. Mas código
morto que uma leitura futura confunda com «a forma oficial de fazer isto» custa
uma tarde a alguém, e é por isso que sai em vez de ficar.

**Fica uma pergunta que não respondo aqui:** se ninguém chama
`podeSeguirParaCatalogo`, existe **alguma** porta que impeça avançar no arranque
antes de tempo, ou a tela mostra tudo e confia em quem a usa? Não medi. É
pergunta de operação, e o E21 é exactamente onde ela se faz.

**Estado: 12 de 30 classificadas. 18 por ler.**

## Terceira passagem — e um segundo defeito da classe grave

### `sitePublicoPorDominio` (E10) — capacidade que não existe. DEFEITO.

Quase a classifiquei como duplicado superado, porque existe `sitePublico` e é
chamado pela página pública. **Não é o mesmo:** o `sitePublico` resolve por
**slug**; o `sitePublicoPorDominio` resolve por **domínio próprio**. Capacidades
diferentes com nomes parecidos — a armadilha em que quase caí.

Medido:

```
tabela custom_domains no schema ......... existe
sitePublicoPorDominio em provas ......... 7 usos
rotas que leem o Host do pedido ......... 0
ecrãs que gerem domínios ................ 0
```

**Nada pode resolver por domínio porque nada olha para o domínio.** A tabela
existe, a função existe, as provas juram que funciona, e não há por onde entrar.
É o segundo caso da classe do `enfileirar`, ao lado do `receberPedidoExterno`.

### `guardarLead` — duplicado superado. APAGAR.

Este sim: a rota `api/publico/lead` chama `guardarLeadPublico`. A capacidade
existe e está ligada; o `guardarLead` é a versão anterior. Sai.

### Oito órfãs medidas, ainda por LER

`avisoDeSeguranca`, `estadoDoAlergenio`, `precosPorCanal`,
`unidadesAfectadasPelaBase`, `identificadorAdivinhavel`, `linhasParaGravar`,
`leadsDaUnidade`, `serveConteudo`. **Zero usos em qualquer sítio** — nem produto
nem provas. Não são instrumentos de verificação, isso já sei; se são restos ou
capacidades por ligar, **não sei, porque ainda não as li**. Medi-as; não as
classifiquei. A diferença importa: `avisoDeSeguranca` num módulo de alergénios
pode ser exactamente o tipo de coisa que não pode faltar.

**Estado: 24 de 30 medidas, 16 classificadas, 8 por ler.**

## Os alergénios: a capacidade está intacta, mas a regra vive em dois sítios

Fui ler `avisoDeSeguranca` e `estadoDoAlergenio` (E07) a contar encontrar o pior
— alergénios são segurança alimentar, com peso legal. **Não é o pior. É bom.**

A cadeia segura de ponta a ponta, sem passar por elas:

1. `publicacao.ts:137` — `alergenos: ficha.map((l) => ({ codigo, estado }))`.
   O **estado viaja**, `DESCONHECIDO` incluído. E a linha 136 conta os
   `alergenosPorDeclarar` explicitamente.
2. A tela pública mostra os **quatro** estados com tratamento distinto —
   `CONTEM` perigo, `PODE_CONTER` aviso, `NAO_CONTEM` sucesso, resto neutro —
   e com um comentário sobre usar texto e não só cor, «para quem não distingue
   vermelho de verde».

**O «desconhecido» não desaparece nem vira «não contém».** É exactamente o que
`avisoDeSeguranca` existe para garantir, implementado noutro sítio.

### O risco que fica, e não é defeito

**A mesma regra de segurança está escrita em dois lugares:** no módulo de
domínio (com o raciocínio explicado — *«a inferência não é proibida aqui: é
impossível»*, porque a assinatura não aceita o nome nem a descrição) e em linha,
na publicação e na tela. A versão do domínio **não tem chamador nem provas**.

Duas implementações de uma regra de segurança divergem — e a que vai divergir é
a que ninguém corre. Pior: quem ler o módulo de domínio primeiro pensa que é ali
que a regra vive, muda-a lá, e não muda nada.

**Ou se apaga o módulo, ou se liga.** Deixar os dois é a forma como uma regra de
segurança se perde sem ninguém dar por isso. **Não decido eu qual** — a
inferência de alergénios é decisão de produto e tem consequências legais.

**Estado: 24 de 30 medidas, 18 classificadas, 6 por ler**
(`precosPorCanal`, `unidadesAfectadasPelaBase`, `identificadorAdivinhavel`,
`linhasParaGravar`, `leadsDaUnidade`, `serveConteudo`).
