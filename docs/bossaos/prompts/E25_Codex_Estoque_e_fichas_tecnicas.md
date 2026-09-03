# E25 - Estoque e fichas técnicas

**Enviar para:** Codex  
**Depende de:** E24  
**Entrega:** Estoque por unidade com movimentos rastreáveis e consumo por receita.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E25 - Estoque e fichas técnicas. Resultado esperado: Estoque por unidade com movimentos rastreáveis e consumo por receita.

Referências específicas: CT-12; J10.

IDs principais: INV 001-012

Vistas relacionadas a evoluir/revisar: CAT 017.

### Entregue

1. Implemente insumos, locais, unidades/conversões explícitas, saldos, movimentos, contagens, ajustes, perdas e alertas.
2. Crie receitas versionadas, rendimento, componentes/modificadores e custo calculado a partir de valores conhecidos.
3. No primeiro início de preparo, registre consumo idempotente da receita capturada para o item; itens sem preparo usam o ponto de baixa definido em CT-12.
4. Integre disponibilidade derivada com flag e reserva de estoque quando habilitada; preserve política manual para unidades sem controle de estoque.
5. Entregue trilha de saldo e relatório de variância; versões antigas de receita continuam ligadas ao consumo histórico.
6. Implemente transferência entre unidades como saída, trânsito e recebimento vinculados, verificando autorização nas duas pontas e impedindo contagem dupla.

### Respeite

1. Não some kg, litros e unidades sem conversão cadastrada. Valor desconhecido de custo não equivale a zero.
2. Cancelamento antes de produzir libera reserva; depois de consumir exige perda/devolução registrada, sem estorno automático de ingrediente já usado.
3. Recall de KDS e replay de evento não podem consumir duas vezes.
4. Subreceitas não podem ter ciclos. Capturar a revisão ao aceitar o pedido; reservar estoque atomicamente quando a política impedir venda sem saldo.

### Critérios de aceite

1. Saldo recomposto pelos movimentos corresponde ao saldo materializado.
2. Receita alterada após início do preparo não modifica consumo anterior.
3. J10 bloqueia novas vendas do item esgotado nos canais configurados e preserva pedidos já aceitos.

Atualize docs/progress/E25.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
