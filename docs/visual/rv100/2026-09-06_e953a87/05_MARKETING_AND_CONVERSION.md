# RV100 · secção 6 — a landing, medida contra o enunciado

> **Isto não é a reconstrução.** É o groundwork dela: o estado actual das oito
> páginas comerciais medido, uma a uma, contra o que a secção 6 pede; a separação
> entre o que é composição e o que é conteúdo; a ordem proposta; e o que não bate
> certo — no produto e no enunciado.
>
> Nada aqui foi aprovado. A aprovação estética é da secção 7 e é do Matheus.

---

## 0. O que já estava medido, e não voltei a medir

O `01_BASELINE.md` mediu treze hipóteses e a evidência está em
`evidence/baseline/` — oito capturas a 1440 px em es-ES e o
`medidas-1440.json`. **Reutilizei-a inteira.** Reli as capturas da home e dos
planos para confirmar o que os números diziam, e não gerei captura nova: gerar
evidência que já existe é trabalho a fingir.

O `03_DIRECAO_DE_MARCA.md` mediu o sistema de tokens contra o manual e concluiu
que é fiel número a número. **Não toquei em tokens.** Uma consequência disso
aparece na divergência D-4, mais abaixo, e tem solução sem token novo.

### Uma correcção pequena ao 01_BASELINE

O `01_BASELINE.md` escreve *«o conteúdo do hero acaba em x = 728 de 1440 em sete
das oito páginas»*. Recontei o ficheiro de medidas:

| páginas | hero acaba em |
| ---: | --- |
| 6 | exactamente **728** |
| 1 (faq) | **652** |
| 1 (home) | **1256** |

**Sete das oito acabam antes de metade da largura** — isso mantém-se e é a
conclusão que interessa. Mas o «728 em sete» é seis, e a home **não** é uma
delas. E o 1256 da home é um número que ainda não sei explicar: a captura mostra
o texto a acabar por volta dos 720 px. Fica como **número por explicar**, não
como facto contra o qual desenhar.

---

## 1. O que prende a reconstrução antes de eu escrever uma linha

Quatro coisas, e nenhuma é opinião.

**1.1 — Há uma suite de regressão a apontar para esta família.**
`inspeccao/marketing.spec.ts` mede MKT-001 a MKT-012 em cinco larguras e depende
destes selectores: `.bo-mkt__heroi h1`, `#t-product`, `#t-plans`,
`.bo-mkt__tabela-envolve table`, `.bo-mkt__passos`, `.bo-mkt__faq`,
`.bo-mkt__grelha`, `form[action="/api/publico/demo"]`, `.bo-publico__seccoes a`.
Mede também: zero rolagem horizontal, zero elementos fora do ecrã, alvos de 44 px
a 360 px, contraste WCAG, e que as sete rotas da família se alcancem da landing.
**Reescrever a composição sem reescrever esta suite parte-a; reescrever a suite
para ficar verde é o que o §11.1 proíbe.** A suite muda com a composição, e cada
mudança tem de dizer o que passou a medir.

**1.2 — São dez rotas, não oito.** O baseline mediu oito. A família tem doze IDs
em dez endereços: as oito mais `/demo/thanks` (MKT-011) e `/404` (MKT-012). As
duas que faltam são estados de rota e herdam a moldura — mudam com ela, e por
isso entram na regressão de cada lote.

**1.3 — Quatro guardas cobrem exactamente o que a secção 6 manda fazer.**

| guarda | o que impede | consequência para a secção 6 |
| --- | --- | --- |
| `validar-precos.sh` | qualquer `€ 19` escrito à mão num `.tsx` | os preços **têm** de vir de `precoDoPlano()` |
| `validar-dados-ficticios.sh` | `@*.example` e texto de encher em código que embarca | nada de preenchimento fictício nas secções novas |
| `validar-classes.sh` | classe `bo-` usada e não definida no CSS | cada classe nova precisa de regra |
| `validar-tres-linguas.sh` | chave que existe num catálogo e falta noutro | cada string nova entra nos três, ou o ecrã fica com um buraco silencioso |

**1.4 — O §12.5 rastreia 396 IDs.** Os catorze blocos do §6.3 são **secções da
MKT-001**, não IDs novos. Se algum deles nascer rota própria, o total deixa de
ser 396 e o gate de cobertura passa a medir outra coisa. Recomendo: nenhuma rota
nova nesta secção. Equipamentos entra como bloco da LP e como bloco na página de
planos, não como décima primeira rota.

---

## 2. As oito páginas, uma a uma

Legenda: **C** = composição (hierarquia, ritmo, espaço, foco) · **T** = conteúdo
(mensagem, prova, clareza comercial) · **P** = precisa de decisão do Matheus.

### 2.1 Moldura (`MolduraMkt` + `EstruturaPublica`) — atinge as dez rotas

| o que existe, medido | o que o §6.1 pede | falta |
| --- | --- | --- |
| `Wordmark()` sem argumento → **81 × 28 px** | mínimo 120, alvo 144–168 | **C** — `altura={50}` dá 145 px |
| **7 `<a>` iguais** numa `<nav>`, todos em `--bo-raio-capsula`, a partir em duas linhas | no máximo 4 agrupamentos; CTA «Pedir uma demo» prioritário; estado activo sem cápsulas | **C** |
| nenhum seletor de idioma | ES/PT/EN visível | **C** — o componente existe: `bo-publico__idiomas`, usado em `SitePublico.tsx` |
| nenhuma entrada na conta | login se a rota existir | **C** — `/auth/login` existe |
| sem menu móvel, sem botão, sem drawer | menu com nome, foco, fecho e scroll | **C** |
| `<footer>` com `{assinatura}` = «Hecho con BossaOS» | footer completo: produto, planos, recursos, idiomas, contacto, redes, login, privacidade, termos, cookies | **C** para a estrutura (o `EstruturaPublica` já aceita `rodape`; a `MolduraMkt` não o passa) · **P** para privacidade/termos/cookies/redes, que **não existem** |
| sem sticky | sticky só se não consumir área útil | — |

**O footer é o sítio onde o §6.3.14 e o §10 se cruzam mal.** O §10 falha a RV100
por «footer sem rotas institucionais mínimas»; o §6.3.14 diz «conforme
disponibilidade real». Não há rota de privacidade, de termos, de cookies nem
conta de rede social neste repositório. **Ganha o §6.3.14** — linkar uma rota que
dá 404 é pior do que não a ter —, e a falta fica registada como pendência.

### 2.2 Home — `/[idioma]` (MKT-001/002/003)

Medido: **3 secções**, 1 mídia (a própria marca), rola 1173 px, hero até 1256.

O §6.3 pede uma sequência mínima de **catorze** blocos. Estão **três**:

| # | bloco do §6.3 | estado |
| ---: | --- | --- |
| 1 | header e hero | existe, sem produto — **C**+**T** |
| 2 | problema reconhecível | **não existe** — **T** |
| 3 | uma única base | existe como três cartões — **T** (é a mensagem certa mal contada) |
| 4 | produto em movimento | **não existe** — **C**+**T** |
| 5 | módulos com telas reais | **não existe** — **C**+**T** |
| 6 | experiência por papel | **não existe** — **T** |
| 7 | planos com preço real | existe como título + parágrafo + botão — **T** |
| 8 | equipamentos | **não existe** — **T**+**P** |
| 9 | implantação | **não existe** na LP — **T** |
| 10 | confiança | **não existe** na LP — **T** |
| 11 | piloto | **não existe** — **T**+**P** |
| 12 | FAQ | **não existe** na LP — **T** |
| 13 | CTA final | **não existe** — **T** |
| 14 | footer completo | **não existe** — **C**+**P** |

Onze blocos por escrever. E o hero: o §6.2 pede «promessa, produto e acção numa
viewport» e «imagem criada com telas reais do produto». **A home tem zero
imagens do produto.** Os 49% da direita não estão vazios por desenho — estão
vazios por falta de mídia, que é literalmente o que o §10 lista como reprovação.

O texto aprovado está lá e está certo em ES e PT (ver D-3 para o EN).

**Nota de mecanismo que a reconstrução não pode partir:** `?section=product` e
`?section=plans` escondem tudo o resto e a suite de regressão depende disso. Com
catorze blocos, o parâmetro continua a ter de isolar o bloco pedido.

### 2.3 Produto — `/product` (MKT-004)

Medido: **2 secções**, 4 títulos, 4 parágrafos, **zero mídia**, **não rola**
(cabe em 900 px), hero até 728.

Repete os três cartões da home palavra por palavra — as mesmas chaves
`cartaoCarta`/`cartaoSala`/`cartaoWeb`. O §6.3.5 pede «telas reais e resultados
operacionais, não somente ícones»; esta página não tem nem ícones.

Falta: **C** (ritmo, uma página que cabe em 900 px não tem hierarquia para dar) e
**T** (os módulos que o produto tem — catálogo, sala, cozinha/KDS, reservas,
pedidos, TPV, stock, financeiro, CRM — e que esta página não menciona). O
material existe: 396 telas validadas.

### 2.4 Planos — `/plans` (MKT-005)

Medido: **2 secções**, tabela de **3 linhas × 3 escalões**, **sem um único
preço**, não rola.

O §6.5 pede oito coisas. Estão zero:

| §6.5 pede | estado |
| --- | --- |
| ler a mesma fonte de configuração do produto | **existe e ninguém a chama**: `packages/domain/src/precificacao.ts` importa a `PRECIFICACAO.json` e expõe `precoDoPlano()`, `MOEDA_COMERCIAL`, `MENSALIDADES_NUM_ANO`, `IMPOSTOS_INCLUIDOS` |
| cards de decisão rápidos | não existem |
| recomendação justificada | não existe |
| comparação completa e responsiva | 3 linhas de 3 capacidades |
| diferenças catálogo/site · operação · gestão avançada | não estão separadas |
| CTA coerente com disponibilidade | um botão «Hablar con nosotros» |
| implantação separada da assinatura | não aparece |
| adicionais e dependências honestos | não aparecem |
| FAQ de cobrança e mudança de plano | não existe |

**Isto é o achado mais barato de fechar de toda a secção 6.** A decisão de não
publicar preços caducou a 04/09 às 04:01, o módulo de domínio já existe, tem
testes, e distingue `anual` (cobrança) de `equivalenteMensal` (apresentação) —
que é exactamente a armadilha que o §6.5 avisa: «exiba sem induzir que o
equivalente mensal é a cobrança real».

Falta: **T** quase tudo, **C** os cards e a comparação.

### 2.5 Implantação — `/getting-started` (MKT-006)

Medido: **2 secções**, 4 passos, não rola, hero até 728.

**É a única página cujo conteúdo já responde ao que o §6.3.9 pede.** Os quatro
passos são conversa → importação → serviço acompanhado → continuidade, na ordem
certa e com a linguagem certa.

Falta: **C** (não rola, sem mídia, sem ritmo) e **T** um item só — o preço da
implantação (€99 opcional / €299 / €499, e €0 autogerido no Starter), que o §6.5
manda separar da assinatura e que aqui é o sítio natural para viver. Vem da mesma
fonte da 2.4.

### 2.6 Piloto — `/pilot` (MKT-010)

Medido: **2 secções**, e os dois «passos» são **`passo3` e `passo4`, as mesmas
chaves da implantação**. A página é um subconjunto de outra página.

O §6.3.11 pede «somente factos aprovados e identificados como piloto; sem
depoimento inventado». **Não há um único facto de piloto nesta página** — há uma
descrição de método reciclada.

E há um facto de piloto no repositório: a `PRECIFICACAO.md` diz que *«a La
Societat terá acordo de piloto separado»*. **Não uso esse nome.** É nome de
cliente em copy pública, o acordo é «separado, com prazo e condições próprios» e
não há autorização registada. Fica como pendência.

Falta: **T** (factos) e **P** (quais são publicáveis, e sob que nome).

### 2.7 Confiança — `/trust` (MKT-008)

Medido: **2 secções**, 3 pilares, sem mídia, não rola.

Os três pilares são verificáveis no código, e isso está escrito no próprio
ficheiro: isolamento com prova desde o E03, exportação desde o E08, alérgeno
DESCONHECIDO desde o E07. **É a página mais honesta das oito.**

O §6.3.10 pede quatro coisas: propriedade dos dados ✓, isolamento ✓, estados
honestos ✓ e **operação degradada realmente implementada** ✗. O quarto não está
aqui — está na FAQ, como `faq4` («Funciona sin internet en la sala»). Antes de
subir uma afirmação de operação degradada para a página de confiança, ela tem de
ser medida contra o código, não movida de sítio.

Falta: **C** (ritmo, mídia) e **T** (o quarto pilar, depois de verificado).

### 2.8 FAQ — `/faq` (MKT-009)

Medido: **2 secções**, 4 perguntas, hero **sem parágrafo** (é o único hero da
família com só um `h1`), rola 966.

O §6.3.12 pede objecções **comerciais, técnicas e de equipamento**. As quatro
cobrem duas comerciais (sair, web) e duas técnicas (TPV, offline). **Zero de
equipamento** e **zero de cobrança/mudança de plano**, que o §6.5 exige à parte.

Falta: **T**. E uma nota de ordem: uma FAQ escrita antes das páginas que geram as
dúvidas responde a perguntas que ninguém fez. Por isso está no fim da ordem
proposta.

### 2.9 Demo — `/demo` (MKT-007) e `/demo/thanks` (MKT-011)

Medido: **2 secções**, formulário de 5 campos (3 obrigatórios), rola 1194.

| §6.7 pede | estado |
| --- | --- |
| formulário reduzido ao necessário | ✓ 5 campos, 2 opcionais |
| campos agrupados com hierarquia | ✗ cinco `bo-campo` em pilha — **C** |
| explicar duração e o que o interessado verá | ✓ «Media hora, con tu carta delante» |
| informar o próximo passo após envio | ✓ na `/demo/thanks`, ✗ antes de enviar — **T** |
| diferenciar contacto transaccional de consentimento para marketing | **✗ não existe** |
| validação, erro e sucesso reais | ✓ |
| não mostrar sucesso se a persistência falhar | ✓ e é propriedade do caminho: só a rota da API emite o redireccionamento para o obrigado |
| confiança contextual sem depoimento inventado | ✗ — **T** |

**O item do consentimento não é só do §6.7.** Este formulário recolhe nome,
email, telefone e nome do restaurante de pessoas em Espanha, e não há aviso de
privacidade, nem rota de privacidade, nem distinção entre o contacto pedido e
autorização para marketing. É a única coisa nesta secção com peso legal, e é
**P**: o texto e a decisão são do Matheus.

---

## 3. Composição e conteúdo, separados

O manual (p. 18) fecha com o princípio que decide isto: *«Um foco por tela ou
peça. Um título, uma informação central e uma ação principal. O padrão gráfico dá
assinatura; o conteúdo real traz confiança.»* As oito páginas violam-no de duas
maneiras opostas: as sete páginas curtas têm **foco a menos** (nada que competir,
mas também nada que ver), e a home tem **três focos** com o mesmo peso visual.

**Composição — construo sem perguntar a ninguém:**

- logo de 81 → 145 px; moldura, footer e seletor de idioma na `MolduraMkt`;
- nav de 7 pílulas → agrupamentos com o CTA destacado, e o estado activo sem
  cápsula (§4.5 nomeia este defeito literalmente);
- menu móvel com botão nomeado, foco e fecho;
- ritmo vertical (ver D-4): as secções passam de 24 px de respiro para 64;
- hero em duas colunas com a mídia do produto a ocupar a direita;
- cards de plano, comparação responsiva, formulário agrupado;
- coral e cítrico com função — CTA, foco, marcadores editoriais — respeitando
  a regra de contraste do manual (ver D-1).

**Conteúdo — escrevo eu, a partir de factos que já existem no repositório:**

- os onze blocos que faltam à LP;
- os módulos reais na página de produto (as 396 telas são a fonte);
- os preços, lidos de `precoDoPlano()`, nunca escritos à mão;
- as perguntas de equipamento e de cobrança na FAQ;
- o quarto pilar de confiança, **depois** de medido contra o código.

**Conteúdo que não é meu — vai para `11_OPEN_FINDINGS.md` e segue:** os factos do
piloto, o aviso de privacidade e o consentimento, as rotas legais, as redes
sociais, a política de equipamentos e a imagem Open Graph.

---

## 4. A ordem proposta, e porquê

**A home é a primeira.** Quatro razões, por ordem de peso:

1. **É onde a mensagem se decide.** As outras sete páginas são a versão profunda
   de blocos que a LP introduz. Escrever a página de produto antes do bloco 5 da
   LP é escrever a mesma mensagem duas vezes e reconciliá-las depois — que é como
   o `/pilot` acabou a reciclar dois passos do `/getting-started`.
2. **É o M01 e o M02.** O portão da secção 7 pede LP desktop e LP móvel. Sem a
   home, o portão não abre e nada do resto se aprova.
3. **É onde se inventa a peça de prova do produto**, e essa peça é reutilizada por
   todas as outras. Inventá-la na página de produto e portá-la é trabalho a
   dobrar.
4. **É a superfície que paga se o lote for cortado a meio.**

Dentro do primeiro lote, a ordem interna é forçada por dependência: **moldura →
motor de prova → composição da home**. A moldura porque a home se desenha dentro
dela e a altura do cabeçalho decide o hero. O motor de prova antes da composição
porque um hero com metade direita reservada para mídia que ainda não existe é
exactamente o defeito do §10.

**Se o motor de prova bloquear — base de dados, ou a decisão sobre o dataset de
demonstração — a home não fecha, e eu digo isso em vez de entregar o hero com o
lado direito vazio.**

| lote | o quê | porque aqui |
| ---: | --- | --- |
| **L1** | **Home** (moldura → motor de prova → composição) | as quatro razões acima; a moldura sozinha corrige seis defeitos em dez rotas |
| **L2** | **Planos** | única página com decisão tomada e fonte já em código; é o «preço aprovado omitido» que o §10 reprova; não depende do motor de prova |
| **L3** | **Implantação + equipamentos** | a implantação já tem o conteúdo certo e só precisa de composição; herda os valores da L2; equipamentos entra como bloco, não como rota |
| **L4** | **Produto** | reutiliza o motor de prova da L1 sem o reinventar |
| **L5** | **Confiança + piloto** | trabalho de verificação de facto, não de composição; o piloto depende de decisão do Matheus e pode ficar parcial |
| **L6** | **Demo** | conversão; depende da decisão sobre privacidade e consentimento |
| **L7** | **FAQ** | último de propósito: absorve as objecções que as seis páginas anteriores levantam |
| **L8** | **§6.8 transversal** | metadata por página, canonical, hreflang, sitemap, robots, OG, favicon — só depois de as páginas existirem, senão descreve-se o que ainda vai mudar |

Depois de cada lote, e não no fim: `pnpm verificar`, `playwright test
inspeccao/marketing.spec.ts`, e as quatro guardas da secção 1.3. O §1.4 diz que
um frontend mais bonito com comportamento perdido é reprovação, e a base contra a
qual isso se mede está no `00_STATUS.md`.

---

## 5. O que não bate certo — no enunciado, não no produto

O `03_DIRECAO_DE_MARCA.md` já apanhou três caminhos de marca que o §1.3 manda ler
e que não existem. O plano não é infalível. Estas cinco são novas.

### D-1 · «Coral é o CTA principal» colide com a tabela de contraste do próprio manual

O §4.2 diz `brand.accent #F5664D` → «CTA principal». O manual (p. 16) calcula:
**branco sobre coral 3,05:1** e **coral sobre areia 2,77:1**, ambos marcados «não
usar em texto comum». Só **verde sobre coral (4,71:1)** passa.

O próprio §4.2 já resolve isto na linha seguinte — «use texto verde-escuro sobre
coral; não presuma branco acessível» — e o §10 reprova o contrário. **Não é uma
contradição, é uma armadilha:** quem ler só a tabela de tokens escreve um botão
coral com texto branco e passa o `bo-botao--primario` a 3,05:1. Fica escrito
aqui: **botão coral leva rótulo `#102E35`.** O produto já tem a versão prudente
disto — `--bo-acento-sinal: #D85A44` existe precisamente porque o coral da marca
não chega a 3:1 como sinal.

### D-2 · O §6.6 manda usar linguagem que a `PRECIFICACAO.md` não tem

O §6.6 lista nove afirmações sobre equipamento (mini-PC para TV, terminal, gaveta,
leitor, homologação) e fecha com *«use a linguagem vigente em
`PRECIFICACAO.md`»*. **A `PRECIFICACAO.md` não diz uma palavra sobre hardware**,
tirando «kiosk e conectores de marketplaces não têm preço fechado nesta versão».
E a `DECISOES.md` marca o D16 — preço, quotas, fiscal, pagamento, DNS **e
hardware** — como *pendente externo*.

Consequência: a única fonte para a secção de equipamentos é o próprio §6.6.
Escrevo-a **na forma condicional em que ele a escreve** («pode precisar de»,
«sujeito a homologação»), nunca como kit fechado — que é o que ele próprio
proíbe. E fica pendente saber se essa lista é política assumida ou rascunho.

### D-3 · O hero EN aprovado no §6.2 não é o que está no produto

| | §6.2 | `en.json` |
| --- | --- | --- |
| ES | Todo tu restaurante. Un solo ritmo. | igual ✓ |
| PT | Todo o seu restaurante. Um só ritmo. | igual ✓ |
| EN | **Your restaurant. One rhythm.** | **Your whole restaurant. One rhythm.** |

Uma palavra. Não mudo a mensagem comercial por conta própria: o §6.2 chama-lhe
«conteúdo-base aprovado» e é o documento mais recente, o que me faz recomendar
alinhar o código ao §6.2 — mas a decisão é do Matheus e vai como pendência.

### D-4 · O ritmo de 80–128 px do §4.4 não cabe na escala do manual

O §4.4 pede «respiro vertical normalmente 80–128 px no desktop» e uma escala que
inclui 80, 96 e 128. **A escala do manual (p. 18) acaba nos 64**, e o produto
implementa-a exactamente assim (`--bo-espaco-gigante: 64px`). O meu mandato é não
mexer nos tokens.

**Não há conflito na prática, e a solução não precisa de token novo:** o
`.bo-mkt__seccao` usa hoje `padding: var(--bo-espaco-xl) 0`, que são 24 px em
cima e em baixo — 48 px entre secções, abaixo dos dois documentos. Com
`--bo-espaco-gigante`, dois paddings adjacentes somam **128 px entre secções** e
64 nas extremidades, que aterra dentro do intervalo do §4.4 usando só a escala do
manual. É a diferença entre a página parecer uma tabela de documentação — que é o
que o §4.4 proíbe pelo nome — e ter ritmo.

### D-5 · O §6.4 pede dados «claramente artificiais» e o dataset não é isso

O motor de prova vai fotografar o produto a correr. O dataset determinístico que
existe (`packages/db/prisma/fixtures.ts` + `semente-inspeccao.ts`) tem duas
propriedades incompatíveis com uma captura comercial:

1. os nomes de itens levam o prefixo `insp-`, que numa captura de marketing lê-se
   como produto partido;
2. o inquilino chama-se **«Marina Bistró»** — é ficção, mas não se anuncia como
   tal, e o §6.4 pede dados «claramente artificiais e que nunca representem
   cliente real sem autorização».

Precisa de um dataset de demonstração próprio, sem prefixo e com um nome que se
leia como demonstração. É trabalho meu; o nome a usar roça a copy pública e vai
como pendência de baixo custo.

---

## 6. O que este documento não mediu

- **Nada em 360, 390, 768 e 1280.** A evidência existente é 1440 em es-ES. O §2.1
  pede seis viewports e três idiomas com conteúdo longo, e isso é trabalho de
  navegador que o lote L1 traz consigo.
- **PT e EN por olhar.** As chaves existem nos três catálogos e a
  `validar-tres-linguas.sh` prova que nenhuma falta. Prova chaves, não
  composição: uma tradução 30–50% mais longa parte layouts, e isso ainda não foi
  visto.
- **`/demo/thanks` e `/404`** foram lidas no código, não medidas no navegador.
- **A aparência.** Não digo aqui, e não posso dizer, que alguma coisa está bonita
  ou aprovada.

---

**Estado:** `RV100 EM RECONSTRUÇÃO`. Este lote é groundwork da secção 6; nenhuma
página comercial foi alterada. As pendências estão em `11_OPEN_FINDINGS.md`.
