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
