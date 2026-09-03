# E16 - KDS de cozinha, barra e expo

**Enviar para:** Codex  
**Depende de:** E15  
**Entrega:** Produção por estação e acompanhamento do pedido inteiro.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E16 - KDS de cozinha, barra e expo. Resultado esperado: Produção por estação e acompanhamento do pedido inteiro.

Referências específicas: CT-08, CT-09; J05.

IDs principais: KDS 001-015; ONB 008; REP 009; SET 005-006; STATE 012

### Entregue

1. Implemente roteamento por item/modificador/estação e tickets de produção ligados aos envios confirmados.
2. Crie filas principal e backlog, expandir ticket, preparar, hold/fire, pronto, prioridade com motivo, recall e histórico.
3. Implemente expo consolidando itens de estações distintas, pronto parcial/completo, retirada e serviço sem confundir estados.
4. Distribua atualizações autenticadas com cursor e recuperação por snapshot; eventos repetidos ou fora de ordem não fazem a tela regredir.
5. Inclua heartbeat, alerta de estação offline, temporizadores de servidor, all-day counts e configuração de limite visual/som. Prepare fallback de impressão com adaptador e status verdadeiro.
6. Entregue REP-009 com tempos de produção por estação, amostra e definição do intervalo medido.

### Respeite

1. Limite de cinco tickets é apenas visual/configurável; todos os pedidos permanecem visíveis no backlog e persistidos.
2. Cozinha não recebe bebida roteada apenas para barra. Um prato pode ter tarefas em mais de uma estação quando a regra definir.
3. Impressão não se considera concluída por simples envio à fila; deduplicação e confirmação do bridge serão verificadas na E31.

### Critérios de aceite

1. J05 opera dois destinos, conclusão parcial e retirada; pedido não desaparece por limite da tela.
2. Desconectar KDS e reconectar recupera o estado sem ticket perdido ou comando duplicado.
3. Cancelamento durante preparo aparece com motivo; operador sem permissão não muda prioridade nem outra estação.

Atualize docs/progress/E16.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
