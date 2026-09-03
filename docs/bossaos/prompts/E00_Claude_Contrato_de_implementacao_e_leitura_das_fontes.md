# E00 - Contrato de implementação e leitura das fontes

**Enviar para:** Claude  
**Depende de:** fontes deste pacote  
**Entrega:** Contrato revisado, decisões registradas e handoff para iniciar o repositório.

## Prompt para copiar

Revise esta etapa da BossaOS com as instruções locais, fontes, contrato e handoff disponíveis. Baseie conclusões em evidência. Sem acesso ao repositório, entregue documentos com caminhos e conteúdo, sem alegar que salvou arquivos ou executou testes.

Etapa autorizada agora: E00 - Contrato de implementação e leitura das fontes. Resultado esperado: Contrato revisado, decisões registradas e handoff para iniciar o repositório.

Referências específicas: CT-01 a CT-20; todos os três PDFs.

IDs principais: Etapa transversal: não cria ID de tela independente.

### Entregue

1. Leia os três PDFs em docs/bossaos/fontes e os arquivos CONTRATO_TECNICO.md, DECISOES.md, MODELO_DADOS_STARTER.md, API_STARTER.md, MATRIZ_PERMISSOES.csv, CRITERIOS_DE_ACEITE.md, FASES.md e COBERTURA_TELAS.csv. Confira os 360 IDs originais e os 36 complementares.
2. Preserve o que já está decidido. Revise a proposta técnica: monólito modular, Next.js/TypeScript, PostgreSQL, Drizzle, Better Auth e um worker Node. Verifique versões estáveis compatíveis em documentação oficial e registre links, data, versões exatas e licenças em docs/architecture/versions.md.
3. Produza docs/architecture/overview.md, domain-model.md, permissions.md, api-contracts.md, state-machines.md e adr/0001-foundation.md. Especifique campos, chaves, índices, escopos e contratos físicos apenas do núcleo e do Starter; mantenha fronteiras e contratos de integração para módulos futuros.
4. Revise as rotas sugeridas no CSV. Um ID pode ser aba, diálogo ou estado; agrupe sem apagar IDs. Registre ajustes de composição e divergências explícitas entre os PDFs.
5. Escreva docs/progress/E00.md e docs/progress/HANDOFF.md com a decisão técnica, riscos concretos, dependências de produção e instrução exata para E01.

### Respeite

1. Esta etapa produz documentação, sem iniciar a aplicação. Se houver repositório, leia as instruções e a stack existentes antes de propor mudanças. Não reescreva AGENTS.md nem CLAUDE.md para contornar regras.
2. Logo continua provisória. Preços, limites comerciais, domínio, provedor fiscal, terminais e contratação de serviços continuam decisões externas identificadas; não os invente nem use isso para bloquear decisões locais reversíveis.
3. Se algum PDF não puder ser lido, registre nome e parte faltante e solicite apenas esse material. Sem acesso ao repositório, entregue os arquivos com seus caminhos e conteúdo, sem dizer que os salvou.

### Critérios de aceite

1. Todos os IDs do CSV têm uma etapa e uma composição de rota; nenhum foi declarado implementado.
2. O modelo distingue organização/marca/unidade, catálogo/publicação, pedido/preparo/pagamento e cobrança SaaS/venda do restaurante.
3. E01 tem insumos suficientes para começar sem redefinir produto, identidade visual ou planos.

Entregue documentos, evidências, limites e handoff. Revisão documental não comprova software validado. Encaminhe correções de código ao Codex em lista delimitada.
