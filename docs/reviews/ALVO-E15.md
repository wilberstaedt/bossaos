# Régua do E15 — Staff PWA e funcionamento degradado

> Escrita a 04/09, **antes de existir uma linha de E15**. 23 telas.
> Isto é o que vou exigir. Se aparecer aqui só depois da entrega, não vale.

## O que torna esta etapa diferente das catorze anteriores

Nas outras, um defeito dava erro. Aqui **o defeito típico é o sistema a dizer que
correu bem.** «Enviado» num ecrã, com o comando só gravado no telemóvel. O
empregado vira costas, a cozinha nunca soube, e ninguém procura o que não deu
erro. Por isso quase tudo o que vou pedir abaixo é a mesma pergunta: *como é que
esta prova ficaria vermelha se o sistema estivesse a mentir?*

## Aceite 1 — J04 e J13 com perda de rede

**Recuso a demonstração feliz:** desligar a rede, ver um aviso, ligar a rede, e o
pedido aparecer. Isso mede o caso fácil e passa mesmo com o defeito grave lá
dentro.

Exijo **as duas perdas, que são problemas diferentes**:

1. **Rede perdida ANTES do envio.** Nada chegou ao servidor. O rascunho tem de
   sobreviver a um *refresh* — não a um estado em memória, que qualquer recarga
   apaga. E o ecrã **não** pode dizer enviado.
2. **Rede perdida DEPOIS do envio.** O servidor já tem. Isto é o aceite 1 do E14
   outra vez, do lado do cliente: ao reconectar, **consultar os comandos antes de
   repetir**. Um sistema que reenvia às cegas cria o segundo pedido, e o
   `command_id` único do E14 é a rede de segurança — não a solução. Quero ver a
   consulta acontecer, não só o pedido não duplicar.

**Sem a segunda, considero o aceite não demonstrado.** É a que separa uma fila
local de uma fila local correcta.

## Aceite 2 — cliente e empregado ao mesmo tempo

Origens conservadas, itens sem duplicado. **O par:** dois itens iguais pedidos de
propósito por pessoas diferentes **não são um duplicado** — são dois. Uma
implementação que junte tudo por semelhança passa o teste da duplicação e perde
comida real.

## O que a régua persegue com mais força: «nunca mostre enviado»

O contrato di-lo pelo nome (*Respeite 1*). Exijo o controlo negativo:

- **Forçar o envio a falhar** e verificar que o ecrã **não** diz enviado, e que
  um *refresh* continua a dizer não enviado. Um toast desaparece na recarga; um
  estado errado gravado não desaparece — e é por isso que a prova tem de
  recarregar.
- Os quatro estados (**não enviado, à espera de confirmação, confirmado,
  conflito**) têm de ser distinguíveis **sem som e sem toast**. Se a única
  diferença entre dois deles for uma notificação que já passou, não são quatro
  estados: são dois e uma esperança.

## Troca de identidade — a família de defeito que já apareceu três vezes

*Respeite 2.* A fila é particionada por identidade, organização e unidade.

- **Trocar de utilizador não mostra rascunhos do anterior** — e **o par**: o
  anterior volta e **os rascunhos dele ainda lá estão**. Uma implementação que
  apague ao trocar passa a primeira metade e destrói trabalho.
- **Sessão expirada exige reautenticação ANTES de sincronizar.** Exijo ver uma
  fila que **não** dispara ao reconectar com sessão morta. Sincronizar primeiro e
  autenticar depois é o mesmo defeito do ORG-007 noutra roupa: uma porta aberta
  por quem já não devia lá estar.
- **Revogação descarta**, e diz-se ao revogar (`offline-e-fila-local.md`,
  regra 3-bis), com **o número** que o aparelho declarou ter — nunca o conteúdo.

## Dinheiro, que aqui é onde se vê

Offline **não faz pagamento** — por desenho, não por limitação. Exijo a tentativa:
uma acção financeira offline tem de ser **recusada**, não enfileirada.

E o E14 aterra aqui: um rascunho escrito offline e aceite mais tarde vale o preço
do servidor **no momento em que aceita**, e a divergência é rejeitada com motivo.
Isso tem de estar **visível no ecrã do empregado** — a linha rejeitada fica, com
o preço proposto e o oficial lado a lado. Se a divergência só aparecer num log, o
E14 foi bem implementado e mal entregue.

## O que reprovo à cabeça

- **Verde sobre fila vazia.** Uma fila local sem comandos passa quase tudo. Cada
  prova declara **quantos comandos** existiam antes de afirmar seja o que for.
- **Estado só em memória.** Se não sobrevive a um *refresh*, não é estado.
- **Prova sem recarregar a página.** Metade dos defeitos desta etapa só aparecem
  depois de um F5.
- **23 telas sem navegador.** Cinco larguras, alvos de toque a 44 px, ES/PT/EN.
  Esta etapa é de telemóvel; medir só a 1280 px é não medir.
- **Uma suite que não consegue ficar vermelha.** Como no E14: quero um defeito
  plantado **no artefacto real** a derrubar a asserção certa, e reposto a seguir.

## E uma coisa que eu próprio tenho de respeitar

O meu contrato de preço offline estava **errado** e foste tu que o mostraste. Se
alguma coisa nesta régua bater contra o que a construção mostrar, diz — a régua
existe para medir a entrega, não para eu ter razão.
