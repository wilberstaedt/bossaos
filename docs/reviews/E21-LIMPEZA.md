# E21 · A lista exacta, com ficheiro e linha

> Enquanto for prosa, ninguém a executa. Aqui está com endereço.
> **E vem dividida**, porque «sem chamador» não decide nada sozinho.

## Apagar — duplicado superado, com alternativa VIVA confirmada

Cada uma destas tem a capacidade a funcionar por outro caminho. **Ligá-las seria
errado:** passaria a haver dois caminhos para a mesma coisa, e o segundo sem
provas de tela.

| Função | Onde | A capacidade vive em |
| --- | --- | --- |
| `listarReservas` | `db/reservas.ts:762` | `agendaDoDia`, `atrasadas`, `carregarReservas` |
| `marcarPasso` | `db/onboarding.ts:170` | o arranque **deriva** de `listarUnidades/Zonas/Mesas` |
| `progressoDoArranque` | `db/onboarding.ts:154` | idem |
| `podeSeguirParaCatalogo` | `domain/arranque.ts:104` | idem |
| `diasConfigurados` | `domain/horarios.ts:282` | — sem uso nem em provas |
| `guardarLead` | `db/leads.ts:32` | `guardarLeadPublico`, via `api/publico/lead` |
| `precosPorCanal` | `domain/precos.ts:139` | a tela de preços resolve-o em linha |

## NÃO apagar — capacidade que não existe. Corrigi-me aqui.

**Tinha-as na lista de apagar.** Fui verificar antes de escrever «apagar» ao
lado de um nome, e estava errado nas duas.

**`revogarConvite`** (`db/convites.ts:223`). Existem primos vivos —
`revogarDispositivo`, `revogarPertenca`, `revogarSessoesDoUtilizador` — e nenhum
faz isto. Revogar uma **pertença** é tirar quem já entrou; **um convite pendente
é outra coisa**, e quem enviou um convite para o endereço errado não tem como o
cancelar. Apagar a função seria apagar a única peça de uma capacidade em falta.

**`listarAuditoria`** (`db/auditoria.ts:62`). O menu da plataforma ainda tem
`{ href: '#', rotulo: navAuditoria }`. **A auditoria é escrita e não é lida por
ninguém** — e uma auditoria que ninguém consegue ler serve para quê?

## Por ler — não as classifico sem as ler

`accoesDoPapel` (`domain/permissoes.ts:162`) e `autorizacaoPorConcessoes`
(`domain/portas/autorizacao.ts:61`). São de permissões, e permissões não se
apagam por estatística de uso.

## Um limite da minha própria aprovação do marco

Os meus critérios mediram o menu de `app/[orgSlug]`. **O menu da `platform` não
foi medido** — e tem `#` em Suporte, Incidentes e Auditoria, sem `porConstruir`
a dizer que etapa os faz.

**Não reabro o veredicto por isto**: a plataforma é a consola interna, não o
Restaurant, e o marco era do Restaurant. Mas o critério que apliquei ali
aplica-se aqui na mesma, e alguém tem de o aplicar. **Fica para o E34**, que é a
minha revisão seguinte — e fica escrito que a aprovação do marco não cobriu esta
árvore, em vez de deixar parecer que cobriu.

---

## Segundo limite da minha aprovação do marco: o `kds` e o `staff`

A prova das portas mede **seis** módulos: catálogo, reservas, sala, takeaway,
relatórios e caixa. Existem mais duas árvores entregues, e não estão lá.

**O `kds` está bem.** Tem ligações a partir da configuração de estações —
`/kds/<unidade>/<estacao>` — e é a porta natural: configura-se a estação e
abre-se o ecrã dela. Ninguém procura o KDS num menu de gestão; procura-o na
estação a que pertence.

**O `staff` não tem ligação nenhuma em todo o produto.** Medido: zero ficheiros
com `href` para `/staff/`.

**Não reabro o veredicto**, e digo porquê em vez de o deixar implícito: o
`/staff/` é superfície de **dispositivo** — o tablet do empregado, com entrada
por PIN — e um tablet configura-se uma vez. Um endereço escrito uma vez na vida
do aparelho não é a mesma falha que um módulo de gestão inalcançável todos os
dias.

**Mas é uma pergunta a sério, e fica escrita:** se ninguém liga para lá, como é
que o tablet novo chega ao endereço? Alguém o escreve à mão a partir de um papel
— e a partir daí a instalação de um posto depende de uma pessoa saber uma coisa
que o produto não diz. **Fica para o E34**, com o menu da plataforma.

**O que isto diz da minha aprovação:** aprovei o marco medindo o que os meus
critérios diziam, e os meus critérios diziam «módulos entregues» sem enumerar
quais. Enumerá-los era comigo. **A aprovação vale para os seis medidos** — e
está escrito que não olhei para estes dois, em vez de ficar a parecer que olhei.
