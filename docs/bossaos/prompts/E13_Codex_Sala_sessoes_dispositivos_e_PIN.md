# E13 - Sala, sessões, dispositivos e PIN

**Enviar para:** Codex  
**Depende de:** E12  
**Entrega:** Operação de mesas com identidade de unidade e dispositivo confiável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E13 - Sala, sessões, dispositivos e PIN. Resultado esperado: Operação de mesas com identidade de unidade e dispositivo confiável.

Referências específicas: CT-04, CT-08, CT-09.

IDs principais: AUTH 002; DEV 001-004; FLOOR 001-009, 011; ONB 007; SET 003

Vistas relacionadas a evoluir/revisar: ORG 008; SET 010.

### Entregue

1. Implemente áreas, mesas, capacidade, posicionamento, combinações permitidas e estados operacionais.
2. Crie TableSession independente da mesa física: abrir, atribuir responsável, transferir, iniciar encerramento e limpeza, com histórico.
3. Implemente pareamento com token de uso único, prazo, aprovação de gerente, escopo por unidade/estação e revogação.
4. Habilite PIN como troca rápida de operador dentro de dispositivo previamente confiável; implemente limitação de tentativas e bloqueio.
5. Integre onboarding de zonas/dispositivos e configuração de tipos de serviço; prepare relação com reservas sem criar ocupações fictícias.

### Respeite

1. PIN curto sozinho não autentica na internet nem concede privilégio de owner. A estação limita o que o dispositivo pode fazer.
2. Uma mesa não pode ter sessões ativas incompatíveis; transferência é transacional e preserva referência dos pedidos.
3. No Restaurant, fechamento operacional pode registrar resolução externa autorizada; não registrar isso como pagamento processado pela BossaOS.

### Critérios de aceite

1. Duas aberturas concorrentes da mesma mesa produzem uma única sessão ativa.
2. Revogar dispositivo encerra acesso e impede novos comandos, inclusive com PIN correto.
3. Transferência mantém origem/destino e ocupação coerentes; arquivamento respeita sessões abertas.

Atualize docs/progress/E13.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
