# E21 - Revisão operacional do Restaurant

**Enviar para:** Claude  
**Depende de:** E20  
**Entrega:** Parecer sobre operação coordenada e recuperação de falhas.

## Prompt para copiar

Revise esta etapa da BossaOS com as instruções locais, fontes, contrato e handoff disponíveis. Baseie conclusões em evidência. Sem acesso ao repositório, entregue documentos com caminhos e conteúdo, sem alegar que salvou arquivos ou executou testes.

Etapa autorizada agora: E21 - Revisão operacional do Restaurant. Resultado esperado: Parecer sobre operação coordenada e recuperação de falhas.

Referências específicas: CT-15 a CT-17; gate G2.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010; REP 001.

### Entregue

1. Revise E12-E20 no código e no preview com evidências. Execute as jornadas J03-J07 e J10-J14 aplicáveis ao Restaurant.
2. Confira o mesmo pedido passando por Staff/QR, servidor, cozinha/bar, expo e mesa, incluindo acréscimo, cancelamento e perda de conexão.
3. Revise reservas concorrentes, walk-ins, mesas combinadas, transferência de sessão, revogação de dispositivo e limites por papel.
4. Confira personalização pública e identidade fixa da operação; valide celular do garçom e legibilidade da tela de cozinha no ambiente previsto.
5. Produza docs/reviews/E21.md com evidências, falhas bloqueantes, correções e ensaio de contingência; encaminhe correções ao Codex pelo A02.

### Respeite

1. Nenhum pedido pode sumir por limite visual, fila local ou reconexão. Nenhum rascunho deve ser chamado de enviado.
2. Sem hardware físico verificado, descreva o limite do ensaio. Não declare a impressora/TV homologada por funcionar no navegador.
3. A operação Restaurant deve encerrar atendimento com registro de resolução externa, sem simular módulos financeiros Pro.

### Critérios de aceite

1. Não há perda/duplicação de pedido, vazamento de tenant ou overbooking no cenário concorrente verificado.
2. Estado de erro de estação e plano de contingência são visíveis à equipe.
3. Starter continua funcionando após introdução dos módulos operacionais.

Entregue documentos, evidências, limites e handoff. Revisão documental não comprova software validado. Encaminhe correções de código ao Codex em lista delimitada.
