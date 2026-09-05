# Conciliação e fecho

> Escrito a 05/09, **antes de existir código do E29**. Cobre as fronteiras por
> onde o dinheiro entra na visão financeira. O que o dinheiro **é** está em
> [dinheiro.md](dinheiro.md); isto é sobre o que lhe acontece quando vem de fora
> e quando o mês acaba.

Escrevo por **fronteira**, não por tema. É a formulação do JR e é melhor que a
minha: um contrato só impede um defeito se disser a consequência operacional **e
a regra de decisão no sítio onde o defeito entra**. Um documento organizado por
tema é lido por quem já sabe o que procura.

---

## Fronteira 1 — uma linha de extracto entra

**O defeito:** importar o mesmo extracto duas vezes e ficar com o dobro dos
lançamentos. É silencioso, corrompe dinheiro, e só aparece quando alguém repara
que o saldo não bate — muitas vezes num mês em que já ninguém se lembra do que
importou.

**A identidade de uma linha não vem do banco.** O ficheiro não traz um
identificador de confiança: bancos repetem referências, mudam formatos e
reemitem extractos. Portanto a identidade é **derivada e estável**: conta,
data-valor, montante, referência do banco e a **ordem dentro do dia** — porque
duas linhas iguais no mesmo dia são um caso real, não um erro.

**Regra de decisão na importação.** Cada linha é exactamente uma de três:

| Estado | O que se faz | O que se diz |
| --- | --- | --- |
| **NOVA** | cria lançamento | conta-se |
| **JÁ VISTA** (mesma impressão digital) | não cria nada | **diz-se quantas** |
| **SEMELHANTE** | não cria nada; fica para decisão | lista-se |

O «diz-se quantas» não é cortesia. **Uma importação que ignora 200 linhas em
silêncio é indistinguível de uma importação que não leu o ficheiro** — e as duas
mostram o mesmo zero.

**A garantia é por impossibilidade, não por regra.** A impressão digital tem
restrição **única na base**. Não é uma coisa que o código tem de lembrar-se de
verificar; é uma coisa que a base não deixa acontecer.

**Uma correspondência é uma sugestão até alguém a confirmar.** Nunca automática,
nem com semelhança perfeita. A confirmação é um **acontecimento com autor e
momento**, como a correcção de ponto do E28. Quem concilia responde pelo que
conciliou, e daqui a um ano alguém vai perguntar quem foi.

---

## Fronteira 2 — aparece uma divergência

**Divergência é um ESTADO, não um erro.** Fica pendente. Não se resolve mexendo
no número para ele bater — é exactamente isso que faz um sistema financeiro
mentir com todos os totais certos.

**Conciliado é derivado.** Existe correspondência confirmada, logo está
conciliado. Não há coluna `conciliado` que alguém escreva.

> **Terceira aparição da mesma lei neste produto** — saldo de stock (E25), saldo
> de pontos (E27), e agora conciliação. Fica dita como lei e não como caso:
> **um número que se pode derivar nunca se escreve.** Uma coluna escrita
> diverge da realidade sem que ninguém a veja divergir; um número derivado só
> pode estar errado se a regra estiver errada, e uma regra errada aparece em
> todos os casos ao mesmo tempo, o que a torna encontrável.

---

## Fronteira 3 — um movimento é atribuído a um período

**Três datas, e não são intermutáveis:**

- **ocorrência** — quando a coisa aconteceu (a venda, o serviço)
- **valor** — quando o dinheiro se mexeu (a liquidação no banco)
- **registo** — quando ficou escrito no sistema

**A regra:** fluxo de caixa usa a **data-valor**; resultado e margem usam a
**data de ocorrência**. Não é preferência de estilo — são perguntas diferentes.
«Quanto entrou em Setembro» e «quanto vendi em Setembro» têm respostas
diferentes e as duas estão certas.

**O caso que o aceite 3 do E29 exige:** uma devolução a 3 de Outubro de uma
venda de 28 de Setembro entra no caixa de Outubro e no resultado de Setembro. Uma
taxa cobrada noutra data segue a sua própria data no caixa e continua ligada à
transacção que a originou no conceito. **Da linha do total tem de se chegar à
transacção de origem** — sempre, e em qualquer das duas leituras.

---

## Fronteira 4 — um período fecha

**Fechar não é congelar números copiando-os.** Fechar é **proibir movimentos
novos com data dentro do período**. Se o fecho guardar totais numa tabela, esses
totais passam a ser uma segunda verdade que envelhece — a lei da fronteira 2
outra vez.

**Reabrir é um acontecimento com autor e motivo.** Nunca um interruptor.

**Depois do fecho, nada se edita para trás.** Um ajuste é um **movimento novo no
período aberto que aponta para o fechado**. É a mesma forma da correcção de ponto
do E28 e do estorno do E22: **o passado não se reescreve, acrescenta-se-lhe.**

---

## Fronteira 5 — moedas diferentes encontram-se num total

**Não se somam.** Ou se agrupa por moeda, ou se converte com **fonte e data
carimbadas na própria conversão**.

Um total convertido **mostra a fonte e a data da taxa, ou não se mostra**. Um
número em euros que veio de dólares sem dizer a que câmbio é uma opinião com
aspecto de facto. E o piloto é em Espanha com fornecedores fora da zona euro:
isto não é hipótese.

---

## O que vou exigir como prova

Controlos negativos, e cada um tem de derrubar a coisa certa:

1. **Importar o mesmo ficheiro duas vezes** — o segundo cria zero lançamentos e
   **diz** quantos ignorou. Controlo: desligar a restrição única e ver duplicar.
2. **Duas linhas legítimas iguais no mesmo dia** — entram as duas. Sem isto, o
   detector de duplicados está a apagar factos reais, e uma prova que só testa o
   ficheiro repetido nunca o descobre.
3. **Correspondência a 100%** — continua sugestão até alguém confirmar. Controlo:
   auto-confirmar e ver a prova acender.
4. **Divergência** — fica pendente e não se deixa fechar por ajuste do número.
5. **Devolução em mês seguinte** — aparece nos dois sítios certos, cada um com a
   sua data. Controlo: colapsar as três datas numa e ver os dois relatórios
   passarem a concordar — **quando concordam, está errado**.
6. **Fechar e tentar lançar dentro** — recusado na base, não no ecrã.
7. **Ajuste pós-fecho** — nasce no período aberto a apontar para o fechado.
8. **Total em duas moedas** — recusa somar, ou converte com fonte e data à vista.

E a **semente tem de conter o caso mau**: sem uma linha duplicada legítima e sem
uma devolução a atravessar o mês, a prova mede só o caminho feliz. Foi o último
controlo do E27 e vale aqui outra vez.
