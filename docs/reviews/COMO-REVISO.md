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

## Varredura dos meus próprios laços — 04/09

Duas voltas seguidas sem trabalho aparente foram sinal de que eu não estava a
procurar bem. Varri as revisões todas por «fica por medir», «por verificar» e
«não medi», para ver quais eram laços meus por atar.

**Três encontrados, três já fechados:**

| deixado em | por | fechado por |
| --- | --- | --- |
| E16 | «duas tarefas sem estação: aparecem duas ou uma?» | eu, na consulta — sem `distinct` nem `groupBy`, voltam as duas |
| E12 | a cor **calculada** no navegador, não a declarada | `provar-tema-no-navegador.sh` + `sonda-tema.ts` |
| E10 | «rascunho não muda o público» — **na rota pública, não na pré-visualização, que é o mesmo processo a olhar-se ao espelho** | `provar-sites.sh`, passo 1, com controlo negativo próprio |

Nenhum álibi calcificado. Mas a varredura passa a fazer-se **quando não houver
nada a validar**, e não quando alguém se lembrar: uma nota de «fica por medir» é
honesta no dia em que se escreve e vira desculpa no mês seguinte, e a diferença
entre as duas não está no texto — está em alguém voltar lá.

## Auditoria da matriz — 04/09

A percentagem é a nossa estrela polar, e ninguém tinha auditado o que a produz.
Fui ver as **197 telas validadas**:

- **Evidência curta ou vazia: zero.** Nenhuma tela está marcada validada sem
  texto que diga com que prova.
- **83 sem a palavra «VALIDADO» na evidência** — todas das etapas **E02 a E09**.
  Não é lacuna: é a convenção antiga, de antes de eu passar a escrever «VALIDADO
  a DD/MM pelo sénior». A evidência delas nomeia o script, o número de falhas e a
  medição móvel nas cinco larguras.

Nada a corrigir. Fica registado para que a diferença de formato não seja lida
como buraco por quem varrer isto a seguir — **um falso alarme documentado custa
menos do que o mesmo susto outra vez.**

## O índice do git também é estado partilhado — 04/09

Separámos o porto, a base de dados, a árvore e vigiámos o CPU. **Faltava o
índice.**

Ao investigar o achado da porta pública, o `git log` disse que a rota fora movida
no commit `4d06161` — que é **meu**, e devia ter só o contrato do E20. Tinha
dois ficheiros: o meu documento e uma mudança de nome dele, com zero linhas.

**Como aconteceu:** eu escrevo `git add -A docs/architecture/ && git commit -m …`.
O `add` é limitado ao caminho, mas o **`commit` leva tudo o que está no índice** —
e o JR tinha ficheiros preparados. O meu commit engoliu trabalho dele e pôs a
minha mensagem por cima.

**Varri os últimos 30 commits:** é o único contaminado. Mas quase concluí que não
havia nenhum, porque o meu primeiro detector procurava linhas começadas por
`apps/` e uma linha de renomeação começa por `...`. **O detector estava cego à
forma exacta do caso que eu procurava** — outra vez.

**A regra que fica:** commitar por caminho explícito, `git commit -- <caminhos>`,
e nunca `git commit` a seco depois de um `add` limitado. Numa árvore com duas
pessoas, o índice não é meu.

E o efeito colateral que interessa: **a história ficou a mentir sobre quem fez o
quê.** Nenhuma linha de código mudou, mas uma decisão de arquitectura dele — mover
a porta do visitante para dentro da pasta pública — aparece assinada por um
commit meu sobre pedidos futuros.

## O vermelho que quase virou incidente de segurança — 05/09

A primeira corrida do `provar-publico.sh` contra o E18 corrigido deu isto:

```
not ok 1 - NEM SKU NEM CUSTO saem — medido no JSON, não no ecrã
```

Numa fase chamada **«1. Com tudo ligado»**, com os três controlos negativos
daquela corrida a acender. Ou seja: a prova estava calibrada, disse-o com todas
as letras, e acusou fuga de custo numa resposta pública. Se eu a tivesse lido
como verdade, tinha escrito ao Matheus que o produto expõe preço de custo a
quem lê um QR, e o JR passava a noite a caçar um defeito que não existe.

**Não existia.** Duas medições independentes desmentiram-na:

1. o teste corrido directamente — `node --test provas/publico.test.ts` — deu
   `ok 1` na **mesma** asserção;
2. a segunda corrida do mesmo script, sem eu tocar em nada, deu `0 falhas`.

A diferença: o script **semeia de fresco** antes de correr, e a minha corrida
directa usou o estado que ele próprio deixou. Dois estados, um deles produz o
vermelho. É ordenação de estado entre corridas, não produto.

### A regra que fica

**Um vermelho que aparece uma vez não é um achado, é uma observação.** Antes de
lhe chamar defeito — e sobretudo antes de lhe chamar defeito de segurança —
repetir a medição. Repetir custa minutos; um incidente falso custa a noite de
outra pessoa e a credibilidade de todos os vermelhos seguintes.

E a parte que não é sobre este vermelho: **os controlos negativos a acender
provam que a prova sabe ficar vermelha, não que este vermelho é verdadeiro.**
Eu tratei-os como se fossem a segunda coisa. São a primeira. Uma prova
calibrada continua a poder falhar por estado sujo, por memória, por árvore
suja — hoje já me deu onze falsos vermelhos numa árvore suja e três por pressão
de memória, e agora este.

### Onde isto encaixa no resto

É a terceira forma da mesma família que apanhei em dois dias:

- o instrumento que mede **a forma da escrita** em vez da propriedade;
- o detector **calibrado pelo critério** que verifica, e por isso confirma o
  critério e não o facto;
- e agora o vermelho **verdadeiro sobre um estado que não é o do produto**.

Nas três, a saída é a mesma pergunta: *o que MAIS produziria este resultado?*

## A noite em que o meu aparelho mediu a base do outro — 05/09

O sintoma apareceu três vezes e eu tratei-o duas como estado sujo: **o script
falha, o teste passa sozinho.** À terceira fui ver porquê, e estava na linha 14
de **todos** os `provar-*.sh`:

```bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
```

O `.env` da árvore de revisão apontava para `bossaos_dev` — **a base do JR**. Os
scripts carregam-no DEPOIS das minhas exportações e nada o repõe. Construí base
separada, árvore separada, porta separada e guarda de CPU, e tudo isso foi
anulado por uma linha dentro dos scripts que uso como autoridade.

O `base-de-revisao.sh` até tem um comentário a avisar que, se a ordem se
inverter, «as provas iam bater na base do JR — que é exactamente o que este
ficheiro existe para impedir». O aviso estava certo e a defesa estava no sítio
errado.

**Isto explica quase todo o ruído da noite:** o falso alarme do SKU, a
«regressão» na retenção, os vermelhos que mudavam de sítio. Não era estado sujo
aleatório — era outro agente a escrever na base a meio da minha medição.

### E depois estraguei quatro vezes a tentar consertar

Vale mais escrever isto do que o conserto:

1. **Reapliquei as revogações colando `FROM bossaos_app` em todas** — oito eram
   do `bossaos_auth`. Deixei `allergens` sem SELECT e a suite morreu na
   preparação.
2. **Corrigi o papel e apanhei um `REVOKE … ON language c`.** «permission denied
   for language c».
3. **Pus o `DROP DATABASE` depois do `dev-db.sh`** — apaguei a base que ele
   acabara de preparar; o Prisma recriou-a nua, sem papéis nem concessões por
   omissão. 43 concessões onde a receita dá 67.
4. **Acusei a base do JR de estar mal endurecida.** Não estava. 67 é o número de
   uma construção limpa; as anomalias (92, 96, 43) eram todas minhas.

A solução era a simples e estava à minha frente desde o início: **a base nasce
vazia.** O `provar-migracoes-do-zero.sh` já demonstrava que as 39 migrações
aplicam limpas contra uma base vazia. Eu tinha a prova na mão e continuei a
remendar por texto.

### As duas regras que ficam

- **Um remendo que traz um defeito novo é um sinal, não um contratempo.** Ao
  segundo, parar e procurar a solução que não precisa de remendo.
- **Não acusar o ambiente de outro agente sem construir o meu do zero primeiro.**
  Escrevi que ia avisar o JR de um problema que era meu. Duas vezes em dois dias
  atribuí a outros um defeito do meu instrumento.

## Os cinco instrumentos desta sessão, e a regra que eles partilham — 05/09

Construí cinco coisas hoje: `varrer-alcance-da-etapa.sh`, `provar-marco-e21.sh`,
`validar-indice-de-contratos.sh`, `validar-silenciadores.sh` e
`demonstrar-defeito-do-fuso.sh`.

**Os cinco têm as mesmas duas propriedades**, e verifiquei-o em vez de o assumir:

| Instrumento | trata «não medi» | controla-se a si próprio |
| --- | --- | --- |
| `varrer-alcance-da-etapa` | sim | sim |
| `provar-marco-e21` | sim | sim |
| `validar-indice-de-contratos` | sim | sim |
| `validar-silenciadores` | sim | sim |
| `demonstrar-defeito-do-fuso` | sim | sim |

**Não foi disciplina: foi cicatriz.** Os dois primeiros nasceram sem isso e
mentiram-me:

- o **detector do fuso** rebentou por falta de uma função na base, saiu com
  código 1, e eu li esse 1 como o defeito. Anunciou FALHA por uma razão que não
  tinha nada que ver com o produto;
- o **`provar-marco-e21`** apanhou um `Terminated: 15` e **anunciou regressão do
  marco**. Se eu tivesse acreditado, vinha dizer que o marco caiu e mandava o JR
  caçar uma regressão inexistente.

**A regra, e vale para qualquer instrumento que eu escreva:**

> **Há três respostas — certo, errado e NÃO MEDI — e a terceira é a mais
> frequente.** Um instrumento escrito com duas transforma qualquer interrupção
> num alarme. E o zero de «tudo bem» e o zero de «não medi» escrevem-se igual:
> por isso o leitor tem de se controlar a si próprio e dizer que está cego,
> em vez de devolver silêncio e deixar quem lê chamar-lhe verde.

E a extensão que aprendi ao ver o JR: **um controlo negativo é melhor do que um
script.** O meu `varrer-alcance` tem de ser corrido por alguém que se lembre; o
controlo dele — «caiu o alcance: o motor de stock ficou desligado do produto» —
acende sozinho sempre que a etapa se prova.

## A guarda que se recusou a mentir sob contenção — 05/09

Corri a `validar-testes.sh` três vezes em cinco minutos, com o JR a correr suites
de navegador ao lado:

```
1ª  FALHA  auth: NAO MEDI — o corredor de testes nao chegou a escrever o sumario.
           Isto NAO e o mesmo que zero testes.
2ª  (li como vermelha, sem ver a razao)
3ª  ok     9 pacotes, 322 testes no domain, 43 no ui … 0 falhas.  saida: 0
```

**A guarda comportou-se bem nas três.** Sob contenção de CPU não conseguiu ler o
sumário do `auth` e disse **NÃO MEDI**, com a frase que a salva: *«isto não é o
mesmo que zero testes»*. Não inventou um zero, não passou a verde, não acusou o
produto.

**Quem se portou mal fui eu, duas vezes seguidas e em direcções opostas:** disse
«era transitório» sem prova, e a seguir disse «ainda vermelha» a partir de uma
corrida que também estava contendida. **Só a terceira mediu.**

**A regra que fica, e é a mesma da noite noutra escala:** quando o instrumento
diz NÃO MEDI, a resposta não é repetir até dar o que eu quero — é repetir **com a
máquina livre** e reportar a corrida limpa. Repetir até gostar do resultado é
escolher a medição pelo resultado, e isso não é medir.

**E o elogio que a guarda merece:** ela podia ter contado `0 testes` no `auth` e
seguido. Um zero silencioso ali teria sido um verde vazio dentro de uma guarda
escrita contra verdes vazios.

## Nenhuma pergunta sobre uso se responde só em TypeScript

**06/09, 06h30.** Declarei uma tabela como esquema sem uso a partir de um `grep`
de TypeScript. O chamador estava numa função `SECURITY DEFINER`, dentro de uma
migração. **A decisão que tirei disso teria apagado a defesa contra um
restaurante ficar com o domínio de outro.**

**A regra:** antes de dizer que algo não é usado neste produto, procura-se em
`*.ts`, `*.tsx` **e `*.sql`** — e nas migrações, que é onde vivem os gatilhos, as
políticas e as funções `SECURITY DEFINER`.

E há uma razão para isto ser pior do que parece: **as `SECURITY DEFINER` são
exactamente onde está a lógica que o runtime não pode fazer sozinho.** Ou seja, o
ponto cego cobria precisamente a parte mais sensível do produto — aquilo que
existe porque não se confia no processo da aplicação para o fazer.

**A varredura passou a ler `.sql` também.** O número não mudou — nenhuma função
TypeScript é chamada de SQL, e não podia ser. Fica escrito porque **a alteração
não é a correcção**: a correcção é esta regra, e o instrumento que falhou foi o
meu `grep` de circunstância, não o guião.

## Ler prosa é legítimo quando a prosa É o artefacto — e é um defeito quando ela substitui um mecanismo

**06/09, 06h50.** Duas coisas na mesma meia hora, e a segunda só apareceu porque
a primeira me deixou a olhar.

**Primeiro, à mão.** Fui verificar quais das 27 guardas têm controlo negativo com
um `grep` pela frase «controlo negativo». Acusou **sete**. Fui lê-las: todas as
sete o tinham — escrito por outras palavras (`autoteste`, `sonda`, «o detector
prova-se a si próprio», «degradei o índice e a guarda continuou a dizer»). **A
minha afirmação original — só o `validar-ci-verde` está sem — estava certa, e o
instrumento com que a fui reconferir era pior do que ela.**

**Depois, em produção.** O `validar-jornada.sh` decidia «há controlo negativo
declarado» com `grep -liE 'elo partido|CONTROLO NEGATIVO|deve parar'` sobre o
ficheiro da prova. Um **comentário** com a frase passava. E estava verde por
sorte: a linha que a fazia passar era `// A jornada tem de PARAR aí` — um
comentário, três linhas acima do mecanismo verdadeiro. **Veredicto certo, razão
nenhuma.** Apagar o mecanismo e deixar o comentário mantinha-a verde; medi-o.

**A distinção que me faltava:**

| A guarda lê prosa em | Veredicto |
| --- | --- |
| Um **documento** — HANDOFF, ETAPAS, uma assinatura | **legítimo.** A prosa é o artefacto; o invariante é mesmo textual |
| Um **ficheiro de código**, como prova de que existe um mecanismo | **defeito.** A prosa é uma alegação sobre o mecanismo, e alegações não se verificam a si próprias |

Foi por não ter esta linha que fechei a dívida 4 do E34 «sem achado». O critério
que usei — «as que leem prosa têm invariante textual» — é verdadeiro para o
`validar-handoff` e o `validar-registo-coerente`, e falso exactamente para a
terceira. **Fechei-a com o critério errado, e o critério certo reabre uma.**

**O que substituiu a prosa:** uma alavanca é a variável que o corredor **põe numa
corrida e não põe noutra, sobre a mesma prova**. É a definição de controlo
negativo — o mesmo instrumento em dois mundos — e não precisa de lista de nomes,
que era a outra maneira de isto envelhecer: configuração está em todas as
corridas, alavanca está numa só. Provado nos três sentidos (prosa sozinha
rejeitada, alavanca aceite, `DATABASE_URL` em todas as corridas rejeitada) e
depois contra o produto partido: **a guarda antiga diz «0 falhas», a nova diz
FALHA, sobre exactamente a mesma árvore.**

## A sexta forma de verde vazio: verde na bancada, vermelho no que se publica

**06/09, 07h20.** As 27 guardas leem a **árvore de trabalho**. O que se publica é
o **commit**. Enquanto os dois coincidem ninguém dá por nada — e quando divergem,
todas as guardas ficam verdes sobre uma coisa que não é a que sai daqui.

Descobri-o a olhar para um ficheiro solto e foi **reincidência**:

| commit | ficheiro do catálogo |
| --- | --- |
| `1f9675c` E07 | limpo |
| `95201cd` E32 | **com o plante** — e eu assinei o E32 |
| `e13b318` | limpo — o commit chamado «Resíduo de bancada» |
| `de3eb52` E33 | **com o plante outra vez** |

Um defeito plantado para um controlo negativo foi reposto na bancada e não
commitado. `validar-classes` dava **2 falhas no HEAD e 0 na árvore**. E o commit
que corrigiu a primeira vez removeu a **instância** sem impedir a **classe**, por
isso voltou uma etapa depois.

**Já tinha aprendido isto e não o trouxe para cá.** O `publicar.sh` publica um
commit via `git archive` exactamente por esta razão — foi um dos nove tropeções
do deploy. Aprendi-a no deploy e deixei as guardas a medir a bancada.

**`scripts/validar-no-commit.sh`** corre o corredor inteiro contra o conteúdo de
um commit, numa árvore ligada. O controlo negativo é a **própria história deste
repositório**: exige vermelho no `de3eb52` e verde no `e13b318`. Não há sonda
fabricada mais honesta do que um commit real que se sabe que carrega o defeito —
uma sonda escrita à mão envelhece, um SHA não.

**E o instrumento acusou em falso duas vezes antes de servir**, as duas por
medir o seu próprio ambiente:

- **Quatro pacotes «a reprovar»** que eram `ERR_MODULE_NOT_FOUND`: uma árvore
  nova não tem `node_modules`. As dependências passam a vir da bancada, dito no
  cabeçalho.
- **Doze ficheiros «por commitar»** que eram os meus próprios symlinks: o
  `.gitignore` diz `node_modules/` **com barra**, e barra só casa directórios —
  um symlink escapa. A cura não foi esconder os links: a verificação «não se
  revê árvore suja» é sobre a **bancada**, e numa árvore ligada está a ser feita
  à árvore errada, que é limpa por construção. Agora declara, como o
  `validar-ci-verde` faz dentro da CI.

E na mesma passagem, a minha `validar-rls` escrevia **NÃO MEDI com o código de
saída de FALHA** — a regra das três respostas quebrada pela guarda que a servia.
Agora tenta o `.env` primeiro, e só declara quando não há mesmo maneira.

## Li a definição e chamei-lhe a chamada — duas vezes no mesmo dia, 06/09

Hoje errei a mesma coisa duas vezes, com seis horas de intervalo, e da segunda
vez já tinha escrito a primeira aqui ao lado.

**De manhã.** Publiquei uma raiz de causa em quatro passos que dizia que o
`resolverAlvos()` corria no topo do módulo em `staff-telas.spec.ts`. Corre no
`beforeAll`. O que eu tinha lido era a linha do **`import`**, que naqueles
ficheiros vive na linha 6 — e chamei-lhe o sítio de chamada.

**À tarde.** Escrevi que o `provar-alvos-e-matriz.sh` corre o projecto `painel`
inteiro, porque a linha do Playwright diz `--project=painel "$@"` e o corredor
invoca os guiões sem argumentos. Só que aquele `"$@"` está **dentro de uma
função** que faz `shift` do ficheiro de saída, e os dois sítios que a chamam
passam-lhe ficheiros explícitos. Corrigi uma frase verdadeira para uma falsa,
publiquei-a e mandei-a ao Matheus.

**A forma:** *um símbolo aparece no ficheiro; eu leio o sítio onde ele é
**declarado** e trato-o como o sítio onde ele é **usado**.* `import X` não é
chamar `X`. `f() { … "$@" … }` não diz o que chega a `f`. Uma assinatura, um
`import`, uma declaração de tipo, um `export` — nenhum deles é evidência de uso.

**A regra, e é uma pergunta:** *quantos sítios usam isto, e vi-os?* Se a resposta
for «vi um», falta perguntar se esse um era a declaração. Grep pelo símbolo
devolve a declaração **e** as chamadas na mesma lista, sem os distinguir, e o
olho pega no primeiro.

**O controlo que a apanha:** procurar o símbolo e **contar as ocorrências**. Uma
só ocorrência num ficheiro que claramente o usa é o sinal — é quase sempre a
declaração sozinha, e o uso está noutro sítio com outro nome. Foi assim que
apanhei a segunda: o `correr` tinha de ser chamado nalgum lado, e eu não tinha
olhado para lado nenhum.

**E o custo real não é o erro, é a construção por cima dele.** Da primeira vez
parei o implementador a meio de uma correcção com fundamento errado. Da segunda
inventei uma contradição que não existia — «a suite falha à mão mas o guião que a
corre passou» — e ainda lhe dei uma hipótese razoável. Uma explicação plausível
para um facto que eu próprio fabriquei é a coisa mais difícil de desfazer,
porque ela **soa** a trabalho bem feito.

## O contorno que traz a asserção que o mata — 06/09

O JR anotou duas vezes a mesma coisa: um valor de que o caminho precisa e que
**nenhuma superfície entrega** — o `organizationId` na J14, o `recibo_publico` na
J08. Duas ocorrências fazem uma classe, e fui medir a população em vez de a
coleccionar de duas em duas.

**São sete as leituras directas à base em `provas/jornada.test.ts`, e a
classificação é limpa:**

| | quantas | o que são |
| --- | --- | --- |
| verificação de invariante | 4 | a organização não existir antes; a caixa não fechar duas vezes; os reembolsos; o registo de auditoria da J15 |
| diagnóstico no ramo de falha | 2 | lêem a auditoria para **dizer o motivo** quando a publicação bloqueia, em vez de o adivinhar |
| **contorno de lacuna do produto** | **1** | o `organizationId`, porque nenhum ecrã o mostra |

O `recibo_publico` nem contorno tem: o ecrã do recibo diz `numero` ou
`nao-e-documento`, e a prova regista **qual dos dois viu** em vez de afirmar um
número que não existe. É lacuna declarada, não andaime.

**Uma só em sete. A classe existe e não é epidemia** — e isso só se soube por se
ter contado, em vez de se ter concluído das duas que apareceram.

### A técnica, que é o que fica

No único contorno, ele escreveu isto a seguir:

```
assert.ok(!ecra.texto.includes(id),
  'o ecrã já mostra o identificador da organização — este passo deixou de fazer sentido');
```

**O contorno traz a asserção que o mata.** No dia em que o produto expuser o
identificador, o passo **falha** — e a falha diz que o andaime pode ser deitado
abaixo. Sem isto, um contorno sobrevive à razão que o criou: a lacuna fecha, o
atalho fica, e ninguém volta a olhar porque estava verde.

É a mesma doença da lista de excepções que ninguém revisita, na forma de código
em vez de configuração. E a cura tem a mesma forma: **a declaração tem de caducar
sozinha.**

**A regra:** todo o andaime que existe por falta de uma superfície do produto tem
de carregar a asserção que o apaga. Um `TODO` não serve — não corre. Um
comentário não serve — não corre. Só serve uma asserção que **fica vermelha**
quando a razão do andaime desaparecer.

### E porque é que hoje NÃO fiz disto uma guarda

Seria natural pôr aqui um contador com tecto, como fiz nas suites sem guião. Não
pus, e a razão é a mesma que faz uma guarda valer: **o ficheiro está a ser escrito
neste momento** — a J12 e a J15 estão a nascer. Um tecto sobre um ficheiro em
construção fica vermelho a cada passo legítimo, e uma guarda que grita sem razão
gasta o crédito de que precisa quando gritar com razão.

Fica para quando as oito jornadas estiverem escritas. **Isto é adiamento
declarado, não esquecimento** — que é a diferença entre uma pendência e uma
dívida escondida.

---

## A noite das nove formas — 06→07/09

Uma noite inteira de revisão da RV100, com dois implementadores. Contei **mais de
quinze** medições minhas que deram a resposta errada, e nenhuma por descuido:
cada uma tinha um instrumento plausível a apontar para o sítio errado.

**Escrevo-as por FORMA e não por instância**, porque a lição está escrita a três
metros daqui, no cabeçalho do `validar-no-commit.sh`: *«o commit que corrigiu
isto removeu a INSTÂNCIA e não impediu a CLASSE, por isso voltou uma etapa
depois»*.

### 1. Procurei o meu vocabulário em vez do do produto — seis vezes

Procurei `offline` e tive zero: o produto chama-lhe **`semRede`**. Procurei
`acessibilidade` e encontrei o `provar-acesso.sh`, que é sobre **autorização**.
Procurei `role="dialog"` e tive zero no produto inteiro: o `<dialog>` **nativo**
tem semântica implícita. Procurei `plante` dentro do `validar-no-commit.sh` e não
estava lá, porque ele enumera as guardas por **glob**.

**A pergunta que resolve:** *como é que ESTE código chamaria a esta coisa?* E
quando não sei, pergunto ao artefacto — o catálogo de desenho enumerou-me os
seis estados que eu andava a adivinhar.

### 2. Substring a passar por palavra — quatro vezes

`lorem` dentro de `valorEm`. `logo` dentro de `catálogo`. `tema` dentro de
`sistema` — e essa é um **defeito do produto**, porque o `-g` do guião do tema
não tem fronteira e arrasta quatro casos alheios. `iva` dentro de `alternativa`
e de `activa`.

### 3. Uma funcionalidade que a ferramenta não tem — duas vezes

`git grep -E '\bfoo'` **não casa nada**: o `\b` não existe ali. Deu-me um «zero
chamadores» e um «zero literais de cor», ambos falsos, e o segundo só caiu
porque corri o mesmo padrão contra um ficheiro onde eu **sabia** haver 26.

### 4. Contei o texto do programa e chamei-lhe a coisa que ele desenha — três vezes

`height: [0-9]+px` contou **`line-height`** e quase me deu um defeito de zoom
inexistente. Contar `bo-botao--primario` por ficheiro deu três primários no ecrã
que fecha contas — e eram **três ramos de um ternário**, um só renderiza.

**Regra:** uma regra sobre o que se vê responde-se no DOM. Uma contagem no
código-fonte responde a outra pergunta.

### 5. O cano comeu o código de saída — duas vezes

`cmd | tail` devolve o estado do `tail`. Deu-me `exit=0` com `FALHA` impressa por
baixo. **Está escrito no meu próprio runbook** e voltei a fazer.

### 6. Li o número como a explicação que me convinha — duas vezes

«Zero `<dialog>` cru» tem duas leituras: *tudo passa pelo componente* e *não há
diálogos*. **Escolhi a primeira sem dar por isso** e o implementador provou a
segunda. E vi **dois vinte-e-noves** — namespaces com código, etapas no atlas — e
li-os como o mesmo conjunto; são 29 e 25, e ele disse-o melhor do que eu diria:
*«dois conjuntos com o mesmo cardinal é como uma confirmação falsa se disfarça de
confirmação»*.

### 7. Medi um eixo e presumi o segundo — duas vezes, em direcções opostas

Contei o que as rotas **pedem** sem ver o que o arnês **já dá**: estimativa
inflacionada. Depois medi os **parâmetros** e presumi o **alcance**: deflacionada.

**Regra que fica:** quando a estimativa oscila muito entre duas medições, a
variável nova não é a resposta — **é o eixo que eu não tinha medido**.

### 8. Inflexão — duas vezes

`simultan` não apanha `SIMULTÂNEAS`. `reveja|rever` não apanha **«Revise»**, e
por isso contei 3 recuperações em 23 quando havia mais.

### 9. Assumi a forma de um identificador — uma vez

`^[A-Z]+-[0-9]+` deu **17** onde a guarda dizia 46. Os 29 em falta eram
`RES-B-001` — **dois segmentos**. E o desacordo foi o que salvou a medição: um
padrão que desse 46 por acaso teria escondido que a dívida é quase toda de
reservas.

---

### O que separou os erros que morreram dos que iam para o relatório

Todos foram apanhados pela mesma coisa, e não foi cuidado: **um segundo número
que discordava do primeiro**, ou **um controlo apontado a um sítio onde eu sabia
a resposta**.

O implementador escreveu-o na sua sonda melhor do que eu: *«um detector partido
reporta exactamente o mesmo que um produto sem diálogos: zero»*. **Zero não é uma
medição** enquanto o mesmo instrumento não acertar num alvo conhecido.

### E o que isto diz sobre a revisão a dois

Das nove formas, **três foram-me apanhadas pelos implementadores** — o «zero
diálogos», os «dois vinte-e-noves» e a régua do herói que não media nada na home.
Nenhuma delas eu teria encontrado sozinho, porque em todas eu tinha um número a
dar-me razão.

**É para isto que são dois.** Não para dividir trabalho — para que o erro de um
tenha alguém do outro lado com um instrumento diferente.

---

## Proteger trabalho em voo sem lhe tocar — 07/09

Com dois implementadores a mexer na mesma árvore e uma sessão já perdida esta
noite, apareceu um problema que não é de revisão mas mata revisões: **horas de
trabalho por commitar, numa sessão que pode morrer.**

O reflexo errado é commitar por eles. Fi-lo por acidente às três da manhã, com um
`git add -A` numa pasta partilhada, e o histórico ficou com trabalho de outro
debaixo da minha mensagem.

**O que funciona:**

```
git stash create "descrição"     # devolve o objecto, NÃO mexe na árvore
git tag -f salvaguarda-… <obj>   # dá-lhe nome recuperável
```

`stash create` produz o *commit* de salvaguarda e **não toca na bancada** — o
`md5` dos ficheiros deles fica idêntico, e o `git status` continua a mostrar o
mesmo número de modificados. Verifiquei as duas coisas das duas vezes.

**E uma lição sobre a etiqueta.** À primeira chamei-lhe `salvaguarda-jr-alvos` e
estava certo; à segunda repeti o nome e **metade dos 15 ficheiros era do outro
agente** — o `pilot/page.tsx` e o `trust/page.tsx` do lote que eu tinha acabado
de passar. Uma etiqueta que mente sobre o que guarda é pior do que não existir:
quem recuperar dali fica a achar que tem só o trabalho de um.

Corrigi para `salvaguarda-dois-agentes`. **A rede de segurança também precisa de
dizer a verdade sobre o que apanhou.**

---

## Fui procurar uma violação e encontrei a justificação escrita — 07/09

A `marketing.spec.ts` esteve intacta em cinco lotes seguidos, com `git diff` de
zero linhas, e de repente apareceu com **22 inserções e uma remoção**. A remoção
é que importa: o §11.1 proíbe reescrever um teste para ele ficar verde.

A linha removida era a âncora do MKT-010: `marcador: '.bo-mkt__passos'`.

**E a justificação estava no diff, antes de eu perguntar:** aquele elemento **era
o defeito**. O RV100-013 diz que a página de piloto «recicla dois passos da
implantação e não tem um único facto de piloto» — os passos eram as chaves
`passo3` e `passo4`, as mesmas do `/getting-started`, palavra por palavra.
Tirá-los levou a âncora com eles.

E a distinção que a torna legítima está medida, não afirmada: **nenhuma asserção
foi tocada.** As três que correm sobre aquela rota — transbordo, alvos de 44 px,
contraste — continuam iguais e continuam a correr. **Mudou o selector que espera
pela página, não o que se exige dela.**

**A regra que fica:** «não reescrever um teste para ficar verde» não proíbe mexer
num teste. Proíbe mexer no que ele **exige**. Um marcador que aponta para o
elemento que um achado mandou remover **tem** de mudar — e a prova de que a
mudança é honesta é o conjunto de asserções ficar byte a byte.

---

## A décima forma, e é pior do que as nove — 07/09

As nove formas que escrevi esta noite produzem todas um número **estranho**: um
zero onde devia haver algo, um total que não bate, uma contagem que muda entre
corridas. **Todas convidam a um segundo olhar.**

O implementador da landing encontrou a décima, e essa produz **o número que se
espera**.

Ele construiu um detector para o RV100-012 — *«coral e cítrico estão praticamente
ausentes da superfície comercial»* — e o detector comparava

```
--bo-acento  →  "#F5664D"          (o texto do token)
getComputedStyle().color  →  "rgb(245, 102, 77)"   (o que o navegador devolve)
```

**Nunca iguais.** O `usaCoral` era **0 por construção**, nas duas fases.

E a frase dele é a que interessa:

> «E o zero era **plausível**, porque o RV100-012 diz exactamente que o coral está
> ausente. **Um detector partido a concordar com o achado que devia medir.**»

**Nenhuma das minhas nove regras o teria apanhado.** «Ler as linhas que o número
contou» não ajuda quando o número é o esperado. «Controlo positivo» ajudaria — e
ele não o tinha, porque quem espera zero não sente falta de um.

**O que o apanhou foi outra coisa: o número não se mexeu depois de uma mudança
que tinha de o mexer.** Não foi o valor que denunciou o instrumento — foi a
**derivada**.

### A regra que fica

**Quando um instrumento confirma a hipótese que foi construído para testar, ele
não mediu nada até provar que sabe discordar.** E a prova não é um controlo
negativo qualquer: é plantar exactamente aquilo que se espera não encontrar, e
exigir que o detector o veja.

Foi o que ele fez: o detector normaliza agora através do navegador e **planta um
elemento coral, exigindo vê-lo**.

### E as outras duas do mesmo relatório

**Duas escritas perdidas em silêncio.** As edições de CSS dele imprimiram
«escrito» e não persistiram. *«O meu `print` não provava nada sobre o flush»* —
passou a escrever com `with` e a **fazer `grep` ao ficheiro depois**. É a família
do `HTTP 200 ≠ entrega`, dentro do próprio processo.

**Um tempo-limite de 5 minutos** que fazia o instrumento falhar à primeira e
passar à segunda, sempre. *«É a guarda que ensina as pessoas a ignorá-la.»*
Subido para 15, com a razão escrita lá dentro.

---

## O plante que estava na LIMPEZA, e o que ele explica — 07/09

O terceiro plante que sobrou esta noite não era num teste nem em código de
ecrã: estava no `inspeccao-comum.ts`, **nos `DELETE` que limpam a base entre
corridas**. E o que ele removia era isto:

```sql
-  … WHERE numero LIKE '${PREFIXO}%' OR aberto_por LIKE '%@inspeccao.example'
+  … WHERE numero LIKE '${PREFIXO}%'
```

**A limpeza deixou de apagar os pedidos abertos por utilizadores de inspecção
que não levassem o prefixo.** Cada corrida deixa órfãos, e a base é partilhada
por dois agentes.

### O que isto reabre

Esta madrugada a `validar-alvos-com-casa` deu **11 tabelas** numa corrida, **31**
noutra e **15** noutra. Levantei a hipótese de a base estar a ser mexida por
baixo, **fui testar, e não reproduzi** — três corridas seguidas deram o mesmo.
Registei-o honestamente como *«uma leitura anómala e quatro consistentes»* e
deixei ficar.

**Este plante é um mecanismo plausível para aquela oscilação, e é melhor
hipótese do que a minha.** Uma base que acumula órfãos entre corridas dá contagens
diferentes conforme o que sobrou — e as minhas três corridas «consistentes»
podem ter caído todas na mesma janela sem semear nada pelo meio.

**Não digo que é a causa.** Digo que a hipótese que eu tinha arquivado por não
reproduzir passou a ter um mecanismo, e que arquivá-la foi certo com o que eu
sabia e insuficiente com o que sei agora.

### A regra que fica, e é diferente da anterior

Já tinha escrito que **repor um plante é seguro quando o ficheiro está parado, e
não quando o guião que o plantou morreu**. Falta a segunda metade:

**Um plante na limpeza não é um defeito parado — é um defeito que trabalha.**
Enquanto lá está, cada corrida piora o estado que a corrida seguinte vai medir.
Os plantes em código de ecrã esperam; os que mexem no estado partilhado
**acumulam**, e o custo deles cresce com o tempo que ficam.

Por isso este teve de ir para o implementador em vez de esperar: **a decisão de
o repor pertence a quem tem a medição a correr**, mas o facto de ele existir não
pode esperar pelo fim dela.

---

## A hipótese que passou a medição, e a forma do argumento — 07/09

Passei-lhe o plante da limpeza como **hipótese**: *«não digo que é a causa, digo
que agora há um candidato com mecanismo»*. Ele devolveu-a medida.

```
órfãos que o plante NÃO apaga ........... 64
pedidos de inspecção COM prefixo ......... 0
order_lines presas a esses órfãos ....... 64
production_tasks presas ................. 64
```

**O zero é a peça que fecha o raciocínio**, e é dele: zero pedidos com prefixo
significa que a última limpeza **correu** e apagou tudo o que ainda conseguia
ver. Os 64 são exactamente o que o predicado em falta a impedia de alcançar.

E ligou-o ao meu instrumento: **`production_tasks` é precisamente uma das tabelas
que a `validar-alvos-com-casa` conta.** Logo o número que eu vi oscilar depende
de quantas corridas se acumularam desde a última limpeza completa.

**E tornou-a falsificável**, que é o que separa uma hipótese de uma história
plausível:

> «Bate a "instabilidade da base" porque **prevê a direcção**: monotonicamente a
> subir entre limpezas completas, e a repor quando uma corre.»

**A previsão cumpriu-se à minha frente.** Depois de ele repor o ficheiro, fui
contar: **zero órfãos**. Subiram até 64 e caíram para 0 quando a limpeza voltou a
alcançá-los.

### A forma do argumento sobre a linha de base dele

Eu tinha-lhe pedido *«se concluíres que não afecta o que mediste, quero a razão,
não a conclusão»*. A razão que ele deu não é «verifiquei e parece bem» — são
**dois factos estruturais independentes**:

1. **A corrida dele nunca executou o código plantado.** O config do scratchpad
   não tem `globalSetup` nem `globalTeardown` — *«o único acerto do grep está
   dentro de um comentário na linha 13, não é uma definição»*. **É a distinção
   entre a definição e a chamada, aplicada a um ficheiro de configuração.** E o
   registo da corrida não menciona semeadura nem limpeza, onde a oficial imprime
   uma linha própria.
2. **As páginas dele não vêem a base.** Zero `@bossaos/db`, `obterBase` ou
   `prisma` nas oito rotas medidas. Sete são `force-static`.

> «**Não vou recolher o antes outra vez — não porque confio nele, mas porque a
> entrada de que ele depende é disjunta da entrada que o plante corrompe.**»

**É a diferença entre «verifiquei e está bem» e «a corrupção não tem caminho até
à minha medição».** A segunda não precisa de confiança.

### E o que ele recusou fazer

Não apagou os 64 órfãos. *«São inequivocamente resíduo de inspecção, mas apagar é
uma escrita destrutiva numa base partilhada com o JR, e com o ficheiro reposto a
limpeza da corrida seguinte remove-os por definição. **Limpar à mão seria eu a
fazer o trabalho do teardown no estado de outra pessoa.**»*

É a mesma regra pela qual eu guardei o trabalho em voo dele com `stash create` em
vez de commitar por ele.

---

## A décima primeira forma: o controlo de população que só pergunta «há alguma coisa» — 07/09

Encontrada pelo implementador da landing, **no instrumento dele**, e confirmada
por mim **no meu**.

O arnês dele acumulava resultados num array de módulo. **O Playwright reinicia o
worker depois de uma falha** — logo um worker novo carregava o módulo de novo e o
array voltava a `[]`. Escreveu **20 registos em vez de 40**, e não se queixou: a
página que faltava tinha passado e simplesmente não estava na saída.

> «**O meu controlo de população perguntava `> 0`, e 20 é maior do que zero.**»

### E fui ver as minhas

A `validar-coral-da-arte.sh`, que eu escrevi esta noite, dizia:

```bash
[ "$total" -gt 100 ] || naomedi "so $total ficheiros alcancados"
```

**Varria 709 ficheiros.** Se o pathspec caísse para 200 — uma pasta renomeada, um
glob que deixa de casar — a guarda **passava**, a varrer um terço do produto e a
reportar verde.

Corrigi-a: a população passou a ser **declarada** (`POPULACAO_DECLARADA=690`), e
uma queda abaixo dela dá `NÃO MEDI` em vez de silêncio. Provei nas duas direcções
— com um número impossível dá `exit 2` e nomeia a queda; reposto, verde a 717.

**As outras não estão todas corrigidas**, e digo-o: a `validar-dados-ficticios.sh`
tem o mesmo `-gt 100` sobre 672 ficheiros. Fica registado aqui, e não fingido.

### A diferença entre esta e a décima

Parecem a mesma coisa — «um controlo que não sabe falhar» — e o mecanismo é
diferente, o que importa para as apanhar:

- **A décima**: o detector produz **a resposta que se espera**. O zero do coral
  era plausível porque o achado dizia que o coral está ausente. **Defende-se
  plantando o que se espera não encontrar.**
- **A décima primeira**: o controlo produz **um passe seja qual for a
  resposta**. `> 0` não distingue 40 de 20. **Defende-se perguntando "estão
  todos?" em vez de "há algum?".**

**Um piso não é uma medição de completude.** Diz que não está vazio, e é tudo o
que diz.

---

## O princípio que fecha as onze formas — 07/09

O implementador da landing acabou um relatório com quatro defeitos de instrumento
que ele próprio encontrou **no mesmo lote**: o `usaCoral` que era zero por
construção, duas escritas de CSS perdidas em silêncio, um controlo de população
que não distinguia 20 de 40, e uma navegação sem relógio próprio que consumia o
orçamento do teste inteiro e fazia o relatório **culpar o teste**.

E fechou com a frase que resume tudo o que esta noite produziu:

> «Todos apareceram de **um número que não se mexeu, um ficheiro que não mudou,
> ou uma contagem que não bateu** — **nunca da ferramenta a reportar sucesso.**»

### Porque é que isto é a regra e não um resumo

Olhando para trás, **nenhuma das onze formas foi apanhada pela saída do próprio
instrumento**. Nem uma.

- O `\b` do `git grep` deu **zero**, e o zero parecia uma resposta.
- O `height:.*px` deu **31**, e 31 parecia uma contagem.
- O `-g` sem fronteira **passou**, verde.
- O `> 0` sobre 20 registos **passou**, verde.
- O detector do coral deu **zero**, e o zero era o esperado.

**Todos reportaram sucesso ou um número plausível.** O que os apanhou foi sempre
uma coisa exterior ao instrumento:

| o que denunciou | quantas vezes |
| --- | --- |
| um número que **não se mexeu** depois de uma mudança que o obrigava | 2 |
| um **segundo número** da mesma coisa que discordava | 4 |
| um **controlo** apontado a um alvo onde eu sabia a resposta | 3 |
| um **ficheiro** cujo `mtime` desmentia o relatório | 1 |
| uma **contagem** que não batia com a esperada | 1 |

### O que isto obriga a fazer

**Um instrumento nunca é testemunha de si próprio.** Ler a saída dele — verde,
vermelho, um número — não diz nada sobre ele ter medido.

Portanto, antes de escrever qualquer resultado:

1. **mexer uma coisa que obriga o número a mexer-se**, e confirmar que ele se
   mexeu — é a derivada, e apanhou a forma que nenhuma regra apanhava;
2. **obter o mesmo facto por um caminho diferente**, e comparar;
3. **apontar o detector a um alvo conhecido**, e exigir que acerte;
4. **perguntar «estão todos?»**, e não «há algum?».

Nenhuma destas quatro lê a saída do instrumento. **É de propósito.**

---

## Um falso rasto que morreu antes de chegar a quem o ia perseguir — 07/09

O implementador reportou a **terceira escrita perdida** no mesmo `estilos.css` e
foi honesto sobre o que tinha: *«não tenho explicação para o padrão além de as
escritas não sobreviverem; o que tenho é o hábito que o torna sobrevivível —
`grep` ao ficheiro depois de cada escrita, e nunca confiar na minha própria
mensagem de sucesso»*.

Fui procurar-lhe a causa. E encontrei uma que parecia óbvia: **o commit da
acessibilidade, do JR, aparecia na minha lista de commits que tocam no
`estilos.css`.** Dois agentes a escrever a mesma folha explicaria tudo.

**Era falso, e a forma do erro é a minha número quatro.** O meu laço fazia
`git show --stat $c | grep -q "estilos.css"` — e o `--stat` imprime **a mensagem
do commit** antes da lista de ficheiros. A mensagem do JR menciona o ficheiro
sem lhe tocar. **Contei o texto da saída em vez da coisa.**

Pela via correcta — `git log -- <caminho>` e `git show --numstat` — o commit dele
altera **zero** linhas do `estilos.css`, e as sete alterações ao ficheiro são
todas dos lotes L1a a L1h, do mesmo implementador.

### Porque é que registo isto

**Não é o erro que importa — é onde ele parou.**

Há seis horas dei-lhe um facto errado («cinco acções exigem servidor») que ele
teve de me corrigir, e a guarda que ele construiu tê-lo-ia desmentido na primeira
corrida. Desta vez o erro morreu na minha mão.

**Uma causa errada é pior do que nenhuma causa**, e a assimetria é grande: sem
causa, ele mantém o hábito que já o protege — `grep` depois de escrever. Com uma
causa errada, vai investigar coordenação entre agentes, encontrar nada, e o
hábito perde-se pelo caminho enquanto ele persegue um fantasma que eu inventei.

**O padrão continua sem explicação, e é assim que lho digo.**

### Nota lateral que vale para todo este registo

Os agentes commitam com a identidade git do Matheus. **Não dá para atribuir
trabalho por autor** — só por mensagem e por conteúdo. Foi o que me obrigou a
grepar a saída em vez de filtrar, e foi daí que veio o erro.

---

## O alfabeto que eu presumi, na lista onde a completude é o ponto — 07/09

Levantei o RV100-022 escrevendo que o `ALERGENIOS_UE` tem **13** entradas. **Tem
14.** O JR contou-as e corrigiu-me.

A causa não foi uma janela truncada — foi o **alfabeto**:

```
o meu padrão:  '([a-zA-Z_]+)'
o que caiu:    'frutos-de-casca'      ← tem hífen
```

**Letras e underscore. Sem hífen.** E o que o padrão deixou cair foi **os frutos
de casca rija** — uma das alergias graves mais comuns — **numa lista onde a
completude é o ponto todo**.

É a segunda vez esta noite que presumo o alfabeto de um identificador. A primeira
foi `^[A-Z]+-[0-9]+` a dar 17 onde havia 46, porque os `RES-B-001` têm **dois
segmentos**. Nessa, o desacordo com a guarda salvou-me. **Nesta, escrevi o número
errado num achado e foi preciso outro agente para o apanhar.**

### E a defesa que ele usou, que é melhor do que qualquer padrão meu

> «14 alérgenos declarados num prato — a lista inteira do `ALERGENIOS_UE`,
> **contada do domínio e não fixada aqui**.»

**Um teste que conta a lista da fonte não pode discordar da fonte.** O meu erro
só foi possível porque eu extraí o número para o meu lado; o dele é imune por
construção — se a UE acrescentar um alergénio amanhã, a prova dele passa a exigir
15 sozinha, e a minha continuaria a dizer 13.

**A regra: quando a completude de uma lista é o que está em causa, não se conta a
lista — pede-se-lhe o tamanho.**

---

## Contar medições em vez de coisas — 07/09

O JR reportou **cinco** alvos de toque abaixo do mínimo na carta pública. Pedi-lhe
que os classificasse **por natureza e não por tamanho**, porque a WCAG isenta a
ligação que vive dentro de uma frase.

Ele voltou com uma coisa que eu não tinha pedido e que valia mais:

> «**UM elemento, não cinco.** Os "5 alvos" que eu reportei são **cinco medições
> do mesmo elemento**, uma por largura — o mesmo `115×23` em todas. **Contar
> medições em vez de coisas é inflar um achado sem o querer, e a inflação era
> minha.**»

### É a mesma forma que me apanha a mim, do outro lado

Eu tenho contado **ocorrências no código-fonte** e chamado-lhes coisas no ecrã:
`line-height` contado como altura de contentor, três ramos de um ternário
contados como três botões, ocorrências de classe contadas como elementos.

Ele contou **linhas de saída do instrumento** e chamou-lhes elementos.

**A forma é uma só: a unidade da contagem não era a unidade da afirmação.** E o
sintoma é o mesmo — um número verdadeiro que responde a outra pergunta.

**A defesa também é uma só:** antes de escrever «N», dizer em voz alta **N o
quê** — e verificar que o instrumento conta essa coisa e não o rasto dela.

## E a classificação que ele fez vale por si

```
disp=inline   pai=NAV   textoIrmao=false   nav=true
```

**Não há texto solto no pai** — a ligação não vive dentro de uma frase. É um item
de navegação isolado. E a razão que ele dá para a isenção não se aplicar é melhor
do que a que a norma escreve:

> «**O dedo que falha nele não tem linha de texto onde acertar.**»

É *por isso* que uma ligação em prosa é isenta — a linha à volta dá ao dedo onde
aterrar. Um item de `<nav>` sozinho não dá.

**Veredicto: 1 controlo autónomo, 0 em prosa.** Um achado a sério em vez de cinco
falsos — e a 23 px **falha até o nível AA da 2.5.8**, que pede 24, quanto mais os
44 que o produto cumpre nos outros controlos.

---

## RETIRADA — «a correcção que ficou presa à superfície» era falsa — 07/09

> **Esta entrada está errada e fica com a correcção por cima, não apagada.** O
> que escrevi a seguir assentava numa leitura truncada minha, e o implementador
> desmontou-a com um controlo negativo. Deixo o texto original abaixo porque
> apagar um erro tira a lição dele.

**O que eu disse:** que a regra de `min-height` sobre o `<a>` existia só sob
`.bo-staff` e `.bo-kds`, e que a carta pública partilhava a classe sem regra —
«removeu a instância e não impediu a classe».

**O que é verdade:** a linha **1179** é `.bo-publico__seccoes a` **sem âmbito
nenhum**, com `min-height: var(--bo-toque-publico)`, e nasceu no `c8723c5`, na
E10, muito antes desta noite. As linhas 587 e 632 são **reforços** para 48 px nas
superfícies de operação — não a única fonte do 44.

**Como errei:** o meu grep tinha **40 resultados e eu li os primeiros 8**. A regra
que desmentia tudo estava na posição 20-e-tal.

**É a terceira truncagem da noite** — a `-A20` que me escondeu o décimo quarto
alergénio, o extractor de pendências que guardava a primeira linha, e este
`head -8`. E é a pior das três, **porque desta escrevi uma entrada de doutrina**.
Um número errado morre no relatório seguinte; uma lição errada fica a orientar
quem vier.

**E o que o implementador encontrou é maior do que o que eu tinha inventado.** Ele
mediu com e sem folha de estilos:

| | com a folha | sem folha (controlo) |
| --- | --- | --- |
| caixa | **94 × 44** | 150 × 18 |
| `display` | `flex` | `inline` |
| `min-height` | 44px | 0px |

**Um `<a>` `inline` aceita `padding` horizontal e ignora `min-height`** — largura
com folga e altura de linha de texto. **É a assinatura de um elemento a
renderizar sem estilos**, e o `115×23` do JR tem exactamente essa forma.

Se se confirmar, o defeito não é uma regra em falta: **é um ecrã a renderizar sem
folha de estilos** — e o elemento está no **MENU-018**, o ecrã do QR expirado,
que é precisamente o tipo de estado raramente renderizado onde uma superfície sem
estilos se esconderia.

**A regra que eu quase o fiz escrever não teria movido um pixel** — e agora tem
duas razões: era redundante **e** apontava ao mecanismo errado.

---

### O texto original, mantido para não se perder o que o erro ensina

#### A correcção que ficou presa à superfície onde foi encontrada — 07/09

O JR mediu uma ligação de navegação a **115×23 px** na carta pública. O
implementador foi corrigi-la, não conseguiu reproduzir, e reportou que *«os
quatro `<nav>` públicos já têm `min-height: 44px`»*.

**Os dois tinham razão**, e a contradição resolve-se em duas linhas do
`estilos.css`:

```css
.bo-staff .bo-publico__seccoes a { min-height: var(--bo-toque-operacao); }
.bo-kds   .bo-publico__seccoes a { min-height: var(--bo-toque-operacao); }
```

**A regra sobre o alvo existe só sob `.bo-staff` e `.bo-kds`.** A carta pública
usa **a mesma classe** e não tem regra. O `min-height` que o implementador
encontrou está no **contentor**, e a WCAG mede **o alvo**.

### E este defeito já tinha sido encontrado uma vez

O comentário imediatamente a seguir, na linha 589, di-lo:

> «O índice do STAFF-022 tinha ligações de **22 px** de altura — e é ele que dá o
> único caminho a dez das telas. A prova de navegador apanhou-o; **nada mais
> apanhava, porque uma ligação pequena não é um erro em lado nenhum**.»

**Alguém encontrou isto no Staff, corrigiu no Staff, e a correcção ficou presa às
duas superfícies onde foi encontrada.** A pública partilha o selector e ficou de
fora.

É «removeu a INSTÂNCIA e não impediu a CLASSE» — a frase que está no cabeçalho do
`validar-no-commit.sh` — **e desta vez a instância e a classe partilham até o
nome do selector**. Bastava o prefixo cair para a regra cobrir as três.

### A lição, que é sobre onde se escreve uma correcção

Quando uma guarda apanha um defeito **numa superfície**, a pergunta seguinte não
é «como o corrijo aqui» — é **«que outras superfícies partilham o mecanismo que
falhou?»**. Aqui o mecanismo tinha nome próprio (`.bo-publico__seccoes a`) e
estava à vista.

---

## E o nome que ele deu à forma mais sedutora do verde vazio

O mesmo implementador tinha escrito uma regra nova para fechar este achado
**antes de verificar** — e era redundante:

> «**Teria fechado o achado no papel sem mover um pixel.** É a forma mais sedutora
> do verde vazio: **uma correcção que parece uma correcção.**»

Removeu-a. **Escrever a correcção antes de reproduzir o defeito produz sempre
alguma coisa** — e essa coisa parece trabalho, passa em revisão, e fecha a linha
no registo. Só não move nada.

---

## Três achados, uma causa: o build que dois agentes partilham — 07/09

O `115×23` que o JR mediu na carta pública **não se reproduz**. O implementador
mediu com e sem folha de estilos e a diferença é decisiva:

| | com a folha | sem folha |
| --- | --- | --- |
| caixa | **94 × 44** | 150 × 18 |
| `display` | `flex` | **`inline`** |

**Um `<a>` inline ignora `min-height`.** O `115×23` tem essa assinatura — não é
uma regra em falta, é um elemento **servido sem os seus estilos**.

**E a causa está na linha 118 do `playwright.config.ts`:**

```js
command: `pnpm build && … next start -p ${PORTA}`
```

**A porta é parametrizada. O build não é.** Dois agentes a correr provas escrevem
o mesmo `.next` — e uma página servida a meio de uma reconstrução sai sem o CSS.

### O que isto une

É **o mesmo defeito** que no lote L1f deu *«`/es-ES/getting-started` a 200 e
depois a 500 com o mesmo código»*. E o mesmo que fez o `next-env.d.ts` — ficheiro
versionado — oscilar entre duas sessões.

**Três sintomas em superfícies diferentes, uma causa.** E a correcção foi
recusada, com razão, a meio de um lote: mexer no `tsconfig` para isolar tipos
sujava a árvore do outro agente, e a resposta certa é uma **árvore de trabalho
separada** — maior do que qualquer dos lotes onde o sintoma apareceu.

### E a lição sobre o que uma guarda consegue guardar

A guarda do JR **verifica que a porta 3018 está livre** e dá `NÃO MEDI` se não
estiver. Fez o que podia: **guardou o recurso que via**.

O `.next` partilhado não aparece em `lsof`, não tem porta, não tem dono visível.
**Um recurso partilhado que não se anuncia não é guardável pela guarda que o
usa** — tem de ser isolado por quem monta o arnês.

**Foi a única vez esta noite em que a resposta certa não era uma guarda melhor.**

---

## Uma cura que muda o que uma sonda antiga mede — 07/09

Ao fechar o P1 do id mal formado, o JR pôs a cura na camada de âmbito: um
segmento que não é UUID passa a dar **404** em vez de 500.

**E isso mudou, em silêncio, o que uma sonda de outro agente media.** Ele
escreveu-o:

> «A cura do `escopo.ts` faz com que a minha antiga sonda `nao-e-um-uuid` devolva
> agora 404 **por outra razão** — deixou de testar o que testava.»

A sonda **continua a passar**. O 404 que ela esperava continua a chegar. **Só que
já não vem do ramo que ela queria exercitar** — vem da validação nova, a montante,
e o `!dados → notFound()` nunca é alcançado.

**É a irmã silenciosa do plante por repor.** O plante deixa um defeito onde não
devia estar; isto deixa **uma sonda a apontar para onde já não há nada**. As duas
sobrevivem a uma corrida verde.

**A defesa dele foi trocar o sujeito da sonda**, e não o resultado esperado:
passou a usar **um UUID verdadeiro que pertence a outra casa**, que continua a
exercitar o ramo certo.

**A regra que fica:** quando uma correcção intercepta uma condição **a montante**,
toda a sonda que dependia de essa condição chegar ao fundo passa a medir outra
coisa — **e passa na mesma**. Corrigir alguma coisa obriga a perguntar **que
provas atravessavam o sítio que se acabou de fechar**.

---

## E a minha hipótese do `not-found` caiu — falsificada por um traço

Propus que o `denied` saísse em branco porque um `notFound()` lançado num
**layout** se resolve no `not-found` do segmento **pai**, e a raiz não tem
ficheiro.

**Falso, e verifiquei-o:** o `notFound()` está **na página**
(`organization/unidades/[locationId]/page.tsx:51`), o layout tem **zero**
chamadas, e há exactamente **um** `not-found.tsx` na árvore, sob `[idioma]` — que
devia apanhá-lo.

**E o que ele fez a seguir é o que eu queria ter feito primeiro:** em vez de
acusar o produto com os dois factos ainda em contradição, **tirou a própria
medição da equação**. O `waitUntil: 'domcontentloaded'` pode fotografar **antes**
de a interface de erro chegar no fluxo — *«a mesma forma do verde falso que eu já
me tinha apanhado: um instrumento a produzir a resposta que eu esperava»*.

O arnês novo **distingue em vez de confirmar**, com três saídas que querem dizer
coisas diferentes: marcador presente → a captura estava em corrida; HTML
substancial sem marcador → renderiza-se outra coisa; HTML vazio → o branco é do
produto.

**Uma medição que só sabe dizer «passa» ou «falha» não podia separar estes três.**

---

## A prova que me desmentia já estava escrita no ficheiro — 07/09

Duas das três «avarias de produto» dos ecrãs mestres **não eram do produto**. O
`M03 denied` e o `M04 erro` renderizam o ecrã desenhado — 414 e 373 caracteres
visíveis, 20 929 e 17 852 de HTML. As capturas brancas eram o obturador do arnês.

**E eu construí uma teoria em cima de uma delas.** Propus um mecanismo de
resolução do `not-found` do Next para explicar um branco que não existia. **Uma
explicação plausível de um artefacto de medição é uma explicação de nada** — e a
plausibilidade não é sinal de que o fenómeno seja real. Construí o mecanismo
todo antes de perguntar se havia o que explicar.

**Mas o pior é isto: a prova que me desmentia já estava escrita, no mesmo
ficheiro, e eu li por cima.** O `ALVO-RV100-MESTRES.md:249` diz, à letra:

> «O `M03-denied` e o `M03-erro` saíram **byte a byte idênticos**, a 5851; o
> `M04-erro` e o `M04-offline` a 2740.»

**Duas condições diferentes não podem produzir ficheiros byte a byte iguais.**
Isso não descreve dois defeitos diferentes do produto — descreve **uma máquina a
fotografar o mesmo nada duas vezes**. Foi exactamente esse raciocínio que apanhou
os primeiros quatro brancos da mesma corrida. **A regra estava escrita, tinha
funcionado, e mesmo assim os brancos seguintes foram lidos como produto.**

**A regra que fica: saídas idênticas byte a byte sob condições que deviam
diferir acusam o instrumento, não o sujeito** — e uma regra que já apanhou uma
avaria não fica a trabalhar sozinha; tem de ser aplicada outra vez ao caso
seguinte, que é precisamente onde eu falhei.

**E a forma de que isto é caso: herdei a medição de outro agente como facto.**
Não me chegou como instrumento — chegou como *achado*, já com a forma de
conclusão. Toda a doutrina aqui é sobre não acreditar nos meus instrumentos; o
que me faltava é que **a saída de outro agente é um instrumento na mesma**, e o
facto de vir escrita em prosa afirmativa esconde-o melhor do que qualquer código.

---

## A décima segunda forma: uma guarda que conta a ADOPÇÃO de um mecanismo, não o seu RESULTADO — 07/09

**Fechei o P1 dos ids malformados e a cura tem um buraco.** A frase com que o
fechei foi esta, e é o próprio erro:

> «A partição fecha: 128 páginas sob um segmento de id, 128 alcançam o invólucro,
> 0 vão à base por fora dele.»

**A partição é estanque — e sobre a propriedade errada.** «Alcançar o invólucro»
não é «devolver 404». Contei **quantas páginas adoptaram o mecanismo**, e chamei
a isso ter provado **que o mecanismo funciona**. São coisas diferentes, e a
distância entre elas é exactamente onde o defeito vive: **há três invólucros de
escopo e a cura cobre dois.** `comEscopo` e `comIdentidade` traduzem o `P2023`;
**`comEscopoSerializavel` não tem tradutor nenhum** — tem um `exigirUuid` de um
único campo, que parece cobertura e guarda um id de vários.

**Todas as minhas defesas passaram.** O controlo negativo acendia numa página
que escapasse ao invólucro — e nenhuma escapa. A contagem reconciliava. A sonda
funcionava. **Nada disto podia ver o buraco, porque tudo media a mesma
propriedade: quem chama, e não o que sai.**

**É a irmã da população que fecha por soma.** Ali o erro era um piso (`> 0`) onde
era preciso completude; aqui a completude está lá, perfeita, **medida sobre o
predicado errado**. Uma partição correcta sobre a propriedade errada é mais
perigosa do que uma contagem frouxa, porque exibe rigor.

**E eu tinha escrito a saída no próprio registo:** «FICA DECLARADO POR ELE e
aceito: a ponta do navegador — que o 404 CHEGA ao cliente — está por medir.»
**Nomeei a única coisa que faltava medir e fechei o achado à mesma.** Nomear uma
lacuna não é fechá-la; escrevê-la ao lado de um veredicto de conforme faz dela
decoração.

**A regra que fica: uma guarda tem de medir o RESULTADO na ponta de que o
utilizador vive — o código HTTP que sai — e não a presença do mecanismo que
supostamente o produz.** E sempre que eu aceitar uma ponta «por declaração», o
achado fica ABERTO até ela ser medida, sem excepção.

---

## Varri os meus próprios vistos à procura da duodécima forma — e não havia segunda — 07/09

Apanhado o fecho que media adopção em vez de resultado, a pergunta seguinte é
óbvia: **quantos dos outros vistos que assinei têm o mesmo defeito?** Uma forma
nova não vale nada se só se aplicar ao caso em que foi descoberta.

Passei os 24 achados por um crivo — a linguagem do `status` que fala de
**presença** (usa, chama, alcança, existe, declarado) contra a que fala de
**resultado** (renderiza, mede, http, 404, píxeis, bytes, ao vivo). Quatro
fecharam com mais presença do que resultado. Julguei os dois piores a sério:

- **RV100-017** — fechei-o a dizer que «o `mktE10.demoAviso` diz ao visitante que
  os pratos são inventados». **Uma chave de tradução existir não é o visitante
  lê-la.** Fui ver: `Demonstracao.tsx:82` renderiza-a mesmo, num `<p>`, nas três
  línguas, com fundo, respiro e largura de leitura — não está escondida — e o
  componente chega a quatro rotas, a home entre elas. **Aguenta-se.**
- **RV100-011** — fechei-o na caixa de consentimento «existe, não é pré-marcada».
  A pergunta certa não é o ecrã, é **se a distinção chega onde os dados vivem**.
  Chega: o esquema tem `consentimentoMarketing` **e** `consentimentoEm`, omissão
  a `false`, e a rota grava-o. **Aguenta-se, e melhor do que eu o escrevi.**

**O resultado da varredura é que não há segunda ocorrência.** Escrevo-o porque é
a parte que interessa: **depois de apanhar uma falha real, a varredura seguinte
fica sob pressão para render alguma coisa.** Um detector que precisa de encontrar
acaba por encontrar — e teria sido fácil promover «o contraste de 14px sobre a
superfície suave está por medir» a achado, quando isso é outra pergunta que se
me atravessou no caminho e não a que eu tinha ido fazer.

**A regra que fica: uma varredura que sai vazia é um resultado, e escreve-se.**
O que muda é a redacção dos vistos, não os vistos: nos dois casos eu tinha
medido bem e **descrito mal** — creditei a presença do mecanismo quando o que me
tinha convencido foi o resultado. Um `status` que descreve a prova errada ensina
a forma errada a quem o ler, mesmo quando o veredicto está certo.

---

## Um controlo negativo que só cobre metade da população — 07/09

A guarda nova do RV100-024 mede o código HTTP que sai, e o JR correu-lhe um
controlo negativo: desligou a tradução no `sessao.ts` e viu-a ficar vermelha.
**Correu-o num lado só, e a guarda mede dois.**

Apliquei o **mesmo** plante aos dois — `ehIdentificadorMalFormado(null)`, que
torna a tradução inerte **sem deixar nenhum símbolo por usar**, condição para o
build sobreviver e o arnês arrancar:

| plante idêntico | veredicto |
| --- | --- |
| via de **sessão** | **FALHOU** — `organization/unidades/…` e `puerto/orders/…` a 500 |
| via de **ecrã** | **verde**, `ecra=2 falhas=0`, com a tradução desligada |

**O vermelho da sessão é o que dá valor ao verde do ecrã — e destrói-o.** Prova
que o build está vivo e que a medição HTTP é real; e por isso o verde do outro
lado não se pode desculpar com «não chegou lá». **Aqueles dois 404 não vêm da
tradução.** São o «não encontrado» próprio das rotas — a mesma armadilha que o
JR tinha diagnosticado horas antes, escrita por ele: *«esses 404 nunca foram do
meu mecanismo»*. A guarda nova herdou-a em metade da população.

**A regra: um controlo negativo cobre a população que exercita, e não a que a
guarda mede.** Se a guarda tem duas vias, o controlo tem de plantar nas duas —
um único plante a acender prova que o instrumento *pode* falhar, não que falha
**onde é preciso**. É a irmã do piso `> 0`: ali a população era metade contada,
aqui é metade controlada.

**E o subproduto que quase me enganou três vezes: um plante que parte a
compilação não testa a guarda, testa o compilador.** Os meus primeiros três
deixavam um símbolo por usar, o build caía, o arnês não arrancava e a guarda
dizia **NÃO MEDI** — que é o comportamento certo dela e um controlo inválido meu.
**Só a terceira resposta me impediu de ler aquilo como vermelho.**

---

## O `thumbnail` apagou o sinal, e foi o controlo POSITIVO que o denunciou — 07/09

Para medir a identidade sem o wordmark contei píxeis do acento nas capturas. A
primeira versão reduzia cada imagem a 400 px antes de contar — e deu **0,000% em
todas as telas sem wordmark**. Ia daí concluir que o produto não tem cor de
identidade fora do logótipo.

**O meu controlo negativo passou e não serviu de nada.** A mesma captura em
cinzento dava 0,000%… **e os sujeitos davam 0,000% também.** Um controlo que
devolve o mesmo valor que o sujeito não distingue coisa nenhuma: eu não sabia se
não havia acento ou se o detector estava cego.

**Foi o controlo POSITIVO que resolveu** — uma mancha sintética do próprio
`#F5664D`, que tem de dar 100%. Deu, e sem redimensionar as capturas o retrato
mudou **em todas as linhas**: o Staff e o KDS passaram de 0 a 214–408 px. **O
`thumbnail` mistura píxeis e apaga exactamente o que eu procurava** — acentos
finos, bordas, botões pequenos. O instrumento destruía o sinal antes de o medir.

**A regra: um controlo negativo sozinho não valida um detector que reporta
zero.** Zero é o valor que um detector avariado também produz. Quando o resultado
esperado é «não há», é o controlo **positivo** que carrega a prova — e ele tem de
apontar a um alvo que o detector *tem* de ver.

E o remate, que é o mesmo de sempre por outro caminho: **confirmei depois que os
zeros do backoffice e da carta eram reais**, subindo a tolerância a 90 e 150 —
continuam zero, e só a 240 acendem, que é largura a apanhar ruído. Um zero
verdadeiro aguenta a tolerância a crescer; um zero de instrumento não se
distingue sem lhe mexer.

---

## Um alvo de controlo que não podia falhar — e a exigência que o apanha — 07/09

Fecho do RV100-024, e a última volta trouxe a peça que faltava. Eu tinha medido
que o controlo negativo cobria só metade das vias. **A causa era pior do que
cobertura: os dois alvos do lado do ecrã eram incapazes de exibir o defeito.**
O kiosk já validava o uuid — com um comentário a descrever esta mesma falha — e
a ficha da carta procura o produto num instantâneo em memória, sem tocar em
coluna nenhuma. **Os 404 deles eram das rotas, e ficavam verdes com a tradução
desligada porque nunca dependeram dela.**

**A correcção geral não foi trocar os alvos. Foi exigir que eles se mexam:**

> Com a tradução inerte, **cada alvo TEM de deixar de dar 404.** Um alvo que
> continue em 404 não está a medir a tradução — está a medir a rota, e a guarda
> diz isso em vez de o deixar passar por prova.

Isto é o controlo a validar-se **alvo a alvo**, e não no conjunto. Um verde
agregado esconde um alvo morto; a exigência de movimento não o consegue esconder.
E o plante passou a ser **encontrado**, não escrito à mão — substitui-se a
chamada ao reconhecedor em todos os sítios onde ela existe, por isso uma via
nova amanhã fica coberta **por existir**, sem ninguém se lembrar dela.

**E o número fugiu quatro vezes.** `P2007`, `P2010`, `22P02`, `P2023` — quatro
formas do mesmo facto, e cada vez que se acrescentava um código à lista aparecia
outro caminho com o seguinte. **A frase do Postgres é a mesma nas quatro, porque
é ela que descreve o que aconteceu.** A regra: quando uma condição enumera
códigos e a lista não pára de crescer, é sinal de que se está a perguntar pelo
mensageiro e não pelo facto.

**O fecho é meu e com prova minha nos dois lados:** limpo dá verde 4/4; o plante
na sessão dá vermelho; o plante no ecrã dá **agora** vermelho nas duas rotas de
`/platform` — o mesmo experimento que uma hora antes dava verde. É isso, e só
isso, que autoriza a assinatura.

---

## A prova tem prazo de validade, e o prazo é o último commit que toca no produto — 07/09

Fechado o P1, ia tratar de pôr as telas-mestre à frente do Matheus. Fui ver as
horas antes: **as 25 capturas são das 10h54, e a cura entrou às 11h32** — e o
commit dela mexe em `apps/web/src/servidor.ts` e `packages/db/src/escopo.ts`,
ou seja **no produto**, não só em provas.

**O `M03-erro` é a fotografia de um 500 que já não existe.** Ia mandá-la para
aprovação humana como retrato do produto.

**A forma é nova e é geral: uma prova não é verdadeira ou falsa, é verdadeira ATÉ
uma data.** Todas as outras armadilhas desta noite eram sobre o instrumento medir
mal; esta é sobre uma medição **correcta no momento em que foi feita** e que
deixou de descrever o produto sem que nada nela mudasse. Nenhum controlo interno
a apanha — a captura continua nítida, o ficheiro continua lá, o teste que a gerou
continua verde.

**E é mecanizável, que é o que a torna útil:** comparar o `mtime` de cada
artefacto de prova com a data do último commit que toca em `apps/` ou
`packages/`. Prova mais velha do que a última alteração ao produto é prova
**suspeita por construção**, sem ninguém ter de se lembrar.

**A regra: antes de mostrar evidência a alguém, perguntar o que mudou no produto
desde que ela foi recolhida.** E a pergunta gémea, a que quase falhei: quando uma
correcção entra, perguntar **que provas é que ela acabou de envelhecer** — irmã
directa da lição de hoje sobre as sondas que passam a medir outra coisa.

---

## Fechei a guarda da frescura, e primeiro medi-a mal — 07/09

`validar-provas-frescas.sh` existe e funciona: compara o `mtime` de cada
artefacto com o último commit que toca em `apps/` ou `packages/`, tem sonda
(um ficheiro datado de 2000 tem de ser visto como velho, e sai da árvore a
seguir), e declara o que não sabe — num clone fresco não mede nada, e o conteúdo
da prova está fora do seu alcance.

**E o M03-erro deixou de ser a fotografia de um 500:** `500 → 404`,
`95 → 414` caracteres, `ecraDesenhado false → true`. Verificado no índice.

**Mas eu li a guarda como se ela não reprovasse.** Corri
`bash guarda | tail; echo $?` e reportei **saída 0** — e aquilo era o código de
saída do `tail`. Sem cano, dá **1**, que é o correcto. **É a terceira vez esta
noite que o `| tail` me engole o código de saída, e a regra já estava escrita
por mim neste ficheiro.** Uma regra escrita não protege quem a escreveu: só um
hábito na mão o faz, e o hábito é nunca pôr um cano entre o comando e o `$?`.

**Onde esta guarda tem de estar verde — e é decisão minha, do lado do portão.**
Ela está vermelha agora, com 39 artefactos anteriores ao produto, e isso está
CERTO. A tentação é enfraquecê-la para deixar de incomodar; a resposta é o
contrário: **verde repo-inteiro não é o alvo, porque o corpo de prova do RV100
envelhece sempre que o produto muda, e uma guarda permanentemente vermelha passa
a ser ignorada — que é como ela morre.**

O alvo é **o momento em que a prova é mostrada a alguém**: antes de eu emitir o
`PRONTO PARA APROVAÇÃO VISUAL HUMANA`, esta guarda tem de estar verde **para os
artefactos que vão nessa entrega**. Fora desse momento, ela é um relatório
honesto de dívida. **A frescura não é uma propriedade do repositório; é uma
condição de quem apresenta.**

---

## Verificar a entrega: dois instrumentos a mentir na mesma sessão, em sentidos opostos — 07/09

Publiquei o preview do §7.1 e disse ao Matheus que abria no telemóvel.
**Publicar não é entregar**, por isso fui ver — e o que se passou a seguir vale
mais do que a verificação.

**Primeiro instrumento: os meus cliques não chegavam ao iframe.** Cliquei numa
captura: nada. Cliquei na lupa: nada. Ia concluir que a página estava partida.
**O que me salvou foi mandar o clique a um alvo que não pode falhar** — uma
pastilha de navegação, que é um `<a href="#M03">` puro. Também não fez nada. **Um
âncora de HTML não se parte;** logo o defeito estava na entrega do clique, e não
na página. É o mesmo raciocínio do alvo que não podia exibir o defeito, virado do
avesso: aqui usei de propósito um alvo que **tinha** de responder.

**Segundo instrumento: o meu servidor local corrompia o texto.** Para testar o
gesto fora do sandbox servi o mesmo ficheiro por HTTP — e apareceu `telemÃ³vel`,
`pÃ¡gina`. Ia registar um defeito de codificação. **Medi antes:** o ficheiro é
UTF-8 válido, e o meu `python3 -m http.server` manda `Content-type: text/html`
**sem `charset`** — o browser cai em latin-1. **A corrupção era do transporte, e
o mesmo ficheiro tinha aparecido correcto na artifact minutos antes.**

**Dois falsos defeitos do produto na mesma verificação, ambos meus, em direcções
opostas:** um fez uma página que funciona parecer partida; o outro fez um
ficheiro correcto parecer corrompido.

**E a saída foi a mesma nos dois casos: mudar o CAMINHO até ao sujeito, mantendo
o sujeito idêntico.** O gesto que o sandbox não me deixava dar, dei-o pelo
fragmento do URL — `:target` é conduzido por navegação, não por clique — e a
ampliação abriu, provada no mesmo ficheiro. **Quando o instrumento não alcança o
sujeito, troca-se o instrumento e não a conclusão.**

**E o que fica por medir, dito: não verifiquei o toque DENTRO do sandbox.** O
mecanismo é âncora + `:target`, sem JavaScript nenhum — tirei o JS precisamente
para não haver um ponto único de falha — e está provado a funcionar no ficheiro
idêntico. Mas provado ali, não lá. É NÃO MEDI, e escreve-se assim.

---

## Um resumo pode partir uma partição que a fonte tinha inteira — 07/09

Fui pôr em causa o mapa das 792 composições porque as parcelas que eu tinha
escrito no documento do portão não somavam: **120 + 202 + 16 = 338**, e a
população é 396. Uma partição que não fecha é o sinal que eu venho a usar a noite
toda, e apontei-o à fonte.

**A fonte estava certa e o meu resumo é que estava errado.** O
`06_O_PORTAO_DE_COBERTURA.md` diz **120 com endereço único + 276 que exigem
estado = 396**, e diz que os **16 são um subconjunto dos 276** — «destes, sem URL
nenhum». O meu resumo escreveu 202 onde a fonte diz 276, e promoveu um
subconjunto a **terceira categoria**, o que é o erro mais feio dos dois: sugere
três bolsos disjuntos onde há dois e um recorte.

**A forma, e é nova: uma partição sobrevive à análise e morre no resumo.** Todo
o cuidado tinha sido posto onde a contagem foi feita; a linha de sumário — a
única que alguém lê ao correr o olho pelo portão — desfez-a. **Quem lesse o
portão levava um mapa que cobre 338 de 396 e não saberia que lhe faltavam 58.**

**A defesa é a mesma e é barata: um resumo com números tem de somar ao total, e
verifica-se onde ele está escrito, não onde ele foi calculado.** Se o resumo não
repete o total, não se pode verificar — por isso o total passa a fazer parte da
frase.

---

## Um número num portão sem a hora a que foi medido apodrece em silêncio — 07/09

Varri os números que publiquei esta noite à procura de outra partição partida.
**A varredura foi má: casei com DÍGITOS e não com afirmações**, e apanhei o `24`
de uma escala de espaçamento, o `120` da largura de um logótipo, o `164` de um
número de linha. Ruído quase todo — o mesmo erro de procurar a forma em vez do
significado que já me apanhou sete vezes hoje.

**Mas uma discordância era real, e entre dois documentos meus:** o portão dizia
`marketing.spec.ts` **65/65 conforme**; o changelog, mais abaixo, descrevia o
mesmo ficheiro a cair para **58 com 7 vermelhos**.

**A resolução não estava na prosa de nenhum dos dois. Corri o teste: 68.** Nem
65 nem 58 — entretanto nasceram três provas, e o vermelho do changelog era um
momento transitório já resolvido. **Os dois documentos descreviam verdades
antigas, e nenhum estava errado no dia em que foi escrito.**

**É a prova com prazo de validade outra vez, mas em prosa.** Ali era um `mtime`
de captura, e a guarda `validar-provas-frescas.sh` apanha-o. Aqui é um **número
citado num veredicto**, e não há `mtime` que o proteja: a frase continua a ler-se
com a mesma confiança no dia em que deixa de ser verdade.

**A regra, e é barata: um número que sustenta um veredicto leva a hora a que foi
medido, dentro da própria frase.** Sem a hora, ninguém sabe se precisa de o
remedir — e um portão relido daqui a uma semana é exactamente o sítio onde isso
importa. **Não é rigor a mais: é a diferença entre um facto e a memória de um.**

---

## Um invariante não apodrece; um retrato apodrece — e a prova estava dentro da guarda — 07/09

Emiti o `PRONTO` apoiado nas linhas do portão, por isso fui remedir as que
assentam em contagens. **Os três veredictos sobreviveram. Nenhum dos números
sobreviveu.**

| o portão dizia | medido às 12h30 |
| --- | --- |
| `2402` chaves × 3 | **2595** — as três continuam iguais |
| um `href="#"` em **419** ficheiros | um — mas são **739** ficheiros |
| `NEXT_PUBLIC_SITE_URL` por definir | continua por definir |

**É isto que torna um número velho perigoso: ele não vira a conclusão.** Se
virasse, alguém dava por ela. Como não vira, nada obriga a remedir, e a frase
continua a ler-se com a mesma confiança enquanto apodrece por dentro.

**E a lição melhor não é «pôr a hora» — é escolher o que se afirma.** «2402
chaves × 3» é um **retrato**, e um retrato só é verdade num instante. «As três
têm exactamente as mesmas chaves» é um **invariante**: cresce com o produto e
continua verdadeiro. O mesmo para os CTA — o número que sustenta o veredicto é o
**um** que falta, não os 419 ficheiros onde ele não está.

**A prova disto apareceu dentro da própria guarda das línguas, e é a coisa mais
limpa que vi hoje:** o cabeçalho dela diz *«medido a 06/09: 2343 chaves em cada
um dos três»* — e a guarda, ao correr, mede **2595**. **No mesmo ficheiro, a
parte que MEDE está viva e a parte que AFIRMA apodreceu.** Não há melhor
argumento para preferir uma guarda a uma frase.

**E um pormenor que não deixei por explicar:** eu contei 2596 e a guarda conta
2595. Não é erro de nenhum — há **2595 cadeias e uma lista** (`reservasE18.dias`,
os nomes dos dias), e eu contava a lista como folha. Duas medições a discordar
por **um** quase sempre são duas definições, não uma avaria; mas isso só se sabe
depois de ir ver, e «quase sempre» não é uma verificação.

---

## Nem todo o número datado apodrece — e a versão ingénua da minha regra fazia estrago — 07/09

Apanhado o cabeçalho podre da guarda das línguas, fui varrer os outros. **Cinco
guiões afirmam números com data. Só UM tinha apodrecido.** E perceber porquê vale
mais do que a correcção.

| guião | o que o número diz | apodrece? |
| --- | --- | --- |
| `validar-tres-linguas` | «2343 chaves em cada um dos três» | **sim** — hoje 2595 |
| `validar-concorrencia` | «com 22 casos no repositório, esta guarda saía a ZERO» | **não** |
| `validar-rls` | «apontei-a a uma base inexistente e a primeira linha mentia» | **não** |
| `validar-ordem` | «no commit do E28, dos 17 ficheiros exactamente UM era…» | **não** |

**O discriminador é gramatical, e é limpo:** um número apodrece quando descreve
**o estado do mundo** — «há N coisas». Não apodrece quando descreve **o que
aconteceu num momento** — «quando havia N coisas, a guarda saiu a zero». O
primeiro é uma afirmação sobre hoje que ninguém volta a verificar. O segundo é um
**registo de incidente**, e um acontecimento não muda de ideias.

**E os quatro que não apodrecem são o comentário mais valioso que uma guarda
pode ter:** explicam **porque é que ela tem a forma que tem** — que defeito a
obrigou a existir, e que controlo o apanhou. Sem isso, a guarda seguinte é
reescrita por alguém que não sabe o que ela já pagou.

**A parte que me interessa: a versão ingénua da minha própria regra de ontem
fazia estrago aqui.** «Um número datado num documento apodrece, remede-o» — e ao
remedir os quatro, eu **apagava o registo** e ficava com quatro contagens
actuais e inúteis no lugar de quatro histórias que explicam o desenho. **Uma
regra nova é mais perigosa no tick a seguir a ser escrita**, quando ainda está
entusiasmada e ainda não conhece as suas excepções.

No que ficou podre, a correcção não foi actualizar o número — foi **tirá-lo**: o
cabeçalho passa a dizer o invariante, e quem quiser o número corre a guarda.

---

## Corrigi uma linha PARA a fonte em prosa, contra a medição viva — 07/09

Há dois ticks apanhei que o resumo do portão dava `120 + 202 + 16 = 338` em 396 e
corrigi-o. **Corrigi-o para o lado errado.**

O que estava ali era uma **mistura de duas partições diferentes** — o 120 vinha
do `06_O_PORTAO_DE_COBERTURA.md`, e o 202 e o 16 vinham da guarda
`validar-alcance-das-composicoes.sh`. Por isso não somava: eu tinha juntado
metade de um mapa com metade de outro. Até aí, bem visto.

**O erro foi a seguir.** Alinhei tudo pelo `06` — prosa escrita a 06/09 — quando
existe uma guarda que **remede e escreve um CSV com uma linha por ID**:
`178 só-URL + 202 estado-partilhado + 16 a provocar = 396`. As duas partições
fecham e ambas são coerentes; são **definições diferentes** do mesmo território.
Mas uma é um texto de ontem e a outra corre hoje.

**E isto contradiz de frente a regra que eu próprio escrevi esta manhã** — «no
mesmo ficheiro, a parte que MEDE está viva e a parte que AFIRMA apodreceu». Sabia
a regra, tinha-a acabado de escrever, e mesmo assim, ao arbitrar entre duas
fontes, escolhi a que estava mais bem escrita em vez da que se verifica sozinha.

**A regra ganha uma segunda metade: entre duas fontes que discordam, a que se
remede ganha — e não a mais articulada.** Prosa boa é convincente, e convincente
não é o critério. Quando as duas têm de ficar, cita-se a viva e deixa-se a outra
nomeada como definição alternativa, que foi o que a linha do portão passa a
fazer.

---

## O «feio» do Matheus tinha três defeitos funcionais por baixo — 07/09

Ele olhou para a barra lateral do backoffice no telemóvel e disse: *«esses menus
laterais estão feios e etc, tem algumas coisas que precisa de um toque de
frontend»*. Fui ver a captura em resolução nativa em vez de julgar pela
fotografia, e **por baixo do juízo estético estavam três coisas que não são
gosto**:

| onde | o que lá está | o que devia estar |
| --- | --- | --- |
| `layout.tsx:105` | `activa: i === navegacao.length - 1` | o item da rota actual — hoje **«Reports» acende sempre** |
| `layout.tsx:116` | `activa: true` fixo no 1.º item móvel | idem |
| `layout.tsx:100` | `unidade={sessao.actor.email}` | o **nome da unidade** — o trocador mostra um email |

E dois que são mesmo de desenho: os **catorze itens têm o mesmo glifo** (quatro
quadrados, um marcador de lugar **declarado** no componente), e o item activo é
uma **pastilha verde-lima cheia** — a única coisa saturada no ecrã, que grita em
vez de indicar.

**O que isto ensina sobre ouvir um juízo estético: «está feio» é um SINTOMA, e
tratá-lo como gosto é perder o que ele está a apontar.** Ninguém olha para uma
barra lateral e diz «o item activo está preso ao último índice do array» — diz
que está feia. **A pessoa vê a consequência; o defeito fica para quem for medir.**
Se eu tivesse respondido só com paleta e espaçamento, os três ficavam lá.

**E o ícone tem uma lição própria.** O autor deixou-o declarado como pendência,
com um argumento correcto: *«inventá-la aqui daria um conjunto que teria de ser
deitado fora»*. Era verdade — **até a pessoa que o deitaria fora pedir que se
fizesse.** Uma deferência bem fundamentada continua válida só enquanto a razão
que a sustenta continuar de pé, e esta caiu com uma frase do dono do produto.

**Diagnostiquei e passei — não implemento o que vou rever.** É a razão de haver
dois, e vale mais nesta altura da noite do que valia ao princípio.

---

## O ficheiro que a construção escreve faz toda a prova parecer velha — 07/09

A correcção da barra lateral entrou, e a página que o Matheus tem no telemóvel
continuou a mostrar **o defeito de que ele se tinha queixado**. A regra da
frescura apanhou-me na minha própria entrega, que é onde ela devia doer.

Fui verificar quais capturas estavam velhas e a resposta foi **25 de 25** — o que
não podia ser: três tinham sido recapturadas minutos antes. **Duas coisas
estavam erradas, e nenhuma era do produto.**

**A primeira: comparar o `mtime` de uma captura com a HORA DO COMMIT que a
contém.** Uma captura tirada da árvore de trabalho é sempre alguns segundos mais
velha do que o commit que a inclui — são **dois relógios do mesmo
acontecimento**, e a diferença é o tempo que alguém demorou a escrever a
mensagem. Comparar assim marca como velha exactamente a prova de quem fez a
coisa certa: recapturar e commitar junto.

**A segunda, e é a melhor: `apps/web/next-env.d.ts` tinha o carimbo mais
recente de todo o produto — e é o Next que o escreve em cada construção.** O meu
próprio build tinha acabado de o tocar. Ou seja: **o acto de construir para medir
invalidava tudo o que eu ia medir.** Uma guarda assim fica vermelha para sempre a
partir da primeira corrida, e uma guarda permanentemente vermelha é uma guarda
ignorada — que é como ela morre sem ninguém a matar.

Excluindo o que a construção gera, a fonte real mais recente é das 13h20:33 e as
capturas das 13h20:51. **25 frescas, zero velhas.**

**A regra: ao definir «o produto» para efeitos de frescura, exclui-se o que a
própria construção escreve — senão o instrumento invalida a sua própria prova
sempre que corre.** E a página de aprovação passou a ser gerada por um guião que
**se recusa a produzir** se alguma captura for anterior à fonte mais recente: a
verificação deixa de depender de eu me lembrar dela.

---

## A porta de fuga é onde um defeito curado se esconde — 07/09

Deixei a barra inferior do telemóvel como **NÃO MEDI** ao fechar a revisão da
barra lateral. Fui medi-la, e encontrei a **quarta instância** do defeito que já
tinha sido curado «na classe».

A cura é boa: a `EstruturaAdmin` passou a **derivar** o item aceso do caminho, e
os chamadores deixaram de ter de saber. Mas ela traz uma **porta de fuga
deliberada** — se o chamador passar `activa` explicitamente, esse valor **vence**
a derivação. Existe por uma razão legítima: o catálogo de desenho monta maquetas
com `href="#"`, que não têm rota para derivar.

**E é exactamente por essa porta que o defeito antigo sobreviveu.** O
`platform/layout.tsx:106` continua a passar `activa: true` no primeiro item da
barra inferior — e no MESMO ficheiro, vinte linhas acima, está escrito que ali se
removeu «a TERCEIRA instância da mesma doença». **Removeu-se na navegação lateral
e ficou na barra inferior**, dois blocos abaixo, no mesmo componente, na mesma
sessão.

**A regra: uma cura que admite excepção só está fechada depois de se contar quem
usa a excepção.** Derivar por omissão não cura nada enquanto alguém continuar a
passar o valor à mão — apenas **muda o defeito de sítio, do código para a lista
de chamadas**. E a contagem separa em dois grupos que não se parecem: o catálogo
de desenho **precisa** da porta (maquetas sem rota); uma rota real que a usa
**é o defeito outra vez**.

**O que isto diz sobre o meu NÃO MEDI:** eu podia tê-lo escrito como «partilha a
derivação, portanto está coberto» — era plausível, era quase verdade, e teria
deixado a quarta instância viva. **Um NÃO MEDI honesto vale mais do que uma
inferência razoável**, e este pagou-se na primeira vez que fui medi-lo.

---

## Generalizar o critério e amostrar a população são movimentos opostos — 07/09

Passei ao JR uma tarefa estreita: «sobe estas DUAS classes de 12 para 14 px».
Ele fez melhor do que eu pedi e escreveu-o bem:

> «A régua apanhou-me a mim. Fiz a sonda medir **todo o texto de corpo abaixo de
> 14 px** e não as duas classes — a régua não é sobre uma classe, é sobre o que
> se lê.»

E a sonda larga apanhou **quatro**, dos quais os quatro eram **dele**: os títulos
de grupo que ele próprio escrevera na barra lateral uma hora antes, a 11 px.
**Uma correcção de há uma hora tinha criado o defeito que a correcção de agora
existia para apagar** — e só a versão larga do critério o viu.

**O meu erro está antes disso: transformei uma REGRA numa TAREFA.** «Nunca corpo
abaixo de 14 px» virou «arranja estas duas classes», e a tarefa deixaria quatro
violações vivas. Quem recebe uma lista de sítios corrige sítios; quem recebe a
regra procura sítios. **Passar a regra custa o mesmo e cobre o que eu não vi.**

**Mas ele reportou «zero», e a saída dele diz `0, em três rotas`.** Fui contar as
declarações abaixo de 14 px e ficaram **quatro** no ficheiro. Julgadas uma a uma:
`.bo-mkt__seta` é o glifo `▾` com `aria-hidden` (isento), a de 831 é um crachá
redondo de iniciais (discutível), `.bo-admin__etapa` não tem uso em `.tsx`
(provável CSS morto) — e **`.bo-plano__capacidade` é a lotação de uma mesa,
texto a sério, a 12 px**, num ecrã que as três rotas não visitaram.

**A forma, e é nova: generalizar o CRITÉRIO e amostrar a POPULAÇÃO são movimentos
opostos, e fazer o primeiro bem esconde que se fez o segundo.** A sonda passou de
duas classes para «todo o texto», o que é uma vitória real — e mediu-o em três
rotas de 382, o que é um piso outra vez. **O rigor no predicado deu confiança ao
número, e o número era de uma amostra.**

A defesa é a mesma de sempre e ele já a conhece: **um resultado diz sobre que
população foi medido, dentro da própria frase.** «Zero» e «zero em três rotas»
são afirmações diferentes, e a segunda não fecha nada.

---

## Corrigir o valor não é corrigir o mecanismo — e deixei o JR parado 20 minutos — 07/09

**A (1) ficou certa no número e frouxa no mecanismo.** A sobrancelha passou a
`14px/20px`, exacto. Mas o `.bo-pagina` ficou com **`max-width: 1200px` escrito à
mão** — e `--bo-largura-maxima: 1200px` **já existe** no ficheiro, consumido por
três outras regras (`588`, `591`, `619`).

O valor está certo hoje. **O mecanismo continua a ser o mesmo que produziu o
1100**: uma regra que não pergunta ao token qual é a largura máxima acaba, mais
cedo ou mais tarde, com uma largura própria. **Fixei o número e deixei a porta
por onde ele voltou a entrar.**

É a mesma forma do `activa` explícito que venceu a derivação, e do `P2007` que
escapava a uma lista de códigos: **enquanto a resposta for um valor escrito e não
uma pergunta feita, ela envelhece sozinha.**

**E uma falha de coordenação minha, que custou vinte minutos.** O JR acabou a (1)
às 13h52 e escreveu: *«Sigo para a (2) quando disseres, ou continuo já se
preferires.»* Só lhe respondi às 14h12. **Ele ficou parado à espera de uma
autorização que eu já lhe tinha dado ao numerar sete tarefas.**

A regra: **uma ordem de trabalho numerada carrega a própria licença para
continuar.** Se eu quisesse um portão entre tarefas, tinha de o dizer — e não
quero, porque o meu reparo entra em cima do que já foi entregue e não antes.
Passei-lhe isso por escrito: «não esperes por mim entre tarefas». O silêncio de
quem revê não é uma instrução, e quem espera por ele não está a ser prudente —
está bloqueado.

---

## Esperar por um fantasma que era ele próprio — 07/09

O JR ficou parado e escreveu: *«a porta 3010 continua ocupada e há 17 processos
de prova a correr — o arnês é do outro implementador neste momento, e não corro
em paralelo na mesma base.»*

**A disciplina estava certa: não correr em paralelo na mesma base é exactamente a
lição do `.next` partilhado, que custou três sintomas separados hoje.** Ele
aplicou-a bem.

**Só que o outro implementador era ele.** Fui ver com `lsof` e `ps`: o PID que
tem a porta desce de um `provar-staff-no-navegador.sh` **lançado por ele**, a
correr há doze minutos, e o lote de Playwright que o acompanha arrancou há 55
segundos — **vivo e a progredir, não encravado**. Estava à espera de si próprio.

**A forma: um processo próprio de longa duração lê-se exactamente como contenção
de outro agente.** Do lado de fora não há diferença nenhuma — uma porta ocupada é
uma porta ocupada, e a cortesia de não atropelar transforma-se em bloqueio.
**A diferença só aparece se alguém for perguntar de quem é o PID**, e isso custa
um segundo.

E é a irmã de um erro meu de hoje: eu procurei a causa das escritas perdidas
numa colisão entre dois agentes e a causa era o meu próprio `grep` a ler a
mensagem do commit. **Duas vezes hoje, a explicação foi «outro agente» e a
resposta era «tu».** É uma hipótese cara: manda esperar, e esperar não produz
evidência nenhuma que a desminta.

**Nota de máquina, e esta não é doutrina:** 318 MB livres, swap a 1,4 GB, cinco
agentes — exactamente o orçamento seguro. O bug de kernel na pilha de rede deste
Mac já o derrubou quatro vezes sob carga de agentes. Avisei-o para não subir
nada em paralelo enquanto a suite corre.

---

## Uma decisão que eu tomei e não passei custou-lhe uma pergunta e ia custar horas — 07/09

O JR parou e perguntou: *«a `validar-provas-frescas.sh` está vermelha — 39 dos 65
artefactos são anteriores ao produto. Recapturá-los precisa do seed e da porta.
Diga-me se abro isso ou se fica para quem já lá está.»*

**A pergunta é boa e a resposta já existia — escrita por mim, há duas horas, e
nunca lhe chegou.** Eu tinha decidido e documentado que **verde-repositório não é
o alvo**: o corpo de prova envelhece sempre que o produto muda, e uma guarda
permanentemente vermelha é uma guarda ignorada. O alvo é **o momento em que a
prova é mostrada a alguém**, e só para os artefactos dessa entrega.

**Se eu não lhe passo isso, ele recaptura 39 artefactos** — horas de trabalho,
com o `seed` e a porta ocupados, **para não mudar uma única conclusão**. Todos
pertencem a achados fechados.

**A forma, e é de coordenação e não de medição: uma decisão registada no meu
documento e não no canal dele não está tomada — está guardada.** Eu escrevi-a
para o meu raciocínio futuro e esqueci-me de que ele também precisa dela para
não trabalhar em vão. **A escrita serviu-me a mim e não a ele**, e a diferença só
apareceu quando ele parou para perguntar.

**E é a segunda vez na mesma hora que ele fica parado por causa da mesma coisa** —
a primeira foi a porta 3010, que era dele; esta é uma decisão minha por
transmitir. **Nos dois casos ele fez o correcto** (não atropelar, não decidir
sozinho o que não é dele) **e nos dois casos o custo foi meu**: um por não
verificar de quem era o processo, outro por não lhe dizer o que já tinha
decidido.

---

## Um achado que só existe numa mensagem não existe — 07/09

O JR percorreu o caminho da demonstração, não corrigiu nada — como eu tinha
pedido — e escreveu: *«devolvi-lhe os achados»*. **Eu não os tenho.**

Procurei-os em três sítios: no texto que o `maestri check` me devolve, no
ficheiro de saída da tarefa, e no `HANDOFF.md`. **Não estão em lado nenhum.**
Foram para uma resposta de terminal, e o que eu leio dele vem **truncado** —
por isso a única coisa que me chegou foi o *voto* dele sobre qual atacar
primeiro, e não a lista sobre a qual votou.

**A forma é de protocolo e não de medição, mas custa o mesmo:** um achado que
vive numa mensagem **desaparece com o contexto de quem o escreveu**. E nós os
dois ficámos sem contexto hoje — ele compactou a conversa há trinta minutos.

**A regra que fica: o que muda uma decisão vai para ficheiro, e a mensagem serve
para dizer que o ficheiro existe.** É a mesma razão pela qual este vault tem
BRAIN-INBOX e pela qual eu escrevo as réguas antes das entregas: **o canal é
volátil, o repositório não.**

**E aceitei a prioridade dele porque veio justificada, não porque foi dele.**
Ele votou na reposição dos campos com o critério certo — *«é o único dos três
que faz alguém perder um pedido já escrito»*. Perder trabalho de outra pessoa é
pior do que incomodá-la, e essa é uma razão que eu podia ter dado e não dei.

---

## A tua correcção é a cura, ou viajou ao lado dela? — 07/09

O JR corrigiu o A1 e a causa **não era a que ele próprio tinha corrigido**. Ele
tinha descodificado o cookie antes do `JSON.parse` — arranjo correcto e
justificado. A cura verdadeira era outra: **o `303` era absoluto**
(`new URL(pedido.url)`), mudava de anfitrião, e **o cookie ficava para trás**.

**E o que interessa é como ele soube.** Depois de ficar verde, correu um terceiro
A/B: **desligou a própria descodificação** — e continuou verde. Então tirou-a.

> *«Foi assim que soube que a minha correcção não era a cura, e revi-a em vez de
> a deixar a somar ruído.»*

**A forma, e é nova: uma correcção que viaja ao lado da cura verdadeira parece
ter funcionado.** O verde chega, o commit fecha, e ninguém volta lá. Ela não é
inofensiva: fica no código como se sustentasse alguma coisa, e **a próxima pessoa
que a encontrar vai tratá-la como carga** — não a toca, ou pior, constrói por
cima dela.

**O teste é barato e quase nunca se faz: desligar a própria correcção e ver se o
verde sobrevive.** Se sobreviver, ela não era a cura. Tem o mesmo desenho do
plante — só que o alvo é o que **eu** acabei de escrever, em vez do produto.

**E o `decodeURIComponent` está a zero no ficheiro.** Ele não a deixou lá «por
segurança», que é a saída fácil e a que produz o entulho.

**Eu quase somei ao mesmo monte neste tick:** tinha um candidato para o cookie
vazio — renderização estática, como aconteceu hoje com os `searchParams` — e fui
verificar antes de lho mandar. A página tem `force-dynamic`. **Uma pista errada a
quem está a caçar custa mais do que o silêncio**, e uma correcção a mais custa
mais do que uma correcção a menos.

---

## Três vezes parado à espera de licença, e a culpa é da forma como eu dou ordens — 07/09

O JR ficou parado pela **terceira vez** hoje à espera de autorização para
continuar. Eu já tinha escrito a regra — *«uma ordem de trabalho numerada carrega
a própria licença para continuar»* — e mesmo assim aconteceu outra vez.

**A regra estava certa e o sítio estava errado.** Escrevi-a no meu documento e
disse-lha uma vez, no meio de uma mensagem sobre outra coisa. **Uma regra dita
uma vez num parágrafo sobre outro assunto não é uma regra: é uma frase que
passou.** Voltei a dizê-la, agora sozinha e explícita, e assumi o que é meu —
**não é ele a ser tímido, sou eu a não fixar a licença onde ela se lê.**

É a irmã da decisão sobre os 39 artefactos, que eu tinha tomado, documentado, e
nunca lhe passado. **Duas coordenações falhadas na mesma tarde, ambas por eu
escrever para mim e presumir que ele leu.**

## E uma discrepância que mandei reconciliar antes de corrigir

Ele contou **14** botões escritos à mão no caminho comercial; eu conto **10** —
`getting-started` 4, `plans` 2, `product` 2, `faq` 1, `demo` 1, `trust` 0,
landing 0.

**Não presumi que ele estivesse errado.** Contei em seis ficheiros de rota; ele
pode ter contado noutros, ou com um padrão mais largo. **Mandei reconciliar antes
de mexer**, e a razão é a que já nos apanhou hoje: **uma correcção que fecha dez
de catorze deixa quatro vivos e ninguém dá por eles**. Foi assim que apareceu o
resumo do portão a dar 338 de 396 — a soma tem de fechar antes de alguém começar
a riscar itens.

---

## A catraca, e a prova que eu mostrei sem a ter guardado — 07/09

**A catraca do cabeçalho é a peça certa para este momento.** Congela a dívida em
**267** — «267 escrevem o bloco, 267 no inventário, 0 convertidos» — e **não
obriga ninguém a converter**, porque converter é propagação e vive depois do
portão de aprovação. *«Esta guarda só impede o 268.º.»*

**Verifiquei o controlo eu:** plantei um 268.º ecrã com o bloco à mão e ela ficou
**vermelha, exit 1, e nomeou-o**. Removido, árvore limpa.

E declara o que não apanha — um cabeçalho copiado com classes **novas** — e o que
não conta como duplicação: os 6 ficheiros que usam só a sobrancelha noutra
composição. **Definiu o contentor antes de contar**, que é a diferença entre uma
catraca e uma contagem.

## E depois encontrei nove ficheiros meus por commitar

Sete capturas do M05 e do M06, o `mestres.json`, e o `next-env.d.ts` do build.
**Eram da minha recaptura das 16h28** — a mesma com que gerei e publiquei a
página ao Matheus.

**Publiquei prova que não existia em commit nenhum.** Quem clonasse o
repositório não obtinha o que ele está a ver, e a frescura que eu **declarei
dentro da própria página** — «25 de 25 posteriores ao produto» — era verificável
**só na minha árvore de trabalho**.

**É o mesmo defeito que ando a apanhar o dia todo, virado para mim.** Escrevi
esta manhã que uma decisão registada no meu documento e não no canal dele «não
está tomada, está guardada». Isto é a versão com artefactos: **uma prova mostrada
a alguém tem de estar onde outra pessoa a possa ir buscar.** Até ao commit, é uma
afirmação minha sobre ficheiros que só eu tenho.

---

## Explicar um requisito não é dizer quem está bloqueado — 07/09

O Matheus pediu pela **segunda vez**: *«quando tiver coisas pra eu testar no
domínio me fala»*. E havia, desde as 15h05.

**Estávamos os dois à espera um do outro.** Ele à espera que eu lhe dissesse que
estava pronto; eu à espera de uma frase dele. E eu tinha-lhe explicado o
requisito **duas vezes** — que o guião mete as palavras dele no registo do
servidor, e que um `sim` meu não é rasto de nada.

**Explicar o requisito não é a mesma coisa que dizer quem está bloqueado.** As
duas vezes que falei disso, falei do *mecanismo*; nunca escrevi a frase simples
que resolvia: **«está pronto, e o que falta é teu»**. Quem lê uma explicação de
processo assume que o processo ainda está a decorrer.

**E fui procurar o que o podia estar a travar em silêncio, em vez de repetir o
pedido.** Encontrei um: ele pode estar a supor que publicar exige enviar os 402
commits para o GitHub. **Não exige** — o guião empacota a partir do commit local.
**Um bloqueio que a outra pessoa não nomeia não se desfaz repetindo o pedido; só
se desfaz adivinhando o que ela pode estar a supor** e desmentindo-o antes de ela
perguntar.

Pacote reverificado agora: **2154 ficheiros, nenhum segredo, portões abertos**,
do commit `701af29`. Pára na autorização, como deve.

---

## Medi a imagem errada porque uma configuração alheia tinha um valor por omissão — 07/09

Disse ao Matheus, com confiança, que **o guião da demonstração não ia na imagem
de produção**. Era falso, e a forma como falhei é a mais fina do dia.

Corri a verificação com o mesmo mecanismo do guião de publicação:

```
docker compose ... run --rm --entrypoint sh bossaos-web -c 'ls packages/db/prisma/*.ts'
```

O serviço está declarado como `image: bossaos-web:${VERSAO:-latest}`. **Eu não
defini `VERSAO`**, portanto o `docker compose` resolveu para **`latest`** — uma
imagem antiga — enquanto a que está a servir foi construída e etiquetada com a
versão do commit. **Medi uma imagem que não é a que está no ar.**

E a resposta que ela me deu era **coerente**: quatro ficheiros, nomes
plausíveis, ordem alfabética certa. **Nada na saída sugeria que o sujeito fosse
outro.** O que me salvou foi o Dockerfile não bater com a conclusão — `COPY . .`,
sem `.dockerignore`, sem poda entre fases. **Uma explicação que contradiz o
mecanismo tem de ser duvidada antes do mecanismo.**

Fui então ao contentor **a correr** (`docker exec bossaos_web`) e lá estão os
**seis** ficheiros.

**A forma, e é nova: um valor por omissão numa configuração que eu não escrevi
trocou-me o sujeito em silêncio.** Não foi um erro meu de digitação nem uma
suposição minha — foi `:-latest` a preencher um espaço que eu nem sabia que
estava vazio. **Quando um comando aceita uma variável, medir sem a definir não é
medir com o valor certo: é medir com o de outra pessoa.**

**E o custo real foi eu ter dito a alguém uma coisa falsa com confiança.** Não
foi um número errado num documento — foi uma frase ao dono do produto sobre o
que a instalação dele leva. Corrigi-a no minuto seguinte, mas a lição é anterior:
**a confiança com que eu disse aquilo não vinha da medição, vinha de ela ser
coerente.**

---

## Não eram seis defeitos: era um gerador — 07/09, 18h00

Medi ao vivo, contra a instalação publicada, os dois CTA do herói da landing:

| CTA | fundo | texto | anel de foco |
| --- | --- | ---: | ---: |
| «Pedir una demo» (primário) | `#102E35` | 14,34:1 | **1,00:1** |
| «Ver el producto» | `#E9EFEC` | 12,31:1 | 12,31:1 |

**Um utilizador de teclado que chegue ao botão principal da landing não vê
nada.** E foi encontrado por acidente: o JR corrigiu o anel nas superfícies
escuras e a correcção **destapou** este.

**Depois parei de contar instâncias e fui contar a causa.** O `#102E35` é
declarado **quatro vezes**, com quatro nomes:

| token | papel | consumos |
| --- | --- | ---: |
| `--bo-primaria` | preenchimento da acção primária | 13 |
| `--bo-superficie-inversa` | a superfície escura | 7 |
| `--bo-texto-primario` | a cor do texto | 31 |
| `--bo-foco-cor` | o anel de foco | 1 |

**Qualquer par destes quatro é 1,00:1 por construção.** Isto não é uma lista de
defeitos — **é o gerador deles**. E dos seis pares possíveis, **quatro já
dispararam esta noite**:

- `primária` × `superfície-inversa` → o botão invisível do KDS
- `foco` × `superfície-inversa` → o anel invisível nas telas escuras
- `foco` × `primária` → **este**, o CTA da landing, ao vivo
- `texto-primário` × `superfície-inversa` → as duas 1,00:1 que estavam
  documentadas nas 39 linhas de CSS defensivo, escritas meses antes por alguém
  que as apanhou uma a uma

**Passei o dia a apanhar isto instância a instância, e cada uma parecia um caso
novo.** A quarta é que mostrou o que era: quando o mesmo valor tem quatro nomes,
**os nomes deixam de proteger** — dois deles encontram-se num ecrã e o resultado
é uma coisa a desaparecer dentro de outra.

**E explica porque é que o contrato de superfície foi a cura certa.** Ele não
corrige um par: **quebra a coincidência**, porque a superfície passa a declarar
o que promete em vez de toda a gente ir buscar a mesma constante. **A cura de um
gerador é tirar-lhe a matéria-prima, não apagar o que ele já produziu.**

**O que isto me dá que a caça não dava: previsão.** Qualquer sítio novo onde dois
destes quatro se encontrem vai ser invisível, e isso é enumerável antes de
alguém dar por ela.

### Correcção ao que escrevi há uma hora: não é enumerável — 18h10

Escrevi que o gerador dava **previsão**, e que os sítios onde dois dos quatro
tokens se encontram eram «enumeráveis antes de alguém dar por eles». **Fui
enumerá-los e a medição desmente-me.**

Varri as regras do `estilos.css` à procura de pares dos quatro na mesma regra:
**encontrei um**, e é a própria regra do foco, que define `outline` e por isso
conta duas vezes. **Os pares não se encontram numa regra — encontram-se na
CASCATA:** o anel é posto no elemento, o fundo vem de um antepassado, e nenhuma
das duas linhas sabe da outra.

**Por isso não são enumeráveis a partir da folha de estilos.** Só uma medição
**renderizada** os vê — que é, aliás, o que aconteceu a cada uma das quatro
instâncias de hoje.

**E enumerando o que É enumerável, encontrei o buraco a sério.** A guarda que
existe para isto — `validar-superficies.sh` — **media, às 18h10, quatro superfícies**, e o
próprio âmbito dela lista quais: *«duas escuras do KDS, o login (a única
`.bo-inverso` do produto) e uma do painel claro»*.

**A landing não é nenhuma delas.** E é exactamente onde o defeito está no ar.

**A forma, e já é a enésima vez hoje: o detector não falhou — a população dele
não incluía o sítio onde o defeito vivia.** O que não é enumerável são os pares;
o que É enumerável, e ninguém enumerou, são **as superfícies**. Elas são poucas e
fechadas, e a guarda cobre quatro de um conjunto maior.

---

## Um tecto por superfície, e não um total — 07/09, 18h25

Mandei alargar a guarda das superfícies e avisei: *«vai ficar vermelha na landing
pelo CTA primário — não a mascares.»* **Ele fez melhor do que as duas saídas que
eu tinha imaginado.**

A guarda passou de **4 para 11 superfícies**, todas nomeadas: `KDS-estacao`,
`KDS-unidade`, `AUTH-login`, `PAINEL-catalogo`, `MKT-landing`, `MKT-demo`,
`MKT-faq`, `MKT-plans`, `MKT-product`, `MKT-trust`, `CARTA-publica`. E o
alargamento **encontrou uma classe nova** — contornos fracos, o RV100-025.

**E aqui está a decisão que interessa.** Havia 17 ocorrências. Um tecto **global**
dava duas saídas, ambas más, e ele escreveu-as:

> *«Vermelho para sempre, ou levantado para 17 e a tolerar oito novos em qualquer
> sítio — incluindo uma regressão no login que ninguém veria.»*

**Pôs o tecto por superfície:** `AUTH-login 4/4`, `CARTA-publica 2/2`,
`MKT-demo 5/5`, `MKT-landing 1/1`, `PAINEL-catalogo 5/5`.

**É a lição do piso contra a completude, aplicada a um orçamento.** Um total é um
piso: acomoda qualquer distribuição, e um defeito novo no login esconde-se atrás
de um defeito resolvido na carta. **Por superfície é uma partição** — a dívida
fica congelada *onde está*, e mexer-se num sítio acende, mesmo que a soma não
mude.

**E o controlo dele prova exactamente isso**, que é o que o torna bom: baixou o
tecto do `MKT-demo` de 5 para 4 e a guarda ficou vermelha a dizer **`MKT-demo
5/4` com o total inalterado**. **Um controlo que só mexesse no total não teria
distinguido as duas formas de contar.**

**O que fica por fazer, e não é meu:** o pacote está preparado e parado —
`7b94eff`, 2155 ficheiros, nenhum segredo, portões abertos. **A landing continua
no ar com o anel a 1,00:1**, e assim fica até o Matheus autorizar de novo. A
autorização das 17h09 foi para aquele momento e aquele commit; **não a estico
para um segundo disparo só porque seria conveniente.**

---

## Treze decisões escaladas uma a uma não são uma lista — 07/09, 18h40

Fiz o balanço do que resta e quase tudo está com o Matheus. Depois contei: **126
commits hoje, e treze decisões escaladas** — cada uma num aviso de duas linhas,
no momento em que apareceu.

**Nenhuma delas estava errada. O conjunto é que não existia.** Ele ficou com
treze perguntas espalhadas por nove horas de mensagens, sem sítio nenhum onde as
visse juntas — e sem forma de saber que eram treze.

**É a minha própria lição de hoje virada contra mim.** Escrevi de manhã, quando o
JR ia recapturar 39 artefactos por eu não lhe ter passado uma decisão: *«uma
decisão registada no meu documento e não no canal dele não está tomada, está
guardada»*. **Escalar no momento certo e nunca consolidar tem o mesmo efeito:
cada peça chegou, e o todo não.**

Fiz-lhe a lista única, agrupada pelo que a decisão destrava — trabalho parado,
negócio, desenho, e o que só ele pode julgar. **Com recomendação onde tenho uma**,
porque treze perguntas sem resposta sugerida é um fardo e não ajuda; e sem
nenhuma onde o juízo é dele, porque inventar uma opinião sobre o que se reconhece
como identidade seria fingir que medi o que não medi.

**E o número que fecha a página é o que interessa:** 19 de 26 critérios
conformes, e **dos sete que faltam, quatro estão naquela lista à espera dele.**
Nenhum deles é trabalho por fazer. É a diferença entre «falta-nos 27%» e
«falta-te decidir quatro coisas» — e a segunda é accionável.

### O número do achado apodreceu enquanto a guarda crescia — 18h50

O `RV100-025` estava bem registado — e dizia **«nove controlos em duas
superfícies»**. A guarda, entretanto alargada a onze, mede **17 em cinco**.

**Ninguém errou.** O nove era verdade quando a guarda media duas superfícies. **O
alargamento encontrou mais oito, e o número do achado não acompanhou** — porque
quem alarga uma guarda está a olhar para a guarda, não para o registo que a
citava.

**É a terceira vez hoje que apanho a mesma coisa**, e as três em sítios
diferentes: o portão que dizia 65 testes quando eram 68; o cabeçalho da guarda
das línguas que dizia 2343 chaves quando ela própria media 2595; e agora um
achado que conta uma população que cresceu debaixo dele.

**Reescrevi-o com a forma que já sei ser a certa: invariante primeiro, retrato
datado depois.** O invariante — *«nenhum controlo novo abaixo de 3:1 em
superfície nenhuma»* — não apodrece. O 17 leva a hora e a população ao lado, para
quem o ler saber contra o que foi contado.

**E há uma assimetria aqui que vale a pena notar: alargar uma medição envelhece
tudo o que a citava.** Quando a guarda passou de 4 para 11 superfícies, ela
melhorou — e ao melhorar, tornou falso um número que estava certo. **Um
instrumento que fica melhor deixa registos velhos atrás de si**, e ninguém pensa
nisso no momento em que está a melhorá-lo.

### Varri a assimetria e a única coisa podre era minha, escrita há 40 minutos

Depois de perceber que **alargar uma medição envelhece tudo o que a citava**, fui
procurar quem citava o número velho. A guarda passou hoje de 4 para 11
superfícies; **quatro sítios dizem «quatro superfícies»**.

Julguei-os pela regra que eu próprio escrevi de manhã — um número apodrece quando
descreve **o estado do mundo**, não quando descreve **o que aconteceu**:

| onde | forma | veredicto |
| --- | --- | --- |
| changelog:682 | «o §6.4 nomeia quatro superfícies» | **outra coisa** — falso positivo do meu `grep` |
| `superficies.spec.ts:134` | «esta lista **tinha** quatro» | passado: **registo** |
| `superficies.spec.ts:293` | «dizer quatro, que deixou a landing de fora» | **registo do incidente** |
| `COMO-REVISO.md` | «**mede** quatro superfícies» | **presente: apodreceu** |

**A única podre era minha, e escrevi-a há quarenta minutos** — neste mesmo
ficheiro, três secções depois de eu ter escrito a regra que a condena.

**E a cura não foi actualizar o número: foi mudar o tempo do verbo.** «Mede
quatro» passou a «**media, às 18h10, quatro**». O parágrafo continua a descrever
o que quis descrever — o buraco que existia nesse momento — **e deixa de afirmar
uma coisa sobre agora.** Um registo não precisa de ser mantido; uma afirmação
precisa.

**É a defesa mais barata que encontrei o dia todo:** entre um número que exige
manutenção e um que não a exige, muitas vezes só está um verbo.

---

## Verifiquei as duas páginas que lhe mandei, e digo onde o motor está — 19h00

Mandei ao Matheus dois links hoje — o percurso de teste e a lista de decisões — e
**não tinha aberto nenhum**. É a minha própria regra, e já me mordeu duas vezes
neste dia. Abri: as duas renderizam, no tema dele, com os endereços tocáveis, o
bloco de acesso legível e as recomendações separadas do que é juízo dele.

**E digo o estado do motor sem o maquilhar.** Os últimos ticks tiveram rendimento
a cair: acabei a corrigir um tempo verbal num documento que só eu leio. Não foi
trabalho inútil — a regra que saiu dali é boa — mas **não é onde o projecto
precisa de mim.**

A razão é simples e não é um problema: **quase tudo o que resta está com ele.**

- **Bloqueado na palavra dele:** publicar o pacote que corrige o anel invisível.
- **Bloqueado no portão dele:** a propagação às 396 telas e as 792 composições.
- **Decisões dele:** as treze da lista, das quais quatro são critérios de portão.
- **Não medível por mim:** o KDS lido a metros.

**Fica dito, e é o oposto de uma queixa:** o motor não está parado por falta de
trabalho — está parado no sítio certo, que é à porta de quem decide. Enquanto
espero, o que me cabe é não inventar trabalho para parecer ocupado, e **manter o
que já está medido a não apodrecer** — que foi, aliás, metade do que fiz nas
últimas horas e o que mais defeitos deu.

### Avisar antes de duplicar, e o que ele já tinha percebido sozinho — 19h45

Tinha ficado no terminal do JR um pedido por enviar — *«escreve a régua da
distância e mede o KDS»* — e eu tinha acabado de a escrever e de a medir. **Se
aquele texto lhe chegasse, ele repetia vinte minutos de trabalho.** Avisei-o, com
os números, para a guarda que ele vai escrever depois.

**E ele já tinha percebido a parte difícil sem que ninguém lha dissesse:** que a
guarda **não se pode escrever antes de o Matheus decidir**, porque o mínimo
depende da saída — *«se o texto crescer, o mínimo passa a ser o que a geometria
pedir; se o produto passar a declarar que ecrã precisa, o mínimo fica onde está e
o que muda é a documentação»*.

**Isso é a coisa certa a fazer com uma medição que aponta para uma escolha:
parar.** Uma guarda escrita antes da decisão fixaria um dos dois futuros por
omissão — e ninguém veria que a escolha tinha sido feita por um guião em vez de
por uma pessoa.

**Passei-lhe também as duas lições que me custaram a tarde**, para não lhe
custarem a ele: que o critério eu tinha declarado imedível «por natureza» e era
só inconveniente de medir; e que o mesmo instrumento **não** explica o piso de
14 px do manual — a essa distância até 12 px tem folga tripla. **Um instrumento
que resolve um caso quer resolver os outros, e é aí que ele começa a mentir.**

### Fui arranjar o `next-env.d.ts` e não havia nada para arranjar — 20h00

Ficara na fila do JR uma tarefa: pôr o `next-env.d.ts` no `.gitignore`. A razão
parecia boa — foi esse ficheiro que hoje de manhã fez a minha guarda da frescura
declarar **as 25 capturas velhas**, porque o build o tocava e ele passava a ser
«a fonte mais recente do produto».

**Fui verificar antes de mexer, e o ficheiro está idêntico ao committado.** A
árvore está limpa. Não há deriva nenhuma.

**A sujidade era minha.** O ficheiro contém `import "./.next/types/routes.d.ts"`
— um caminho que **segue o directório de build**. Os meus builds isolados
(`NEXT_DIST_DIR=.next-revisao`, `.next-mao`, `.next-acess`), que adoptei
precisamente para não colidir com o JR, **reescrevem-lhe esses imports**; o build
normal seguinte repõe-nos.

**E isso é uma coisa que vale a pena guardar: a cura de uma colisão criou
outra.** Isolar o directório de build resolveu duas construções a escreverem o
mesmo `.next` — e passou a mexer num ficheiro versionado que aponta para ele.
Menor, e reversível sozinha, mas real.

**A recomendação é não fazer nada:** o Next diz para o commitar, ele não está a
derivar, e ignorá-lo esconderia uma deriva verdadeira se algum dia houver uma.
**Fui à procura de um defeito e o que encontrei foi o meu próprio rasto** — que é
melhor resultado do que a alteração que eu ia mandar fazer.

*(A explicação do `NEXT_DIST_DIR` é a que encaixa em tudo o que observei — o
ficheiro sujo logo a seguir aos meus builds isolados, limpo depois de um normal.
**Não a provei correndo o experimento**, e digo-o em vez de a dar por assente.)*

### Provei a hipótese que tinha deixado por provar, e ela trouxe um defeito latente — 20h15

Ontem escrevi que a explicação do `NEXT_DIST_DIR` «encaixa em tudo o que observei
mas **não a provei**». Provei-a agora, e é barata: arranquei um build com
`NEXT_DIST_DIR=.next-prova` e ao fim de **nove segundos** o ficheiro versionado
mudou —

```
-import "./.next/types/routes.d.ts";
+import "./.next-prova/types/routes.d.ts";
```

**E a prova trouxe consigo um defeito que eu não procurava.** Seis guiões da casa
usam `NEXT_DIST_DIR` — `provar-mestres`, e os cinco `provar-*-mkt` — e **nenhum
repõe o ficheiro**. Quem correr um deles e commitar a seguir leva para o
repositório um `next-env.d.ts` a apontar para um directório que **não existe em
mais lado nenhum**, e parte a verificação de tipos de quem clonar.

**O sintoma já estava escrito, e ninguém o tinha ligado à causa.** O
`provar-mestres.sh:19` diz, à letra: *«um `next-env.d.ts` a oscilar»* — anotado
como sinal do `.next` partilhado. **Era sinal disto.**

**Fui ver se já tinha acontecido: não.** O ficheiro mudou **uma vez** em toda a
história, quando nasceu, e nenhum commit levou um caminho isolado. **O defeito é
real, está provado, e nunca disparou** — e a razão de não ter disparado é
vigilância, não mecanismo: eu próprio o apanhei hoje ao ver a árvore suja antes
de commitar.

**A cura é curta e a casa já a tem noutro sítio:** os seis guiões repõem o
ficheiro no fim, com o mesmo `trap` que o JR usou hoje para repor plantes. **Um
defeito latente com cura de três linhas não se deixa à espera de disparar** — e o
único aviso que teríamos era o próximo a clonar o repositório.

### Um comentário que aponta para a causa errada é pior do que nenhum — 20h30

Ao passar a cura do `next-env.d.ts` ao JR, pedi-lhe **duas** coisas, e a segunda
é a que me interessa mais.

A primeira é a de sempre: **não basta o `trap` existir.** Correr o guião e ver o
ficheiro limpo no fim não prova que o `trap` repõe — prova que nada o sujou, ou
que repôs. **Só desligando o `trap` de propósito e vendo a árvore ficar suja é
que ele fica provado.** Um `trap` que nunca falhou não demonstrou nada.

A segunda: **actualizar o comentário da linha 19 do `provar-mestres.sh`.** Ele
diz *«um `next-env.d.ts` a oscilar»* e atribui a oscilação ao `.next`
partilhado — que era a melhor explicação disponível quando foi escrito, e é
errada.

**Um comentário que aponta para a causa errada é pior do que nenhum.** Um
ficheiro sem explicação manda a próxima pessoa investigar; um com a explicação
errada manda-a investigar **no sítio errado**, e com a confiança de quem já leu
a resposta. **A prosa que ajuda e a prosa que atrasa têm exactamente o mesmo
aspecto** — e a diferença entre as duas só aparece quando alguém vai lá com um
problema a sério.

**É a última forma do dia, e rima com a primeira.** De manhã descobri um `catch`
largo escrito de propósito, com a razão ao lado, que engolia o defeito que a
funcionalidade tinha desde que nascera. **As duas são defesas bem-intencionadas
que passaram a esconder aquilo de que protegiam.**

---

## O fecho, e a frase é dele — 07/09, 20h30

O defeito latente está curado e verifiquei-o: os seis guiões repõem o
`next-env.d.ts`, o `trap` dispara em `EXIT INT TERM` — **qualquer saída, não só a
boa** —, a implementação é **uma** (`next-env-intacto.sh`) e não seis cópias, e o
comentário errado foi corrigido **sem apagar o velho**: ficou a separação datada
dos dois sintomas.

**E ele defendeu-se de uma coisa que eu não lhe tinha dito:** que um segundo
`trap … EXIT` **substitui o primeiro em silêncio**. Pôs as duas tarefas no mesmo
`trap` e escreveu porquê. **É a doença do dia inteiro — um mecanismo a apagar
outro sem se anunciar — encontrada na semântica do próprio `bash`.**

## A síntese do dia é dele e fica com o nome dele

> *«Quase todos os defeitos que apanhámos tinham a mesma forma: um instrumento a
> devolver um número plausível sobre o sujeito errado. O que os destapou nunca
> foi olhar com mais atenção — foi mudar o SUJEITO da medição: a captura em vez
> do código, o pai em vez do elemento, o `lsof` em vez da suposição.»*

**É melhor do que tudo o que eu escrevi hoje, e explica o dia inteiro por trás.**
O botão invisível, o anel a 1,00:1, os brancos das capturas, a porta 3010 que era
dele, a imagem velha do `docker compose`, o `grep` que casou com um comentário, a
sonda que bateu no ecrã de não-encontrado — **em nenhum deles o instrumento
estava avariado.** Todos devolveram um número correcto **sobre outra coisa**.

E a consequência prática é a que eu não teria formulado assim: **«olhar melhor»
não é um método.** Olhar melhor para o sujeito errado dá o mesmo resultado, com
mais confiança. O que funciona é **trocar o sujeito** — e isso é uma acção, não
uma virtude.

---

## A protecção armada a não fazer nada — 07/09, 20h50

Corri eu o controlo que a mensagem do JR dava por feito, porque **a palavra dele
não é prova**. E fiz a versão que uma corrida bem-sucedida nunca exercita:
interromper o build a meio com `TERM`.

| | trap | sinal | ficheiro no fim |
|---|---|---|---|
| positivo | ligado | TERM a meio | **`.next`** — limpo |
| negativo | **desligado** | TERM a meio | `.next-controlo` — sujo |

**O trap passa.** Mas o caminho até lá deu três lições, e nenhuma era sobre o trap.

**Primeira: o meu arnês não era o sujeito.** Ele fazia `cd apps/web` antes do
build; o ajudante usava um caminho relativo; o `cp` do trap morreu com «No such
file or directory» e o ficheiro ficou sujo. Ia a caminho de reportar que a cura
dele estava partida. **Verifiquei os seis guiões: nenhum muda de directório
depois de armar.** Não era defeito vivo — era uma condição a viver na cabeça de
quem escrevesse o sétimo. Passei o caminho a absoluto e provei a cura **com o
mesmo arnês que a partiu**, que é o único "antes" que vale.

**Segunda: caí na doença do dia uma hora depois de a escrever.** Testei o caminho
no `zsh` da ferramenta em vez do `bash` dos guiões. `BASH_SOURCE` vinha vazio, o
resultado era plausível, e dizia-me que a minha própria cura estava partida.
**Instrumento certo, sujeito errado — outra vez.** Ficou daí uma guarda: lido por
um shell sem `BASH_SOURCE`, o ajudante recusa-se a arrancar em vez de devolver um
caminho errado e calado.

**Terceira, e é dele.** Revi o meu código com o JR porque **não assino o meu**, e
ele encontrou o que eu não vira: eu fechei a porta do caminho errado calado e
**deixei a outra aberta ao lado**. O `guardar_next_env` fazia `[ -f … ] || return
0` — com o ficheiro ausente a cópia ficava vazia, o `repor` desistia também, e a
protecção ficava **armada a não fazer nada, sem uma palavra**. Exactamente a
forma que a guarda existia para impedir.

E ao aplicar a emenda dela saiu uma correcção à emenda: os seis correm com
`set -uo pipefail` e **sem `-e`**, portanto um `return 1` seria ruidoso e deixava
a protecção desligada à mesma. **Um defeito calado trocado por um defeito com
legenda não é uma cura.** Tem de ser `exit`.

### O que fica

**Uma protecção pode falhar de duas maneiras: não existir, ou existir e não estar
apontada a nada.** A segunda é pior, porque quem a lê conta com ela. E note-se
por onde as três apareceram: **nenhuma foi encontrada a olhar para o código.**
Apareceram quando o arnês falhou, quando o interpretador mudou, e quando outra
pessoa leu. Ler com mais atenção teria devolvido as três como correctas.

---

## Varri o repositório à procura de guardas cegas e a cega era a varredura — 07/09, 21h10

Hoje encontrei **duas vezes, no mesmo ficheiro**, uma protecção armada a apontar
para nada. Duas vezes no mesmo sítio é um gerador, não um acidente, por isso fui
procurar os irmãos. A pergunta: **algum dos 129 instrumentos do repositório
consegue dizer OK enquanto mede zero coisas?**

A resposta é **nenhum**. O que interessa é como cheguei lá.

| tentativa | o que o detector procurava | «sem defesa» |
|---|---|---|
| 1.ª | a palavra `naomedi` | **76** |
| 2.ª | + plante, âmbito, população | **7** |
| 3.ª | + `NAO MEDI` **sem til** | **1** |
| 4.ª | li o que sobrou | **0** |

**Nenhum desses números era uma medição do repositório. Eram medições do meu
vocabulário.** O `validar-tres-linguas.sh` escreve `NAO MEDI` sem til e eu
procurava com til. O `provar-prontidao.sh` — que sobreviveu até ao fim da lista —
é o **melhor guarda da casa**: conta as verificações que correram, tem um mínimo,
e emite uma falha chamada literalmente `VERDE COM ZERO MEDIDO`. Estava na minha
lista de suspeitos por não usar nenhuma das minhas palavras.

### O que o repositório já fazia e a minha varredura não

O `validar-concorrencia.sh` aponta o seu detector a **dois alvos conhecidos**
antes de o usar — um que tem de casar, outro que não pode casar — e recusa-se a
concluir se falhar qualquer um:

    "o proprio detector esta cego: nao ve 'CONCORRENTES' ou acusa quem passa ao lado"

Eu construí um detector e apontei-o directamente ao problema. **Só na terceira
tentativa fiz o que aquele guião faz sempre.** Quando finalmente o auto-testei
contra um alvo que eu sabia ter a defesa, o número caiu de 7 para 1 na mesma
corrida — sem eu ter olhado para um único guião.

### O que fica

**Uma varredura é um instrumento, e um instrumento nunca é testemunha de si
próprio.** Se eu tivesse parado na primeira, tinha escrito «76 guardas do
repositório podem ficar verdes sobre nada» — um número com quatro vezes o
tamanho da verdade, sobre uma população que não existe, e a acusar os melhores
guiões da casa.

E o teste é barato ao ponto de não haver desculpa: **três linhas**, um alvo que
tem de casar e um que não pode. Custa menos do que ler o primeiro ficheiro da
lista errada.

### E a varredura, ao falhar, deu uma coisa a sério

O único guião que sobreviveu à lista — o melhor de todos — tinha o **piso solto
por uma**. `MINIMO_VERIFICACOES=10`, e uma corrida verde emite **11**: podia
desaparecer uma verificação e ele continuava a dizer «Prontidão provada».

Medi-o ao vivo em vez de o deduzir, porque hoje já tinha errado cinco contagens
estáticas — e a sexta foi essa mesma: o meu `grep` de contagem não casou nada
porque a saída tem códigos de cor e eu esperava `ok` no início da linha. **A
prova tinha passado e o meu contador dizia zero.**

Correr era barato por uma razão que vale a pena reter: **o `vermelho` também
incrementa o contador**, portanto a corrida dava-me o número mesmo que a prova
falhasse. Quando o que se quer medir é *quanto correu* e não *se passou*, uma
corrida vermelha serve tão bem como uma verde.

E o piso fica piso, não igualdade. Com a aplicação em baixo as secções emitem
**menos** verificações; uma igualdade trocaria a mensagem certa — «a aplicação
não arrancou» — pela errada — «a prova não correu inteira». **Um piso perde-se
com o tempo, mas perde-se para o lado seguro.**

---

## A nota menor era a terceira porta — 07/09, 21h15 (o achado é do JR)

Passei-lhe duas notas dele próprio, marcadas por mim como **menores e não
bloqueantes**: o `mktemp` na forma antiga, e uma cópia temporária órfã quando o
ajudante é lido duas vezes. A primeira era mesmo menor. **A segunda não era uma
nota de arrumação — era a terceira porta para a doença deste ficheiro.**

O ajudante fazia `NEXT_ENV_COPIA=""` no topo. Uma segunda leitura na mesma
corrida apagava o que a primeira tinha guardado. O ficheiro órfão é o sintoma
visível; o que custa é o outro lado — **`repor` devolve 0 e não repõe nada.**

Verifiquei-o eu, com o «antes» tirado do `git`:

| versão | depois de re-ler | `repor` | temporário |
|---|---|---|---|
| `e173c1b` | `[]` — **desarmada em silêncio** | devolveu **0** | ficou órfão |
| `d365304` | mantém o valor — **armada** | repõe | limpo |

`repor` a devolver **0** é, literalmente, dar-se por cumprido sem ter feito nada.
É a mesma forma das outras duas portas deste ficheiro, e das três foi esta a que
eu classifiquei como arrumação.

### E ao verificá-lo errei o sujeito duas vezes seguidas

Primeiro sourcei a versão antiga a partir de `/tmp`: o `BASH_SOURCE` resolveu
para `//apps/web/…` e o que disparou foi a **guarda do caminho**, não o que eu
queria testar. **Inconclusivo, não confirmado** — e a diferença entre as duas
palavras é a diferença entre rever e assinar por hábito.

Depois tirei o «antes» de `HEAD~2`, que **já era a cura dele**. O controlo veio
verde dos dois lados e não provava nada. Só ao exigir que o «antes» mostrasse a
linha `NEXT_ENV_COPIA=""` é que fiquei com um controlo a sério.

**Um controlo negativo que não falha não é um controlo — é uma segunda corrida
do controlo positivo com outro nome.** E a única defesa é obrigar o «antes» a
provar que é o antes, antes de acreditar no depois.

### O que ele fez e eu não tinha pedido

Disse, sobre o `mktemp` no GNU, que **raciocinou a partir do contrato
documentado e não mediu**, porque não há GNU nesta máquina. Podia ter escrito a
mesma frase sem a ressalva e eu não tinha maneira de saber. **Separar a metade
medida da metade raciocinada, sem ninguém perguntar, é o que faz uma revisão
valer alguma coisa.**
