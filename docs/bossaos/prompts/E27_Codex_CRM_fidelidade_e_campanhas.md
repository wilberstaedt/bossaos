# E27 - CRM, fidelidade e campanhas

**Enviar para:** Codex  
**Depende de:** E26  
**Entrega:** Relacionamento com clientes baseado em dados e consentimentos rastreáveis.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E27 - CRM, fidelidade e campanhas. Resultado esperado: Relacionamento com clientes baseado em dados e consentimentos rastreáveis.

Referências específicas: CT-12, CT-14; CRM.

IDs principais: CRM 001-013; MENU 017

Vistas relacionadas a evoluir/revisar: SET 012-013.

### Entregue

1. Implemente clientes por tenant, contatos, preferências, origem e ligação autorizada a reservas/pedidos.
2. Crie segmentos, histórico, feedback e tratamento de duplicados com confirmação; nunca una clientes entre organizações.
3. Implemente ledger de pontos/créditos, regras versionadas, resgate e reversão de compra reembolsada conforme política.
4. Crie campanhas em rascunho, audiência elegível, preview, teste controlado e envio por provedor somente quando habilitado.
5. Registre consentimento por finalidade/canal, fonte, momento e revogação; implemente supressão de contato e direitos de dados conforme política efetiva.

### Respeite

1. Reserva ou compra não representam aceite automático de publicidade. Checkbox de marketing começa desmarcado.
2. Feedback público não pode mostrar PII; avaliação não deve ser inventada para preencher páginas.
3. Sem provedor/autorização para envio, a campanha fica em rascunho ou teste; não simule entrega.

### Critérios de aceite

1. Revogação de contato antes do envio remove o cliente da audiência efetiva.
2. Replay de compra/resgate não duplica pontos; refund segue a política registrada.
3. Exportação e fusão de clientes exigem escopo e preservam histórico, sem associação entre tenants.

Atualize docs/progress/E27.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
