# Critérios de aceite

Leia CT-15 antes de marcar uma etapa como concluída. Riscos concretos exigem testes adequados; conteúdo visual estático exige inspeção, não testes redundantes.

## Cenários de risco

| ID | Risco | Resultado esperado | Etapa |
| --- | --- | --- | --- |
| T01 | Isolamento | A consulta/escrita/exportação/evento/arquivo de B não é acessível a A. | E03/E04/G1 |
| T02 | Permissão | Papel local não amplia escopo por editar URL, payload ou storage. | E04 e todas |
| T03 | Tema/entitlement | Starter não muda cor por API; downgrade aplica tema e preserva dados. | E05/E12 |
| T04 | Publicação | Falha mantém revisão anterior inteira; preview privado não vaza. | E08 |
| T05 | Tradução/alérgeno | Mudança de origem pede revisão; desconhecido não vira sem alérgeno. | E07/E08 |
| T06 | Idempotência | Timeout após commit + reenvio gera um efeito, com command_id estável. | E14/E23 |
| T07 | Concorrência | Dois garçons e cliente não apagam nem duplicam linhas. | E14/E15/E17 |
| T08 | KDS | Mais de cinco tickets continuam no backlog; replay/recall não duplica tarefa. | E16 |
| T09 | QR | Revogado/sessão anterior não cria pedido; visitante não lê dados de outro. | E17 |
| T10 | Reservas | Última vaga disputada produz uma confirmação; buffer e combinação contam. | E18/E19 |
| T11 | Offline | Rascunho não é enviado; reconciliação precede retry e respeita identidade. | E15/E16 |
| T12 | Valores | Partes somam total; desconto/cortesia e impostos seguem política definida. | E22/E24 |
| T13 | Pagamento | Callback tardio e webhook fora de ordem não duplicam saldo/cobrança. | E23 |
| T14 | Refund | Parcial respeita capturado restante; repetição não devolve duas vezes. | E23 |
| T15 | Estoque | Saldo deriva dos movimentos; recall não consome; retorno exige registro. | E25/E26 |
| T16 | CRM | Opt-out é considerado no envio; perfis não se unem entre tenants. | E27 |
| T17 | Suporte | Sessão temporária expira, deixa trilha e não mantém acesso residual. | E33 |
| T18 | Restauração | Backup restaurado em ambiente isolado tem amostra de dados coerente. | E35 |

## Jornadas do mapa original

| ID | Jornada | Aceite mínimo | Marco |
| --- | --- | --- | --- |
| J01 | Primeiro go-live | Criar tenant/unidade, importar, revisar, publicar, gerar QR e testar. | G1 |
| J02 | Consultar carta | QR, idioma, categoria, produto, preço e alérgenos. | G1 |
| J03 | Pedido por QR | Sessão, carrinho, enviar, cozinha/bar, pronto e servido. | G2 |
| J04 | Pedido do garçom | PIN confiável, mesa, opções, envio e acompanhamento. | G2 |
| J05 | Produção | Receber, preparar, pronto parcial/total, expo e retirada. | G2 |
| J06 | Reserva online | Capacidade, contato, confirmar, comunicação, chegada e mesa. | G2 |
| J07 | Walk-in | Grupo, espera, liberar/alocar recursos e abrir sessão. | G2 |
| J08 | Pagamento Pro | Conta, divisão, método, confirmação, documento e fechamento. | G3 |
| J09 | Caixa | Abrir, movimentar, contar, reconciliar e encerrar. | G3 |
| J10 | Esgotamento | Bloqueio manual/estoque e atualização coerente nos canais. | G2/G3 |
| J11 | Preço novo | Editar rascunho, comparar, publicar; pedido antigo mantém snapshot. | G1/G2 |
| J12 | Nova unidade | Concessão, unidade, catálogo herdado/override, equipe e dispositivos. | G3 |
| J13 | Internet falha | Detectar, conservar rascunho, consultar comando e sincronizar. | G2 |
| J14 | Integração falha | Preservar fato, sinalizar, reprocessar sem duplicar e reconciliar. | G2/G3 |
| J15 | Suporte | Ticket, diagnóstico autorizado, acesso temporário e auditoria. | G3 |

Todos os testes acima são requisitos futuros. A criação deste pacote não executou testes da aplicação, pois ela ainda não foi construída.
