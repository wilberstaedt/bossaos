# Offline e fila local

> E00, escrito antes do E15/E16. Traduz o CT-09 em decisões testáveis.
> Verificado contra `docs/bossaos/CONTRATO_TECNICO.md`, secção CT-09.

## O que a fila local realmente é

Um tablet de sala é **partilhado**. É o mesmo aparelho onde o turno da tarde e o turno da
noite entram, e onde o gerente entra por trinta segundos para autorizar um desconto. Por
isso a fila local não é um detalhe de UX de "estar sem rede": é **superfície de fuga de
dados e de atribuição errada**.

O cenário que decide o desenho: o operador A compõe dois rascunhos, fica sem rede, sai. O
operador B entra. A rede volta. **Se a fila esvaziar agora, os pedidos de A entram com a
sessão de B.** Atribuição errada, e — se A e B forem de unidades diferentes — dado de uma
unidade a viajar para outra.

## Cinco regras

**1. A fila é particionada por organização, unidade e utilizador, e a partição faz parte da
chave.** Não é um filtro à leitura. Um registo sem os três não é sincronizável: é lixo a
descartar, nunca um registo a enviar "com o contexto actual".

**2. Trocar de contexto não descarrega a fila.** Sessão nova, utilizador novo ou unidade
nova **suspendem** a sincronização até o dono dos rascunhos se reautenticar e resolvê-los.
Não se apagam em silêncio — apagar é perder o trabalho de alguém — mas também não seguem.

**3. Logout e revogação limpam o que é legível.** O próximo operador não vê nome de cliente,
linhas de pedido nem totais do anterior. O que sobrevive à sessão é o mínimo para o dono
recuperar o rascunho, e não é legível pelo seguinte.

**4. O `command_id` nasce no cliente, antes do envio, e sobrevive ao recarregamento.** Se
morre com o separador do navegador, a retentativa cria uma segunda cobrança ou um segundo
pedido — que é exactamente o defeito que ele existe para impedir.

**5. Offline não faz pagamento nem reserva confirmada.** Não é uma limitação da primeira
versão a corrigir depois: é o desenho. Ambos exigem que o servidor diga sim.

## Os quatro estados que a UI mostra, e a diferença entre dois deles

Não enviado · Pendente de confirmação · Confirmado · Conflito.

A distinção que interessa é entre **não enviado** (sei que não saiu) e **pendente de
confirmação** (saiu, e não sei o que aconteceu). Colapsar os dois num "a sincronizar" é o
que leva alguém a carregar outra vez e a cobrar duas vezes.

Um estado indeterminado **consulta o comando antes de repetir**. Sempre, e nunca ao
contrário.

## Reconexão

Consultar antes de repetir. SSE retoma por cursor; ao detectar um intervalo desconhecido,
vai ao estado autoritativo em vez de adivinhar. **Uma versão antiga nunca se aplica sobre
uma mais recente** — nem quando chega depois, o que acontece e é normal.

Duas telas com o mesmo pedido aberto chegam ao mesmo estado sem apagar o trabalho uma da
outra: acrescentar linhas é aditivo; editar a mesma linha é conflito de versão, e
recuperável.

## O que se testa no E15/E16

1. A com dois rascunhos, B entra, rede volta → **nada de A é enviado**, e a fila fica
   suspensa em vez de esvaziar.
2. Logout de A → B não lê conteúdo nenhum dos rascunhos de A no armazenamento local.
3. Recarregar o separador a meio → o `command_id` é o mesmo, e o servidor devolve o
   resultado anterior em vez de criar um segundo efeito.
4. Mesma chave com payload diferente → conflito. Não é "o último ganha".
5. Evento repetido e fora de ordem → estado final correcto; o antigo não sobrepõe o novo.
6. Offline a tentar pagar ou confirmar reserva → bloqueado, com o motivo dito.

**Controlo negativo obrigatório**: desligar a partição por utilizador e ver o caso 1 ficar
vermelho. Um teste que passa com e sem a partição não está a testar a partição — está a
testar que a rede voltou.
