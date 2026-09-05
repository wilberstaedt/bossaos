# Ponto e escalas

> Contrato do E28, escrito a 05/09 **antes de existir código**.
> Régua: `docs/reviews/ALVO-E28.md`. Depende de `capacidade-e-reservas.md`
> (secção Tempo) e de `dados-e-accoes-sensiveis.md`.

## O que muda nesta etapa

As anteriores mexiam em stock, dinheiro e clientes. **Esta mexe no salário de
quem trabalha na casa** — e quem é prejudicado por um defeito aqui é a pessoa
com menos poder para o contestar.

Um erro de stock descobre-se no inventário. **Um erro de ponto descobre-se no
fim do mês, no recibo, por alguém que muitas vezes não vai reclamar.** Por isso
não basta estar certo: tem de ser **verificável por quem picou o ponto**.

---

## 1. A marcação é um facto, e a base não a deixa reescrever

Entrada e saída são acontecimentos com momento e autor. **Uma correcção é um
registo novo**, que aponta ao que corrige, com **autor e motivo**.

A garantia é a mesma que o E22 pôs na caixa: `registo_imutavel()` em
`BEFORE UPDATE OR DELETE`. Um encarregado que tente reescrever a hora de entrada
de alguém recebe `REGISTO_IMUTAVEL` da base — não um aviso da aplicação, que se
contorna com um script.

**O que fica visível:** a marcação original **continua lá**, e a correcção
aparece **como correcção**. Um registo que muda sem deixar marca não vale nada —
nem para a casa, nem em tribunal.

## 2. Quem corrige não é quem é corrigido — e isso vê-se

Uma marcação corrigida pela própria pessoa, sem segundo par de olhos, é um
convite. **Não se proíbe** — é decisão da casa, e há casas onde o único que lá
está às 2h é quem se esqueceu de picar.

O que se exige é que seja **distinguível**: a correcção guarda
`autor_membership_id`, e uma autocorrecção é `autor = pessoa`. A tela de revisão
mostra-as separadas, e o relatório também.

## 3. O previsto e o real são DOIS números

Estava escalado das 18h às 24h; picou às 18h07 e saiu às 00h42. **Os dois
guardam-se, e a diferença deriva-se** — não é o produto a decidir qual conta.

É a mesma decisão do E26 com o encomendado, o recebido e o facturado: quem
resolve a diferença é a casa, e um produto que a resolve em silêncio está a
decidir sobre o salário de alguém sem lho dizer.

**E o par:** quem picou exactamente no previsto **não gera divergência nenhuma**.

## 4. Minutos inteiros, nunca horas em vírgula flutuante

Uma jornada é `487` minutos, e não `8.116666666666667` horas. É a mesma regra do
dinheiro e das quantidades, pela mesma razão: `0,1 + 0,2` não é `0,3`, e aqui o
que se perde são **minutos de trabalho de uma pessoa**.

O sufixo é `Minutos`, e tem guarda própria — `validar-horas.sh` —, deliberadamente
separada da do dinheiro e da das quantidades, porque são três dimensões
diferentes e uma guarda que as junta é uma guarda que ninguém consegue afinar.

## 5. A REGRA DE FRONTEIRA: o dia de serviço não é o dia do calendário

Um turno que atravessa a meia-noite pertence ao **dia de serviço**, não à data
civil. Quem saiu às 00h42 de sábado trabalhou na **sexta**. Contar por data civil
corta o turno em dois e paga mal os dois lados.

**A regra, e é executável:**

> O dia de serviço de uma marcação é a **data civil, no fuso da unidade, do
> instante menos o corte do serviço**. O corte é uma definição da unidade, com
> `05:00` por omissão.
>
> A conversão acontece **na fronteira de escrita**, uma vez, e o dia fica
> gravado com a marcação. Nunca se recalcula na leitura a partir de um instante
> em UTC lido como hora de parede.

**Porque é que isto está escrito assim e não «os instantes são em UTC».** A
secção Tempo do `capacidade-e-reservas.md` dizia a propriedade certa e não
impediu o defeito do fuso, porque **não dizia o que fazer na fronteira onde o
defeito entra**. Está no veredicto do E00, em `docs/reviews/E00.md`, e esta
secção existe por causa dele: a fronteira aqui é a **marcação**, e a regra
acima diz o que lá acontece.

## 6. O esquecimento de picar é um estado, não um buraco

Quem entrou e nunca saiu não tem jornada de zero minutos: tem uma jornada
**aberta**, e isso é diferente. Um produto que trate a ausência de saída como
saída à meia-noite inventa uma hora que ninguém picou.

A jornada aberta aparece como aberta, e fecha-se com uma **correcção**, com autor
e motivo — pelo mesmo caminho de tudo o resto.

---

## O que fica de fora, e é dito

- **Não há cálculo de salário.** Guarda-se e mostra-se tempo; converter tempo em
  dinheiro é convenção laboral, e escrever uma que não foi verificada seria o
  erro do E24 outra vez, num sítio onde custa mais.
- **Não há aprovação em cadeia.** Uma correcção tem autor e motivo; quem a pode
  fazer é a autorização do E04, e não uma regra nova.
- **Não há geolocalização nem biometria.** São dados sensíveis com regime
  próprio, e não estão nesta etapa.
