# Régua do E11 — revisão do Starter e primeiro marco

> Escrita a 04/09, com o E09 a meio e o E10 por começar. **Escrita cedo de
> propósito:** o aceite 1 do E11 exige um instrumento que não existe, e descobrir
> isso no marco custaria refazer as 29 telas do E10.

## O que o E11 exige, e o que disso é infra-estrutura

O prompt do E11 pede quatro coisas verificáveis. Três são revisão. **Uma é
construção**, e é essa que tem de entrar já:

| Aceite | O que pede | Existe hoje? |
| --- | --- | --- |
| 1 | O **mesmo fluxo completo** em desktop **e** mobile | **NÃO** — ver medição |
| 1 | Um acesso cruzado entre inquilinos **negado** | Parcial: RLS provado no E03, sem prova de fluxo |
| 2 | Nenhuma falha bloqueante aberta | Verificável no marco |
| 3 | Dependências reais (DNS, conteúdo) **explícitas** e não dadas como feitas | Verificável no marco |

## A medição que motiva esta régua

Contei, não estimei:

- **112 IDs** têm etapa principal até E11. **Todos os 112** trazem no atlas
  `desktop: obrigatório` e `mobile: obrigatório/adaptado à superfície`.
  O móvel não é opcional em nenhum deles.
- **72 já estão `validado`** — assinados por mim.
- O único instrumento que mede largura é `inspeccao/larguras.spec.ts`, a 360, 390,
  768, 1280 e 1440 px. Visita **seis** caminhos, todos estruturas: a inicial, o
  catálogo e os quatro esqueletos de `/interno/estruturas/`.
- **Dos 72 validados, 0 têm a sua rota visitada por essa inspecção.**
- **Dos 72, 0 têm evidência que mencione móvel ou largura.** Só o `E02.md` fala de
  móvel em todo o `docs/progress/` — e os IDs do E02 são precisamente os seis
  esqueletos.

Dito sem atenuar: **o móvel está provado para os seis esqueletos do E02 e para
mais nada.** Os outros 66 — autenticação, arranque, plataforma, catálogo — foram
assinados com prova de desktop enquanto o atlas marcava o móvel como obrigatório.
É verde sobre população zero à escala do Starter inteiro, e a assinatura é minha.

## O que isto obriga, por ordem

1. **O E10 nasce com prova de fluxo nas duas superfícies.** Não é pedido do marco,
   é requisito da etapa: 29 telas construídas sem isso são 29 retrofits.
2. **A lista de páginas da inspecção deixa de ser escrita à mão.** Seis caminhos
   escolhidos por alguém não são a população; a população é `coverage.csv`. O
   instrumento tem de ir buscar as rotas aos IDs, senão volta a medir aquilo que
   por acaso lá está.
3. **Rota que redirecciona conta como não medida.** Uma página `/interno/...` sem
   sessão devolve o ecrã de entrada, e uma inspecção ingénua mede a **entrada** e
   diz verde. Toda a visita tem de afirmar que chegou à página pretendida.
4. **Os 66 validados sem prova de móvel entram em lista de reverificação**, não em
   lista de defeitos. Provavelmente muitos estão bem — mas *provavelmente* não é
   um estado, e `validado` diz que alguém mediu.

## Como reviso o marco quando lá chegar

- **Percorro J01, J02 e J11 inteiros**, nas duas larguras, e o que não for
  percorrível é declarado como tal e não contado.
- **O acesso cruzado prova-se pelo fluxo**, não só pela política: entrar como
  utilizador de um inquilino e pedir um recurso do outro, e ver a negação no ecrã.
  A prova de RLS do E03 mostra que a base recusa; falta mostrar que o produto
  recusa.
- **Confirmo que o negativo existe** em cada prova de fluxo: um percurso que devia
  falhar e falha. Um percurso que passa em todas as larguras e também passaria com
  a funcionalidade desligada não prova largura nenhuma.
- **Não aceito descrição do executor** — o prompt di-lo, e a noite de ontem
  mostrou porquê: das oito etapas fechadas, metade dos defeitos estava nos
  instrumentos e não no produto.

## O que o marco aprovado NÃO significa

Piloto Starter no âmbito verificado. Não é Restaurant, não é Pro, não é operação
fiscal. E não é «funciona no telemóvel» enquanto o ponto 4 acima estiver aberto.
