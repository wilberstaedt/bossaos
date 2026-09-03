# E34 - Revisão Pro e cobertura integral

**Enviar para:** Claude  
**Depende de:** E33  
**Entrega:** Auditoria final de funcionalidade, dados, interfaces e dependências.

## Prompt para copiar

Revise esta etapa da BossaOS com as instruções locais, fontes, contrato e handoff disponíveis. Baseie conclusões em evidência. Sem acesso ao repositório, entregue documentos com caminhos e conteúdo, sem alegar que salvou arquivos ou executou testes.

Etapa autorizada agora: E34 - Revisão Pro e cobertura integral. Resultado esperado: Auditoria final de funcionalidade, dados, interfaces e dependências.

Referências específicas: CT-15 a CT-19; gate G3.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010.

### Entregue

1. Revise E22-E33 com código, testes e preview; execute J08/J09/J12/J14/J15 e a regressão das jornadas anteriores.
2. Confira a matriz de 396 IDs: cada um precisa de composição real, desktop/mobile, papel, plano, estados e evidência; IDs bloqueados por fornecedor continuam bloqueados.
3. Revise invariantes de saldo, reembolso, estoque, reservas, acesso e deduplicação com cenários concorrentes, não apenas telas de sucesso.
4. Confira acessibilidade, ES/PT/EN, limites de conteúdo, grandes listas e ausência de dados fictícios em experiências reais.
5. Produza docs/reviews/E34.md, tabela final de pendências, escopo habilitável e correções pelo A02; não aprove partes cujo teste não foi executado.

### Respeite

1. Cobertura de design não significa cobertura funcional; uma tab vazia ou botão sem efeito não conta como entregue.
2. Revisão não pode remover testes pertinentes ou requisitos para aparentar conclusão.
3. Conformidade fiscal, hardware e conta de pagamento são validados pelo processo/provedor aplicável, não certificados por esta revisão.

### Critérios de aceite

1. 360 IDs originais e 36 adicionais estão presentes sem duplicidade; todos têm estado honesto de implementação.
2. Nenhuma falha bloqueante no escopo a liberar permanece; pendências externas têm efeito e responsável.
3. Jornadas e saldos conferem em base de teste conhecida e o Starter permanece íntegro.

Entregue documentos, evidências, limites e handoff. Revisão documental não comprova software validado. Encaminhe correções de código ao Codex em lista delimitada.
