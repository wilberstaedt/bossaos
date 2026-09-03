# E06 - Onboarding e configuração do restaurante

**Enviar para:** Codex  
**Depende de:** E05  
**Entrega:** Primeiro tenant configurável, com marca, unidade, horários e checklist.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E06 - Onboarding e configuração do restaurante. Resultado esperado: Primeiro tenant configurável, com marca, unidade, horários e checklist.

Referências específicas: CT-05, CT-07, CT-17.

IDs principais: ONB 001-003, 010; ORG 001-006, 015; SET 001-002; STATE 013

### Entregue

1. Implemente criação idempotente de organização, primeira marca e primeira unidade, perfil e contatos. Use La Societat apenas como fixture demonstrativa identificada.
2. Configure país, moeda da unidade, timezone IANA, idioma principal, horários semanais, exceções e serviços atravessando meia-noite.
3. Permita editar perfis, navegar entre marcas/unidades autorizadas, arquivar com dependências visíveis e retomar onboarding interrompido.
4. Adapte checklist ao plano: Starter não exige mesas, KDS, pedidos nem contratação de provedor de pagamento para publicar a carta.
5. Integre usuários/permissões e plano já existentes; mantenha endereços, contatos e horários ilustrativos fora de qualquer publicação real.

### Respeite

1. Moeda não é alterada retroativamente em transações; mudança de timezone não reinterpreta timestamps antigos.
2. A estrutura multiunidade existe em todos os planos; criação adicional verifica a concessão contratada e consolidação gerencial é Pro.
3. Arquivamento não apaga histórico e deve impedir novos serviços de forma controlada.

### Critérios de aceite

1. Repetir criação após timeout não duplica organização/unidade.
2. Horário 20:00-01:00 e exceção de feriado produzem aberto/fechado corretamente no fuso configurado.
3. Onboarding Starter pode chegar ao passo de catálogo sem exigir etapas Restaurant/Pro.

Atualize docs/progress/E06.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
