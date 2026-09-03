# Sequência de implementação

Executar uma etapa por vez. E00 prepara; E11/E21/E34 revisam. Etapas de implementação têm escopo, regras e aceite nos arquivos de prompts. E35 pode preparar piloto parcial após G1/G2, limitado aos módulos já validados.

| Etapa | Destino | Entrega | IDs principais |
| --- | --- | --- | --- |
| E00 | Claude | Contrato de implementação e leitura das fontes | 0 |
| E01 | Codex | Repositório, ambiente e verificação contínua | 0 |
| E02 | Codex | Design system, responsividade e idiomas | 6 |
| E03 | Codex | Estrutura multi-tenant e isolamento de dados | 0 |
| E04 | Codex | Autenticação, convites e permissões | 12 |
| E05 | Codex | Planos, entitlements e identidade Starter | 12 |
| E06 | Codex | Onboarding e configuração do restaurante | 14 |
| E07 | Codex | Catálogo, produtos, preços e opções | 18 |
| E08 | Codex | Mídia, traduções, importação e publicação | 10 |
| E09 | Codex | Carta pública e QR de consulta | 11 |
| E10 | Codex | Sites dos restaurantes e landing page BossaOS | 29 |
| E11 | Claude | Revisão do Starter e primeiro marco utilizável | 0 |
| E12 | Codex | Cores públicas e mudanças de plano | 7 |
| E13 | Codex | Sala, sessões, dispositivos e PIN | 17 |
| E14 | Codex | Motor de pedidos e entrega confiável | 18 |
| E15 | Codex | Staff PWA e funcionamento degradado | 23 |
| E16 | Codex | KDS de cozinha, barra e expo | 20 |
| E17 | Codex | Pedido por QR e atendimento do cliente | 16 |
| E18 | Codex | Motor de reservas e capacidade concorrente | 6 |
| E19 | Codex | Reserva pública, host e lista de espera | 28 |
| E20 | Codex | Takeaway e delivery | 7 |
| E21 | Claude | Revisão operacional do Restaurant | 0 |
| E22 | Codex | TPV, contas e caixa | 19 |
| E23 | Codex | Pagamentos, webhooks e reembolsos | 12 |
| E24 | Codex | Documentos e integração fiscal | 5 |
| E25 | Codex | Estoque e fichas técnicas | 12 |
| E26 | Codex | Fornecedores e compras | 6 |
| E27 | Codex | CRM, fidelidade e campanhas | 14 |
| E28 | Codex | Equipe, escalas e ponto | 11 |
| E29 | Codex | Financeiro e conciliação | 11 |
| E30 | Codex | Analytics, relatórios e gestão multiunidade | 9 |
| E31 | Codex | Kiosk, terminais e impressão | 11 |
| E32 | Codex | Integrações, API e cobrança do SaaS | 13 |
| E33 | Codex | Administração da plataforma, suporte e governança | 19 |
| E34 | Claude | Revisão Pro e cobertura integral | 0 |
| E35 | Codex | Pacote de implantação e piloto assistido | 0 |

## Cobertura por etapa

### E00 - Contrato de implementação e leitura das fontes

Etapa transversal: não cria ID de tela independente.

### E01 - Repositório, ambiente e verificação contínua

Etapa transversal: não cria ID de tela independente.

### E02 - Design system, responsividade e idiomas

STATE 001-003, 005, 007, 016

### E03 - Estrutura multi-tenant e isolamento de dados

Etapa transversal: não cria ID de tela independente.

### E04 - Autenticação, convites e permissões

AUTH 001, 003-009; ONB 009; ORG 007-008; STATE 014

### E05 - Planos, entitlements e identidade Starter

ONB 004; ORG 010, 013-014; PLAT 002-004, 006, 010-011; STATE 006; THEME 001

### E06 - Onboarding e configuração do restaurante

ONB 001-003, 010; ORG 001-006, 015; SET 001-002; STATE 013

### E07 - Catálogo, produtos, preços e opções

CAT 001-013, 016-019, 022

### E08 - Mídia, traduções, importação e publicação

CAT 014-015, 023-027; ONB 005-006; SET 012

### E09 - Carta pública e QR de consulta

CHAN 001; MENU 001-005, 019; QR 001, 003-004; REP 001

### E10 - Sites dos restaurantes e landing page BossaOS

INT 003; MKT 001-012; PUB 001-002, 004-006; WEB 001-011

### E11 - Revisão do Starter e primeiro marco utilizável

Etapa transversal: não cria ID de tela independente.

### E12 - Cores públicas e mudanças de plano

THEME 002-008

### E13 - Sala, sessões, dispositivos e PIN

AUTH 002; DEV 001-004; FLOOR 001-009, 011; ONB 007; SET 003

### E14 - Motor de pedidos e entrega confiável

CAT 020; CHAN 002; ORD 001-006, 008-010; REP 002-007; SET 004

### E15 - Staff PWA e funcionamento degradado

SET 008; STAFF 001-014, 017-018, 022-024; STATE 004, 008, 015

### E16 - KDS de cozinha, barra e expo

KDS 001-015; ONB 008; REP 009; SET 005-006; STATE 012

### E17 - Pedido por QR e atendimento do cliente

MENU 006-013, 018, 020; QR 002, 005-007; STATE 009-010

### E18 - Motor de reservas e capacidade concorrente

RES-B 012-016; SET 007

### E19 - Reserva pública, host e lista de espera

INT 004; PUB 003; REP 008; RES-B 001-011, 017-019; RES-C 001-010; SET 009

### E20 - Takeaway e delivery

DEL 001-003; STAFF 021; TAKE 001-003

### E21 - Revisão operacional do Restaurant

Etapa transversal: não cria ID de tela independente.

### E22 - TPV, contas e caixa

FLOOR 010; ORD 007; POS 001-004, 006, 009-011, 014-019; STAFF 015-016, 020

### E23 - Pagamentos, webhooks e reembolsos

INT 005; MENU 014-016; POS 005, 007-008, 013, 022-023; STAFF 019; STATE 011

### E24 - Documentos e integração fiscal

CAT 021; INT 006; POS 012, 020-021

### E25 - Estoque e fichas técnicas

INV 001-012

### E26 - Fornecedores e compras

PUR 001-004; SUP 001-002

### E27 - CRM, fidelidade e campanhas

CRM 001-013; MENU 017

### E28 - Equipe, escalas e ponto

HR 001-011

### E29 - Financeiro e conciliação

FIN 001-011

### E30 - Analytics, relatórios e gestão multiunidade

CAT 028; REP 010-017

### E31 - Kiosk, terminais e impressão

DEV 005-006; KDS 016; KIOSK 001-008

### E32 - Integrações, API e cobrança do SaaS

INT 001-002, 007-010; ORD 011; ORG 011-012; PLAT 005, 012, 015, 020

### E33 - Administração da plataforma, suporte e governança

HELP 001-004; ORG 009; PLAT 001, 007-009, 013-014, 016-019; SET 010-011, 013-014

### E34 - Revisão Pro e cobertura integral

Etapa transversal: não cria ID de tela independente.

### E35 - Pacote de implantação e piloto assistido

Etapa transversal: não cria ID de tela independente.
