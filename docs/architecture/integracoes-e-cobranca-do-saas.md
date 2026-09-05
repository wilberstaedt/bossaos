# Integrações, API e cobrança do SaaS

> Escrito a 06/09, **antes de existir código do E32**. Por fronteira. O dinheiro
> do consumidor está em [dinheiro.md](dinheiro.md); a conciliação em
> [conciliacao-e-fecho.md](conciliacao-e-fecho.md); os planos em
> [planos-e-limites.md](planos-e-limites.md).

**Esta é a etapa de maior risco do produto inteiro**, e por uma razão que não é
técnica: é a primeira em que um estranho fala com o sistema sem passar por
nenhuma tela. Nas outras, quem age está autenticado numa sessão que alguém
abriu. Aqui chega um pedido com uma chave, ou um webhook de fora, e o produto
tem de decidir sozinho se acredita.

---

## Fronteira 1 — nasce uma chave de API

**A chave mostra-se UMA vez e nunca mais.** Guarda-se o resumo criptográfico,
não a chave — se a base for lida por quem não devia, o que lá está não abre
nada. Um ecrã que consegue mostrar outra vez uma chave antiga é um ecrã que
prova que ela está guardada em claro.

Toda a chave tem **âmbito** e **validade**. Uma chave sem âmbito é uma chave de
administrador com outro nome, e uma chave sem prazo é uma chave para sempre —
incluindo depois de a pessoa que a criou sair da empresa.

**Revogar tem efeito imediato**, não no próximo ciclo de cache. É a mesma
exigência da retirada de consentimento no E27: quem disse que não, não recebe.

## Fronteira 2 — chega um pedido com uma chave

O âmbito verifica-se **por operação**, não à entrada. Um portão único no início
do encaminhador é um portão que a próxima rota esquece.

**O rasto guarda QUEM chamou**, e a chave identifica-se sem se mostrar — pelo
seu identificador, nunca pelo valor. Daqui a um ano alguém vai perguntar quem
fez uma alteração, e «uma chave de API» não é resposta.

## Fronteira 3 — sai um webhook nosso

**A assinatura é sobre o corpo CRU.** É a regra que o E24 já fixou para o lado
de dentro, e que o JR formulou melhor do que eu: *a excepção não dispensa a
exigência, TROCA-A* — proibir o `.json()` e exigir o corpo em bruto, porque uma
assinatura verificada sobre a nossa reconstrução do JSON não verifica nada.

**Cada entrega leva versão e identificador próprio**, para quem recebe poder
descartar repetições. Reenviar é normal — a rede falha — e um consumidor sem
maneira de deduplicar processa a mesma venda duas vezes.

**O destino é validado antes de sair.** Nada de endereços da rede interna, nada
de seguir redireccionamentos para lá. Um campo onde o cliente escreve um URL é
um campo onde o cliente pode pedir ao nosso servidor que vá ler o que só ele vê.

## Fronteira 4 — entra um webhook do provedor de pagamento

**A fronteira mais perigosa do produto, e vale a pena dizer porquê em voz alta.**

Um webhook que altera concessões comerciais é, do outro lado, **um pedido para
mudar quanto alguém paga**. Se ele aceitar o `organization_id` que vem no corpo,
qualquer pessoa que descubra o endereço dá a si própria o plano que quiser — e o
sistema regista tudo como se fosse legítimo, porque foi.

**A regra:** a mudança liga-se ao **cliente verificado no provedor**, e a
ligação entre esse cliente e a organização já tem de existir **do nosso lado**,
criada por alguém autenticado. O identificador que vem no corpo não é uma
autorização: é, no máximo, uma sugestão a confirmar contra o que já sabemos.

E isto encaixa no que o E05 já decidiu: o processo do site **não pode escrever**
em `entitlement_grants`. Um webhook que escrevesse lá directamente contornava
essa fronteira por fora — e seria o mesmo defeito, com carimbo de integração.

## Fronteira 5 — o dinheiro do SaaS encontra o dinheiro da refeição

**São duas contabilidades e não se tocam.** Cobrar ao restaurante a assinatura
não é cobrar ao cliente o jantar: contas diferentes, provedores possivelmente
diferentes, conciliações separadas.

Um total que some as duas responde a uma pergunta que ninguém faz, e esconde as
duas que se fazem: «quanto facturou a casa» e «quanto é que ela me paga».

## Fronteira 6 — não há provedor

**O que não tem provedor real fica declarado e visível**, como o E27 fez com os
envios e o E24 com o gateway. Um conector que finge funcionar é pior do que um
conector que diz que não está ligado — porque o primeiro só se descobre quando
um cliente conta com ele.

---

## O que vou exigir como prova

1. **A chave só se vê uma vez.** Controlo: guardar em claro e ver a prova
   acender; e um ecrã que a mostre outra vez é reprovação directa.
2. **Âmbito por operação**, com o par: a chave certa passa, a de âmbito errado
   não — e o controlo tira a verificação de UMA rota, não do encaminhador.
3. **Revogar corta já.** Controlo: revogar e chamar no mesmo segundo.
4. **Assinatura sobre o corpo cru.** Controlo: assinar a reconstrução e ver
   acender.
5. **Reenvio não duplica** do lado de quem recebe.
6. **Destino interno recusado**, incluindo por redireccionamento.
7. **O webhook de pagamento com um `organization_id` de outra organização NÃO
   muda nada.** É o controlo que decide a etapa; se ele passar, não assino.
8. **Os dois dinheiros não somam** em relatório nenhum.

E a semente tem de ter **duas organizações**, senão o caso 7 não existe: um
único inquilino faz o defeito mais perigoso desta etapa ser impossível de
observar.
