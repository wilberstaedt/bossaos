# Régua do E32 — Integrações, API e cobrança do SaaS

> Escrita a 06/09, **antes de existir código**. Treze telas. Contrato:
> [`integracoes-e-cobranca-do-saas.md`](../architecture/integracoes-e-cobranca-do-saas.md),
> escrito imediatamente antes desta régua e também antes do código.

## O que muda nesta etapa

**É a primeira em que um estranho fala com o sistema sem passar por tela
nenhuma.** Nas outras, quem age está numa sessão que alguém abriu; aqui chega um
pedido com uma chave, ou um webhook de fora, e o produto decide sozinho se
acredita.

E é também a primeira em que **o defeito rende dinheiro a quem o encontrar** —
não é um erro que prejudica, é uma porta que se atravessa de propósito.

## 1. O aceite que decide a etapa, e não abro excepção

**Um webhook com o `organization_id` de outra organização não pode mudar
concessão nenhuma.** A mudança liga-se ao **cliente verificado no provedor**, e
a ligação entre esse cliente e a organização tem de já existir do nosso lado,
criada por alguém autenticado.

Se este controlo passar, **não assino a etapa** — por mais que o resto esteja
verde. Um identificador que vem no corpo não é uma autorização; é, no máximo,
uma sugestão a confirmar contra o que já sabemos.

E há uma razão a mais para ser rígido: o E05 tirou ao processo do site a
permissão de escrever em `entitlement_grants`. Um webhook que escrevesse lá
directamente **contornava essa fronteira por fora**, e seria o mesmo defeito com
carimbo de integração.

**A semente tem de ter DUAS organizações.** Com um inquilino só, este caso não
existe — e o defeito mais perigoso da etapa fica impossível de observar.

## 2. A chave mostra-se uma vez, e guarda-se o resumo

Um ecrã que consegue mostrar outra vez uma chave antiga **prova que ela está
guardada em claro**. Reprovação directa, sem discussão.

## 3. O âmbito verifica-se por operação, não à entrada

Um portão único no início do encaminhador é um portão que a próxima rota
esquece. **O controlo tira a verificação de UMA rota**, não do encaminhador — se
o plante desligar o portão central, mede outra coisa.

> É a regra do JR aplicada aqui de antemão: *um plante pela metade não planta o
> defeito*. Nesta etapa a metade errada é fácil de escolher.

## 4. Revogar corta já

No mesmo segundo, não no próximo ciclo de cache. Mesma exigência da retirada de
consentimento do E27.

## 5. A assinatura é sobre o corpo cru

Como o E24 fixou, e com a formulação dele: **a excepção não dispensa a exigência,
troca-a.** Proibir o `.json()` e exigir o corpo em bruto, porque uma assinatura
verificada sobre a nossa reconstrução não verifica nada.

## 6. Destinos: nada da rede interna, nem por redireccionamento

Um campo onde o cliente escreve um URL é um campo onde o cliente pode pedir ao
nosso servidor que vá ler o que só ele vê. O controlo tem de tentar **as duas
vias** — o endereço interno directo e o redireccionamento para ele.

## 7. Os dois dinheiros não somam

Cobrar a assinatura ao restaurante não é cobrar o jantar ao cliente. Um total
que os junta responde a uma pergunta que ninguém faz e esconde as duas que se
fazem.

## O que aceito como pendência

**O provedor de assinatura.** Não há conta nem chaves, e inventar um contrato de
provedor a fingir seria o erro do E24 outra vez. O que exijo é que o produto
**diga que não está ligado** em vez de parecer que está — como o E27 fez com os
envios.
