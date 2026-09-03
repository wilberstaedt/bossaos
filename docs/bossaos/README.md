# BossaOS - pacote de implementação v1

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
