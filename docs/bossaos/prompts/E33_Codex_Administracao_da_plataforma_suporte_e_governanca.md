# E33 - Administração da plataforma, suporte e governança

**Enviar para:** Codex  
**Depende de:** E32  
**Entrega:** Ferramentas para operar o SaaS com acesso rastreável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E33 - Administração da plataforma, suporte e governança. Resultado esperado: Ferramentas para operar o SaaS com acesso rastreável.

Referências específicas: CT-04, CT-14, CT-17; J15; PLAT/HELP.

IDs principais: HELP 001-004; ORG 009; PLAT 001, 007-009, 013-014, 016-019; SET 010-011, 013-014

Vistas relacionadas a evoluir/revisar: CAT 026; ORG 008, 015; PLAT 002-004, 006, 010-011, 020; SET 011-013.

### Entregue

1. Conclua painéis de tenants, onboarding, assinaturas, planos, cupons, flags, filas, webhooks, incidentes e configuração de provedores.
2. Implemente central de ajuda, tickets, status, diagnóstico e sessão de suporte temporária com motivo, escopo e registro de ações.
3. Conclua controles avançados de papéis, auditoria, exportação, retenção, solicitações de dados e configuração de acesso.
4. Implemente migração assistida com dry-run, revisão de importações, moderação de uploads e revisão de abuso.
5. Torne jobs com falha reprocessáveis sem duplicar efeitos e registre ações internas com identidade real do operador da plataforma.

### Respeite

1. Support não vira owner silenciosamente. Suporte assistido é temporário, visível e autorizado conforme política do tenant.
2. Configuração de segredos exibe estado e rotação, nunca valores sensíveis em logs ou tabelas.
3. Proteções básicas, exportação autorizada e privacidade não dependem de comprar Pro; interface avançada de gestão pode depender.

### Critérios de aceite

1. J15 cobre ticket, acesso temporário, ação, expiração e auditoria sem acesso residual.
2. Retry de job, exportação e mudanças de flag têm permissão, histórico e escopo corretos.
3. Operador da plataforma sem papel financeiro não vê contas/transações sensíveis por acesso genérico.

Atualize docs/progress/E33.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
