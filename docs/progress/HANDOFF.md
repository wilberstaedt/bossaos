# HANDOFF — estado do motor BossaOS

**Etapa atual:** CONCLUIDO — as 36 etapas funcionais estão validadas e as 396 telas rastreadas. O trabalho corrente é a **RV100** (`docs/RV100.md`), a reconstrução visual, cujo dossiê está em `docs/visual/rv100/2026-09-06_e953a87/`. **Duas coisas que uma sessão nova tem de saber antes de agir:** o §12.4 diz que só o Matheus pode registar `APROVAÇÃO VISUAL HUMANA` — o Claude emite `PRONTO PARA APROVAÇÃO VISUAL HUMANA` e pára; e há **190+ commits locais por empurrar**, com a CI escura desde 05/09, portanto todo o verde deste repositório é verde **nesta máquina**.
**Estado:** **em revisão.** **35 de 36 etapas validadas**, atlas fechado em **396/396**. O E35 foi **assinado a 06/09** em `d273378` (`docs/reviews/E35.md`) — a última etapa de implementação. Do meu lado não há etapa aberta: o que corre são as **correcções que a revisão do E34 me encaminha**, uma de cada vez.

**Correcção 1, encaminhada e fechada:** o fecho de caixa duplo, em `88f5a62`
(detalhe na secção própria, mais abaixo). Aguarda a verificação do sénior.

> **Duas etapas em voo ao mesmo tempo, com donos diferentes — a primeira vez no
> projecto.** O `estado.sh` deriva a etapa actual como «a primeira que não está
> validada», e por isso diz E34: está certo pela definição dele e não consegue
> dizer que o E35 avançou noutra mão. Fica escrito aqui em vez de se ajustar o
> medidor à resposta — quem chega lê as duas linhas e não vai refazer nem o E34
> nem o E35.

> ## ⚠ AO CHEGAR AOS 100%: PARAR E LER `docs/RV100.md`
>
> Deixado pelo Matheus a 06/09 às 03h20. 841 linhas — reconstrução visual,
> comercial e de usabilidade. O pedido foi **ler o documento inteiro antes de
> tocar em código**. Tem diagnóstico obrigatório e um **portão de aprovação
> humana** nas telas-mestre: há um ponto em que se para e se espera por ele.
>
> **E avisá-lo por push** — nos 100% e quando o RV100 arrancar. Pediu-o antes de
> ir dormir. A ordem e o resto da fila estão em `docs/progress/DEPOIS-DOS-100.md`.
>
> _Reposto a 06/09: a minha reescrita do cabeçalho do E33 apagou este bloco, e a
> `validar-gatilho-rv100.sh` apanhou-o. É a minha própria regra a apanhar-me —
> o que se mexe, repõe-se — e é a segunda vez no mesmo dia._


## Correcção 5 — o varredor ganhou quem o chame, e o `sentar` morto foi apagado

**A pergunta era do sénior e a resposta veio com instrumento que funciona:** o
`git grep -E` com `\b` dava zero para os dois, e **o `git grep` não suporta
`\b`** — o zero era do instrumento. Com `-w`, nove ficheiros e três.

### O varredor: faltava a linha, não faltava o worker

`varrerRetencoesExpiradas` estava escrito, exportado e com teste — e com **zero
chamadas no produto**. O `apps/worker/src/index.ts` já é um ciclo que varre e já
corria o `varrerDescidas`.

**O risco é baixo e sei-o por ler a função, não por supor:** a documentação dela
distingue **higiene de correcção** — a capacidade já fica livre sem ela, porque a
`ocupacaoNoIntervalo` compara `oferta_expira_em` com `now()`. O que ela evita é a
lista de espera encher-se de ofertas mortas no ecrã de quem trabalha a sala. Quem
a escreveu previu a pergunta e deixou lá a razão de a correcção não depender
dela; ponto a favor, e é o que torna esta ligação segura.

**Enumerar sem entrar em casa nenhuma**, na forma do `descidas_devidas()`: a
`unidades_com_retencoes_expiradas()` é `SECURITY DEFINER` e **recusa-se a
responder de dentro de um inquilino** — é isso que impede um restaurante de
perguntar quem mais tem ofertas por expirar. E devolve só as unidades que **têm**
trabalho: num ciclo vazio não se abre transacção nenhuma.

**Provado:** o enumerador encontra a unidade, deixa de a listar depois de varrer
(senão o ciclo seguinte varria a mesma coisa), e **o controlo mostra a recusa de
dentro do inquilino**. `provar-reservas.sh` **0 falhas**, 37 casos.

### O `sentar`: apagado, e não fundido

`reservas.ts:701` estava exportado com **zero chamadores**. A rota tem um ramo
`accao === 'sentar'` que **parece** o chamador e não é: chama `sentarReserva`, do
`host.ts`, que é outra função e não um alias.

**Apagado, não fundido, e o motivo está escrito no que ficou:** era a **metade
perigosa** do `sentarReserva` — mudava o estado sem exigir que a pessoa tivesse
chegado, sem ver se a mesa estava ocupada e **sem abrir a sessão de mesa**.
Exactamente o que o comentário do `sentarReserva` diz que não pode acontecer:
«uma reserva sentada sem mesa aberta, e o mapa da sala a mostrar livre uma mesa
com gente lá». Fundi-lo preservava a armadilha com outro nome — quem fosse
corrigir «a função de sentar» encontrava duas, e a errada era a mais simples.

**O que prova que nada partiu não é o `pnpm verificar` passar** — isso prova que
ninguém o chamava. O que ficou é um caso que exige a **propriedade que ele
violava**: nenhuma reserva chega a `SENTADA` sem sessão de mesa aberta. E o
controlo replica a metade perigosa e exige que a propriedade **caia** — senão a
asserção era vazia. `provar-host.sh` **0 falhas**, 19 casos.


## Correcção 4 — a CI descobre as provas, e a lista de excepções caduca

**O número da revisão estava errado e o sénior corrigiu-o antes de mo mandar**:
um guião não correr não quer dizer que a prova não corra. O `pnpm inspeccionar`
é `playwright test` **sem `--project`**, portanto colhe tudo o que `inspeccao/`
tem e as 22 provas de navegador já corriam. A pergunta certa não é sobre guiões,
é sobre **ficheiros**.

**Medi antes de mexer, e confirma-se:** 13 guiões nomeados, **40** ficheiros
`provas/*.test.ts`, **12 alcançados**, **28 nunca corriam**.

**E o cruzamento é o que dói:** dos sete ficheiros com os casos concorrentes que
dão por provadas as famílias do saldo, das reservas e da deduplicação, **seis**
estavam nos 28 — caixa, contas, pedidos, reservas, sala, sites. Só o onboarding
chegava lá. Os invariantes davam-se por provados e só se provavam quando alguém
os corria à mão. Na mesma lista estavam as provas do dinheiro: caixa, contas,
fiscal, financeiro, portas-do-dinheiro, adquirente, stock.

**A cura é a que a casa já tinha uma secção acima:** `for g in scripts/provar-*.sh`,
como as guardas — foi por isso que as cinco guardas de ontem entraram na CI sem
ninguém tocar em lista nenhuma.

**As excepções passam a viver num ficheiro, com motivo escrito**
(`scripts/provas-fora-da-ci.txt`), lido **pela CI e pela guarda** — antes eram
duas listas com a mesma responsabilidade e nenhuma sabia da outra.

**E caducam.** A `validar-provas-na-ci.sh` reprova uma entrada que nomeia um
guião que já não existe, e uma que diz «corre por nome» quando o workflow já não
a nomeia — que é a forma de uma excepção passar de «corre noutro sítio» a «não
corre em lado nenhum» em silêncio. **Provado nas duas formas**, com a entrada
plantada e reposta.

**De 12 para 39 dos 40 ficheiros**, e as seis famílias concorrentes passam todas
a correr.

**O que NÃO posso afirmar:** a CI está trancada por facturação e **não a corri**.
O que corri foi a mesma descoberta localmente — 32 guiões seleccionados, 38
declarados fora — e as guardas. O passo do workflow está escrito e por medir num
servidor.

**E um achado à parte:** `provas/reserva-publica.test.ts` **não é alcançada por
guião nenhum** — nem pela CI, nem à mão. O `provar-reserva-publica-no-navegador.sh`
corre o *spec* de inspecção, que é outro ficheiro. Não a pus como excepção porque
não há motivo para a excepcionar: há um ficheiro de prova sem corredor.


## Correcção 13 — o rasto do suporte podia não acontecer

**Achado do sénior, na revisão do que eu tinha acabado de escrever.** A primeira
composição do `suporte_le_pedido` juntava a sessão **só** na CTE que escreve o
rasto, e prendia as duas metades com `WHERE (SELECT count(*) FROM rasto) >= 0`.
**Zero é maior ou igual a zero.**

Com um `p_sessao` que não casa com sessão nenhuma, o `INSERT` insere zero linhas,
a condição continua verdadeira, e **a leitura devolve os dados sem deixar rasto**.
Reproduzi-o antes de corrigir, numa réplica com a mesma composição e transacção
revertida: com sessão que existe, dados e 1 rasto; **com sessão inventada, os
mesmos dados e o rasto na mesma 1**.

Não havia fuga — o predicado continuava a guardar a leitura. Havia um acesso que
podia acontecer sem ficar escrito, e um segundo efeito da mesma causa: com uma
sessão válida **de outro agente**, o registo nomeava esse outro, porque o
`staff_user_id` saía da sessão que o chamador escolheu.

**E aquele `WHERE` era pior do que parecia:** uma CTE que escreve corre **sempre
e por inteiro**, seja ou não lida pela consulta principal. A condição nunca teve
função — nem para forçar o `INSERT`, que já corria, nem para acoplar as metades.
Decoração com ar de mecanismo.

**A cura junta as duas metades numa só:** a sessão entra no `lido`, com três
condições — é a sessão indicada, é da organização daquele pedido, e é do agente
que está a chamar. Sem isso não há dados **nem** rasto, porque os dois saem da
mesma linha.

**Medido na réplica, com a contagem em instrução separada** — dentro da mesma
instrução o `count` não vê o próprio `INSERT`, e li-o quase mal: inventada →
nada, 0 rastos; de outro agente → nada, 0 rastos; do próprio → dados, 1 rasto.

**Controlo 1c** novo na J15, medido pelas duas pontas: uma sessão que não existe
não devolve dados **e** a contagem de rastos não mexe.

`provar-jornada.sh` **0 falhas** — 8 jornadas, **59 passos**, 4 elos partidos.


## As três jornadas que faltavam — J08, J12 e J15 — e as OITO numa só corrida

**8 jornadas, 58 passos, 0 falhas**, com os quatro elos partidos a acender, a
árvore limpa e os sete gatilhos do rasto repostos. A régua exige a regressão das
anteriores **na mesma execução**, e é o que este número é.

### J08 — pagamento
Conta que nasce da **carta** (o preço é lido do que o estranho vê, e o que falta
deriva dele), primeira parcela em dinheiro, o fecho recusado enquanto a soma não
fecha, segunda parcela por cartão confirmada pelo **adquirente**, o documento
fiscal, e o fechamento medido como **porta que recusa** e não como campo que
muda. O controlo da armadilha — repetir a mesma parcela — dá `EXCEDE_O_DEVIDO`.

**Refutei metade de um critério, com o motivo:** a régua pedia que uma divisão
cujas parcelas somam menos fosse recusada **na criação**. Não existe objecto
«divisão» neste produto: ela emerge de pagamentos parciais, e uma conta meio paga
é um estado legítimo. O sítio onde o produto recusa a soma que não fecha é o
**fechamento**, com `CONTA_POR_LIQUIDAR` — e é lá que se mede. O sénior aceitou.

**E o sénior apanhou-me o inverso:** o primeiro passo prometia por comentário que
o preço vinha da carta e usava um literal, comparando a conta com o mesmo literal
que lhe tinha passado. Prosa a descrever um mecanismo que o código ao lado não
tem — a forma do dia, agora minha. O preço passou a ser **lido**, e a J12 tinha a
mesma família por baixo: contava `data-teste="produto"`, um marcador que não
existe na carta pública.

### J12 — nova unidade
Concessão anterior, unidade pela porta, endereço público, carta publicada, a
**herança contada** contra a mãe (com a mãe provada não-vazia primeiro), o
override na filha e as **duas cartas republicadas** — sem republicar a mãe, o
controlo passava por ela estar velha e não por o override não lhe pertencer.

**Dois achados do produto, medidos:** quem é convidada para uma unidade **vê a
outra na lista** (`listarUnidades` filtra por `archivedAt` e a RLS é por
organização) mas **não consegue mexer** nela — o isolamento que importa aguenta,
o que falha é o índice mostrar o que a pessoa não pode usar. E o emparelhamento
de dispositivos é acto da **organização**, não da unidade: o que é da unidade é o
**aparelho**, e é isso que a jornada mede.

### J15 — suporte, e o defeito maior do dia
Ticket do cliente, pedido real criado na jornada, agente que é **pessoa**, e as
quatro condições do E33 a apanharem-me uma a uma: faltava a **duração**, faltava
**fechar a sessão anterior**, o índice tinha outro **nome**, e faltava o
**motivo** do fecho. Cada recusa foi uma regra a funcionar.

**O acesso de suporte nunca conseguia ler nada.** A rota corre por
`comIdentidade`, que define só `app.user_id`; a `orders` tinha uma política única
com `organization_id = app_organizacao_actual()`. Sem organização no contexto,
**404 para todos os pedidos de todas as casas** — a funcionalidade inteira
inerte. Ninguém tinha visto porque `provar-plataforma.sh` e
`provas/plataforma.test.ts` têm **zero** referências a `api/plataforma/suporte`:
exercitam o `sessaoAutoriza` por dentro, onde o cliente é dono da tabela.

**Não curei sozinho** — é isolamento entre inquilinos. Propus duas opções, o
sénior mediu e decidiu uma terceira que a casa já tinha escolhido no E33:
**política `FOR SELECT` com predicado próprio**. `suporte_com_concessao_viva(org)`
verifica que esta pessoa tem sessão para aquela organização, não terminada, não
expirada, com âmbito que permita ler; a organização vem **da linha**, nunca do
chamador; e é só leitura. A rota **mantém** a verificação explícita, que é o que
produz o 403 honesto — sem ela, «sem concessão» virava «sem linhas» e lia-se como
404, exactamente o que a régua proíbe confundir com controlo de acesso.

**E a auditoria escreve-se na mesma instrução da leitura.** A `audit_events`
exige organização no contexto para inserir, e aqui não há — de propósito. Como o
E33 fez para a concessão: uma função privilegiada que numa só instrução lê, junta
as linhas e insere o rasto, com a CTE do registo alimentada pela da leitura. **Sem
linha lida não há linha escrita.** A garantia não se perde por ser privilegiada:
chama o **mesmo predicado** da política.

### Dois 500 que eram regras a funcionar
O reenvio do webhook (E23) e a segunda sessão por fechar (E33) saíam como avaria.
Os dois curados: `ON CONFLICT DO NOTHING` num, `SESSAO_JA_VIVA` (422) no outro. E
a distinção que os separa: **as recusas de gatilho vêm na mensagem, as de índice
único vêm no `meta`** — o `String(erro)` traz só «Unique constraint failed».

`provar-jornada.sh` **0 falhas** (8 jornadas, 58 passos, 4 elos) ·
`validar-jornada.sh` **0** · `validar-plantes.sh` **0** ·
`validar-alvos-com-casa.sh` **0** · `validar-rls.sh` **0** · `pnpm verificar` **0**.


## Correcção 10 do E34 — o alvo era de outra casa

**O diagnóstico de origem foi retirado pelo sénior** (a cadeia dos identificadores
que derivam entre semeaduras: o `staff-telas.spec.ts` resolve os alvos num
`beforeAll`, depois do `globalSetup`, e não no topo do módulo). Revi os
identificadores fixos que tinha escrito por causa dele — e confirmei a
retractação por medição: **com os 36 alvos pinados e ZERO a derivar, a `staff`
continuava a falhar.**

**A raiz é o ÂMBITO do alvo.** O `alvos.ts` resolvia `menuId`, `categoryId` e
`productId` com `LIKE 'insp-%'` e `ORDER BY nome` **sem filtro de organização** —
enquanto o `brandId`, o `membershipId` e o `locationId` já filtravam por `ORG_A`.
Metade dos alvos sabia de que casa era e a outra metade não. O produto escolhido
era o `insp-Arroz de sepia y alcachofas`, da organização **B**, e a unidade do
Staff é da **A**: a prova pedia um produto de uma casa dentro de outra, e recebia
404. **O 404 estava certo** — era o isolamento entre inquilinos a funcionar.

**Medido antes de aplicar, e o número é mais apertado do que a lista:** dos 32
alvos com organização verificável, **dois** caíam noutra casa (`categoryId` e
`productId`); o `menuId` calhava certo, com a mesma lotaria. E das nove tabelas
que os alvos consultam por `LIKE`, **só três têm linhas em duas organizações** —
`menus`, `categories`, `products`. As outras seis vivem só na A e não levam
filtro que não precisam.

**Resultado:** a `staff` passa de morta a **31 casos de navegador verdes** (23
telas × 5 larguras, mais toque, contraste, três idiomas e a fila), com dez
controlos negativos a disparar.

### E a correcção 7 apanhou a sua primeira presa sozinha

O único vermelho que sobrou na corrida completa foi *«o plante NÃO APLICOU»*: o
controlo 11 exigia `s.count(cracha) == 7` e o ficheiro tem **oito** — sete nos
`DELETE` e uma na contagem do fecho. **Está a oito há pelo menos oito commits**, e
o plante não aplicava desde então: o `assert` disparava, ninguém lia o código de
saída, e o controlo corria contra um ficheiro intacto. Só apareceu porque a
correcção 7 pôs este guião a passar pelo `plantar()`. Trocado por `>= 7` —
um número exacto apodrece na primeira vez que alguém acrescenta um `DELETE` — e
**verificado à parte: o plante aplica e troca os crachás**.

**Fica dito um limite da `validar-plantes`:** ela mede que a **âncora existe**, e
aqui existia; o que falhava era a **contagem**. Um plante pode estar vivo para a
guarda e morto na corrida.

### O que NÃO está medido

A corrida completa da `staff` **depois** do `>= 7` — a que lancei foi
interrompida a meio (`Terminated: 15`), e o vermelho que ela mostrou no controlo
7 é o sinal, não um defeito: na corrida completa anterior esse controlo está
`ok`. E a `visitante`, que usa o mesmo `productId` no `MENU-006`
(`${publico}/menu/produto/${a.productId}/pedir`) e era uma das que falhavam no
corredor: **provável**, não medido.

**E a interrupção deixou rasto:** o `packages/db/src/dispositivos.ts` ficou com o
plante do controlo 8 aplicado. O `trap restaurar` só corre se o processo puder
correr, e um sinal duro não lhe dá essa hipótese. Reposto do git antes de
qualquer commit.


## Correcção 7 do E34 — os plantes em letra morta, e a guarda que os media

**Fechada, e o número mudou depois de eu medir.** A guarda dizia 19 plantes
mortos; são **três**. Os outros 16 — e mais 25 que ela nem via — eram defeito
dela.

### A guarda cometia o defeito que existe para apanhar, duas vezes

**Primeiro: só lia metade da população.** O padrão era `python3 - <<'TAG'`, e
há **162 blocos** invocados como `plantar <<'TAG'`. Media 172 de 334 e reportava
como se fossem todos — nem os contava, nem os declarava. Agora lê as duas
formas, e o autoteste tem **quatro sondas**: vivo e morto em cada forma. Sem as
duas novas, a versão cega passava o autoteste na mesma.

**Segundo: comparava o texto-fonte da âncora, não o valor.** Um
`antigo = "linha um\nlinha dois"` ficava com uma barra e um `n` **literais**,
que nunca casam com uma quebra de linha do ficheiro: **todo o plante multilinha
era dado por morto**. Medido: dos 44 «mortos», **36 estavam vivos**.

**E terceiro, mais pequeno: media o NOME da variável.** Exigia `antigo`, e
metade dos guiões chama-lhe `alvo` ou `agulha`. Passou a ler a âncora do
`assert ... in s`, com a convenção antiga como recurso — e a ordem importa: pô-la
a substituir em vez de somar fez os legíveis caírem de 310 para 245, e reparei
porque medi outra vez.

**De 172 lidos / 19 mortos / 11 por ler → 320 vivos, ZERO mortos, 12 por ler.**
Os 12 são genuinamente dinâmicos (variáveis de ambiente, JSON carregado, cópias
em `/tmp`) e continuam declarados, não concluídos.

### Os três mortos a sério

**`provar-catalogo.sh` — e era o pior.** Plantava em `fichaDeAlergenios`, onde a
regra estava escrita **duas vezes**; o E34 tirou a cópia e a ficha passou a
chamar `estadoDoAlergenio`. O plante ficou em letra morta e o guião passou a
**acusar o produto** do defeito mais perigoso deste projecto — um alérgeno não
declarado a ler-se como «não contém» — sem nunca o ter plantado. Re-ancorado ao
**único** sítio onde a regra vive. Medido depois: `provar-catalogo.sh` **0
falhas**, e o controlo acende — *«caiu a asserção dos catorze desconhecidos»*.

**`provar-pedidos.sh`** — o filtro dos componentes de combo mudou de ficheiro
(`relatorios.ts`, na própria consulta). Tirei o plante em vez de o re-ancorar: o
caso que o controlo nomeia é o **CHECK da base**, que ele já derruba.

**`provar-portas.sh`** — ficou **sem matéria-prima**: não existe um único
`porConstruir` no produto (o E30 fechou o do menu de gestão, o E33 os três da
plataforma). Declara em vez de acusar, como a `validar-assinaturas.sh` quando o
atlas fechou. **E fica dito o que isso significa:** a asserção «dizem QUAL
etapa» corre hoje sobre **zero marcadores** — verde sobre população zero, na
prova.

### E o que impede o regresso: 32 guiões passaram a verificar o plante

Os 172 blocos `python3 - <<` não liam o código de saída. Agora todos passam pelo
`plantar()` — se a âncora mudou, a falha é do **guião** e diz-se assim, em vez
de ser atribuída ao produto. Sobraram dois `python3 - <<` no
`provar-marco-e11.sh`, e não são plantes: calculam valores.

### A atribuição das cinco falhas, corrigida com medição

Das cinco que ele ligou aos plantes mortos, **só o catálogo era**. Corri as
outras quatro: **`mensagens` passa** (0 falhas). **`staff`, `tema` e
`visitante` falham no passo 1 — «com tudo ligado», antes de qualquer plante** —
portanto não são acusações falsas: são vermelhos a sério e ficam para ele, que é
quem está a investigar o corredor.

`validar-plantes.sh` **0 falhas** · `provar-catalogo.sh` **0** ·
`provar-mensagens-no-navegador.sh` **0** · `pnpm verificar` **0**.


## Correcção 4 do E34 — a J14 existe, e destapou o webhook a responder 500 ao reenvio

**Fechada.** `provas/jornada.test.ts` passa de 4 jornadas e 27 passos a **5 e
34**. A J14 vive na porta do adquirente — a única do sistema onde alguém de fora
afirma que **dinheiro entrou**, e a única sem sessão: o que autoriza é a
assinatura.

A corrente: descobrir a organização → a porta recusa assinatura forjada **sem
dizer porquê** → conta por cartão **sinalizada** → o adquirente diz `CAPTURADO`,
o facto fica **preservado** e reconciliado na mesma transacção → **reenvia e nada
duplica** → devolve → **reenvia a devolução e o dinheiro que sai não se duplica**.

### O defeito que ela encontrou: o reenvio devolvia 500

**E o reenvio é o caso normal de qualquer adquirente.** O `receberWebhook`
tentava inserir e apanhava o `P2002` em JS — e o comentário que lá estava
avisava: *«fica anotado por ser frágil: no dia em que alguém acrescentar uma
linha aqui, parte sem aviso»*. Alguém acrescentou, **na rota**: depois de
receber, ela lê `membership.findFirst` para reconciliar. O erro do índice
**aborta a transacção**, o `catch` corre mas já não pode ler nada, e a leitura
seguinte rebenta com `25P02`. Resultado medido: **500 com o corpo vazio**.

E um 500 põe o adquirente a martelar a porta — que é, por escrito, o que a rota
diz que quer evitar. Cura: a forma do E24 que o comentário já nomeava,
`ON CONFLICT DO NOTHING` (`createMany` com `skipDuplicates`), que não levanta
excepção e não aborta nada.

**E medi porque é que ninguém tinha visto:** com o defeito reposto,
`provar-adquirente.sh` dá **0 falhas e 21 casos verdes — incluindo o caso do
reenvio**. A prova de segmento chama a função e não corre a linha que vem
depois; a `portas-do-dinheiro` verifica que a rota **menciona** `receberWebhook`,
lendo o ficheiro como texto. A peça estava provada duas vezes e o caminho estava
partido.

### A alavanca aponta à devolução, e isso mudou depois de medir

`REENVIO_COM_IDENTIDADE_NOVA=1` faz o reenvio trazer outro `eventoId` para o
mesmo facto. Na **captura** isso mete um facto a mais no ecrã e não mexe no
dinheiro — o `capturadoMenor` é uma **atribuição**, o último carimbo manda. Na
**devolução** o `devolvidoMenor` é uma **soma** (devoluções parciais acumulam) e
a chave idempotente do reembolso inclui o montante: o devolvido vai de 40,00 a
80,00, a chave muda, e nasce um **segundo reembolso**. É lá que a identidade é a
única defesa, e é lá que a alavanca tem de doer.

A ordem das asserções decide o que a paragem diz: o **dinheiro primeiro**, o
mecanismo a seguir. Com `repetido` antes, a jornada parava a dizer «entrou como
facto novo» — verdade, e o mecanismo; quem lê precisa de saber o que aconteceu ao
dinheiro.

### E a limpeza deixou de poder deixar a base sem protecção

A minha primeira versão desligava uma **lista escrita à mão** de gatilhos e
voltava a ligá-los no fim. A J14 trouxe duas tabelas novas, a limpeza abortou ao
bater na primeira que faltava, e o `ENABLE` **nunca correu**: a base ficou com
cinco gatilhos desligados, e só o passo 8 deu por isso. Duas mudanças: os
gatilhos **descobrem-se na base** (`pg_trigger` sobre as tabelas que a limpeza
toca), e tudo corre dentro de `BEGIN`/`COMMIT` — `DISABLE TRIGGER` é
transaccional, portanto **deixar a base sem protecção deixa de ser possível** em
vez de depender de o guião chegar ao fim. Provou-se sozinho: quando parei a
corrida a meio com um `kill`, a base ficou com **0 gatilhos desligados**.
(`session_replication_role = replica` era mais curto, e o `bossaos_migrate` não
tem permissão — medido.)

### Pendências declaradas: a integração de pagamentos não é configurável hoje

`WEBHOOK_SEGREDO_*` **não está definido em lado nenhum do repositório** — só é
lido na rota. E **nenhum ecrã mostra o `organizationId`** que o webhook tem de
trazer no cabeçalho `x-bossaos-organizacao`: procurei por `name="organizationId"`
e por marcador de teste, e não existe. Quem configura o adquirente não tem onde
ir buscar o valor. O primeiro passo da J14 existe para isto não passar
despercebido, e **apaga-se no dia em que o produto expuser o identificador**.

`provar-jornada.sh` **0 falhas** (5 jornadas, 34 passos, 4 elos partidos, corrido
**sozinho na base**) · `provar-adquirente.sh` **0** · `validar-jornada.sh` **0**
(vê as três alavancas) · `pnpm verificar` **0**.

**Por fazer, da lista dele:** J08, J12 e J15.


## Correcção 3 do E34 — a J09 existe e percorre-se

**Fechada.** `provas/jornada.test.ts` passa de 3 jornadas e 18 passos a **4 e
27**, e a nova é a da caixa: **abrir → vender e o dinheiro entrar na gaveta →
saída com motivo → cartão por reconciliar → contar → o fecho recusar →
reconciliar → ENCERRAR → e fechar outra vez ser recusado**.

Tudo pelas portas que uma pessoa usa, e o estado vem sempre do que o produto
devolveu: o `registerId` do redireccionamento, o `attemptId` do ecrã da conta, e
**o valor a contar lido do ecrã de fecho** — calculá-lo aqui era reimplementar a
regra do lado da prova.

**A alavanca é `SEM_CONTAGEM=1`**, no modelo do `SEM_MOEDA`: tira-se a contagem,
o fecho tem de parar e o motivo tem de **nomear a contagem**.

### Três coisas que a jornada destapou, e que segmento nenhum via

**1. A J01 estava vermelha desde o E33, e ninguém deu por isso.** O gatilho
`rasto_guarda_a_pessoa` exige que uma acção `plataforma.%` diga quem a fez —
`actor_id` e `actor_email` de uma pessoa. O `scripts/plataforma.mjs` assinava
`plataforma:$USER` **sem `actor_id`**, e por isso deixou de escrever:
`rasto_sem_pessoa`. Como é a única porta para dar plano e concessões, **nenhuma
organização nova conseguia ser habilitada** desde então. A cura não é abrandar o
gatilho — é o guião dizer quem opera: `--por <email>` ou `BOSSAOS_OPERADOR`,
resolvido contra `users`, **sem valor por omissão**. E a jornada cria essa pessoa
pela porta do produto, numa conta diferente da do restaurante: uma organização a
assinar a própria concessão é um restaurante a dar-se um plano.

**2. A recusa sem detalhe chegava ao ecrã como «erro».** É a observação que
deixei escrita na correcção 1 e não tinha tocado — agora está paga, porque a
alavanca da J09 a mediu. A rota do TPV traduzia com `/^[A-Z_]+:/`, e uma
`RecusaDaCaixa` sem detalhe escreve `CAIXA_FECHADA` **sem dois pontos**. Caíam
todas no genérico: `SEM_CONTAGEM`, `CAIXA_FECHADA`, `PAGAMENTO_NAO_E_DINHEIRO`.
As recusas **com** detalhe passavam, e por isso ninguém via metade do defeito.

**3. A limpeza da jornada bate na imutabilidade do rasto.** A J09 deixa
acontecimentos de caixa, movimentos, pagamentos e linhas de conta paga — **cinco
gatilhos que recusam `DELETE`, incluindo à credencial de migração**. Desligam-se
e voltam a ligar, e o passo 7 verifica os **seis**, com a contagem primeiro:
zero desligados sobre zero lidos era verde sobre população zero.

### E um achado contra mim

**O meu controlo 11 da caixa era uma moeda ao ar.** As três inserções da sonda
partilham o `criado_em` — `now()` é o instante da **transacção** —, e o gatilho
desempata por `id`, que é um uuid. O controlo alternava entre verde e vermelho
sem ninguém mexer em nada. Passou a escrever a ordem: três corridas seguidas, 0
falhas. **No produto o empate não acontece** (cada acontecimento é uma
transacção), mas fica dito porque é uma propriedade real da leitura do estado.

`provar-jornada.sh` **0 falhas** — 4 jornadas, 27 passos, 3 elos partidos ·
`validar-jornada.sh` **0** (vê as duas alavancas) · `provar-caixa.sh` **0** ·
`pnpm verificar` **0**.

**Por fazer, e é a lista dele:** J08, J12, J14 e J15. Uma de cada vez.


## Correcção 2 do E34 — o pt-BR misturava duas ortografias

**Fechada.** Não era preferência de ninguém: o ficheiro divergia **do próprio
padrão**. Medi antes de mexer e as contagens do sénior confirmam-se —
`activ` 7 contra `ativ` 34, `contacto` 3 contra `contato` 7, `excepç` 1 contra
`exceç` 5.

**Onze chaves, e a minha varredura mais larga não encontrou mais nenhuma.**
Procurei também `óptim`, `acto`, `adopt`, `objecto`, `direc(c|ç)`,
`proje(c|ç)t` — o conjunto fechou exactamente nas onze que ele nomeou.

| depois | |
|---|---|
| `activ` **0** | → `ativ` 41 |
| `contacto` **0** | → `contato` 10 |
| `excepç` **0** | → `exceç` 6 |

**Só valores, nunca nomes de chave.** `staffE15.dispositivosActivos` **é** o nome
da chave e fica como está: as três línguas partilham o conjunto, e um `sed` de
`activ` pelo ficheiro fora teria partido o pt-BR contra os outros dois. Por isso
a troca foi sobre a cadeia inteira de cada valor.

**Confirmado depois:** as **2344 chaves** continuam idênticas nas três línguas, e
o `git diff` toca **um só ficheiro** — `es-ES` e `en` não foram abertos.

**E a sonda da ortografia prova-se a si própria:** zero achados lê-se de duas
maneiras — «está limpo» e «o detector está cego» —, e escrevem-se igual. Com
«Dispositivos activos» replantado, a sonda apanha **1**, e nomeia a chave.

`packages/i18n` **19 casos, 0 falhas** (inclui «os três idiomas têm exactamente
as mesmas chaves») · `pnpm verificar` **0**.

**Fica dito, e não fiz:** nada impede a regressão. A paridade de **chaves** é
guarda; a **ortografia** de cada língua não é medida por ninguém. É uma dúzia de
linhas no `i18n.test.ts` se quiseres — não avancei por ser lista delimitada.


## Correcção 1 do E34, encaminhada a mim — o fecho de caixa duplo

**Fechado.** O `fecharCaixa` lia o estado, fazia cinco validações e só depois
criava o evento — sem tranca. O estado **deriva do último acontecimento**, e
derivar é uma leitura, não uma trava.

**Primeiro escrevi a prova que falha, como mandado.** E ela passou à primeira
tentativa — com o defeito lá. `Promise.allSettled([fechar(), fechar()])` mede
**intenção** de concorrência: abrir uma transacção interactiva é ela própria uma
ida à base, e a primeira acabava antes de a segunda abrir. Um verde por
temporização é pior do que nenhum teste, porque diz que está protegido.

Medi-o com uma sonda à parte: `pid` 54579 e 54580, a segunda transacção aberta
**antes** de a primeira gravar, e **dois eventos FECHO** na mesma caixa, as duas
chamadas bem sucedidas. Com um **encontro** entre as duas transacções (ambas
abertas antes de qualquer uma ler) a corrida passou a ser determinista e a prova
ficou vermelha: `esperado 1, obtido 2`.

**A cura são duas coisas, e medi que não são a mesma dita duas vezes:**

| desligo | o que acontece |
|---------|----------------|
| só a tranca | o dinheiro fica certo (um FECHO) e **o ecrã fica errado**: `PrismaClientKnownRequestError` `23514` em vez de `RecusaDaCaixa` |
| só o gatilho | a prova em TypeScript fica verde — mas a **base** aceita dois FECHOS por SQL directo |
| os dois | dois FECHOS, as duas chamadas bem sucedidas |

Por isso a asserção da prova é sobre a **classe** da recusa e não sobre o texto,
e o controlo do gatilho entra por **SQL**, que é a porta que a tranca não guarda.

**E é um gatilho com tranca, não um índice único:** a caixa reabre com motivo e
um segundo ciclo TEM de poder fechar. O que é único é o fecho **por ciclo**, e o
ciclo não existe como coluna — escrevê-lo seria inventar um número que se deriva.

**Observação que fica, e não lhe toquei:** a rota do TPV traduz recusas com
`/^[A-Z_]+:/`, e uma `RecusaDaCaixa` sem detalhe tem a mensagem `CAIXA_FECHADA`
**sem dois pontos** — não casa, e o operador lê «erro» em vez do motivo. Vale
para todas as recusas de caixa sem detalhe, não só para esta.

`provar-caixa.sh` **0 falhas** (12 secções, os controlos 10 e 11 novos) ·
`validar-concorrencia.sh` **0** · `validar-rls.sh` **0** · `pnpm verificar` **0**.


## E35 — pacote de implantação e piloto (MEU, aguarda validação)

**Contrato** `docs/architecture/implantacao-e-piloto.md` e **régua**
`docs/reviews/ALVO-E35.md`, os dois escritos antes do código. **Zero telas** — é
a única etapa do projecto sem uma tela nova.

**O que muda:** todas as outras construíram o produto; esta constrói o caminho
até ele estar a funcionar numa casa. E é a primeira cujo contrato não foi escrito
por dedução — o sénior escreveu-o **depois de publicar o staging com nove
paragens**. Não há gatilho na base que impeça uma publicação errada: o que há são
**portões que recusam**, e um portão que ninguém prova a recusar é uma linha de
log.

**Os quatro portões** (`scripts/publicar.sh`, decisões em
`packages/domain/src/implantacao.ts` porque uma decisão em `bash` não se testa):
assinatura (`etapasPorValidar`), commit (`arvoreLimpa` + `git archive`, e o que
sobe existe em git porque não há outra maneira de lá chegar), segredos
(`podeSubir`), versão (`versaoQueResponde`, lida da etiqueta `bossaos.versao`
**pelo Docker e não através do produto**). **Preparar não é publicar:** sem
`--autorizado-por` prepara, prova e PARA, e a autorização vai nas palavras de
quem manda.

**Ensaio de restauração medido** a 06/09 06:19 UTC: **0,56 s**, com amostra
verificada (produtos=5, pedidos=9, movimentos=7, 5 gatilhos de stock repostos) —
e o guião **recusa** emitir RPO ou RTO a partir daí.

**Importação a seco que não abre ligação nenhuma**, com a lista de conferência a
sair antes de a casa aceitar, e o alergénio vazio a virar aviso `DESCONHECIDO` e
nunca «não contém».

**`docs/releases/pilot.md` com três estados** — feito, pendente, **não medido** —
e sem uma única célula em branco, medido com sonda negativa.

**⚠ O achado que pesa mais do que a etapa: reescrevi por cima do `publicar.sh`
e apaguei-o.** O ficheiro é do sénior, tinha corrido a sério, e levava a caixa, a
chave, a porta verificada à mão, o `--env-file .env.prod`, os papéis, a migração
e as duas metades do portão 4. O que escrevi era uma demonstração de portões que
**não publicava nada**, e só dei por isso a ler o `git diff` antes de commitar.
Original **reposto do git**, portões acrescentados **dentro** dele. Três coisas
minhas caíram por não caberem, e a que interessa é esta: **a árvore limpa como
portão estava errada** — o sénior não a exige de propósito (dois agentes na mesma
árvore), e a garantia é o `git archive`, não a regra. Ficou como aviso. A
etiqueta que eu tinha inventado não existe: é `bossaos.versao` em `bossaos_web`.

**E o medidor morre exactamente quando isto estiver pronto.** O `estado.sh`
rebenta se não houver etapa por validar; com `pipefail` e `set -e`, matava o
`publicar.sh` **antes da primeira linha de saída** — zero texto, código 1,
indistinguível de um portão a recusar. Apanhou-o a casa de mentira do controlo,
que tem as 36 validadas. Não mexi no medidor: a falha dele passa a **NÃO MEDI** e
o portão fica pela leitura directa da matriz.

**RETENÇÃO DO SÉNIOR PAGA — a regra e os dados nunca se encontravam.** O ponto
8 tinha duas metades que não se tocavam: o controlo contava `## Degrau ` contra
`**Plano de saída` no documento, e o `degrauPodeSubir` corria sobre objectos
inventados (`{nome:"x", saida:null}`). A regra estava certa e nunca via um degrau
verdadeiro. Ele mediu-o: esvaziou o plano do último degrau **deixando o cabeçalho
intacto** e o controlo deu `degraus=3 saidas=3`, verde. **Contar títulos mede que
alguém escreveu o título.** Cura: `lerDegraus` lê o documento e cada degrau passa
pela regra — e a `saida` sai do **texto**, não da presença do rótulo, senão
reproduzia o defeito que veio corrigir. População medida primeiro (3 degraus), a
sonda que tem de passar, o ficheiro adulterado dele a recusar, e o outro lado a
não acusar os degraus intactos. **Plante:** trocar a leitura por «tem rótulo,
logo tem plano» acende 4 falhas e reprova o `provar-implantacao.sh`.

**Provas (LOCAIS):** `packages/domain` **427 casos, 0 falhas** ·
`scripts/provar-implantacao.sh` **0 falhas** (cenário 0 que TEM de passar + os
quatro portões violados **à vez** + 4 controlos) · `ensaiar-restauracao.sh` **0
falhas** · detalhe e achados em `docs/progress/E35.md`.

**Pendências declaradas:** não há servidor de piloto (o portão 4 nunca leu uma
imagem a sério), não há casa piloto (nenhuma pessoa testada nos seis guiões de
formação), e não há RPO nem RTO porque não há calendário de cópias.


## E33 — assinado a 06/09 em `e953a87` (histórico)

**O que muda:** todas as outras deram poder a quem trabalha na casa. **Esta dá-o
a quem vende o sistema** — a nós. Até aqui protegemos o restaurante de enganos e
de estranhos; **aqui protegemo-lo de nós.** É a única etapa em que o atacante do
modelo de ameaça somos nós próprios a agir de boa fé e com pressa.

**As quatro condições da sessão de suporte, e nenhuma é decorativa.**
**Temporária:** `expira_em` é `NOT NULL` e não há coluna `activa` — estar viva
DERIVA de não ter fim e não ter expirado, porque um booleano é um estado que
alguém escreve e esquece de reescrever. **Visível ao inquilino:** RLS por
organização **para a casa a ver**, e é a única das quatro que não vive na base —
as outras são restrições, esta é um ecrã. **Com âmbito** e **com motivo**, os
dois com `CHECK`. E **a política é da casa**: não há rota da plataforma para a
mudar, e a ausência é a garantia.

**O rasto guarda a PESSOA, não o papel.** Um gatilho recusa `plataforma.%`
assinado por «suporte», «sistema», «bot». É o segundo gatilho do E28 virado para
dentro: a imutabilidade guarda a forma, isto guarda o sentido.

**O ACEITE QUE DECIDE — a fronteira do E05 sobrevive.** Esta é a etapa que traz a
interface de escrita das concessões, e a que teria mais tentação de a abrir pelo
lado de dentro. Não abre: o `REVOKE` está repetido pela terceira vez, e a escrita
passa pela `conceder_capacidade` `SECURITY DEFINER`, que escreve a concessão **e
a auditoria na mesma instrução**.

**Segurança, privacidade e exportação não ficam atrás do plano.** A única
fronteira que não é técnica, e por isso está em SQL: um gatilho recusa oito
capacidades protegidas. Numa constante do produto, muda-se num commit e ninguém
repara; numa migração, muda-se com nome, data e revisor.

**Provas (LOCAIS — a CI continua trancada):** `provas/plataforma.test.ts` **28** ·
`plataforma.test.ts` **29** · `scripts/provar-plataforma.sh` **7 controlos**
(verifica no fim as quatro permissões e os três gatilhos) ·
`inspeccao/plataforma.spec.ts` **25** (19 telas, 5 larguras, ES/PT/EN, 44 px,
WCAG) · `provar-plataforma-no-navegador.sh` **6 controlos** ·
`provar-separacao-de-credenciais.sh` **0** · `pnpm verificar` **0**.

**Detalhe e achados:** `docs/progress/E33.md`. O que mais vale a pena: o
`@default(uuid())` do Prisma é do lado do **cliente**, e há **93 tabelas** com
`id` UUID sem valor por omissão na base — invisível para quem escreve por Prisma,
e a primeira pedra em que tropeça quem escreve SQL directo.

## Retenção do sénior no E33 — a identidade do trabalho, corrigida

**Era omissão.** A identidade de um trabalho era `tipo:alvo:tentativa` com índice
único **global**, e duas casas que pedissem o mesmo colidiam: a segunda nunca
enfileirava. Copiei a forma da impressão do E31, onde funciona **porque o
`documento_id` é um UUID** — e aqui o `alvo` é texto livre.

Uma metade da premissa não se confirmou: `organization_id` é **anulável**, não
`NOT NULL`. É desenho (um trabalho global não é de casa nenhuma), e por isso a
cura leva `coalesce(org, 'plataforma')`.

Medido nas duas direcções: as duas casas passam a caber, e a mesma casa duas
vezes **continua a deduplicar** — que é o par que impede uma correcção de
destruir a razão de a fila existir. Controlo 8b novo, e a verificação final conta
a forma da identidade.


## A tabela do E10 — decisão revertida pelo sénior a 06/09

A `custom_domain_owners` **fica**, e sem RLS. O sénior verificou os três
argumentos e reverteu a ordem de a apagar. O ponto cego ficou escrito no E34: a
varredura de alcance lê TypeScript, e o chamador estava em **SQL** — dentro de
uma `SECURITY DEFINER`, que é precisamente onde vive a lógica que o runtime não
pode fazer sozinho.

A excepção continua declarada na `validar-rls.sh` **com a verificação do GRANT**
(secção 1b): o runtime tem `SELECT` e mais nada, e a guarda mede-o.

## As quatro correcções do E34 estão fechadas — 06/09

Não é etapa nova: são as quatro dívidas que a varredura de alcance do E34 deixou
escritas. **As duas guardas vermelhas que esperavam por elas estão verdes**, e
`validar-desfazer.sh` passa de **2 pares sem desfazer a ZERO**, em 447 substantivos.

**1. `revogarConvite` sem chamador.** A `ORG-007` listava os convites e a rota
não importava a revogação: um convite enviado para o email errado dava acesso ao
sistema de um restaurante e **só se esperava que caducasse**, com a janela a ser
o que alguém tivesse configurado. A rota passa a ter `DELETE`, com `equipa.gerir`,
auditoria `convite.revogado`, e um convite que já não está pendente devolve
**ausência (404)** e não erro — porque não haver o que revogar não é falha.

**2. `apagarExcepcao` sem chamador.** O mesmo defeito nos horários: uma casa
marcava fechado a 25 de Dezembro e não desmarcava. A rota ramifica em
`excepcaoApagar`, e a auditoria regista qual dos dois caminhos correu. **Também
abri a porta no ecrã** — ligar o motor sem a porta era deixar o caminho a existir
sem ninguém lhe chegar. Chave nova `excepcaoApagar` nas três línguas.

**3. As três portas mortas do menu da PLATAFORMA.** Suporte, Incidentes e
Auditoria estavam a `href: '#'`. Passam a `porConstruir: 'E33'`.

**E o `href: '#'` deixou de ser possível nesse item.** O tipo dizia
`href: string` **obrigatório** enquanto o comentário ao lado dizia «não tem
href»: o `'#'` não era descuido de quem escrevia o menu, era **a única forma de
o compilador aceitar o que se queria dizer**. `LigacaoDeNavegacao` é agora uma
união — ou ligação, ou marcador, nunca as duas nem nenhuma — e o compilador
recusa o estado errado antes de a prova de navegação lá chegar. Medido: o item
com as duas coisas dá `TS2322`; só-marcador e só-ligação passam.

**4. A tela pública dos alergénios reimplementava a regra.** Este era o pior dos
quatro, e não pelo tamanho. `validar-alergenios.sh` lê `packages/domain/src/
alergenios.ts`; a tela decidia o estado num encadeado de ternários próprio. **A
guarda vigiava o lado que não corre** — e a cobertura do domínio parecia boa
precisamente porque o teste exercitava a função que a tela não usava.

A cura não foi copiar menos: foi **tirar o segundo caminho**. `avisosPorAlergenio`
vive no domínio, é calculada **a partir** do `avisoDeSeguranca`, e a tela pede-lha.
Uma regra, um sítio, um caminho.

**Medido, e é o controlo que importa:** com `contem: de('CONTEM')` trocado por
`contem: []` no `avisoDeSeguranca`, a leitura passa de `gluten:perigo` a
`gluten:neutro` — um prato **com glúten** a mostrar-se como «ninguém declarou».
Antes desta correcção **esse defeito não conseguia chegar ao ecrã**: o plante
acendia no domínio e a pessoa alérgica continuava a ler o mesmo. Reposto, volta a
`gluten:perigo`.

E a guarda passou a vigiar o lado que corre: secção 4 nova, que reprova cópia da
regra em `apps/web/app/r/` **e** exige que a tela chame `avisosPorAlergenio` —
porque não copiar também se consegue não mostrando nada.

**E faltava metade, apanhada pelo sénior a 06/09.** A `avisosPorAlergenio` não
tinha **um único teste**. O `avisoDeSeguranca` tinha treze; a função nova, que é
a que decide o TOM e a que a tela chama, não aparecia em prova nenhuma. Tirar o
ternário da tela e pô-lo ao lado da regra melhorou a estrutura e **não mediu
nada** — a única diferença era passar a viver num módulo testado, o que faz a
cobertura parecer **melhor do que antes** enquanto a propriedade continua por
medir. É a forma do dia, e desta vez fui eu a produzi-la.

Grupo 5 no `alergenios.test.ts`: um caso por estado (quatro asserções),
`DESCONHECIDO` nunca partilha o tom de `NAO_CONTEM`, a ficha completa não perde
linhas, e um controlo negativo dentro do teste. **Medido com plante na função
real:** trocar o último ramo por `'sucesso'` acende **4 falhas, todas no grupo
5**, e nada mais; reposto, 326 a passar e 0 a falhar.

### Três guardas apanhadas de caminho, e uma delas era minha de há minutos

**`validar-portas-mortas.sh` acusou PROSA.** Reprovou o meu próprio comentário a
explicar porque é que o `href: '#'` era mau — castigou exactamente quem tinha
acabado de fechar as portas. Passa pelo `sem-comentarios.py`, e **o controlo
negativo cobre agora o caso que falhou**: a anónima acusa, a declarada não, o
comentário não.

**`validar-testes.sh` dava NÃO MEDI em `auth`, `config` e `db`** — numa árvore
sem defeito nenhum. O node 23 do ambiente escreve `ℹ pass 14` onde o node 22 do
projecto escreve `# pass 14`: mesmo facto, duas grafias, e a guarda só conhecia
uma. Mesma família das três aspas do `validar-alergenios.sh`. Lê as duas, com
controlo negativo que prova as duas **e** que a ausência continua a ser NÃO MEDI.
Os três pacotes passam a estar medidos: 12, 14 e 7 testes.

**`validar-dinheiro.sh` engolia o erro ao ler o schema** (`2>/dev/null` na linha
136), e `validar-silenciadores.sh` tinha-o vermelho. Se o schema desaparecesse, o
leitor de tipos dizia «não há tipo» para tudo — verde sobre nada. O ficheiro é
verificado uma vez, alto, e a falha aparece.

**E não deixei um silenciador novo:** o meu código chamava o `sem-comentarios.py`
com `2>/dev/null`. Se ele não corresse, a guarda lia zero linhas e dizia «0
falhas» — cega e verde ao mesmo tempo. Pré-voo em ambas as guardas, provado a
mexer: sem o leitor, saída **1**; reposto, **0**.

**Estado das guardas:** 24 de 25 verdes; a 25ª é a `validar-handoff.sh`, vermelha
só enquanto isto estiver por commitar. `pnpm verificar` **0** (medido pelo código
de saída, não pela ausência de texto no ecrã).

**Fica por fazer da lista do E34:** o `leadsDaUnidade` — escrever sem ler. Não
estava nas quatro, e não lhe toquei.

## ⚠ PENDÊNCIA DE MÁQUINA — `pnpm inspeccionar` não correu sobre esta árvore

`mac-health.sh` dá **PERIGO**: 3,1 GB disponíveis, 61 MB livres, uma aplicação de
2,7 GB aberta. **Três corridas do portão foram mortas a meio por falta de
memória** — nenhuma com teste vermelho. Não lancei a inspecção completa nesse
estado e **não uso o número da corrida anterior**, que é anterior aos consertos
desta fatia.

E a interrupção deixou rasto: um plante do guarda de classes ficou no
`catalogo/page.tsx`. Reposto do git, e os outros modificados varridos — nenhum
mais. **Um guião morto a meio deixa o artefacto com o defeito plantado.**

**Contrato:** `docs/architecture/relatorios-e-agregacao.md` (do sénior, por fronteira).
**Detalhe:** `docs/progress/E30.md`.

## ⚠ PENDÊNCIA DECLARADA — sem contabilidade legal e sem leitor de formatos

Taxas, impostos e percentagens são **configuração**, não regra inventada pelo
produto. E a importação recebe linhas em texto cru
(`AAAA-MM-DD;montante;referência`): inventar um leitor de OFX ou CAMT agora era
prometer que se lê o que não se leu.

**Contrato:** `docs/architecture/conciliacao-e-fecho.md` (do sénior, por fronteira).
**Detalhe:** `docs/progress/E29.md`.

## ⚠ PENDÊNCIA DECLARADA — não há cálculo de salário

Guarda-se e mostra-se **tempo**. Converter tempo em dinheiro é convenção laboral,
e escrever uma que não foi verificada seria o erro do E24 outra vez, num sítio
onde custa mais.

**Contrato:** `docs/architecture/ponto-e-escalas.md`, escrito antes do código.
**Detalhe:** `docs/progress/E28.md`.

## ⚠ PENDÊNCIA DECLARADA — não há provedor de envio

Nem email nem SMS. Os envios ficam gravados como `POR_ENVIAR`, e a tela di-lo por
palavras. **Isto não enfraquece o que interessa provar:** a recusa acontece na
GRAVAÇÃO, que é o passo que existe, e não no despacho, que não existe.

**Contrato:** `docs/architecture/consentimento-e-campanhas.md`, escrito antes do código.
**Detalhe:** `docs/progress/E27.md`.

## O texto anterior, mantido por baixo — HISTÓRICO, não estado

> As linhas abaixo descrevem etapas **já assinadas**. Ficam para se ver a
> sequência, e nenhuma delas é o estado de agora. O estado está no topo, e vem
> de `scripts/estado.sh`.


**Etapa atual:** E24 — documentos e integração fiscal (**5 telas**).
**Estado (histórico, E24):** foi retido por alcance, consertado e **assinado**.

**A retenção:** o ciclo do documento fiscal não tinha porta, e arrastava a dívida
do E23 — `receberWebhook`, `reconciliarComProvedor` e `acontecimentosDaConta`
também sem chamador. Nenhum webhook do adquirente podia chegar ao produto, e a
`provar-adquirente` jurava que o reenvio deduplicava **numa porta que não
existia**.

**Duas portas novas:** a do webhook (fora de `/api/org/`, porque o adquirente não
tem sessão — a credencial é a assinatura, o corpo lê-se cru, e responde-se 200
depois de gravar para o adquirente não martelar a porta) e as quatro acções do
ciclo fiscal na rota do TPV, com botões só onde fazem sentido.

**A excepção da guarda não dispensa, troca:** o contador subiu de 5 para 6
conscientemente, e em troca há um caso que verifica a assinatura, o corpo cru, a
ausência de `.json()` e o segredo vindo do ambiente.

**E a prova mede o ALCANCE:** `provar-portas-do-dinheiro.sh` (**10 casos, 8
controlos**, 0), com cada plante a apagar a **chamada** e não o comportamento.
`varrer-alcance-da-etapa.sh 2c1a18f HEAD` → **1 sem chamador**, o `esquecerPrisma`
do E01. O intervalo inteiro do E23 dá o mesmo único.
**Régua:** `docs/reviews/ALVO-E24.md` · **Fontes:** `adr/0002-fiscal-espanha.md`.
**Detalhe:** `docs/progress/E24.md`.

## ⚠ PENDÊNCIA EXTERNA — antes do primeiro talão a um cliente real

**Os requisitos concretos do regime têm de ser confirmados na fonte por quem
tenha acesso e responsabilidade.** Não foi lida a Orden HAC/1177/2024 — a que traz
o formato do registo, o conteúdo do QR e o algoritmo —, não há fornecedor
homologado contratado, e a classificação fiscal da entidade do piloto não está
confirmada. Está no ADR em destaque **e nos ecrãs**: INT-006, POS-020, POS-021 e
CAT-021 dizem-no por palavras.

**Fui às fontes e escrevi de onde tirei.** Duas consultas a 2026-09-05: a página
da AEAT (dá os diplomas, **não** dá prazos nem requisitos técnicos) e o texto
consolidado do RD 1007/2023 no BOE — encadeamento por parte do hash do anterior
(**10.1.ñ**), QR obrigatório (**6.5.a**), a frase «VERI\*FACTU» só para quem
remete (**6.5.b**), e os prazos **2027-01-01** e **2027-07-01**. O piloto cai no
segundo.

**Construiu-se a FORMA, não o formato.** Só é documento fiscal o que está
`ACEITE` **e** com número do fornecedor; emitir duas vezes devolve o mesmo e uma
correcção é documento novo com os dois a ficar; a rejeição é estado com motivo
obrigatório; e apagar, mudar o que identifica o documento ou fazer um aceite
voltar atrás são recusados **por gatilho**.

**Achado que vale para lá desta etapa:** apanhar a colisão de um índice único
**dentro de uma transacção** não serve — o Postgres aborta-a e tudo o que venha a
seguir falha com `25P02`. Passou a `ON CONFLICT DO NOTHING`. O E23 usa a mesma
forma e **funciona por acidente**, porque não há nada depois do `catch`; ficou
anotado no código.

**E três lições sobre medir:** um controlo que cai não é um controlo que mede
(o da identidade era bruto demais e fazia tudo falhar); sem a guarda do motor a
recusa continua a acontecer pela base — **degrada-se a legibilidade do erro, não
a segurança**; e **medir o comprimento de um texto não é medir o que ele diz** —
o rótulo «Motivo del rechazo» sozinho satisfazia a asserção.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-fiscal.sh` (**20 casos, 8 controlos negativos**, 0) ·
`./scripts/provar-fiscal-no-navegador.sh` (**23 casos, 8 controlos**, 0) ·
`./scripts/provar-portas-do-dinheiro.sh` (**10 casos, 8 controlos**, 0) ·
`pnpm inspeccionar` (**609 casos, 0**). Prova **LOCAL**.

---

**Etapa atual:** E23 — pagamentos, webhooks e reembolsos (**12 telas**).
**Estado:** **IMPLEMENTADO, AGUARDANDO VALIDAÇÃO — as duas fatias.**
**Régua:** `docs/reviews/ALVO-E23.md`, escrita **antes de existir código**.
**Detalhe:** `docs/progress/E23.md`.

**A identidade é a do ACONTECIMENTO, e a garantia é um índice** — não há «procura
e se não existir insere», porque entre a procura e a inserção cabe o segundo
processo. O par: o mesmo acontecimento duas vezes tem **um** efeito, dois
acontecimentos diferentes têm **dois**.

**Não há máquina de transições.** Guarda-se o estado que o provedor autoriza com
o instante que **ele** carimbou, e o estado deriva-se do conjunto: a ordem de
chegada não decide porque **não entra na conta**. A devolução que chega antes da
captura não se perde nem se inventa.

**A assinatura verifica-se antes de qualquer efeito**, com `timingSafeEqual`,
sobre o corpo **cru**, e a recusa **não diz porquê** — um erro que explica o que
faltou à assinatura é um manual de como a forjar.

**O segredo não tem onde morar na base:** a tabela do conector não tem coluna
para chave, e há uma prova que as procura no `information_schema` e exige zero. O
conector **não liga sem provedor E merchant**, por `CHECK`.

**Dois achados, e os dois são da prova.** O meu controlo da ordem não plantava o
defeito que descrevia — trocava duas *leituras*, e a assinatura continuava a ser
verificada antes de escrever. E ao consertá-lo vi que **a transacção nos protege
por acidente**: o `throw` desfaz a escrita, mas isso é desenho de outra camada, e
no dia em que um efeito sair da transacção a protecção desaparece sem ninguém
tocar nesta função. **E a varredura das duas ordens não tinha guarda** que
notasse se as duas fossem a mesma — pus o plante a correr a mesma ordem nas duas
voltas e a suite ficou verde.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-adquirente.sh` (**21 casos, 8 controlos negativos**, 0) ·
`./scripts/provar-pagamentos-no-navegador.sh` (**24 casos, 7 controlos**, 0) ·
`pnpm inspeccionar` (**589 casos, 0**).

**As 12 telas.** As três públicas ficaram em `mesa/` e não em `menu/`: medi, e
`menu/` é a carta ANÓNIMA enquanto `mesa/` é quem está sentado com sessão de
visitante — um ecrã de pagamento na carta anónima seria pagamento sem sessão. O
comprovativo lê por porta estreita com `search_path` fixo e leva um identificador
**opaco**, não o `id` do pagamento. A STATE-011 **não tem botão de tentar outra
vez**: diz o contrário. E onde não há adquirente **não há botão** — o cartão não
aparece esbatido, não aparece.

**O achado que mais vale: três telas estavam contadas na população e nunca eram
visitadas.** A contagem dizia 12 e os ciclos de largura, toque, contraste e
idioma corriam sobre 8. **Uma tela contada e não medida é pior do que uma tela em
falta** — a contagem afirma que está coberta. E não o vi a ler código: vi-o
porque um controlo negativo ficou **verde**, com a guarda de população a contar
pagamentos em vez de medir o que eles mostram. Passou a exigir a **gorjeta
visível**, porque uma gorjeta a zero é indistinguível de «a gorjeta nunca
aparece».

**A guarda das rotas apanhou-me duas vezes.** O leitor do comprovativo tocava na
base sem resolver sessão — foi para `src/visitante/`, que é melhor sítio do que o
que eu tinha escolhido. E depois disparou sobre o nome proibido escrito no meu
**comentário**: ela não distingue código de comentário, ao contrário da
`validar-dinheiro.sh`, que já resolveu isto com o `sem-comentarios.py`. Fica
**declarado**; não mexi numa guarda assinada.

**E o alvo de toque, três vezes na mesma etapa:** `<a>` cru fica com 24 px. Três
vezes já não é distracção.

**PENDÊNCIA DECLARADA:** não há credenciais de adquirente nenhum. Está
implementada a **porta** e as provas determinísticas; a integração fica
**pendente** e o pagamento real **não** está declarado pronto. Nada finge ter
falado com um provedor.

---

**Etapa atual:** **AS PORTAS** — a condição que o E21 pôs para reabrir o marco do
Restaurant. Não é uma etapa; é o que falta antes do E23.
**Estado:** **IMPLEMENTADO, AGUARDANDO VALIDAÇÃO.** Detalhe em
`docs/progress/PORTAS.md`. Contrato: `docs/architecture/portas-e-navegacao.md`.

**O E22 fechou com o TPV a ter porta e mais nada.** O menu ainda levava dez
entradas em `href: '#'`, e entre elas **reservas** — as 34 telas assinadas — e a
**sala inteira**. Um restaurante que chega à caixa e não chega às reservas não se
usa.

**Seis módulos entregues passaram a ter porta:** catálogo, reservas, sala e
pedidos, takeaway e entrega, relatórios, e a caixa que já a tinha. A escolha saiu
de **medir a matriz** por família de rota — e foi essa medição que mostrou que o
`relatorios` estava marcado como por construir **e não estava**: as REP-001 a 008
são do E14 e estão validadas desde então. Eu ia escrever «E29» ao lado de um
módulo que já existe.

**Uma regra, e não uma por módulo.** Quatro dos seis vivem dentro de uma unidade
e o contrato exige um sítio onde a unidade se escolha — isso seriam quatro
páginas quase iguais, que são quatro regras no dia em que uma mudar. Há uma só,
`/app/<org>/ir/<modulo>`, e um módulo fora da tabela dá **ausência**.

**O `#` legítimo passou a ser outra coisa.** Era um `<a href="#">`: com cursor de
mão e apanhável por `getByRole('link')` — parecia uma porta. Agora é um campo
próprio, `porConstruir`, sem `href`, esbatido e com a etapa ao lado. Ficam
**inventário → E25** e **clientes → E27**.

**Duas coisas ficam DECLARADAS por não darem para marcar honestamente:** nenhuma
das 396 telas do atlas é o painel de topo do inquilino — o `início` ficou com o
E30, que é a atribuição menos certa das quatro; e `trabalho`/`mais` na barra do
telemóvel não existem em etapa nenhuma, por isso não são marcadores mas restos —
a barra passou a levar três destinos reais.

**A prova mede o CAMINHO e o plante estraga o MENU, nunca a tela** — é a única
forma de não medir outra vez a existência da tela, que já está medida vinte
etapas atrás. Dois consertos meus pelo caminho: a chegada media-se por
`data-tela`, que **só existe em 61 ficheiros** e que a raiz da sala, do catálogo e
dos relatórios nunca adoptou (exigi-lo era exigir que esses módulos mudassem para
a prova passar), e o matcher esperava a frase da asserção de visibilidade quando
quem dispara é a que compara o `href`.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-portas.sh` (**11 casos, 7 controlos negativos**, 0) ·
`pnpm inspeccionar` (**568 casos, 0**).

---

**Etapa atual:** E22 — TPV, contas e caixa (**19 telas**).
**Estado (histórico):** retido, consertado e **assinado**. Declarado
pelo JR; não assinado.

**A retenção foi UMA coisa, e não era do dinheiro: as 19 telas não tinham porta.**
Zero `href` para `/pos/` em todo o produto, e o item «caixa» do menu em `#`. As
telas ligavam-se entre si e faltava a primeira — ninguém com sessão iniciada
chegava ao TPV sem escrever o endereço à mão. «Uma tela provada a que ninguém
chega é uma tela que não existe», e o contrato `portas-e-navegacao.md` que o diz
foi escrito **antes** desta entrega, depois de o E21 ter reprovado o marco do
Restaurant exactamente por aqui.

**O conserto:** a POS-001 passou de `/pos/[locationId]/operador` para `/pos` — a
entrada do módulo, com a escolha de unidade que o contrato exige. O nome dela no
atlas é «Entra en tu caja»: descrevia a entrada desde o princípio e eu tinha-a
feito ser outra coisa. O item «caixa» do menu deixou de ser `#`, **e só esse** —
as outras entradas são módulos de etapas que ainda não existem, que é o `#`
legítimo do contrato; não toquei na navegação do `/app/`.

**E a prova mede o CAMINHO, não a tela.** Um único `goto`, para onde a sessão
aterra; daí em diante tudo por cliques — menu, entrada, escolha de unidade, tela
de trabalho — com guarda de leitor cego sobre o endereço final. O controlo
negativo é o que o contrato nomeia: repor o `#` e a prova acende. É o único
controlo da suite que não mexe numa tela: mexe no menu, e as 19 continuam lá.
**Régua:** `docs/architecture/dinheiro.md`, escrita no E00 **antes** desta etapa,
e CT-11. **Detalhe e achados:** `docs/progress/E22.md`.

**Quatro entidades, e nenhuma colapsada.** A conta é a obrigação; a tentativa saiu
daqui; o pagamento é o confirmado; a devolução não é um pagamento negativo. O
pagamento **não tem estado** — existir É estar confirmado, porque um `Payment`
com `estado = falhou` seria dinheiro que se desconta a somar.

**O estado da conta e o da caixa NÃO são colunas.** Derivam-se — dos pagamentos e
dos acontecimentos. O devido deriva-se por gatilho das linhas menos os ajustes. É
a mesma decisão da posição na lista de espera do E19: sem coluna, ninguém
consegue mostrar um número errado.

**Na caixa, o único número que um humano escreve é o CONTADO.** O esperado sai dos
movimentos e a diferença é a subtracção — e a prova procura uma coluna de
diferença no `information_schema` e exige **zero**, porque uma diferença guardada
é uma diferença que se pode editar até dar zero. Os movimentos **não têm coluna
de meio de pagamento**: tudo o que lá está é dinheiro, e isso não é uma regra, é
uma coluna que não existe.

**O achado que mais vale: a recusa da concorrência era da BASE, não do negócio.**
Apaguei o limite do devido e o caso ficou verde. Medido: com `Serializable` +
cadeado a segunda cobrança cai com `40001`, porque o Postgres tira o retrato da
transacção na **primeira instrução** — o `set_config` do escopo — e quando o
segundo chega ao cadeado o retrato já é anterior ao commit do primeiro. **O
cadeado fá-lo esperar; não o faz ver.** E `40001` diz «tente outra vez», que numa
sala cheia gera chave nova: o caminho por onde se cobra duas vezes. Em
`READ COMMITTED` recusa com `EXCEDE_O_DEVIDO`, e a prova passou a exigir o motivo.

**Imutável sem reversão não é rigor, é uma armadilha.** O gatilho impedia apagar
um ajuste — e bem — mas um desconto por engano ficava para sempre. A correcção é
um registo novo que aponta para o que anula, com índice único.

**O ALCANCE foi verificado ANTES das provas**, como o sénior fez no E20. Havia
**quatro máquinas construídas, provadas e sem chamador** — `juntarLinhasDoPedido`,
`reconciliar`, `corrigirMovimento` e `dividirPorPesos`. Era a retenção do E19
outra vez. Estão ligadas; a medição dá zero órfãs.

**Três defeitos meus no ARNÊS, e os três faziam ausência de medição parecer
sucesso:** um plante cujo `assert` falhava e o guião seguia sem `set -e`, correndo
a suite com o ficheiro intacto; um `exigir_vermelho` que não distinguia «ficou
verde» de «caiu no caso errado»; e um guião que morria no arranque — o bash do
macOS é o 3.2 e não tem `declare -A` — e saía com código **0**. Há agora uma
guarda `CHEGOU_AO_FIM`, provada a acender com uma morte simulada.

**E a guarda do dinheiro estava cega aos campos desta etapa.** `devidoMenor`,
`unitarioMenor` e `recebidoMenor` não têm nenhum dos substantivos da lista dela.
Passou a reconhecer pela **forma** — o sufixo `Menor`, que a própria `dinheiro.md`
manda — e subiu de 10 para 13 campos. O controlo negativo dessa secção, que nunca
existira, destapou um segundo buraco: o padrão exigia espaço depois do tipo, e
`devidoMenor Float` no fim da linha passava.

**Portões, códigos de saída lidos directamente:** `pnpm verificar` (**0**) ·
`./scripts/provar-contas.sh` (39 casos, **9 controlos negativos**, 0) ·
`./scripts/provar-caixa.sh` (19 casos, **8 controlos**, 0) ·
`./scripts/provar-tpv-no-navegador.sh` (19 telas, **25 casos**, **9 controlos**, 0) ·
`./scripts/validar-dinheiro.sh` (13 campos, 2 controlos, 0) ·
`pnpm inspeccionar` (**560 casos, 0**).

**PENDÊNCIAS DECLARADAS, e nenhuma simulada:** **nenhum provedor de pagamento
real** — não há webhook, não há assinatura verificada, `CARTAO` é um meio
registado e não uma integração, e o ecrã diz isso por palavras. E **nada de
fiscal**, que é o E24: não há recibo que se pareça com documento fiscal.

**A prova foi LOCAL.** A CI continua trancada por facturação do GitHub.

**O E18 ficou VALIDADO** a 05/09 em `cfafed7` — 6 telas, 13 asserções no motor e
19 nas telas, 17 controlos negativos. Passámos os 50 por cento das telas.

**O E17 ficou VALIDADO** a 04/09 — 16 telas, prova **local**, 17 controlos
negativos, e com ele passámos metade das telas do produto: 213 de 396. Levou
consigo uma correcção de arnês transversal: o fecho da semeadura reconhecia o seu
lixo pelo nome, os **pedidos** entram pela porta real com número da sequência, e
398 ficaram na base a prender as estações — com a auto-verificação, calibrada
pelo mesmo crachá, a dizer «nada ficou para trás» de cada vez.

**O E16 ficou VALIDADO** a 04/09 no commit `69fe63b` — 20 telas, prova **local**,
com **17 controlos negativos** entre as duas provas. Detalhe em `docs/reviews/E16.md`.

**O E15 ficou VALIDADO** a 04/09 no commit `4ffc913` — 23 telas, prova **local**.
Leva uma correcção de uma linha: o marcador `[data-tela]` por tela não consegue
falhar, porque a navegação escreve o id das 19 secções em todas as páginas.
Ancorar ao cabeçalho (`h1[data-tela=...]`). Detalhe em `docs/reviews/E15.md`.

**A prova foi LOCAL.** A CI continua trancada por facturação do GitHub, e nada
desta etapa correu lá. Quem validar escreve isso.

**O que está pronto para medir:**
`pnpm verificar` (0 falhas) · `./scripts/provar-fila.sh` (11 grupos, 24 casos,
10 defeitos plantados) · `./scripts/provar-staff-no-navegador.sh` (26 casos, 5
defeitos plantados no artefacto real) · `pnpm inspeccionar` (398 casos verdes).

**Três defeitos que só a prova de navegador viu**, e estão escritos no E15.md: as
suspensas eram sempre zero no produto, o índice do STAFF-022 tinha alvos de
22 px, e a recusa de pagamento não olhava à rede — com o caso de prova a dar
verde com a rede **ligada**. Mais um na guarda `validar-classes.sh`, que não lia
`apps/web/src/` desde o E02.

**O E14 ficou VALIDADO** a 04/09 — 18 telas, e a prova foi **local**, porque a CI
está trancada por facturação do GitHub. O resto deste ficheiro é o contexto do
E14 e continua a valer: o que mudou foi a etapa, não o que ali está escrito.

**Dezoito e não vinte:** a matriz tem 18 com `etapa_principal = E14`; as outras 3
que a autorização menciona (CAT-010, CHAN-001, FLOOR-008) estão em
`etapas_relacionadas` — telas anteriores a rever, já validadas.

**Os três aceites são três formas de duas escritas se encontrarem**, e as
garantias estão na FORMA:
1. `order_submissions.command_id` **único na base** — o reenvio depois do commit
   devolve a MESMA resposta. O par: duas chaves diferentes criam dois pedidos.
2. As linhas são **acrescentadas**, nunca reescritas em bloco — o padrão que perde
   trabalho não tem por onde acontecer. A versão optimista é só para as edições, e
   o conflito é **recuperável**: diz o que mudou, por quem, e devolve as linhas.
3. O preço é **copiado** para a linha ao ser aceite, com um **gatilho** na base a
   recusar alterá-lo. O esgotado é rejeitado **com o carrinho preservado**.

**A pergunta de dinheiro está RESPONDIDA:** um pedido escrito offline e aceite
mais tarde vale o **preço do servidor ao aceitar** — porque o preço do cliente é
uma proposta, e o E14 proíbe pelo nome que ele mande. E a divergência **não é
aplicada em silêncio**: a linha é rejeitada com `PRECO_DIVERGENTE` e o carrinho
fica, para quem está à mesa decidir. Fica **por decidir e declarado** se o
restaurante quer honrar o preço antigo — isso é política comercial do dono.

**Combos:** a conta soma **uma** vez, em três portas que falham por motivos
diferentes (restrição na base, `totalDoPedido`, filtro dos relatórios).

**Comandos do E14:** `./scripts/provar-pedidos.sh` (3 grupos, 21 casos, 8 defeitos
plantados) e `pnpm exec playwright test pedidos.spec.ts` (18 telas, 5 larguras).

---

## O que fechou antes

**E13 VALIDADO à 2ª** — 17 telas. `docs/progress/E13.md`.

**E11 — MARCO DO STARTER APROVADO à 2ª.** Reprovado à 1ª com seis falhas, todas de
medição e duas de assinatura minha. Fechadas e **reprovadas por comando**:
`scripts/provar-marco-e11.sh` responde às seis pelo nome. `docs/reviews/E11.md`.

**E10 VALIDADO à primeira** — 04/09. 29 telas. `provar-sites.sh` com 11 passos, 27
casos e **8 controlos negativos**, incluindo o `catch` largo que esconde falha real
de gravação e a **regra preguiçosa** dos domínios. O revisor correu ele próprio os
**254 casos de navegador** em vez de aceitar a declaração. `docs/progress/E10.md`.

**Dívida de móvel do E09: PAGA.** As 5 telas que tinham a assinatura retirada por
nunca terem sido renderizadas foram medidas no navegador e a assinatura foi
restaurada. Era a condição bloqueante do marco.

**E09 VALIDADO à 2ª** — 04/09. Retido por uma medição que via uma só forma de exportar um
verbo; fechado com detector largo, e os **três ataques independentes do sénior** (sem
espaços, `export { h as POST }`, `satisfies`) apanhados. E a regra nova do contrato: o
endereço público não volta ao mundo, com o par que o distingue da regra preguiçosa.
`docs/progress/E09.md`. **Pendência declarada:** as 11 telas sem prova de móvel.

**E08 validado à 2ª** — retido por uma protecção que não conseguia falhar (`redirect:
'manual'` sem um único teste a vigiá-la). `docs/reviews/E08.md`.

**E07 validado à primeira** — a maior das 36 e a terceira seguida a passar sem segunda
volta. `docs/reviews/E07.md`.

**E06 validado à 2ª** — a 1ª validação foi **retirada pela CI**: a cadeia de migrações não
se aplicava do zero, porque uma migração E05 tinha carimbo posterior a uma E06 que dela
dependia. Corrigido renomeando, com `provar-migracoes-do-zero.sh` na CI.

**E05 validado à primeira** — a primeira etapa a passar sem segunda volta.

**E04 validado às 17h45**, à 3ª volta. Reprovado à 1ª (o aceite 3 declarado e não
demonstrado; `packages/auth` a zero sem declaração), retido à 2ª (o registo contradizia-se e
a contagem dizia 91 em vez de 127). Fechado em `370251c`.

**Como o E05 começou antes de ser autorizado, escrito para não ser descoberto por
acidente** — que é o que a regra do `RETOMAR-JR.md` pede:

Entre as 15h21 e as 17h14 o sénior esteve indisponível (sobrecarga do lado do modelo). O
Matheus pediu-me explicitamente para assumir e seguir — *"assume o controle voce agora"*,
*"liga voce o motor e toca ficha no bossa"* — e eu segui, com cinco commits: `f1568fe`,
`3bf1319`, `d0ef2a8`, `adde253` e `1e9b351`. O sénior reviu a atribuição e retirou o tom de
infracção; o que fica, e não depende de culpa, é que **a revisão do E04 teve de medir o
commit `11515f1` em vez da árvore**, porque a árvore passou a ter código de outra etapa.

**O que eu devia ter feito e não fiz:** escrever isto aqui no momento em que decidi, e não
duas horas depois quando o revisor voltou. O trabalho adiantado não é o problema; ele ser
descoberto por acidente é.

Os commits ficaram onde estavam, por decisão do sénior. O E05 foi autorizado às 17h45, com
o `ALVO-E05.md` escrito antes — e com uma declaração de honestidade à cabeça dele, porque
desta vez a régua **não** precedeu todo o código e dizê-lo é o que a mantém útil.

| Etapa | Estado |
| --- | --- |
| E00 — contrato e leitura das fontes | **validado a 05/09, julgado pelo JR** (`docs/reviews/E00.md`), com veredicto dividido. 27 contratos em `docs/architecture`. Quem os escreveu não os validou — foi para isso que se montaram dois. |
| E01 — repositório e verificação contínua | **validado** · `docs/reviews/E01.md` |
| E02 — design system, responsividade e idiomas | **validado** à 2ª · `docs/reviews/E02.md`. A 1ª revisão apanhou o acento a pintar um indicador de estado a 2,77:1; corrigido com `acentoSinal` e uma guarda de lista de permissão. |
| E03 — estrutura multi-tenant e isolamento | **validado** à 2ª · `docs/reviews/E03.md`. A 1ª revisão apanhou o verificador a dizer verde com zero medido; corrigido, e a mesma guarda aplicada às outras provas. |
| E04 — autenticação, convites e permissões | **validado à 3ª** · `docs/reviews/E04.md` |
| E05 — planos, entitlements e identidade Starter | **validado à 1ª** · `docs/reviews/ALVO-E05.md` |
| E06 — onboarding e configuração do restaurante | **validado à 2ª** · `docs/progress/E06.md`. A 1ª validação foi retirada pela CI: a cadeia de migrações não se aplicava do zero. |
| E07 — catálogo, produtos, preços e opções | **validado à 1ª** · `docs/reviews/E07.md` |
| E08 — média, traduções, importação e publicação | **validado à 2ª** · `docs/reviews/E08.md` |
| E09 — carta pública e QR de consulta | **validado** · `docs/progress/E09.md`. As cinco telas internas da dívida de móvel saíram pagas no E10. |
| E10 — sites dos restaurantes e landing | **validado** · `docs/progress/E10.md`. 29 telas, medidas em cinco larguras. |

**Primeiras telas.** O E02 é a primeira etapa que toca `coverage.csv`: STATE 001-003,
005, 007 e 016. Até aqui o medidor de telas esteve a 0 % e isso era verdade, não uma
avaria — E00 a E01 são transversais e não entregam vista nenhuma. Estão agora a
**validadas**; `scripts/validar-cobertura.sh` diz "Cobertura íntegra".

## E02 — o que existe agora

`packages/ui` (fichas medidas, contraste WCAG, validação de tema no servidor, 11
componentes, 5 estruturas) e `packages/i18n` (es-ES · pt-BR · en, moeda em unidades
mínimas inteiras). Catálogo de inspecção em `/[idioma]/interno/catalogo`, fora das rotas
comerciais; as cinco molduras em `/[idioma]/interno/estruturas/[qual]`.

**69 testes unitários + 69 verificações no browser, 0 falhas.** A inspecção (Playwright,
só Chromium) corre as cinco larguras do aceite, mede contraste de texto **e de indicadores
de estado** no DOM, e prova a armadilha de foco e o regresso ao accionador. Entrou na CI.

**O que a 1ª revisão apanhou, e como ficou.** O sublinhado do separador activo estava
pintado com o Coral Bossa a 2,77:1 sobre a areia — indicador de estado, precisamente o uso
que o meu próprio aviso dizia não poder acontecer. Duas correcções: `acentoSinal`
(`#D85A44`, 3,50 / 3,30 / 3,84 nas três superfícies claras) mais um segundo sinal que não é
cor (peso 700 contra 600); e `acento.test.ts`, uma guarda de **lista de permissão** que
reprova o acento em qualquer papel visual sem justificação escrita, provada com seis
plantações. A segunda plantação apanhou um buraco na própria guarda — uma pseudo-classe
partia o leitor de propriedades — que sem o controlo negativo teria sido entregue.

A lição que fica: **um aviso diz, não impede.** Uma regra sem detector é uma intenção.

Três achados que mudaram código, dos nove em `E02.md`:

- **A minha regra de contraste reprovava a paleta da própria BossaOS.** O Coral Bossa
  sobre a areia dá 2,77 — está publicado no manual. Passou a aviso: a WCAG pede 3:1 a
  gráficos que carregam informação, não a decoração editorial.
- **As fichas de cor do E01 estavam escritas de memória** e seis das oito estavam erradas.
  Há agora um teste que compara o CSS com o TypeScript token a token.
- **CSS que nenhum componente rende não dá erro nenhum** — a barra inferior do telemóvel
  estava escrita e invisível. Escrevi a guarda que apanha classes órfãs e provei-a.

**A comparação com o atlas rendeu quatro correcções** e uma divergência mantida de
propósito (a acção repetida no topo só existe acima de 768 px, como o atlas móvel).

## E03 — o que existe agora

Seis tabelas (`organizations`, `brands`, `locations`, `users`, `memberships`,
`role_assignments`) com **referências compostas** — a base recusa apontar para a unidade de
outra organização — e políticas de linha com `USING` **e** `WITH CHECK`.

**A prova está a 0 falhas, e o controlo negativo funciona**: desligadas as políticas, os
casos 2 e 3 ficam vermelhos e o caso 3 passa a ver as duas marcas. `./scripts/provar-isolamento.sh`,
com o papel real de runtime (`rolsuper=false`, `rolbypassrls=false`, confirmado no arranque)
e também pelo Prisma, porque uma política certa com um ajudante errado vaza na mesma.

O contexto não é convenção, é **tipo**: `comEscopo()` é o único sítio que fabrica um
`ClienteComEscopo` e os repositórios só aceitam esse — passar o `PrismaClient` solto não
compila. Provado enfraquecendo o tipo e vendo o `tsc` ficar vermelho.

**85 testes unitários + 28 asserções de isolamento, 0 falhas.** `coverage.csv` **não mexeu**,
que é o correcto numa etapa sem telas, e há uma verificação no fim do varrimento que o diz.

**A CI já correu e está verde** (commit `ff48eb4`, máquina limpa, base do zero, 3m10, com o
passo do isolamento). A pendência que arrastei do E01 ao E03 deixou de ser verdade.

**O que a 1ª revisão apanhou:** o `provar-isolamento.sh` olhava para o código de saída e
imprimia as contagens sem nunca exigir que fossem maiores que zero — num Node cujo relator
é `spec` e não TAP, dizia "0 grupos verdes" **em verde**. Fechado com três coisas: o passo
1 exige 7 grupos e 28 asserções, o formato passa a ser pedido explicitamente (e a versão do
Node verificada à cabeça), e há um controlo negativo do próprio controlo negativo com cinco
verificações. A mesma guarda foi aplicada às outras duas provas, que contavam falhas e não
verificações.

Três achados que mudaram código, dos seis em `E03.md`:

- **Depois do COMMIT o contexto volta a cadeia VAZIA, não a NULL** — e `''::uuid` rebenta.
  O `NULLIF` que eu tinha posto por precaução é o que impede um erro duro em todas as
  consultas seguintes de uma ligação de pool já usada.
- **O controlo negativo corrompeu as fixtures**: com a política desligada, as escritas
  passaram e moveram a marca de A para B. Causa de fundo: um `assert.rejects` que falha
  **atira**, e o `ROLLBACK` da linha seguinte nunca corre — a transacção fica aberta e um
  `COMMIT` posterior grava o que o teste provava não poder acontecer.
- **A guarda de rotas apanhou a raiz de composição** e, ao declará-la como excepção, mostrou
  a porta lateral que ela abria: qualquer rota podia importar o `obterBase` dela.

## E04 — o que existe agora

Acesso real. Entrar, sair, recuperar, segundo factor, convites de uso único, permissões por
acção e escopo, revogação que **faz parar as sessões que já existem**, e auditoria
append-only. **12 telas**, e é a segunda etapa a mexer no `coverage.csv`.

**O quarto acesso do CT-04 existe:** um papel `bossaos_auth` que vê identidades e sessões e
**não vê uma linha de inquilino**. Medido nos dois sentidos. E fechou uma armadilha do E01 —
o `ALTER DEFAULT PRIVILEGES` fazia as tabelas de sessão nascerem legíveis pelo runtime.

**O par (1)/(2) está provado por HTTP**, com sessões reais: o identificador de B com sessão
de A dá 404; o **mesmo** com sessão de B dá 200. A ausência de um recurso alheio e a de uma
organização inexistente saem **byte a byte iguais**.

**127 asserções unitárias + 24 de acesso + 13 de recuperação e MFA + 4 de fuso, 0 falhas.**
Por pacote, medido com `./scripts/validar-testes.sh`: domain 38 · ui 37 · i18n 16 ·
config 14 · **auth 12** · db 5 · storage 5, mais o `worker` declarado a zero. A contagem
anterior dizia 91 e não mencionava o `auth` — o pacote que guarda a revogação estava sem
um único teste e saía verde por não haver nada que corresse.

O achado que mais me interessa: **o Prisma lia o relógio duas horas adiantado** e por isso
um convite expirado era aceite. Não era defeito dos convites — seria de todos os prazos,
reservas e turnos. `-c timezone=UTC` nas ligações, com prova e controlo negativo próprios.

E o controlo negativo do acesso **falhou à primeira, e isso foi informação**: desligar a
resolução de contexto não colapsou o par, porque a política de linha do E03 aguentou. Para
o colapsar foi preciso acrescentar uma política de leitura a mais — que é precisamente o
risco do OR entre permissivas que a revisão do E03 foi verificar.

## Divisão de trabalho

O pacote foi desenhado para duas cabeças: quem constrói e quem confere não são a mesma.
O Matheus deu-nos as duas a 03/09.

| Quem | Papel |
| --- | --- |
| **Lúmen** (este terminal) | E00; revisões E11, E21 e E34; contrato, ADRs e decisões; fecho de cada etapa com prova. |
| **Lúmen JR** | Implementação das etapas Codex (E01-E10, E12-E20, E22-E33, E35), uma de cada vez. |

Regra que não se dobra: **quem implementa não assina a própria revisão.** Foi por não
haver isto que o Norte passou uma noite inteira com defeitos que só um conselho externo
viu.

## Decisões já tomadas (ver ADR 0001)

- ORM **Prisma**, não Drizzle. Motivo verificado no registo npm.
- Next.js **16.3.4** (LTS activo). Better Auth **1.7.2**.
- As duas logos são definitivas; D01 do pacote foi corrigido.
- Token de interface `#F5664D`; arte da logo fica `#FB4C39`. Medido por contraste.

## E01 — o que existe agora

Workspace pnpm a correr: `apps/web` (Next 16.3.4, App Router, runtime Node),
`apps/worker`, e os pacotes `config`, `db`, `domain`, `storage`, `ui`.
`pnpm verificar` (lint + tipos + testes + build) sai a 0. **16 testes, 0 falhas.**

Duas provas executáveis que um build verde não dá, ambas na CI:

- `./scripts/provar-separacao-de-credenciais.sh` — o runtime **não** altera o
  schema. O detector foi testado a valer: concedido o privilégio de propósito,
  ficou vermelho; revertido, verde.
- `./scripts/provar-prontidao.sh` — `/api/ready` distingue por HTTP `pronto`,
  `schema_por_migrar` (503) e `base_indisponivel` (503), com `/api/health` a
  responder 200 nos três. CT-03 provado no caminho, não na peça.

**A CI já correu, e passa** (verde a 2026-09-03, 17 passos, 3m03) — o ficheiro é válido e os comandos correm todos
localmente, mas só o primeiro *push* prova. É a primeira coisa a olhar.

Achado que mudou o desenho: **Prisma 7 tirou a URL do schema.** As migrações
lêem `prisma.config.ts`, o runtime recebe a sua por adaptador. A separação de
credenciais deixou de depender de disciplina e passou a viver em dois sítios
incomunicáveis do código.

## Dependências externas por resolver

- SVG das logos (não bloqueia; PNG serve para começar).
- Domínio próprio — `bossaos.mwdeveloper.tech` é o staging, apontado ao VPS da ilora.
- Fornecedor fiscal, pagamento e hardware: por etapa, conforme CT-19.
- **Mailpit** instalado, **não** registado como serviço (RAM desta máquina).
  Corre à mão: `pnpm dev:mail`. Nenhum código de e-mail existe ainda.
- **Better Auth** fixado no ADR mas ainda não instalado — entra na etapa que o usa.
- **Docker não usado**, por decisão: Postgres nativo do Homebrew.
- **Conflito de contrato por resolver (não é do JR):** o CT-03 continua a dizer
  "Drizzle ORM" enquanto o ADR 0001 diz Prisma. Implementado em Prisma, como
  mandado. O texto do contrato devia ser corrigido por quem o assina.
- **Família de ícones** (manual p. 18): não existe. Reproduzi só o glifo de 2×2 pontos que
  o atlas desenha na navegação; inventar um conjunto agora seria trabalho para deitar fora.
- **KDS à distância real de uso:** verificação humana num ecrã de cozinha, por fazer.
- **`eslint-plugin-import` pede `eslint ^9`** e temos a 10.9.1 — aviso de par não
  satisfeito. O lint corre e apanha erros (provado plantando uma violação).
- **Playwright só com Chromium:** diferenças de composição no WebKit e no Firefox não
  estão a ser vistas.

## E05 — o que existe agora

**Um motor de entitlements** (`packages/domain/src/capacidades.ts`) com a regra na direcção
certa: **quota por configurar significa NEGADO**, não ilimitado. Três motivos separados onde
um sistema descuidado teria um — `sem_plano` (nunca comprou), `quota_por_configurar`
(comprou, falta o número), `quota_esgotada` (comprou zero, e zero é um número) — porque
`null` lido como infinito oferece o produto inteiro e lido como zero bloqueia quem pagou.

**Três verificações independentes, com três códigos**: plano **402**, autorização **403**,
flag **404**. Um 403 a quem paga manda-o pedir permissões a si próprio.

**O defeito que esta etapa apanhou**: a flag só era consultada se quem chamasse se lembrasse
de a passar, e ninguém se lembrava. A terceira verificação do CT-02 existia no domínio e
**nunca disparava no produto**. Passou a aplicar-se por convenção de nome.

**Um trabalho de fundo a sério** — o `worker` deixou de ser andaime. Efectiva as descidas
agendadas, uma organização por transacção, e não efectiva por cima de operações abertas (o
registo de detectores está vazio porque caixas são E13/E19; o mecanismo está provado com um
detector injectado). A prévia que o ecrã mostra **é a mesma chamada** que o job usa.

**A superfície interna de plataforma**, seis ecrãs que lêem através de inquilinos — a
pergunta que o E03 existe para recusar. Não se desligou a política de linha nem se criou um
quinto papel: funções `SECURITY DEFINER` que devolvem o que cada ecrã mostra e verificam
elas próprias quem chama. `platform_staff` é escrita só pela migração e o runtime nem tem
`SELECT`.

**Controlo interno do piloto**: `scripts/plataforma.mjs`, com a credencial de migração e
tudo auditado, `--motivo` obrigatório. A interface de escrita é E33 — e os ecrãs dizem-no em
vez de terem botões que não fazem nada.

**133 asserções unitárias, 0 falhas**, e **nenhum pacote declarado a zero** pela primeira
vez. `pnpm verificar` a 0 **sem `.env`**.

Duas guardas ganharam defeito corrigido: o `validar-cobertura.sh` lia a coluna errada quando
um campo tinha vírgula entre aspas — e o estado real desse ID nunca chegava a ser verificado
—, e faltava um teste que apanhasse `var(--bo-token-que-não-existe)`, que é como se apaga
texto sem nada ficar vermelho.

## E06 — o que existe agora

**Um motor de horários com TRÊS respostas** — aberto, fechado e **desconhecido**. Um sistema
booleano aqui obriga quem chama a escolher entre mentir a dizer que está aberto e mentir a
dizer que está fechado. Um dia sem linha em `schedule_days` está por configurar; um dia com
linha e `fechado = true` está fechado porque alguém o disse.

**20:00→01:00 é um intervalo, guardado 1200→1500.** A consequência — consultar também o dia
anterior — está num sítio só, em vez de um `if (fim < inicio)` espalhado por todo o código
que lê horários. O fuso é o da unidade, com `Intl`, que é o que acerta em Março e Outubro.

**Moeda e fuso deixaram de ser `NOT NULL`**, e nenhum campo novo tem `@default`. Com eles
obrigatórios, quem cria uma unidade é forçado a arranjar um valor — e o valor que se arranja
quando não se sabe é o da unidade anterior. E `CampoPorEscolher` garante que nenhum
`<select>` do produto pode escolher sozinho a primeira opção da lista.

**Criar não duplica.** A chave de idempotência decide-se na restrição única da base, não num
`if` em TypeScript: duas repetições simultâneas leem as duas "não existe" e criam as duas.
A porta `criar_organizacao_com_dono` cria quatro linhas ou nenhuma, e garante que **não se
cria uma organização a que não se pertence**.

**A lista de arranque tem quatro estados**, e `por_medir` não conta como pendente — se
contasse, a lista nunca ficava verde e o aceite 3 era impossível.

Uma prova minha deixou lixo e partiu a prova de isolamento do E03. Corrigido, com uma guarda
no script que faz a sujidade em vez de na prova seguinte.

## E07 — o que existe agora

**A ausência de declaração de alérgeno vale DESCONHECIDO por TIPO, não por convenção.**
`Declaracao.estado` só aceita `CONTEM | PODE_CONTER | NAO_CONTEM`; "não sei" é não haver
linha. E `estadoDoAlergenio` não recebe o nome do produto nem as fotos — **inferir não é
proibido, é impossível de escrever**. A prova cria uma "Tarta de almendra", não declara nada,
e exige `DESCONHECIDO` para amêndoa.

**A tabela `allergens` é só de leitura para o runtime** (`REVOKE ALL` + `GRANT SELECT`): os
catorze são o Anexo II do Reg. (UE) 1169/2011, são lei e não configuração. Provado com um
`INSERT` que devolve *permission denied*.

**Empate de preços recusa.** Duas regras do mesmo nível devolvem `{erro: 'conflito', regras}`
com os identificadores, nunca a primeira que a base devolvesse. **Dinheiro em inteiros de
unidade mínima**, nunca `parseFloat` — medido: 1145 de 20001 valores em euros truncam para o
cêntimo errado, o primeiro é `0,29`.

**Modificadores validados por chamada directa à API**, em JSON, com os limites lidos **da
base** e não do corpo do pedido. Medido em dois níveis: a função, e a **rota por HTTP** com
sessão real — chamar a função mostra que o motor está certo, não que a rota o usa. O caso
que carrega o aceite manda os limites no corpo (`grupos: [{obrigatorio: false, maximo: 3}]`)
e continua a receber 422, porque a rota vai buscá-los à base.

**Três coisas de etapas anteriores que passaram a mentir e foram corrigidas:** o cartão de
uso dizia que o catálogo chegava depois (agora conta produtos), o item `carta` do arranque
estava `por_medir` (agora mede-se), e a razão do item `qr` apontava ao catálogo em vez da
publicação.

**Uma guarda nova, `validar-classes.sh`:** uma classe `bo-` que o CSS não define não dá erro
em lado nenhum. Encontrou quatro escritas por mim no E07 e **uma quinta anterior**, no
componente de separadores.

**E `instanteNaZona`**, o inverso de `momentoLocal` que o E06 não tinha. O meu primeiro teste
dela não media nada — passava nas duas implementações. Varri 2026 de meia em meia hora em
quatro fusos para descobrir **onde** divergem (6 horas em Madrid, 30 em Los Angeles, 42 em
Sydney, 0 em São Paulo), e a medição mostrou um terceiro caso que eu não tinha: a hora que
**não existe** na madrugada em que o relógio adianta. Agora recusa em vez de devolver a mais
próxima.

**134 asserções em `domain` + 19 em `i18n` + 21 na prova do catálogo + 6 por HTTP, 0
falhas.**
`pnpm verificar` a 0 **sem `.env`**; `pnpm inspeccionar` com 69 verificações no browser,
já com as peças do E07 no catálogo interno; `provar-migracoes-do-zero.sh` a aplicar as 13
migrações contra uma base vazia.

**Aviso de custo para o fecho do E07:** o `provar-catalogo.sh` passou a fazer **dois builds**
(o segundo para o controlo negativo da rota correr contra código compilado). Junta-se ao que
o `CI-CUSTO.md` já dizia — a restruturação em trabalhos paralelos ganha mais um argumento.

## E08 — o que existe agora

**A primeira etapa que aceita ficheiros de estranhos**, e as três armadilhas do CT-14 são
todas defeitos que se apresentam como sucesso: um CSV que abre no Excel, um logótipo que
aparece na página, um link que ainda responde.

**Publicar é atómico por construção.** A revisão nasce e o ponteiro troca no mesmo `COMMIT`,
dentro da transacção que o `comEscopo` já abriu. A prova injecta uma falha REAL depois de as
duas escritas e exige que nem uma nem outra tenham ficado — e mede o outro lado, que a
publicação que corre até ao fim troca mesmo o que está no ar. **A revisão é imutável**, e é
a base que o garante: `REVOKE UPDATE, DELETE ON menu_revisions`.

**CSV neutralizado** — e aspas não protegem, e um número negativo não é uma fórmula.
**Buscar por URL tem três portas**: a forma, o endereço resolvido, e `redirect: 'manual'` —
um destino público que responda 302 para `169.254.169.254` passa pelas duas primeiras.
**A terceira não tinha vigia, e foi por isso que o E08 foi retido à primeira:** o sénior
trocou `manual` por `follow` e tudo ficou verde. O código estava certo; era uma protecção
que não conseguia falhar. Fechada com três casos e o controlo negativo 9d.
**O tipo do ficheiro vem dos bytes**, e a recusa vem antes de escrever no armazenamento.

**Nome igual não é chave de identidade**: a estratégia de importação é obrigatória sem valor
por omissão, e não existe no ficheiro nenhum índice por nome.

**A exportação verifica a permissão duas vezes**, com as concessões lidas outra vez no
descarregamento.

**Mexi numa coisa do E07 que já estava validada:** `ProductTranslation.origemVersao` era a
`version` do produto; passou a ser a impressão do TEXTO. A versão avança com o preço, e
marcar a tradução inglesa como obsoleta por causa do preço é um falso positivo — e falsos
positivos ensinam toda a gente a ignorar o aviso. Nenhum código lia a coluna.

**221 asserções no domínio + 35 na prova contra a base, 0 falhas**, com 34 controlos
negativos ao todo. `pnpm verificar` a 0 sem `.env`; `pnpm inspeccionar` com 69 verificações.

**Toquei no `ci.yml`** para acrescentar um passo (`provar-publicacao.sh`) ao trabalho `base`,
depois de a divisão em três estar commitada. Verifiquei a forma dos 41 passos — cada um tem
`run` ou `uses` — mas **não contra o esquema do Actions**, que é o que a régua pede: não há
`pyyaml` nesta máquina. Fica para quem valida.

## Bloqueio externo: a CI está parada por facturação — 04/09

`scripts/validar-ci-verde.sh` vai continuar a dizer PENDENTE, e **não é do
código**. O GitHub escreve o motivo, inteiro, numa anotação do check-run:

> The job was not started because recent account payments have failed or your
> spending limit needs to be increased.

Cinco trabalhos, duas tentativas, zero passos corridos, log nenhum. **Só o
Matheus resolve** (Billing & plans). Até lá:

- **O verde da CI não existe como prova.** Quem validar uma etapa daqui para a
  frente corre a suite localmente e **escreve que foi local** — «validado» sem
  essa nota vai ser lido como confirmado por uma máquina independente, e não é.
- Passei duas vezes ao lado disto: primeiro chamei-lhe *infra-estrutura* (certo,
  mas vago), depois listei três hipóteses quando bastava ler a anotação. A
  guarda passa a lê-la e a imprimir o motivo verdadeiro.

### E fica fechado o item que o JR me deixou sobre o `ci.yml`

Ele escreveu: verificou a forma dos 41 passos, mas **não contra o esquema do
Actions**, por não haver parser nesta máquina. Não é preciso parser — a
autoridade que conta já respondeu: **o GitHub aceitou o ficheiro e agendou os
cinco trabalhos**, com os cinco nomes declarados, verbatim. Um ficheiro
inválido não chega a criar trabalho nenhum.

O que isto **não** prova, e não vale fingir que prova: que cada `uses:` resolve.
Isso só se sabe a correr, e correr é o que a facturação impede. Fica medido até
onde dá, e dito onde pára.

## Metade das provas nunca correu na CI — 04/09

`scripts/validar-provas-na-ci.sh` (nova) mede-o: **25 provas, 12 na CI, 12 sem
decisão nenhuma.** Ficam de fora, entre outras, a `provar-pedidos.sh` (o E14,
validado esta manhã), a `provar-sala.sh` (E13) e a **`provar-marco-e11.sh`, o
marco Starter inteiro**. Uma regressão em qualquer delas não seria apanhada por
máquina nenhuma — só por alguém se lembrar de correr o script à mão.

A causa está escrita no cabeçalho do `provar-tudo.sh`, que já a tinha resolvido
para si próprio: **uma lista escrita à mão deriva.** O `ci.yml` continuou a
listar doze e envelheceu em silêncio, que é o único modo em que estas listas
envelhecem. O mesmo comentário no `ci.yml` regista que sete das treze guardas
`validar-*` também nunca lá corriam. É o mesmo defeito, duas vezes.

**Não corrigi a CI, de propósito.** Acrescentar doze passos a um ficheiro que eu
não consigo executar — a facturação impede — deixava-me sem saber distinguir «o
YAML partiu» de «é a facturação». Perder essa distinção é pior do que a dívida.

**Fica como pendência com cobrador:** a guarda falha enquanto as doze não
estiverem na CI ou declaradas fora com o motivo. Quando a facturação destrancar,
o primeiro trabalho é acrescentá-las e ver a guarda ficar verde.

### E um defeito meu, dentro da guarda que escrevi para isto

A primeira versão fazia `cat` ao `ci.yml` e procurava o nome do ficheiro. Deu
como «corre na CI» o `provar-tudo.sh` — que aparece lá uma vez, **dentro de um
comentário**. A guarda escrita para apanhar provas que ninguém corre dava verde
a uma prova que ninguém corre, porque alguém lhe escreveu o nome num comentário.

É o defeito que ando a caçar o dia inteiro, e desta vez foi meu, escrito dez
minutos depois de eu o nomear no cabeçalho do próprio ficheiro: **vigiar a forma
de escrita em vez da propriedade.** Agora tira os comentários antes de procurar.

## Uma etapa por assinar que não é minha para assinar: o E00

`AGUARDA=1` desde o princípio, e continua. A condição de validação do E00 —
*«ver se o E02-E10 se construíram a partir dele»* — cumpriu-se quando o E11
passou. **Mas os documentos de arquitectura são do sénior, e ele não assina o
que escreveu.**

A prova está junta e medida em `docs/reviews/E00-PROVA-PARA-O-JR.md`: 17
documentos, **15 intactos ao fim de 15 etapas**, 2 emendados, e 3 assuntos que
tiveram de nascer depois. **Quem decide és tu**, e reprovar é uma resposta
válida — se os três em falta forem o E00 a ter prometido mais do que entregou,
diz-se, e não custa nada agora.

Faz isso quando fechares uma etapa e tiveres contexto de sobra, não a meio.

## Dívidas conhecidas à entrada do E16

Nenhuma bloqueia a etapa. Ficam escritas porque uma dívida que só existe na
cabeça de quem a criou desaparece na sessão seguinte.

**1. Metade das provas não corre na CI.** `scripts/validar-provas-na-ci.sh`
mede-o e falha de propósito: 25 provas, 12 na CI. Entre as que ficam de fora
estão a `provar-pedidos.sh` (E14), a `provar-sala.sh` (E13), a `provar-fila.sh` e
a `provar-staff-no-navegador.sh` (E15), e a **`provar-marco-e11.sh`, o marco
Starter inteiro**. **Depende da facturação do GitHub**, que está trancada desde
04/09 e só o Matheus destranca. Vermelho nessa guarda **não é defeito de código**.

**2. A identidade de dispositivo é uma etiqueta escolhida por quem tem sessão.**
Declarada pelo JR no fim do E15. Não é falha do E15 — é o desenho actual, e o
E15 não prometeu mais do que isso. Passa a ser dívida conhecida: qualquer etapa
que faça uma decisão **depender** do dispositivo (e não do operador) tem de a
fechar primeiro, ou está a confiar num nome que o próprio cliente escolhe.

**3. O 404 fantasma do arnês tem causa e não é do produto.** Uma passagem
anterior — viva ou interrompida a chegar ao fecho tarde — apaga as fixtures por
baixo da que está a medir. Basta um `pnpm inspeccionar` esquecido. **Duas
passagens do arnês nunca se sobrepõem**: quem revê corre na `bossaos_revisao` e
na árvore de revisão, não na base de quem escreve.

## Estado das dívidas — varrido a 04/09

Varri as pendências declaradas nas etapas para ver quais já estavam fechadas sem
ninguém o dizer. **Uma pendência resolvida que continua escrita como aberta
confunde tanto como uma esquecida.**

| declarada em | o quê | estado |
| --- | --- | --- |
| E13 | `devices.rascunhos_por_enviar` é `null` até a fila local nascer | **FECHADA no E15.** Verifiquei as duas metades: antes de o aparelho falar o ecrã diz que **não sabe**, depois mostra o número |
| E14 | *«o consumidor do `command_id` é pendência do E16»* | **Fechada no E16 por outro mecanismo**, e ninguém o escreveu — ver abaixo |
| E15 | identidade de dispositivo é etiqueta escolhida por quem tem sessão | **aberta.** Fecha quando alguma etapa fizer uma decisão *depender* do dispositivo |
| E16/E17 | provas novas não correm na CI | **aberta, externa.** Facturação do GitHub |

### O caso do E14, que vale a nota

O E14 entregou ao E16 a metade do consumidor: *«entrega repetível com efeitos
deduplicados»*. O E16 **não** o resolveu com `command_id` — resolveu-o com a
**versão monótona** e o **cursor**, ambos com controlo negativo próprio («a
versão volta a poder retroceder», «o buraco no cursor é ignorado»).

Está cumprido. Mas **eu assinei o E16 sem verificar que a dívida do E14 fechava
ali**, e ele não o declarou. Ficou fechado por acidente de bom desenho, não por
alguém ter conferido — e da próxima vez que isso acontecer pode ficar aberto pelo
mesmo motivo.

**Regra que fica:** ao assinar uma etapa, verificar também as pendências que
etapas anteriores lhe entregaram. Uma dívida passada de etapa em etapa sem
ninguém a marcar é uma dívida que desaparece do radar sem ser paga.
