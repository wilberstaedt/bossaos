# E34 — a varredura de alcance ao produto INTEIRO

> Corrida a 05/09, pela primeira vez. Até hoje a varredura correu sempre por
> **etapa**, e é por isso que isto nunca tinha aparecido.

## A falha estava no meu instrumento, não no produto

O `varrer-alcance-da-etapa.sh` recebe um intervalo de commits e pergunta se as
funções **desse intervalo** têm chamador. Foi escrito assim de propósito, depois
de eu ter varrido um commit em vez de uma etapa no E23 e deixar passar o
`receberWebhook`.

Mas o desenho tem uma consequência que só vi hoje: **uma função só é perguntada
uma vez, na etapa em que nasce.** Se nasceu ligada e o chamador desapareceu
depois, ninguém volta a perguntar. Se nasceu órfã numa etapa cuja varredura eu
ainda não fazia, também não. **A varredura incremental só apanha órfãos novos;
os herdados são invisíveis por construção.**

Corri-a ao intervalo completo, do primeiro commit até HEAD.

## O que saiu

```
ficheiros no intervalo: 95   funcoes exportadas: 538
FALHA    65 sem chamador em produto
```

**65 de 538.** E 65 não são 65 defeitos — classifiquei antes de dizer o que quer
que fosse:

| Classe | Quantas | O que significa |
| --- | --- | --- |
| usadas só por `provas/`, `inspeccao/` ou `scripts/` | **23** | código de verificação — peso no pacote publicado, não defeito |
| usadas por testes **dentro dos pacotes** (`*.test.ts`) | **23** | testadas, mas sem caminho no produto |
| **sem uso nenhum, em lado nenhum** | **19** | nem produto, nem prova, nem teste |

> ### ⚠ Correcção a 05/09, uma hora depois de eu escrever isto
>
> **Escrevi «42 sem uso nenhum em todo o repositório» e o número estava errado.**
> A minha classificação procurou uso em `provas/`, `inspeccao/` e `scripts/` — e
> **os testes também vivem ao lado do código**, em `packages/**/*.test.ts`. Vinte
> e três dos 42 são exercidos aí. São **19**, não 42.
>
> Apanhei-o por acidente: fui verificar o `sessoesVivas` e um `grep` devolveu-me
> cinco ficheiros onde eu tinha dito zero. Eram quatro artefactos de build e a
> barrica de re-exportação — o `sessoesVivas` continua órfão —, mas a
> contradição obrigou-me a refazer a conta, e a conta estava mal.
>
> **A lição é a minha de sempre, virada para mim:** defini «testado» por uma
> lista de pastas escrita à mão em vez de descobrir onde os testes estão. Quarta
> lista à mão a desalinhar hoje, e esta produziu um número que eu já tinha
> publicado.
>
> E muda uma coisa no caso dos alergénios, para pior: o `avisoDeSeguranca` está
> **bem testado**. A cobertura do domínio parece boa precisamente porque o teste
> exercita a função que a tela não usa.

## FECHADAS a 06/09 pelo JR — quatro das cinco

`revogarConvite`, `apagarExcepcao`, as três portas mortas do menu da plataforma e
o caso dos alergénios estão pagas. `validar-desfazer.sh` foi de **2 pares sem
desfazer a ZERO**. O detalhe fica no `HANDOFF.md`, secção «As quatro correcções
do E34 estão fechadas».

Duas notas que valem mais do que o fecho:

**O `href: '#'` não era descuido — era obrigatório.** `LigacaoDeNavegacao` pedia
`href: string` enquanto o comentário ao lado dizia «não tem href». Quem escrevia
o menu não tinha outra forma de dizer «isto ainda não existe». O tipo passou a
união discriminada e o estado errado deixou de ter nome.

**O caso dos alergénios confirmou a tua frase, e piorou-a.** Escreveste que a
cobertura do domínio parecia boa *precisamente porque o teste exercita a função
que a tela não usa*. Medi-o: plantar `contem: []` no `avisoDeSeguranca` faz um
prato **com glúten** mostrar-se como «ninguém declarou» — e antes da correcção
esse plante **não mudava uma vírgula do que a pessoa alérgica lia**. O controlo
acendia num sítio por onde o ecrã não passa.

**Continua aberta a quinta:** `leadsDaUnidade`, escrever sem ler. É a forma para
que apagaste a `validar-escrita-sem-leitura.sh`, e não lhe toquei.

## As duas que já classifiquei

**`listarAuditoria` — legítima.** O E33 consome-a (`SET-011` «Registro de
acciones», `PLAT-013` «Registro de administración»). É código à frente da etapa,
a mesma figura do `porConstruir` num menu.

**`revogarConvite` — defeito real, e o melhor exemplo do dia.** Está implementada
e correcta em `packages/db/src/convites.ts:223`, exportada no `index.ts:91`, e a
base tem o estado `REVOGADO` com `revokedAt`. A tela onde viveria — `ORG-007`,
«Personas y accesos» — **já foi construída e assinada no E04**, e até **lista os
convites pendentes** (`listarConvites`). A rota da API importa `criarConvite,
listarConvites, registar`. **Não importa `revogarConvite`.**

Resultado: um convite enviado para o email errado dá acesso ao sistema de um
restaurante e **não se cancela** — espera-se que caduque. O prazo é configurável,
por isso a janela é o que alguém escolher.

E a formulação que fica: **o modelo de dados tem um estado que o produto não
consegue produzir.** Enquanto `REVOGADO` existir na base e nenhum caminho lá
chegar, o esquema descreve um produto que não é este.

## O que fica para o E34 decidir

As outras 40, uma a uma, em três caixas: **apagar**, **ligar** (é capacidade que
falta), ou **declarar** (é da etapa X, como a auditoria). O que não serve é a
contagem ficar como número.

E a correcção do instrumento, que é a lição maior: **a varredura por etapa
continua certa para fechar uma etapa, e é insuficiente como garantia do
produto.** Precisa de irmã — uma varredura total com lista declarada, na forma
que a `validar-provas-na-ci` já usa: cada órfão ou tem chamador, ou tem motivo
escrito. Aí o número deixa de crescer em silêncio.

## As 19, medidas

| Função | Ficheiro |
| --- | --- |
| `accoesDoPapel` | `packages/domain/src/permissoes.ts` |
| `apagarExcepcao` | `packages/db/src/horarios.ts` |
| `autorizacaoPorConcessoes` | `packages/domain/src/portas/autorizacao.ts` |
| `detectoresRegistados` | `packages/db/src/descidas.ts` |
| `euProprio` | `packages/db/src/repositorios.ts` |
| `filiacoesDaOrganizacao` | `packages/db/src/repositorios.ts` |
| `filiacoesDoUtilizador` | `packages/db/src/repositorios.ts` |
| `guardarLead` | `packages/db/src/leads.ts` |
| `leadsDaUnidade` | `packages/db/src/leads.ts` |
| `limparConteudoLegivel` | `packages/fila/src/navegador.ts` |
| `listarAuditoria` | `packages/db/src/auditoria.ts` |
| `oUsoCorrectoCompila` | `packages/db/src/escopo.tipos.ts` |
| `obterUnidade` | `packages/db/src/repositorios.ts` |
| `papeisDaFiliacao` | `packages/db/src/repositorios.ts` |
| `passarClienteComEscopoOndeSePedeIdentidadeNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteDeIdentidadeOndeSePedeEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteSemEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `revogarConvite` | `packages/db/src/convites.ts` |
| `sessoesVivas` | `packages/auth/src/revogacao.ts` |


---

## As 19, triadas — e uma classe que o instrumento não sabia ver

**Quatro não são órfãs: são testes de tipo.** As de `escopo.tipos.ts` chamam-se
`passarClienteSemEscopoNaoCompila` e afins. **Existem para o compilador as
recusar, não para alguém as chamar** — a ausência de chamador é o objectivo
delas. É uma classe de falso positivo que a minha varredura não sabe ver, e que
nenhuma contagem revelaria: só se descobre a ler os nomes.

**Uma é código à frente da etapa:** `listarAuditoria`, do E33.

**Duas são defeito confirmado, e têm a MESMA forma:**

| Criar — ligado na rota | Desfazer — sem chamador |
| --- | --- |
| `criarConvite` | `revogarConvite` |
| `guardarExcepcao` | `apagarExcepcao` |

Nos dois casos a função de desfazer está escrita, correcta e exportada, e **a
rota que faz a acção não a importa**. O produto sabe fazer e não sabe desfazer, e
o código diz que sabe as duas coisas.

Consequências medidas: um convite para o email errado dá acesso até caducar; uma
casa que marca «fechado a 25 de Dezembro» não consegue desmarcar, e o site
público mostra-a fechada num dia em que abre.

**Duas instâncias da mesma forma não são dois acidentes.** Ficou
`validar-desfazer.sh`: agrupa as exportações pelo substantivo e acusa quando o
verbo de criar tem chamador e o de desfazer não tem. Encontra os dois, e **nenhum
falso positivo em 436 substantivos**.

### A guarda mentiu-me duas vezes antes de funcionar, e as duas são o assunto dela

**Primeira:** anunciou `0 pares` num repositório onde eu tinha acabado de
encontrar dois à mão. A exclusão das barricas era uma heurística — «chama-se
`index.ts` e tem `export` nos primeiros 400 caracteres».

**Segunda:** substituí-a por uma regra por linha, e ainda deu zero. A ocorrência
que a enganava estava numa **linha de continuação** de um `export { ... } from`
de várias linhas:

```
packages/db/src/index.ts:132    guardarExcepcao, apagarExcepcao,
```

Só à terceira, a seguir o **bloco** e não a linha, apareceram os dois. **As três
falhas foram do instrumento, e são exactamente o assunto da guarda:** uma coisa
parece ligada porque aparece escrita algures.

---

## O terceiro caso, e é de forma nova: escrever sem ler

`leads.ts` tem quatro exportações. Duas estão ligadas e duas não:

| Função | Chamadores | O que faz |
| --- | --- | --- |
| `guardarLeadPublico` | **3** | o site público escreve o contacto |
| `registarPedidoDeDemo` | **2** | idem, para pedidos de demonstração |
| `leadsDaUnidade` | **0** | **listaria** os contactos de uma unidade |
| `guardarLead` | 0 | escrita interna |

**O produto capta contactos e ninguém os consegue ler.** Verifiquei o corpo do
`guardarLeadPublico` linha a linha antes de o dizer: valida, calcula chave de
idempotência, e faz `INSERT INTO leads`. **Não cria cliente no CRM, não enfileira
notificação, não manda email.** E não existe tela nenhuma no atlas — em etapa
nenhuma, nem futura — que leia leads. Procurei por `lead`, `contacto` e
`solicitud` nas 396: só aparecem `MKT-011`, as `PUB-*` e duas do CRM, todas
validadas e todas do lado de quem escreve.

**O que torna este pior do que os outros dois:** o `MKT-011` chama-se **«Tu
solicitud está enviada»**. É uma tela validada que promete a um visitante que o
pedido chegou. Chegou a uma tabela que ninguém abre.

Os outros dois defeitos prejudicam o restaurante. **Este faz o restaurante
quebrar uma promessa ao cliente dele sem saber que a quebrou** — e o cliente que
não recebe resposta não reclama, muda de sítio.

### Três formas, e a terceira não era procurável pelas duas primeiras

| Forma | Exemplo | Como se vê |
| --- | --- | --- |
| criar sem desfazer | `revogarConvite`, `apagarExcepcao` | par de verbos, um ligado outro não |
| **escrever sem ler** | `leadsDaUnidade` | um modelo com escrita e sem leitura |
| regra num sítio, uso noutro | `avisoDeSeguranca` | a guarda vigia o lado que não corre |

A `validar-desfazer.sh` apanha a primeira e **não apanharia esta**: `guardar` e
`listar` não são verbos opostos. Fica escrito, porque é a lição: **cada guarda
que escrevo apanha a forma do defeito que já vi.** A varredura de alcance é o
que continua a apanhar os que ainda não têm nome.

### Tentei dar detector a esta forma e não consegui — e isso é o resultado

Escrevi a `validar-escrita-sem-leitura.sh`: para cada modelo do esquema, há
escrita em produto e não há leitura? **Apaguei-a**, porque falha nas duas
direcções e as duas razões valem mais do que a guarda valeria.

**Falso negativo no `Lead` — o próprio defeito para que a escrevi.** O
`leadsDaUnidade` *contém* um `findMany`, e vive em código de produto. A guarda
perguntava «existe uma leitura escrita?» quando a pergunta é «a leitura é
**alcançável**?». **Quarta vez hoje que um instrumento meu confunde existir com
ser alcançável** — a mesma confusão que o projecto inteiro existe para caçar.

**Falsos positivos em quem é lido por relação.** Acusou seis modelos. Fui ver o
`ProductTranslation`: é lido em `conteudo.ts`, dentro de um `include` pelo nome
do campo (`traducoes`), que não contém o nome do modelo em lado nenhum. Qualquer
modelo lido só através do pai cai nesta armadilha.

**Uma guarda que mente é pior do que não haver guarda**, e hoje isso custou-me
tempo três vezes. Fica escrito em vez de ficar instalado.

### O que fica no lugar, e é sólido

A varredura de alcance **já encontra** o `leadsDaUnidade` — está nas 19. O que
faltava não era detecção, era **ordenação por gravidade**. A regra que fica:

> **Uma função de leitura sem chamador, sobre um modelo que o produto escreve
> activamente, não é código morto: é uma promessa que o produto não cumpre.**

Aplicada às 19, esta regra separa `leadsDaUnidade` — que tem dados reais a
entrar por trás dela — de um `euProprio` que ninguém escreve nem lê. É a
diferença entre uma gaveta vazia esquecida e uma gaveta que enche todos os dias e
que ninguém abre.

---

## As quatro correcções, revistas — e uma que fica meia

06/09, 02h10. O JR fechou as quatro em `9d52bb6`, e as duas guardas que estavam
vermelhas de propósito ficaram verdes: `validar-desfazer` e
`validar-portas-mortas`.

**Guarda verde não é revisão feita**, por isso fui ler o commit.

**As três primeiras estão boas.** As portas da plataforma levaram o
`porConstruir` do E33; o `revogarConvite` e o `apagarExcepcao` ficaram ligados
nas rotas que já faziam o criar. O par de verbos deixou de existir sem metade.

**A dos alergénios está bem na estrutura e por medir no essencial.** A função
nova `avisosPorAlergenio` chama o `avisoDeSeguranca` — portanto o órfão deixou de
o ser — e a cadeia de ternários saiu da tela e foi para o domínio, ao lado da
regra. O comentário dele diz a coisa certa: *«uma cópia da regra é uma regra que
a guarda não vigia»*.

**Mas o `avisosPorAlergenio` não tem um único teste.** O `avisoDeSeguranca` tem
treze casos; a função nova — **a que decide o tom, e portanto se um `DESCONHECIDO`
se lê como «não contém»** — não aparece em prova nenhuma nem em spec nenhum. A
única menção a «tom» no ficheiro de teste é um comentário.

> **E isto é pior do que antes numa dimensão:** o ternário mudou para um módulo
> testado, o que faz a cobertura do módulo subir enquanto a propriedade continua
> sem ninguém a olhar. É a forma do dia inteiro na sua versão mais discreta — a
> cobertura melhora e a garantia não.

**A dívida fica aberta.** Pede-se pouco: um caso por estado, e o par que muda
`DESCONHECIDO` para `sucesso` e vê a prova acender.
