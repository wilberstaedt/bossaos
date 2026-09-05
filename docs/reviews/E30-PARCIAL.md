# E30 — medido a meio, e NÃO assinado

> 06/09, 01h40. Declarado em `1dc90bc`. **Não está reprovado: está por medir.**

## O que está medido, e passa

```
varrer-alcance-da-etapa.sh d90310b..1dc90bc
  ficheiros no intervalo: 4   funcoes exportadas: 15
  ok    todas as funcoes da etapa tem chamador em produto
```

**Sétima etapa seguida com alcance a zero.**

| Prova | Verdes | Controlos negativos |
| --- | --- | --- |
| `provar-analitica` | 14 casos | **8** |

Reposta no fim, zero falhas. Os controlos batem na régua:

- *«caiu a ausência: quem não mediu passou a dizer que vendeu zero»* — o aceite
  que decide a etapa, e o **par ao contrário** também lá está: *«a casa que abriu
  e não vendeu passou por não medida»*. As duas direcções, que é o que separa
  uma prova de uma afirmação.
- *«caiu a ponderação: o denominador deixou de viajar com o numerador»*
- *«caiu a fronteira: o total escorregou de dia e continuou a parecer certo»*
- *«caiu o caso mau: sem dois fusos, a prova mede o caminho feliz»* — controlo
  sobre a **semente**, que é onde o E30 mais facilmente enganaria.

E um que eu não pedi: *«caiu a exclusão: a unidade sem dados puxou o total para
baixo»*. Uma unidade sem dados não é uma unidade com zero — e se entrar no
denominador, contamina a média das outras.

**E o menu de gestão ficou sem uma única porta morta.** `href: '#'` a zero: a
última entrada, o `início`, era `porConstruir: 'E30'` e fechou-se aqui. Restam só
as três da plataforma, que são do E33 e já têm dono.

## O que NÃO está medido, e por isso não assino

**A prova de navegador das nove telas.** Não a corri, e a razão não é técnica do
produto: o `mac-health` está em **ATENÇÃO** com 4 GB disponíveis, 99 MB livres e
orçamento seguro de ~3 agentes — e já corremos quatro. Esta máquina tem um bug de
kernel na pilha de rede que a derrubou quatro vezes sob carga; um Chromium em
cima disto arrisca levar o trabalho em curso do JR.

**Isto é a terceira resposta aplicada a mim próprio.** Não é «passou» nem
«falhou»: é **não medi**, e a diferença entre as três é o assunto do dia inteiro.
Assinar com o motor verde e o navegador por correr seria exactamente o verde
vazio que reprovei aos outros — sobretudo numa etapa cujo aceite central é sobre
telas, e cuja dívida de móvel só se paga a olhar para elas.

**Fica para a primeira janela em que a máquina aguente.** Ou, se voltar a
apertar, corre-se contra o staging no VPS, que tem 6,6 GB livres e carga a zero.
