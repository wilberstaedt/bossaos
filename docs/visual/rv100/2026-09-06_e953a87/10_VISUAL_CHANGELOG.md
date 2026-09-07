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
