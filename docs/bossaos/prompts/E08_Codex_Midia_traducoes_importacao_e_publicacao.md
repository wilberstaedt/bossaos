# E08 - Mídia, traduções, importação e publicação

**Enviar para:** Codex  
**Depende de:** E07  
**Entrega:** Conteúdo revisável e publicações atômicas com histórico.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E08 - Mídia, traduções, importação e publicação. Resultado esperado: Conteúdo revisável e publicações atômicas com histórico.

Referências específicas: CT-07, CT-14, CT-17.

IDs principais: CAT 014-015, 023-027; ONB 005-006; SET 012

### Entregue

1. Implemente uploads por tenant, validação de tipo/tamanho, tratamento seguro, texto alternativo e substituição sem quebrar referências publicadas.
2. Crie editor de traduções ES/PT/EN e estrutura para outros idiomas, estados pendente/revisado e revisão após mudança no texto de origem. Adaptador automático gera sugestões; ausência de provedor mantém edição manual.
3. Implemente importação CSV/XLSX com mapeamento, dry-run, erros por linha, detecção de duplicados e confirmação; exportação exige escopo e elimina fórmulas perigosas.
4. Crie MenuRevision/Publication, preview autenticado, comparação antes/depois, publicação por destino e agendamento. Publique por transação e invalide somente caches afetados.
5. Inicie worker/outbox para tarefas de publicação, mídia e tradução, com retry, histórico e observabilidade. Restauração cria nova revisão.

### Respeite

1. Preview e arquivos ainda privados não são indexáveis nem compartilháveis por URL adivinhável.
2. Pedidos futuros guardarão snapshots; uma publicação nunca reescreve pedidos existentes.
3. Dados sem preço válido ou com revisão obrigatória pendente geram bloqueio claro; não invente conteúdo para passar no checklist.

### Critérios de aceite

1. Falha no meio da publicação mantém a versão anterior inteira disponível.
2. Importação repetida não duplica SKUs quando a estratégia escolhida é atualizar; prévia mostra alterações.
3. Tradução obsoleta é sinalizada; arquivos de outro tenant e URLs externas não autorizadas não podem ser importados.

Atualize docs/progress/E08.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
