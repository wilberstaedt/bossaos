# E22 - TPV, contas e caixa

**Enviar para:** Codex  
**Depende de:** E21  
**Entrega:** Contas, valores e caixa Pro com trilha de operações.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E22 - TPV, contas e caixa. Resultado esperado: Contas, valores e caixa Pro com trilha de operações.

Referências específicas: CT-11; J08, J09.

IDs principais: FLOOR 010; ORD 007; POS 001-004, 006, 009-011, 014-019; STAFF 015-016, 020

Vistas relacionadas a evoluir/revisar: CAT 010; FLOOR 008, 011.

### Entregue

1. Implemente Bill, BillLine/Allocation, ajustes, totais e relação com pedidos/sessões. Suporte balcão, conta por mesa e consolidação controlada.
2. Implemente divisão por item, pessoa ou valor, desconto e cortesia com alçada, motivo e regras de arredondamento.
3. Crie caixa, turno, fundo, entrada/saída, contagem, divergência e fechamento; movimentos são imutáveis e correções geram novos registros.
4. Entregue telas TPV, visão de caixa e recebimento em dinheiro para sandbox, com cálculo de recebido/troco e eventos financeiros.
5. Integre transferir itens/contas, solicitar autorização e encerrar mesa somente quando a regra de saldo e serviço permitir.

### Respeite

1. Use CT-11 para cálculos; somatório das partes deve ser exatamente o total. Itens já liquidados não podem ser movidos silenciosamente.
2. Desconto/estorno não reescrevem a venda original; void de operação não capturada difere de refund.
3. Operação real de venda/documento fica sujeita ao marco fiscal E24; recibo de demonstração não é documento fiscal.

### Critérios de aceite

1. Dividir 10,00 EUR em três partes distribui centavos deterministicamente e soma 10,00 EUR.
2. Pagamento e transferência concorrentes não liquidam duas vezes nem movem parcela já paga.
3. Contagem, troco, divergência e fechamento reproduzem a ledger; caixa não fecha silenciosamente com operações pendentes.

Atualize docs/progress/E22.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
