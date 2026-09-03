# E18 - Motor de reservas e capacidade concorrente

**Enviar para:** Codex  
**Depende de:** E17  
**Entrega:** Disponibilidade baseada em mesas, duração e ocupação real.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E18 - Motor de reservas e capacidade concorrente. Resultado esperado: Disponibilidade baseada em mesas, duração e ocupação real.

Referências específicas: CT-10; J06, J07.

IDs principais: RES-B 012-016; SET 007

### Entregue

1. Modele Reservation, Allocation, ServiceWindow, CapacityRule, Block e WaitlistEntry; compartilhe ocupação com TableSession e walk-ins.
2. Implemente horários, duração, buffer, antecedência, exceções, zonas e combinações permitidas de mesas.
3. Calcule disponibilidade para o intervalo inteiro e faça confirmação/reagendamento em transação com serialização de capacidade por unidade.
4. Use timestamps UTC e regras de timezone da unidade; trate intervalos atravessando dia e mudanças de horário de verão.
5. Crie endpoints para consulta, confirmar, gerir por token limitado, cancelar e registrar no-show; prepare dados das interfaces de E19.

### Respeite

1. Consultar um horário não garante a vaga. Revalide capacidade no commit e devolva alternativas quando houver disputa.
2. Mesa combinada não pode reservar a própria capacidade e a de seus componentes duas vezes.
3. Marketing é opcional e separado do contato necessário à reserva. Depósito fica desligado até integração e política específicas.

### Critérios de aceite

1. Duas solicitações concorrentes pela última capacidade só produzem uma reserva confirmada.
2. Reserva de grupo, walk-in, bloqueio e buffer afetam corretamente os mesmos recursos.
3. Reagendar sem capacidade mantém a reserva anterior íntegra; testes cobrem horário ambíguo/inexistente.

Atualize docs/progress/E18.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
