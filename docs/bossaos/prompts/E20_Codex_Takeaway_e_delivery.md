# E20 - Takeaway e delivery

**Enviar para:** Codex  
**Depende de:** E19  
**Entrega:** Pedidos fora de mesa com canais e cumprimento definidos.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E20 - Takeaway e delivery. Resultado esperado: Pedidos fora de mesa com canais e cumprimento definidos.

Referências específicas: CT-02, CT-08, CT-09; TAKE/DEL.

IDs principais: DEL 001-003; STAFF 021; TAKE 001-003

Vistas relacionadas a evoluir/revisar: CHAN 001-002.

### Entregue

1. Implemente criação, horários e fila de retirada de takeaway reutilizando catálogo, preço, Order e KDS.
2. Modele delivery próprio/manual com endereço mínimo, área atendida, taxa configurada, entrega e status; respeite o entitlement separado.
3. Implemente pedidos futuros com horário de produção, indisponibilidade, cancelamento e contato operacional.
4. Crie porta de integração de delivery externo, mapeamento de IDs e idempotência; sem contrato/provedor, mantenha o conector desabilitado e demonstrável em sandbox.
5. Crie filtros e telas por canal sem manter bancos de pedidos independentes; adapte Staff para retirada/entrega.

### Respeite

1. Delivery e kiosk exigem concessões próprias quando o pacote comercial assim definir; não os inclua silenciosamente em todos os planos.
2. Não capture pagamento em Restaurant. Registre resolução externa quando aplicável; pagamento integrado depende da E23.
3. Não exponha endereços ou telefones nas telas públicas de fila.

### Critérios de aceite

1. Takeaway chega à estação correta, é preparado e retirado uma vez, com timeline consistente.
2. Endereço fora de área, horário fechado e produto indisponível bloqueiam apenas a ação afetada.
3. Evento externo repetido preserva um único pedido; autorização e redaction são verificadas.

Atualize docs/progress/E20.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
