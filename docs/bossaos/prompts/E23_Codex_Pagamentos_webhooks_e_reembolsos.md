# E23 - Pagamentos, webhooks e reembolsos

**Enviar para:** Codex  
**Depende de:** E22  
**Entrega:** Integração de pagamento com saldo e confirmação confiáveis.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E23 - Pagamentos, webhooks e reembolsos. Resultado esperado: Integração de pagamento com saldo e confirmação confiáveis.

Referências específicas: CT-06, CT-11, CT-19; J08, J14.

IDs principais: INT 005; MENU 014-016; POS 005, 007-008, 013, 022-023; STAFF 019; STATE 011

### Entregue

1. Integre um provedor escolhido por ADR e disponível em sandbox usando PaymentAttempt, Payment, Allocation e Refund separados da preparação do pedido.
2. Implemente pagamento por cartão, misto, QR/mobile, gorjeta opcional e limites para pagamentos parciais.
3. Verifique assinatura, contexto da conta/unidade e deduplicação de webhooks. Eventos fora de ordem devem ser reconciliados com o estado autorizado do provedor.
4. Implemente estados pendente/processando/confirmado/falhou, consulta de status, timeout indeterminado e reconciliação antes de nova cobrança.
5. Crie refund parcial/total com permissão e limite de saldo reembolsável; sincronize recibos informativos, caixa, mesa e histórico.

### Respeite

1. Retorno do navegador não prova pagamento. Não armazene PAN/CVV e não exponha segredos de provedor ao cliente.
2. Não presuma que a conta do SaaS pode receber vendas dos restaurantes. Registre modelo de titularidade/onboarding do comerciante antes de cobrança real.
3. Sem credenciais, implemente porta e testes determinísticos, marque integração pendente e não declare pagamento real pronto.

### Critérios de aceite

1. Webhook repetido, fora de ordem e callback atrasado não duplicam cobrança nem saldo.
2. Dois clientes pagando a última parcela não geram sobrepagamento sem reconciliação explícita.
3. Refund parcial repetido é idempotente e nunca supera o valor capturado menos refunds confirmados.

Atualize docs/progress/E23.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
