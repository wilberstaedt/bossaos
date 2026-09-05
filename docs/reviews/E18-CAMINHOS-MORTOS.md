# O E18 tem três caminhos mortos, e eu assinei-o

> 05/09. Varredura minha, depois de encontrar o primeiro por acaso.

Procurei **todas** as funções exportadas de `packages/db/src` e
`packages/domain/src` sem uma única chamada em código de produto — 469 ficheiros
varridos, provas e inspecções excluídas, `node_modules` fora.

**373 exportadas. 55 sem chamador.** A maior parte é do E19, que está a ser
construído neste momento: `enfileirar`, `sugestoesParaMesa`, `chamarDaEspera`.
Essas não são achado nenhum — ainda não têm quem as chame porque a etapa não
acabou. **Não lhes chamo defeito.**

O que é achado são as do **E18, que eu assinei há poucas horas.** Confirmadas com
fronteira de palavra, porque `apresentar(` contém `sentar(` e o meu primeiro
varrimento contava isso como chamada:

| Função | Chamadas reais | O que se perde |
| --- | --- | --- |
| `resolverHoraLocal` | **0** | a hora de Verão nunca é resolvida — ver `E19-ACHADO-FUSO.md` |
| `sentar` | **0** | sentar uma reserva não tem caminho a partir do produto |
| `varrerRetencoesExpiradas` | **0** | a lista de retenções nunca é limpa |

As três nasceram no commit `e8b7352` («E18: motor de reservas e capacidade
concorrente, 6 telas») e as três **estão provadas** em `provas/reservas.test.ts`.

## A gravidade não é a mesma nas três, e importa dizê-lo

- **`resolverHoraLocal`** é o grave. Já tem análise, medição ao vivo e detector.
- **`sentar`** pode ser peça do host do E19, que está a ser construído agora — a
  ausência de chamador **hoje** não prova que ficará sem ele. Registo-o como
  pergunta ao JR, não como acusação.
- **`varrerRetencoesExpiradas`** é higiene, e o próprio E18 diz porquê: a
  capacidade liberta-se **pelo relógio**, não pelo varredor. A prova do grupo 6
  demonstra-o — «passada a hora, a mesa está livre SEM ninguém abrir ecrã
  nenhum». O que se perde é a lista a crescer para sempre, não capacidade
  retida. **A minha assinatura do E18 não fica errada por causa desta.**

## O que isto diz sobre a minha revisão

Verifiquei que as funções estavam certas e que as provas sabiam ficar vermelhas.
**Não verifiquei que alguém as chamava.** Uma função correcta que ninguém invoca
passa em qualquer revisão de código e não existe em serviço.

A regra que escrevi depois do E15 cobre exactamente isto:

> Para cada aceite, apontar a **linha de produto** que o exercita **e** a
> asserção que fica vermelha se ela desaparecer.

Apliquei-a a uns aceites e não a outros. **Não é falta de regra: é falta de a
executar sempre.** Uma régua que se aplica quando me lembro não é uma régua.

## O que proponho, e o que não proponho

**Não** proponho uma guarda de CI que reprove funções sem chamador — daria 55
vermelhos hoje, a maioria legítimos, e uma guarda que grita sempre deixa de ser
lida em dois dias.

Proponho o que cabe na revisão: **a partir daqui, todo o aceite que eu assine
aponta a linha de produto que o exercita.** Se não a encontrar, a etapa é retida
até existir — mesmo que a função esteja perfeita e a prova verde.
