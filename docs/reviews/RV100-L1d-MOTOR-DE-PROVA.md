# Revisão do lote L1d — o motor de prova

Entrega em `5dc2a4b`. **O bloqueio que travava o herói e a página de produto caiu.**

---

## Verifiquei olhando, que era a única forma honesta

O meu critério declarado era: *«que as capturas não contenham `insp-`,
`example.com` nem "Aún no medido"»*. Num PNG isso não se grepa — **vê-se**. Abri
a captura do KDS, que é a superfície que o §6.4 nomeia e a de menos folga.

**O critério cumpre-se.** Não há andaime nenhum. O que lá está é uma cozinha:
*Croquetas caseras de jamón ibérico con bechamel especiada*, *Pulpo a la gallega
sobre parmentier de patata y pimentón de la Vera*, *Tortilla de patatas con
cebolla caramelizada* — três tarefas do **mesmo pedido A128**, que é a «acção e o
seu resultado» que o §6.4 pede, e que aparece do outro lado na captura da sala.

E há uma linha na própria captura que vale mais do que a composição:

> *«El tiempo se cuenta desde el sello del servidor, nunca desde el reloj de esta
> tablet.»*

## Os controlos dele apanharam-no duas vezes, e a segunda é uma observação fina

**«Horario sin configurar»** na carta, porque a semente não criava horário.

E **«Aún no medido», duas vezes**, no painel do catálogo. Esse é o produto a ser
honesto sobre indicadores que ainda não construiu — **e eu elogiei essa mesma
honestidade há seis horas**, quando encontrei o `semDadosExplica` que distingue
«ninguém mediu» de «zero».

**A observação dele é que a mesma propriedade troca de valor com o contexto:**
honesto no produto, péssimo numa peça comercial, porque anuncia o que não existe.
Mudou a composição de rota. **Sem o controlo, as duas iam para a landing.**

## Três defeitos dele que a medição apanhou, e um deles é de família

1. A contagem da base dava vermelho **com a limpeza certa** — o arnês corria
   noutro processo e entrava nas mesmas contagens. **Media actividade
   concorrente e chamava-lhe defeito próprio.**
2. O guião acusava «a limpeza deixou linhas» **com a limpeza perfeita**, porque
   o estado de uma *pipeline* é o do `grep`, e um `grep` sem linhas devolve 1.
   **Um guarda que reprova quando tudo corre bem ensina a ignorá-lo.** É primo
   directo do `cmd | tail` que me comeu o código de saída duas vezes esta noite.
3. **403 ao inscrever**, por `BETTER_AUTH_URL` da outra porta — e ele nota que
   está escrito no `playwright.config.ts` há dias e o apanhou na mesma.

## A honestidade que eu mais valorizo aqui

> *«A impressão exclui carimbos de tempo. Logo: os dados são determinísticos; os
> pixels não exactamente, porque "Hace 0 min" é um carimbo.»*

**Podia ter dito «determinístico» e ninguém verificava.** A distinção entre dados
determinísticos e pixels determinísticos é exactamente a que vai morder no dia
em que alguém comparar duas capturas byte a byte.

E o horário: a primeira versão semeou uma semana plausível e a captura saiu
«Cerrado ahora» **porque correu às cinco da manhã**. Ele viu que o defeito não
era o horário, **era a dependência da hora** — e escreveu o custo da troca que
fez (aberto sempre; nenhum restaurante abre 24h).

## O que eu encontrei na captura, e é meu

Nos três bilhetes, **a etiqueta de estado encosta ao nome do prato sem espaço**:
`…bechamel especiada` `En preparación` · `…pimentón de la Vera` `Por empezar`.

Fui procurar uma regra de corte antes de lhe chamar truncagem e **não há**: nem
`text-overflow: ellipsis`, nem `line-clamp`, nem `nowrap` no KDS. Portanto lê-se
como **falta de espaçamento entre título e etiqueta**, e não como texto cortado.

**Onde isto importa:** é a superfície que corre a 18 px por ser lida ao longe, na
língua do piloto, e o nome do prato e o estado da tarefa são as duas coisas que o
cozinheiro lê ao mesmo tempo. Correm juntas.

**Não decido a correcção** — confirma-se no DOM, e quem tem o arnês para isso é
quem fez a captura. Fica como achado do revisor sobre a peça entregue.

## O que ele não fez, e disse

Nenhuma captura ligada à landing — **o motor produz, ligar é o lote seguinte**, e
não quis fechar duas coisas medindo uma. Sem formatos optimizados, porque
«optimizar sem medir o que se perde é adivinhar». E **sem largura de tablet**:
há 390, 1280 e 1440, e ele diz isso em vez de chamar 1280 de tablet.

**L1d fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
