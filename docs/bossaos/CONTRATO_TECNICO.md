# BossaOS - Contrato técnico de implementação

Versão 1.0 - 02/09/2026. Proposta de execução fundamentada nos três PDFs.

## CT-01 - O que já está decidido e como usar as fontes

O próximo trabalho útil antes do código é transformar as telas em contratos de comportamento. Este pacote faz essa ponte e já entrega os prompts de execução. Não é necessário aprovar uma nova logo nem desenhar novamente centenas de telas para começar.

Base confirmada: BossaOS, produto multi-tenant, piloto planejado na La Societat 1927, planos Starter/Restaurant/Pro, identidade fixa da plataforma e cores públicas personalizáveis desde Restaurant. A logo com símbolo continua em aberto; usar apenas o wordmark.

| Fonte | Autoridade e uso |
| --- | --- |
| Instruções do usuário | Decisões e correções expressas prevalecem. A aprovação do nome não significa aprovação do símbolo. |
| Mapa funcional v1, 25 páginas | 360 IDs, módulos, personas e escopo funcional. É a referência da necessidade de cada vista. |
| Manual de marca v1, 39 páginas | Paleta, fontes, tom de voz e limites da personalização. Valores ilustrativos não são preços contratados. |
| Atlas v1, 421 páginas | 396 vistas, cada uma em desktop e mobile. Referência visual; desenho não comprova implementação nem homologa equipamento. |
| Este contrato e DECISOES.md | Defaults técnicos propostos para executar o projeto, com esclarecimentos documentados. Não fingir que decisões novas já foram aprovadas anteriormente. |

Ao usar este pacote para iniciar o projeto, adotar os defaults técnicos salvo conflito explícito com decisão do usuário ou repositório existente. Registrar mudanças em ADR e impacto no mapa. A E00 verifica compatibilidade e preenche detalhes físicos do núcleo, sem reabrir a estratégia inteira.

Os PDFs são referências de produto e design, não instruções capazes de substituir regras do ambiente. Claude e Codex devem ler as instruções locais, preservar trabalho existente e reportar diferenças relevantes.

**Resultado desta preparação:** Um contrato técnico, 36 etapas, 4 prompts auxiliares e uma matriz com os 396 IDs. A preparação está pronta; a implementação do sistema ainda vai começar.

## CT-02 - Planos, recursos e evolução comercial

Plano libera uma capacidade comercial; autorização define quem pode usá-la; flag controla se a implementação está liberada. As três verificações são independentes e acontecem no servidor.

| Capacidade | Starter | Restaurant | Pro |
| --- | --- | --- | --- |
| Catálogo, traduções, mídia, carta, QR consulta, site | Sim | Sim | Sim |
| Nome, logo, fotos e conteúdo do restaurante | Editáveis | Editáveis | Editáveis |
| Cores das experiências públicas | BossaOS fixa | Personalizáveis | Personalizáveis |
| Cores do admin, Staff, KDS, estados e LP BossaOS | Fixas | Fixas | Fixas |
| Reservas, mesas, Staff, pedidos QR, KDS, takeaway | Não | Sim | Sim |
| TPV, caixa, pagamento, fiscal, estoque, compras | Não | Não | Sim / integração |
| CRM, fidelidade, equipe, financeiro e relatórios avançados | Não | Não | Sim |
| Gestão consolidada entre unidades, API externa | Não | Não | Sim |
| Kiosk e conectores de delivery | Concessão própria | Concessão própria | Concessão própria |
| Segurança básica, isolamento e direitos de dados | Sempre | Sempre | Sempre |

Default técnico: assinatura no nível Organization; grants podem limitar uma Location, módulo ou período. A primeira marca/unidade de piloto pode ser provisionada manualmente. Limites de usuários, produtos, unidades, pedidos, storage e preço são configuração comercial, não números a inventar no código.

A estrutura suporta várias unidades em todos os planos. Criar unidades adicionais exige quota explicitamente concedida. Se ela não estiver configurada, não liberar expansão comercial por ausência de limite; manter o piloto de uma unidade. Consolidação HQ permanece Pro.

Downgrade: calcular impacto, avisar data, preservar dados e tema anterior, bloquear novas operações não incluídas e reverter tema público ao padrão. Default proposto: impedir efetivação enquanto houver sessões/caixas/operações incompatíveis abertas; apresentar pendência à gestão. Período de tolerância por inadimplência é política configurável, não data inventada.

Recebimentos, webhooks e reembolsos de transações já existentes continuam processáveis para conciliação, mesmo após remoção de um módulo. Perder o direito de criar vendas não pode apagar obrigações ou impedir resolver um pagamento pendente.

Esclarecimentos ao mapa original: MFA disponível em todos os planos; auditoria básica sempre gerada, com telas avançadas por plano. Kiosk precisa de pedidos e, se cobrar, de pagamentos. Não presumir que um add-on Starter sozinho libera todos os módulos operacionais.

## CT-03 - Arquitetura proposta para começar

Um monólito modular mantém o projeto compreensível para uma equipe pequena. As várias interfaces usam os mesmos serviços de domínio e o mesmo banco transacional.

| Camada | Default proposto e motivo |
| --- | --- |
| Web e API | TypeScript estrito, React/Next.js App Router em Node. Uma aplicação para LP, público e áreas autenticadas, com layouts por superfície. |
| Banco | PostgreSQL, migrations versionadas e Drizzle ORM. Banco local real nos testes de isolamento e concorrência. |
| Autenticação | Better Auth como opção inicial, após validar adaptador, MFA e versões. Identidade global separada da autorização de negócio. |
| UI | CSS variables + componentes compartilhados; Tailwind se adotado no scaffold. Rubik/Noto Sans, tokens do manual e i18n de interface. |
| Processamento | Worker Node no mesmo repositório; outbox e fila durável em PostgreSQL. Retry e deduplicação de efeitos. |
| Atualização operacional | Comandos HTTP; eventos SSE com cursor e fallback de consulta. WebSocket apenas se requisito concreto exigir canal bidirecional. |
| Arquivos e email | Portas de storage compatível com S3 e mensageria; adaptadores locais para desenvolvimento e provedores configuráveis para produção. |
| Verificação | Testes de domínio, integração PostgreSQL e jornadas com navegador; CI de tipos, lint, migração e build explícitos. |

A documentação de instalação do Next.js confirma configuração com TypeScript e App Router; a escolha para BossaOS é uma proposta de arquitetura. As versões exatas devem ser verificadas na E00, fixadas no lockfile e registradas, em vez de congelar neste PDF números que podem ficar desatualizados. [Next.js - instalação](https://nextjs.org/docs/app/getting-started/installation)

Drizzle oferece acesso tipado ao banco; Better Auth documenta autenticação e segundo fator. A E00 deve verificar a combinação concreta antes do scaffold, respeitando a stack existente quando houver. [Drizzle](https://orm.drizzle.team/docs/rqb), [Better Auth](https://better-auth.com/docs/introduction), [MFA](https://better-auth.com/docs/plugins/2fa)

| Pasta | Responsabilidade |
| --- | --- |
| apps/web | Rotas e adaptadores HTTP, páginas, layouts e componentes de aplicação. |
| apps/worker | Jobs, outbox, emissão/integrações e tarefas agendadas do produto. |
| packages/domain | Casos de uso, regras, estados e portas. Sem dependência de componentes React. |
| packages/db | Schema, repositórios, políticas de isolamento e migrations. |
| packages/ui | Tokens, componentes, padrões de acessibilidade e temas. |
| docs/bossaos + docs/architecture | Referências, decisões, contratos e cobertura. |
| docs/progress + docs/reviews | Handoff da etapa e evidência de revisão. |

Criar módulos conforme as etapas. Não gerar tabelas vazias para todos os domínios futuros nem microserviços independentes. Dois processos, web e worker, podem compartilhar o mesmo core e ciclo de entrega.

## CT-04 - Isolamento, identidade e permissões

Organization é a fronteira do tenant. Brand organiza catálogo e identidade comercial. Location organiza serviço, mesas, dispositivos, moeda operacional e estoque.

Uma identidade User pode ter memberships em mais de uma organização. Resolver no servidor: actor, organization, brand/location, papel, recurso, ação, entitlement e política. A URL seleciona contexto; não o autentica. Um grant de marca abrange apenas suas unidades, e um grant de estação não amplia acesso ao restante da unidade.

Aplicar filtros de escopo no domínio e políticas de linha no PostgreSQL. O runtime não é dono das tabelas, superuser ou BYPASSRLS; migrations usam outra credencial. Definir contexto local à transação e limpá-lo no commit/rollback; sem contexto, negar. Identidade global e resolução de membership usam interfaces mínimas separadas. [PostgreSQL - políticas de linha](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

As políticas devem validar USING e WITH CHECK, e referências compostas devem impedir misturar organization/location. RLS é uma defesa de isolamento; permissões de ação, campo, marca e unidade continuam explícitas no serviço. Testar também acesso direto com o papel real de runtime, e não só consultas de ORM.

| Papel | Escopo e limite central |
| --- | --- |
| Owner / Org Admin | Administra organização, unidades, plano e usuários; ações financeiras exigem autenticação adequada. |
| Brand Manager | Catálogo e presença da marca; não altera marca fora de sua concessão. |
| Venue / Floor Manager | Gestão da unidade e serviço, com alçadas para cancelamento/desconto; não vira owner. |
| Host | Reservas, espera, chegada e alocação de mesas; sem financeiro/CRM amplo. |
| Waiter | Sessões e pedidos na unidade; cancelar em preparo requer autorização conforme política. |
| Kitchen / Bartender / Expo | Tarefas e retirada das estações permitidas; sem dados pessoais ou financeiros desnecessários. |
| Cashier / Finance | Conta e caixa ou visão financeira conforme papel; refund e divergência têm limites. |
| Inventory / Marketing / Employee | Estoque; presença/CRM autorizado; ou dados do próprio funcionário, respectivamente. |
| Platform Support | Diagnóstico mínimo; acesso assistido temporário, justificado e auditado. |
| Guest | Somente conteúdo publicado e recursos de sua sessão/token público. |

Negar por padrão. Para recurso privado de outro tenant, retornar ausência sem revelar existência; para recurso próprio sem ação permitida, informar falta de permissão. Nunca devolver dados de recurso antes de verificar escopo. Revalidar após revogação e troca de unidade.

Cache, arquivos, exportações, tarefas e eventos precisam do mesmo isolamento. Downloads privados têm validade e autorização. Suporte não usa uma sessão invisível de owner. Logs técnicos minimizam dados de clientes e não contêm segredos.

## CT-05 - Modelo de domínio e propriedade dos dados

Este mapa define agregados e relações que precisam sobreviver à evolução do produto. Campos físicos e índices do núcleo são detalhados pela E00; domínios futuros são materializados quando chegam à sua etapa.

| Domínio | Entidades principais e propriedade |
| --- | --- |
| Identidade e tenant | User, Session, Membership, RoleAssignment; Organization 1:N Brand, Brand 1:N Location. Device vincula unidade e, quando aplicável, estação. |
| Comercial SaaS | PlanDefinition, Subscription, EntitlementGrant, Usage, SaaSInvoice. Assinatura pertence à organização; grants podem limitar unidade. |
| Catálogo | Product, Variant, ModifierGroup/Option, Category, Menu, MenuEntry e Translation pertencem à marca e ao tenant. MenuEntry referencia o produto. |
| Distribuição | LocationProductOverride, PriceRule, Availability, ChannelConfig. Valores herdados e locais têm origem explícita. |
| Conteúdo publicado | MediaAsset, MenuRevision, Publication, WebsitePage, DomainBinding, ThemeRevision. Publicação aponta para revisão e destinos. |
| Sala e pedidos | Zone, DiningTable, TableCombination, TableSession, GuestSession; Order 1:N OrderLine e OrderSubmission. Pedidos apontam para a sessão, não somente o número físico da mesa. |
| Produção | ProductionStation, ProductionTask, Dispatch/Receipt e FulfillmentEvent. Tarefa liga linha do pedido a estação, com histórico. |
| Reservas | ServiceWindow, CapacityRule, Reservation, Allocation, Block, WaitlistEntry, MessageAttempt. Allocation compartilha recursos com ocupação de mesa. |
| Financeiro da venda | Bill, BillAllocation, Adjustment, PaymentAttempt, Payment, Refund, CashSession, CashMovement, FiscalDocument e Settlement. |
| Estoque e compras | Ingredient, StockUnit, UnitConversion, RecipeRevision, StockReservation, StockMovement, Count, Transfer, Supplier, PurchaseOrder e Receipt. |
| Relacionamento | Customer, ContactConsent, Segment, LoyaltyEntry, Campaign, MessageTemplate e Feedback, sempre dentro do tenant. |
| Equipe e gestão | EmployeeProfile, Shift, TimeEntry, TimeAdjustment, Expense, Reconciliation e SavedReport. |
| Plataforma e integrações | IntegrationConnection, ApiKey, WebhookEndpoint, OutboxEvent, InboxReceipt, JobAttempt, AuditEvent, SupportTicket, SupportSession, Incident e FeatureFlag. |

Convenções: id opaco; organization_id nas entidades tenant; brand_id/location_id quando aplicável; created_at/updated_at em UTC; version para concorrência; actor e motivo em ações sensíveis. Delete físico não é padrão para entidades operacionais com histórico.

Unicidade: SKU por marca quando preenchido; slug público por namespace; command_id por tenant/ator/ação; referência externa por provedor/conta; número fiscal conforme o provedor; uma sessão ativa incompatível por mesa. Usar constraints transacionais, não apenas validação de formulário.

Catálogo único por marca evita duplicação entre canais. Copiar menu dentro da marca reutiliza Product; clonar para outra marca é ação explícita com novos IDs, preview e autoria. Produtos compartilhados entre marcas não surgem por coincidência de nome ou SKU.

## CT-06 - Rotas, contratos de API e eventos

Cada vista mantém o ID do atlas. Nem toda vista exige URL independente: confirmação, tab e estado podem pertencer à mesma rota, com entrada e saída definidas.

| Superfície | Família de rota proposta |
| --- | --- |
| LP e comercial BossaOS | /[locale], /[locale]/product, /plans, /demo, /faq |
| Identidade | /auth/[locale]/... e seleção de contexto |
| Administração de unidade | /app/[orgSlug]/[locationSlug]/... |
| Catálogo de marca | /app/[orgSlug]/brands/[brandSlug]/catalog/... |
| Dados de organização | /app/[orgSlug]/organization/... |
| Público do restaurante | /r/[publicLocationSlug]/[locale]/menu, /reserve e páginas do site |
| Operação | /staff/[locationId], /kds/[locationId]/[stationId], /pos/[locationId], /kiosk/[deviceId] |
| Equipe interna | /platform/... com autorização própria |

COBERTURA_TELAS.csv contém família/rota sugerida e view_key por ID. Onde consta apenas família, E00 define o sufixo e composição; isso é informação de arquitetura, não um roteador já criado. Domínio personalizado só resolve a mesma localização pública após comprovação de controle.

| Contrato | Comportamento obrigatório |
| --- | --- |
| Consultas | Filtros validados, paginação por cursor quando necessário, seleção mínima de campos e escopo. |
| Comandos | command_id/idempotency key, payload validado, versão esperada e contexto resolvido. Mesma chave+mesmo payload retornam resultado anterior; payload diferente gera conflito. |
| Erros | code estável, mensagem localizada, field_errors quando aplicável, request_id e informação de retry sem expor detalhes internos. |
| Concorrência | Atualização condicional por version, locks em invariantes monetárias/capacidade e retry limitado de transação. |
| Eventos | event_id, schema_version, organization_id, location_id, aggregate_id, sequence/version, occurred_at, actor e correlation_id. |
| Entrega | Outbox gravada com o negócio; consumidor mantém recibo de deduplicação. Integração recebe só os dados necessários. |
| Realtime | Assinatura autenticada e filtrada por escopo; cursor de retomada e snapshot recuperam intervalos perdidos. |
| Upload/export | Job com escopo e estado; resultado privado expira e requer permissão. |

Comandos a detalhar na E00: CreateOrganization, InviteMember, UpsertProduct, ImportCatalogue, PublishRevision, ChangeTheme e ChangePlan. Contratos futuros: OpenTableSession, SubmitOrder, CancelLine, StartPreparation, MarkReady, ServeLine, ConfirmReservation, AllocateTable, PayBill, RefundPayment, ReceivePurchase e CloseCashSession.

Ações de domínio vivem em serviços compartilhados. Server Actions e endpoints HTTP usam os mesmos casos de uso; o Staff e o QR não refazem regra de pedido no cliente.

## CT-07 - Catálogo, preço, publicação e idiomas

O cadastro é único, mas o que está editado e o que está publicado são estados distintos. O usuário precisa saber de onde veio cada valor e onde a mudança vai aparecer.

Precedência de preço proposta: regra ativa explícita de unidade+canal+período; override unidade+canal; override unidade; base de marca. Conflitos de mesma prioridade devem ser rejeitados ou resolvidos por regra explícita, nunca pela ordem acidental do banco. Moeda incompatível é erro, não conversão implícita.

O rascunho guarda texto, preço, mídia, opções e programação. Preview mostra diferenças, canais/unidades afetados e pendências. Publicar cria revisão imutável e troca a referência de destino de forma atômica. Agendamento usa fuso da unidade e resolução de horário explícita. Despublicar retira novas consultas; histórico continua protegido.

Disponibilidade tem duas camadas: conteúdo/agenda publicado e bloqueio operacional atual, como esgotado manual ou estoque. Bloqueio atual pode retirar venda imediatamente, sem exigir republicar a carta inteira. O servidor revalida tudo no envio do pedido.

Pedido aceito guarda snapshot de nome, variante, opções, preço, moeda, componentes de total e versão. Atualizar catálogo não altera histórico. Produto removido de um menu não apaga referência em pedidos antigos.

Separar idioma de interface de idioma de conteúdo. Ordem de fallback proposta: idioma pedido revisado, idioma principal da unidade/marca, indicação clara da origem. Se tradução automática existir, ela cria sugestão e registra a versão do texto original. Texto de origem alterado torna a tradução pendente de revisão.

Alérgenos: manter lista controlada e estado conhecido/desconhecido/revisão necessária. Nunca inferir ausência a partir de campo vazio, imagem ou tradução. Informação alimentar sensível exige conferência do restaurante; destaque a última revisão quando isso orientar a equipe.

Importação: mapear colunas, validar encoding/decimal, mostrar erros por linha, simular mudanças e confirmar. Default atômico para o lote aprovado; se houver importação parcial escolhida, informar exatamente o que entrou. SKU/ID e estratégia de atualização evitam duplicação; nomes iguais sozinhos não são chave de identidade.

## CT-08 - Estados do serviço e histórico operacional

Uma mesa pode ter comida em preparo e saldo pendente ao mesmo tempo. Não representar todo o restaurante com um único campo status.

| Agregado | Estados e regra |
| --- | --- |
| Produto / publicação | Rascunho, publicado/agendado, despublicado/arquivado; esgotado é disponibilidade operacional e não apaga a revisão. |
| Sessão de mesa | Aberta, conta solicitada, encerramento pendente, encerrada. Limpeza/bloqueio pertencem ao recurso mesa; transferência preserva a sessão. |
| Pedido | Rascunho, aceito, cancelado ou encerrado; preparação é agregada a partir das linhas/tarefas. Envio local pendente é estado de sincronização. |
| Linha / produção | Nova, enviada, hold, preparando, pronta, retirada/servida, cancelada. Tarefa registra estação e causa. |
| Conta | Aberta, parcialmente liquidada, liquidada, ajustada/anulada segundo histórico. Pagamento pode seguir pendente independentemente do preparo. |
| Pagamento | Criado, processando/indeterminado, confirmado, falhou/cancelado. Refund é entidade própria; parcial é saldo derivado. |
| Reserva | Solicitada quando houver confirmação manual, confirmada, chegou, sentada, finalizada; cancelada e no-show são saídas registradas. |
| Espera | Aguardando, chamado, aceite pendente, sentado, expirado/cancelado. Chamar cliente não cria capacidade extra. |
| Caixa | Aberto, em contagem, divergente, encerrado; reabertura/ajuste é ação auditada. |
| Dispositivo / integração | Não pareado/conectado, ativo, degradado/offline, revogado/desativado. Heartbeat não comprova recebimento de cada pedido. |

Transições são comandos com pré-condições, permissão e evento. Cancelar linha já em preparo exige motivo e, conforme política, gerente. Acréscimo depois do envio cria nova rodada; recall reabre uma tarefa permitida sem criar nova venda ou consumo.

No Restaurant, encerramento operacional pode indicar pagamento resolvido fora da BossaOS, com responsável e motivo. Isso não cria Payment, venda fiscal ou receita processada fictícia. No Pro, fechar conta exige saldo resolvido e conciliação das tentativas de pagamento.

KDS mostra um conjunto principal e backlog completo. Quantidade máxima visível, prioridade e cursos são regras de visualização/produção; nunca descarte pedido por falta de espaço. Estado pronto parcial no expo só vira completo quando todas as tarefas necessárias estiverem resolvidas.

## CT-09 - Conexão, QR e confirmação de ações

Falha de rede exige saber o que o servidor aceitou. Uma confirmação visual só pode afirmar o estado que foi realmente observado.

O cliente gera command_id antes de enviar e o conserva. Servidor persiste comando/resultado junto ao efeito. Em timeout, cliente consulta o comando; se necessário, repete a mesma chave. O evento pode chegar mais de uma vez; o consumidor deduplica. Se o mesmo comando vier com payload diferente, sinalizar conflito.

A fila local da PWA contém apenas dados necessários, com versão e identidade. Particionar por organização, unidade e usuário. Não sincronizar depois de trocar contexto sem reautenticar e resolver rascunhos. Logout/revogação não pode revelar dados ao próximo operador. Configurar retenção local e limpar dados após sincronização conforme política.

Offline no primeiro lançamento: leitura do que estiver disponível e composição de rascunho; novas ações que dependem de saldo/capacidade/servidor ficam bloqueadas ou pendentes. Não implementar pagamentos offline nem reservas confirmadas offline. A UI usa mensagens como "No enviado" e "Pendiente de confirmación".

QR de mesa é rotacionável, mas não demonstra presença física. Default proposto: equipe abre a sessão; convidado apresenta token do QR e código de serviço renovado ou recebe aceite local. A sessão visitante recebe capacidade limitada, prazo e limites de envio. Mesa fechada ou token revogado impede novos pedidos.

Separar token de QR estático, sessão do serviço e credencial do visitante. Não reutilizar dados de uma visita anterior. Por padrão, o visitante acompanha seus próprios pedidos; compartilhamento do total da mesa exige regra explícita e nunca mostra dados pessoais de outros participantes.

SSE usa cursor e eventos duráveis para retomar, com fallback de snapshot. A tela não aplica versão anterior sobre versão atual. Ao detectar intervalo desconhecido, consulta estado autoritativo. Som/notificação são auxiliares; status persistente e alertas de entrega/estação são indispensáveis.

## CT-10 - Reservas sem conflito de capacidade

Uma reserva ocupa recursos durante um intervalo. Contar reservas por horário sem considerar duração, mesas e walk-ins não é suficiente.

Entradas: unidade, zona preferida, pessoas, início, duração, buffer, janela de serviço, mesas aptas, combinações, bloqueios e ocupações reais. Usar intervalo semiaberto [início, fim), com buffer aplicado conforme política. Uma combinação de mesas ocupa seus componentes, sem capacidade duplicada.

Default de implementação: transação serializa alterações de capacidade por unidade usando um lock estável, recalcula alocações e confirma. É uma escolha simples para o piloto; otimizar granularidade somente após medir contenção. Se escolher isolamento serializable, tratar abortos com retry limitado e chave idempotente. [PostgreSQL - isolamento transacional](https://www.postgresql.org/docs/current/transaction-iso.html)

A consulta de disponibilidade é informativa; a confirmação verifica tudo novamente. Se houver disputa, manter a reserva anterior ao falhar um reagendamento e sugerir horários alternativos. Não criar reserva extra para acomodar um conflito silenciosamente.

Walk-ins usam as mesmas alocações. Chegada não significa mesa sentada; liberar uma reserva atrasada depende da política e ação do host. Waitlist não reserva recursos automaticamente; oferta de vaga, se usar hold, tem expiração explícita e consome a capacidade enquanto durar.

Salvar instantes em UTC e regras recorrentes em timezone IANA. Tratar início inexistente/ambíguo nas mudanças de horário de verão, serviço após meia-noite e locale do cliente diferente do restaurante. Timestamps de servidor orientam contagem e relatório.

Mensagens são resultado separado: reserva confirmada pode ter envio de email falho. Tokens de gestão são limitados, revogáveis e não enumeráveis. Depósito de reserva está desligado até existir política comercial, pagamento e tratamento de cancelamento específicos.

## CT-11 - Dinheiro, pagamento, caixa e fiscal

Dinheiro precisa de cálculo determinístico e trilha imutável. A preparação da refeição e a liquidação da conta evoluem separadamente.

Armazenar dinheiro em unidades mínimas inteiras, com código de moeda e escala compatível, sem usar float. Quantidades, taxas e custos fracionários usam decimal exato. Registrar política de arredondamento, desconto por linha/conta e distribuição de resíduos antes de implementar checkout.

Exemplo de aceite: 10,00 EUR dividido por três resulta em 3,34 + 3,33 + 3,33, com ordem de distribuição definida. Somatório de alocações, descontos e pagamentos confere centavo a centavo com o total. Descontos não podem exceder saldo elegível ou virar troco oculto.

Bill representa a obrigação; PaymentAttempt a tentativa; Payment o valor confirmado; Refund a devolução. Tentar pagar precisa reservar/alocar saldo de modo transacional para evitar duas liquidações da última parcela. Tentativa indeterminada é reconciliada antes de criar outra cobrança.

Para provedores de pagamento, verificar assinatura, repetição e ordem dos webhooks e relacionar conta do provedor à unidade. Retorno do navegador não é confirmação suficiente. A documentação da Stripe serve de exemplo de contrato de integração, sem decidir que ela será o provedor contratado. [Webhooks](https://docs.stripe.com/webhooks), [idempotência](https://docs.stripe.com/api/idempotent_requests)

Captura, cancelamento/void e refund têm efeitos distintos. Cancelar comida não devolve dinheiro automaticamente. Refund parcial é limitado ao capturado ainda não reembolsado; correções não reescrevem registro original. Refund não reabre automaticamente saldo a cobrar do cliente: vincular o ajuste/crédito correspondente e preservar a liquidação histórica. Troco é recebido menos devido, sem receita adicional.

Caixa usa movimentos imutáveis; esperado = fundo + entradas em dinheiro - saídas em dinheiro, conforme eventos classificados. Fechamento registra contado, esperado e diferença; divergência exige autorização. Cartão e settlement não entram no caixa físico como notas/moedas.

Emissão fiscal é integração separada, com idempotência, estados, rejeição e correção conforme provedor e país. Não emitir um PDF comum e chamá-lo de documento fiscal. Verificar requisitos oficiais atuais na etapa específica; este guia não estabelece prazo legal nem certifica conformidade. [AEAT - SIF e VERI*FACTU](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html)

Assinatura BossaOS e venda do restaurante são dois domínios: merchant, cliente do provedor, fatura, webhook, reconciliação e titularidade separados. O modelo de onboarding e recebimento do restaurante precisa ser contratado/verificado antes de movimentar valores reais.

## CT-12 - Regras dos módulos de gestão

As áreas de gestão leem fatos operacionais rastreáveis. Elas não completam informação desconhecida com zeros ou números de demonstração.

| Módulo | Default de comportamento |
| --- | --- |
| Estoque | Ledger de movimentos por unidade/local. Saldo derivável; contagem gera ajuste com motivo. Unidade e conversão precisam estar cadastradas. |
| Receita e consumo | Snapshot da revisão da receita; reservar quando a regra de estoque estiver ativa e consumir no primeiro início de preparo. Item sem produção consome no envio confirmado para cumprimento. |
| Cancelamento / perda | Antes de consumir, liberar reserva; depois, registrar perda ou retorno comprovado. Recall não gera nova baixa. |
| Transferência | Saída, trânsito e recebimento vinculados, com permissão nas duas unidades. Mercadoria em trânsito não está simultaneamente disponível nas duas. |
| Compras | Aprovação, recebimento parcial e pagamento são estados separados. Entrada idempotente; devolução conserva relação com recebimento. |
| CRM | Cliente pertence ao tenant; telefone/email não geram perfil global compartilhado. Mescla exige revisão de histórico e consentimentos. |
| Fidelidade | Pontos/créditos têm ledger, fonte, regra versionada e reversões. Expiração e resgate não dependem de sobrescrever um saldo. |
| Campanhas | Rascunho, audiência, teste, autorização e envio; revalidar consentimento no momento de enviar. |
| Equipe | EmployeeProfile difere de User. Registro de ponto e correção são históricos; pausas/turnos respeitam fuso e escopo. |
| Financeiro | Distinguir receita, recebimento, taxa, repasse, despesa e caixa. Custo desconhecido produz margem indisponível/estimada, não margem falsa. |
| Relatórios | Definição, período, timezone, moeda, amostra e status incluídos. Exportação usa mesmos filtros e permissões. |

Indicadores operacionais Restaurant podem usar pedidos aceitos/servidos e seus valores informativos. Indicadores de receita liquidada, custos e caixa só usam dados do módulo correspondente. Não chamar soma de comandas abertas de faturamento recebido.

Consolidação multiunidade agrupa moedas diferentes ou aplica conversão com política e fonte explícitas; não as soma diretamente. Taxas de no-show, ticket médio e tempo de preparo precisam de denominador e intervalo definidos. Médias de percentuais não substituem cálculo ponderado.

Módulos trabalhista, contabilidade legal, banco e publicidade externa não são presumidos por existirem telas de equipe/financeiro/campanhas. Implementar o escopo descrito e integrar prestadores quando necessário, mantendo pendências verificáveis.

## CT-13 - Contrato visual e acessibilidade

A execução preserva a personalidade da BossaOS. O símbolo pode evoluir depois sem impedir um sistema visual consistente agora.

| Token | Valor | Uso |
| --- | --- | --- |
| brand.primary | #102E35 | Verde Atlântico; base, texto e ações. |
| brand.accent | #F5664D | Coral Bossa; destaque editorial. |
| surface.default | #F7F4EC | Areia Clara; fundos. |
| brand.highlight | #DDEA91 | Cítrico; acento pontual. |
| text.secondary | #51666A | Texto secundário. |
| border / surface.soft | #D7DEDA / #E9EFEC | Divisões e superfícies de apoio. |
| success / warning | #276442 / #8A5100 | Estados fixos, acompanhados de texto/ícone. |
| danger / info | #B32635 / #175A8A | Estados fixos, independentes do tema. |

Rubik 700 em títulos e wordmark; Noto Sans em corpo/controles. Base de interface 16/24 px; evitar corpo inferior a 14 px. Hospedar fontes com licenças. No KDS, tamanho e densidade precisam ser inspecionados à distância real de uso.

Texto comum: alvo de contraste 4,5:1; texto grande: 3:1. O par branco/coral não serve para texto comum. Calcular o contraste de temas personalizados no servidor. Os limiares vêm da WCAG; a escolha dos tokens é da marca. [W3C - contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Padrão interno de toque é 44 px no público e 48 px na operação. Isso é mais amplo que o mínimo de 24 px com exceções do critério WCAG 2.2. Verificar teclado, foco, diálogos, zoom, leitura assistida e movimento reduzido. [W3C - tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Starter não edita cores, mas mantém nome/logo/fotos/textos próprios. Restaurant e Pro editam somente tokens públicos permitidos; componente, fonte, grid e estados permanecem BossaOS. Assinatura da plataforma permanece; remoção não foi incluída.

Comparar em 360/390 px para celular, 768 px para tablet, 1280/1440 px para desktop. A composição reordena conteúdo; não reduz uma tela inteira por escala. Atlas é referência de hierarquia, não justificativa para replicar problema de layout ou mostrar dados ilustrativos como reais.

## CT-14 - Dados, confiança e ações sensíveis

Os controles abaixo respondem a dados e ações que o produto efetivamente terá: contatos de reservas, equipe, pagamentos, arquivos, exportações e suporte.

Minimizar dados em formulários e views. Dados para prestar serviço não dão permissão de campanha. Registrar consentimentos por finalidade/canal, origem e momento; retirada deve valer antes de qualquer envio futuro. Políticas de retenção e termos reais são dependências de produção.

Uploads têm tipo/tamanho permitidos, tratamento seguro e associação ao tenant. Não executar SVG/HTML arbitrário do cliente. Buscar imagem por URL exige proteção de destinos e tamanho; não fornecer um proxy aberto para rede interna.

Sessão por cookie seguro e validação de origem nas mutações autenticadas; proteção de abuso, recuperação e login pela biblioteca apropriada. MFA disponível e exigido para papéis/ações sensíveis segundo política documentada. Chaves API têm hash, expiração e escopo.

Exportações verificam permissão no pedido e no download. Links privados expiram. Dados pessoais não devem aparecer em URLs, screenshots de marketing, logs de debug nem payload de observabilidade. CSV exportado precisa tratar conteúdo que planilhas interpretam como fórmula.

Acesso de suporte precisa de finalidade, prazo e escopo; ações são atribuídas ao operador real. Rotação/revogação de dispositivo deve impedir novos comandos. Auditoria registra ação, recurso, versão, ator e motivo, sem copiar segredos.

Integrações externas usam segredos do ambiente e permissões mínimas. Não testar email, campanha, cobrança ou alteração de produção em pessoas reais por padrão. Implementar sandbox e exibir estados reais de configuração, falha e entrega.

Cancelamento de tenant oferece exportação e segue política de retenção aplicável. Não destruir dados financeiros/operacionais automaticamente no clique; preservar registros exigidos conforme a regra jurídica efetivamente validada e limitar acessos após cancelamento.

## CT-15 - O que significa uma etapa estar pronta

Existir uma tela ou passar no build não conclui uma funcionalidade. A evidência deve cobrir o resultado de negócio e os riscos concretos da etapa.

| Dimensão | Critério de aceite |
| --- | --- |
| Rastreabilidade | IDs do mapa ligados a rota/tab/estado, módulo, plano, papel e etapa. Fontes não desaparecem por reagrupamento. |
| Funcionalidade | A ação persiste no servidor quando deve persistir; navegação tem entrada/saída e dados de demonstração estão separados. |
| Integridade | Regras monetárias, de capacidade, versões e deduplicação testadas com banco real quando relevantes. |
| Autorização | Escopo de tenant, marca/unidade e ação verificado em endpoint e job; cenários negativos incluídos. |
| Experiência | Desktop/mobile, conteúdo longo, vazio, carga, erro, sucesso e conexão degradada conforme a superfície. |
| Visual | Tokens, fontes, hierarquia, contraste e permissões de tema mantidos. Capturas comparadas com o atlas. |
| Operação | Logs, correlação, migração e recuperação apropriados à mudança. Integração externa tem estado honesto. |
| Relato | Arquivos alterados, comandos executados, resultados, limitações e próxima etapa no handoff. |

Testar regras onde há risco real: vazamento entre tenants, cobrança, duplicação, estoque, reservas e recuperação. Usar jornadas de navegador para fluxos críticos e inspeção visual representativa. Não escrever centenas de testes que apenas espelham markup estático; ampliar testes somente para risco ou gate pendente.

Status permitidos na matriz de progresso: planejado; em execução; implementado aguardando validação; validado; bloqueado por dependência. Esta entrega inicial deixa todos como planejado. Uma vista adaptada para mobile pode reutilizar componentes, mas precisa de verificação de uso real.

Revisão Claude é independente quando puder ver código e resultados. Sem esse acesso, é revisão documental e não deve dizer que executou testes. Codex apresenta evidência real, não um resumo presumido de aprovação.

## CT-16 - Marcos de entrega e ordem das etapas

A sequência cobre o produto completo e permite validar partes utilizáveis. Não é uma estimativa de prazo e não exige que todos os módulos entrem em produção ao mesmo tempo.

| Marco | Etapas | Resultado verificável |
| --- | --- | --- |
| Preparação | E00 | Contrato físico do núcleo, versões verificadas e handoff para scaffold. |
| G1 - piloto Starter | E01-E11 | Catálogo, publicação, carta QR, site e LP utilizáveis com isolamento e identidade Starter. Cobrança automática e suporte avançado vêm depois. |
| G2 - operação Restaurant | E12-E21 | Cores públicas, mesas, Staff, pedidos, KDS, reservas e retirada; operação coordenada e ensaio de falhas. |
| G3 - gestão Pro | E22-E34 | Contas, pagamentos, fiscal, estoque, compras, CRM, equipe, finanças, relatórios, integrações e plataforma no escopo validado. |
| G4 - entrada assistida | E35 | Pacote operacional e migração/treinamento revisáveis para ativar módulos aptos. |

E11, E21 e E34 são etapas de revisão, não telas novas nem licença para marcar pendências como concluídas. O Codex implementa as correções pelo prompt A02 e a revisão reavalia apenas os pontos afetados. Recursos externos pendentes impedem a liberação daquele recurso, não a construção do restante.

E35 pode ser usado para preparar um piloto Starter logo após G1, limitado ao escopo disponível; depois se atualiza na expansão Restaurant/Pro. A ordem linear continua sendo a referência de construção completa. Não executar etapas dependentes sobre bases reprovadas.

As etapas variam em tamanho. Se uma não couber numa sessão, dividir em E07a/E07b, por exemplo, mantendo a etapa-pai aberta e seus critérios. Interrupção por limite de contexto gera handoff e retomada; não autorização para pular regra ou criar módulos de outra etapa.

## CT-17 - Dados de piloto, migração e operação

La Societat é o primeiro cenário de validação, não um nome fixo no código. Um segundo restaurante de demonstração é necessário para comprovar isolamento.

Fixtures: tenant A La Societat Demo; tenant B Restaurante Horizonte Demo; owner, manager, waiter, kitchen/bar e host com dados artificiais. Use domínios .example e senhas/convites de desenvolvimento gerados localmente. Nenhum arquivo deve conter dados reais de pagamento, senhas ou contatos do restaurante sem confirmação.

Amostra mínima: produto simples, variantes, modificador obrigatório, tradução pendente, alérgeno desconhecido, item esgotado, preço com centavos, horários após meia-noite e duas mesas combináveis. Pro acrescenta compra parcial, divergência de caixa, pagamento indeterminado e refund parcial.

Migração: exportar do sistema anterior quando autorizado; mapear dados; dry-run; revisar contagem, duplicados, preço, idioma, alérgenos e imagens; importar o lote aprovado; comparar; publicar. Não substituir cadastro real por exemplos do atlas nem presumir que uma imagem antiga comprova configuração atual.

Treinar por tarefa: gerente publica; cliente consulta; garçom envia; cozinha prepara; host aloca; caixa liquida. Incluir uma falha de conexão, QR revogado, produto esgotado, cancelamento e fallback de cozinha. Registrar o que fazer e quem resolve.

Antes da ativação: versão, ambiente, migração, backup, rollback, responsáveis e módulos habilitados conhecidos. Testar restauração em ambiente isolado. Objetivos de recuperação são propostos e medidos, nunca prometidos sem ensaio.

Troca de sistema no restaurante exige plano para não registrar a mesma venda duas vezes. Pode haver observação paralela sem dupla operação efetiva; definir qual sistema é fonte para pedidos e para caixa em cada fase. A preparação local não implica autorização de cobrar ou publicar para clientes reais.

## CT-18 - Como Claude e Codex trabalham juntos

Claude consolida o contrato e revisa os marcos. Codex implementa em etapas no repositório e entrega evidências. Os dois usam as mesmas fontes e o mesmo estado de progresso.

Comece pelo README do pacote. Extraia docs/bossaos para o projeto, preservando diretórios e instruções existentes. Os três PDFs originais já estão em docs/bossaos/fontes. Não cole o PDF inteiro como um único prompt nem peça para implementar as 396 vistas numa só resposta.

Primeiro envie E00 ao Claude com os documentos acessíveis. Se for Claude sem acesso a arquivos do repositório, anexe as fontes e os Markdown relevantes; peça os arquivos de saída com caminhos e leve o resultado ao Codex. Nunca trate uma resposta de chat como commit já aplicado.

Depois envie A00 ao Codex uma vez para contexto inicial e E01 para começar. Continue com uma etapa de cada vez. Leia o resumo da entrega; falhas concretas seguem pelo A02. A01 oferece revisão adicional quando houver risco; os marcos E11/E21/E34 já têm revisão obrigatória própria.

Não deixe os dois editarem a mesma base em paralelo. A revisão lê o estado do commit/arquivos indicado. Se o repositório mudar, a evidência da versão anterior não aprova automaticamente a nova. Trabalhos existentes são preservados, com branch/PR quando isso fizer parte do fluxo adotado.

| Arquivo de trabalho | Conteúdo |
| --- | --- |
| docs/progress/E##.md | Escopo, IDs, alterações, migrações, comandos executados, resultado e pendências da etapa. |
| docs/progress/HANDOFF.md | Última etapa, próxima ação, estado do repositório, decisões, bloqueios e instrução de retomada. |
| docs/progress/coverage.csv | Cópia de trabalho da matriz, com status/evidências por vista. A matriz original permanece referência. |
| docs/reviews/E##.md | Achados por severidade com arquivo/requisito/evidência e critério de correção. |
| docs/architecture/adr/... | Escolhas, alternativas relevantes e impacto; não substitui decisão do usuário silenciosamente. |

No limite de contexto, use A03. Retomar significa verificar o estado atual e continuar a menor pendência da etapa, não recomeçar, migrar stack ou gerar novamente o mesmo scaffolding. Reportar teste não executado como não executado.

## CT-19 - Decisões externas e quando elas importam

Não há outra rodada obrigatória de brainstorming antes de começar. Algumas escolhas precisam de acesso comercial ou validação real e entram no momento certo.

| Dependência | Quando bloqueia | O que avançar antes |
| --- | --- | --- |
| Símbolo final da logo | Troca do símbolo em materiais finais | Usar BossaOS escrito; manter o restante do design system. |
| Preços, quotas e contratação | Cobrança real e venda de planos | Entitlements configuráveis e piloto provisionado sem cobrança simulada. |
| Domínio e Instagram | Publicação sob domínio/handle pretendidos | Rotas locais/preview e conteúdo comercial; não afirmar disponibilidade. |
| Hospedagem, storage e email | Links públicos, arquivos reais e comunicação | Adaptadores locais, testes e configuração pronta. |
| Pagamento e merchant | Captura real, terminais e repasses | Contrato do módulo, sandbox e testes de eventos. |
| Fiscal e país/entidade | Emissão real e liberação de venda/documentos | Porta fiscal, testes, fila e checklist verificável. |
| Impressora, TV, kiosk e celulares | Homologação de operação nesses aparelhos | Interface responsiva, simulador/bridge e ensaio documentado. |
| Conteúdo, fotos, preços e alérgenos | Publicação real da carta | Fixtures, importação, validação e preview. |
| Políticas de dados e termos | Coleta/uso real e contratos | Controles de consentimento, retenção configurável e exportação. |

Quando uma dependência faltar, registrar nome, capacidade afetada e informação mínima necessária. Concluir o trabalho verificável que não depende dela. Não colocar um mock em produção com aparência de integração pronta.

A pesquisa anterior de naming não prova reserva do domínio ou do Instagram. Não está sendo feita uma nova consulta de disponibilidade aqui; o produto deve usar URLs relativas/.example até haver domínio controlado.

Para bibliotecas, conferir versões estáveis e avisos oficiais na E00 e registrar lockfile. Para fiscal/pagamento, consultar documentação atual na etapa correspondente. Datas e limites de fornecedor não são constantes eternas do produto.

## CT-20 - Rastreabilidade, fontes e limites da entrega

Este pacote complementa os PDFs existentes. O conteúdo produzido é especificação e instrução de implementação; não há aplicação pronta, teste de produto executado ou homologação nesta entrega.

Fontes internas: Mapa_Completo_Telas_Restaurant_OS_v1.pdf (25 páginas); BossaOS_Manual_de_Marca_e_Estrategia_v1.pdf (39 páginas); BossaOS_Atlas_Completo_Desktop_Mobile_v1.pdf (421 páginas). O pacote inclui cópias e um manifesto de integridade com hashes SHA-256.

COBERTURA_TELAS.csv preserva 396 IDs únicos: 360 do mapa, 12 MKT, 8 THEME e 16 STATE. Cada linha tem nome original, título do atlas, plano de origem, etapa principal, etapas relacionadas, família/rota, tipo de composição, página do atlas e estado inicial planejado.

A etapa principal indica responsabilidade de implementação, não exclusividade. Estados transversais implementados na E02 precisam aparecer nas telas posteriores; administração básica nasce antes das interfaces avançadas. O CSV mantém essas extensões e as diferenças em DECISOES.md.

As referências externas sustentam detalhes de tecnologia/acessibilidade e pontos de consulta. As regras comerciais, arquitetura, sequência e defaults de domínio são propostas específicas para BossaOS, não fatos extraídos de fornecedores.

Revisão deste pacote: correspondência dos IDs, contagens e etapas; PDFs originais incluídos sem alteração; consistência de planos/cores; prompts com entrega e aceite; renderização e leitura do novo PDF. Implementar e validar o sistema será o trabalho das próximas etapas.
