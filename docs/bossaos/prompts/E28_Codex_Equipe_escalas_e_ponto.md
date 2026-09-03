# E28 - Equipe, escalas e ponto

**Enviar para:** Codex  
**Depende de:** E27  
**Entrega:** Rotina da equipe separada de identidade e permissões do sistema.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E28 - Equipe, escalas e ponto. Resultado esperado: Rotina da equipe separada de identidade e permissões do sistema.

Referências específicas: CT-12, CT-14; HR.

IDs principais: HR 001-011

### Entregue

1. Implemente EmployeeProfile associado opcionalmente ao usuário, vínculos de unidade, funções operacionais e status.
2. Crie escalas, disponibilidade, ausências, turnos, trocas e conflitos de horário.
3. Implemente entrada, pausa, retorno e saída com registro de origem e confirmação; correções exigem motivo e preservam lançamento original.
4. Entregue visão própria do funcionário e gestão por responsável, incluindo relatório de horas e exportação.
5. Integre revogação de acesso ao desligamento sem apagar histórico e sem confundir pausa de turno com logout.

### Respeite

1. Não implemente folha, cálculo trabalhista ou retenções legais presumidas. Exportações e prazos seguem política verificada da operação.
2. Não use biometria, localização contínua ou vigilância não solicitada.
3. Relatórios de equipe devem indicar contexto operacional e permitir revisão de dados incorretos.

### Critérios de aceite

1. Dois registros simultâneos de entrada não abrem dois turnos ativos incompatíveis.
2. Turno atravessando meia-noite/horário de verão calcula duração corretamente.
3. Funcionário consulta apenas dados próprios e responsáveis apenas unidades autorizadas.

Atualize docs/progress/E28.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
