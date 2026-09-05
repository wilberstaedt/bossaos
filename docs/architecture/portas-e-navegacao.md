# Portas: como se chega a um módulo

> Contrato escrito a 05/09, **depois** do E21 ter reprovado o marco do
> Restaurant por não haver caminho da entrada para módulo nenhum. Marco a data
> porque não é previdência: é a pedra depois de tropeçar nela.

## O defeito que este documento existe para não deixar repetir

Vinte etapas entregues, 254 telas provadas em navegador, e **quem entra na
aplicação fica na página da equipa e do menu não sai de lá**. Sete das oito
entradas eram `href: '#'` — incluindo reservas, catálogo, sala e caixa, todas
construídas e assinadas por mim.

Nenhuma prova o viu porque **todas as provas de navegador visitam o endereço
directamente**: `goto(URL)`, confirma o marcador `data-tela`, mede contraste e
largura. Medido: zero `getByRole('link')` em toda a inspecção.

**Uma tela provada a que ninguém chega é uma tela que não existe.**

## A regra

**Um módulo entregue tem porta. Uma porta é uma ligação que uma pessoa
consegue seguir a partir da sessão iniciada, sem escrever endereços.**

E porque quase todos os módulos vivem dentro de uma unidade, a porta implica a
escolha de unidade: **não há navegação para `/app/<org>/<unidade>/x` sem um sítio
onde a unidade se escolha.** Uma pessoa com três restaurantes tem de dizer em
qual está antes de a sala fazer sentido.

## O que é um `#` legítimo, e o que não é

- **Legítimo:** um módulo de uma etapa que ainda não existe. Nesse caso é
  **visivelmente inerte** — não parece clicável — e traz ao lado a etapa que o
  vai substituir. Um item que parece uma ligação e não faz nada ensina a pessoa
  a desconfiar do menu inteiro, e a partir daí ela deixa de tentar os que
  funcionam.
- **Não legítimo:** um `#` num módulo entregue. Aí não é marcador: é uma porta
  que ninguém abriu.

## Como isto se prova, e é a parte que faltava

**Uma prova que começa na sessão iniciada e navega por cliques** até uma tela de
cada módulo entregue. **Sem um único `goto` de endereço profundo.** O que ela
mede não é a tela — isso já está medido — é o **caminho**.

O controlo negativo é natural e barato: **voltar a pôr `#` num módulo vivo, e a
prova tem de ficar vermelha.** Se ficar verde, ela está a medir a existência da
tela outra vez, e não o caminho.

## Porque é que isto não é detalhe de interface

O mesmo defeito apareceu esta noite em três escalas, e é sempre o mesmo:

| escala | nome | como se vê |
| --- | --- | --- |
| código | função sem chamador | `enfileirar`, provado, com 0 chamadas |
| ecrã | tela sem porta | 254 telas, 7 entradas a `#` |
| operação | jornada sem percurso | as peças da J03 provadas, o percurso não |

**Verde não é alcance.** Uma prova responde à pergunta que lhe fizeram; nunca
diz que ninguém lhe perguntou pelo caminho. É preciso perguntar de propósito, e
é para isso que este contrato existe.
