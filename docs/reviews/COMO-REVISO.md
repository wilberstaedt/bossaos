# Como o sénior revê uma etapa

> Escrito depois do E01 e antes do E02, para a régua ser a mesma nas 34 etapas que faltam
> e para o JR saber a fasquia antes de entregar, não depois. Deriva de CT-15.

## A regra que está acima de todas

**Não aceito nenhuma afirmação do handoff sem a repetir.** O relatório diz o que o autor
acredita ter feito; a revisão existe para descobrir a diferença. Se eu ler "16 testes
passam" e escrever "validado", não revi nada — reencaminhei.

No E01 isso valeu: corri os quatro comandos outra vez e a primeira tentativa devolveu-me
**código de saída vazio**, porque o `| tail` o come. É a armadilha que na véspera me fez
commitar por cima de um teste falhado noutro projecto.

## Passo 0 — a régua escreve-se ANTES de ver a entrega

Acrescentado a 2026-09-03, depois de resultar duas vezes.

Uma lista de verificação tirada daquilo que a entrega calhou de fazer não é uma revisão, é
uma justificação. Antes de o `E##.md` existir, escrevo `ALVO-E##.md`: o que vou medir, de
onde vem cada critério, e **as suspeitas pré-registadas** — as coisas que vi de relance e
quero confirmar antes de saber a conclusão.

No E02 a suspeita pré-registada era *"ele alterou o teste depois de o teste encontrar um
defeito"*. **Não se confirmou** — e é isso que a torna útil: escrita antes, sobrevive a
estar errada sem envergonhar ninguém. No E03 a régua era a `prova-de-isolamento.md`,
escrita no E00, semanas de trabalho antes de a etapa começar.

## Os sete passos, por esta ordem

**1. Ler o handoff inteiro antes de correr nada.** Anotar as afirmações verificáveis. Uma
afirmação sem forma de ser desmentida não é uma afirmação, é uma opinião — e essas
anotam-se à parte.

**2. Correr os comandos SEPARADOS, com o código de saída lido sem cano.**
`pnpm lint; echo $?` e não `pnpm lint | tail`. Quatro números, não um resumo.

**3. Contar o que correu.** Uma suite com zero testes sai 0 tal como uma com mil. Ler a
contagem real na saída, e comparar com o que o handoff afirma. Pacotes com zero testes têm
de estar **declarados** no handoff — se estiverem, é honestidade; se não, é omissão.

**4. Fazer eu próprio um controlo negativo.** Não basta ler que existe: partir alguma coisa
de propósito e ver o detector acender. No E01 plantei um ficheiro com `any` e variável não
usada. Se o detector não consegue produzir a avaria, o verde dele não prova nada.

**5. Correr as provas executáveis da etapa** com as minhas mãos, no meu ambiente.

**6. Procurar o verde vazio.** As perguntas, sempre as mesmas:
   - Este teste passaria se a funcionalidade não existisse?
   - Esta lista está vazia porque não há nada, ou porque a consulta falhou?
   - Este `200` prova que a coisa certa foi devolvida, ou só que a rota respondeu?
   - Este controlo negativo compara produção, ou dois literais escritos no próprio teste?

**7. Escrever a revisão** em `docs/reviews/E##.md`: o que verifiquei e **como**, onde
discordo sem bloquear, e as pendências que aceito como declaradas.

**7-bis. Se a etapa tem migrações, aplicá-las numa base VAZIA.**
`./scripts/provar-migracoes-do-zero.sh`, e não a suite de testes. A 2026-09-03 validei o
E06 com nove provas, quatro guardas e o `pnpm verificar` todos verdes — **contra a minha
base local**, migrada ao longo do dia na ordem em que os ficheiros nasceram. A CI reprovou-o
quatro minutos depois: o Prisma aplica migrações por **carimbo**, não por etapa, e uma
migração `e05` com carimbo posterior ao `e06` que dela depende parte a cadeia em qualquer
base nova. **Medi o estado e não o caminho até ele**, que é a frase que já estava neste
ficheiro. Escrevê-la não chegou; o que faltava era um **passo**.

**8-bis. `git commit` leva tudo o que está em preparação, não só o que acabei de nomear.**
A 2026-09-03 escrevi `git add <dois ficheiros> && git commit` e o commit `71ac09c` levou
também **duas migrações renomeadas** — trabalho do JR a meio, que tinha ficado em preparação
de um `git add -A` meu anterior. A CI mediu esse estado misto e reprovou a prova das
descidas; eu diagnostiquei mal duas vezes antes de ir ver, e a prova em si estava boa (três
corridas seguidas a zero).

Duas consequências, e a segunda é pior: um commit meu contém trabalho que **eu não revi**;
e um vermelho de CI que não corresponde a defeito nenhum ensina a ignorar vermelhos.

A partir daqui: `git commit -o <caminhos>` quando quero só aqueles, ou ler
`git diff --cached --stat` **antes** de commitar. E os instantâneos do trabalho do JR ficam
**locais**, como já estava escrito — foi a regra que eu próprio escrevi às 14h55 e não
apliquei.

**8. Aplicar a mim a régua que acabei de dar.** Sempre, no mesmo dia. A 2026-09-03 exigi
ao JR uma guarda contra o instrumento medir zero e, vinte minutos depois, encontrei
exactamente o mesmo defeito no **meu** `estado.sh`: contava telas por conferir como
entregues. Não apareceu por eu procurar defeitos meus — apareceu por aplicar a mim o que
tinha acabado de aplicar a outro. É o passo com melhor retorno dos oito.

## O instrumento também é entrega

Metade dos defeitos que encontrei até agora não estavam no produto: estavam no aparelho que
o mede. Um verificador defeituoso é pior do que nenhum, porque produz confiança.

As perguntas, a somar às do passo 6:

- **Falha quando deve falhar?** Partir o produto e ver o verificador acender.
- **Falha quando não consegue medir?** É diferente da anterior e é a que escapa. O
  `provar-isolamento.sh` do E03 imprimia `ok 0 grupos verdes` — verde, com zero medido —
  porque só olhava para o código de saída. Um corredor de testes que não encontra testes
  sai a zero.
- **Depende de alguma coisa que não está fixada?** Aquele mesmo script partia-se com uma
  versão de Node diferente, porque o formato do relatório muda e a contagem deixa de
  encontrar o que procura. Ambiente não fixado é uma dependência escondida.
- **A régua descreve-se como aquilo que aplica?** O JR apanhou uma mensagem sua que dizia
  *"esperadas 8"* enquanto comparava com outro valor.
- **Conta o que correu, ou o que não correu mal?** Um contador de falhas a zero só diz que
  nada rebentou. Não diz que alguma coisa aconteceu.

## Shell: escrever para o ambiente mais estrito

Duas falhas minhas no mesmo dia, em direcções opostas, resolvem-se numa regra.

- Às 13h30 dois scripts meus tinham `#!/bin/zsh`. Corriam aqui e davam **127 na CI**, que
  é Ubuntu e não tem `zsh`. Passavam localmente e falhavam lá.
- Às 17h25 escrevi uma guarda com um *array* associativo do bash. Rebentou aqui, no bash
  **3.2** do macOS — e **teria passado na CI**, que corre bash 5. Falhava localmente e
  passava lá.

A regra que cobre as duas: **escrever para o mais estrito dos dois ambientes e testar
nele.** Para versões de bash, o mais estrito é o local (3.2 < 5), por isso correr aqui
basta. Para *qual* shell existe, o mais estrito é o runner, por isso o interpretador é
sempre `#!/usr/bin/env bash`.

**Os quatro eixos de ambiente, e o estado de cada um.** Hoje três apanharam-nos, e por
isso fui procurar o quarto:

| Eixo | Como está guardado |
| --- | --- |
| **Versão do Node** | `fnm exec --using=22.23.2`, e a prova de isolamento **recusa correr** noutra |
| **Fuso do processo** | `TZ=America/Los_Angeles` fixo na prova de onboarding — diferente da unidade, desta máquina **e** do runner |
| **Estado da base** | `provar-migracoes-do-zero.sh`, base descartável, do nada |
| **Locale do processo** | **procurado a 2026-09-03 e não é um risco**: as cinco chamadas a `Intl` em `formato.ts` passam locale explícito, e não há um único `toLocaleString()` sem argumento em código de produto. E se o ICU faltasse, `es-ES` cairia para inglês em silêncio — mas os testes do `i18n` afirmam `"12,50 €"` com o espaço inquebrável, portanto o defeito faz barulho. Verificado: `12,50 €`, ICU completo. |

O padrão de todos: **funcionava até o ambiente mudar**. Um resultado que depende de onde
corre não é um resultado — é uma coincidência com sorte.

Terceira diferença, auditada a 2026-09-03 e **limpa** nos sete scripts: nenhum usa
`sed -i` sem sufixo, `grep -P`, `readlink -f`, `date -d` nem `stat -c` — flags que existem
nos dois sistemas e fazem coisas diferentes, que é pior do que não existirem.

## As minhas armadilhas, por forma

Escrito a 2026-09-03, ao fim de um dia em que quase todos os defeitos que encontrei
estavam no **meu** procedimento e não no produto. Não é auto-flagelação: é uma lista de
verificação, porque estas repetem-se e são reconhecíveis à vista.

**1. Correr uma prova sem o ambiente que ela precisa.** Duas vezes no mesmo dia: `pnpm
verificar` sem `.env` → "a etapa não compila"; um `.test.ts` corrido nu quando havia um
script que levanta o servidor → "a sonda decisiva reprova". Antes de acusar: *este comando
tem tudo o que precisa, ou estou eu a medir a minha shell?*

**2. Escrever a ferramenta e confiar nela antes de a partir.** O padrão da chave privada
nunca correu (o `grep` lia `-----BEGIN` como opção). O filtro de declarados devolvia sempre
falso (`while` dentro de um cano corre em subshell). Um regex meu estragou três expansões
`${VAR:-0}` e o script correu **verde** por o caminho por omissão nunca ser usado. Regra:
**a ferramenta prova-se partindo-a, e o controlo negativo também se prova.**

**3. Presumir o ambiente em vez de o fixar.** `#!/bin/zsh` passava aqui e dava 127 na CI;
um *array* associativo rebentava aqui e passaria na CI. Ver a secção acima.

**4. Ler um fragmento e inferir a causa.** O `vitest` a dizer `Tests no tests` quando os
testes correram; `# pass 0` do `auth` que não era a causa do vermelho; o grep que não
encontrou a saída de uma guarda e me fez suspeitar dela. **Ler a saída inteira antes de
concluir.**

**5. Medir uma árvore que outro está a escrever.** Um teste vermelho que ficou verde trinta
segundos depois sem eu tocar em nada. O falso vermelho faz barulho; o falso **verde** não,
e esse eu guardava como prova.

**7. Cifrões numa mensagem de commit entre aspas duplas.** No commit `85b2d6c` escrevi
`awk -F, com $(NF-2) conta um campo a mais` e o zsh **executou** o `$(NF-2)`: a mensagem foi
para o repositório sem o símbolo, a dizer *"awk -F, com  conta um campo a mais"*. Já estava
empurrada, e eu não faço `force-push` — fica corrigida aqui. Mensagens com `$`, crases ou
`!` vão por ficheiro (`git commit -F`) ou com aspas simples.

**6. Esquecer o passo que não é técnico.** Validei uma etapa e não autorizei a seguinte — o
JR ficou nove minutos parado. Validar e entregar fecham no **mesmo** tick.

## Três verificações que valem por muitas

**A régua da etapa seguinte audita a etapa anterior.** Escrevi a régua do E09 e ela
encontrou um defeito no **E08, que eu já tinha validado**: `montarRevisao` não olhava para
`ProductChannel.visivel`, portanto um produto escondido da CARTA entrava na revisão da
CARTA, e publicar um canal sem nada visível publicava uma página em branco em silêncio.

Não é acaso, e por isso passa a passo. Uma régua para a etapa N+1 tem de perguntar **o que
essa etapa recebe** — e a resposta é a saída da etapa N. Ao descrever a entrada, olho para
a etapa anterior com olhos novos e **sem o alívio de já a ter dado por fechada**. É a única
auditoria que tenho da minha própria assinatura.

Explícito: ao escrever `ALVO-E##.md`, um parágrafo para o que a etapa **consome**,
verificado contra o código e não contra a minha memória do que validei. Havendo diferença,
a etapa anterior **reabre**. Validada não é imutável — é apenas assinada.

**Ler a forma, não só o comportamento.** No E03 fui ao `pg_policies` confirmar que as
políticas `ALL` tinham `USING` **e** `WITH CHECK` — porque uma política só com `USING` lê
bem e deixa **escrever** para outro inquilino, e nenhum teste de leitura o mostraria. E li
o `qual` das políticas `SELECT` extra, porque no PostgreSQL as permissivas somam-se por
**OR** e uma leitura a mais alarga o acesso sem aparecer em teste nenhum.

**Ver qual foi o commit que a CI verificou.** A `ci.yml` tem `cancel-in-progress: true`,
por isso um push novo cancela a corrida do anterior. Dizer "a CI passou no E03" quando a
corrida desse commit foi cancelada só é honesto se a corrida verde for de um commit que
**contém** o código do E03 — o que numa história linear é verdade, mas verifica-se com
`gh run view --json headSha`, não se assume.

**A decoração de um caso de teste pode matar a propriedade que ele testa.** A 2026-09-03,
no E08, o JR escreveu um caso para a injecção de fórmulas em CSV e chamou ao produto
`${PREFIXO}=HYPERLINK(...)` — o prefixo servia para a limpeza o encontrar depois. Só que
com o prefixo à frente **o campo deixa de começar por `=`**, e um campo que não começa por
`=` não é perigoso. A asserção passou a verificar que **um valor inofensivo sai inofensivo**.

Ninguém o teria visto: o teste era verde, o código estava certo, e a ligação entre os dois
era falsa. **Apareceu porque o controlo negativo reprovou** — com a neutralização desligada,
a prova continuou verde, e é isso que um controlo negativo existe para dizer.

A forma geral: sempre que um caso de teste leva **andaimes** — prefixo de limpeza, sufixo
com identificador, carimbo de tempo, `Date.now()` no nome — perguntar se o andaime altera
a propriedade. Vale sobretudo quando a propriedade depende do **início**, do **fim** ou do
**valor exacto** da cadeia: injecção, ordenação, comparação de igualdade, unicidade.

**Comparar contra a fonte, nunca entre pares.** Uma verificação que compara N coisas
**umas com as outras** passa quando as N estão erradas da mesma maneira. A 2026-09-03 o JR
apanhou isto no E07: os ecrãs mostravam o **código** do alérgeno (`frutos-de-casca`) em vez
do nome, e o teste de paridade de traduções não viu — comparava `es-ES`, `pt-BR` e `en`
**entre si**, e as três estavam igualmente erradas, portanto estavam alinhadas. O `tsc`
também não vê, porque não olha para dentro de um índice de cadeia.

A correcção dele é a forma geral: comparar contra a **lista do domínio**, que é a fonte, e
não contra os outros idiomas, que são pares. Vale para traduções, para fixtures espelhadas,
para snapshots, e para qualquer sítio onde a resposta certa exista num lado só.

**Exigir o par, nunca o caso sozinho.** "O pedido de A ao recurso de B devolve vazio" é
compatível com um sistema em que *tudo* devolve vazio. A prova é a **diferença**: o mesmo
identificador, com a sessão certa, tem de devolver a coisa. Vale para isolamento, para
autorização, para filtros e para qualquer recusa.

## Uma etapa com telas não se assina sem prova de navegador

Escrevo isto porque **assinei o E09 com dois defeitos reais lá dentro**, e ambos
apareceram uma hora depois, quando a prova de navegador finalmente correu:

1. **A carta pública era servida sem folha de estilos.** O `/r/` fica fora de
   `app/[idioma]/` e não tinha moldura — nenhum `<html>`, nenhuma fonte, nenhum token.
   O sintoma real: um alvo de toque que o CSS declara a 44 px a render a **18 px**.
2. **A consulta pública servia o menu de outra unidade**, por juntar `menus` pela marca e
   ignorar `menus.location_id`. Numa página **pública**, num produto **multi-inquilino**.

Nenhum dos dois é subtil. Passaram porque a minha prova do E09 era toda de base e domínio:
`provar-publico.sh` corre `node --test` contra o PostgreSQL. **A página nunca foi
renderizada.** `pnpm build` verde e `validar-classes.sh` verde não os viam — as classes
existiam, o ficheiro é que não chegava à página.

**E o pior é o que eu tinha escrito uma hora antes.** Ao declarar as onze telas na dívida
de móvel, escrevi que *«é provável que muita coisa esteja bem»*. Estava errado, e da pior
maneira: a dívida não era contabilidade neutra — **estava a esconder uma fuga de dados
entre unidades numa página aberta ao público**.

**A regra que fica:** uma etapa que entrega **telas** não se assina com provas de base e
domínio. Ou a tela foi renderizada e medida, ou a etapa fica **parcialmente assinada** —
com os IDs medidos validados e os outros retidos. Não é o mesmo que declarar dívida: a
dívida diz «sei que não medi»; assinar diz «medi». Eu disse a segunda coisa tendo feito a
primeira.

E o corolário, que é o que torna isto accionável: **quando uma medição em falta é o único
motivo para acreditar que algo está bem, o estado honesto é NÃO MEDI** — nunca «está
provavelmente bem». Já tinha isto escrito para o produto; faltava aplicá-lo às minhas
próprias assinaturas.

## Uma reposição não se testa desligando-a na base que se usa

A 04/09 o JR entregou um passo 9 novo — «as funções da base ficaram como as encontrei» —
depois de descobrir que a prova do E09 **repunha a fuga** que o E09 tinha corrigido: a
reposição replicava à mão a migração anterior ao filtro de unidade, e o passo 7 dizia
«voltou ao verde» porque nada media a fuga.

Fui fazer o que devo fazer: um instrumento novo que nunca falhou não se sabe se falha.
Desliguei a reposição e o passo 9 apanhou-a, com o diff a mostrar a linha em falta. **A
prova do instrumento correu bem.**

**O que correu mal foi onde a fiz.** Ao desligar a reposição, os passos que plantam funções
defeituosas deixaram-nas plantadas — e a base de desenvolvimento ficou com quatro funções
partidas. Pior: a corrida seguinte tirou o retrato **dessa** base, por isso o passo 9 passou
a comparar defeituoso com defeituoso e dizia verde enquanto os testes funcionais reprovavam.
Gastei quatro tentativas a remendar migração a migração antes de fazer a coisa certa, que
era **reconstruir da fonte de verdade**: apagar a base e reaplicar as migrações por ordem.

**A regra:** um mecanismo de **reposição** testa-se numa base descartável, nunca na que
está a ser usada — desligar uma reposição deixa por repor exactamente aquilo que ela repõe.
O projecto já tinha o padrão certo à vista: o `provar-migracoes-do-zero.sh` cria uma
`BASE_CTL` só para o controlo. Eu tinha-o escrito e não o apliquei quando era a minha vez.

E o corolário que dói mais: **passei a noite a exigir que quem suja apanhe a sujidade, e a
seguir sujei a base de desenvolvimento a meio do trabalho do JR.** A reparação certa não
foi remendar — foi deitar fora e reconstruir do que é verdade.

## A guarda que eu escrevi contra o verde vazio estava verde sobre nada

A 04/09 construí a `validar-concorrencia.sh` para apanhar o defeito que a régua do
E13 nomeia — concorrência provada em sequência. O executor correu-a antes de
declarar, como lhe pedi, e ela disse **«ainda não há prova de concorrência»** com a
prova no repositório, saindo a **zero**. Duas cegueiras independentes, ambas a
passar por verde.

**A primeira fui eu a criá-la a corrigir outra coisa.** A busca original era
`concorrent|concorrên|concorrenc|simultân`. Apertei-a para evitar falsos positivos
e deixei `concorrent|simultân` — e **«concorrência» não contém «concorrent»**. A
palavra mais provável no cabeçalho de uma prova de concorrência era precisamente a
que eu tinha acabado de remover. Corrigi um falso positivo e criei um falso
negativo, que é a troca pior.

**A segunda nunca mediu nada.** `CREATE UNIQUE INDEX.*(sess|mesa|floor|table)`
casava com `sessions_token_key` do E04 — um índice da tabela de sessões de
**autenticação**, sem relação nenhuma com mesas. A verificação estava verde desde
antes de a etapa existir. E ele não o deduziu: **degradou o índice a sério** e viu
a guarda continuar a afirmar que havia um.

**A regra que fica, e é sobre mim:** uma guarda que procura por *palavra* e valida
por *padrão largo* é uma guarda que se auto-aprova. As duas verificações passaram a
provar-se a si próprias antes de julgar — e a ausência de prova passou de
«pendência que sai a zero» a **falha**, a partir da etapa que a exige. Pendência
com saída zero é verde sobre população zero com outro nome, e fui eu que a escrevi
assim.

## Aplicar a técnica dele às minhas guardas — e três medições falhadas a fazê-lo

A técnica que ele usou para me apanhar não foi plantar uma sonda que casa o
padrão: foi **degradar o artefacto real** e ver se a guarda nota. Uma sonda testa
o detector; degradar o artefacto testa se o detector está **apontado ao sítio
certo**. Foi a segunda coisa que o meu índice falhava.

Apliquei-a e duas guardas passam: a do preço vigia o ficheiro que o **produto
importa mesmo** (`packages/domain/src/precificacao.ts` faz `import` do JSON), e o
corredor descobre as 16 guardas e as 23 provas **excluindo-se a si próprio** —
suspeitei de recursão e verifiquei em vez de a reportar.

**E fiz três medições erradas a fazer isto**, todas do mesmo tipo — afirmar sem
olhar:

1. Passei `--listar` a um corredor que não tem essa opção, e corri a suíte inteira
   por engano até esgotar o tempo.
2. Contei globs com aspas, portanto não expandiram, e li «0 ficheiros» onde havia
   39.
3. Imprimi «(vazio = …)» debaixo de uma saída que não estava vazia — um hábito de
   reportar que afirma a conclusão antes de ver o resultado.

Nenhuma delas chegou a um commit, porque olhei para os números antes de os usar. O
padrão é o mesmo que estou a caçar nos instrumentos, aplicado à minha própria
leitura: **a conclusão escrita antes da medição.**

## O que bloqueia e o que não

**Bloqueia:** afirmação do handoff que não se confirma; dependência externa simulada com
ar de pronta; teste que não consegue reprovar; regra monetária, de capacidade ou de
isolamento sem prova; segredo em código ou em log.

**Não bloqueia, mas fica escrito:** cobertura fina que falta, dívida nomeada com data,
discordância de desenho onde a escolha do autor é defensável. Escrever a discordância e
deixar passar é diferente de a engolir — a primeira deixa rasto para o marco.

## O que eu não posso fazer

**Não valido o que escrevi.** O E00 é meu e fica em "aguardando validação" até ao E11,
quando se vir se o E02-E10 se construíram a partir daqueles documentos. Um contrato que o
próprio autor declara bom não foi verificado, foi assinado.

Pela mesma razão o alvo de uma etapa escreve-se **antes** dela — como
`prova-de-isolamento.md` para o E03. Quem vai ser medido não escolhe a régua.

## O que reconheço como bom, e digo

Uma revisão que só aponta defeito ensina metade. No E01 registei três coisas para serem
repetidas: o controlo negativo **dentro** do script de prova; a distinção `/health` vs
`/ready`; e o autor escrever que chegou à causa **depois de duas explicações erradas**,
corrigindo os comentários em vez de os apagar.

Essa última é a mais rara e a que mais quero ver outra vez. Uma causa provável escrita como
causa provada é uma armadilha para quem ler a seguir.

## A base de dados de quem revê — 04/09

Durante treze etapas revi contra a **mesma base onde o JR trabalha**. Custou
duas vezes num só dia: as minhas provas semearam e truncaram por baixo dele, e
um script meu morto a meio deixou uma função da base sem a lógica que a migração
declarava — dois testes dele passaram a falhar por causa de algo que eu parti a
medir. Tinha separado o porto (`PORTA_INSPECCAO`) e deixado a base partilhada,
que é a metade que mexe em dados.

`scripts/base-de-revisao.sh` cria a `bossaos_revisao`, das migrações. A
`bossaos_test` não servia: **tem um trabalho, que é estar vazia**, e é o controlo
negativo do `provar-prontidao.sh` — enchê-la cegava essa prova.

```
eval "$(bash scripts/base-de-revisao.sh --exportar)"
bash scripts/provar-<o-que-for>.sh
```

### Mas a base nova não é «a melhor». São perguntas diferentes.

Foi disto que quase me esqueci, e teria sido o erro mais caro dos dois:

- **`bossaos_revisao` responde a comportamento.** Semear, inserir, atacar,
  truncar. É construída das migrações, portanto é o schema **declarado**.
- **`bossaos_dev` responde a desvio.** *O que está vivo é o que está escrito?*

O defeito da idempotência de 04/09 **só era visível na segunda**: a migração
tinha a lógica, a base viva não tinha. Uma revisão que corresse apenas contra a
base construída das migrações nunca o teria encontrado — teria comparado a
declaração consigo própria e chamado verde a isso. É a forma de verde vazio de
que mais gosto de me esquecer: **o instrumento e o alvo saídos da mesma fonte.**

Quem revê usa as duas, e diz em cada prova qual está a usar.

### Como soube que a separação era real

Não porque o script imprimiu «Pronto» — ele imprimiu «Pronto» com duas
declarações SQL a falhar. Criei um marcador na base de revisão, confirmei que
existia lá (`t`) e que **não existia** na base do JR (`f`), e li
`current_database()` nas duas pontas. Uma escrita de um lado ausente do outro é
a única coisa que prova separação; dois URLs diferentes não provam nada, porque
podem apontar ao mesmo sítio.

## Conferi o dinheiro contra o PDF, e está certo — 04/09

Fui **eu** que transcrevi a `PRECIFICACAO.json` do PDF, e os testes lêem esse
mesmo ficheiro. Instrumento e alvo saídos da mesma fonte: se eu tivesse trocado
um dígito, tudo passava a verde por baixo do erro. Ninguém tinha conferido.

Reli o PDF de fresco e escrevi os números **à mão** no comparador, em vez de
reaproveitar o ficheiro do repo — comparar o ficheiro consigo próprio era
exactamente o que eu queria evitar. **15 campos, 0 falhas.** O ano são dez
mensalidades nos três planos, e a economia dá os €38 / €158 / €298 que o PDF
declara, ao cêntimo.

### A armadilha que o PDF avisa, e o estado dela

«A cobrança anual usa o valor integral do ano, **sem multiplicar o equivalente
mensal arredondado**.» Não é conselho: `1583 × 12 = 18996`, e o ano custa 19000.
Quatro cêntimos. No Pro arredonda ao contrário — `12417 × 12 = 149004`, quatro
cêntimos **a mais**, que é cobrar de mais.

Está guardado, e bem: `precificacao.test.ts` afirma que doze vezes o equivalente
**não** é o anual, com a mensagem certa. E a única página que mostra os dois
cobra `preco.anual` e usa `equivalenteMensal` só dentro da frase «equivalente/mês».

Fica dito o que este teste **não** prova: ele guarda a aritmética, não o uso. Se
um dia alguém somar `equivalenteMensal × 12` num total, o teste continua verde.
Verifiquei o uso à mão hoje — há um só, e está correcto.

### A inspecção do navegador corre na base de revisão — e a lição de como eu disse que não

**376 verdes na `bossaos_revisao`, 3,1 minutos.** As telas passam a ser
verificáveis sem tocar na base do JR. Não há excepção a registar.

Horas antes eu tinha escrito o contrário, e numa revisão **assinada**: «a
autenticação estoira com 500 contra a base nova». Era falso. Corri a inspecção
com `eval "$(base-de-revisao.sh --exportar)"` e **sem `source .env`** — o script
dava-me as três bases e mais nada, e a aplicação ficou sem o segredo de
autenticação.

Duas coisas ficam disto, e a segunda é a que interessa.

**A pequena:** o `--exportar` passa a carregar o `.env` primeiro e só depois
sobrepor as três bases. A ordem importa — ao contrário, o `.env` ganhava e as
minhas provas iam bater na base do JR, que é o que o ficheiro existe para
impedir. Provado com o `eval` sozinho: base `bossaos_revisao`, segredo presente.

**A grande:** eu não escrevi *«não consegui pôr a correr»*. Escrevi *«a base
está avariada»*, e mandei o diagnóstico para uma tarefa futura. São coisas
diferentes, e a diferença é exactamente a que passo o dia a exigir aos outros —
**«não medi» contra «medi e deu vermelho»**. Quando a falha é minha, a tentação
não é inventar um verde: é **promover a minha incapacidade a propriedade do
sistema**. Fica mais confortável, tem ar de rigor, e é a mesma mentira ao
contrário.

O sinal que devia ter-me travado estava lá: a corrida das fixtures tinha morrido
por falta de variável **duas horas antes**. O mesmo erro voltou com outra cara —
um 500 em vez de uma variável em falta — e eu não o reconheci. **Um sintoma novo
não é uma causa nova.**

## As armadilhas de 04/09, em forma de lista — porque me custaram todas caro

Um dia inteiro de revisão do E14 e do E15. Metade dos meus vermelhos e verdes
não era sobre o produto. Escrevo-as como perguntas porque é assim que se usam.

### Antes de acreditar num VERDE

1. **A prova consegue ficar vermelha?** Degrada o artefacto real e vê. Se não
   apanhar, é decoração. *(O marcador por tela não conseguia falhar: a navegação
   escrevia o id de todas as telas em todas as páginas.)*
2. **A população está declarada?** Quantas linhas, quantos comandos, quantas
   telas — dito em voz alta antes de qualquer afirmação. Verde sobre zero passa
   quase tudo.
3. **A lista vem de onde?** Se a prova tira a lista do código que mede, comparou
   a declaração consigo própria. *(A precificação resolvi lendo o PDF outra vez à
   mão; as 23 telas, lendo a matriz.)*
4. **Quem, no PRODUTO, chama isto?** Um aceite pode estar provado na lógica e
   morto no produto — um parâmetro com omissão `= true` é o caso clássico, e o
   teste passa o valor que o produto nunca passa.
5. **E qual asserção fica vermelha se essa linha desaparecer?** Sem esta, deixa
   passar código sem prova. *(A origem do pedido: implementada, e nenhuma prova
   a observava.)*

### Antes de acreditar num VERMELHO

6. **É asserção ou é build?** Uma avaria que impede o produto de arrancar mede o
   compilador. *(Apaguei duas atribuições, o TypeScript recusou, e o vermelho não
   provava detecção nenhuma.)*
7. **Falha sempre no mesmo sítio?** Um defeito real falha na mesma tela e na
   mesma largura. Se muda de sítio a cada corrida e mantém a duração, é tempo
   esgotado. *(Quatro navegadores em paralelo com 430 MB livres.)*
8. **Havia outra suite a correr?** `scripts/maquina-livre.sh`. O CPU é um só.
9. **A árvore estava limpa?** Um ficheiro a meio que não compila derruba tudo o
   que precisa da aplicação de pé. *(Onze vermelhos, nenhum era regressão.)*
10. **O servidor era novo?** O Playwright reaproveita um servidor já a correr
    fora de CI: a avaria fica no código e a página servida é a antiga.

### Antes de acusar

10-bis. **O controlo negativo ficou verde COM RAZÃO?** Então provavelmente
    colapsei duas propriedades numa. O JR apanhou isto no E16: plantar o defeito
    no *roteamento* não podia acender no navegador, porque a semeadura cria a
    tarefa órfã directamente na base, sem passar pelo motor. São duas coisas —
    *o roteamento não inventa estação* e *o trabalho sem estação é visível* — e
    guardar só a primeira deixa uma tarefa existir na base e não aparecer em
    lado nenhum, que é o mesmo que desaparecer.
    **É o diagnóstico das minhas quatro tentativas falhadas:** eu não estava a
    degradar mal por distracção; estava a degradar a propriedade errada das duas.

11. **Degradei o que a asserção observa, ou o que era fácil de degradar?**
    Quatro tentativas até um controlo negativo válido, e as três primeiras
    falharam por isto. Uma delas apontava à única tela onde a avaria não podia
    ser vista — e eu estava a dois passos de devolver a etapa com ela.
12. **O meu instrumento encontrou zero de tudo?** Então está avariado, não está
    a medir. *(Uma grep minha deu zero nas 23 telas — e zero no total.)*

### E a que vale por todas

13. **O que MAIS produziria este resultado?** Um verde sobre um servidor velho e
    um verde sobre um instrumento cego são idênticos no ecrã e opostos no
    significado. A diferença entre eles é acusar injustamente ou deixar passar.
