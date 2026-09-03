# E17 - Pedido por QR e atendimento do cliente

**Enviar para:** Codex  
**Depende de:** E16  
**Entrega:** Pedido de mesa pelo cliente integrado ao mesmo motor e à equipe.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E17 - Pedido por QR e atendimento do cliente. Resultado esperado: Pedido de mesa pelo cliente integrado ao mesmo motor e à equipe.

Referências específicas: CT-06, CT-09; J03.

IDs principais: MENU 006-013, 018, 020; QR 002, 005-007; STATE 009-010

### Entregue

1. Implemente QR por mesa, revogação/rotação, entrada em sessão ativa e credenciais de visitante com escopo limitado.
2. Crie configuração de produto, carrinho, revisão, envio, confirmação, acompanhamento, indisponibilidade e sessão encerrada.
3. Use os comandos idempotentes existentes; revalide preço, opções, disponibilidade, horário e entitlement no envio.
4. Implemente chamar equipe e pedir conta com limites de frequência, deduplicação e confirmação de atendimento.
5. Permita atendimento tradicional em paralelo. Antes do Pro, a experiência não mostra pagamento integrado disponível.

### Respeite

1. Foto de QR não comprova presença física. Use abertura de sessão pela equipe e código de serviço/aceite local conforme CT-09.
2. Visitante vê seus pedidos e informações de sessão explicitamente autorizadas, nunca dados pessoais de outros clientes ou histórico de serviços anteriores.
3. QR expirado não apaga carrinho; não é permitido reenviar para uma nova mesa sem confirmação explícita.

### Critérios de aceite

1. J03 percorre QR, envio, cozinha/bar, pronto e servido com o mesmo Order.
2. QR revogado, sessão encerrada, limite de abuso e preço atualizado têm respostas úteis e seguras.
3. Envio repetido e pedido simultâneo do garçom não duplicam itens; consulta Starter continua separada.

Atualize docs/progress/E17.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
