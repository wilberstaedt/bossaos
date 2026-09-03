# E15 - Staff PWA e funcionamento degradado

**Enviar para:** Codex  
**Depende de:** E14  
**Entrega:** Fluxo do garçom em celular, com recuperação de conexão compreensível.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E15 - Staff PWA e funcionamento degradado. Resultado esperado: Fluxo do garçom em celular, com recuperação de conexão compreensível.

Referências específicas: CT-08, CT-09, CT-13; J04, J13.

IDs principais: SET 008; STAFF 001-014, 017-018, 022-024; STATE 004, 008, 015

Vistas relacionadas a evoluir/revisar: FLOOR 006, 008, 011.

### Entregue

1. Implemente turno, zonas, mesas, catálogo, opções, revisão, envio de novos itens, acompanhamento, cursos, notas e cancelamento autorizado.
2. Crie solicitações de atendimento/conta, confirmação de retirada e busca rápida; integre identidade do operador e sessão da mesa.
3. Implemente PWA e fila local mínima particionada por identidade, organização e unidade; comandos pendentes conservam IDs e versões.
4. Mostre não enviado, aguardando confirmação, confirmado e conflito. Ao reconectar, consulte comandos antes de tentar novamente.
5. Mantenha leitura útil e rascunhos offline; bloqueie ações financeiras, transferências conflitantes e conclusões que precisam de confirmação do servidor.

### Respeite

1. Som ou toast não substitui estado persistente. Nunca mostre enviado se só gravou o comando no dispositivo.
2. Troca de tenant/usuário não expõe rascunhos nem dispara fila antiga. Sessão expirada exige reautenticação antes de sincronizar.
3. Pagamentos e alterações de saldo seguem Pro; Restaurant continua capaz de resolver o serviço externo conforme CT-08.

### Critérios de aceite

1. J04 e J13 funcionam com perda de rede antes e depois do envio, refresh e reconexão.
2. Pedido simultâneo de cliente e garçom conserva origens e itens sem duplicidade.
3. O fluxo essencial cabe no celular com toque amplo; falhas e cancelamentos são claros em ES/PT/EN.

Atualize docs/progress/E15.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
