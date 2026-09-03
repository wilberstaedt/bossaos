# Estado inicial

Os PDFs, contratos e prompts estão preparados. Nenhuma etapa de implementação foi executada nesta entrega. Copie esta referência para docs/progress quando iniciar o repositório.

| Etapa | Status | Evidência |
| --- | --- | --- |
| E00 | implementado aguardando validação | 7 documentos em docs/architecture; validação real vem do E11, quando se vir se o E02-E10 se construíram a partir deles |
| E01 | validado | docs/progress/E01.md · 16 testes · provar-separacao-de-credenciais.sh e provar-prontidao.sh a 0 falhas |
| E02 | validado | docs/progress/E02.md · 2ª declaração após docs/reviews/E02.md · 69 testes unitários + 69 no browser · 12 capturas · STATE-001/002/003/005/007/016 |
| E03 | validado | docs/progress/E03.md · 2ª declaração após docs/reviews/E03.md · 85 testes + 28 asserções de isolamento + 12 verificações no provar-isolamento.sh (inclui autoteste do verificador) · zero telas, coverage intacto |
| E04 | validado | docs/progress/E04.md · 3 migrações · **127 asserções unitárias à data da validação** (domain 38 · ui 37 · i18n 16 · config 14 · auth 12 · db 5 · storage 5; worker declarado a zero) + 24 de acesso por HTTP + 13 de recuperação e MFA + 4 de fuso · provar-acesso.sh a 0 com o par a colapsar e provar-recuperacao-e-mfa.sh a 0 com três controlos negativos · 12 telas |
| E05 | validado | docs/progress/E05.md · 3 migrações (planos, descida agendada, plataforma) · **133 asserções unitárias** (domain 38 · ui 39 · i18n 16 · config 14 · auth 12 · db 5 · storage 5 · worker 4; **nenhum pacote declarado a zero**) + 17 de planos + 14 de descidas + 10 de plataforma · provar-planos.sh, provar-descidas.sh e provar-plataforma.sh a 0, com nove controlos negativos ao todo · 12 telas |
| E06 | validado | docs/progress/E06.md · 4 migrações (onboarding, criar organização, quota de marcas) · **motor de horários com três respostas** e lista de arranque com quatro estados · provar-onboarding.sh a 0 com 4 controlos negativos + guarda de limpeza · 14 telas |
| E07 | validado | docs/progress/E07.md · migração `e07_catalogo` (15 tabelas, allergens só de leitura para o runtime) · **ausência de declaração vale DESCONHECIDO por tipo, não por convenção** · empate de preços recusa em vez de escolher · modificadores validados por chamada directa à API, com os limites lidos da base · dinheiro em inteiros de unidade mínima · `provar-catalogo.sh` a 0 com 7 grupos, 21 asserções e 6 controlos negativos · guarda nova `validar-classes.sh` · 18 telas |
| E08 | validado | docs/progress/E08.md · migração `e08_media_traducoes_importacao_publicacao` (8 tabelas; `menu_revisions` sem UPDATE nem DELETE para o runtime) · **publicar é atómico por construção** — a revisão e a troca do ponteiro no mesmo COMMIT · CSV neutralizado, SVG recusado pelos bytes, três portas contra a rede interna · nome igual nunca funde produtos · exportação verificada duas vezes · 221 asserções no domínio + 35 contra a base, **34 controlos negativos** · retido à 1ª: o `redirect: manual` era uma protecção sem vigia, fechada com o controlo 9d · 10 telas |
| E09 | validado | docs/progress/E09.md · provar-publico.sh: 11 passos, 23 asserções, **oito** controlos negativos · retido uma vez pela detecção de verbo que só via uma forma de escrever POST, fechada com onze formas · endereço público que não volta ao mundo, com o par que o separa da regra preguiçosa (o dono retoma) · 18 migrações do zero · **pendência declarada e bloqueante: as 11 telas sem prova de móvel, a fechar no E10** |
| E10 | planejado |  |
| E11 | planejado |  |
| E12 | planejado |  |
| E13 | planejado |  |
| E14 | planejado |  |
| E15 | planejado |  |
| E16 | planejado |  |
| E17 | planejado |  |
| E18 | planejado |  |
| E19 | planejado |  |
| E20 | planejado |  |
| E21 | planejado |  |
| E22 | planejado |  |
| E23 | planejado |  |
| E24 | planejado |  |
| E25 | planejado |  |
| E26 | planejado |  |
| E27 | planejado |  |
| E28 | planejado |  |
| E29 | planejado |  |
| E30 | planejado |  |
| E31 | planejado |  |
| E32 | planejado |  |
| E33 | planejado |  |
| E34 | planejado |  |
| E35 | planejado |  |

Use estados: planejado; em execução; implementado aguardando validação; validado; bloqueado por dependência. Não transforme cobertura de design em implementação pronta.
