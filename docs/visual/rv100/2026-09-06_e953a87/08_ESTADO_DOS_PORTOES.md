# Os cinco portões do §12 — o que está medido e o que não está

> Escrito enquanto as telas-mestre são capturadas, para que a decisão de emitir
> `PRONTO PARA APROVAÇÃO VISUAL HUMANA` assente num mapa e não numa impressão.
>
> **Três respostas, não duas:** conforme, não conforme, **não medido**.

---

## §12.1 — Portão de marca · 6 critérios

| critério | estado |
| --- | --- |
| logo e ícone aprovados usados correctamente | **conforme** — assinatura `145×50` ligada (era `81×28` solta); `app/icon.png` vem do ícone aprovado |
| identidade reconhecível sem depender só do wordmark | **NÃO MEDI** |
| coral, verde-lima, verde-escuro e superfícies com funções consistentes | **parcial** — o coral ganhou função em 5 páginas, numa secção escura onde cumpre as três obrigações. **O verde-lima não o medi** |
| tipografia, espaço, raios, bordas e movimento tokenizados | **conforme** — verificado número a número contra o manual na secção 3 |
| não existe identidade antiga ou paralela | **conforme** — os dois corais são um sistema com fronteira medida no ADR 0001, e escrevi a guarda que a mantém |
| tema Starter e personalização respeitam limites | **conforme** — o ecrã desce o botão a secundário e é o servidor que recusa |

## §12.2 — Portão comercial · 8 critérios

| critério | estado |
| --- | --- |
| LP mostra o produto real e a proposta **numa viewport** | **parcial** — cinco composições ligadas e o herói a 1256, mas «numa viewport» é um limite de altura que **não medi** |
| as seis páginas têm conteúdo suficiente | **conforme** — todas reconstruídas com revisão escrita |
| preços vêm da fonte aprovada | **conforme** — `precoDoPlano()`, nada à mão |
| CTAs com hierarquia e destinos funcionais | **parcial** — resta **um** `href="#"` em 419 ficheiros, na maqueta da pré-visualização (P3) |
| não há prova social ou promessa inventada | **conforme** — **zero números** em toda a superfície comercial |
| ES, PT e EN completos | **conforme** — 2402 chaves × 3, com guarda |
| SEO e partilha configurados | **conforme, com uma pendência de produção**: o `NEXT_PUBLIC_SITE_URL` não está definido, e sem ele os canónicos apontam para `localhost` |
| footer institucional completo para o estado real | **conforme** — 11 ligações, e **sem rotas inventadas**: termos e cookies não existem e não se ligam |

## §12.3 — Portão de usabilidade · 6 critérios

| critério | estado |
| --- | --- |
| shells diferenciam as cinco superfícies | **conforme** — alvos de toque por superfície, 44 no público e 48 na operação |
| tarefas frequentes rápidas e claras | **NÃO MEDI** |
| touch, teclado, foco, zoom e conteúdo extremo | **parcial** — acessibilidade dinâmica conforme em 3 superfícies **públicas**; as **com sessão ficam declaradas como dívida**. Expansão de texto conforme em 281 ecrãs; alergénios extensos conforme |
| loading, empty, error, offline, denied, upgrade coerentes | **conforme** |
| KDS legível à distância e Staff com uma mão | **parcial** — o KDS tem tipografia própria de 18 px e alvos de 48; **«uma mão» não medi** |
| não há regressão de comportamento | **conforme** — `marketing.spec.ts` 65/65 com população inteira |

## §12.5 — Portão de cobertura · 6 critérios

| critério | estado |
| --- | --- |
| telas-mestre aprovadas propagadas | **bloqueado por desenho** — é a secção 8, depois da aprovação |
| 396 IDs rastreados | **conforme** |
| 792 composições capturadas ou justificadas | **não conforme — 0 de 792.** Mapeado: 120 alcançáveis por URL, 202 exigem estado, 16 provocam-se |
| não há P1/P2 visual aberto | **conforme** — zero abertos nos 22 achados |
| P3 aceite com decisão, responsável e prazo | **NÃO MEDI** |
| testes e build passam no commit final | **conforme** — `validar-no-commit.sh` verde contra o commit |

---

## O que isto diz sobre o `PRONTO`

**Quatro critérios estão por medir** — identidade sem wordmark, tarefas
frequentes, «uma mão» no Staff, e a decisão dos P3 aceites — e **quatro estão
parciais** com a parte em falta nomeada.

**E um está não conforme e é estrutural: as 792.** Mas esse **não bloqueia o
`PRONTO`** — o §12.5 é o portão de **cobertura**, e o §8 diz que a propagação e as
capturas vêm **depois** da aprovação humana. Capturá-las antes seria fotografar
telas que a aprovação ainda pode mandar mudar.

**O que o `PRONTO` exige é o §7.1**, e é uma lista curta: as seis implementadas,
testes corridos, preview verificável, `02_MASTER_SCREENS_REVIEW.md`, e a
evidência indexada.

**Este documento é parte dessa indexação, e existe para que o que falta esteja
escrito antes de eu emitir seja o que for.**
