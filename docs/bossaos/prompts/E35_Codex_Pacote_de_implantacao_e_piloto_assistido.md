# E35 - Pacote de implantação e piloto assistido

**Enviar para:** Codex  
**Depende de:** E34  
**Entrega:** Entrega operacional revisável para habilitar o primeiro restaurante.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E35 - Pacote de implantação e piloto assistido. Resultado esperado: Entrega operacional revisável para habilitar o primeiro restaurante.

Referências específicas: CT-17, CT-19; gate G4.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010.

### Entregue

1. Prepare configuração de produção, migrações revisadas, backups, restauração ensaiada, monitoramento e runbooks de falha/rollback.
2. Monte importação real assistida como dry-run, conferência de produtos/preços/idiomas/alérgenos e lista de dados que a responsável precisa validar.
3. Crie roteiro de treinamento por papel e testes de QR, Staff, cozinha/bar, reservas, caixa e hardware conforme os módulos liberados.
4. Prepare plano de entrada progressiva: Starter, operação Restaurant e Pro somente após seus critérios. Defina como retornar ao sistema anterior sem duplicar pedidos/vendas.
5. Entregue docs/releases/pilot.md com versão, ambiente, migrações, evidências, funcionalidades habilitadas, pendências e ação de ativação pronta para revisão.

### Respeite

1. Execute o que estiver autorizado no ambiente disponível. Não interprete preparação do piloto como autorização automática para cobrar, enviar campanha ou substituir a operação real.
2. Não prometa RPO/RTO sem medição: proponha objetivos e anexe o resultado real do ensaio de restauração.
3. Na falta de credencial/hardware/provedor, finalize o pacote local e marque apenas a ativação correspondente como pendente.

### Critérios de aceite

1. Uma base de backup é restaurada em ambiente isolado e permite verificar amostra de catálogo/pedidos/saldos.
2. Fluxo principal e contingência foram ensaiados por papel, com instruções compreensíveis para a equipe.
3. A decisão de entrada em produção pode ser tomada com uma entrega concreta, sem novas suposições de produto.

Atualize docs/progress/E35.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
