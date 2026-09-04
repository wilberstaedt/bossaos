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
| E09 | validado | docs/progress/E09.md · provar-publico.sh: 11 passos, **sete grupos, 26 casos, dez** controlos negativos · retido uma vez pela detecção de verbo que só via uma forma de escrever POST, fechada com onze formas · endereço público que não volta ao mundo, com o par que o separa da regra preguiçosa (o dono retoma) · **ASSINATURA PARCIAL fechada a 04/09**: as 5 telas que exigiam sessão (CHAN-001, QR-001/003/004, REP-001) foram medidas no E10, quando o arnês passou a autenticar · a correcção da fuga entre unidades ganhou detector próprio (grupo 7) depois de se descobrir que a própria prova a repunha na base a cada passagem |
| E10 | validado | docs/progress/E10.md · provar-sites.sh: 11 passos, 27 casos, **8 controlos negativos** — rascunho que sai, retirada por bandeira, idempotência do lead, **o `catch` largo**, domínio largado, a **regra preguiçosa** e a porta que serve sem prova de controlo · **254 casos de navegador corridos pelo revisor** a 360/390/768/1280/1440 · as 29 telas com móvel medido, e as **5 do E09 saíram da dívida** — condição bloqueante cumprida |
| E11 | validado | docs/reviews/E11.md · **marco do Starter APROVADO à 2ª** · reprovado à 1ª com **seis** falhas, todas de MEDIÇÃO e duas de assinatura minha · fechadas e reprovadas por `scripts/provar-marco-e11.sh`, que responde às seis pelo nome · 112/112 telas validadas **e** medidas em móvel · recusa entre inquilinos vista no ecrã nos dois sentidos · jornada percorrida de organização inexistente até site publicado · identidade por porta estreita com os dois consertos errados plantados |
| E12 | validado | docs/progress/E12.md · **validado à 2ª** — a 1ª assinatura foi retirada por eu ter assinado sobre um verde só local · a CI passa agora o trabalho do navegador, que era o ambiente que me contradizia · 7 controlos negativos na base e 22 casos no navegador com a cor **calculada** · a prova deixou de HERDAR o plano: estabelece-o e **verifica-o antes de medir** |
| E13 | validado | docs/progress/E13.md · **validado à 2ª** — retido por a junção a `users` do `ORG-007` estar viva pela **terceira** vez, no `responsavel` do `salaAgora` · fechada por estrutura com `validar-juncao-identidade.sh`, que a encontrou um minuto depois de existir · aceite 1 atacado pelo revisor **contra a base**, nos dois lados: segunda sessão recusada pelo índice único **parcial**, e a mesa reabre depois de FECHADA · limpeza como estado da sessão, não coluna da mesa |
| E14 | implementado aguardando validação | docs/progress/E14.md · 2 migrações (`e14_pedidos` com 5 tabelas, RLS, envios e eventos **append-only por privilégio**, e o gatilho `linha_aceite_imutavel`; `e14_combos` com a restrição `componente_de_combo_nao_tem_preco`) · `provar-pedidos.sh` a 0 com **3 grupos, 21 casos e OITO controlos negativos** · idempotência por **restrição única** na base — o reenvio depois do commit devolve a MESMA resposta, e duas chaves diferentes continuam a criar dois pedidos · linhas **acrescentadas** e nunca reescritas em bloco; conflito **recuperável** com o que mudou e por quem · preço **copiado** para a linha aceite, com gatilho a recusar alterá-lo · **18 telas** (a régua diz 20; a matriz tem 18 e as outras 3 são telas anteriores a rever) com móvel medido · **a pergunta de dinheiro fica respondida**: o preço é o do servidor ao aceitar, e a divergência é rejeitada com o motivo em vez de aplicada em silêncio |
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
