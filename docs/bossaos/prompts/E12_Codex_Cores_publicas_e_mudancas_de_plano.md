# E12 - Cores públicas e mudanças de plano

**Enviar para:** Codex  
**Depende de:** E11  
**Entrega:** Personalização Restaurant/Pro com prévia, validação e retorno ao Starter.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E12 - Cores públicas e mudanças de plano. Resultado esperado: Personalização Restaurant/Pro com prévia, validação e retorno ao Starter.

Referências específicas: CT-02, CT-13; manual p.20.

IDs principais: THEME 002-008

Vistas relacionadas a evoluir/revisar: ORG 014.

### Entregue

1. Implemente ThemeDraft, ThemeRevision e publicação de primária/acento/fundo nas superfícies públicas elegíveis.
2. Crie editor e previews mobile/desktop sobre a mesma carta; calcule pares de contraste e bloqueie combinações inválidas antes de salvar/publicar.
3. Mostre herança de marca e eventual override de unidade explicitamente. Só permita uma publicação por revisão e registre responsável e destinos.
4. Implemente upgrade, mudança efetiva de tema no downgrade e restauração do tema anterior ao recuperar o direito contratado.
5. Exercite os exemplos visuais Restaurant e Pro com dados de demonstração sem alterar LP, administração, estados ou operação.

### Respeite

1. Restaurant e Pro têm a mesma capacidade de cores; não venda tipografia ou layout livre que não foi acordado.
2. Starter tem autorização de leitura do tema efetivo e edição do próprio conteúdo, sem endpoint alternativo para salvar cores.
3. Não injete CSS recebido do cliente. Alertas, foco e componentes permanecem do design system.

### Critérios de aceite

1. THEME-001 a THEME-008 têm estados reais e representam o tema efetivamente aplicado.
2. Publicar cor ilegível falha no servidor; tentativa de aplicar tema a outra unidade não autorizada falha.
3. Downgrade reverte a aparência na data de teste, preserva conteúdo e permite restaurar a versão anterior após upgrade.

Atualize docs/progress/E12.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
