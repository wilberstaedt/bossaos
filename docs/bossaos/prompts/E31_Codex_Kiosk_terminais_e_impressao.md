# E31 - Kiosk, terminais e impressão

**Enviar para:** Codex  
**Depende de:** E30  
**Entrega:** Canais em dispositivos dedicados com hardware e limites explícitos.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E31 - Kiosk, terminais e impressão. Resultado esperado: Canais em dispositivos dedicados com hardware e limites explícitos.

Referências específicas: CT-09, CT-11, CT-19; KIOSK/DEV.

IDs principais: DEV 005-006; KDS 016; KIOSK 001-008

Vistas relacionadas a evoluir/revisar: CHAN 001-002; KDS 015; POS 023.

### Entregue

1. Implemente início, idioma, menu, opções, carrinho, checkout, número/status e reinício de sessão do kiosk.
2. Reutilize motores de pedido/pagamento e entitlements. Apague dados do cliente no fim/inatividade sem perder confirmação de operação em curso.
3. Integre impressora/bridge por contrato de dispositivo, fila idempotente, destino, teste, erro e diagnóstico.
4. Conclua fallback KDS e impressão de conta/documento adequado ao módulo fiscal; reimpressão deve ser distinguível de novo pedido.
5. Prepare matriz de homologação com modelo, navegador/SO, conexão, leitura/legibilidade, corte/impressão e resultado físico verificado.

### Respeite

1. Não presuma que impressora local aceita chamada direta do navegador nem que equipamento das fotos é compatível.
2. Sem hardware real, entregue simulador/contrato e checklist pendente, sem declarar homologação.
3. Kiosk offline não captura pagamento nem promete pedido confirmado; reset não abandona cobrança indeterminada.

### Critérios de aceite

1. Dois clientes consecutivos não compartilham carrinho, dados ou sessão de pagamento.
2. Reenvio à impressora não produz comanda nova em duplicidade; falha de confirmação fica visível.
3. Teste físico, quando possível, tem evidência por modelo; todos os demais ficam explicitamente pendentes.

Atualize docs/progress/E31.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
