# E24 - Documentos e integração fiscal

**Enviar para:** Codex  
**Depende de:** E23  
**Entrega:** Fronteira fiscal implementada e dependências reais verificáveis.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E24 - Documentos e integração fiscal. Resultado esperado: Fronteira fiscal implementada e dependências reais verificáveis.

Referências específicas: CT-11, CT-19; POS/INT fiscal.

IDs principais: CAT 021; INT 006; POS 012, 020-021

Vistas relacionadas a evoluir/revisar: CAT 010; MENU 016.

### Entregue

1. Revise a documentação oficial aplicável ao país e à entidade do piloto e registre data, fontes e escopo em ADR fiscal; não reutilize prazos legais antigos dos materiais.
2. Implemente FiscalDocument, fila de emissão, mapeamento de impostos, vínculo com transações, estados de resposta e correções conforme contrato do provedor escolhido.
3. Integre geração/consulta/reimpressão do documento autorizado, dados do cliente quando necessários e separação de recibo informativo.
4. Crie diagnóstico de rejeição, retry deduplicado e conciliação pedido/pagamento/documento. Dados históricos não podem ser silenciosamente reemitidos com novos valores.
5. Entregue checklist de integração real, exemplos de sandbox e critérios de habilitação por unidade.

### Respeite

1. Não invente certificação, conformidade, numeração legal, prazo de obrigação ou API de VERI*FACTU. Cite fontes oficiais e o contrato efetivo do provedor.
2. Sem fornecedor/credenciais/requisitos confirmados, conclua contratos e testes disponíveis e mantenha emissão real bloqueada, sem declarar essa parte concluída.
3. Cobrança da assinatura BossaOS é outro domínio e não usa o documento fiscal da venda do restaurante.

### Critérios de aceite

1. Repetir emissão do mesmo fato não gera documento fiscal duplicado.
2. Rejeição e indisponibilidade do provedor preservam venda/pagamento e geram pendência visível.
3. O marco Pro informa precisamente o que foi validado em sandbox, o que foi validado externamente e o que segue pendente.

Atualize docs/progress/E24.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
