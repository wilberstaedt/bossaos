# E26 - Fornecedores e compras

**Enviar para:** Codex  
**Depende de:** E25  
**Entrega:** Compra, recebimento e custos ligados ao estoque.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E26 - Fornecedores e compras. Resultado esperado: Compra, recebimento e custos ligados ao estoque.

Referências específicas: CT-12; SUP/PUR.

IDs principais: PUR 001-004; SUP 001-002

### Entregue

1. Implemente fornecedores, catálogo de fornecimento e condições como dados configuráveis.
2. Crie pedido de compra em rascunho, aprovação por papel, envio registrado, recebimento parcial/total e cancelamento.
3. Vincule cada recebimento a movimentos de entrada de estoque, custo e lote quando o escopo cadastrado exigir.
4. Trate divergência entre solicitado/recebido e devolução ao fornecedor com histórico e motivo.
5. Prepare integração com despesas/contas a pagar sem marcar uma compra como paga ao recebê-la.

### Respeite

1. Receber mercadoria não é pagar fornecedor; mantenha estados logístico e financeiro separados.
2. Repetir recebimento não aumenta estoque duas vezes; preço/custo deve guardar moeda e unidade.
3. Envio real a fornecedor por email ou outra integração requer destinatário e autorização operacional configurados.

### Critérios de aceite

1. Compra com dois recebimentos parciais fecha exatamente a quantidade prevista e registra diferenças explícitas.
2. Usuário sem alçada não aprova a própria exceção de compra.
3. Cancelar saldo restante não apaga entradas já recebidas nem movimentos associados.

Atualize docs/progress/E26.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
