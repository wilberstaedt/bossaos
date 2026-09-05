# Régua do E23 — Pagamentos, webhooks e reembolsos

> **Escrita a 05/09, antes de o E23 começar e antes de existir uma linha de
> código.** Escrevo-a agora precisamente porque falhei em escrever a do E22 a
> tempo. Uma régua escrita depois da entrega é uma opinião sobre código que já
> vi; escrita antes, é um compromisso.

O E22 guarda o dinheiro dentro de casa. **O E23 é a fronteira** — a única etapa
em que o produto fala com um sistema que não controla, que responde quando quer,
que repete o que já disse, e que às vezes não responde de todo.

## 1. Um webhook chega DUAS vezes, e isso não é avaria

Não é caso raro nem falha do fornecedor: é o funcionamento normal de qualquer
adquirente sério, que reenvia até ter a certeza de que ouvimos. **Um webhook
processado duas vezes não pode cobrar duas vezes, nem devolver duas vezes.**

Já temos a forma certa escrita, e não se inventa outra: `capacidade-e-reservas.md`
diz que **a identidade é a do acontecimento**, não do pedido nem do momento. Um
reenvio traz o mesmo acontecimento e deduplica; um facto novo traz identidade
nova e entra.

**Exijo o par:** o mesmo webhook duas vezes tem **um** efeito; **dois
acontecimentos diferentes** para o mesmo pagamento têm **dois**. Sem o segundo,
«engole tudo o que se parece» passa o primeiro.

## 2. A ORDEM não é garantida, e é o que se esquece

O webhook do estorno pode chegar **antes** do da captura. Uma máquina de estados
que só aceita a transição «esperada» perde o segundo evento em silêncio, e o
registo fica a dizer uma coisa que não aconteceu.

**Exijo a prova com os eventos fora de ordem**, e o par: **em ordem, o resultado
é o mesmo.** Se os dois derem resultados diferentes, a ordem está a decidir, e
não pode.

## 3. Um webhook não autenticado é um estranho a dizer que pagaram

**Assinatura verificada antes de qualquer efeito** — antes de ler o corpo para
decidir o que fazer com ele. E o controlo negativo: **uma assinatura errada não
produz efeito nenhum**, e o produto não diz porquê a quem a enviou.

Isto vale mais do que parece: é a única porta do sistema onde alguém de fora
consegue afirmar que **dinheiro entrou**.

## 4. O reembolso não é uma venda negativa

Não se lança como um pagamento com sinal trocado. Tem origem, motivo, autor e
**limite**: não se devolve mais do que se cobrou, nem depois de já se ter
devolvido tudo. **Exijo a tentativa de devolver a mais e a recusa**, medida — e
o par, uma devolução parcial legítima que passa.

E o que o E22 já obriga: **rasto que não se apaga**, por gatilho.

## 5. O adquirente está em baixo — e o restaurante não fecha

O serviço não pode parar porque o fornecedor parou. Exijo que uma falha do
adquirente **deixe o pedido intacto** e diga-o à pessoa; o E18 já prova isto do
lado da reserva, e o E19 do lado da mensagem. Aqui prova-se do lado do dinheiro.

## O que reprovo à cabeça

- **Alcance exaustivo**, e cada aceite a apontar a linha de produto. Sem
  amostragem — foi assim que assinei o E20 com cinco de oito.
- **As telas sem porta.** `docs/architecture/portas-e-navegacao.md`. O marco do
  Restaurant foi reprovado por isto; não passa duas vezes.
- **Segredos de adquirente em código, em registo, ou em endereço.**
  `dados-e-accoes-sensiveis.md`: um segredo num URL fica no histórico e no
  referrer.
- **Verde sobre zero pagamentos.** Declara-se a população.
- **Uma prova que só use o «caminho feliz» do fornecedor.** Se não houver
  simulação de resposta lenta, repetida e fora de ordem, não está provado — está
  demonstrado.

---

## Acrescentado a 05/09, com o E23 já em curso: o que JÁ EXISTE

**Isto não é um aceite novo** — não acrescento exigências a meio, que é a falta
que apontei a mim próprio no E19. É o contrário: aponto duas peças construídas e
provadas, para não serem reinventadas.

**1. Para o lado de SAÍDA (reenvio, reprocessamento): `OutboxTask`.**
`schema.prisma`, e a razão está escrita no próprio modelo:

> «A tarefa nasce **na mesma transacção** que o facto que a origina. Uma fila
> fora da base aceita a tarefa e perde-a quando a transacção reverte, e o
> resultado é uma publicação agendada para uma revisão que nunca existiu.»

Um reembolso que se regista e depois falha a enfileirar o aviso é exactamente
essa forma. A tabela já resolve isso; uma fila nova, não.

**2. Para o lado de ENTRADA (webhook repetido): a identidade por acontecimento.**
`capacidade-e-reservas.md`, e **já está implementada** — `acontecimento()`, no
caminho das mensagens do E19, com o controlo negativo «caiu a identidade: a
segunda chamada foi engolida pela primeira».

O adquirente reenvia até ter a certeza de que ouvimos. Isso é o mesmo problema
que resolveste na mensageria, visto do outro lado: lá decidias quando **enviar**
outra vez; aqui decides quando **ignorar** o que chegou outra vez. **A chave é a
mesma** — a identidade do acontecimento, não a do pagamento nem a do momento.

**O que continua a ser aceite meu, e não muda:** a ordem não é garantida, e a
assinatura verifica-se antes de qualquer efeito.
