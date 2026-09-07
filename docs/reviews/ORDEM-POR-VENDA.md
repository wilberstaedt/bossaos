# A ordem muda: retorno comercial, não retorno técnico

> O Matheus, 07/09 às 15h11: *«usa tudo que tiver de melhoria pra ir pra cima, e
> termina a auditoria quanto antes pra deixar o mais próximo de venda»*.
>
> Isso não é um pedido de velocidade. É um **eixo diferente**, e eu estava a
> trabalhar no errado.

## O que eu estava a fazer, e porque estava certo até agora

O diagnóstico de sistema ordenou os componentes em falta **por número de ecrãs
servidos** — `CabecalhoDePagina` 324, `Botao` com `href` 172, `Forma` 156,
`EstadoVazio` 133. É a ordenação certa para **reduzir dívida**: o que serve mais
ecrãs paga-se primeiro.

**Só que reduzir dívida e aproximar da venda não são a mesma lista.** Um ecrã que
aparece 324 vezes dentro do produto vale muito para quem já comprou e **zero**
para quem está a decidir comprar.

## A ordem nova, e a razão de cada degrau

**1 · A montra: landing e carta pública.** É o que um comprador vê antes de
falar com ninguém. E a auditoria tem um achado que cai exactamente aqui: **os
dois CTA do herói da landing são escritos à mão** porque o `Botao` fixa
`<button type="button">` e não aceita ligação — e são, nas palavras do
diagnóstico, «o par mais visto do produto». Entram também os três da carta: a
chave `c.buscar` a servir de *placeholder* **e** de rótulo do botão ao lado, o
*placeholder* cortado, e os códigos `es-ES`/`pt-BR`/`en` mostrados a quem está
sentado à mesa.

**2 · O caminho da demonstração.** É o que ele põe à frente de um cliente. Aqui
o que conta é não haver nada partido no percurso, mais do que haver polimento.

**3 · Staff e KDS.** Mostram-se numa demonstração — a cozinha é o momento que
impressiona —, mas **ninguém decide comprar por causa deles**. Ficam a meio.

**4 · O interior do backoffice.** Só quem já comprou lá entra. O
`CabecalhoDePagina` que serve 324 ecrãs vive sobretudo aqui: **continua a ser o
maior item da dívida e passa a ser o último da ordem**, e essas duas coisas não
se contradizem.

## O que isto NÃO muda

- **Nada se faz sem medição.** A ordem mudou; a régua não.
- **A camada de composição continua a ser o trabalho real.** Reordenar não a
  encurta — só decide por onde começa.
- **E disse-lhe o que «quanto antes» pode e não pode dar:** a auditoria está
  fechada e sete achados já foram corrigidos e verificados. O que resta **não é
  auditar, é construir** — e isso não acelera por eu querer. Acelera por ordem,
  que é o que este documento faz.
