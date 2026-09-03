# E19 - Reserva pública, host e lista de espera

**Enviar para:** Codex  
**Depende de:** E18  
**Entrega:** Jornadas completas de reserva e recepção com comunicação rastreável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E19 - Reserva pública, host e lista de espera. Resultado esperado: Jornadas completas de reserva e recepção com comunicação rastreável.

Referências específicas: CT-10, CT-14; J06, J07.

IDs principais: INT 004; PUB 003; REP 008; RES-B 001-011, 017-019; RES-C 001-010; SET 009

Vistas relacionadas a evoluir/revisar: FLOOR 006.

### Entregue

1. Implemente as etapas públicas: pessoas/data, horários, contato, preferências, revisão, confirmação, gestão e falta de disponibilidade.
2. Entregue agenda, calendário, timeline, edição manual, chegada, alocação, sentar, finalizar, cancelamento e no-show no host.
3. Integre walk-in e waitlist com status, convite, expiração e reserva de capacidade coerente; estimativas são informadas como estimativas.
4. Implemente templates transacionais, fila de mensagens, resultado por provedor, histórico e reenvio deduplicado.
5. Adicione relatório de reservas com definições de covers, ocupação, cancelamento, origem e no-show. Mensageria externa só fica ativa quando configurada.

### Respeite

1. Disponibilidade da tela nunca substitui verificação de servidor. Preferência de zona não vira garantia sem alocação confirmada.
2. A reserva é válida mesmo se o email falhar; a interface mostra os dois estados separadamente.
3. Não envie mensagens a clientes reais durante testes. Use ambiente de teste e destinos controlados.

### Critérios de aceite

1. J06 e J07 percorrem confirmação, chegada, mesa e sessão; cancelamento libera capacidade corretamente.
2. Mensagem duplicada ou atrasada não duplica a reserva nem reabre waitlist expirada.
3. Link de gestão não permite consultar outra reserva ou mudar para unidade não autorizada.

Atualize docs/progress/E19.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
