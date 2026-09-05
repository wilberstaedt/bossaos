# Régua do E29 — Financeiro e conciliação

> Escrita a 05/09, **antes de existir código**. FIN-001 a 011, onze telas.
> Contrato: [`conciliacao-e-fecho.md`](../architecture/conciliacao-e-fecho.md),
> escrito imediatamente antes desta régua e também antes do código.

## O que muda nesta etapa

As anteriores erravam **para dentro**: um saldo de stock errado descobre-se no
inventário, um ponto errado descobre-se no recibo. **Aqui o erro sai para fora e
bate num banco.** A conciliação é o sítio onde o produto afirma que o que ele
diz e o que o banco diz são a mesma coisa — e se essa afirmação for falsa, tudo
o resto continua verde.

E há uma diferença cruel em relação a todas as etapas anteriores: **um sistema
financeiro errado dá números certos.** Não parte, não estoira, não mostra erro.
Soma bem uma realidade que não existe.

## 1. Importar duas vezes não pode duplicar — e a base é que o impede

Impressão digital derivada, **restrição única na base**. Controlo negativo:
desligá-la e ver duplicar. Se a defesa estiver num `if`, não a aceito — o E27
mostrou-me a forma certa e não vou aceitar menos duas etapas depois.

**E o par, que é o que separa uma defesa de um estrago:** duas linhas legítimas
iguais no mesmo dia **entram as duas**. Um detector de duplicados sem este caso
está a apagar factos reais, e uma prova que só repete o ficheiro nunca o
descobre.

## 2. O silêncio da importação é um defeito

Uma importação que ignora 200 linhas sem o dizer **é indistinguível de uma que
não leu o ficheiro**. As duas mostram zero lançamentos novos. Exijo a contagem
dita por palavras no ecrã, não só no log.

## 3. Conciliado é derivado, e é a terceira vez que o digo

Existe correspondência confirmada, logo está conciliado. **Coluna `conciliado`
que alguém escreve = reprovação directa.** Stock (E25), pontos (E27), agora isto.
Está escrito como lei no contrato: um número que se pode derivar nunca se
escreve.

## 4. Nenhuma correspondência se auto-confirma

Nem a 100%. Confirmação é acontecimento com **autor e momento**. Controlo:
auto-confirmar e ver a prova acender.

## 5. As três datas não colapsam

Ocorrência, valor, registo. Caixa pela data-valor, resultado pela ocorrência.
**O controlo que me interessa mais de todos:** colapsar as três numa só e ver os
dois relatórios passarem a **concordar**. Quando concordam, está errado — e é o
único controlo desta régua cujo sinal de avaria é dois números baterem certo.

## 6. Do total chega-se à transacção

Sempre, e nas duas leituras. Um total que não desce até à origem é uma opinião.

## 7. Fechar proíbe, não congela

Fechar impede movimentos novos com data dentro — **recusado na base**, não no
ecrã. Não copia totais para uma tabela: isso cria uma segunda verdade que
envelhece. Ajuste pós-fecho nasce no período aberto a apontar para o fechado.
Reabrir tem autor e motivo.

## 8. Moedas não se somam

Ou agrupa, ou converte com fonte e data à vista. O piloto é em Espanha com
fornecedores fora da zona euro; isto não é hipótese académica.

## A semente

Tem de conter o caso mau: uma linha duplicada **legítima** e uma devolução a
atravessar o mês. Sem isso a prova mede o caminho feliz e eu não a aceito — foi
o último controlo do E27 e vale aqui outra vez.

## O que não exijo

Contabilidade legal. O prompt di-lo e concordo: taxas, impostos e percentagens
são **configuração**, não regra inventada pelo produto. Se o código souber a
percentagem de um imposto espanhol de cor, isso é defeito, não funcionalidade.
