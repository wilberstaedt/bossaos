# Registro de decisões

Versão 1.0 - 02/09/2026. "Confirmado" vem da conversa; "Default proposto" é uma decisão técnica deste pacote para execução, ajustável com motivo/ADR. Não significa aprovação prévia inexistente.

| ID | Estado | Decisão | Efeito |
| --- | --- | --- | --- |
| D01 | **Resolvido 03/09** | Marca BossaOS; símbolo e wordmark entregues | `brand/logoicon.png` em espaço quadrado/pequeno; `brand/logoname.png` onde há largura. A regra antiga de "usar só o wordmark" deixou de valer — ver ADR 0001. |
| D02 | Confirmado | Tema público Starter fixo; Restaurant/Pro com cores | Sem personalização de admin, estados, tipografia ou grid. |
| D03 | Confirmado | Multi-tenant desde o início e catálogo compartilhado | Manter Organization > Brand > Location em todos os planos. |
| D04 | Default proposto | Monólito modular + Next.js/PostgreSQL/Drizzle/Better Auth | E00 verifica versões e repositório; registrar ADR antes do scaffold. |
| D05 | Default proposto | Produto de marca, referências por canal/unidade | Esclarece catálogo único e cópia explícita entre marcas. |
| D06 | Default proposto | MFA e proteções básicas em todos os planos | Esclarece AUTH-005/SET-010, que aparecem ligados a Pro no mapa. |
| D07 | Default proposto | Auditoria básica sempre produzida | CAT-026/ORD-009/SET-011 podem ter consulta avançada limitada; rastreabilidade não depende da tela. |
| D08 | Default proposto | Fechar serviço Restaurant com resolução externa | Esclarece FLOOR-011 vs STAFF-020: encerramento operacional não é Payment Pro. |
| D09 | Default proposto | Assinatura por organização e grants por unidade | Quotas sem números inventados; expansão exige configuração explícita. |
| D10 | Default proposto | Downgrade após resolver operações incompatíveis | Preserva histórico, pagamentos pendentes e tema anterior. |
| D11 | Default proposto | HTTP + SSE, outbox e worker no mesmo core | Não introduzir microserviços ou infraestrutura extra sem necessidade. |
| D12 | Default proposto | QR estático + sessão ativa + validação de serviço | Token de mesa sozinho não demonstra presença física. |
| D13 | Default proposto | Reserva transacional serializada por unidade | Última vaga concorrente tem um único vencedor. |
| D14 | Default proposto | Consumo de estoque no início de preparo | Receita capturada, baixa idempotente e perda/devolução explícita. |
| D15 | Default proposto | Kiosk/delivery como concessões separadas | Resolve diferença entre lista Pro e matriz de add-ons do mapa; dependências operacionais continuam obrigatórias. |
| D16 | Pendente externo | Preço, quotas, fiscal, pagamento, DNS e hardware | Não impede scaffold; limita cobrança, publicação ou integração correspondente. |
| D17 | Default proposto | Estados/tabs não equivalem a rotas independentes | Preservar os 396 IDs, agrupando componentes de maneira utilizável. |
