# RV100 · changelog visual

> O §11.1 fecha com «não regrave baselines apenas para ficar verde. **Toda
> alteração intencional precisa aparecer no changelog visual**». Este é esse
> ficheiro. Cada entrada traz o valor **antes**, o valor **depois** e o mínimo
> documentado ao lado — um número de depois sozinho não prova que alguma coisa
> mudou, prova que alguém mediu uma vez.
>
> **Nada aqui está aprovado.** A aprovação estética é da secção 7 e é do
> Matheus. Isto é o registo do que mudou e do que foi medido.

---

## L1a · a moldura comercial

**Alcance: dez rotas.** As oito páginas comerciais mais a `/demo/thanks`
(MKT-011) e a `/404` (MKT-012), que herdam cabeçalho e rodapé. Uma edição, dez
sítios.

**Ficheiros:** `apps/web/src/componentes/Marketing.tsx`,
`apps/web/src/componentes/MenuMkt.tsx` (novo),
`apps/web/app/[idioma]/demo/thanks/page.tsx`,
`packages/ui/src/estilos.css`, `packages/i18n/src/mensagens/{es-ES,pt-BR,en}.json`.

### O instrumento, e porque não é o `marketing.spec.ts`

`inspeccao/rv100-moldura.spec.ts`, corrido por
`scripts/provar-moldura-mkt.sh <antes|depois>`. É da mesma família da
`rv100-baseline.spec.ts` do §2 — Playwright, `getBoundingClientRect`, JSON em
`evidence/` — porque comparar um número medido com um bocado de CSS lido não é
comparar nada.

O que ele acrescenta ao baseline: **cinco larguras** (360, 390, 768, 1280, 1440)
em vez de uma, **dez rotas** em vez de oito, e o estado que **só existe depois de
alguém carregar** no menu. Evidência em `evidence/moldura/`.

**As duas fases foram tiradas com o MESMO ficheiro de instrumento.** A do «antes»
foi repetida depois de o instrumento mudar, com a fonte revertida em disco para o
estado de `c3a3bac` — não se comparam dois medidores.

### ① A assinatura

| | antes | depois | o que o §4.1 pede |
| --- | ---: | ---: | --- |
| largura | **81,5 px** | **145,5 px** | ≥ 120; alvo 144–168 |
| altura | 28 px | 50 px | — |

Medido no DOM nas 5 larguras × 10 rotas: **um único par, 145,5 × 50**, sem
variação. `Wordmark({ altura: 50 })`; a largura sai da proporção do ficheiro
(2137/736), não de um número escrito à mão.

> **Nota ao enunciado do lote:** o intervalo 144–168 é de **largura**, não de
> altura — o §4.1 e o RV100-001 dizem-no assim. Quem me passou o trabalho
> escreveu «144–168 px de altura»; um logótipo de 144 px de altura teria 418 de
> largura. Segui o documento.

### ② A marca liga ao início

| | antes | depois |
| --- | --- | --- |
| `<a href>` à volta | **não existe** | `/{idioma}` |
| nome acessível | — (só o `alt="BossaOS"` da imagem) | «BossaOS, ir al inicio» / «ir para o início» / «go to the home page» |

O nome diz o **destino**. Um `aria-label` a dizer «logo» descreve a imagem e não
a ligação: quem ouve fica a saber o que aquilo é sem saber o que faz.

### ③ A navegação

| | antes | depois (≥1024) | o que se pede |
| --- | ---: | ---: | --- |
| `<a>` irmãos em cápsula | **7** | **0** | §4.5: `999px` é para chips; «navegação desktop inteira em pílulas equivalentes» reprova |
| agrupamentos visíveis | **7** | **5** = 4 + o CTA | §6.1: ≤ 4 agrupamentos, CTA à parte |
| linhas ocupadas a 1440 | **2** | **1** | — |
| linhas ocupadas a 360 | **7** | 0 (na gaveta) | — |

Producto · Planes · Implantación · **Recursos** (grupo com Piloto, Confianza,
Preguntas) · **CTA**. O instrumento separa o CTA dos agrupamentos sozinho: o
campo `comFundoProprio` devolve `['Pedir una demo']` e mais nada.

Estado activo: peso **e** traço inferior em `--bo-acento-sinal` (3,50:1 sobre a
areia) — dois sinais e não só a cor, que é a regra do E02. Sem cápsulas.

### ④ Selector de idioma · ⑤ entrada na conta

| | antes | depois |
| --- | ---: | ---: |
| ligações para outro idioma na moldura | **0** | **4** (2 no cabeçalho, 2 no rodapé) |
| ligações para `/auth/login` | **0** | **2** (cabeçalho e rodapé) |

Os idiomas mantêm a rota: `/{lingua}{caminho}`. A `/demo/thanks` passa o caminho
à mão (`sufixo`) porque ali o `actual` é `/demo` — sem isso, trocar de língua no
ecrã de obrigado devolvia o visitante ao formulário.

### ⑥ Menu de telemóvel

| | antes | depois |
| --- | ---: | ---: |
| controlo de abrir/fechar | **nenhum** | 1 botão, 44 × 44, visível < 1024 px |
| nome acessível | — | «Abrir el menú de navegación» / «Cerrar» ao fechar |

Botão com `aria-expanded` e `aria-controls`; Escape fecha **e devolve o foco ao
botão**; carregar fora fecha. O painel entra no fluxo e empurra o conteúdo, em
vez de flutuar por cima — rola com a página, sem tranca no corpo.

**Corte a 1024 px e não a 768.** É o mesmo corte da administração, e a 768 a
barra com marca, três ligações, grupo, CTA, três idiomas e entrada não cabe numa
linha em nenhuma das três línguas.

### ⑦ O rodapé

| | antes | depois |
| --- | ---: | ---: |
| ligações | **0** | **11** |
| grupos | **0** | **4** |
| conteúdo | a linha «Hecho con BossaOS» | Plataforma · Recursos · Empieza aquí · Idioma, e a assinatura por baixo |

**Só liga ao que existe.** Não há rota de privacidade, de termos, de cookies nem
conta de rede social neste repositório, e **não as inventei**: uma ligação que dá
404 é pior do que a ausência dela. O §6.3.14 diz «conforme disponibilidade real»
e ganha ao §10. A falta continua registada no RV100-011.

### ⑧ A altura do cabeçalho — um defeito que não estava registado

Não estava na lista dos seis. Apareceu porque medi as dez rotas em vez das oito,
e as duas mais curtas destoavam.

**Causa:** `.bo-publico` é uma grelha com `min-height: 100vh` e três faixas
automáticas. Numa página curta a folga do ecrã reparte-se pelas três, e o
cabeçalho engorda com ela.

| largura | alturas distintas ANTES (10 rotas) | DEPOIS |
| ---: | --- | --- |
| 360 | 60 · 64,7 · 83,4 | **83** |
| 390 | 60 · 64,7 · 83,4 | **83** |
| 768 | 60 · 79,2 · 149,5 | **83** |
| 1280 | 60 · 71,5 · 73,9 · 76,5 · 77,2 · 96,5 · 166,9 | **83** |
| 1440 | 60 · 71,5 · 73,9 · 76,5 · 77,2 · 96,5 · 166,9 | **83** |

Correcção: `.bo-publico--comercial { grid-template-rows: auto 1fr auto; }`. A
folga vai toda para o conteúdo.

> **A altura do cabeçalho comercial fica em 83 px** — 50 da assinatura mais 16 de
> área livre acima e abaixo (o §4.1 pede um quarto da altura visível: 12,5). É
> igual nas dez rotas, nas cinco larguras e nas três línguas. É contra este
> número que o herói se compõe.

### ⑨ O CTA — a cor decidiu-se com a calculadora

A primeira versão pintou-o com o coral da marca e rótulo verde-escuro, que é o
par que o §4.2 aponta. **O rótulo estava certo; o fundo não.** Números da
`razaoDeContraste()` do próprio produto:

| par | razão | limiar | |
| --- | ---: | ---: | --- |
| `--bo-acento` #F5664D sobre a areia #F7F4EC | 2,77:1 | 3 | ✗ |
| `--bo-acento-sinal` #D85A44 sobre a areia | 3,50:1 | 3 | ✓ |
| `--bo-primaria` #102E35 sobre a areia | 13,05:1 | 3 | ✓ |
| rótulo verde-escuro sobre o coral | 4,71:1 | 4,5 | ✓ |
| rótulo branco sobre o coral | 3,05:1 | 4,5 | ✗ |
| **rótulo verde-escuro sobre o `--bo-acento-sinal`** | **3,73:1** | 4,5 | **✗** |
| **rótulo branco sobre o `--bo-acento-sinal`** | **3,84:1** | 4,5 | **✗** |
| rótulo branco sobre `--bo-primaria` | 14,34:1 | 4,5 | ✓ |

Trocar o fundo pelo `--bo-acento-sinal` corrige a fronteira e **parte o rótulo**:
nenhuma cor da paleta o levanta acima de 4,5 sobre esse fundo. Só passariam preto
puro (5,47:1), que é cor fora do sistema documentado, ou um rótulo a 19 px
negrito para cair no limiar de texto grande — que é escolher o tamanho da letra
para passar o medidor.

**Fica `--bo-primaria`**, que é o tratamento de acção primária que o produto já
tem. Medido em execução nas 50 combinações: **14,34:1**, sempre. O CTA continua
«claramente prioritário» por ser o único controlo cheio da moldura.

Foi considerada e recusada a marca `decorativo:` da `acento.test.ts`: um CTA é o
elemento mais funcional da página, e chamar-lhe decoração para a guarda ficar
verde é o que o §11.1 proíbe.

> **Coral com função na superfície comercial continua por fazer — é o
> RV100-012**, um P2 que não é deste lote. O sítio dele é o herói, onde uma
> mancha grande de coral com um título por cima usa o limiar de texto grande por
> direito próprio.

---

## O que foi medido, e com que resultado

**50 combinações** (10 rotas × 5 larguras), mais **15** de três línguas na
landing. Em todas:

| propriedade | resultado |
| --- | --- |
| rolagem horizontal | 0 |
| alvos de toque < 44 px | 0 |
| elementos fora do ecrã | 0 |
| textos abaixo do limiar WCAG | 0 |
| assinatura | 145,5 × 50, sem excepção |
| altura do cabeçalho | 83, sem excepção |

**Com os menus abertos** — a gaveta a < 1024 e o grupo em todas as larguras — os
mesmos quatro contadores continuam a zero, e as **7 ligações** da família ficam
visíveis a 360 px.

Isto último não é detalhe. A `marketing.spec.ts` mede alvos e contraste **só a
360 px**, e a 360 px a gaveta está fechada: um elemento de caixa zero está fora
daquelas varreduras por construção. Sem abrir o menu, a verificação passava sem
nunca ter olhado para um único controlo novo — verde sobre população zero.

### Regressão

`inspeccao/marketing.spec.ts`: **68 casos, 68 verdes, ficheiro não tocado**
(120 linhas, `md5 acb24e76e52c564f5c2f693776ce27de`, igual ao de `c3a3bac` antes
e depois da corrida). **Nenhuma asserção foi alterada.**

Quem me passou o trabalho previu que a suite ia partir. Não partiu, e a razão é
verificável: ela ancora em marcadores de **conteúdo** (`.bo-mkt__heroi h1`,
`#t-product`, `.bo-mkt__tabela-envolve table`…) e este lote só tocou na
**moldura**. O único ponto de contacto é `.bo-publico__seccoes a`, e as sete
rotas ficaram deliberadamente dentro dessa `<nav>` — o CTA incluído — para que a
prova de alcance continuasse a medir o que media.

`pnpm verificar` verde, incluindo os **396 IDs** do atlas intactos. Guardas
verdes: `validar-classes`, `validar-tres-linguas` (2354 chaves × 3),
`validar-dados-ficticios`, `validar-precos`, `validar-coral-da-arte`,
`validar-portas-mortas`, `validar-alvos-com-casa`, `validar-movel`,
`validar-suites-com-guiao`. `acento.test.ts` verde.

---

## O que NÃO foi medido, e o que fica por dizer

- **A aparência.** Não digo, e não posso dizer, que alguma coisa está bonita ou
  aprovada. É a secção 7 e é do Matheus.
- **PT e EN só na landing.** As três línguas foram medidas nas cinco larguras,
  mas só em `/{idioma}`. As outras nove rotas em PT e EN continuam por olhar.
- **O «antes» das três línguas não existe.** A pergunta ali é «cabe?», que é um
  limiar e não um delta; mas fica dito que não há termo de comparação.
- **Sem JavaScript, a navegação principal abaixo de 1024 px não abre.** O botão
  vem no HTML e só liga depois da hidratação. O que segura o caso é o **rodapé**,
  que é servidor puro, está sempre visível e leva os dez destinos. É uma troca
  que fiz de olhos abertos — o §6.1 pede «menu com nome, foco, fechamento», e
  isso pede estado — e fica aqui para poder ser recusada.
- **Um leitor de ecrã não ouve «página actual» em `/pilot`, `/trust` e `/faq`**
  quando percorre a barra: essas ligações vivem no grupo, que nasce fechado. O
  botão do grupo fica em destaque visual e a ligação lá dentro mantém o
  `aria-current="page"` para quando abre. Sei que é meio caminho.
- **Nada de teclado real nem de leitor de ecrã.** Escape e foco estão escritos e
  o foco devolve-se ao botão; **não os medi** com um instrumento. É um NÃO MEDI,
  não um verde.
- **Não corri a suite inteira**, só a `marketing.spec.ts`, a da moldura e o
  `pnpm verificar`. As outras 27 suites de navegador ficaram por correr.
- **Não empurrei nada.** Commits em `main` e ponto; a CI continua sem correr
  desde 05/09.

## Achados que este lote toca

Ficam como estão no `11_OPEN_FINDINGS.md` — **não mexo no documento de quem
revê**, e mudar `status` seria eu a assinar a minha própria revisão. Os números
para medir estão acima:

| id | o que este lote fez |
| --- | --- |
| RV100-001 | assinatura de 81,5 → 145,5 px de largura |
| RV100-002 | 7 cápsulas → 4 agrupamentos + CTA, zero cápsulas |
| RV100-005 | rodapé de 0 → 11 ligações em 4 grupos, só rotas que existem |
| RV100-006 | selector de idioma, 0 → 4 ligações, rota mantida |
| — | entrada na conta e menu móvel: sem ID próprio, medidos na §2.1 do `05_` |
| — | altura do cabeçalho: **defeito novo**, encontrado a medir; sem ID |

Continuam intocados e abertos: **RV100-003, 004, 007 a 019.** O RV100-012 (coral
ausente) foi **decidido contra** neste lote, com os números na secção ⑨.

---

## L1b · a home (MKT-001/002/003)

**Instrumento:** `inspeccao/rv100-home.spec.ts`, corrido por
`scripts/provar-home-mkt.sh <antes|depois>`. Mede as **cinco larguras nas três
línguas**. Evidência em `evidence/home/`.

### A régua do herói teve de mudar, e não por conveniência

A régua deste lote era «o `x` onde o conteúdo do herói acaba»: **728 de 1440 em
seis das oito páginas**, e se 728 voltar não houve reconstrução. A régua está
certa. **Na home ela não media nada**, e isso é verificável:

O `rv100-baseline.spec.ts` toma o máximo `right` de **todos** os descendentes do
herói. O `.bo-mkt__chamada` é um `<p>` com `display: flex` — bloco, logo largura
toda — e por isso a home já dava **1256** antes de eu tocar em nada. É o «número
por explicar» que o `05_MARKETING_AND_CONVERSION.md` registou. **A explicação é
essa.** Um herói vazio à direita e um cheio dão o mesmo 1256.

A métrica nova (`heroFolhaAteX`) conta só **folhas com conteúdo** — sem filhos
elemento e com texto, mais as mídias. Reproduz o número da régua:

| largura | métrica nova | a métrica antiga, lado a lado |
| ---: | ---: | ---: |
| 1440 | **728** | 1256 |
| 1280 | 648 | 1176 |
| 768 | 568 | 744 |
| 390 | 366 | 366 |
| 360 | 336 | 336 |

As duas ficam gravadas em cada corrida, para se poder ver que discordam em vez
de eu afirmar que sim.

### O herói NÃO mudou, e é uma decisão declarada

| | antes | depois |
| --- | ---: | ---: |
| `heroFolhaAteX` a 1440 | 728 | **728** |
| conteúdo depois do meio | não | **não** |
| mídia no herói | 0 | **0** |

**728 voltou.** Pela régua que me foi dada, isto não é reconstrução do herói — e
é exactamente o que eu quero que fique escrito, porque a causa é o motor de
prova, que **não está feito**. Reservar aqui metade da largura para mídia que não
existe era construir de propósito «metade do herói vazia por falta de mídia»
(§10). Fica de uma coluna até haver telas.

### O resto da página, esse mudou

| | antes | depois | o que se pede |
| --- | ---: | ---: | --- |
| secções | **3** | **11** | 14 no §6.3 |
| altura rolável a 1440 | 1316 | **5511** | — |
| respiro entre secções, desktop | **48** | **88–128** | 80–128 (§4.4) |
| respiro entre secções, móvel | **48** | **56–64** | 56–80 (§4.4) |
| preços na página | **0** | **12 valores da fonte** | §6.5 |

Blocos presentes: 1 herói · 2 problema · 3 uma base (MKT-002) · 6 papéis ·
7 planos (MKT-003) · 8 equipamentos · 9 implantação · 10 confiança · 11 piloto ·
12 FAQ · 13 CTA final. Mais o 14, o rodapé, feito na L1a. **Onze mais o rodapé.**

**Faltam o 4 (produto em movimento) e o 5 (módulos com telas reais)** — os dois
que são mídia. Escrevê-los como texto acrescentava «página comercial que apenas
enumera títulos e parágrafos sem prova do produto», que o §10 reprova pelo nome.

### Os preços vêm da fonte, e o desconto vê-se

`precoDoPlano()` lê a `PRECIFICACAO.json`. Zero números escritos à mão — a
`validar-precos.sh` reprovaria. Servido e verificado no build:

| plano | mês | ano | equivalente | implantação |
| --- | ---: | ---: | ---: | ---: |
| Starter | 19,00 € | 190,00 € | 15,83 € | 99,00 € · autogerida 0,00 € |
| Restaurant | 79,00 € | 790,00 € | 65,83 € | 299,00 € |
| Pro | 149,00 € | 1490,00 € | 124,17 € | 499,00 € |

O equivalente aparece **nomeado como equivalente**, que é o que o §6.5 exige para
ninguém o confundir com a cobrança. E a regra do ano deixou de ser uma divisão
que o leitor faz de cabeça: *«El año cuesta diez mensualidades: dos no se
pagan.»* O `10` sai de `MENSALIDADES_NUM_ANO`, não de uma constante minha.

### Dois achados que não estavam na lista

**① O `?section=` não isola nada.** O código diz, em comentário, que esconde tudo
o resto e que é assim que o MKT-002 e o MKT-003 se medem um a um. Medido:

```
/es-ES                  e703360c9ffb6d5947b32a13be389b7d
/es-ES?section=product  e703360c9ffb6d5947b32a13be389b7d
/es-ES?section=plans    e703360c9ffb6d5947b32a13be389b7d
```

HTML **byte a byte igual**. Causa: `dynamic = 'force-static'` — numa página
forçada a estática o Next entrega `searchParams` vazio na pré-renderização.

**Consequência: MKT-001, 002 e 003 não são três medições, são a mesma página
medida três vezes** — o defeito que o comentário da `marketing.spec.ts` diz que
o mecanismo existe para impedir. As duas saídas custam mais do que o defeito
(tirar o `force-static` torna a landing dinâmica a cada pedido; dar endereço
próprio aos blocos parte os 396 IDs), por isso **não decidi sozinho**: corrigi o
comentário que mentia, o instrumento grava o comportamento real em cada corrida,
e a escolha fica para quem revê.

**② A FAQ afirmava uma coisa que o código não faz.** O `faq4` dizia, nas três
línguas, «a sala continua a trabalhar e sincroniza quando a ligação volta».
Medido contra o código, é falso nas duas metades:

- **não continua a trabalhar** — o service worker recusa guardar telas com dados
  de inquilino (`sw.js/route.ts:20-32`); recarregar ou navegar sem rede dá a
  casca «Estamos sin conexión», e as restantes telas de Staff são formulários
  clássicos que offline perdem o que foi escrito;
- **não sincroniza sozinha** — o ouvinte do evento `online` só troca o rótulo
  (`PainelDaFila.tsx:83`); os únicos gatilhos de envio são compor um item e
  carregar no botão «Reintentar ahora». A própria prova diz por escrito «nada
  sincroniza sozinho ao voltar a ligação» (`staff.spec.ts:80-82`).

Corrigido nas três línguas para o que a evidência sustenta: o que está escrito
não se perde, fica no aparelho, nunca se diz «enviado» sobre o que está no
telemóvel, e ao voltar a ligação **um toque** envia — perguntando ao servidor
antes de repetir. É por isso que o bloco 10 tem **três** pilares e não quatro: o
quarto do §6.3.10 é «operação degradada realmente implementada», e mover uma
afirmação de sítio não é verificá-la.

### O motor de prova: NÃO BLOQUEADO, e NÃO FEITO

Distinção que interessa. **Provei que capturar funciona**: sete telas reais do
produto — catálogo, sala, KDS, Staff, carta, TPV, relatórios — a HTTP 200, com
sessão real e viewports fixos.

**O que falta é o conjunto de dados.** As capturas do arnês não servem para
marketing, e isso confirma o RV100-017 com imagem em vez de leitura: prefixo
`insp-` em mesas, zonas, estações e pratos («insp-07 · insp-Terraza»,
«insp-Plato de cocina 1»); `painel@inspeccao.example` e
`inspeccao@exemplo.example` à vista; «Alérgenos sin declarar: 94»; dois cartões a
dizer «Aún no medido». A carta pública é a excepção — nomes e preços reais, sem
prefixo —, mas mostra «Horario sin configurar».

O caminho está levantado e não precisa de ser redescoberto: uma
`semente-demonstracao.ts` com organização, marca e unidade próprias (UUIDs
novos), subscrição `PRO`, catálogo, carta publicada com `reservar_endereco_publico`,
zona, mesas, sessão, pedido com linhas, estações e tarefas `POR_INICIAR`, mais
pertença `OWNER` **sem `brand_id`** — com `brand_id` o dono leva 404. Prefixo
próprio (`demo-`), fora de `@inspeccao.example` e sem reutilizar as organizações
de `fixtures.ts`, para o teardown do arnês não lhe tocar e ela não sujar as
medições. Credencial de migração.

**Não a construí.** Não cabia neste lote com verificação a sério, e uma semeadura
a meio dá capturas partidas — pior do que nenhuma.

### Regressão

`marketing.spec.ts`: **68 casos, 68 verdes, ficheiro não tocado, nenhuma asserção
alterada**, com a home a passar de 3 para 11 secções. `pnpm verificar` verde,
**396 IDs intactos**. Guardas verdes: preços, três línguas, dados fictícios,
coral da arte, classes, suites com guião. A moldura da L1a remedida: **83 px de
cabeçalho, sem excepção**.

**Zero anomalias em 15 combinações** (3 línguas × 5 larguras): sem rolagem
horizontal, sem alvos abaixo de 44 px, sem elementos fora do ecrã, sem textos
abaixo do limiar WCAG.

### O que NÃO foi medido neste lote

- **A aparência.** Continua a ser da secção 7 e do Matheus.
- **As outras sete páginas comerciais** não foram tocadas nem remedidas.
- **Os metadados** ficam para o §6.8, como o plano manda.
- **A afirmação corrigida do `faq4`** foi verificada por leitura de código e
  pelas provas existentes — **não corri eu uma prova nova de rede cortada**.
- **Nada de teclado nem leitor de ecrã** nos blocos novos.

---

## L1c · a página de planos (MKT-005)

**Instrumento:** `inspeccao/rv100-planos.spec.ts`, corrido por
`scripts/provar-planos-mkt.sh <antes|depois>`. Cinco larguras × três línguas.
Evidência em `evidence/planos/`.

### A restrição que decidia o lote: não ser a secção da home outra vez

Medido, e não afirmado. Extraí as chaves de i18n que cada ficheiro usa —
directas (`k.x`) e indirectas (as das constantes de topo) — e cruzei-as:

| | chaves | partilhadas |
| --- | ---: | ---: |
| `page.tsx` (home) | 93 | — |
| `plans/page.tsx` | 62 | **11** |

E as onze são todas **unidade ou nome próprio**, nenhuma é conteúdo:

`planoStarter` · `planoRestaurant` · `planoPro` (nomes próprios) ·
`precoMes` · `precoAno` · `precoEquivalente` · `precoImposto` ·
`precoAOrcar` · `precoImplantacao` · `precoImplantacaoSozinho` (unidades) ·
`pedirDemo` (rótulo de acção).

São partilhadas **de propósito**: «al mes» escrito em duas chaves diferentes é
como uma tabela de preços se dessincroniza de si própria. As **51 chaves só
desta página** são o que a secção da home não dá.

### O que mudou

| | antes | depois |
| --- | ---: | ---: |
| secções | **2** | **7** |
| famílias na comparação | **0** | **3** |
| linhas de capacidade | **3** | **8** |
| valores monetários | **0** | **10 por vista** |
| blocos com preço / com IVA ao lado | **0 / 0** | **6 / 6** |
| altura rolável a 1440 | 1073 | **3915** |

Os oito requisitos do §6.5, um a um: cartões de decisão ✓ · recomendação
justificada ✓ · comparação completa e responsiva ✓ · as três famílias ✓ · CTA
coerente com disponibilidade ✓ · implantação separada ✓ · adicionais e
dependências ✓ · FAQ de cobrança e mudança de plano ✓.

### A comparação não está escrita — é derivada

As linhas saem de `capacidadesDoPlano()`, novo em `planos.ts`, que faz a união
dos `promete` da `DESTAQUES`. Isso importa porque a `provas/planos.test.ts` já
compara a `DESTAQUES` com o **catálogo real na base** e reprova qualquer plano
que prometa o que não concede — com controlo negativo para a guarda não passar
por uma tabela vazia. Uma tabela escrita à mão na landing seria uma segunda
verdade a envelhecer sozinha; derivada, fica coberta por essa prova sem precisar
de guarda própria.

Duas fontes independentes concordam com o resultado: o `cores_publicas` da
`PRECIFICACAO.json` (Starter `fixas_bossaos`, os outros `personalizaveis`) bate
certo com a linha «colores propios» sair a não/sim/sim.

### Dois valores que estavam na fonte e ninguém lia

`precoDoPlano()` passou a devolver **`horasDeImplantacao`** (2 / 4 / 8), e o
domínio passou a exportar **`COMISSAO_DIRECTOS`**. Os dois estavam na
`PRECIFICACAO.json` e iam ser escritos à mão nesta página.

O zero da comissão é o caso que interessa: **zero é um valor comercial, não uma
ausência.** «Sem comissão» escrito à mão continua a prometer zero no dia em que
deixar de o ser. Renderiza-se pela fonte, e sai `0 %` em espanhol e `0%` em
inglês porque o `formatarNumero` passou a aceitar opções de local — uma
percentagem não se escreve juntando `%` a um número.

### O CTA coerente com disponibilidade: não há botão de contratar

Verifiquei antes de escrever: **não existe registo público, nem checkout, nem
pagamento** neste repositório. A entrada faz-se por convite
(`/auth/invite/[token]`) e a única porta pública é a demo. Um botão «Contratar»
seria uma porta morta — a classe de mentira que a `validar-portas-mortas.sh`
existe para apanhar.

O padrão é o da tela do tema, como me foi indicado: **não se esconde o caminho**,
muda-se-lhe o peso. Demo em primário, entrar em secundário, e a página **diz por
escrito** que não há botão de contratar e porquê. Um ecrã nunca é o mecanismo.

### A tabela, medida nos dois sentidos

A 360 px: a **página não rola** (transbordo 0) **e** a caixa rola por dentro
(312 px de caixa para 544 de tabela). As duas, porque só a primeira passaria
também com uma tabela esmagada ou vazia. Igual antes e depois — a propriedade
sobreviveu à passagem de 3 para 8 linhas e de 3 para 4 colunas.

### O que o meu próprio instrumento me apanhou

A primeira passagem deu **6 blocos com preço e só 3 com a nota de IVA ao lado**.
Os três em falta eram os cartões de implantação: mostravam euros sem dizer «IVA
aparte, por establecimiento». O §6.5 diz «todos os valores», e a implantação é
um deles. Corrigido, e a segunda passagem deu **6/6**.

Registo-o porque é a diferença entre uma nota solitária no fim da página e a
nota **junto de cada preço** — e porque a medição foi feita para apanhar
exactamente isto, em vez de eu contar ocorrências globais e chamar-lhe verde.

### Regressão

`marketing.spec.ts`: **68 verdes, ficheiro não tocado, nenhuma asserção
alterada** — incluindo o caso que exige que a tabela role dentro da caixa a
360 px. `pnpm verificar` verde, **396 IDs intactos**. Guardas verdes: preços,
três línguas, dados fictícios, portas mortas, coral da arte, classes, suites com
guião. **Zero anomalias em 15 combinações** de língua × largura.

### O que NÃO foi medido

- **A aparência.** Secção 7, e do Matheus.
- **A `/product`** continua a repetir os três cartões da home chave por chave.
  Não lhe toquei — é outro lote, e fica dito que o defeito continua lá.
- **A FAQ de cobrança não foi verificada contra o produto.** As respostas sobre
  subir e descer de plano descrevem o que a `previaDeDescida` e o ecrã de
  mudança fazem, mas **não corri uma prova** que o confirme ponto por ponto.
  É a mesma disciplina do quarto pilar da confiança: escrevi o que o produto
  parece fazer, e digo que não o medi.
- **Nada de teclado nem leitor de ecrã** na tabela nova.

---

## L1d · o motor de prova (semente de demonstração + capturas)

**O desbloqueio que a L1b declarou.** Ficheiros:
`packages/db/prisma/semente-demonstracao.ts`,
`packages/db/prisma/demonstracao-comum.ts`,
`scripts/capturar-demonstracao.mjs`, `scripts/provar-demonstracao.sh`.
Evidência em `evidence/demonstracao/`.

### O inquilino, e porque não é o cenário do arnês com outro nome

«Bossa Demo», IDs próprios (`d0…`), zero prefixos. Seis pratos com preço, quatro
mesas, uma sessão aberta, um pedido (A128) com três linhas **todas aceites**,
duas estações e três tarefas, carta publicada em `/r/bossa-demo`.

O cenário do arnês existe para medir casos difíceis — uma linha rejeitada por
esgotado, outra por divergência de preço, um prato sem encaminhamento, um limite
visível baixo para o «em espera» encher. Numa fotografia do produto, cada um
desses lê-se como **produto avariado**. Este cenário é o caminho feliz, curado.

**O nome carrega o do próprio produto**, e é a única forma de ser plausível numa
captura e impossível de confundir com o restaurante de alguém: qualquer nome
espanhol bonito que eu inventasse provavelmente existe algures. E não há um único
endereço de correio inventado — onde o produto mostra quem fez uma coisa, fica um
**nome** («Marta (sala)»). A conta que entra usa `.invalid`, o TLD que a RFC 2606
reserva exactamente para isto: não resolve, não é de ninguém, e não é `example`.

### As quatro composições, e porque existem

| composição | largura | porquê |
| --- | ---: | --- |
| `kds-cozinha` | 1280 | a superfície que o §6.4 nomeia, e a de menos folga |
| `sala-servico` | 1440 | o outro lado da mesma acção: a mesa de onde saiu o A128 |
| `catalogo` | 1440 | a base única do §6.3.3, de onde a carta e a cozinha leem |
| `carta-movel` | 390 | o que o cliente vê ao apontar para o código, sem sessão |

Uma acção e o seu resultado, como o §6.4 pede: **o mesmo pedido A128** aparece
na sala como sessão aberta e na cozinha como as tarefas dele.

### O controlo que torna a captura prova, e não fotografia

O capturador reprova sozinho se o texto renderizado contiver `insp-`, um domínio
de fantasia, «Aún no medido» ou «sin configurar». **Apanhou-me duas vezes**, e
as duas correcções são o valor deste lote:

1. **`carta-movel` dizia «Horario sin configurar».** A semente não criava
   horário. Corrigido — e o horário levou a segunda correcção consigo.
2. **`catalogo` dizia «Aún no medido», duas vezes.** Não era coisa que a semente
   pudesse resolver: é o painel do catálogo a ser **honesto** sobre indicadores
   que o produto ainda não construiu. Honesto no produto, péssimo numa peça
   comercial — anuncia o que não existe. A composição mudou de rota, para a
   lista de produtos.

Sem o controlo, as duas iam para a landing.

### O horário aberto sempre, e o que isso custa

A primeira versão semeou uma semana plausível: almoço, jantar, segunda de
descanso. A captura saiu com **«Cerrado ahora»** e um aviso a ocupar o terço de
cima — porque correu às cinco da manhã.

O defeito não era o horário, era a dependência: **o §6.4 exige capturas
determinísticas**, e uma composição cujo conteúdo muda com a hora a que o guião
corre não é determinística. Passou a aberto todos os dias.

**O que custa, dito por extenso:** nenhum restaurante abre vinte e quatro horas,
e quem for ver os dados vê um horário implausível. Aceito a troca porque o
horário não aparece na composição — o que aparece é a carta.

### As quatro verificações, e nenhuma por fé

`scripts/provar-demonstracao.sh`:

| | como se mede | resultado |
| --- | --- | --- |
| determinismo | semeia **duas vezes** e compara a impressão do cenário | `b06bec96…` nas duas |
| — controlo negativo | muda um prato à mão: a impressão **tem** de mudar | muda |
| capturas limpas | o controlo de sujidade nas quatro | 4/4 |
| o KDS existe | ficheiro presente e não vazio | 89 485 bytes |
| a limpeza devolve | conta o que **não** é da demonstração, à volta da limpeza | igual |
| — e o par | e a demonstração desapareceu mesmo | org a 0 |

A impressão hasheia o que a captura MOSTRA — nomes, preços, códigos de mesa,
estados, quantidades — e **exclui carimbos de tempo**, que mudam por construção.
Um detector que acusa sempre não distingue nada. **Consequência dita:** os dados
são determinísticos; os **pixels** não são exactamente, porque «Hace 0 min» e a
hora de abertura da mesa são carimbos.

### Três defeitos meus que a medição apanhou

1. **A contagem da base dava vermelho com a limpeza certa.** Eu contava a base no
   início e no fim do guião, com um build e uma passagem de navegador pelo meio —
   e o arnês de inspecção correu noutro processo entretanto e levou o cenário
   *dele*, que entrava nas mesmas contagens. **Media actividade concorrente e
   chamava-lhe defeito meu.** Agora conta-se o que não é da demonstração numa
   janela apertada à volta da limpeza.
2. **O guião acusava «a limpeza deixou linhas para trás» com a limpeza
   perfeita.** Era `node … | grep -v ruído || erro`: o estado de uma pipeline é o
   do último comando, e um `grep` que não encontra nada devolve 1. Um guarda que
   reprova quando tudo corre bem ensina a ignorá-lo.
3. **403 ao inscrever a conta.** O `BETTER_AUTH_URL` do `.env` aponta ao 3000 e o
   guião corre noutra porta; a biblioteca recusa a origem e não diz uma palavra
   sobre portas. Está escrito no `playwright.config.ts` há dias — **e apanhou-me
   na mesma, no mesmo sítio e pela mesma razão.**

E uma armadilha do produto que a semeadura respeita desde o início, porque estava
mapeada na L1b: o papel do dono vai **sem `brand_id`**. Com marca, o dono leva
404 nas rotas da organização — um 404 que se parece com «a rota não existe».

### O que este lote NÃO fez

- **Não pôs nenhuma captura na landing.** O motor produz as composições; ligá-las
  ao herói da MKT-001 e à `/product` é o lote seguinte. Não quis fechar as duas
  coisas na mesma passagem sem medir a segunda.
- **Não gerou versões responsivas nem formatos optimizados.** O §6.4 pede
  «formatos e tamanhos optimizados sem degradar leitura»: são PNG directos, 384 KB
  ao todo. Optimizar sem medir o que se perde é adivinhar.
- **Nada de tablet.** O §6.4 nomeia quatro superfícies e há três larguras
  (390, 1280, 1440). Falta a de tablet, e digo-o em vez de chamar 1280 de tablet.
- **Não medi a aparência.** Secção 7, e é do Matheus.

---

## L1e · ligar as capturas (herói da MKT-001 e a `/product`)

### A régua dos 728, com a cláusula de saída já caída

| largura | antes | depois | conteúdo depois do meio |
| ---: | ---: | ---: | --- |
| 1440 | **728** | **1256** | sim |
| 1280 | 648 | **1176** | sim |
| 768 | 568 | **744** | — (empilha) |
| 390 | 366 | 366 | — (empilha) |
| 360 | 336 | 336 | — (empilha) |

**1256 é o bordo direito do contentor** a 1440 (184 + 1072): o conteúdo do herói
deixou de acabar a meio e passa a ir até ao fim. `ocupaDireita` passa a verdadeiro
a 1280 e 1440, com o meio do contentor em 720. Mídia no herói: **0 → 2**. Igual
nas **três línguas**. Zero anomalias em 15 combinações.

Abaixo de 1024 empilha, e por isso o número é o do bordo do contentor em vez do
meio — comprimir duas capturas lado a lado num telemóvel dá as miniaturas que o
§6.4 proíbe.

### As duas capturas do herói não são decorativas

São a **mesma comanda A128**: a sala onde foi aberta e a cozinha onde apareceu. É
a «acção e o seu resultado» que o §6.4 pede, já resolvida pelo cenário da L1d — e
a legenda di-lo por palavras, em vez de deixar a ligação por adivinhar.

### A `/product` deixou de ser a home

Medido com o mesmo cruzamento de chaves que inventei para os planos:

| | antes | depois |
| --- | ---: | ---: |
| chaves da `/product` | 11 | **21** |
| partilhadas com a home | **10** | **6** |
| só suas | 1 | **13** |

E as seis partilhadas não são conteúdo repetido: `altSala` e `altKds` descrevem
**as mesmas duas imagens**, que aparecem nos dois sítios; `heroiLegenda` é a
legenda que as liga; `demoAviso` é o aviso de demonstração, deliberadamente
idêntico em toda a parte; `pedirDemo` e `verPlanos` são rótulos de acção.

O fecho da página é **próprio** e não o da landing: quem chega ali já viu as
telas, e o convite muda com isso — «viste um restaurante inventado, a demo é com
o teu». Partilhar o fecho era repetir o momento errado.

### O alt diz o que se vê, e o carregamento é responsivo

Cinco composições, cada uma com alt contextual nos três catálogos — não «captura
do KDS», mas *«a mesma comanda A128 na pantalla de cocina: dos croquetas en
preparación y otros dos platos por empezar, con el tiempo contado desde el
servidor»*.

Medido no HTML servido: **8 a 11 larguras de `srcSet` por composição**, a
primeira do herói `priority` (ansiosa, é ela que decide o LCP) e as restantes
`lazy`. O `import` estático dá largura e altura reais, e com elas a reserva de
espaço — sem isso a landing salta enquanto carrega.

O `placeholder="blur"` é o **marcador de carregamento**, não um efeito: some
quando a imagem chega. Nenhuma composição leva blur, moldura de aparelho ou
perspectiva no estado final — o §6.4 proíbe esconder interface dentro de
efeitos, e uma composição que precise disso corrige-se em vez de se disfarçar.

### A legibilidade, medida — e uma decisão que mudou por causa da medição

O §6.4 exige «produto legível, não uma miniatura indecifrável». Medi a largura
renderizada contra a largura **a que a tela foi capturada**:

| composição | onde | escala |
| --- | --- | ---: |
| sala | `/product` | **74%** |
| KDS | `/product` | **84%** |
| catálogo | `/product` | **74%** |
| tablet | `/product` | **77%** |
| carta | `/product` | **100%** |
| sala | herói | **41%** |
| KDS | herói | **38%** |

**A primeira versão da `/product` punha a sala e o KDS lado a lado** acima de
900 px, que é o desenho óbvio para «isto e aquilo». A medição deu **37%** a cada
uma: os títulos aguentam, o corpo — onde estão o nome do prato e o número da
comanda — não. Empilhadas sobem para 74% e 84%. Perde-se a comparação lado a
lado, ganha-se poder ler o que se compara, e a legenda liga-as na mesma.

**No herói ficam a 41% e 38%, e não escondo o número.** Num herói de duas colunas
a 1440 px qualquer captura de ecrã inteiro cai nessa ordem de grandeza. Ali os
títulos e a forma do produto lêem-se; o corpo não. Subir isso exige **recortar**
a captura para uma região, ou capturar num viewport mais estreito — as duas são
decisões de composição, e a composição é da secção 7. Fica medido, não resolvido.

### O achado do KDS, confirmado no DOM e corrigido

A etiqueta de estado encostava ao nome do prato. **Medido nos três bilhetes:
folga de `0 px`** entre o bordo direito do nome e o esquerdo da etiqueta, na
mesma linha.

E **não era truncagem**, que era a primeira suspeita: `text-overflow: clip`,
`white-space: normal`, `line-clamp: none`. Não há regra de corte nenhuma no KDS.

A causa é estrutural: a regra que dá `display: flex` e `gap` a essa linha é
`.bo-publico__produto > a`, e o bilhete do KDS **não tem `<a>`** — põe os dois
`<span>` directamente no `<li>`. Resultado: `display: list-item`, `gap` inerte, e
dois elementos `inline` encostados. A carta pública tem o `<a>` e por isso nunca
mostrou o defeito.

Corrigido com margem e não com `flex`: mudar o `<li>` para caixa flexível
reordenava a descrição e as acções que vivem no mesmo bilhete, e isso é uma
mudança de composição numa superfície que não é deste lote. **Medido depois:
0 px → 12 px, mesma linha.** As capturas foram refeitas com a correcção.

Toquei numa superfície fora do lote e digo porquê: a imagem do KDS vai para a
landing, e um defeito visível na peça comercial passa a ser meu.

### A largura de tablet, que eu tinha declarado em falta

Fechada: **`sala-tablet-834`**, 834 × 1112, que é o retrato do iPad — o aparelho
que anda na mão de quem serve. São agora **cinco** composições e quatro larguras
(390, 834, 1280, 1440). Não chamei 1280 de tablet.

### Onde as composições passaram a viver

Saíram do `evidence/` para **`apps/web/src/demonstracao/`**, que é de onde o
`next/image` as importa. Deixaram de ser só prova e passaram a ser peças que a
aplicação embarca; tê-las nos dois sítios era ter duas cópias de 380 KB e a
certeza de que uma envelhecia. O `evidence/` guarda o **manifesto**
(`composicoes.json`), que é o que diz o que cada uma prova e que passou o
controlo de sujidade.

### Regressão

`marketing.spec.ts`: **68 verdes, ficheiro não tocado, nenhuma asserção
alterada**. `pnpm verificar` verde, **396 IDs intactos**. `provar-demonstracao.sh`
verde nas cinco composições, com determinismo e controlo negativo. Guardas
verdes: classes, três línguas, preços, dados fictícios, coral, portas mortas,
suites com guião.

### O que NÃO foi feito

- **Formatos não optimizados.** Continuam PNG. O `next/image` serve WebP/AVIF por
  negociação a partir deles, o que resolve metade do §6.4 — o que falta é
  optimizar a **origem**, e continuo sem querer fazê-lo às cegas.
- **O herói a 38–41%** fica medido e por resolver, e a saída passa por recortar
  ou recapturar mais estreito. É composição.
- **As outras cinco páginas comerciais** não receberam composições. `/plans`,
  `/getting-started`, `/pilot`, `/trust`, `/faq` e `/demo` continuam sem mídia.
- **Nada de teclado nem leitor de ecrã** sobre as figuras novas.
- **Não medi a aparência.** Secção 7, e é do Matheus.

---

## L1f — a implantação e os equipamentos (MKT-006)

Instrumento: `inspeccao/rv100-implantacao.spec.ts`, guião
`scripts/provar-implantacao-mkt.sh`. Evidência em `evidence/implantacao/`,
`antes-implantacao.json` e `depois-implantacao.json`, cinco larguras × três
línguas.

### O que a página era, medido antes de lhe tocar

| | antes | depois | régua |
| --- | ---: | ---: | --- |
| secções | 2 | **5** | §6.3.8 e §6.3.9 |
| blocos com preço / com nota de IVA | 0 / 0 | **3 / 3** | §6.5 «todos os valores» |
| ressalvas do §6.6 no corpo | 0 de 3 | **3 de 3** | §6.6 |
| composições do produto | 0 | **1** | §6.4 |
| altura rolável a 1440 (es-ES) | 1085 | **3508** | — |
| anomalias em 15 combinações | 0 | **0** | §11.1 |

O `h1` e o `h2` eram **a mesma chave** — `comecamosTitulo` duas vezes, medido em
`antes-implantacao.json` no campo `titulos`: `['Así empezamos contigo', 'Así
empezamos contigo']`. A página dizia o próprio nome duas vezes antes de dizer o
que faz, e os quatro passos eram os da secção 9 da home palavra por palavra.

### A dependência do §6.6 não existe, e a saída é o próprio §6.6

O §6.6 manda «usar a linguagem vigente em `PRECIFICACAO.md`». Contei nesse
ficheiro: **63 linhas, seis menções aos planos e ZERO** ocorrências de
*hardware*, *equipamento*, *aparelho*, *terminal*, *impressora*, *gaveta*,
*leitor* e *homologação*. O `.json` também não tem nenhuma. A instrução aponta
para uma linguagem que não existe.

A saída é a voz condicional em que o próprio §6.6 está escrito — «pode precisar
de», «conforme operação», «quando aplicáveis» — e é essa que a página usa.
Avança como **autorizada por antecipação** (`00_AUTORIZACAO.md`), nunca como
decidida por ele. **O que não avança é preço de aparelho ou modelo nomeado:** o
D16 da `DECISOES.md` é pendente externo, e um kit fechado publicado sobre uma
decisão que não existe seria dado falso na pior superfície possível.

### As três ressalvas medem-se com o tamanho de letra ao lado

Um contador de ocorrências de «homologação» dá **verde a uma nota de rodapé a
11 px**. Por isso o instrumento emparelha cada ressalva do §6.6 com o **menor
tamanho de letra** em que ela aparece, e exige que seja num `<p>`/`<li>` dentro
de uma secção.

| ressalva | antes | depois |
| --- | --- | --- |
| nenhum modelo compatível sem homologação | ausente da página | **2 ocorrências no corpo, 16 px** |
| compra, garantia, rede, montagem, cabeamento não incluídos | ausente | **1 no corpo, 16 px** |
| nenhum kit fechado | ausente | **1 no corpo, 16 px** |

Nas três línguas e a 390 px, que é onde a letra pequena dói. A palavra medida na
segunda é **cabeamento**, por ser a menos reutilizável da lista: «rede» e
«montagem» aparecem noutros contextos comerciais, cabeamento não. E a terceira
casa a frase inteira (`kit cerrado|kit fechado|closed kit`) e não `cerrad`, que
apanharia «precio cerrado» dos adicionais e dava verde pela razão errada.

### O corte que não repete a `/plans`

A `/plans` mostra o dinheiro em grande e as horas como nota, porque lá a pergunta
é «quanto custa». Aqui o número grande é o das **horas de acompanhamento**,
porque a pergunta é «quanto tempo estão comigo». Mesma fonte — `precoDoPlano()`,
que lê a `PRECIFICACAO.json` —, corte diferente.

Classe própria, `.bo-mkt__horas`, e não `.bo-mkt__preco` reaproveitada: uma
classe chamada preço a segurar um número de horas é uma mentira de nome.

Os quatro passos ficam com o **nome** partilhado com a home (`passo1..4`) e ganham
um detalhe que é desta página (`passo1Detalhe..4`). O `passoNTexto` da home fica
na home — repeti-lo aqui era a página ser a secção outra vez.

### Um defeito do meu próprio instrumento, apanhado pelo número que não podia existir

A primeira versão da escala dividia a largura renderizada pela **`naturalWidth`**.
Deu 87, 88, 94, **102** e 91 por cento — e o **102** denunciou-a: nenhuma imagem
se renderiza acima da escala a que foi capturada.

A causa é o `srcset`. Com `next/image`, a `naturalWidth` é a largura da variante
que o browser descarregou, escolhida a partir do `sizes` e portanto **próxima da
largura renderizada por desenho**. O denominador andava com o numerador: a razão
media o *pipeline de entrega* e dava sempre ~100%, em qualquer composição.

O denominador certo é a largura da **captura**, que vive no nome do ficheiro por
convenção (`sala-tablet-834.png`) e está corroborada no `composicoes.json`. Com
ele, a mesma página lê-se assim:

| largura | renderizada | capturada | **escala** | escala servida |
| ---: | ---: | ---: | ---: | ---: |
| 360 | 312 | 834 | **37%** | 87% |
| 390 | 342 | 834 | **41%** | 88% |
| 768 | 720 | 834 | **86%** | 94% |
| 1280 | 588 | 834 | **71%** | 102% |
| 1440 | 588 | 834 | **71%** | 91% |

As duas razões ficam gravadas, porque respondem a perguntas diferentes: `escala`
é legibilidade (§6.4), `escalaServida` é se o `srcset` acertou. A segunda
continua verde — e é por isso que sozinha não provava nada.

**E o 37% não o escondo:** é a mesma miniatura que a L1e reprovou no herói da
home. A 360 px é aritmético e não é composição — nenhuma captura de 834 px passa
de ~43% num telemóvel de 360. A saída é uma captura da sala em largura de
telemóvel, ou não pôr mídia no herói do telemóvel. **Fica medido, não resolvido:
é composição, e composição é a secção 7 e é do Matheus.**

### Regressão

`marketing.spec.ts`: **65 verdes, `git diff` de 0 linhas, nenhuma asserção
alterada** — a âncora do MKT-006 é `.bo-mkt__passos` e ela não se mexeu.
**396 IDs intactos**, impressão da referência a conferir. Guardas verdes:
classes (com controlo negativo), três línguas (2488 chaves, com controlo
negativo), preços, dinheiro, dados fictícios, suites com guião. `pnpm lint`
limpo. Provas de nó do `@bossaos/i18n`: 19/19.

**Zero anomalias nas 15 combinações**, antes e depois: sem rolagem horizontal,
sem alvos abaixo de 44 px, sem elementos fora do ecrã, sem contrastes sob o
limiar.

### Duas coisas que este lote arrumou fora da página, e digo porquê

**A pasta do build passou a vir do ambiente** (`NEXT_DIST_DIR`, omissão `.next`).
A `playwright.config.ts` já tinha parametrizado a PORTA com este motivo escrito:
*«a terceira apanhou um `.next` a meio de dois builds a colidir»*. A porta
resolveu o primeiro caso e **o terceiro ficou por resolver** — dois processos com
portas diferentes continuam a escrever nos mesmos ficheiros. Apanhei-o ao vivo:
`/es-ES/getting-started` respondeu **200 a um pedido e 500 ao seguinte**, com o
código igual nos dois. O 500 não era da página.

**E o `pnpm lint` passou a ignorar essa pasta.** Sem a linha, entrava no build e
devolvia **32 762 erros de código gerado** que afogavam os do repositório —
medido: 100% dos erros vinham de lá.

### O que NÃO foi feito, e porquê

- **Expansão de texto: NÃO MEDI.** A `validar-expansao-de-texto.sh` precisa de
  semear a base, e a base é partilhada com outra sessão que está a correr suites
  neste momento. Corri-a duas vezes e a segunda devolveu NÃO MEDI pelo próprio
  controlo negativo («a sonda não acendeu»). Parei aí: continuar era semear por
  cima do trabalho de quem está a medir ao lado. **É a verificação mais relevante
  que fica em aberto**, porque a cópia nova é mais longa em PT e EN do que a que
  substituiu.
- **O herói a 37–41% no telemóvel**, medido acima. Composição.
- **Nada de teclado nem leitor de ecrã** sobre a página nova.
- **Metadados por rota** (§6.8) continuam por fazer nesta página, como nas outras.
- **`11_OPEN_FINDINGS.md` não foi tocado.** Mudar o `status` do RV100-015 seria eu
  a assinar a minha própria revisão.
- **Não medi a aparência.** Secção 7, e é do Matheus.

---

## L1g — a demo e a conversão (MKT-007)

Instrumento: `inspeccao/rv100-demo.spec.ts`, guião `scripts/provar-demo-mkt.sh`.
Evidência em `evidence/demo/`, cinco larguras × três línguas.

### Porque é que esta página pesa mais do que as outras

Não há registo público, checkout nem criação de assinatura em lado nenhum: **o
funil comercial inteiro acaba neste formulário**. E é o único sítio da superfície
comercial que recolhe dados pessoais.

### O que estava cumprido, e não parti

*«Não mostre sucesso se a persistência falhar»* já estava certo, e continua: há
**um** caminho para `/demo/thanks` e ele passa por a porta da base ter devolvido.
`erro=campos` e `erro=gravacao` são redireccionamentos distintos, e o `catch` não
tem para onde ir senão o erro.

### O buraco, medido

| | antes | depois |
| --- | --- | --- |
| caixa de consentimento de marketing | **não existe** | existe, `consentimentoMarketing` |
| pré-marcada | — | **`false`** |
| obrigatória para enviar | — | **`false`** |
| alvo de toque do consentimento | — | **44 px de altura nas cinco larguras** |
| aviso de tratamento antes do botão | **não existe** | **sim, em píxeis e em ordem de DOM**, a 16 px |
| ligação para tratamento de dados | nenhuma | `/{idioma}/privacy` |
| rota de tratamento de dados | **404 nas três línguas** | **200 nas três línguas** |
| os dois erros dizem coisas diferentes | **não, nas três línguas** | **sim, nas três línguas** |
| anomalias em 15 combinações | 0 | 0 |

### O defeito que encontrei e que não estava na lista

A rota distinguia validação de falha de escrita. **O ecrã desfazia a
distinção:** os dois ramos mostravam `demoErro`/`demoErroTexto`, ou seja
*«não se guardou nada, volta a tentar daqui a um momento»*.

Para uma base em baixo esse é o conselho certo. Para um email sem arroba é o
conselho **errado** — esperar não corrige um campo, e mandar a pessoa esperar por
causa do que ela escreveu é fazê-la perder o pedido. **A distinção existia no
caminho e morria na mensagem**, que é a razão pela qual isto se mede no texto
lido e não no redireccionamento.

### A separação existe onde os dados vivem, e não só no ecrã

Migração `20260918020000_l1g_consentimento_de_marketing`:

- `consentimento_marketing BOOLEAN NOT NULL DEFAULT false`;
- `consentimento_em TIMESTAMPTZ` — **um consentimento sem data não se prova**, e
  a data vem do `now()` do servidor e nunca do formulário;
- `CHECK demo_consentimento_datado` — recusa consentimento sem data **e** data
  sem consentimento;
- a porta passa a ter **oito** argumentos, e a de sete é **removida**: em
  Postgres uma assinatura nova não substitui a antiga, convive com ela, e deixar
  a antiga viva era manter uma porta que grava sem dizer nada sobre marketing.

Controlos corridos contra a base: `false` grava sem data; `true` grava com data;
a chave de idempotência continua a devolver `repetido`. E o **controlo negativo**:
um `INSERT` com consentimento marcado e data nula é recusado pela restrição.

Uma caixa não marcada **não é enviada pelo navegador** — chega ausente, não
chega `false`. Por isso a rota lê presença (`formulario.get(campo) !== null`) e
não compara com uma cadeia: `texto('x') === 'false'` daria o mesmo resultado nos
dois casos, e o consentimento nunca se registava.

### A afirmação nova tem guarda, como a página de confiança exige

O aviso diz que esta página não põe cookies de análise nem de rastreio. Os três
pilares da `/trust` têm guarda cada um, e uma afirmação nova sem guarda seria a
mesma classe de promessa que o `faq4` fazia sobre a rede.

Medido: **0 cookies e 0 recursos de terceiros** em 15 combinações. E com
**controlo negativo**, porque quinze zeros podem significar «não há cookies» ou
«o detector não sabe ver cookies», e as duas escrevem-se `0`:

```
antesDoControlo 0 → comOControlo 1 → depoisDeLimpar 0   acendeu: true
```

### A rota de tratamento de dados NÃO é uma política de privacidade

E o nome dela diz isso. Uma política nomeia um responsável pelo tratamento, fixa
prazos de conservação e descreve o procedimento de direitos — **nenhuma das três
está decidida neste repositório**, e inventá-las seria pôr texto com efeito legal
por cima de decisões que ninguém tomou, na página que existe para dizer a verdade
sobre dados pessoais.

O que a página tem é o que se pode conferir no código, com onde:

| afirmação | onde se verifica |
| --- | --- |
| recolhe-se isto | campos em `demo/page.tsx` e colunas em `schema.prisma` |
| não conseguimos ler | `REVOKE ALL ON demo_requests FROM bossaos_app` (migração `20260904150000`) |
| marcaste e ficou com data | restrição `demo_consentimento_datado` |
| sem cookies de análise | `rv100-demo.spec.ts`, com controlo negativo |

E o último bloco diz o que falta com essas palavras, em destaque e não em
rodapé. **O texto legal NÃO fica dado por revisto** — o RV100-011 continua
`fora-do-alcance-da-autorizacao`, e o que avançou foi a estrutura.

### Confiança contextual sem prova social inventada

Não acrescentei um quarto pilar nem um único número. A confiança que esta página
podia dar é sobre **ela própria**: o que acontece ao que a pessoa escreve. Isso é
contextual ao momento da conversão, é verificável, e não repete a `/trust`.

### As chaves cruzadas

| | chaves | partilhadas |
| --- | ---: | --- |
| `/demo` ∩ home | 17 | **0** |
| `/demo` ∩ `/plans` | 17 | **0** |
| `/demo` ∩ `/getting-started` | 17 | **0** |
| `/privacy` ∩ qualquer das três | 13 | **1** — `pedirDemo`, que é um rótulo de CTA |

### O rodapé, e o que continua sem ligação

`/privacy` passou a existir, e o rodapé liga-lhe — o comentário da `MolduraMkt`
que dizia «não há rota de privacidade» deixou de ser verdade e foi corrigido.
**Termos, cookies e contas de rede social continuam sem rota e continuam sem
ligação.**

### Regressão

`marketing.spec.ts` **65 verdes, `git diff` de 0 linhas** — a âncora
`form[action="/api/publico/demo"]` não se mexeu. Provas de nó do `@bossaos/db`
7/7. **396 IDs intactos** — a cobertura conta IDs da `COBERTURA_TELAS.csv` e não
ficheiros de rota, por isso `/privacy` não lhe toca. Guardas verdes: classes,
três línguas (2508 chaves), preços, dados fictícios, suites com guião. `pnpm
lint` limpo.

### Um defeito da MINHA correcção da L1f

O `NEXT_DIST_DIR` isola o build **servido** e **não isola o tipo**: o
`apps/web/tsconfig.json` inclui `.next/types/**/*.ts` com o caminho fixo. Com
duas sessões a construir, o meu build isolado foi buscar o validador de rotas da
pasta partilhada e falhou com

```
.next/types/validator.ts: Cannot find module '../../app/[idioma]/privacy/page.js'
```

— uma rota que **eu** tinha acabado de remover da minha árvore para medir o
antes, e que o build da outra sessão tinha visto enquanto existia. **O erro não
pertencia a nenhuma das duas árvores.**

Fica **declarado e não corrigido**: o `tsconfig.json` não lê variáveis de
ambiente, e as saídas que vi — incluir também `.next-*/types` — resolvem o meu
lado sujando o do outro. O arranjo certo é uma árvore de trabalho separada, e
isso é maior do que este lote.

### O que NÃO foi feito, e porquê

- **Expansão de texto: continua NÃO MEDI**, e agora com mais razão para
  interessar: a cópia nova é longa, sobretudo a nota do consentimento. Precisa de
  semear a base partilhada, e a outra sessão continua a correr suites nela.
- **O texto legal não está revisto**, e está marcado como tal na própria página.
- **Termos e cookies** continuam sem rota.
- **Nada de teclado nem leitor de ecrã** sobre a caixa nova — o alvo de 44 px
  está medido, a navegação por teclado não.
- **Não medi a aparência.** Secção 7, e é do Matheus.

---

## L1h — confiança e piloto (MKT-008 e MKT-010)

Instrumento: `inspeccao/rv100-confianca.spec.ts`, guião
`scripts/provar-confianca-mkt.sh`. Guarda do pilar:
`scripts/validar-pilar-offline.sh`. Evidência em `evidence/confianca/`.

### Uma correcção à instrução: são QUATRO acções, não cinco

A instrução dizia *«cinco acções exigem servidor — `pagamento`,
`reserva.confirmar`, `conta.fechar`, `desconto.autorizar` e `conflito`»*. Fui à
fonte e executei-a:

```
ACCOES_QUE_EXIGEM_REDE = ["pagamento","reserva.confirmar","conta.fechar","desconto.autorizar"]
total = 4
exigeRede('conflito') = false
```

**`conflito` não é uma acção que exige rede.** É um ramo de resultado da
sincronização (`'conflito' in r`, em `sincronizacao.ts:148`) e uma variante de
erro de preço em `precos.ts`. Conceito diferente.

Isto importa mais do que parece: se eu tivesse escrito «cinco» na página, a
guarda que construí teria contradito a própria página no primeiro arranque.

### E por isso o número não está escrito em lado nenhum

A página não diz «quatro». Os nomes saem de `ACCOES_QUE_EXIGEM_REDE`, importada
do `@bossaos/fila` — a mesma constante que o `PainelDaFila` usa para recusar. E o
mapa é `Record<AccaoQueExigeRede, string>`: **uma acção nova na lista fechada
parte o build** até alguém lhe dar nome na página.

**Provei-o em vez de o afirmar**, contra o tipo real e sem tocar na fonte
partilhada:

| caso | resultado |
| --- | --- |
| mapa a que falta um membro | **TS2741** — `'desconto.autorizar' is missing` |
| chave que não é membro | **TS2353** — `'accao.inventada' does not exist` |
| mapa correcto (controlo positivo) | **compila limpo** |

Sem o terceiro, os dois primeiros podiam estar a falhar por o tipo estar partido.

Escrevi a primeira versão do `confianca4Nota` com «essas quatro» lá dentro — o
número à mão que eu próprio tinha acabado de proibir. Apanhei-o e tirei-o das
três línguas; a guarda passou a reprovar `cuatro|quatro|four|cinco|five` nessas
chaves para não voltar.

### O quarto pilar é o assunto sobre o qual a FAQ mentia

O `faq4` prometia que «a sala continua a trabalhar e sincroniza quando a ligação
volta», e as duas metades eram falsas. O pilar honesto **não é «funciona
offline»**: é *o que se pode fazer sem rede está delimitado, e o que não se pode
não finge*.

| | antes | depois |
| --- | ---: | ---: |
| cartões na `/trust` | 3 | **4** |
| pilar de operação degradada | **não existe** | existe, com a lista |
| itens da lista vs lista fechada | — | **4 = 4**, nas três línguas |

E a suite compara o conjunto renderizado com a constante importada — não com o
número 4. Medir «tem quatro itens» ficaria verde no dia em que o produto passasse
a cinco, que é exactamente como o `faq4` chegou onde chegou.

### A guarda do quarto pilar

Os outros três pilares têm guarda cada um. O quarto passa a ter
`validar-pilar-offline.sh`, com **dois controlos negativos** e **um positivo**:

- a lista fechada não está vazia;
- cada membro tem nome nas três línguas;
- **o par positivo:** compor e enfileirar um pedido continua a **não** exigir
  rede — sem isto o pilar podia dizer «nada funciona sem rede», que é falso ao
  contrário;
- nenhuma chave do pilar escreve o número à mão;
- **negativo:** uma acção a mais na lista fica sem nome e o detector vê;
- **negativo:** `exigeRede` recusa uma acção inventada.

### O piloto: factos de processo, e a ausência medida

| | antes | depois |
| --- | ---: | ---: |
| secções | 2 | **4** |
| cartões | 0 | **4** |
| citações (`blockquote`/`q`/`cite`) | 0 | **0** |
| imagens no `<main>` | 0 | **0** |
| **todos** os números do texto | `[]` | **`['0,00']`** — e só |

«Não nomeia terceiros» não se prova procurando nomes que não conhecemos.
Medem-se as **formas** que a prova social toma: a citação tem etiqueta própria, o
logótipo é uma imagem, e o número é um número. O terceiro é o que apanha o caso
que importa — não se procura «500», recolhe-se **tudo** o que é número e
exige-se que o conjunto seja o esperado. O único que aparece é o **€0,00 do
Starter autogerido**, que sai de `precoDoPlano()`.

A página diz **na própria página** porque é que não há nomes: publicar o nome de
um restaurante é decisão dele e ainda não foi pedida. A ausência de prova social
lê-se como falta de clientes se ninguém a explicar — explicada, lê-se como o que
é, e impede que alguém «resolva» o vazio mais tarde com um logótipo que ninguém
autorizou.

### As chaves cruzadas: as duas páginas eram 100% de outras páginas

| | antes | depois |
| --- | --- | --- |
| `/trust` | 5 chaves, **5 partilhadas — 100%** | 12 chaves, 5 partilhadas — **41%** |
| `/pilot` | 8 chaves, **8 partilhadas — 100%** | 20 chaves, 6 partilhadas — **30%** |

No piloto, as partilhadas que saíram são exactamente o defeito do RV100-013:
`comecamosTitulo`, `passo3`, `passo3Texto`, `passo4`, `passo4Texto`. As que
ficam são `pedirDemo`, `verPlanos`, `precoImposto`, `precoImplantacaoSozinho`
(unidades e rótulos) e `pilotoTitulo`/`pilotoTexto`, que é o nome da própria
página e o bloco da home que lhe aponta.

**E fica um achado que não é meu para resolver:** as 5 chaves partilhadas da
`/trust` são os três pilares e o cabeçalho, todos repetidos no bloco 10 da home.
A `/trust` continua a ser esse bloco com mais espaço em tudo menos no quarto
pilar. É o mesmo defeito que a `/product` tinha, noutra página, e é outro lote.

### O teste que parti, e porquê — uma asserção a uma

`marketing.spec.ts` passou de 65 para **58, com 7 vermelhos**. Todos com a mesma
causa:

| teste | causa |
| --- | --- |
| MKT-010 não transborda (× 5 larguras) | marcador não encontrado |
| alvos de toque a 360 px | percorre TODAS as telas, pára no MKT-010 |
| contraste WCAG a 360 px | idem |

**A causa única: o marcador do MKT-010 era `.bo-mkt__passos`, e esse elemento
ERA o defeito.** O RV100-013 diz que a página «recicla dois passos da
implantação»; os passos eram `passo3` e `passo4`, iguais aos do
`/getting-started`. A L1h tirou-os e com eles foi-se a âncora.

**Quase reportei verde a mais.** A primeira corrida foi com `--reporter=line` e o
fim da saída dizia «58 passed» sem listar falhas — só reparei porque o número
tinha sido 65 nos dois lotes anteriores. Um verde sobre uma população que
encolheu é o defeito que este repositório persegue há dias, e desta vez o
denominador era a única pista.

**A correcção não reescreve o teste para ficar verde, e é medível:** o `git diff`
é **uma linha de código** e **zero linhas com `expect`**. As três asserções que
correm sobre o MKT-010 continuam iguais e continuam a correr sobre aquela rota.
O que mudou é o selector que espera pela página.

A alternativa era manter um `.bo-mkt__passos` na página só para o selector
encontrar — **inventar uma sequência de passos que não é verdade para satisfazer
um instrumento**. Fabricar conteúdo é pior do que trocar uma âncora, e o motivo
ficou escrito no próprio ficheiro.

### Regressão

`marketing.spec.ts` **65/65** com a população inteira de volta. Provas de nó do
`@bossaos/fila` **24/24**. **396 IDs intactos.** Guardas verdes: pilar offline,
classes, três línguas (2529 chaves), preços, dados fictícios, cobertura, suites
com guião. `pnpm lint` limpo. **Zero anomalias nas 30 combinações**, antes e
depois.

### O que NÃO foi feito

- **Expansão de texto: continua NÃO MEDI**, pela mesma razão — a base é
  partilhada e a outra sessão continua nela.
- **A `/trust` continua a repetir o bloco 10 da home** nos três primeiros
  pilares. Medido acima, e é outro lote.
- **Nada de teclado nem leitor de ecrã** sobre a lista nova do pilar.
- **`11_OPEN_FINDINGS.md` não foi tocado** — o RV100-019 e o RV100-013 são para
  o revisor fechar, não para mim.
- **Não medi a aparência.** Secção 7, e é do Matheus.

### Segunda limitação do `NEXT_DIST_DIR`, e esta é pior

Na L1g registei que o `NEXT_DIST_DIR` isola o build servido e não isola o tipo.
Encontrei a segunda neste lote, e é mais grave: **o Next reescreve o
`apps/web/next-env.d.ts`, que é um ficheiro VERSIONADO**, para apontar à pasta
configurada:

```diff
-import "./.next/types/routes.d.ts";
+import "./.next-revisao/types/routes.d.ts";
```

Com duas sessões a construir com pastas diferentes, esse ficheiro **oscila entre
as duas** a cada build — e enquanto aponta para `.next-revisao`, um build com a
pasta por omissão fica a referenciar tipos que não existem.

Revertido no meu lado (`git checkout -- apps/web/next-env.d.ts`) e **não vai no
commit**. Mas o balanço honesto é este: o `NEXT_DIST_DIR` resolve o servidor,
não resolve o tipo, e **mexe num ficheiro versionado**. Para medir em paralelo a
sério, a resposta é uma árvore de trabalho separada — e as duas limitações que
encontrei são o argumento a favor disso, não contra.

---

## L1i — metadados, hreflang e partilha (§6.8, RV100-007)

Instrumento: `inspeccao/rv100-seo.spec.ts`, guião `scripts/provar-seo-mkt.sh`.
Guarda: `scripts/validar-seo.sh`. Evidência em `evidence/seo/`.

### O antes, medido e não citado

| | antes | depois |
| --- | --- | --- |
| títulos **distintos** entre 9 rotas | **1** por língua | **9** por língua |
| descrições **distintas** entre 9 rotas | **1** por língua | **9** por língua |
| descrições distintas por rota, entre línguas | **1** | **3** |
| páginas com `canonical` | 0 | **27** |
| páginas com `hreflang` completo | 0 | **27** |
| páginas com `og:image` | 0 | **27** |
| páginas com ícone | 0 | **27** |
| `sitemap.xml` | **404** | **200**, 27 entradas, 81 alternates |
| `robots.txt` | **404** | **200**, com sitemap e 34 `Disallow` |

O título único era `'BossaOS'` e a descrição única era `'Sistema operativo do
restaurante.'` — **em português, servida também em espanhol**, que é a língua do
piloto.

**A medição central não é «tem `<title>`».** É quantos títulos **distintos**
existem entre as nove rotas: o defeito dava nove títulos e passaria qualquer
contagem de presença. O mesmo em segunda volta para a descrição, entre as três
línguas da mesma rota — **uma** significava a portuguesa servida nas três.

### A omissão passou a ser NÃO INDEXAR

Debaixo de `/[idioma]` não vivem só as rotas comerciais: vivem `/app`, `/staff`,
`/kds`, `/pos`, `/kiosk`, `/auth`, `/interno`, `/platform` e `/onboarding`.

Havia duas maneiras de cumprir «páginas autenticadas fora de indexação».
Enumerar as autenticadas e negá-las — e a próxima nasce indexável, porque
ninguém se lembra de a acrescentar. Ou **negar por omissão na moldura e obrigar
a comercial a pedir**, que é o que está feito: `metadadosDaRota` põe
`index: true` explicitamente nas nove.

**Entre os dois erros escolhi o que se descobre:** com lista de negação, uma rota
de sessão nova aparece no Google e ninguém dá por isso; com negação por omissão,
uma rota comercial nova não aparece — e essa nota-se, porque alguém a quer lá.

Medido: `/es-ES/auth/login` responde 200 e **`noindex, nofollow`**.

### O defeito que só apareceu quando o ficheiro passou a existir

`/robots.txt` respondia **307 para `/es-ES/robots.txt`**. E `/es-ES/robots.txt`
**não serve para nada**: o protocolo manda ler o `robots.txt` na raiz do domínio
e mais lado nenhum. O redireccionamento não o movia de sítio — **apagava-o**.

A causa é o `apps/web/proxy.ts` (o `middleware` renomeado do Next 16), que
redirecciona para `/{idioma}{caminho}` tudo o que não comece por `/api/` nem
`/r/`. É uma **lista de excepções**, e por isso cada rota nova na raiz nasce com
idioma à frente.

**E eu quase não o encontrei por procurar o nome errado:** o meu primeiro
`find` foi por `middleware.ts` e devolveu «sem middleware». O ficheiro chama-se
`proxy.ts` desde o Next 16, e está escrito no próprio ficheiro. Procurei pelo
nome antigo e concluí que a coisa não existia — que é a forma de erro que este
repositório já registou como *«um instrumento que não alcança o alvo tem de
FALHAR»*, aplicada a mim.

Corrigido com `FICHEIROS_NA_RAIZ`, declarada no `rotas.ts` e importada pelo
proxy — e não com uma expressão regular escrita dentro do proxy, porque é a
mesma pergunta que aquele módulo já responde.

E o `/og.png` respondia **500**: dentro de `app/` o Next só reconhece os nomes
das convenções (`icon`, `opengraph-image`, `favicon`). Passou para
`apps/web/public/`. **Não uso a convenção `opengraph-image.png`** de propósito:
com ela o texto alternativo vem de um `.alt.txt` ao lado, que é **um** ficheiro
e portanto **uma** língua — e o alt desta imagem diz que o restaurante é de
demonstração, frase que tem de existir nas três.

### A origem NÃO é `bossaos.com`, e a razão está no repositório

> «bossaos.com e @bossaos são nomes **pretendidos**, sem posse ou
> disponibilidade presumida.»
> — `docs/bossaos/PROMPTS_COMPLETOS.md`, linha 577

Um `canonical` é uma afirmação para uma máquina: *«o endereço oficial desta
página é este»*. Escrever lá um domínio que a documentação declara não possuído
seria publicar uma posse que não existe, **num sítio que ninguém relê** — um
`<link rel=canonical>` não se vê no ecrã.

Vem de `NEXT_PUBLIC_SITE_URL`, e sem ela vale `http://localhost:3000`: falso em
produção e **obviamente** falso. Um domínio plausível mas errado passa
despercebido; `localhost` num canonical salta à vista de quem olhe. É a mesma
disciplina do preço de aparelho que não inventei na L1f e do texto legal que não
dei por revisto na L1g.

### O sitemap não sai do atlas, e a razão é medida

A instrução dizia «gerado do atlas». Fui ver o que o atlas dá para os doze MKT, e
**três dariam entradas erradas**:

- `MKT-002` e `MKT-003` são `?section=product` e `?section=plans` — **o mesmo
  byte da home**, com `md5` medido no `06_O_PORTAO_DE_COBERTURA.md`. Três
  entradas para uma página é conteúdo duplicado declarado por nós;
- `MKT-006` diz `/[locale]/onboarding` e a rota real é `/getting-started` — a
  divergência é do atlas, registada como **RV100-020, aceite**;
- `MKT-011` (`/demo/thanks`) e `MKT-012` (`/404`) não se indexam.

**O atlas é o registo dos IDs e é excelente nisso** — é o que mantém os 396. Não
é um mapa de endereços indexáveis.

A objecção da instrução continua certa: *«uma lista à mão fica velha na primeira
rota nova»*. Por isso a lista **não vive sozinha**: a `validar-seo.sh` compara-a
com o sistema de ficheiros e reprova quando aparece uma pasta de rota que
ninguém classificou. Uma rota nova obriga a uma decisão explícita — indexável ou
não —, o que é mais do que um glob daria, porque um glob indexaria sozinho a
próxima rota autenticada.

### Zero dados estruturados, e é uma decisão

O §6.8 permite JSON-LD «somente para factos verdadeiros». Os factos que um
JSON-LD comercial normalmente carrega — `aggregateRating`, `reviewCount`,
contagem de clientes — **não existem**: a superfície comercial inteira tem zero
prova social, por decisão. **Um dado estruturado é uma afirmação para uma
máquina**, e vale-lhe a mesma regra: se uma guarda não o prova, não se escreve.
Não os ponho para preencher um campo.

### O favicon a tamanho real, e a OG medida pelo método da L1e

O ícone aprovado tinha **zero usos**. Está agora em `app/icon.png` (512 px), e
olhei-o a **16 px**, que é o tamanho real de um favicon.

Medido em vez de julgado a olho: o glifo ocupa **91,3% da largura** da tela
(bbox 1145×1254 de 1254), ou seja **~14,6 px efectivos** a 16. **Não há margem
para recuperar** — a arte já está justa. A silhueta do «b» coral aguenta; a onda
interior quase fecha. Uma variante simplificada para tamanho pequeno é decisão
de composição, e composição é a secção 7.

A imagem de partilha é a composição da sala, a **1200 × 630**, que é **83% da
largura a que foi capturada** (1200 de 1440) — pelo método da L1e, e acima dos
74–84% da `/product`. Abri-a e verifiquei o que se lê: o texto do produto é
legível **e a imagem marca-se sozinha** — mostra `bossa-demo` e
`demo@bossaos.invalid`, num TLD reservado que por definição não resolve. Uma
captura de um restaurante inventado partilhada numa rede social sem marca
ler-se-ia como um cliente real; esta traz a marca dentro dos pixéis, e o alt
di-lo por extenso nas três línguas.

### Regressão

`marketing.spec.ts` **65/65**, população inteira. **396 IDs intactos.** Guardas
verdes: seo (com três controlos negativos), pilar offline, classes, três línguas
(2550 chaves), preços, cobertura, portas mortas. `pnpm lint` limpo. E o
`next-env.d.ts` ficou **intacto** desta vez — verifiquei, depois da lição da L1h.

### O que NÃO foi feito

- **`NEXT_PUBLIC_SITE_URL` não está definida em lado nenhum.** O canonical de
  produção aponta a `localhost` até alguém a definir. É dependência de fora e
  fica declarada, não inventada.
- **Expansão de texto: continua NÃO MEDI**, mesma razão.
- **Termos e cookies** continuam sem rota, logo fora do sitemap.
- **Nada de teclado nem leitor de ecrã** neste lote — o `<head>` não tem foco.
- **Não medi a aparência.** Secção 7, e é do Matheus.
