# E30 - Analytics, relatórios e gestão multiunidade

**Enviar para:** Codex  
**Depende de:** E29  
**Entrega:** Indicadores com definições explícitas e comparação autorizada.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E30 - Analytics, relatórios e gestão multiunidade. Resultado esperado: Indicadores com definições explícitas e comparação autorizada.

Referências específicas: CT-12, CT-15; J12; REP.

IDs principais: CAT 028; REP 010-017

Vistas relacionadas a evoluir/revisar: ORG 002-004; REP 001.

### Entregue

1. Conclua relatórios de vendas, produtos, canais, horários, mesas, reservas, KDS, pagamentos, estoque, compras, CRM, marketing e equipe.
2. Reutilize os relatórios básicos já entregues; diferencie métrica operacional Restaurant de receita/recebimento Pro.
3. Implemente visão HQ por marcas/unidades, filtros de timezone, moeda, período e estado. Calcule médias ponderadas quando necessário.
4. Implemente visões salvas, exportações assíncronas e origem rastreável dos indicadores, com controle de escopo.
5. Conclua clonagem controlada de menu/configuração entre unidades ou marcas, preview de diferenças e políticas comerciais de expansão.

### Respeite

1. Dashboard vazio mostra ausência de dados; nunca acrescente métricas de demonstração em tenant real.
2. Não consolide dados de organizações distintas porque o mesmo usuário pertence às duas.
3. Agendamento externo de relatórios só envia após configuração explícita de destinatários e permissões.

### Critérios de aceite

1. Métrica exibida confere com amostra conhecida e permite rastrear filtros e definição.
2. J12 cria unidade elegível sem copiar pedidos/clientes e sem perder herança de catálogo.
3. Consolidado respeita autorização, moeda e denominadores; exportação usa os mesmos filtros da tela.

Atualize docs/progress/E30.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
