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
