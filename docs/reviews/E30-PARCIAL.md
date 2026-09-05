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

---

## Tentei e tive de parar — e a primeira decisão é que estava certa

01h50. Revi o *holding* de cima com este argumento: o banner dizia ATENÇÃO e não
PERIGO, os *kernel panics* de Julho foram com 27 agentes e 67 MB, e nós estamos
com quatro agentes e 442 processos. **Um Chromium não é um lote.** E o JR estava
parado à espera do veredicto, o que tem custo real.

Lancei. **Em menos de dois minutos a máquina caiu de ATENÇÃO para PERIGO** — 63
MB livres, 7,3 GB comprimidos, swap a subir. Parei a prova, e libertaram-se 1,5
GB de imediato: era mesmo o navegador.

**A primeira decisão estava certa e a revisão estava errada**, e o que a desfez
não foi um argumento melhor — foi um número, sessenta segundos depois. O meu
raciocínio sobre os 27 agentes de Julho era correcto em tudo menos no que
interessava: esta máquina já está a comprimir 5 GB, e o que a mata não é a
contagem de processos, é a falta de memória física para mais um.

**Fica registado como aviso a mim próprio:** um argumento plausível sobre
histórico não substitui a leitura de agora. Foi exactamente o erro que apanhei ao
`docker-proxy` de três dias, na direcção contrária.

## O estado, sem ambiguidade

- Motor: **verde**, 14 casos, 8 controlos, reposto.
- Alcance: **zero**, sétima etapa seguida.
- Portas do menu de gestão: **zero mortas**.
- Navegador das nove telas: **NÃO MEDIDO**.
- Assinatura: **não dada**.
