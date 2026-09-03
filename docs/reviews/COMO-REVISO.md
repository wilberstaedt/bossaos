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
