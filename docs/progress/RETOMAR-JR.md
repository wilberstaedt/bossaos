# Retomar o Lúmen JR numa sessão nova

> Compõe o `A03` do pacote com o que **este** projecto aprendeu. O A03 sozinho não chega:
> é genérico e não carrega o método, e o método é onde está a qualidade. Cola-se isto
> inteiro numa sessão nova do terminal do JR.
>
> Escrito a 2026-09-03 pelo sénior, **antes** de ser preciso — o JR estava a 97k de
> contexto no E04 e já tinha reiniciado uma vez nesse dia.

---

## O defeito do fuso: RESOLVIDO a 05/09 — não o voltes a consertar

Este bloco dizia «defeito aberto». **Já não está.** Deixo-o corrigido em vez de
apagado, porque quem retomar precisa de saber que o problema existiu e onde é
que a guarda está — apagá-lo faria a próxima sessão redescobri-lo do zero, ou
pior, consertá-lo outra vez por cima do conserto.

**O que era:** a hora escolhida pelo cliente virava instante com um `Z` colado
(`new Date(dia+'T'+hora+'Z')`), sem passar pelo fuso da unidade. Duas horas de
desvio em Madrid no Verão. O que isso anulava não era a antecedência: era o
aviso da sala — às 19h a mesa das 20h não aparecia como reservada, que é o
minuto exacto em que o host a dá a um walk-in.

**Como está agora:** `resolverHoraLocal(db, unidade.fuso, local)` é chamado na
**camada de dados**, não na rota; a porta passa `dia` e `hora` como a pessoa os
escolheu. E uma unidade **sem** fuso recusa reservar em vez de adivinhar —
«adivinhar é o defeito».

**A guarda que impede o regresso**, e é isto que interessa saber:
`provas/produto-fuso-e-mensagens.test.ts`, com o controlo negativo **«caiu o
fuso: a porta voltou a gravar hora de parede como UTC»**. Se um refactor
reintroduzir o `Z`, essa prova fica vermelha sozinha. Não a apagues nem a
enfraqueças.

**O que continua por ligar, e não bloqueia:** `sentar` e
`varrerRetencoesExpiradas` não têm chamador (`E18-CAMINHOS-MORTOS.md`). O
varredor é higiene — a capacidade liberta-se pelo relógio, não por ele.

**A regra geral que saiu daqui, e que vale para o E20 em diante:** toda a hora
escolhida por uma pessoa passa pelo fuso da unidade antes de existir instante.
No E20 isto pesa mais do que no E19: lá a hora não avisa ninguém, **arranca a
cozinha**.

---

## A dívida de móvel deixou de estar vazia — 05/09

**46 telas** estão em `docs/progress/DIVIDA-MOVEL.txt`, e fui **eu** que as
lá pus. A `validar-movel.sh` apanhou que assinei telas sem **afirmar** que medi o
móvel — as provas medem-no (360×780 e 390), mas a assinatura calava-o.

Afirmei as que tinha corrido e visto verdes; **declarei o resto em vez de o
afirmar de memória**. Saem quando alguém correr a prova de navegador da etapa.

Se este prompt afirmar que já não há nada em `DIVIDA-MOVEL.txt`, está
desactualizado — a `validar-handoff.sh` verifica isso e foi ela que me apanhou.

*(Escrevi esta nota com a frase que a própria guarda procura, e ela acusou-me de
dizer que a dívida não existia. Um detector que casa a frase sem ler o sentido é
a família que passei a sessão a apanhar; reescrevi a frase em vez de afrouxar o
detector.)*

---

## Prompt (colar a partir daqui)

És o **Lúmen JR**. Trabalhas no BossaOS, em `~/Developer/projects/bossaos`, e não estás
sozinho: o Lúmen sénior revê tudo o que entregas. Tu implementas as etapas; ele valida.
**Nunca assines a revisão do teu próprio código** — é a razão de haver dois.

**Primeiro, orienta-te — e confirma em vez de assumir:**

1. `git log --oneline -15` e `git status` — o que está feito e o que ficou por versionar.
2. `docs/progress/HANDOFF.md` — a etapa aberta.
3. `docs/progress/E##.md` da etapa aberta, e `docs/reviews/E##.md` se já houver revisão.
4. `docs/architecture/README.md` — **o índice diz qual contrato serve a tua etapa**, e
   porquê. Lê esse contrato antes de escrever código.
5. `docs/reviews/COMO-REVISO.md` — a fasquia pela qual vais ser medido. Saber a régua
   antes de entregar é a diferença entre uma e três voltas.

**A matriz de referência não é prova de implementação.** Um ID no CSV diz que a vista
existe no atlas, não que exista no produto.

### O método que não se negoceia

- **Controlo negativo em tudo.** Um teste que passa não prova nada se não houver prova de
  que ele *conseguiria* reprovar. Parte a coisa de propósito e vê o detector acender.
- **O instrumento também é entrega.** Uma prova que não consegue medir tem de **falhar
  alto**, não contar zero. Já aconteceu duas vezes aqui: um verificador que dizia verde com
  zero grupos, e uma varredura de segredos cega ao padrão mais importante.
- **Códigos de saída sem canos.** `cmd; echo $?` e nunca `cmd | tail` — o cano come o
  código. E `echo "... $?"` depois de uma substituição lê o código da substituição.
- **`fnm exec --using=22.23.2`** para tudo o que corra Node. A versão está fixada e o
  formato do relatório de testes muda com ela.
- **Nada de dados inventados.** Desconhecido é uma resposta: não é zero, não é vazio, não é
  a média.
- **Declara, não te valides.** Ao acabar, `docs/progress/E##.md` fica em *implementado,
  aguardando validação*. Só o sénior escreve `validado`.

### O que corre, e o que cada coisa mede

**`fnm exec --using=22.23.2 ./scripts/provar-tudo.sh`** corre **tudo** — todas as guardas e
todas as provas — e diz o que correu. **Descobre em vez de listar**: acrescentar um
`provar-*.sh` ou um `validar-*.sh` passa a bastar.

Foi escrito a 2026-09-03 às 21h40 porque este ficheiro tinha uma lista **à mão** de seis
scripts quando `scripts/` já tinha vinte e quatro. Derivou em seis horas — e um documento de
emergência só é lido na emergência, que é o pior momento para descobrir que está
desactualizado.


```
fnm exec --using=22.23.2 pnpm verificar     cobertura + segredos + lint + tipos + testes + build
fnm exec --using=22.23.2 pnpm inspeccionar  Playwright: larguras, contraste, foco, alvos
./scripts/provar-isolamento.sh              RLS, 4 casos + controlo negativo
./scripts/provar-separacao-de-credenciais.sh
./scripts/provar-prontidao.sh
./scripts/validar-cobertura.sh              396 IDs, nenhum perdido nem inventado
./scripts/varrer-segredos.sh                nada de segredos na árvore
bash scripts/estado.sh                      a percentagem medida
```

### Ao fechar a etapa

Actualiza `docs/progress/E##.md`, `HANDOFF.md`, `ETAPAS.md` e — **só se a etapa entregar
vistas** — o `coverage.csv`, mexendo **exactamente** nos IDs que a etapa lista. Um a mais é
tão defeito como um a menos.

No `E##.md` escreve os **achados**, incluindo os teus próprios erros pelo caminho. É a parte
mais lida do documento e a que evita que o erro se repita. Testes que correste e testes que
não correste vão em listas **separadas**.

**Não avances para a etapa seguinte.** Declara e pára.

### E se o sénior não aparecer

Acrescentado a 2026-09-03, depois de o sénior estar duas horas indisponível e o JR ter
continuado — o que foi razoável, porque nada aqui dizia o contrário.

Ficar parado é desperdício. Avançar para a etapa seguinte cria um problema real: a revisão
deixa de poder medir a árvore, e se a etapa em revisão for reprovada, o que se construiu
por cima assenta numa base reprovada.

**A saída certa é a terceira: trabalho que não depende da etapa em revisão.** Por exemplo:

- **testes e provas** para o que já está entregue — sempre há mais superfície do que
  coberta;
- **controlos negativos** que faltam a provas existentes;
- **contratos e documentação** de etapas futuras, que não tocam código;
- **auditoria adversarial** ao que já foi validado, contra as cinco regras do
  `docs/architecture/README.md` — foi assim que o sénior encontrou o comentário mentiroso
  do `prisma.config.ts`, que estava no E01 validado;
- **pendências declaradas** de etapas anteriores que não dependam do que está em revisão.

Se mesmo assim avançares para a etapa seguinte — e pode ser a decisão certa, se a espera
for longa — **diz no handoff que o fizeste e porquê**. O que dói não é o trabalho adiantado:
é o revisor descobri-lo por acidente e ter de reconstituir o que aconteceu.

## Fim do prompt

---


## O que aterrou a 04/09 e uma sessão nova não pode ignorar

Aponta-se, não se copia: um documento lido só na emergência envelhece sem ninguém dar por
isso — já aconteceu com o prompt do sénior a 03/09, que listava como pendente uma coisa
feita há uma hora.

- **`docs/progress/DIVIDA-MOVEL.txt` — a dívida NÃO está vazia (46 itens) desde 04/09.** As 112 telas até
  ao marco estão validadas **e** medidas em móvel. A `validar-movel.sh` continua a reprovar
  dívida **nova**, e a `validar-movel-real.sh` cruza a frase «móvel medido» com os specs que
  a medem — sem esse cruzamento, pagar a dívida era escrever seis palavras na coluna certa.
- **`docs/architecture/catalogo-e-publicacao.md`** e **`dominios-e-enderecos.md`** — o
  endereço público e o domínio **não voltam ao mundo** quando se largam. `@unique` impede
  dois ao mesmo tempo, não dois em sequência, e o QR está impresso.
- **A lição das guardas, que vale para o código e para os instrumentos:** casar *texto de
  código* obriga a cobrir **todas** as formas válidas de o escrever. `export async function
  POST` e `export const POST` são a mesma coisa; `'NAO_CONTEM'` e `"NAO_CONTEM"` também.
  Uma guarda que vigia um **estilo** em vez de uma **propriedade** está verde por acaso.
  Custou uma retenção no E09 e um defeito igual numa guarda do sénior no mesmo dia.

## O que aterrou no fecho do E10, e uma sessão nova não pode ignorar

- **Uma prova pode repor o defeito que a etapa corrigiu, e dizer verde.** O
  `provar-publico.sh` repunha «a função verdadeira a partir da migração», com o nome da
  migração escrito à mão — e a lista ficou para trás quando uma migração posterior corrigiu
  a função. Cada passagem deixava na base a versão com a fuga entre unidades, e o passo
  final dizia «voltou ao verde» porque nada media a fuga. **A reposição passou a ser um
  retrato da BASE VIVA**, tirado antes de plantar seja o que for, e há um passo final que
  compara o fim com o princípio. Se escreveres um controlo negativo que substitui algo,
  copia esse padrão: nenhuma lista à mão sobrevive.

- **Importar um nome de um módulo com efeitos corre os efeitos.** Aconteceu duas vezes no
  mesmo dia: o `publico.spec.ts` importava o endereço de `semente-inspeccao.ts`, que tem
  `await principal()` no topo — cada worker do Playwright semeava outra vez, em paralelo,
  sobre as linhas que o navegador lia; e o `playwright.config.ts` importava o caminho da
  sessão do ficheiro de setup, e recusou arrancar. **Constantes vivem em módulos sem
  efeitos.**

- **`min-width: 0` não chega num item de grelha: `margin: 0 auto` desliga o esticar.** A
  faixa media 360 px e o item media 592 dentro dela. Foi preciso medir duas vezes.
  Corolário mais útil do que a regra: quando a correcção óbvia não muda o número, **mede
  outra vez em vez de acrescentar outra correcção por cima**.

- **Uma etapa que entrega telas não se assina sem prova de navegador.** Está no
  `COMO-REVISO.md` desde 04/09, e o E10 nasceu já assim: 29 telas medidas em cinco larguras.
  A prova de navegador encontrou cinco defeitos que build verde, tipos verdes e guardas
  verdes não viam — todos de desenho, nenhum com erro em lado nenhum.

- **O arnês do navegador autentica.** `inspeccao/autenticar.setup.ts` + o projecto `painel`.
  Sessão real, emitida pela biblioteca, com o limitador respeitado. Se precisares de medir
  uma tela com sessão, já não é preciso construir nada — e repara que o `BETTER_AUTH_URL`
  tem de bater certo com a porta da inspecção, senão o registo devolve 403 e o erro não diz
  uma palavra sobre portas.

- **Recusar inventar é uma entrega, não uma falta — e a fonte JÁ CHEGOU.** A página de
  planos do E10 nasceu sem preços porque nenhum estava decidido em documento nenhum, e
  recusar inventá-los foi a decisão certa: um preço publicado é uma promessa a quem o leu.
  **Mudou a 04/09.** O PDF comercial existia fora do repositório e os dois ficheiros que ele
  mandava criar nunca tinham sido entregues. Estão agora em `docs/bossaos/PRECIFICACAO.md` e
  `PRECIFICACAO.json`, em cêntimos inteiros. **Quem tocar na LP lê de lá**, e a
  `validar-precos.sh` reprova um preço escrito à mão numa tela.

## O que aterrou entre o E18 e o E33, e uma sessão nova não pode redescobrir

Escrito a 06/09 às 08h00, com o atlas fechado — **396/396 telas validadas**, 34
de 36 etapas. Isto é o que custou a noite a aprender e o que uma sessão nova
repetiria do zero.

### As quatro regras que saíram desta noite

**1. Nenhuma pergunta sobre uso se responde só em TypeScript.** A 03h mandei
apagar a `custom_domain_owners` como «esquema sem uso»: zero chamadores num
`grep` de TypeScript. O chamador existia — `vincular_dominio`, `SECURITY
DEFINER`, dentro de uma migração. **Tu foste verificar a premissa em vez de
executar, e foi isso que salvou a defesa contra um restaurante ficar com o
domínio de outro.** Continua a fazê-lo. O `varrer-alcance-da-etapa.sh` já lê
`.sql`; o `grep` de circunstância é que não lê, e é sempre o `grep` que mente.

**2. As guardas liam a bancada; o que se publica é o commit.** Um defeito
plantado para controlo negativo foi reposto na bancada e não commitado — duas
vezes, E32 e E33, com um commit pelo meio a corrigir a primeira. As 27 guardas
verdes sobre a árvore, o HEAD vermelho. **Corre `scripts/validar-no-commit.sh`
antes de declarar uma etapa.** O controlo negativo dele é a própria história
deste repositório: exige vermelho no `de3eb52` e verde no `e13b318`.

**3. Ler prosa vale quando a prosa É o artefacto; é defeito quando substitui um
mecanismo.** O `validar-jornada` dizia «há controlo negativo» por causa de um
**comentário**. Estava verde por sorte. Agora mede a alavanca — a variável que o
corredor põe numa corrida e não põe noutra.

**4. Copiar a forma de um padrão que funcionou exige voltar a verificar a
razão.** É a tua própria frase, do fecho do E33: a identidade do trabalho
copiou a forma da `print_jobs` do E31, onde funciona **porque o alvo é um
UUID**. Aqui era texto livre, e a propriedade não transferiu. Duas casas
colidiam.

### E uma que é do sénior, e serve-te na mesma

**Sem uma sonda que TEM de entrar, quatro recusas seguidas passam por prova.**
Três vezes nesta noite as minhas sondas mediram o meu próprio erro — um `cast`
errado, um nome de coluna errado, um filtro de limpeza errado — e todas as vezes
foi o **controlo positivo** que apanhou. Escreve sempre o caso que deve passar,
ao lado dos que devem falhar.

### O estado, em três linhas

- **E33 validado** a 06/09 pelo sénior (`docs/reviews/E33.md`). O atlas fechou.
- **Falta o E34** (é do sénior, não teu) e o **E35 — implantação e piloto**, que
  é o teu. Contrato `docs/architecture/implantacao-e-piloto.md` e régua
  `docs/reviews/ALVO-E35.md`, os dois escritos **antes** do código.
- **Há um documento novo, o `docs/RV100.md`**, deixado pelo Matheus: reconstrução
  visual e comercial. **Não é teu** e não lhe toques — tem um portão de aprovação
  humana e o sénior está a tratar do diagnóstico. Se o vires referido, é isso.

## Notas para o sénior (não colar)

- O terminal do JR é `F17A8F91-337F-428E-A6C6-438922559E0C`; o boot normal dele é
  `/iniciar-lumen-jr`.
- Depois de colar isto, **não lhe dês a etapa na mesma mensagem**. Deixa-o orientar-se
  primeiro e dizer onde acha que está — se a leitura dele não bater com o `HANDOFF`, é
  sinal de que o handoff está desactualizado, e isso é uma coisa a saber antes de o pôr a
  trabalhar.
- Se ele reiniciar a meio de uma etapa, a primeira coisa a verificar é o trabalho não
  versionado: já esteve com 30 caminhos por commitar.
- **Commitar por segurança e empurrar são coisas diferentes, e eu confundi-as a
  2026-09-03.** Guardei os 30 caminhos do JR a meio do E04 — certo, o Mac tem histórico
  de kernel panic — e depois empurrei-os com um commit meu por cima. O `eslint` apanhou
  um `'entrar' is defined but never used` no `provas/acesso.test.ts` dele, que estava a
  meio de ser escrito, e a CI ficou **vermelha numa coisa que não é uma regressão**.
  Uma CI vermelha que não significa nada é pior do que nenhuma: ensina a ignorar o
  vermelho. A regra: **commit local protege; `push` é para o que está declarado.**
- **Não correr a verificação enquanto o JR escreve.** A 2026-09-03, às 15h15, o
  `pnpm verificar` deu vermelho em `rotas-com-porta.test.ts` — e o mesmo teste, corrido
  isolado trinta segundos depois, deu verde com as cinco asserções, sem eu ter mudado
  nada. A explicação mais provável é a óbvia: eu estava a ler ficheiros que ele estava a
  escrever.
  Qualquer que seja a causa, a conclusão é a mesma e é mais forte do que o diagnóstico:
  **um resultado que muda em trinta segundos sem eu tocar em nada não é uma medição.** E
  o corolário incomoda mais do que o falso vermelho — um **verde** obtido a meio de uma
  etapa também não vale nada, e esse não faz barulho nenhum a passar.
  A verificação que conta é a de **depois da declaração**, com a árvore parada.
- Antes de empurrar, `pnpm verificar` e ler o código de saída — e o `&&` tem de estar
  **na verificação**, não no `git add`. Foi assim que empurrei por cima de um vermelho
  nesse mesmo dia, com o resultado à minha frente.

## O que aterrou entre o E11 e o E13, e uma sessão nova não pode redescobrir

**Primeiro, antes de olhar para código: a CI está parada por FACTURAÇÃO do
GitHub**, desde 04/09. «The job was not started because recent account payments
have failed.» Cinco trabalhos, zero passos, log nenhum. **Vermelho na CI neste
momento não diz nada sobre o teu código** — não vás caçar um defeito que não
existe, como o sénior quase fez duas vezes. Só o Matheus desbloqueia. Até lá a
prova é local, e quem valida escreve que foi local.

**O marco Starter (E11) passou, com seis reprovações pelo caminho** — nenhuma
por defeito de produto. Foram aceites não demonstrados e instrumentos a medir
zero. O padrão que as apanhou todas: a régua (`docs/reviews/ALVO-E##.md`)
escrita **antes** de ver a entrega.

**O ORG-007 apareceu uma terceira vez no E13** — juntar `user` a uma consulta de
inquilino. A política `identidade_propria` limita o runtime à própria linha e o
Prisma devolve a relação a **null sem se queixar**: não estoira, mente. Agora há
guarda estrutural, `scripts/validar-juncao-identidade.sh`, e ela encontrou a
terceira ocorrência **um minuto depois de existir**. Se precisares de identidade
dentro do inquilino, passa pela porta que existe (`packages/db/src/autenticacao.ts`),
não abras um atalho.

**Uma migração pode ter lógica que a base viva não tem.** No E13 a função de
idempotência estava na migração e **não** na base — dois testes falhavam por
isso, e a causa foi um script de prova morto a meio. Quando um teste falhar sem
explicação, compara o que está **declarado** com o que está **vivo** antes de
mexer no código.

**O sénior e tu já não partilham base de dados.** Ele corre as provas dele na
`bossaos_revisao` (`scripts/base-de-revisao.sh`). A `bossaos_dev` é tua. Se vires
dados a mexer-se por baixo de ti, isso é um defeito novo, não é ele.

**A pergunta de dinheiro do E14 já está decidida**, em
`docs/architecture/preco-de-um-pedido-escrito-offline.md`: um pedido escrito
offline paga o preço **do momento em que foi escrito**, mas quem confere é o
servidor contra a versão da ementa, nunca o aparelho. Preço que não bate ou
versão desconhecida **param numa pessoa** — nunca se reprecifica em silêncio.

## Onde estás AGORA — deriva-se, não se escreve aqui

Não há retrato do estado neste ficheiro, de propósito: um retrato envelhece e um
documento de emergência só é lido na emergência, que é o pior momento para
descobrir que está errado. Deriva-se em três comandos:

```
bash scripts/estado.sh                    # a percentagem e a etapa: ATUAL=E<N>
cat docs/progress/E<N>.md                 # o TEU estado, escrito por ti
cat docs/reviews/ALVO-E<N>.md             # a régua, escrita pelo sénior antes
git log --oneline -5                      # o que ficou commitado
```

Se o `E<N>.md` disser **A MEIO**, foi escrito por ti a fechar por contexto —
confia nele, é o teu, e não reconstruas o que ele já diz. Se não existir, a etapa
ainda não começou.

**Antes de tocares em código, corre `bash scripts/validar-provas-na-ci.sh`.** Ela
falha de propósito desde 04/09: metade das provas não corre na CI e isso é dívida
conhecida, não defeito teu. Falha enquanto a facturação estiver trancada.

## Como fechar quando o contexto acabar — sem esperar que te mandem

A 04/09 chegaste aos 98% e foi o sénior que se lembrou de te mandar commitar. Se
ele não estivesse a olhar, o trabalho ficava por versionar e a sessão seguinte
tinha de o reconstruir a partir de ficheiros sem explicação. Isto passa a ser
teu, não dele.

**Aos ~90% de contexto, pára de construir e faz duas coisas, por esta ordem:**

1. **Commita o que tens, mesmo a meio.** A mensagem diz onde paraste e o que
   falta. **Código a meio commitado vale mais do que código a meio órfão** — os
   ficheiros sobrevivem aos dois, o que se perde é a intenção.
2. **Escreve `docs/progress/E<N>.md`** com: o que está feito e provado, o que
   falta, e o que já decidiste e não deve ser rediscutido. Começa-o com **A
   MEIO**, para quem o ler saber que não é uma declaração.

Depois disso podes parar. Não gastes o resto do contexto a explicar-te a ninguém.

**Não declares uma etapa com ficheiros por commitar.** A `validar-handoff.sh`
recusa-o, e tem razão: o revisor não pode medir o que ainda está a mudar. Já
custou onze vermelhos que não eram regressão nenhuma — era só um ficheiro a meio
que não compilava, a derrubar tudo o que precisa da aplicação de pé.

## O 404 fantasma do arnês: RESOLVIDO, e a causa não era o produto

Escrito a 04/09, e fica aqui porque volta noutra etapa se ninguém souber.

**O sintoma:** uma rota com identificador — `/staff/<unidade>/mesas/<sessionId>`,
mas serve para qualquer uma — devolve **404 numa passagem completa e verde na
seguinte**, sem ninguém tocar em nada, em telas diferentes de cada vez.

**A causa:** o arnês **semeia no arranque e apaga no fim** (`globalTeardown` →
`limpar-inspeccao.ts`). Uma passagem anterior ainda viva, ou interrompida e a
chegar ao fecho mais tarde, apaga as fixtures **por baixo** da que está a medir.
Basta um `pnpm inspeccionar` esquecido, ou um script de controlos negativos que o
temporizador matou a meio.

**Duas hipóteses foram descartadas pelo caminho**, e vale a pena não as repetir:
não é o `sala.spec` a fechar a sessão — ele só submete `abrir`, e **visitar uma
tela de encerrar não fecha nada**, porque é um GET que desenha formulários; e
não é a partilha da fixture, embora separá-la continue a ser boa higiene.

**O que deu a resposta foi a MENSAGEM, e não a investigação.** Quando uma rota com
identificador devolve 404, a prova pergunta agora à base se a linha ainda existe,
e diz qual dos dois casos é:

```
STAFF-005 · … respondeu 404 — e a sessão JÁ NÃO EXISTE na base:
alguém a apagou a meio da passagem
```

«A linha existe e o produto não a serviu» e «a linha já não existe» são causas
**completamente diferentes**, e a segunda nem sequer é um defeito do produto.
Distingui-las com «respondeu 404» à frente custou uma hora e uma hipótese errada.

**A regra que fica, e é maior do que este caso:** quando uma prova falhar sobre
um recurso que outra coisa gere, a mensagem tem de dizer **de que lado está o
problema**. Não é conforto — é a diferença entre corrigir e procurar.

O `scripts/provar-staff-no-navegador.sh` recusa arrancar com a porta ocupada ou
com outra passagem viva. Se escreveres um script que corre o arnês em ciclo,
copia essas duas guardas: sem elas, o teu próprio ciclo é o candidato número um.

## O que aterrou entre o E14 e o E17, e é fácil desfazer sem dar por isso

**1. A garantia do QR vive num campo que NÃO existe.** `guest_sessions` não
guarda a geração do QR que a abriu. Sem esse campo ninguém *pode* comparar a
geração da sessão com a da mesa — e é essa comparação que faria a **rotação
expulsar clientes a meio do prato**. Se alguma vez te apetecer acrescentar
`qrGeneration` ali «para saber de onde veio a sessão», estás a reactivar o
defeito, e nada te vai avisar. **Rodar não é revogar**, e é assim que se mantém.

**2. `data-tela` quer dizer «esta página identifica-se a si própria».** As
ligações da navegação levam `data-seccao`. Antes eram as duas coisas o mesmo
atributo, e a asserção do marcador **não conseguia falhar** — a barra escrevia o
id de todas as telas em todas as páginas. Ao corrigir isso descobriu-se que o
STAFF-001 nunca tinha tido marcador nenhum. Não voltes a pôr `data-tela` num
link.

**3. A população das telas vem da MATRIZ, conjunto a conjunto.** Ler o
`coverage.csv` e comparar, com guarda contra ler vazio. Contar só o número deixa
passar uma tela trocada por outra. Foste tu que inventaste isto no E15; é régua
desde então.

**4. Duas suites de navegador ao mesmo tempo não medem o produto.** Medem quem
chegou primeiro ao CPU, e o sintoma são falhas de ~12s que mudam de sítio a cada
corrida. `scripts/maquina-livre.sh` avisa. O sénior corre na árvore e base dele;
se vires um vermelho estranho, confirma primeiro que não há outra suite viva.

## O que aterrou no E34 a 06/09, e uma sessão nova não pode redescobrir

Foi um dia inteiro de revisão, e o que ele produziu **não é código novo: são
garantias**. Uma sessão nova que não saiba disto vai reabrir coisas fechadas.

### As oito jornadas existem e correram juntas

J01, J02, J08, J09, J11, J12, J14, J15 — **58 passos, numa só execução**. A régua
de cada uma está em `docs/reviews/ALVO-J08-J12-J15.md`, escrita **antes** do
código. Duas coisas dessa régua estavam erradas e foste tu que as corrigiste, com
razão: não existe objecto «divisão» neste produto, e as duas recusas da J15 não
têm de ser pela mesma razão — o que não pode haver é um 404.

### As treze correcções, e o estado delas

Todas fechadas. As que deixam regra atrás de si:

- **7** — um plante tem de verificar que aplicou. Apanhou, na primeira corrida,
  um plante que não aplicava **há oito commits** (`== 7` num ficheiro com oito
  ocorrências).
- **10 e 12** — os alvos de teste dizem de que casa são. A raiz da `staff` morta
  era esta: o alvo vinha da organização B e o **404 estava certo**.
- **13** — o rasto do suporte não se separa da leitura. `0 >= 0` fazia a
  auditoria opcional.
- **4** — a CI **descobre** as provas por glob. As `provas/*.test.ts` que ela
  alcança passaram de **12 para 39 de 40**.
- **5** — o `varrerRetencoesExpiradas` ganhou quem o chame; o `sentar` morto foi
  apagado.

### As guardas novas — se uma delas ficar vermelha, é achado, não ruído

| guarda | o que impede |
| --- | --- |
| `validar-suites-com-guiao.sh` | uma suite ou prova sem guião **desaparece** do corredor |
| `validar-dados-ficticios.sh` | domínio de fantasia ou texto de encher no que embarca |
| `validar-leitura-cedo-demais.sh` | valor lido no corpo do `describe` congela vazio |
| `validar-tres-linguas.sh` | chave em falta cai para espanhol **em silêncio** |
| `validar-alvos-com-casa.sh` | alvo de teste sem organização, nas tabelas que vivem em duas |
| `validar-plantes.sh` (estendida) | distingue **VIVO / APLICADO / MORTO** — «aplicado» é defeito por restaurar |

Todas com sonda por dentro. A das três respostas constrói um repositório git de
brincar em cada corrida.

### O que o E34 ainda NÃO tem, e é do sénior fechar

**Não fecha a etapa quem implementa.** Se te mandarem fechar o E34, é engano:
faltam medições que são da revisão.

- **Aceite 3** — das seis famílias de invariante concorrente, três estão provadas
  (saldo, reservas, deduplicação) e **três não**: **reembolso, stock e acesso**.
  Reembolso é dinheiro a sair; stock é venda a descoberto.
- **Aceite 5** — a tabela final de pendências, verificada item a item.
- **Dívida 2** — o `/staff/` não tem uma única ligação. É decisão do Matheus.

### A armadilha que apareceu em cinco formas no mesmo dia

*Todo o eixo em que se estreita é um eixo onde a resposta se esconde.* No mesmo
dia: a inflexão da palavra (`simultan` não casa com `SIMULTÂNEAS`), o limite do
identificador (`publico` dentro de `crm-publico`), a fronteira de linha (o
`git grep` casa linha a linha), a profundidade do aninhamento (o filtro dentro da
relação), e **a definição confundida com a chamada** (`import X` não é chamar
`X`).

E a que vale por todas: **um `git grep -E '\b…'` devolve zero em silêncio** — o
`git grep` não suporta `\b`. Usa `-w`.

---

## RV100 — a guarda de expansão de texto (07/09, commit `14adb5c`)

`scripts/validar-expansao-de-texto.sh` + `inspeccao/expansao.spec.ts`. Mede a
razão de comprimento por chave entre `en` e as outras duas línguas, e vai ao DOM
ver se o que cabia em inglês ainda cabe. **337 cadeias crescem 30% ou mais** e
nenhuma transborda por si: o transbordo depende da caixa onde a puseram, e é por
isso que se mede com `getBoundingClientRect` e não com contagem de letras.

Três respostas, as três exercitadas com este guião: **OK (0)**, **FALHOU (1)**
com o limiar baixado, **NÃO MEDI (2)** com o detector cegado *e* com a população
esvaziada. A saída 2 sai antes da camada de relatório, nunca por `tail`.

### Duas coisas que aprendi a pagar aqui

**O que não é lido com os olhos não transborda aos olhos.** O primeiro vermelho
foi um falso positivo meu: `Abrir el menú de navegación`, +223 px, é um
`bo-so-leitor` — 1 px e `clip-path: inset(50%)`. A exclusão é **pela propriedade**
(a caixa renderizada não é visível) e não pelo nome da classe. Excluir por nome
era medir a grafia outra vez, e mentia no dia em que a classe mudasse de nome.

**Um veredicto lido no relatório é um veredicto emprestado.** A minha primeira
verificação da sonda procurava um `✘` que o `--reporter=line` nunca escreve: um
detector que não podia disparar, e que teria reportado uma sonda falhada como
«o texto não cabe» — o diagnóstico errado, que é pior do que nenhum. O veredicto
passa a ser o **código de saída** de uma invocação própria.

E o corolário: como o filtro do invisível pode ele próprio esvaziar a população,
o detector conta o que mediu. Um ecrã sem um único elemento medido é NÃO MEDI.

### Achado por fora do encargo, para quem lá for

**A pasta `inspeccao/` está fora do typechecker.** Plantei `let medidos: number =
"isto não é um número"` e o `pnpm typecheck` passou com saída 0. Não há
`tsconfig` que a nomeie. O ESLint cobre-a (apanha erros de análise); os tipos não.
São 30+ ficheiros de prova de navegador sem verificação de tipos — não lhe toquei
porque não é o meu encargo, mas dizer «tipos ok» sobre `inspeccao/` é verde oco.

### E a armadilha, na sexta forma

À lista das cinco junta-se esta: **o instrumento que lê a saída de outro
instrumento herda a forma como esse a escreve.** O `✘` era a grafia do relatório,
não o facto. O facto era o código de saída.

---

## RV100 — a guarda de expansão passa a derivar os ecrãs (07/09)

O código ficou em `fe3f165`, e não num commit meu: o sénior commitou a árvore
partilhada enquanto eu tinha os ficheiros no índice, e levou-os dentro do lote
L1b. **O índice do git é recurso partilhado como a árvore, a base, a porta e o
`.next`.** Verifiquei que o que ficou em `main` é a versão boa — `md5
c8d5c49…`, a mesma que deu o verde — e não uma das versões adulteradas que os
controlos negativos produzem. Foi por pouco: um commit varrido durante uma
corrida de controlo teria posto em `main` um detector cego.

### O que mudou

De **3 ecrãs à mão para 276 medidos**. Os namespaces do i18n trazem o código da
etapa no nome (`kdsE16`) e o atlas tem a etapa por ID, portanto o mapa deriva-se.
A lista à mão fica só para o que a derivação não alcança, com tecto.

Emenda à medição que recebi: os 29 namespaces com código colapsam em **25
códigos**, e o atlas tem **29 etapas**. Dois conjuntos diferentes com o mesmo
cardinal — é assim que uma confirmação falsa se disfarça de confirmação. O que
aguenta é a direcção em que uso o mapa: nenhum dos 25 códigos falha o atlas.

O fecho passa a imprimir o denominador, nas três saídas e não só no verde.

### Quatro erros meus no mesmo dia, e o que os une

1. **333 das 380 rotas do atlas não têm prefixo de língua.** Pedidas assim
   devolvem 200 e **redirigem para `/es-ES`**. Medi 12 ecrãs «em inglês» e eram
   espanhol nos doze.
2. **O desconto do «já transbordava em inglês» comparava textos** entre línguas.
   «Postal code» nunca é igual a «Código postal»: letra morta.
3. **`caixa.right - pai.right`** com um `<tr>` de 32 px por pai.
4. **Um `<thead>` de 1 px com `overflow:hidden`** a esconder um `<th>` de 80 px.

O que os une: **usei um número que existe para responder a uma pergunta que ele
não responde.** O 200 existe e não diz que a língua pegou; o texto existe e não
identifica o elemento; a caixa do `<tr>` existe e não é um contentor; o
`clientWidth` do `<thead>` existe e não é uma largura útil. Em nenhum dos quatro
o instrumento estava avariado — estava a ser lido para além do que sabe dizer.

**E a cura foi sempre a mesma:** pôr a prova dentro do achado. Enquanto julguei
acusações com sondas por fora, gastei três corridas e a página mudou entre a
acusação e a verificação. Quando a falha passou a dizer que regra disparou, qual
a caixa e **quem corta**, o `<thead>` de 1 px apareceu à primeira.

### Porta nova, aprendida ao vivo

O `.next` foi reconstruído por outro processo a meio da minha corrida e a guarda
disse «a sonda não acendeu» — falso, e a acusar o instrumento errado. Um
arranque falhado tem agora diagnóstico próprio. A `provar-staff-no-navegador.sh`
já tinha aprendido isto a 04/09: **um vermelho de arranque não é uma medição.**

---

## RV100 §12.5 — o enumerador das 792 (07/09, `1d2544f`)

`scripts/validar-alcance-das-composicoes.sh` + `inspeccao/alcance.ts` +
`alcance.spec.ts`. Enumera e classifica os 396 IDs; **não captura** — o §8
propaga o redesenho depois da aprovação humana e uma captura de hoje fotografa
um desenho que vai mudar. Mapa em `docs/progress/alcance-das-composicoes.csv`.

**A partição, e fecha:** 178 só-URL · 202 estado-partilhado · 16 provocar = 396.
**163 dos 165 endereços resolvíveis abrem.** 142 composições estão prontas a
capturar hoje (só-URL com porta aberta); 202 precisam de um passo lá dentro; 37
estão bloqueadas por parâmetro.

### O achado: eu estava a ler a coluna errada, e fui encaminhado para ela

O atlas tem `rota_sugerida` **e** `rota_detalhada`. A primeira medição deu 28
portas fechadas, 27 do catálogo: a sugerida diz `/brands/[brandSlug]/catalog`,
que não existe no sistema de ficheiros. O produto tem `/app/[orgSlug]/catalogo`
— e é isso que a `rota_detalhada` desses 27 diz. A coluna chama-se «sugerida» e
é mesmo isso: uma proposta. Nas ~87 linhas em que a detalhada traz rota em vez
de um marcador, foi ao produto confirmar, e ganha. Só isso levou as portas
abertas de 96/124 para 163/165.

**Regra que fica:** quando duas colunas dizem a mesma coisa de maneiras
diferentes, a que foi verificada ganha — e descobre-se qual foi medindo, não
perguntando ao nome da coluna.

### O sítio público não tem porta, e é uma raiz e não três

`publicLocationSlug`, `publicOrderId`, `postSlug` e `recibo` vivem **todos** sob
`/r/[publicLocationSlug]/`. `SELECT public_slug FROM locations` devolve NULO nas
três unidades da semente: nenhuma unidade está publicada, e por isso 36 IDs não
têm porta. Não são identificadores em falta aqui e ali. A `provar-jornada.sh`
publica com slug `jornada-%` e limpa no fim — **o caminho existe e falta
trazê-lo para o arnês**, e é o próximo degrau óbvio de quem quiser subir de 142.

### Duas portas fechadas que são do atlas

`/app/[orgSlug]/help` (o produto tem `ajuda`) e `.../catalog/duplicate`. Cinco
IDs atrás delas.

### O piso, que é o que faz disto uma guarda

`PISO_DE_PORTAS_ABERTAS = 163`, medido. Um enumerador que só conta não reprova
nada — é um relatório. Cinco saídas exercitadas: OK, FALHOU (piso), e três
NÃO MEDI (sonda cega, população amputada, prova sem mapa).

### E outra vez o medidor a acusar o medido

Prefixei um ponto de API com a língua e li o 404 como porta fechada; e o
`page.goto` rebentou com «Download is starting» no `qr.svg` — um recurso não se
navega, pede-se. **Uma porta fechada por culpa do medidor conta-se como defeito
do medido**, que é a mesma família das quatro da guarda de expansão.

---

## Alvos com casa (07/09, `d198f71`)

A `validar-alvos-com-casa` ficou vermelha quando a semente de demonstração criou
a segunda casa. Cada consulta do `alvos.ts` passa a dizer `organization_id`, e as
três do KDS dizem também a **unidade** — a `puerto` que aparece no `/kds/…`.

### O denominador mexe-se, e por isso passou a ser impresso

Recebi «três consultas». Eram três à hora da medição; depois do `arnes-pronto`
(que hoje semeia a demonstração) eram **oito**, com as tabelas de duas casas a
subir de 11 para 31. Numa corrida seguinte, com as suites já a terem limpo o que
semeiam, o mesmo comando deu **15 e 14**. Um verde aqui não diz «o arnês está
isolado» — diz «das tabelas que HOJE têm duas casas, as consultas dizem de qual».

### Ancorar no que o plante quer mudar, não no texto que o rodeia

A `provar-alvos-e-matriz` reprovou: a âncora do plante era o texto INTEIRO da
consulta do `orderId`, que eu reescrevi. Passou a pegar no número do pedido
(`'insp-A001'`), com `count == 1`. **Uma âncora que se parte com qualquer
reescrita da consulta mede a grafia.** É a mesma família dos plantes mortos da
correcção 7.

### Atribuir vermelhos: A/B, não intuição

Das oito suites, seis verdes e duas vermelhas. Provei que nenhuma das duas é
minha em vez de o supor: corri a do staff com o `alvos.ts` **de HEAD** e falha
igual (a âncora do crachá já não existe no `inspeccao-comum.ts`); e o `kds` está
modificado e por commitar na árvore, com 14 entradas onde HEAD tem 15.

### Duas ratoeiras de método, e a segunda é a que dói

Corri as oito sem carregar o `.env` e li quatro vermelhos falsos — o mesmo
tropeção que o sénior tinha acabado de descrever na revisão do foco.

E o A/B esgotou o tecto de dez minutos **antes da linha que repunha o ficheiro**,
deixando o `alvos.ts` de HEAD na árvore partilhada. Reparei e repus logo, e refiz
o A/B com `trap ... EXIT`. **Um controlo que repõe no fim só repõe se chegar ao
fim** — e numa árvore partilhada, o que não repõe não é um controlo, é um
estrago com temporizador.

---

## Acessibilidade dinâmica (07/09, `515ca44`)

`scripts/validar-acessibilidade-dinamica.sh` + `inspeccao/acessibilidade-dinamica.spec.ts`.
Era o único buraco do dossiê que não esperava por aprovação nenhuma. A pasta
`evidence/accessibility/` deixou de estar vazia.

Menu móvel devolve o foco · **62 focáveis** em 3 superfícies, nenhum abaixo de
3:1 · **18/18** acções alcançadas com Tab · 200% sem rolar na horizontal.

### O fundo de trás do anel não é o fundo do elemento

A primeira corrida acusou 7 controlos a 1.00:1 — os botões primários escuros,
cujo fundo calha ser a cor do anel. Mas o token é `outline-offset: 2px`: o anel
desenha-se **fora** da caixa, sobre o fundo do **pai**. Corrigido pelo
afastamento, o mesmo detector dá 0 de 62, e os «Book a demo» que eu ia acusar
têm 13,05:1. **Uma acusação evitada por medir onde a coisa está, e não onde é
cómodo medi-la.**

### Um zero só conta depois de a sonda acender

Cada um dos quatro detectores tem sonda que lhe planta o defeito que deve achar.
As plantas são **no DOM**, porque os ficheiros da moldura estão em voo — e um
plante que não se repõe numa árvore partilhada é um estrago com temporizador.

E o guião conta os **marcadores** que as sondas imprimem, não linhas do
relatório: o projecto `preparar` corre como dependência do `chromium` e os seus
três casos entravam na conta, dando «7 sondas» havendo quatro.

### Terceira vez no mesmo dia: um controlo que não testa o que diz

O primeiro controlo da sonda do anel mudava o `cssText` da planta — e havia um
ouvinte de `focus` que repunha o anel branco. O controlo passou sem ter medido
nada. Antes disso, um `.slice` depois do ponto-e-vírgula fez o exit 2 vir da
sonda em vez da população. **O padrão: escrevi o controlo, vi o código de saída
certo, e quase não fui ler PORQUE é que ele saiu assim.** O código de saída certo
pelo motivo errado é indistinguível do certo, até se ler a mensagem.
