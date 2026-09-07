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
