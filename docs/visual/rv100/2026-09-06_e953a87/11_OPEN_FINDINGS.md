# RV100 · achados em aberto

> Formato do §11.4. Aberto na secção 6 (a landing) e alimentado por
> `01_BASELINE.md` e `05_MARKETING_AND_CONVERSION.md`.
>
> `status: open` significa medido e por corrigir. **Nada aqui está corrigido.**
>
> **Sobre as decisões comerciais desta secção:** o `00_AUTORIZACAO.md` regista
> que o Matheus destravou, por escrito e por antecipação, as pendências dele
> dentro do produto — e nomeia a secção 6 («mensagem comercial, promessa e preço
> na landing») entre elas. As entradas marcadas
> `decisao: autorizada-por-antecipacao` avançam **sem** ele decidir e ficam assim
> escritas: autorizada em avanço, nunca decidida por ele. Ele vê o resultado
> depois de feito, que é o preço que pagou de olhos abertos.
>
> **Duas coisas essa autorização não pode cobrir**, e ficam marcadas
> `decisao: fora-do-alcance-da-autorizacao`: autorizar o **nome de um terceiro**
> em copy pública, que não é pendência dele mas consentimento de outra pessoa; e
> dar por revisto um **texto legal** que ninguém com responsabilidade legal leu.
> Nesses dois avanço na estrutura e paro no conteúdo, em vez de parar em tudo.

---

```yaml
id: RV100-001
severity: P1
surface: marketing
screen_or_route: todas as 10 rotas da família MKT
summary: a assinatura da marca renderiza a 81 x 28 px, abaixo do mínimo documental
impact: marca
expected: largura >= 120 px no cabeçalho desktop; alvo 144-168 px (§4.1)
observed: 81 x 28 px, medido no DOM e confirmado pela aritmética do componente — `Wordmark({ altura = 28 })` com `width = round(2137/736 * altura)`; os dois sítios que o usam chamam-no sem argumento
evidence: evidence/baseline/medidas-1440.json · 01_BASELINE.md
fix_criteria: `altura={50}` dá 145 px; medir no navegador e não na aritmética
status: open
```

```yaml
id: RV100-002
severity: P1
surface: marketing
screen_or_route: MolduraMkt — todas as 10 rotas
summary: a navegação inteira são sete links equivalentes em cápsula, a partir em duas linhas
impact: usabilidade
expected: no máximo quatro agrupamentos, CTA de demo prioritário, estado activo sem transformar tudo em cápsula (§6.1, §4.5)
observed: PAGINAS_MKT tem 6 rotas + demo = 7 `<a>` na mesma `<nav>`, todos com `border-radius: var(--bo-raio-capsula)`
evidence: evidence/baseline/home-1440.png
fix_criteria: <= 4 agrupamentos visíveis; o CTA distinto dos links; `marketing.spec.ts` continua a provar que as sete rotas se alcançam da landing
status: open
```

```yaml
id: RV100-003
severity: P1
surface: marketing
screen_or_route: as oito páginas comerciais
summary: não há uma única imagem do produto em nenhuma superfície comercial
impact: conversao
expected: composições com telas reais e determinísticas do build; produto legível, não miniatura (§6.2, §6.4)
observed: `media = 1` em todas as oito páginas, e essa uma é a própria marca
evidence: evidence/baseline/medidas-1440.json
fix_criteria: hero e bloco de módulos com capturas reais do produto, geradas por instrumento determinístico e com alt contextual
status: open
```

```yaml
id: RV100-004
severity: P1
surface: marketing
screen_or_route: /[idioma]/plans
summary: os preços aprovados não aparecem, e a fonte que os serve já existe em código
impact: conversao
expected: preços da fonte aprovada, mensal e anual, IVA à parte, implantação separada da assinatura (§6.5)
observed: zero preços na página e zero nos três catálogos de mensagens; a decisão que os proibia caducou a 04/09 às 04:01, 83 minutos depois de ser tomada
evidence: 01_BASELINE.md secção "O caso 7" · docs/bossaos/PRECIFICACAO.json
fix_criteria: os valores vêm de `precoDoPlano()` em `packages/domain/src/precificacao.ts`; `validar-precos.sh` passa; o equivalente mensal aparece como apresentação e nunca como cobrança
status: open
```

```yaml
id: RV100-005
severity: P1
surface: marketing
screen_or_route: MolduraMkt — todas as 10 rotas
summary: o footer é uma linha com a assinatura da plataforma
impact: consistencia
expected: produto, planos, recursos, idiomas, contacto, redes, login, privacidade, termos e cookies conforme disponibilidade real (§6.3.14)
observed: `<footer>` com `{assinatura}` = "Hecho con BossaOS"; o `EstruturaPublica` aceita um `rodape` opcional que a `MolduraMkt` não passa
evidence: 01_BASELINE.md hipótese 10
fix_criteria: footer com as rotas que existem — as 7 da família, /auth/login e os três idiomas. Rotas legais só depois de RV100-011
status: open
```

```yaml
id: RV100-006
severity: P1
surface: marketing
screen_or_route: MolduraMkt — todas as 10 rotas
summary: não existe seletor de idioma na moldura comercial
impact: usabilidade
expected: ES/PT/EN visível, encontrável sem depender do rodapé (§6.1, §6.8)
observed: nenhum componente de troca de idioma na família MKT; existe no site do restaurante (`bo-publico__idiomas`, em SitePublico.tsx)
evidence: 01_BASELINE.md hipótese 11
fix_criteria: seletor no cabeçalho, com a rota localizada preservada e a escolha persistida
status: open
```

```yaml
id: RV100-007
severity: P1
surface: marketing
screen_or_route: todas as 10 rotas
summary: uma metadata para a aplicação inteira, sem canonical, hreflang, OG, sitemap, robots nem favicon
impact: conversao
expected: title por página, description útil, canonical/hreflang/robots/sitemap coerentes, OG legível, favicon do ícone aprovado (§6.8)
observed: `title: 'BossaOS'` e uma description no layout raiz; nenhuma página de marketing define a sua; `apps/web/app/` não tem icon/favicon/apple-*; o padrão de `generateMetadata` já existe em `app/r/[publicLocationSlug]/[locale]/layout.tsx`
evidence: 01_BASELINE.md hipótese 12
fix_criteria: metadata por rota nos três idiomas, favicon do `Icone` aprovado testado em 16 px, sitemap e robots servidos
status: open
```

```yaml
id: RV100-008
severity: P2
surface: marketing
screen_or_route: product, plans, getting-started, pilot, trust
summary: cinco das oito páginas cabem inteiras em 900 px; o ritmo vertical é de 24 px
impact: marca
expected: respiro de 80-128 px entre secções no desktop; uma landing não pode parecer uma tabela de documentação (§4.4)
observed: `.bo-mkt__seccao { padding: var(--bo-espaco-xl) 0 }` = 24 px, 48 px entre secções; cinco páginas não rolam
evidence: evidence/baseline/medidas-1440.json
fix_criteria: `--bo-espaco-gigante` (64) nas secções — dois paddings adjacentes dão 128 px, dentro do §4.4 e sem token novo
status: open
```

```yaml
id: RV100-009
severity: P2
surface: marketing
screen_or_route: as oito páginas comerciais
summary: o conteúdo do hero acaba antes de metade da largura em sete das oito páginas
impact: marca
expected: composição equilibrada entre mensagem e produto; espaço vazio com função (§6.2, §4.4)
observed: seis páginas acabam em x=728 de 1440, a FAQ em 652, a home em 1256 (número por explicar)
evidence: evidence/baseline/medidas-1440.json
fix_criteria: hero em duas colunas com mídia do produto à direita; nenhuma metade de viewport vazia por ausência de conteúdo
status: open
```

```yaml
id: RV100-010
severity: P2
surface: marketing
screen_or_route: /[idioma]
summary: a landing tem 3 dos 14 blocos que o §6.3 exige
impact: conversao
expected: header/hero, problema, base única, produto em movimento, módulos, papéis, planos, equipamentos, implantação, confiança, piloto, FAQ, CTA final, footer
observed: hero, "una base para cada parte del servicio" e "un plan para tu restaurante"
evidence: evidence/baseline/home-1440.png
fix_criteria: os catorze blocos como secções da MKT-001 — sem rotas novas, para os 396 IDs do §12.5 continuarem 396; `?section=` continua a isolar o bloco pedido
status: open
```

```yaml
id: RV100-011
severity: P1
surface: marketing
screen_or_route: /[idioma]/demo
summary: o formulário recolhe dados pessoais sem aviso de privacidade e sem distinguir contacto de consentimento para marketing
impact: acessibilidade
expected: diferenciar contacto transaccional de consentimento para marketing (§6.7); rotas de privacidade, termos e cookies conforme disponibilidade (§6.3.14)
observed: cinco campos (nome, email, restaurante, telefone, mensagem) gravados em `demo_requests`, sem texto de privacidade na página nem na rota da API; não existe rota de privacidade, termos ou cookies no repositório
evidence: apps/web/app/[idioma]/demo/page.tsx · apps/web/app/api/publico/demo/route.ts
fix_criteria: rota de privacidade e ligação a partir do formulário; distinção entre o contacto pedido e autorização para marketing
decisao: fora-do-alcance-da-autorizacao — a estrutura avança por antecipação; o TEXTO legal fica por rever por quem responde por ele, e isso não é uma pendência que o Matheus tenha destravado escrevendo que confia em mim
status: open
```

```yaml
id: RV100-012
severity: P2
surface: marketing
screen_or_route: as oito páginas comerciais
summary: coral e cítrico estão praticamente ausentes da superfície comercial
impact: marca
expected: uso deliberado de coral e verde-lima; coral cria foco e conversão (§6.2, §4.2)
observed: `#F5664D` 4 ocorrências e `#DDEA91` 3, contra 20 de `#102E35`; na família MKT o coral aparece só como cor do estado activo, via `--bo-acento-sinal`
evidence: 01_BASELINE.md hipótese 5
fix_criteria: coral no CTA e no foco editorial COM rótulo verde-escuro (branco sobre coral dá 3,05:1 e o manual proíbe-o em texto comum); cítrico como acento pontual, nunca como sucesso operacional
status: open
```

```yaml
id: RV100-013
severity: P2
surface: marketing
screen_or_route: /[idioma]/pilot
summary: a página de piloto recicla dois passos da implantação e não tem um único facto de piloto
impact: conversao
expected: somente factos aprovados e identificados como piloto; sem depoimento inventado (§6.3.11)
observed: os dois "passos" da página são as chaves `passo3` e `passo4`, as mesmas do /getting-started
evidence: apps/web/app/[idioma]/pilot/page.tsx
fix_criteria: factos de piloto autorizados e identificados como piloto. O único piloto referido no repositório é um acordo separado com um restaurante identificável
decisao: fora-do-alcance-da-autorizacao — o Matheus destravou as decisões DELE; o nome de um terceiro em copy pública é consentimento de outra pessoa e não dele. A página avança sem nome e sem depoimento
status: open
```

```yaml
id: RV100-014
severity: P3
surface: marketing
screen_or_route: /en
summary: o hero inglês diverge por uma palavra do conteúdo-base aprovado no §6.2
impact: marca
expected: "Your restaurant. One rhythm." (§6.2)
observed: "Your whole restaurant. One rhythm." em packages/i18n/src/mensagens/en.json; ES e PT batem certo
evidence: packages/i18n/src/mensagens/en.json
fix_criteria: alinhar ao §6.2, que é o documento mais recente e chama àquele texto "aprovado"
decisao: autorizada-por-antecipacao (00_AUTORIZACAO.md) — alinho ao §6.2 e fica escrito que ele vê depois
status: open
```

```yaml
id: RV100-015
severity: P2
surface: marketing
screen_or_route: /[idioma] (bloco 8) e /[idioma]/plans
summary: não há secção de equipamentos, e a fonte que o §6.6 manda usar não tem linguagem de equipamento
impact: conversao
expected: software separado de hardware, reaproveitamento sujeito a homologação, sem kit fechado inexistente (§6.6)
observed: a `PRECIFICACAO.md` não fala de hardware tirando "kiosk e conectores de marketplaces não têm preço fechado"; a `DECISOES.md` marca o D16 — hardware incluído — como pendente externo
evidence: docs/bossaos/PRECIFICACAO.md · docs/bossaos/DECISOES.md D16
fix_criteria: escrever a secção na forma condicional do próprio §6.6 ("pode precisar de", "sujeito a homologação"), nunca como kit fechado
decisao: autorizada-por-antecipacao (00_AUTORIZACAO.md) — avanço com a linguagem condicional; o que não faço é fechar um kit que o D16 deixa pendente, porque isso não é uma decisão dele em aberto, é um facto que não existe
status: open
```

```yaml
id: RV100-016
severity: P3
surface: marketing
screen_or_route: /[idioma]/faq
summary: a FAQ não tem objecções de equipamento nem de cobrança e mudança de plano
impact: conversao
expected: objecções comerciais, técnicas e de equipamento (§6.3.12); FAQ de cobrança e mudança de plano (§6.5)
observed: quatro perguntas — duas comerciais, duas técnicas, zero de equipamento, zero de cobrança
evidence: apps/web/app/[idioma]/faq/page.tsx
fix_criteria: perguntas novas nos três catálogos, com respostas verificáveis contra o produto e contra a PRECIFICACAO
status: open
```

```yaml
id: RV100-017
severity: P3
surface: marketing
screen_or_route: motor de prova do produto
summary: o dataset determinístico não se lê como demonstração
impact: conversao
expected: dados demonstrativos claramente artificiais, que nunca representem cliente real sem autorização (§6.4)
observed: os itens levam o prefixo `insp-` e o inquilino chama-se "Marina Bistró" — ficção que não se anuncia como tal
evidence: packages/db/prisma/fixtures.ts · packages/db/prisma/semente-inspeccao.ts
fix_criteria: dataset próprio de demonstração, sem prefixo de arnês, com nome que se leia como demonstração; a semeadura de inspecção fica intocada
status: open
```

```yaml
id: RV100-018
severity: P3
surface: marketing
screen_or_route: apps/web/app
summary: o ícone aprovado não tem uso nenhum e não existe favicon
impact: marca
expected: ícone e logo aprovados usados correctamente (§12.1); favicon testado em tamanho real (§6.8)
observed: `git grep '<Icone'` devolve zero; não há icon/favicon/apple-* em apps/web/app
evidence: 01_BASELINE.md
fix_criteria: favicon derivado do ícone aprovado, revisto a 16 px como o manual manda (p. 14)
status: open
```

```yaml
id: RV100-019
severity: P3
surface: marketing
screen_or_route: /[idioma]/trust
summary: falta o quarto pilar de confiança — operação degradada realmente implementada
impact: conversao
expected: propriedade dos dados, isolamento, estados honestos e operação degradada (§6.3.10)
observed: três pilares, todos verificáveis no código; a afirmação de operação degradada vive na FAQ como `faq4`
evidence: apps/web/app/[idioma]/trust/page.tsx
fix_criteria: medir a operação degradada contra o código ANTES de a subir para a página de confiança — mover uma afirmação de sítio não é verificá-la
status: open
```

```yaml
id: RV100-020
severity: P4
surface: marketing
screen_or_route: /[idioma]/getting-started
summary: a rota diverge da COBERTURA_TELAS.csv, e a divergência é do atlas
impact: consistencia
expected: MKT-006 em /[locale]/onboarding, segundo a COBERTURA_TELAS.csv
observed: o atlas dá a mesma rota ao MKT-006 e ao ONB-009, que está validado nela desde o E04; o E10 escolheu /getting-started e declarou-o
evidence: docs/progress/E10.md
fix_criteria: nenhum — a correcção é no atlas e quem o assina é que a faz. Fica registada para não voltar a ser descoberta
status: accepted
```

---

## Contagem

| severidade | achados |
| --- | ---: |
| P1 | 8 — 001, 002, 003, 004, 005, 006, 007, 011 |
| P2 | 6 — 008, 009, 010, 012, 013, 015 |
| P3 | 5 — 014, 016, 017, 018, 019 |
| P4 | 1 — 020, aceite |
| **total** | **20** |

**Nenhum destes espera pelo Matheus para o trabalho arrancar.** O
`00_AUTORIZACAO.md` destrava as decisões comerciais da landing por antecipação —
RV100-014 e 015 avançam assim, e ficam escritos como *autorizados em avanço*,
nunca como decididos por ele.

Dois avançam só até onde podem: o **RV100-013** constrói a página de piloto sem
nome de terceiro e sem depoimento, e o **RV100-011** constrói a rota e a ligação
mas não dá por revisto o texto legal. A autorização dele é sobre pendências dele;
o consentimento de outra pessoa e a responsabilidade legal não são dele para
dar — e forçá-las seria usar a confiança que ele me deu para uma coisa que ele
não me deu.

O §12.5 exige zero P1 e P2 abertos para a RV100 fechar.
