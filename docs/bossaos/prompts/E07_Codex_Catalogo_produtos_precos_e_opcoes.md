# E07 - Catálogo, produtos, preços e opções

**Enviar para:** Codex  
**Depende de:** E06  
**Entrega:** Catálogo de marca reutilizável entre canais e unidades.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E07 - Catálogo, produtos, preços e opções. Resultado esperado: Catálogo de marca reutilizável entre canais e unidades.

Referências específicas: CT-05 a CT-07.

IDs principais: CAT 001-013, 016-019, 022

### Entregue

1. Implemente menus, categorias, produtos, ordenação, variantes, grupos de modificadores e escolhas min/max com referências ao mesmo produto.
2. Modele preços por moeda, unidade e canal, com precedência explícita e origem/override visível. Guarde valores monetários sem ponto flutuante.
3. Implemente biblioteca de alérgenos, estados de revisão e informação por produto, incluindo desconhecido. Separe preferência alimentar de declaração de segurança.
4. Crie disponibilidade manual e agendada, visibilidade por canal e arquivamento. O catálogo editável é rascunho; publicação acontece na E08.
5. Entregue listas, busca, filtros e formulários relevantes em desktop/mobile, com validação de servidor e conflitos de versão.

### Respeite

1. Um produto é da marca dentro do tenant e é referenciado por canais; não crie tabelas independentes de produtos para menu, Staff ou TPV.
2. Editar base de marca deve mostrar as unidades afetadas; override local não pode alterar a base silenciosamente.
3. Ausência de dados sobre alérgenos não significa ausência de alérgenos. Não gere declarações a partir de nomes/fotos.

### Critérios de aceite

1. Dois canais apontam para o mesmo produto; alteração em rascunho não muda a versão pública.
2. Escolhas obrigatórias e limites de modificadores são validados também por chamada direta da API.
3. Overrides, preços com centavos, arquivamento e edição concorrente preservam a integridade do catálogo.

Atualize docs/progress/E07.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
