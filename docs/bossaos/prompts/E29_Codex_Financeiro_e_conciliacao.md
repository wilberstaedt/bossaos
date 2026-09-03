# E29 - Financeiro e conciliação

**Enviar para:** Codex  
**Depende de:** E28  
**Entrega:** Visão financeira baseada em registros efetivos e diferenças explicadas.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E29 - Financeiro e conciliação. Resultado esperado: Visão financeira baseada em registros efetivos e diferenças explicadas.

Referências específicas: CT-11, CT-12; FIN.

IDs principais: FIN 001-011

Vistas relacionadas a evoluir/revisar: SET 012.

### Entregue

1. Implemente despesas, categorias, contas a pagar/receber, taxas, repasses e conciliação por unidade.
2. Separe venda, recebimento, estorno, taxa, repasse e movimentação de caixa; use os registros dos módulos anteriores.
3. Crie importação de extrato com preview, identificação de duplicados, correspondências sugeridas e confirmação humana para divergências.
4. Entregue fluxo de caixa, margens quando houver custos conhecidos, detalhe dos valores e exportações.
5. Defina política de fechamento/reabertura financeira e trilha de ajustes, sem transformar o módulo em contabilidade legal completa.

### Respeite

1. Não some valores de moedas diferentes como se fossem uma moeda única; agrupe ou use conversão com fonte/data e política explícitas.
2. Valor de pedidos Restaurant resolvidos externamente não é recebimento processado pelo sistema.
3. Despesa, imposto e taxa são campos/configurações; não invente percentuais ou regras fiscais.

### Critérios de aceite

1. Totais permitem chegar às transações de origem e batem com saldos por período.
2. Extrato repetido não duplica lançamentos; divergência permanece pendente até ação autorizada.
3. Refund, taxa e repasse em datas diferentes aparecem no período e no conceito corretos.

Atualize docs/progress/E29.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
