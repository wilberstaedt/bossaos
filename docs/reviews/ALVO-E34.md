# Régua do E34 — Revisão Pro e cobertura integral

> Escrita a 05/09, muito antes da etapa. Existe por uma razão concreta: eu disse
> **«fica para o E34»** quatro vezes hoje, espalhadas por dois documentos, e não
> havia aqui nada. Uma dívida adiada para um sítio que não existe é uma dívida
> apagada com passos extra.

## O que o E34 herda, e cada item tem endereço

## Estado das doze dívidas — 06/09, 04h50

Consolidado porque estavam espalhadas por catorze horas de trabalho e o E34
precisa de ser **executável**, não uma pilha.

| # | Dívida | Estado | Dono |
| --- | --- | --- | --- |
| 1 | Menu da plataforma sem `porConstruir` | **paga** | JR |
| 2 | `/staff/` sem uma única ligação | **aberta** — é pergunta de produto: como chega um tablet novo ao endereço? | Matheus |
| 3 | Alvos do arnês com forma de lotaria | **paga** — 13 consultas ordenadas, verificadas | eu |
| 4 | Guardas que observam a forma da escrita | **fechada sem achado** — varri as 25, as três que leem prosa têm invariante textual | eu |
| 5 | Provas que não correm na CI | **paga** — descoberta em vez de lista | eu |
| 6 | Código morto com ficheiro e linha | **resolvida** — a lista envelheceu; aponta para a varredura | eu |
| 7 | Código de verificação no pacote | **aberta, e o método descartado escrito** — nomes num pacote minificado não medem | eu |
| 8 | Assinaturas na pasta antiga | **paga** — e era pior: três diziam-se à espera | eu |
| 9 | `larguras.spec.ts` parece global e não é | **aberta** — baixa prioridade: cada etapa mede as suas | eu |
| 10 | O meu `git add -A`, duas vezes | **regra escrita**: caminhos explícitos, sempre | eu |
| 11 | RLS: `custom_domain_owners` | **decidida, por executar** — apagar, não proteger | JR |
| 12 | Provas de navegador não auto-contidas | **meia** — mensagem corrigida e `arnes-pronto.sh` escrito; falta ligá-lo aos 20 guiões | eu |

**Cinco pagas, uma fechada sem achado, uma resolvida, três abertas minhas, uma
decidida à espera do JR, uma do Matheus.**

E duas coisas que não são dívida mas ficam:

- **A varredura ao produto inteiro** passou de 65 órfãs para 60, com 57 funções
  novas e **zero órfãs novas**. As três que persegui estão ligadas.
- **O `leadsDaUnidade`** saiu do E34 e foi para as decisões do Matheus como a
  nona: não é dívida técnica, é âmbito — nenhuma etapa planeada reclama a
  leitura dos leads.

---

### 1. O menu da PLATAFORMA nunca foi medido — MEDIDO a 05/09, com dono

**As três entradas são do E33** — `PLAT-007` (casos de suporte), `PLAT-016`
(gerir incidente) e `PLAT-013` (registo de administração). Não são portas
esquecidas: são portas por construir sem o dizerem. A correcção é
`porConstruir: 'E33'` nas três, e é do JR, porque é código de produto que eu vou
verificar depois.

**A classe ficou fechada por `validar-portas-mortas.sh`**, que **descobre** os
layouts em vez de nomear um. A `provar-portas.sh` tinha o ficheiro escrito à mão:

```
LAYOUT='apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
```

Por isso o critério viveu um mês aplicado a metade do produto sem ninguém
reparar. **Terceira lista à mão a desalinhar hoje**, depois das provas na CI e do
índice de contratos.

E cometi, dentro dela, o defeito que ela caça: a primeira versão imprimia as três
FALHAS e **saía a zero**, porque `printf | while` corre num sub-shell e as
contagens morriam lá dentro. **Imprimir o defeito e devolver verde é a forma mais
pura do verde vazio.** Corrigido, e o código de saída verificado à mão.

---

*O que esta dívida dizia quando foi aberta:*

O marco do Restaurant mediu `app/[orgSlug]`. A `platform` tem `#` em Suporte,
Incidentes e Auditoria, **sem `porConstruir`** a dizer que etapa os faz — o
critério que apliquei ao menu de gestão nunca foi aplicado aqui.
`E21-LIMPEZA.md`.

### 2. O `/staff/` não tem uma única ligação em todo o produto

Zero `href`. É superfície de dispositivo com PIN, e um tablet configura-se uma
vez — por isso não bloqueou o marco. **A pergunta que fica:** como é que um
tablet novo chega ao endereço? Se for alguém a escrevê-lo de um papel, a
instalação de um posto depende de uma pessoa saber uma coisa que o produto não
diz.

### 3. Quatro alvos do arnês com forma de lotaria

`productId` (5 linhas a casar), `menuId` (2), `categoryId`, `groupId`:
`LIMIT 1` sem `ORDER BY`. Declarados e medidos pelo JR no E20, e **não tocados
de propósito** — servem provas de etapas assinadas, e mexer sem revalidar troca
um risco conhecido por um desconhecido. **«`LIMIT 1` sem `ORDER BY` não é um
alvo, é uma lotaria — e falha de forma intermitente, que é a maneira mais cara
de falhar.»**

### 4. As guardas que observam a FORMA DA ESCRITA

A guarda das 28 telas do E19 exigia a palavra «implementado aguardando
validação» e acendeu **por a etapa ter avançado** para «validado». Já corrigida.
**O E34 varre as restantes à procura da mesma forma:** alguma casa por texto de
estado em vez de casar pela propriedade que quer garantir?

### 5. ~~35 das 48 provas não correm na CI~~ — PAGA a 05/09

**Resolvida.** A CI passou a descobrir as provas como já descobria as guardas,
e a `validar-provas-na-ci` aprendeu que **descoberta é decisão**. De 45 provas
sem decisão para **nenhuma esquecida**: 13 nomeadas, 43 por descoberta, 3
declaradas fora (o corredor e os dois agregadores de marco).

Três coisas que só apareceram por fazer o trabalho, e nenhuma se via de fora:

- **A categoria não se deduz do nome.** Quatro provas usam Playwright sem o
  sufixo `-no-navegador`; classificá-las pelo nome mandava-as para um trabalho
  sem navegador. O classificador lê o conteúdo. E a derivação **concorda com o
  que a CI já fazia à mão** nas cinco que precisam da aplicação de pé — a
  melhor confirmação de que lê a coisa certa.
- **`provar-jornada.sh` nunca correu na CI.** Existe, passa, tem controlos, e
  ninguém a perguntava. É a terceira escala do «verde não é alcance», a única
  que só se apanha andando o caminho. Ligada.
- **Escrevi o passo com o defeito que o classificador existe para impedir.**
  `for s in $(...)`: com o classificador a sair a 3, a lista vinha vazia, o
  ciclo corria zero vezes e o passo saía verde. Corrigido para capturar a lista
  antes e exigi-la não-vazia.

Fica por converter a categoria `app`: as cinco estão espalhadas por três
trabalhos e convertê-las exige ver a CI correr, que a facturação bloqueia.
**Declarado, não escondido.**


E a causa é estrutural: a CI **glob-a as guardas** e **lista as provas à mão**.
O conserto existe — o `provar-tudo.sh` descobre — e a CI menciona-o num
comentário sem o usar. `E21-CI.md`. **Terceira aparição do mesmo defeito neste
projecto**; as outras duas foram os documentos de retoma.

### 6. O código morto — a lista envelheceu, e a resolução é não ter lista

**Medido a 06/09, às 03h40.** Cruzei os nomes do `E21-LIMPEZA.md` com a varredura
ao produto inteiro e a lista **está desactualizada**: várias entradas que ela dá
por mortas estão vivas — `agendaDoDia`, `atrasadas`, `carregarReservas` —, e as
duas que ela marcava como «capacidade em falta» resolveram-se esta noite: o
`revogarConvite` ficou ligado, e o `listarAuditoria` tem etapa (E33).

**Foi escrita no E21, dez etapas atrás, e ninguém a voltou a medir.** É o padrão
do dia inteiro — *lista à mão desalinha* — aplicado, desta vez, a uma lista de
dívida. A ironia é que era uma lista feita para limpar código morto e tornou-se
ela própria um documento morto.

**Resolução: o `E21-LIMPEZA.md` deixa de carregar nomes e passa a apontar para a
varredura.** `varrer-alcance-da-etapa.sh <primeiro-commit>..HEAD` responde à
mesma pergunta com o estado de agora, e não com o de há dez etapas. Um documento
que enumera não pode ser mais verdadeiro do que o dia em que foi escrito.

*O que a dívida dizia quando foi aberta:*

### 6-bis. O código morto, com ficheiro e linha

`E21-LIMPEZA.md` tem a lista dividida: **7 para apagar** (duplicados com
alternativa viva), **2 que NÃO se apagam** porque são capacidade em falta
(`revogarConvite` — não se cancela um convite mal enviado; `listarAuditoria` —
a auditoria é escrita e ninguém a lê), e **2 por ler** (permissões, que não se
apagam por estatística de uso).

### 7. Código de verificação no pacote publicado — TENTEI MEDIR E NÃO CONSEGUI

**06/09, 03h50.** Agora que há um pacote publicado no VPS, tentei responder à
dívida com medição em vez de suspeita: procurei os nomes das funções
só-de-verificação dentro do `.next/server` servido.

Deu **cinco zeros** — `sobrepoe`, `sindromes`, `penalidadePorMascara`,
`descodificar`, `identificadorAdivinhavel` — e eu ia concluir que o empacotador
as remove.

**O controlo positivo desmontou isso.** Procurei três funções que **têm** de
estar lá, e o `avisoDeSeguranca` — chamado pela tela pública dos alergénios —
deu **zero também**. O build de produção **minifica e renomeia**: procurar nomes
num pacote minificado não mede presença.

> **Os cinco zeros não são «não está lá»: são «não medi».** E só o soube porque
> pus um controlo positivo — sem ele, teria fechado a dívida com uma conclusão
> confortável e falsa. É a quinta vez nesta sessão que um zero meu queria dizer
> outra coisa.

**A dívida fica aberta, com o método já descartado escrito.** Quem lhe pegar a
seguir não precisa de repetir o meu caminho: para responder a isto é preciso
olhar para o grafo de importações do empacotador, ou marcar as funções de
verificação e ver se o marcador sobrevive — não procurar nomes no resultado.

*O que a dívida dizia quando foi aberta:*

### 7-bis. Código de verificação no pacote publicado

As funções do `qr.ts` e o `sobrepoe` existem para **verificar** o produto, não
para o servir. Não é defeito; é peso num pacote que se publica.

### 8. As assinaturas mudaram de sítio a meio — e era PIOR do que isto dizia

> **Reescrita a 05/09, depois de a medir.** O que estava aqui em baixo descrevia
> um problema de arrumação: as quatro assinaturas na pasta antiga. A verdade era
> outra e mais grave, e só apareceu por eu ir abrir os ficheiros em vez de
> confiar na minha própria nota.

**Três dos quatro documentos declaravam, no cabeçalho, «implementado, aguardando
validação»** — e o do E12 anunciava uma assinatura retirada. As quatro etapas
estavam validadas havia um dia, cada uma com commit próprio: `83d0a2b`,
`1aac55d`, `d96ae76` e `8da8df4`. O que ficou por actualizar foi o cabeçalho,
depois da segunda passagem.

**A tabela e o documento respondiam à mesma pergunta de maneiras opostas — e
quem lê abre o documento.** Um leitor novo conclui uma de duas coisas, ambas
falsas: que quatro etapas passaram sem assinatura, ou que a tabela inflaciona a
percentagem. Fui verificar essa segunda hipótese à história antes de soar o
alarme, e a tabela estava certa — mas **ter de ir à história para saber qual das
duas versões vale já é o defeito.**

**Paga.** Os três cabeçalhos dizem agora o estado verdadeiro e o commit que o
deu, e a história da volta perdida fica onde ensina, mais abaixo. E a classe
ficou fechada com uma guarda, `validar-registo-coerente.sh`: uma etapa marcada
`validado` na tabela não pode declarar-se à espera no seu próprio documento.
Nasceu vermelha sobre os três, com controlo negativo, e entra na CI sozinha pelo
glob das guardas.

**Uma nota sobre como quase a estraguei.** As minhas notas de correcção citavam
a frase proibida a contar a história, e a guarda acusou-me a mim — o mesmo que me
aconteceu de manhã com a `validar-silenciadores` e um comentário do JR. A saída
fácil era afrouxar a guarda para me acomodar. Reescrevi a nota. **Uma guarda que
se alarga para deixar passar quem a escreveu deixa de ser uma guarda.**

O resto, que era o que esta dívida dizia antes:


**E09, E10, E12 e E13 estão validadas e não têm `docs/reviews/E##.md`.** Fui
verificar se as assinei sem rever: **não.** A evidência está lá — réguas,
controlos negativos, provas nomeadas — mas vive em `docs/progress/E##.md`.

A convenção mudou a partir do E14 e as anteriores ficaram onde estavam. Não é
defeito de substância; é defeito de **alcance**, outra vez: quem procurar as
assinaturas em `docs/reviews/` conclui que quatro etapas passaram sem revisão.

**O E34 decide uma das duas** — mover, ou deixar um apontador em cada — e
escreve qual. O que não serve é ficar a depender de alguém saber que houve uma
mudança de convenção a meio do projecto.

## O que exijo de mim próprio nesta revisão

- **Enumerar os módulos antes de medir.** Aprovei o marco do Restaurant com
  «módulos entregues» sem enumerar quais, e escaparam-me o `kds` e o `staff`.
- **Critérios fixados antes de ver, e a lista do que NÃO exijo.**
- **A reaprovação executável**, como `provar-marco-e21.sh` — a leitura não se
  reexecuta.

## Dívida 9 — a prova de larguras parece global e não é

`inspeccao/larguras.spec.ts` corre sobre um `PAGINAS` de **seis caminhos escritos
à mão** (`ajudas.ts:6`) que nunca cresceu: `inicio`, `catalogo` e quatro
estruturas. O produto tem 322 telas validadas.

Não é um buraco de cobertura — desde o E20 cada etapa mede as suas próprias
larguras dentro da própria prova, e foi assim que o E27 mediu as catorze. **É
pior do que um buraco: é um instrumento que parece cobrir tudo e cobre seis.**
Quem o ler para decidir se o móvel está medido tira a conclusão errada.

**Quinta lista à mão a desalinhar no mesmo dia** — depois dos documentos de
retoma, da lista de provas na CI, do índice de arquitectura e da linha de etapa
do HANDOFF. O padrão já não é anedota: **onde há uma lista escrita à mão de coisas
que crescem, ela está desactualizada.** A correcção é sempre a mesma — descobrir
em vez de listar.

Fica: `larguras.spec.ts` passa a descobrir as telas a partir do `coverage.csv`
(as validadas, com rota), como a CI já descobre as guardas por padrão. Controlo
negativo: acrescentar uma tela nova ao coverage e ver a prova crescer sozinha.

## Dívida 10 — o meu `git add -A`, duas vezes no mesmo dia

**05/09, commit `091c53a`:** varri as onze telas de equipa do E28 do JR para
dentro de um commit meu sobre coerência do registo. Emendei a mensagem.

**05/09, commit `c5f09e0`:** varri o **esquema do E29** dele — `BankAccount`,
`StatementImport`, `BankLine`, `Reconciliation`, `AccountingPeriod` e mais três —
para dentro do meu commit do contrato do E30.

A segunda foi apanhada pela `validar-ordem.sh`, e apanhou-a **pela razão certa**:
o commit diz `E30:` no assunto e contém trabalho do E29. Não é trabalho
adiantado — o E29 é a etapa autorizada — é trabalho **mal etiquetado**, por
minha causa. Fica declarado aqui e sai da janela de 40 commits sozinho. Não lhe
abro excepção: a etiqueta errada é minha e o registo tem de a mostrar.

> **O que isto ensina sobre mim é mais útil do que o incidente.** O índice do
> git é estado partilhado entre os dois agentes; escrevi-o na lista de estados
> partilhados de manhã, apanhei-me a violá-lo à tarde, disse que não voltaria a
> acontecer, e voltou a acontecer três horas depois. **Uma intenção não é um
> controlo.** A regra que fica não é «ter cuidado»: é `git add` com caminhos
> explícitos, sempre, porque essa não depende de eu me lembrar.

**Consequência para a revisão do E29:** o esquema financeiro está em `c5f09e0` e
não no commit que o JR vier a declarar. A varredura do E29 tem de cobrir o
intervalo que inclui os dois, ou mede uma etapa a que falta a base.

## Dívida 11 — o RLS, medido a pedido do JR e com dois achados por baixo

06/09, 02h40. O JR perguntou se devia usar `FORCE ROW LEVEL SECURITY` em vez de
`ENABLE`, notou que 30 migrações usam só `ENABLE`, **seguiu a convenção do
projecto e deixou-me a observação**. Foi a decisão certa nas duas metades: não
divergir sozinho, e não calar a dúvida.

**Medido na base do staging:** 145 tabelas, **todas** com dono `bossaos_migrate`;
137 com RLS ligado e nenhuma com ele forçado; 8 sem RLS.

**A resposta: `ENABLE` chega, e a convenção fica.** O `FORCE` só importa para o
**dono** da tabela, e o runtime liga-se como `bossaos_app`, que não é o dono. O
`provar-isolamento.sh` corre com o papel real de runtime e usa o de migração
apenas para desligar o RLS no controlo negativo — o desenho está certo.

**Mas a protecção assenta num invariante que ninguém mede:** *o runtime nunca se
liga como dono*. No dia em que alguma rota usasse a credencial de migração, 137
tabelas perderiam o RLS **em silêncio**, e nada acenderia.

### ~~Achado 1 — a prova de isolamento cobre 6 de 137~~ — ERRADO, e corrijo

Escrevi isto às 02h40 e **está errado**. Vi `TABELAS=(organizations brands
locations memberships role_assignments users)` e concluí que a prova cobria seis
tabelas. **Essas seis são a alavanca do controlo negativo** — é nelas que o RLS
se desliga para exigir que os casos 2 e 3 fiquem vermelhos —, não a cobertura.

A cobertura está no `provas/isolamento.test.ts`, com **28 asserções**, e mede o
**mecanismo**: contexto de inquilino, `WITH CHECK` na escrita **e no mover uma
linha de A para B**, contexto vazio a negar sem rebentar, o contexto a deixar de
valer no `COMMIT` e no `ROLLBACK`, a mesma ligação a não ver o inquilino
anterior, o email a devolver `NULL` sem dizer se existe alguém, e o `comEscopo` a
recusar um identificador que não é UUID antes de tocar na base.

**Testar 137 tabelas seria testar o mesmo mecanismo 137 vezes.** A prova está
certa no método e no alcance, e eu li seis linhas de um ficheiro e julguei o
resto — a segunda vez esta noite que acusei um instrumento nosso e o instrumento
tinha razão. A primeira foi a `validar-dinheiro`.

### Achado 1, na forma certa — nada verifica que uma tabela de inquilino TEM RLS

O que o `isolamento.test.ts` mede é que **o mecanismo funciona onde está ligado**.
O que ninguém mede é se está ligado **em todo o lado que precisa**.

E há prova de que isso importa: a `custom_domain_owners` tem `organization_id` e
não tem RLS. O teste do mecanismo nunca a tocaria, porque não é sobre tabelas — e
é precisamente por isso que ela passou despercebida.

### Achado 2 — uma tabela com dado de inquilino, sem RLS e sem ninguém

`custom_domain_owners` tem `organization_id`, **não tem RLS**, e o
`CustomDomainOwner` aparece **só no `schema.prisma`** — nenhum código de produto,
nenhum teste, nenhum documento. As outras sete sem RLS são globais por natureza:
o catálogo de alergénios da UE, as definições de plano, o pessoal da plataforma,
a contabilidade das migrações.

**É a classe de alcance um nível abaixo: modelo sem chamador em vez de função sem
chamador.** Hoje não vaza nada porque ninguém lê a tabela. No dia em que alguém a
usar, herda uma tabela de inquilino sem cerca — e vai encontrá-la já criada, o
que é precisamente o que faz ninguém pensar duas vezes.

**Fica para o E34 decidir:** ligar o RLS agora, ou apagar a tabela até a etapa
dos domínios a precisar. O que não serve é ficar como está, porque o próximo a
tocar-lhe não tem como saber.


### A `custom_domain_owners`, resolvida — e nasceu numa etapa que EU assinei

Medido: **duas tabelas nasceram na mesma migração**,
`20260904140000_e10_sites_leads_dominios`.

| Tabela | RLS | Usada por |
| --- | --- | --- |
| `custom_domains` | **ligado** | `packages/db/src/dominios.ts` — o caminho vivo |
| `custom_domain_owners` | **desligado** | nada. Zero linhas, zero chamadores, zero documentos |

A segunda é resto de um desenho que mudou dentro do mesmo commit: quem escreveu a
migração criou as duas e ligou uma. **A tela `WEB-009 «Conecta tu dominio»` está
validada e funciona** — usa a viva.

**E o E10 fui eu que assinei.** A varredura de alcance que corri na altura era por
etapa e ao nível de **funções**; nunca olhou para tabelas. Uma tabela órfã não
tem chamador para faltar — ela só existe.

> **A classe é a mesma e o nível é outro.** Passei o dia a caçar função sem
> chamador, tela sem porta e jornada sem percurso. Esta é **esquema sem uso** — e
> das quatro, é a única que a minha varredura não podia ver por construção.

**A decisão do E34: apagar.** Não ligar o RLS. Uma tabela sem linhas, sem
chamadores e substituída pela irmã no mesmo commit não é uma tabela por
proteger — é uma tabela a mais. Ligar-lhe o RLS deixava-a lá a parecer
intencional, e o próximo a encontrá-la usá-la-ia por julgar que existe por
alguma razão.

Migração é código de produto: **é do JR**, e eu verifico depois. A
`validar-rls.sh` fica vermelha até lá, que é onde ela deve estar.

## Dívida 12 — as provas de navegador não são auto-contidas numa base fresca

**06/09, 04h20.** A prova de navegador do E31 falhou na minha base isolada com
«não encontrei a pertença do utilizador do arnês», e **não é defeito do E31**.

`alvos.ts` precisa do utilizador `painel@inspeccao.example` **ao carregar o
ficheiro** — antes de qualquer teste correr. Quem cria esse utilizador é o
projecto `preparar` do Playwright (`autenticar.setup.ts`), que só corre **depois**
da recolha. A `semente-inspeccao.ts` usa esse email apenas como valor de texto
(`abertoPor`); nunca cria o utilizador.

**Numa base fresca, nenhuma prova de navegador pode carregar sem uma corrida
anterior do `preparar`.** Nas validações do E29 e do E30 isto passou despercebido
porque a base já tinha o utilizador de corridas anteriores — que é exactamente o
tipo de dependência que a base isolada existe para revelar.

**Resolução:** o passo do `preparar` entra nos guiões, ou no
`base-de-revisao.sh`. Uma prova que depende de estado que outra deixou passa
sempre na máquina de quem a escreveu.

### O que isto me custou, e porquê vale a pena escrevê-lo

**Seis hipóteses, cinco mortas por medição.** A quarta é a que interessa: contei
`organizations` e deu **zero**, e concluí que a base estava vazia. **Estava
cheia** — eu é que lia como `bossaos_app`, sujeito a RLS e sem contexto de
inquilino. Como `bossaos_migrate` estavam lá duas organizações, quatro pertenças
e três unidades.

> **O zero que eu via não era ausência: era o limite do que eu estava autorizado
> a ver.** É a lição do dia inteiro virada contra o revisor — e a única razão de
> não ter «consertado» a semeadura, o ambiente e as fixtures, todos sãos, foi ter
> testado cada hipótese em vez de agir sobre ela.


### Dívida 12, primeira metade paga: a mensagem passou a nomear as duas causas

**06/09, 04h25.** A correcção que fiz **não foi a que eu esperava fazer**.

O que me custou seis hipóteses não foi a dependência em si — foi a **mensagem de
erro apontar para a causa errada**. Ela dizia apenas *«a semeadura da inspecção
correu?»*, e a semeadura **tinha corrido**. O que faltava era o utilizador do
arnês, que a semente não cria (usa o email só como valor de texto) e que nasce no
projecto `preparar` do Playwright.

Agora nomeia as duas, por ordem de probabilidade, com o comando de cada uma — e
diz que **numa base fresca é quase sempre a primeira**.

> **Uma mensagem de erro que nomeia a causa errada é pior do que uma mensagem
> vaga:** manda quem depura para o sítio onde não há nada, e manda-o com
> confiança. Uma vaga faz procurar; uma errada faz encontrar a coisa errada.

**E provoquei-a para a ver renderizada** antes de a dar por feita. Escrever uma
mensagem que nunca vi aparecer seria repetir, na correcção, o defeito que a
correcção existe para resolver.

**Fica por pagar a outra metade:** o `preparar` continua a ser um passo que
alguém tem de saber correr. A hipótese natural — metê-lo no
`base-de-revisao.sh` — obriga o servidor a estar de pé para uma reconstrução de
base, e é caro para quem só quer o motor. **Não decido isto às 04h30**; fica
registado para o E34 com as duas opções em cima da mesa.


## Dívidas 3 e 12, pagas e verificadas com a mesma corrida

**06/09, 04h45.** `provar-kiosk-no-navegador` com os treze alvos ordenados e o
arnês preparado pelo guião novo: **20 casos verdes, zero falhas, reposto.**

### `scripts/arnes-pronto.sh` — os três passos, e a ordem que não é a óbvia

```
1. fixtures.ts           organizações, unidades, pertenças
2. --project=preparar    o UTILIZADOR do arnês
3. semente-inspeccao.ts  o cenário insp- — carta, mesas, pedidos
```

**Escrevi-o com a ordem errada e o próprio guião acusou-me.** Pus a semente em
segundo e o `preparar` em terceiro; o bloco de verificação respondeu **«zero
menus»**. O `preparar` corre uma limpeza no fim — *«nada ficou para trás»* — que
leva o cenário da semente e **deixa o utilizador**. Semear depois dele.

> **É o ponto do bloco de verificação inteiro:** um guião de preparação que diz
> «pronto» sem confirmar é a mesma promessa vazia que ando a caçar no produto.
> Sem ele, eu teria um script que anuncia sucesso e deixa a base inutilizável —
> e a prova seguinte falharia com um erro que não aponta para ele.

**Seis hipóteses e quarenta minutos viraram um comando**, com a razão de cada
passo escrita ao lado.

### O que fica por fazer, e não escondo

O `arnes-pronto.sh` **existe e não é chamado por ninguém** — os vinte guiões de
navegador continuam a assumir o estado. Chamá-lo de dentro deles é a conversão
certa, e é trabalho de os editar um a um ou de lhes dar um preâmbulo comum.

**Sim, isto é uma função sem chamador** — escrita por quem passou o dia a caçá-las.
Fica declarada como tal em vez de eu fingir que a dívida está fechada: o que está
feito é o conhecimento deixar de estar só na minha cabeça.
