# E05 - Planos, entitlements e identidade Starter

**Enviar para:** Codex  
**Depende de:** E04  
**Entrega:** Recursos comerciais controlados no servidor e tema Starter protegido.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E05 - Planos, entitlements e identidade Starter. Resultado esperado: Recursos comerciais controlados no servidor e tema Starter protegido.

Referências específicas: CT-02, CT-13, CT-19; THEME-001.

IDs principais: ONB 004; ORG 010, 013-014; PLAT 002-004, 006, 010-011; STATE 006; THEME 001

### Entregue

1. Modele PlanDefinition, Subscription, EntitlementGrant e limites configuráveis. Resolva plano, adicionais, overrides, validade e escopo da unidade por uma política única.
2. Implemente seleção e visão do plano, consumo, impacto de mudança e agendamento de downgrade. Permita provisionamento de piloto auditado, sem simular cobrança.
3. Crie controle interno mínimo de tenants e concessões para operar o piloto. A interface completa de suporte e plataforma vem na E33.
4. Implemente o tema padrão BossaOS no servidor e no cliente. Starter pode editar nome, logo, fotos e conteúdo, mas não a paleta.
5. Exponha bloqueios úteis por módulo e proteja as APIs correspondentes. Mantenha catálogo de recursos separado de flags de lançamento.

### Respeite

1. Não invente mensalidades, testes gratuitos, taxas ou limites quantitativos. Sem configuração comercial, habilite apenas a primeira unidade de piloto e bloqueie expansão não contratada.
2. Restaurant e Pro têm o mesmo direito de escolher cores públicas; o editor completo vem na E12.
3. Downgrade preserva dados e tema anterior; mudanças efetivas respeitam serviços ativos e a política CT-02.

### Critérios de aceite

1. Tentativa direta de alterar tema Starter ou usar módulo superior retorna negação coerente e não altera dados.
2. Entitlement expirado e flag desligada produzem respostas corretas, inclusive em job e rota direta.
3. Preview de downgrade corresponde ao tema e aos direitos aplicados na data de teste.

Atualize docs/progress/E05.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
