# E01 - Repositório, ambiente e verificação contínua

**Enviar para:** Codex  
**Depende de:** E00  
**Entrega:** Projeto executável localmente, com instalação reproduzível e primeira CI.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E01 - Repositório, ambiente e verificação contínua. Resultado esperado: Projeto executável localmente, com instalação reproduzível e primeira CI.

Referências específicas: CT-03, CT-14, CT-18.

IDs principais: Etapa transversal: não cria ID de tela independente.

### Entregue

1. Leia o handoff de E00 e as instruções locais. Inicialize ou adapte o workspace sem apagar trabalho existente: apps/web, apps/worker e packages para domínio, banco e UI compartilhados.
2. Configure TypeScript estrito, Next.js App Router em runtime Node, gerenciador de pacotes e dependências nas versões do ADR. Fixe lockfile e versão do runtime.
3. Crie ambiente de desenvolvimento com PostgreSQL e serviço de email de teste; prepare configuração de storage local compatível com a porta de mídia. Separe credenciais de migração das credenciais de execução.
4. Implemente health/readiness, validação de variáveis de ambiente, logs com request_id e dados sensíveis redigidos. Adicione .env.example com nomes e exemplos inofensivos.
5. Configure scripts de lint, tipos, testes, build e migrações; CI executa verificações explicitamente. Documente instalação, comandos e solução para dependência externa ausente.

### Respeite

1. Não gere 396 rotas vazias nem menus de módulos inexistentes. Esta entrega é a base executável.
2. Não inclua segredos, contas reais ou endpoints de produção em seeds. Integrações de desenvolvimento devem ser identificáveis.
3. Uma falha de infraestrutura deve retornar indisponibilidade real; não simular banco saudável.

### Critérios de aceite

1. Instalação pelo lockfile e build completam; lint e verificação de tipos são executados separadamente.
2. Uma migração de exemplo controlada funciona em banco descartável; runtime não tem privilégios de alterar o schema.
3. Configuração obrigatória ausente falha com mensagem útil, sem revelar credenciais.

Atualize docs/progress/E01.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
