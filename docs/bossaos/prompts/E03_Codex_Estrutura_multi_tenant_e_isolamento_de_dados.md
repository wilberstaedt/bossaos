# E03 - Estrutura multi-tenant e isolamento de dados

**Enviar para:** Codex  
**Depende de:** E02  
**Entrega:** Núcleo de organizações, marcas e unidades com isolamento verificável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E03 - Estrutura multi-tenant e isolamento de dados. Resultado esperado: Núcleo de organizações, marcas e unidades com isolamento verificável.

Referências específicas: CT-03 a CT-05.

IDs principais: Etapa transversal: não cria ID de tela independente.

### Entregue

1. Implemente Organization, Brand, Location e as relações de escopo previstas. Use IDs opacos e referências compostas que impeçam associar recursos de organizações diferentes.
2. Crie resolução de TenantContext no servidor e repositórios que o exijam. O ID informado na URL apenas seleciona o alvo; nunca concede autorização.
3. Implemente políticas do PostgreSQL e transações contextualizadas conforme CT-04. Separe acesso de migração, runtime, autenticação global e leitura pública publicada.
4. Defina chaves de cache, prefixos de arquivos, eventos e tarefas com contexto de organização/unidade. Adicione fixtures de dois tenants com nomes e produtos semelhantes.
5. Prepare autorização como porta explícita para E04; enquanto não houver autenticação real, exponha somente testes locais e nenhuma rota de dados privados desprotegida.

### Respeite

1. Toda linha de domínio tenant contém organization_id e escopo específico quando aplicável. Identidade global e catálogo de planos são exceções documentadas.
2. Conexões do pool não podem conservar contexto entre requisições. Sem contexto válido, negar acesso.
3. Não use uma conta superuser da aplicação para fazer os testes de isolamento passarem.

### Critérios de aceite

1. Com a credencial real de runtime, tente ler, editar, exportar e relacionar dados de A usando B: todas as operações indevidas falham.
2. Reutilize conexão após commit e rollback; não pode restar contexto anterior.
3. Jobs, cache e referências de arquivos dos fixtures mantêm os tenants separados.

Atualize docs/progress/E03.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
