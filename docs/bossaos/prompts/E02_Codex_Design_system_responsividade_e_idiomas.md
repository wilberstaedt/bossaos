# E02 - Design system, responsividade e idiomas

**Enviar para:** Codex  
**Depende de:** E01  
**Entrega:** Componentes e estruturas visuais reutilizáveis, fiéis à marca BossaOS.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E02 - Design system, responsividade e idiomas. Resultado esperado: Componentes e estruturas visuais reutilizáveis, fiéis à marca BossaOS.

Referências específicas: CT-13; manual pp. 15-20; atlas pp. 2-4.

IDs principais: STATE 001-003, 005, 007, 016

### Entregue

1. Implemente tokens de marca, superfície, texto e estados, com Rubik e Noto Sans locais e licenças. Use BossaOS escrito; não reutilize o símbolo rejeitado.
2. Crie botões, campos, seletores, tabs, cards, tabelas adaptáveis, diálogos, drawers, avisos, notificações e estados transversais. Estabeleça catálogo de componentes para inspeção.
3. Monte estruturas distintas para LP, administração, cliente, Staff e KDS/TPV; use componentes sem duplicar lógica de negócio. Não preencha dashboards com números inventados.
4. Prepare i18n da interface em es-ES, pt-BR e en; espanhol inicial. Separe texto de interface de tradução de produtos e use formatação regional de moeda/data.
5. Documente quais vistas do atlas viram página, tab, modal ou estado. Componentes de demonstração devem ficar fora das rotas comerciais.

### Respeite

1. Tema público do restaurante só poderá alterar tokens permitidos; estados, foco, grade, tipografia e administração usam o sistema fixo.
2. Padrões internos de toque: 44 px no público e 48 px na operação. Mantenha teclado, foco, labels, erros associados e preferências de movimento.
3. Resolva conteúdo extenso com hierarquia e rolagem adequada, nunca encolhendo a versão desktop inteira para o celular.

### Critérios de aceite

1. Inspecione 360, 390, 768, 1280 e 1440 px, zoom e conteúdo ES/PT/EN longo; não deve haver conteúdo ou ação inacessível.
2. Valide contraste, foco em diálogo e retorno ao acionador em componentes representativos.
3. Compare visualmente com manual pp. 15-20 e atlas; registre capturas desktop/mobile e ajustes necessários.

Atualize docs/progress/E02.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
