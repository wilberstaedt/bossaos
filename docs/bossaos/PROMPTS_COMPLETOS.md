# BossaOS - Prompts para Claude e Codex

Versão 1.0 - 02/09/2026


Este pacote transforma os três PDFs de produto/marca/interfaces em uma execução por etapas. Ele contém documentação e prompts; não contém a aplicação construída.

## Comece aqui

1. Extraia o pacote e coloque a pasta `docs/bossaos` no repositório do projeto, preservando arquivos e instruções já existentes. Se ainda não há repositório, mantenha os documentos juntos para E00 e deixe E01 criá-lo.
2. Envie **E00 ao Claude** com os três PDFs de `fontes/`, o contrato, as decisões e a matriz de cobertura. Os documentos de dados/API/permissões já oferecem a proposta inicial; Claude confere e fecha os detalhes físicos antes do scaffold.
3. Leve o resultado de E00 ao mesmo projeto. Se o Claude trabalha só no chat, copie/salve os arquivos retornados nos caminhos indicados. Uma resposta de chat não altera o repositório sozinha.
4. Envie **A00 ao Codex uma vez** para contexto inicial e depois **E01**. Continue uma etapa por vez, conforme `FASES.md`.
5. Em **E11, E21 e E34**, envie o prompt ao Claude junto do código/evidências. Para corrigir, envie **A02 ao Codex**. **A01** permite revisão adicional de qualquer entrega; **A03** retoma uma sessão interrompida.

Não é preciso esperar a logo final. Use o wordmark BossaOS e a identidade já definida. Não cole todos os prompts de uma vez e não peça a criação de todas as telas em uma única execução.

## O que está pronto neste pacote

- Contrato técnico com planos, domínio, segurança, publicação, pedidos, reservas, pagamentos e regras visuais.
- Modelo inicial de dados, contratos de API e matriz de permissões.
- Matriz com os 360 IDs originais e 36 complementares, cada um ligado à etapa e à composição sugerida.
- 36 etapas, mais 4 prompts auxiliares, em Markdown para copiar.
- Os três PDFs originais e o novo guia em PDF.

## Marcos

- **G1 / E11:** piloto Starter - catálogo, carta, QR, site e LP. Cobrança automática e suporte avançado ainda têm etapas próprias.
- **G2 / E21:** operação Restaurant - equipe, pedidos, KDS, reservas e retirada.
- **G3 / E34:** gestão Pro e cobertura do escopo validado, com integrações pendentes declaradas.
- **G4 / E35:** implantação assistida. Pode ser preparado antes para o escopo Starter já validado.

## Referências e estado

Os PDFs ilustram o produto completo; não são evidência de software pronto. `COBERTURA_TELAS.csv` começa inteiramente como `planejado`. Preserve essa matriz de referência e acompanhe execução em `docs/progress/coverage.csv`.

Nome, marca e regras de cores são decisões da conversa. Stack e defaults de domínio deste pacote são propostas técnicas executáveis; mudanças justificadas são registradas em ADR, sem inventar aprovação anterior. Preços, domínio, provedores e hardware são resolvidos no momento de habilitar a capacidade correspondente.

## Documentos

Leia `CONTRATO_TECNICO.md`, `DECISOES.md`, `MODELO_DADOS_STARTER.md`, `API_STARTER.md`, `MATRIZ_PERMISSOES.csv`, `CRITERIOS_DE_ACEITE.md`, `FASES.md` e `DEPENDENCIAS_EXTERNAS.md`. Os arquivos em `templates/` são modelos de acompanhamento, não resultados já executados.


# Prompts auxiliares

## A00 - Contexto inicial do executor

**Destino:** Codex

Você vai implementar a BossaOS no repositório em etapas. Leia as instruções locais, docs/bossaos/README.md se existir, docs/bossaos/CONTRATO_TECNICO.md, DECISOES.md, FASES.md, COBERTURA_TELAS.csv e o handoff E00. Localize também os três PDFs de referência em docs/bossaos/fontes.

As decisões de produto são BossaOS; multi-tenant; Starter/Restaurant/Pro; catálogo único; tema fixo em LP/admin/operação/Starter; cores públicas personalizáveis desde Restaurant. O símbolo da logo não está aprovado. Use wordmark, Rubik/Noto Sans e a paleta documentada.

Inspecione o repositório, estado Git, runtime e decisões existentes. Preserve trabalho do usuário. Copie a matriz de referência para docs/progress/coverage.csv para acompanhar implementação, sem marcar nada como pronto antes da evidência. Não modifique instruções locais para remover bloqueios ou requisitos.

Execute somente a etapa que eu enviar, mantendo contratos compartilhados. Faça backend e interface reais do escopo, com testes focados nos riscos. Demonstrações não substituem persistência nem integração real. Sem acesso a um arquivo, diga qual falta e avance apenas no que estiver fundamentado.

Ao encerrar cada etapa, registre docs/progress/E##.md e HANDOFF.md: alterações, IDs, migrações, comandos e resultados, capturas quando úteis, limitações, pendências e próxima etapa. Não execute automaticamente as 36 etapas. Não considere esta mensagem autorização para publicar, cobrar, enviar campanhas ou substituir a operação real; respeite a autorização efetivamente dada na sessão.

Responda com o contexto localizado, eventuais conflitos concretos e a primeira etapa apta a executar. Não comece um scaffold nesta mensagem de contexto; o próximo prompt será E01.

---

## A01 - Revisar uma entrega do Codex

**Destino:** Claude

Revise a última etapa registrada em docs/progress/HANDOFF.md. Compare a versão/arquivos indicados com o prompt da etapa, o contrato BossaOS, os PDFs e a matriz de cobertura. Faça revisão independente baseada em evidência disponível.

Para cada achado, informe requisito/ID, arquivo ou comportamento, cenário de reprodução, consequência e correção delimitada. Priorize acesso entre tenants, autorização, perda/duplicação de pedidos, capacidade, saldo, publicação e uso principal. Diferencie falha de requisito de preferência estética.

Leia testes e, se tiver ambiente, execute apenas verificações pertinentes ao risco. Sem código ou preview, classifique o resultado como revisão documental; não afirme que testou. Não reescreva arquitetura, amplie escopo ou remova critério para fazer a etapa passar.

Entregue docs/reviews/<etapa>.md com: resultado aprovado/correções necessárias/verificação incompleta; evidências; achados bloqueantes e não bloqueantes; lista de correções com aceite; limites da revisão. Indique se a próxima etapa pode começar. Esta revisão não edita o código; encaminhe as correções ao Codex.

---

## A02 - Corrigir achados sem reiniciar a etapa

**Destino:** Codex

Leia docs/progress/HANDOFF.md, a revisão mais recente em docs/reviews e o prompt da etapa correspondente. Verifique que os achados se aplicam ao estado atual do repositório; preserve mudanças posteriores e trabalho do usuário.

Corrija os problemas reproduzíveis dentro do escopo. Se discordar de um achado, apresente evidência concreta e o requisito correspondente; não o descarte por preferência. Não troque stack, refaça módulos aprovados ou suprima validações/testes relevantes para encerrar a revisão.

Faça a menor mudança coerente que resolva a causa. Execute verificação focada e a regressão necessária ao risco alterado. Atualize o registro da etapa, a matriz de cobertura e o handoff com arquivos, resultados e pendências.

Entregue uma tabela achado -> correção -> evidência -> status. Informe a versão/commit ou estado de trabalho revisável. Se falta credencial, dados ou equipamento, conclua o que for verificável e indique exatamente a capacidade ainda bloqueada. Não avance para outra etapa automaticamente.

---

## A03 - Retomar em outra conversa ou sessão

**Destino:** Claude ou Codex

Retome a BossaOS pelo estado atual do projeto. Leia as instruções locais, docs/bossaos/CONTRATO_TECNICO.md, DECISOES.md, FASES.md, docs/progress/HANDOFF.md, o registro da etapa aberta e a revisão mais recente, se houver.

Confira arquivos e estado Git antes de agir. Identifique a última etapa validada, a etapa aberta, mudanças ainda não registradas, dependências e próxima ação concreta. Não confunda a matriz de referência com evidência de implementação.

Preserve nome, paleta, regras de plano, tenant, APIs e decisões já registradas. Não reinicie scaffold nem refaça trabalho concluído. Se faltar referência essencial, peça o arquivo específico, sem fazer o usuário repetir toda a história.

Se seu papel é Codex executor, continue apenas a menor pendência da etapa autorizada. Se é Claude revisor, revise o material dessa etapa e entregue achados; não edite o mesmo código ao mesmo tempo que o executor. Se o papel não estiver indicado no handoff ou na mensagem, faça a leitura e explique qual ação está pronta, sem inventar execução.

Atualize o handoff com evidência do que foi realmente feito e do que continua aberto. Relate testes executados e não executados separadamente.

# Etapas de construção

| Etapa | Destino | Entrega | IDs principais |
| --- | --- | --- | --- |
| E00 | Claude | Contrato de implementação e leitura das fontes | 0 |
| E01 | Codex | Repositório, ambiente e verificação contínua | 0 |
| E02 | Codex | Design system, responsividade e idiomas | 6 |
| E03 | Codex | Estrutura multi-tenant e isolamento de dados | 0 |
| E04 | Codex | Autenticação, convites e permissões | 12 |
| E05 | Codex | Planos, entitlements e identidade Starter | 12 |
| E06 | Codex | Onboarding e configuração do restaurante | 14 |
| E07 | Codex | Catálogo, produtos, preços e opções | 18 |
| E08 | Codex | Mídia, traduções, importação e publicação | 10 |
| E09 | Codex | Carta pública e QR de consulta | 11 |
| E10 | Codex | Sites dos restaurantes e landing page BossaOS | 29 |
| E11 | Claude | Revisão do Starter e primeiro marco utilizável | 0 |
| E12 | Codex | Cores públicas e mudanças de plano | 7 |
| E13 | Codex | Sala, sessões, dispositivos e PIN | 17 |
| E14 | Codex | Motor de pedidos e entrega confiável | 18 |
| E15 | Codex | Staff PWA e funcionamento degradado | 23 |
| E16 | Codex | KDS de cozinha, barra e expo | 20 |
| E17 | Codex | Pedido por QR e atendimento do cliente | 16 |
| E18 | Codex | Motor de reservas e capacidade concorrente | 6 |
| E19 | Codex | Reserva pública, host e lista de espera | 28 |
| E20 | Codex | Takeaway e delivery | 7 |
| E21 | Claude | Revisão operacional do Restaurant | 0 |
| E22 | Codex | TPV, contas e caixa | 19 |
| E23 | Codex | Pagamentos, webhooks e reembolsos | 12 |
| E24 | Codex | Documentos e integração fiscal | 5 |
| E25 | Codex | Estoque e fichas técnicas | 12 |
| E26 | Codex | Fornecedores e compras | 6 |
| E27 | Codex | CRM, fidelidade e campanhas | 14 |
| E28 | Codex | Equipe, escalas e ponto | 11 |
| E29 | Codex | Financeiro e conciliação | 11 |
| E30 | Codex | Analytics, relatórios e gestão multiunidade | 9 |
| E31 | Codex | Kiosk, terminais e impressão | 11 |
| E32 | Codex | Integrações, API e cobrança do SaaS | 13 |
| E33 | Codex | Administração da plataforma, suporte e governança | 19 |
| E34 | Claude | Revisão Pro e cobertura integral | 0 |
| E35 | Codex | Pacote de implantação e piloto assistido | 0 |

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

---

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

---

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

---

# E03 - Estrutura multi-tenant e isolamento de dados

**Enviar para:** Codex  
**Depende de:** E02  
**Entrega:** Núcleo de organizações, marcas e unidades com isolamento verificável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E03 - Estrutura multi-tenant e isolamento de dados. Resultado esperado: Núcleo de organizações, marcas e unidades com isolamento verificável.

Referências específicas: CT-03 a CT-05.

IDs principais: Etapa transversal: não cria ID de tela independente.

### Entregue

1. Implemente Organization, Brand, Location e as relações de escopo previstas. Use IDs opacos e referências compostas que impeçam associar recursos de organizações diferentes.
2. Crie resolução de TenantContext no servidor e repositórios que o exijam. O ID informado na URL apenas seleciona o alvo; nunca concede autorização.
3. Implemente políticas do PostgreSQL e transações contextualizadas conforme CT-04. Separe acesso de migração, runtime, autenticação global e leitura pública publicada.
4. Defina chaves de cache, prefixos de arquivos, eventos e tarefas com contexto de organização/unidade. Adicione fixtures de dois tenants com nomes e produtos semelhantes.
5. Prepare autorização como porta explícita para E04; enquanto não houver autenticação real, exponha somente testes locais e nenhuma rota de dados privados desprotegida.

### Respeite

1. Toda linha de domínio tenant contém organization_id e escopo específico quando aplicável. Identidade global e catálogo de planos são exceções documentadas.
2. Conexões do pool não podem conservar contexto entre requisições. Sem contexto válido, negar acesso.
3. Não use uma conta superuser da aplicação para fazer os testes de isolamento passarem.

### Critérios de aceite

1. Com a credencial real de runtime, tente ler, editar, exportar e relacionar dados de A usando B: todas as operações indevidas falham.
2. Reutilize conexão após commit e rollback; não pode restar contexto anterior.
3. Jobs, cache e referências de arquivos dos fixtures mantêm os tenants separados.

Atualize docs/progress/E03.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E04 - Autenticação, convites e permissões

**Enviar para:** Codex  
**Depende de:** E03  
**Entrega:** Acesso real com sessões, recuperação, convites e autorização por ação.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E04 - Autenticação, convites e permissões. Resultado esperado: Acesso real com sessões, recuperação, convites e autorização por ação.

Referências específicas: CT-04, CT-14 e matriz de papéis.

IDs principais: AUTH 001, 003-009; ONB 009; ORG 007-008; STATE 014

Vistas relacionadas a evoluir/revisar: SET 010-011.

### Entregue

1. Integre a biblioteca de autenticação do ADR: login, logout, verificação de email, recuperação, expiração/revogação de sessão e MFA.
2. Implemente Membership, RoleAssignment e resolução de permissões por organização, marca, unidade e estação. Garanta ações e escopos no servidor para páginas e APIs.
3. Crie convites de uso único com validade, aceitação autenticada, seleção de organização/unidade e proteção contra remoção do último owner.
4. Implemente as telas AUTH aplicáveis, gestão básica de usuários e perfil. PIN de operação só ficará disponível em dispositivo confiável na E13.
5. Audite concessões, revogações e acesso sensível; prepare suporte assistido sem conceder acesso global implícito à equipe da plataforma.

### Respeite

1. Não construa criptografia, recuperação ou armazenamento de senha próprios. MFA básico está disponível em todos os planos como decisão técnica registrada.
2. Convite não pode conceder escopo superior ao de quem convida. Marca/unidade e permissões são revalidadas após troca de contexto.
3. Reautenticação deve preservar apenas rascunho local seguro da mesma identidade, sem revelá-lo a outro operador.

### Critérios de aceite

1. Convite expirado, reutilizado ou com escopo adulterado não dá acesso.
2. Host não lê financeiro; cozinha só opera estação autorizada; usuário revogado perde acesso sem precisar limpar a página.
3. Recuperação e MFA funcionam no ambiente de teste e encerram sessões conforme a política registrada.

Atualize docs/progress/E04.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E05 - Planos, entitlements e identidade Starter

**Enviar para:** Codex  
**Depende de:** E04  
**Entrega:** Recursos comerciais controlados no servidor e tema Starter protegido.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E05 - Planos, entitlements e identidade Starter. Resultado esperado: Recursos comerciais controlados no servidor e tema Starter protegido.

Referências específicas: CT-02, CT-13, CT-19; THEME-001.

IDs principais: ONB 004; ORG 010, 013-014; PLAT 002-004, 006, 010-011; STATE 006; THEME 001

### Entregue

1. Modele PlanDefinition, Subscription, EntitlementGrant e limites configuráveis. Resolva plano, adicionais, overrides, validade e escopo da unidade por uma política única.
2. Implemente seleção e visão do plano, consumo, impacto de mudança e agendamento de downgrade. Permita provisionamento de piloto auditado, sem simular cobrança.
3. Crie controle interno mínimo de tenants e concessões para operar o piloto. A interface completa de suporte e plataforma vem na E33.
4. Implemente o tema padrão BossaOS no servidor e no cliente. Starter pode editar nome, logo, fotos e conteúdo, mas não a paleta.
5. Exponha bloqueios úteis por módulo e proteja as APIs correspondentes. Mantenha catálogo de recursos separado de flags de lançamento.

### Respeite

1. Não invente mensalidades, testes gratuitos, taxas ou limites quantitativos. Sem configuração comercial, habilite apenas a primeira unidade de piloto e bloqueie expansão não contratada.
2. Restaurant e Pro têm o mesmo direito de escolher cores públicas; o editor completo vem na E12.
3. Downgrade preserva dados e tema anterior; mudanças efetivas respeitam serviços ativos e a política CT-02.

### Critérios de aceite

1. Tentativa direta de alterar tema Starter ou usar módulo superior retorna negação coerente e não altera dados.
2. Entitlement expirado e flag desligada produzem respostas corretas, inclusive em job e rota direta.
3. Preview de downgrade corresponde ao tema e aos direitos aplicados na data de teste.

Atualize docs/progress/E05.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E06 - Onboarding e configuração do restaurante

**Enviar para:** Codex  
**Depende de:** E05  
**Entrega:** Primeiro tenant configurável, com marca, unidade, horários e checklist.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E06 - Onboarding e configuração do restaurante. Resultado esperado: Primeiro tenant configurável, com marca, unidade, horários e checklist.

Referências específicas: CT-05, CT-07, CT-17.

IDs principais: ONB 001-003, 010; ORG 001-006, 015; SET 001-002; STATE 013

### Entregue

1. Implemente criação idempotente de organização, primeira marca e primeira unidade, perfil e contatos. Use La Societat apenas como fixture demonstrativa identificada.
2. Configure país, moeda da unidade, timezone IANA, idioma principal, horários semanais, exceções e serviços atravessando meia-noite.
3. Permita editar perfis, navegar entre marcas/unidades autorizadas, arquivar com dependências visíveis e retomar onboarding interrompido.
4. Adapte checklist ao plano: Starter não exige mesas, KDS, pedidos nem contratação de provedor de pagamento para publicar a carta.
5. Integre usuários/permissões e plano já existentes; mantenha endereços, contatos e horários ilustrativos fora de qualquer publicação real.

### Respeite

1. Moeda não é alterada retroativamente em transações; mudança de timezone não reinterpreta timestamps antigos.
2. A estrutura multiunidade existe em todos os planos; criação adicional verifica a concessão contratada e consolidação gerencial é Pro.
3. Arquivamento não apaga histórico e deve impedir novos serviços de forma controlada.

### Critérios de aceite

1. Repetir criação após timeout não duplica organização/unidade.
2. Horário 20:00-01:00 e exceção de feriado produzem aberto/fechado corretamente no fuso configurado.
3. Onboarding Starter pode chegar ao passo de catálogo sem exigir etapas Restaurant/Pro.

Atualize docs/progress/E06.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

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

---

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

---

# E09 - Carta pública e QR de consulta

**Enviar para:** Codex  
**Depende de:** E08  
**Entrega:** Starter utilizável pelo cliente em celular e desktop.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E09 - Carta pública e QR de consulta. Resultado esperado: Starter utilizável pelo cliente em celular e desktop.

Referências específicas: CT-07, CT-13; J02.

IDs principais: CHAN 001; MENU 001-005, 019; QR 001, 003-004; REP 001

### Entregue

1. Implemente entrada da carta, idioma, categorias, busca, detalhe de produto, preços, variantes e informação revisada de alérgenos a partir da publicação.
2. Crie QR geral e exportação PNG/SVG/PDF com margem livre, destino validado e tamanho de impressão legível. Não use QR ilustrativo como código funcional.
3. Mantenha carta consultável fora do horário quando publicada; exiba horários e alternativas de atendimento. Starter não apresenta carrinho ou envio de pedidos.
4. Implemente links públicos estáveis por unidade e identificação adequada de restaurante, conteúdo e assinatura BossaOS.
5. Registre analytics básico de consulta por unidade/idioma/origem com minimização de dados, sem cookies de publicidade por padrão.

### Respeite

1. Rotas públicas leem apenas a projeção publicada e não revelam custos, SKUs internos, contatos privados ou catálogo oculto.
2. Cache inclui unidade, publicação, idioma e canal. Não misture conteúdo de tenants com nomes iguais.
3. O QR geral não concede sessão de mesa nem permissão de encomendar.

### Critérios de aceite

1. J02 funciona em desktop e celular; leia o QR exportado em dois dispositivos reais ou registre o teste físico pendente.
2. Trocar idioma, buscar e abrir produto preserva contexto; preço publicado corresponde ao catálogo selecionado.
3. Starter nega API de pedido e personalização mesmo com interface adulterada.

Atualize docs/progress/E09.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E10 - Sites dos restaurantes e landing page BossaOS

**Enviar para:** Codex  
**Depende de:** E09  
**Entrega:** Presença pública integrada e LP com conteúdo e formulários reais.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E10 - Sites dos restaurantes e landing page BossaOS. Resultado esperado: Presença pública integrada e LP com conteúdo e formulários reais.

Referências específicas: CT-07, CT-13, CT-14, CT-19; WEB/PUB/MKT.

IDs principais: INT 003; MKT 001-012; PUB 001-002, 004-006; WEB 001-011

### Entregue

1. Implemente editor de blocos estruturados para início, sobre, contato, eventos, links sociais, SEO e preview/publicação do site do restaurante.
2. Reutilize a carta publicada e condicione a reserva ao entitlement e à disponibilidade do módulo. Página de evento deve ter rota pública própria.
3. Implemente LP BossaOS: proposta, produto, planos sem valores inventados, implantação, FAQ, demonstração, confirmação e 404. Use o slogan e o wordmark existentes.
4. Grave solicitações de demonstração de forma persistente, com validação, controle de abuso e status coerente. Contato transacional não autoriza marketing.
5. Implemente verificação de domínio por adaptador, vínculo exclusivo com a unidade, SEO, sitemap e metadados. Sem infraestrutura real, a rota padrão funciona e domínio permanece pendente, sem SSL fictício.

### Respeite

1. Não publique depoimentos, resultados, logos de clientes, preços ou disponibilidade de funcionalidades que sejam apenas exemplos do atlas.
2. Nada de HTML/CSS/JavaScript arbitrário no construtor. Sanitize conteúdo e valide links externos.
3. bossaos.com e @bossaos são nomes pretendidos, sem posse ou disponibilidade presumida.

### Critérios de aceite

1. Salvar rascunho não muda o site público; publicação e retirada são consistentes entre páginas e navegação.
2. Lead válido é salvo uma vez e aparece no fluxo de acompanhamento; falha real não mostra mensagem de sucesso.
3. Um domínio já vinculado ou sem comprovação de controle não pode ser tomado por outro tenant.

Atualize docs/progress/E10.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E11 - Revisão do Starter e primeiro marco utilizável

**Enviar para:** Claude  
**Depende de:** E10  
**Entrega:** Parecer verificável sobre o Starter e lista delimitada de correções.

## Prompt para copiar

Revise esta etapa da BossaOS com as instruções locais, fontes, contrato e handoff disponíveis. Baseie conclusões em evidência. Sem acesso ao repositório, entregue documentos com caminhos e conteúdo, sem alegar que salvou arquivos ou executou testes.

Etapa autorizada agora: E11 - Revisão do Starter e primeiro marco utilizável. Resultado esperado: Parecer verificável sobre o Starter e lista delimitada de correções.

Referências específicas: CT-15 a CT-17; gate G1.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010.

### Entregue

1. Revise código, evidências e handoffs de E01-E10; use os PDFs como referência funcional e visual. Não aceite apenas a descrição do executor.
2. Percorra J01, J02 e J11: criar tenant, cadastrar/importar, revisar preço/idioma/alérgenos, publicar carta, gerar QR e publicar site.
3. Revise isolamento, permissões, Starter com cores fixas, edição de conteúdo do restaurante, acessibilidade, ES/PT/EN e integridade dos formulários.
4. Confira os IDs cuja etapa de conclusão vai até E11; identifique rotas ausentes, ações decorativas, dados fictícios em produção e estados sem tratamento.
5. Produza docs/reviews/E11.md com status por requisito, evidência e correção delimitada. Use A02 para o Codex corrigir; só aceite o marco após rechecagem das falhas.

### Respeite

1. Não refaça a arquitetura nem troque identidade visual por preferência pessoal. Mudanças devem resolver um problema demonstrado.
2. Sem acesso ao código/preview, marque a revisão como documental e liste o material necessário para concluir.
3. Marco aprovado significa pronto para piloto Starter no escopo verificado; não significa Restaurant/Pro ou operação fiscal concluídos.

### Critérios de aceite

1. Há evidência do mesmo fluxo completo em desktop e mobile e de um acesso cruzado entre tenants negado.
2. Nenhuma falha bloqueante de acesso, publicação, dados ou uso principal permanece aberta.
3. Dependências reais, como DNS ou revisão do conteúdo do restaurante, estão explícitas e não aparecem como concluídas.

Entregue documentos, evidências, limites e handoff. Revisão documental não comprova software validado. Encaminhe correções de código ao Codex em lista delimitada.

---

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

---

# E13 - Sala, sessões, dispositivos e PIN

**Enviar para:** Codex  
**Depende de:** E12  
**Entrega:** Operação de mesas com identidade de unidade e dispositivo confiável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E13 - Sala, sessões, dispositivos e PIN. Resultado esperado: Operação de mesas com identidade de unidade e dispositivo confiável.

Referências específicas: CT-04, CT-08, CT-09.

IDs principais: AUTH 002; DEV 001-004; FLOOR 001-009, 011; ONB 007; SET 003

Vistas relacionadas a evoluir/revisar: ORG 008; SET 010.

### Entregue

1. Implemente áreas, mesas, capacidade, posicionamento, combinações permitidas e estados operacionais.
2. Crie TableSession independente da mesa física: abrir, atribuir responsável, transferir, iniciar encerramento e limpeza, com histórico.
3. Implemente pareamento com token de uso único, prazo, aprovação de gerente, escopo por unidade/estação e revogação.
4. Habilite PIN como troca rápida de operador dentro de dispositivo previamente confiável; implemente limitação de tentativas e bloqueio.
5. Integre onboarding de zonas/dispositivos e configuração de tipos de serviço; prepare relação com reservas sem criar ocupações fictícias.

### Respeite

1. PIN curto sozinho não autentica na internet nem concede privilégio de owner. A estação limita o que o dispositivo pode fazer.
2. Uma mesa não pode ter sessões ativas incompatíveis; transferência é transacional e preserva referência dos pedidos.
3. No Restaurant, fechamento operacional pode registrar resolução externa autorizada; não registrar isso como pagamento processado pela BossaOS.

### Critérios de aceite

1. Duas aberturas concorrentes da mesma mesa produzem uma única sessão ativa.
2. Revogar dispositivo encerra acesso e impede novos comandos, inclusive com PIN correto.
3. Transferência mantém origem/destino e ocupação coerentes; arquivamento respeita sessões abertas.

Atualize docs/progress/E13.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E14 - Motor de pedidos e entrega confiável

**Enviar para:** Codex  
**Depende de:** E13  
**Entrega:** Um único motor para todos os canais, com confirmação e histórico.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E14 - Motor de pedidos e entrega confiável. Resultado esperado: Um único motor para todos os canais, com confirmação e histórico.

Referências específicas: CT-06 a CT-09; J04, J10, J11, J14.

IDs principais: CAT 020; CHAN 002; ORD 001-006, 008-010; REP 002-007; SET 004

Vistas relacionadas a evoluir/revisar: CAT 010; CHAN 001; FLOOR 008.

### Entregue

1. Implemente Order, OrderLine, OrderSubmission, snapshots de produto/preço/opções, revisão e comandos de envio, acréscimo, cancelamento e transferência.
2. Calcule disponibilidade e valores no servidor; diferencie rascunho local, pedido aceito pelo servidor e recebimento no destino de produção.
3. Grave pedido, evento e outbox na mesma transação. Repetição do mesmo comando recebe a mesma resposta; payload diferente com a mesma chave é conflito.
4. Implemente rota de consulta por command_id, concorrência otimista e eventos duráveis por agregado. Novas rodadas adicionam linhas; não reescrevem envios anteriores.
5. Entregue fila/detalhe de pedidos, histórico operacional, busca de falhas e cancelamento propagável ao KDS.
6. Implemente relatórios operacionais REP-002 a REP-007 sobre pedidos, produtos, canais, horários e mesas, distinguindo valor operacional de receita liquidada.
7. Implemente combos/menus fechados com escolhas por curso, preço fixo e componentes identificáveis. Não some o preço do combo e de seus componentes duas vezes.

### Respeite

1. Preço e dados recebidos do navegador são propostas; valores oficiais vêm do catálogo e da política do servidor.
2. Pedido e preparo têm estados diferentes de saldo, pagamento e documento fiscal. Cancelar preparo não efetua refund.
3. Não prometa entrega exatamente uma vez na rede. Implemente entrega repetível com efeitos de negócio deduplicados.

### Critérios de aceite

1. Timeout depois do commit e reenvio com a mesma chave criam apenas um pedido/envio.
2. Dois operadores acrescentam itens sem apagar o trabalho um do outro; versão incompatível retorna conflito recuperável.
3. Publicar novo preço não altera linhas já aceitas; item esgotado é rejeitado com carrinho preservado.

Atualize docs/progress/E14.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

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

---

# E16 - KDS de cozinha, barra e expo

**Enviar para:** Codex  
**Depende de:** E15  
**Entrega:** Produção por estação e acompanhamento do pedido inteiro.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E16 - KDS de cozinha, barra e expo. Resultado esperado: Produção por estação e acompanhamento do pedido inteiro.

Referências específicas: CT-08, CT-09; J05.

IDs principais: KDS 001-015; ONB 008; REP 009; SET 005-006; STATE 012

### Entregue

1. Implemente roteamento por item/modificador/estação e tickets de produção ligados aos envios confirmados.
2. Crie filas principal e backlog, expandir ticket, preparar, hold/fire, pronto, prioridade com motivo, recall e histórico.
3. Implemente expo consolidando itens de estações distintas, pronto parcial/completo, retirada e serviço sem confundir estados.
4. Distribua atualizações autenticadas com cursor e recuperação por snapshot; eventos repetidos ou fora de ordem não fazem a tela regredir.
5. Inclua heartbeat, alerta de estação offline, temporizadores de servidor, all-day counts e configuração de limite visual/som. Prepare fallback de impressão com adaptador e status verdadeiro.
6. Entregue REP-009 com tempos de produção por estação, amostra e definição do intervalo medido.

### Respeite

1. Limite de cinco tickets é apenas visual/configurável; todos os pedidos permanecem visíveis no backlog e persistidos.
2. Cozinha não recebe bebida roteada apenas para barra. Um prato pode ter tarefas em mais de uma estação quando a regra definir.
3. Impressão não se considera concluída por simples envio à fila; deduplicação e confirmação do bridge serão verificadas na E31.

### Critérios de aceite

1. J05 opera dois destinos, conclusão parcial e retirada; pedido não desaparece por limite da tela.
2. Desconectar KDS e reconectar recupera o estado sem ticket perdido ou comando duplicado.
3. Cancelamento durante preparo aparece com motivo; operador sem permissão não muda prioridade nem outra estação.

Atualize docs/progress/E16.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E17 - Pedido por QR e atendimento do cliente

**Enviar para:** Codex  
**Depende de:** E16  
**Entrega:** Pedido de mesa pelo cliente integrado ao mesmo motor e à equipe.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E17 - Pedido por QR e atendimento do cliente. Resultado esperado: Pedido de mesa pelo cliente integrado ao mesmo motor e à equipe.

Referências específicas: CT-06, CT-09; J03.

IDs principais: MENU 006-013, 018, 020; QR 002, 005-007; STATE 009-010

### Entregue

1. Implemente QR por mesa, revogação/rotação, entrada em sessão ativa e credenciais de visitante com escopo limitado.
2. Crie configuração de produto, carrinho, revisão, envio, confirmação, acompanhamento, indisponibilidade e sessão encerrada.
3. Use os comandos idempotentes existentes; revalide preço, opções, disponibilidade, horário e entitlement no envio.
4. Implemente chamar equipe e pedir conta com limites de frequência, deduplicação e confirmação de atendimento.
5. Permita atendimento tradicional em paralelo. Antes do Pro, a experiência não mostra pagamento integrado disponível.

### Respeite

1. Foto de QR não comprova presença física. Use abertura de sessão pela equipe e código de serviço/aceite local conforme CT-09.
2. Visitante vê seus pedidos e informações de sessão explicitamente autorizadas, nunca dados pessoais de outros clientes ou histórico de serviços anteriores.
3. QR expirado não apaga carrinho; não é permitido reenviar para uma nova mesa sem confirmação explícita.

### Critérios de aceite

1. J03 percorre QR, envio, cozinha/bar, pronto e servido com o mesmo Order.
2. QR revogado, sessão encerrada, limite de abuso e preço atualizado têm respostas úteis e seguras.
3. Envio repetido e pedido simultâneo do garçom não duplicam itens; consulta Starter continua separada.

Atualize docs/progress/E17.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E18 - Motor de reservas e capacidade concorrente

**Enviar para:** Codex  
**Depende de:** E17  
**Entrega:** Disponibilidade baseada em mesas, duração e ocupação real.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E18 - Motor de reservas e capacidade concorrente. Resultado esperado: Disponibilidade baseada em mesas, duração e ocupação real.

Referências específicas: CT-10; J06, J07.

IDs principais: RES-B 012-016; SET 007

### Entregue

1. Modele Reservation, Allocation, ServiceWindow, CapacityRule, Block e WaitlistEntry; compartilhe ocupação com TableSession e walk-ins.
2. Implemente horários, duração, buffer, antecedência, exceções, zonas e combinações permitidas de mesas.
3. Calcule disponibilidade para o intervalo inteiro e faça confirmação/reagendamento em transação com serialização de capacidade por unidade.
4. Use timestamps UTC e regras de timezone da unidade; trate intervalos atravessando dia e mudanças de horário de verão.
5. Crie endpoints para consulta, confirmar, gerir por token limitado, cancelar e registrar no-show; prepare dados das interfaces de E19.

### Respeite

1. Consultar um horário não garante a vaga. Revalide capacidade no commit e devolva alternativas quando houver disputa.
2. Mesa combinada não pode reservar a própria capacidade e a de seus componentes duas vezes.
3. Marketing é opcional e separado do contato necessário à reserva. Depósito fica desligado até integração e política específicas.

### Critérios de aceite

1. Duas solicitações concorrentes pela última capacidade só produzem uma reserva confirmada.
2. Reserva de grupo, walk-in, bloqueio e buffer afetam corretamente os mesmos recursos.
3. Reagendar sem capacidade mantém a reserva anterior íntegra; testes cobrem horário ambíguo/inexistente.

Atualize docs/progress/E18.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E19 - Reserva pública, host e lista de espera

**Enviar para:** Codex  
**Depende de:** E18  
**Entrega:** Jornadas completas de reserva e recepção com comunicação rastreável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E19 - Reserva pública, host e lista de espera. Resultado esperado: Jornadas completas de reserva e recepção com comunicação rastreável.

Referências específicas: CT-10, CT-14; J06, J07.

IDs principais: INT 004; PUB 003; REP 008; RES-B 001-011, 017-019; RES-C 001-010; SET 009

Vistas relacionadas a evoluir/revisar: FLOOR 006.

### Entregue

1. Implemente as etapas públicas: pessoas/data, horários, contato, preferências, revisão, confirmação, gestão e falta de disponibilidade.
2. Entregue agenda, calendário, timeline, edição manual, chegada, alocação, sentar, finalizar, cancelamento e no-show no host.
3. Integre walk-in e waitlist com status, convite, expiração e reserva de capacidade coerente; estimativas são informadas como estimativas.
4. Implemente templates transacionais, fila de mensagens, resultado por provedor, histórico e reenvio deduplicado.
5. Adicione relatório de reservas com definições de covers, ocupação, cancelamento, origem e no-show. Mensageria externa só fica ativa quando configurada.

### Respeite

1. Disponibilidade da tela nunca substitui verificação de servidor. Preferência de zona não vira garantia sem alocação confirmada.
2. A reserva é válida mesmo se o email falhar; a interface mostra os dois estados separadamente.
3. Não envie mensagens a clientes reais durante testes. Use ambiente de teste e destinos controlados.

### Critérios de aceite

1. J06 e J07 percorrem confirmação, chegada, mesa e sessão; cancelamento libera capacidade corretamente.
2. Mensagem duplicada ou atrasada não duplica a reserva nem reabre waitlist expirada.
3. Link de gestão não permite consultar outra reserva ou mudar para unidade não autorizada.

Atualize docs/progress/E19.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E20 - Takeaway e delivery

**Enviar para:** Codex  
**Depende de:** E19  
**Entrega:** Pedidos fora de mesa com canais e cumprimento definidos.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E20 - Takeaway e delivery. Resultado esperado: Pedidos fora de mesa com canais e cumprimento definidos.

Referências específicas: CT-02, CT-08, CT-09; TAKE/DEL.

IDs principais: DEL 001-003; STAFF 021; TAKE 001-003

Vistas relacionadas a evoluir/revisar: CHAN 001-002.

### Entregue

1. Implemente criação, horários e fila de retirada de takeaway reutilizando catálogo, preço, Order e KDS.
2. Modele delivery próprio/manual com endereço mínimo, área atendida, taxa configurada, entrega e status; respeite o entitlement separado.
3. Implemente pedidos futuros com horário de produção, indisponibilidade, cancelamento e contato operacional.
4. Crie porta de integração de delivery externo, mapeamento de IDs e idempotência; sem contrato/provedor, mantenha o conector desabilitado e demonstrável em sandbox.
5. Crie filtros e telas por canal sem manter bancos de pedidos independentes; adapte Staff para retirada/entrega.

### Respeite

1. Delivery e kiosk exigem concessões próprias quando o pacote comercial assim definir; não os inclua silenciosamente em todos os planos.
2. Não capture pagamento em Restaurant. Registre resolução externa quando aplicável; pagamento integrado depende da E23.
3. Não exponha endereços ou telefones nas telas públicas de fila.

### Critérios de aceite

1. Takeaway chega à estação correta, é preparado e retirado uma vez, com timeline consistente.
2. Endereço fora de área, horário fechado e produto indisponível bloqueiam apenas a ação afetada.
3. Evento externo repetido preserva um único pedido; autorização e redaction são verificadas.

Atualize docs/progress/E20.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E21 - Revisão operacional do Restaurant

**Enviar para:** Claude  
**Depende de:** E20  
**Entrega:** Parecer sobre operação coordenada e recuperação de falhas.

## Prompt para copiar

Revise esta etapa da BossaOS com as instruções locais, fontes, contrato e handoff disponíveis. Baseie conclusões em evidência. Sem acesso ao repositório, entregue documentos com caminhos e conteúdo, sem alegar que salvou arquivos ou executou testes.

Etapa autorizada agora: E21 - Revisão operacional do Restaurant. Resultado esperado: Parecer sobre operação coordenada e recuperação de falhas.

Referências específicas: CT-15 a CT-17; gate G2.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010; REP 001.

### Entregue

1. Revise E12-E20 no código e no preview com evidências. Execute as jornadas J03-J07 e J10-J14 aplicáveis ao Restaurant.
2. Confira o mesmo pedido passando por Staff/QR, servidor, cozinha/bar, expo e mesa, incluindo acréscimo, cancelamento e perda de conexão.
3. Revise reservas concorrentes, walk-ins, mesas combinadas, transferência de sessão, revogação de dispositivo e limites por papel.
4. Confira personalização pública e identidade fixa da operação; valide celular do garçom e legibilidade da tela de cozinha no ambiente previsto.
5. Produza docs/reviews/E21.md com evidências, falhas bloqueantes, correções e ensaio de contingência; encaminhe correções ao Codex pelo A02.

### Respeite

1. Nenhum pedido pode sumir por limite visual, fila local ou reconexão. Nenhum rascunho deve ser chamado de enviado.
2. Sem hardware físico verificado, descreva o limite do ensaio. Não declare a impressora/TV homologada por funcionar no navegador.
3. A operação Restaurant deve encerrar atendimento com registro de resolução externa, sem simular módulos financeiros Pro.

### Critérios de aceite

1. Não há perda/duplicação de pedido, vazamento de tenant ou overbooking no cenário concorrente verificado.
2. Estado de erro de estação e plano de contingência são visíveis à equipe.
3. Starter continua funcionando após introdução dos módulos operacionais.

Entregue documentos, evidências, limites e handoff. Revisão documental não comprova software validado. Encaminhe correções de código ao Codex em lista delimitada.

---

# E22 - TPV, contas e caixa

**Enviar para:** Codex  
**Depende de:** E21  
**Entrega:** Contas, valores e caixa Pro com trilha de operações.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E22 - TPV, contas e caixa. Resultado esperado: Contas, valores e caixa Pro com trilha de operações.

Referências específicas: CT-11; J08, J09.

IDs principais: FLOOR 010; ORD 007; POS 001-004, 006, 009-011, 014-019; STAFF 015-016, 020

Vistas relacionadas a evoluir/revisar: CAT 010; FLOOR 008, 011.

### Entregue

1. Implemente Bill, BillLine/Allocation, ajustes, totais e relação com pedidos/sessões. Suporte balcão, conta por mesa e consolidação controlada.
2. Implemente divisão por item, pessoa ou valor, desconto e cortesia com alçada, motivo e regras de arredondamento.
3. Crie caixa, turno, fundo, entrada/saída, contagem, divergência e fechamento; movimentos são imutáveis e correções geram novos registros.
4. Entregue telas TPV, visão de caixa e recebimento em dinheiro para sandbox, com cálculo de recebido/troco e eventos financeiros.
5. Integre transferir itens/contas, solicitar autorização e encerrar mesa somente quando a regra de saldo e serviço permitir.

### Respeite

1. Use CT-11 para cálculos; somatório das partes deve ser exatamente o total. Itens já liquidados não podem ser movidos silenciosamente.
2. Desconto/estorno não reescrevem a venda original; void de operação não capturada difere de refund.
3. Operação real de venda/documento fica sujeita ao marco fiscal E24; recibo de demonstração não é documento fiscal.

### Critérios de aceite

1. Dividir 10,00 EUR em três partes distribui centavos deterministicamente e soma 10,00 EUR.
2. Pagamento e transferência concorrentes não liquidam duas vezes nem movem parcela já paga.
3. Contagem, troco, divergência e fechamento reproduzem a ledger; caixa não fecha silenciosamente com operações pendentes.

Atualize docs/progress/E22.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

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

---

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

---

# E25 - Estoque e fichas técnicas

**Enviar para:** Codex  
**Depende de:** E24  
**Entrega:** Estoque por unidade com movimentos rastreáveis e consumo por receita.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E25 - Estoque e fichas técnicas. Resultado esperado: Estoque por unidade com movimentos rastreáveis e consumo por receita.

Referências específicas: CT-12; J10.

IDs principais: INV 001-012

Vistas relacionadas a evoluir/revisar: CAT 017.

### Entregue

1. Implemente insumos, locais, unidades/conversões explícitas, saldos, movimentos, contagens, ajustes, perdas e alertas.
2. Crie receitas versionadas, rendimento, componentes/modificadores e custo calculado a partir de valores conhecidos.
3. No primeiro início de preparo, registre consumo idempotente da receita capturada para o item; itens sem preparo usam o ponto de baixa definido em CT-12.
4. Integre disponibilidade derivada com flag e reserva de estoque quando habilitada; preserve política manual para unidades sem controle de estoque.
5. Entregue trilha de saldo e relatório de variância; versões antigas de receita continuam ligadas ao consumo histórico.
6. Implemente transferência entre unidades como saída, trânsito e recebimento vinculados, verificando autorização nas duas pontas e impedindo contagem dupla.

### Respeite

1. Não some kg, litros e unidades sem conversão cadastrada. Valor desconhecido de custo não equivale a zero.
2. Cancelamento antes de produzir libera reserva; depois de consumir exige perda/devolução registrada, sem estorno automático de ingrediente já usado.
3. Recall de KDS e replay de evento não podem consumir duas vezes.
4. Subreceitas não podem ter ciclos. Capturar a revisão ao aceitar o pedido; reservar estoque atomicamente quando a política impedir venda sem saldo.

### Critérios de aceite

1. Saldo recomposto pelos movimentos corresponde ao saldo materializado.
2. Receita alterada após início do preparo não modifica consumo anterior.
3. J10 bloqueia novas vendas do item esgotado nos canais configurados e preserva pedidos já aceitos.

Atualize docs/progress/E25.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E26 - Fornecedores e compras

**Enviar para:** Codex  
**Depende de:** E25  
**Entrega:** Compra, recebimento e custos ligados ao estoque.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E26 - Fornecedores e compras. Resultado esperado: Compra, recebimento e custos ligados ao estoque.

Referências específicas: CT-12; SUP/PUR.

IDs principais: PUR 001-004; SUP 001-002

### Entregue

1. Implemente fornecedores, catálogo de fornecimento e condições como dados configuráveis.
2. Crie pedido de compra em rascunho, aprovação por papel, envio registrado, recebimento parcial/total e cancelamento.
3. Vincule cada recebimento a movimentos de entrada de estoque, custo e lote quando o escopo cadastrado exigir.
4. Trate divergência entre solicitado/recebido e devolução ao fornecedor com histórico e motivo.
5. Prepare integração com despesas/contas a pagar sem marcar uma compra como paga ao recebê-la.

### Respeite

1. Receber mercadoria não é pagar fornecedor; mantenha estados logístico e financeiro separados.
2. Repetir recebimento não aumenta estoque duas vezes; preço/custo deve guardar moeda e unidade.
3. Envio real a fornecedor por email ou outra integração requer destinatário e autorização operacional configurados.

### Critérios de aceite

1. Compra com dois recebimentos parciais fecha exatamente a quantidade prevista e registra diferenças explícitas.
2. Usuário sem alçada não aprova a própria exceção de compra.
3. Cancelar saldo restante não apaga entradas já recebidas nem movimentos associados.

Atualize docs/progress/E26.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E27 - CRM, fidelidade e campanhas

**Enviar para:** Codex  
**Depende de:** E26  
**Entrega:** Relacionamento com clientes baseado em dados e consentimentos rastreáveis.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E27 - CRM, fidelidade e campanhas. Resultado esperado: Relacionamento com clientes baseado em dados e consentimentos rastreáveis.

Referências específicas: CT-12, CT-14; CRM.

IDs principais: CRM 001-013; MENU 017

Vistas relacionadas a evoluir/revisar: SET 012-013.

### Entregue

1. Implemente clientes por tenant, contatos, preferências, origem e ligação autorizada a reservas/pedidos.
2. Crie segmentos, histórico, feedback e tratamento de duplicados com confirmação; nunca una clientes entre organizações.
3. Implemente ledger de pontos/créditos, regras versionadas, resgate e reversão de compra reembolsada conforme política.
4. Crie campanhas em rascunho, audiência elegível, preview, teste controlado e envio por provedor somente quando habilitado.
5. Registre consentimento por finalidade/canal, fonte, momento e revogação; implemente supressão de contato e direitos de dados conforme política efetiva.

### Respeite

1. Reserva ou compra não representam aceite automático de publicidade. Checkbox de marketing começa desmarcado.
2. Feedback público não pode mostrar PII; avaliação não deve ser inventada para preencher páginas.
3. Sem provedor/autorização para envio, a campanha fica em rascunho ou teste; não simule entrega.

### Critérios de aceite

1. Revogação de contato antes do envio remove o cliente da audiência efetiva.
2. Replay de compra/resgate não duplica pontos; refund segue a política registrada.
3. Exportação e fusão de clientes exigem escopo e preservam histórico, sem associação entre tenants.

Atualize docs/progress/E27.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E28 - Equipe, escalas e ponto

**Enviar para:** Codex  
**Depende de:** E27  
**Entrega:** Rotina da equipe separada de identidade e permissões do sistema.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E28 - Equipe, escalas e ponto. Resultado esperado: Rotina da equipe separada de identidade e permissões do sistema.

Referências específicas: CT-12, CT-14; HR.

IDs principais: HR 001-011

### Entregue

1. Implemente EmployeeProfile associado opcionalmente ao usuário, vínculos de unidade, funções operacionais e status.
2. Crie escalas, disponibilidade, ausências, turnos, trocas e conflitos de horário.
3. Implemente entrada, pausa, retorno e saída com registro de origem e confirmação; correções exigem motivo e preservam lançamento original.
4. Entregue visão própria do funcionário e gestão por responsável, incluindo relatório de horas e exportação.
5. Integre revogação de acesso ao desligamento sem apagar histórico e sem confundir pausa de turno com logout.

### Respeite

1. Não implemente folha, cálculo trabalhista ou retenções legais presumidas. Exportações e prazos seguem política verificada da operação.
2. Não use biometria, localização contínua ou vigilância não solicitada.
3. Relatórios de equipe devem indicar contexto operacional e permitir revisão de dados incorretos.

### Critérios de aceite

1. Dois registros simultâneos de entrada não abrem dois turnos ativos incompatíveis.
2. Turno atravessando meia-noite/horário de verão calcula duração corretamente.
3. Funcionário consulta apenas dados próprios e responsáveis apenas unidades autorizadas.

Atualize docs/progress/E28.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E29 - Financeiro e conciliação

**Enviar para:** Codex  
**Depende de:** E28  
**Entrega:** Visão financeira baseada em registros efetivos e diferenças explicadas.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E29 - Financeiro e conciliação. Resultado esperado: Visão financeira baseada em registros efetivos e diferenças explicadas.

Referências específicas: CT-11, CT-12; FIN.

IDs principais: FIN 001-011

Vistas relacionadas a evoluir/revisar: SET 012.

### Entregue

1. Implemente despesas, categorias, contas a pagar/receber, taxas, repasses e conciliação por unidade.
2. Separe venda, recebimento, estorno, taxa, repasse e movimentação de caixa; use os registros dos módulos anteriores.
3. Crie importação de extrato com preview, identificação de duplicados, correspondências sugeridas e confirmação humana para divergências.
4. Entregue fluxo de caixa, margens quando houver custos conhecidos, detalhe dos valores e exportações.
5. Defina política de fechamento/reabertura financeira e trilha de ajustes, sem transformar o módulo em contabilidade legal completa.

### Respeite

1. Não some valores de moedas diferentes como se fossem uma moeda única; agrupe ou use conversão com fonte/data e política explícitas.
2. Valor de pedidos Restaurant resolvidos externamente não é recebimento processado pelo sistema.
3. Despesa, imposto e taxa são campos/configurações; não invente percentuais ou regras fiscais.

### Critérios de aceite

1. Totais permitem chegar às transações de origem e batem com saldos por período.
2. Extrato repetido não duplica lançamentos; divergência permanece pendente até ação autorizada.
3. Refund, taxa e repasse em datas diferentes aparecem no período e no conceito corretos.

Atualize docs/progress/E29.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E30 - Analytics, relatórios e gestão multiunidade

**Enviar para:** Codex  
**Depende de:** E29  
**Entrega:** Indicadores com definições explícitas e comparação autorizada.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E30 - Analytics, relatórios e gestão multiunidade. Resultado esperado: Indicadores com definições explícitas e comparação autorizada.

Referências específicas: CT-12, CT-15; J12; REP.

IDs principais: CAT 028; REP 010-017

Vistas relacionadas a evoluir/revisar: ORG 002-004; REP 001.

### Entregue

1. Conclua relatórios de vendas, produtos, canais, horários, mesas, reservas, KDS, pagamentos, estoque, compras, CRM, marketing e equipe.
2. Reutilize os relatórios básicos já entregues; diferencie métrica operacional Restaurant de receita/recebimento Pro.
3. Implemente visão HQ por marcas/unidades, filtros de timezone, moeda, período e estado. Calcule médias ponderadas quando necessário.
4. Implemente visões salvas, exportações assíncronas e origem rastreável dos indicadores, com controle de escopo.
5. Conclua clonagem controlada de menu/configuração entre unidades ou marcas, preview de diferenças e políticas comerciais de expansão.

### Respeite

1. Dashboard vazio mostra ausência de dados; nunca acrescente métricas de demonstração em tenant real.
2. Não consolide dados de organizações distintas porque o mesmo usuário pertence às duas.
3. Agendamento externo de relatórios só envia após configuração explícita de destinatários e permissões.

### Critérios de aceite

1. Métrica exibida confere com amostra conhecida e permite rastrear filtros e definição.
2. J12 cria unidade elegível sem copiar pedidos/clientes e sem perder herança de catálogo.
3. Consolidado respeita autorização, moeda e denominadores; exportação usa os mesmos filtros da tela.

Atualize docs/progress/E30.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E31 - Kiosk, terminais e impressão

**Enviar para:** Codex  
**Depende de:** E30  
**Entrega:** Canais em dispositivos dedicados com hardware e limites explícitos.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E31 - Kiosk, terminais e impressão. Resultado esperado: Canais em dispositivos dedicados com hardware e limites explícitos.

Referências específicas: CT-09, CT-11, CT-19; KIOSK/DEV.

IDs principais: DEV 005-006; KDS 016; KIOSK 001-008

Vistas relacionadas a evoluir/revisar: CHAN 001-002; KDS 015; POS 023.

### Entregue

1. Implemente início, idioma, menu, opções, carrinho, checkout, número/status e reinício de sessão do kiosk.
2. Reutilize motores de pedido/pagamento e entitlements. Apague dados do cliente no fim/inatividade sem perder confirmação de operação em curso.
3. Integre impressora/bridge por contrato de dispositivo, fila idempotente, destino, teste, erro e diagnóstico.
4. Conclua fallback KDS e impressão de conta/documento adequado ao módulo fiscal; reimpressão deve ser distinguível de novo pedido.
5. Prepare matriz de homologação com modelo, navegador/SO, conexão, leitura/legibilidade, corte/impressão e resultado físico verificado.

### Respeite

1. Não presuma que impressora local aceita chamada direta do navegador nem que equipamento das fotos é compatível.
2. Sem hardware real, entregue simulador/contrato e checklist pendente, sem declarar homologação.
3. Kiosk offline não captura pagamento nem promete pedido confirmado; reset não abandona cobrança indeterminada.

### Critérios de aceite

1. Dois clientes consecutivos não compartilham carrinho, dados ou sessão de pagamento.
2. Reenvio à impressora não produz comanda nova em duplicidade; falha de confirmação fica visível.
3. Teste físico, quando possível, tem evidência por modelo; todos os demais ficam explicitamente pendentes.

Atualize docs/progress/E31.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E32 - Integrações, API e cobrança do SaaS

**Enviar para:** Codex  
**Depende de:** E31  
**Entrega:** Extensões externas e assinatura BossaOS com responsabilidades separadas.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E32 - Integrações, API e cobrança do SaaS. Resultado esperado: Extensões externas e assinatura BossaOS com responsabilidades separadas.

Referências específicas: CT-02, CT-06, CT-14, CT-19; INT.

IDs principais: INT 001-002, 007-010; ORD 011; ORG 011-012; PLAT 005, 012, 015, 020

Vistas relacionadas a evoluir/revisar: INT 004; ORG 010, 013-015.

### Entregue

1. Conclua catálogo/detalhe de integrações, credenciais por escopo, estado, erros e logs redigidos.
2. Implemente API keys com hash, escopos, expiração, revogação, limites e documentação OpenAPI.
3. Implemente webhooks de saída com assinatura, versionamento, retry, deduplicação e proteção de destinos; cada payload leva somente dados autorizados.
4. Integre provedor de assinatura SaaS para organização: checkout, faturas, método, falha, crédito, cancelamento e mudança de plano.
5. Conclua conectores contratados de mensagens/delivery e consolide reprocessamento de eventos. O que não tem provedor permanece desabilitado com requisitos claros.

### Respeite

1. Cobrar o restaurante pelo SaaS difere de cobrar o consumidor pela refeição; contas, webhooks e conciliação são separados.
2. Nunca deixe um webhook alterar entitlements apenas com base em organization_id recebido sem vínculo verificado com cliente/assinatura do provedor.
3. Não faça requisições arbitrárias a rede interna a partir de URLs de integração. Credenciais reais entram pelo ambiente autorizado.

### Critérios de aceite

1. Webhook SaaS atrasado/duplicado não reativa assinatura cancelada nem aplica plano incorreto.
2. Chave revogada ou fora de escopo falha; payload e logs não expõem segredos.
3. Assinatura simulada e integração real são distinguíveis; preços usados vêm de configuração comercial confirmada.

Atualize docs/progress/E32.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

# E33 - Administração da plataforma, suporte e governança

**Enviar para:** Codex  
**Depende de:** E32  
**Entrega:** Ferramentas para operar o SaaS com acesso rastreável.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E33 - Administração da plataforma, suporte e governança. Resultado esperado: Ferramentas para operar o SaaS com acesso rastreável.

Referências específicas: CT-04, CT-14, CT-17; J15; PLAT/HELP.

IDs principais: HELP 001-004; ORG 009; PLAT 001, 007-009, 013-014, 016-019; SET 010-011, 013-014

Vistas relacionadas a evoluir/revisar: CAT 026; ORG 008, 015; PLAT 002-004, 006, 010-011, 020; SET 011-013.

### Entregue

1. Conclua painéis de tenants, onboarding, assinaturas, planos, cupons, flags, filas, webhooks, incidentes e configuração de provedores.
2. Implemente central de ajuda, tickets, status, diagnóstico e sessão de suporte temporária com motivo, escopo e registro de ações.
3. Conclua controles avançados de papéis, auditoria, exportação, retenção, solicitações de dados e configuração de acesso.
4. Implemente migração assistida com dry-run, revisão de importações, moderação de uploads e revisão de abuso.
5. Torne jobs com falha reprocessáveis sem duplicar efeitos e registre ações internas com identidade real do operador da plataforma.

### Respeite

1. Support não vira owner silenciosamente. Suporte assistido é temporário, visível e autorizado conforme política do tenant.
2. Configuração de segredos exibe estado e rotação, nunca valores sensíveis em logs ou tabelas.
3. Proteções básicas, exportação autorizada e privacidade não dependem de comprar Pro; interface avançada de gestão pode depender.

### Critérios de aceite

1. J15 cobre ticket, acesso temporário, ação, expiração e auditoria sem acesso residual.
2. Retry de job, exportação e mudanças de flag têm permissão, histórico e escopo corretos.
3. Operador da plataforma sem papel financeiro não vê contas/transações sensíveis por acesso genérico.

Atualize docs/progress/E33.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.

---

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

---

# E35 - Pacote de implantação e piloto assistido

**Enviar para:** Codex  
**Depende de:** E34  
**Entrega:** Entrega operacional revisável para habilitar o primeiro restaurante.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E35 - Pacote de implantação e piloto assistido. Resultado esperado: Entrega operacional revisável para habilitar o primeiro restaurante.

Referências específicas: CT-17, CT-19; gate G4.

IDs principais: Etapa transversal: não cria ID de tela independente.

Vistas relacionadas a evoluir/revisar: ONB 010.

### Entregue

1. Prepare configuração de produção, migrações revisadas, backups, restauração ensaiada, monitoramento e runbooks de falha/rollback.
2. Monte importação real assistida como dry-run, conferência de produtos/preços/idiomas/alérgenos e lista de dados que a responsável precisa validar.
3. Crie roteiro de treinamento por papel e testes de QR, Staff, cozinha/bar, reservas, caixa e hardware conforme os módulos liberados.
4. Prepare plano de entrada progressiva: Starter, operação Restaurant e Pro somente após seus critérios. Defina como retornar ao sistema anterior sem duplicar pedidos/vendas.
5. Entregue docs/releases/pilot.md com versão, ambiente, migrações, evidências, funcionalidades habilitadas, pendências e ação de ativação pronta para revisão.

### Respeite

1. Execute o que estiver autorizado no ambiente disponível. Não interprete preparação do piloto como autorização automática para cobrar, enviar campanha ou substituir a operação real.
2. Não prometa RPO/RTO sem medição: proponha objetivos e anexe o resultado real do ensaio de restauração.
3. Na falta de credencial/hardware/provedor, finalize o pacote local e marque apenas a ativação correspondente como pendente.

### Critérios de aceite

1. Uma base de backup é restaurada em ambiente isolado e permite verificar amostra de catálogo/pedidos/saldos.
2. Fluxo principal e contingência foram ensaiados por papel, com instruções compreensíveis para a equipe.
3. A decisão de entrada em produção pode ser tomada com uma entrega concreta, sem novas suposições de produto.

Atualize docs/progress/E35.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
