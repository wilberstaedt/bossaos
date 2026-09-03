# E14 - Motor de pedidos e entrega confiável

**Enviar para:** Codex  
**Depende de:** E13  
**Entrega:** Um único motor para todos os canais, com confirmação e histórico.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E14 - Motor de pedidos e entrega confiável. Resultado esperado: Um único motor para todos os canais, com confirmação e histórico.

Referências específicas: CT-06 a CT-09; J04, J10, J11, J14.

IDs principais: CAT 020; CHAN 002; ORD 001-006, 008-010; REP 002-007; SET 004

Vistas relacionadas a evoluir/revisar: CAT 010; CHAN 001; FLOOR 008.

### Entregue

1. Implemente Order, OrderLine, OrderSubmission, snapshots de produto/preço/opções, revisão e comandos de envio, acréscimo, cancelamento e transferência.
2. Calcule disponibilidade e valores no servidor; diferencie rascunho local, pedido aceito pelo servidor e recebimento no destino de produção.
3. Grave pedido, evento e outbox na mesma transação. Repetição do mesmo comando recebe a mesma resposta; payload diferente com a mesma chave é conflito.
4. Implemente rota de consulta por command_id, concorrência otimista e eventos duráveis por agregado. Novas rodadas adicionam linhas; não reescrevem envios anteriores.
5. Entregue fila/detalhe de pedidos, histórico operacional, busca de falhas e cancelamento propagável ao KDS.
6. Implemente relatórios operacionais REP-002 a REP-007 sobre pedidos, produtos, canais, horários e mesas, distinguindo valor operacional de receita liquidada.
7. Implemente combos/menus fechados com escolhas por curso, preço fixo e componentes identificáveis. Não some o preço do combo e de seus componentes duas vezes.

### Respeite

1. Preço e dados recebidos do navegador são propostas; valores oficiais vêm do catálogo e da política do servidor.
2. Pedido e preparo têm estados diferentes de saldo, pagamento e documento fiscal. Cancelar preparo não efetua refund.
3. Não prometa entrega exatamente uma vez na rede. Implemente entrega repetível com efeitos de negócio deduplicados.

### Critérios de aceite

1. Timeout depois do commit e reenvio com a mesma chave criam apenas um pedido/envio.
2. Dois operadores acrescentam itens sem apagar o trabalho um do outro; versão incompatível retorna conflito recuperável.
3. Publicar novo preço não altera linhas já aceitas; item esgotado é rejeitado com carrinho preservado.

Atualize docs/progress/E14.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
