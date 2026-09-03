# E32 - Integrações, API e cobrança do SaaS

**Enviar para:** Codex  
**Depende de:** E31  
**Entrega:** Extensões externas e assinatura BossaOS com responsabilidades separadas.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E32 - Integrações, API e cobrança do SaaS. Resultado esperado: Extensões externas e assinatura BossaOS com responsabilidades separadas.

Referências específicas: CT-02, CT-06, CT-14, CT-19; INT.

IDs principais: INT 001-002, 007-010; ORD 011; ORG 011-012; PLAT 005, 012, 015, 020

Vistas relacionadas a evoluir/revisar: INT 004; ORG 010, 013-015.

### Entregue

1. Conclua catálogo/detalhe de integrações, credenciais por escopo, estado, erros e logs redigidos.
2. Implemente API keys com hash, escopos, expiração, revogação, limites e documentação OpenAPI.
3. Implemente webhooks de saída com assinatura, versionamento, retry, deduplicação e proteção de destinos; cada payload leva somente dados autorizados.
4. Integre provedor de assinatura SaaS para organização: checkout, faturas, método, falha, crédito, cancelamento e mudança de plano.
5. Conclua conectores contratados de mensagens/delivery e consolide reprocessamento de eventos. O que não tem provedor permanece desabilitado com requisitos claros.

### Respeite

1. Cobrar o restaurante pelo SaaS difere de cobrar o consumidor pela refeição; contas, webhooks e conciliação são separados.
2. Nunca deixe um webhook alterar entitlements apenas com base em organization_id recebido sem vínculo verificado com cliente/assinatura do provedor.
3. Não faça requisições arbitrárias a rede interna a partir de URLs de integração. Credenciais reais entram pelo ambiente autorizado.

### Critérios de aceite

1. Webhook SaaS atrasado/duplicado não reativa assinatura cancelada nem aplica plano incorreto.
2. Chave revogada ou fora de escopo falha; payload e logs não expõem segredos.
3. Assinatura simulada e integração real são distinguíveis; preços usados vêm de configuração comercial confirmada.

Atualize docs/progress/E32.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
