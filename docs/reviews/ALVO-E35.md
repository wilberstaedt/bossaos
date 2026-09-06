# Régua do E35 — Pacote de implantação e piloto assistido

> Escrita a 06/09, **antes de existir código**. Contrato:
> [`implantacao-e-piloto.md`](../architecture/implantacao-e-piloto.md), escrito
> imediatamente antes desta régua — e **cinco horas depois de eu publicar o
> staging deste produto com nove paragens**.

## O que muda nesta etapa

É a última do Codex, e é a única cujo contrato eu não escrevi por dedução:
escrevi-o **depois de o viver**. Das nove paragens da publicação de 05/09, oito
foram defeito meu de instrumento e uma foi uma defesa do produto a funcionar.
Cada portão da régua abaixo custou uma delas.

## 1. Um backup que nunca foi restaurado é uma esperança

O que se escreve no runbook não é «temos cópias» — é **a data do último ensaio e
o tempo medido**. E **não se promete RPO nem RTO sem medir**: propõe-se o
objectivo, faz-se o ensaio, anexa-se o resultado real. Que costuma ser pior, e é
por isso que se mede.

Controlo: um runbook que declare RPO sem ensaio anexo tem de acender.

## 2. Preparar não é publicar

A autorização é explícita, de quem manda, e fica **registada com as palavras
dele**. Já vi um runbook deste vault mentir três horas sobre isto.

## 3. Os quatro portões, e cada um recusa

Não se publica o que não foi assinado. Publica-se um **commit**, não a árvore.
Os segredos vivem no servidor. E **a versão que responde é a que foi
construída** — um `up` sem erro não é uma publicação.

**Exijo o controlo a violar cada um, à vez.** Quatro portões com um controlo só
não são quatro portões.

## 4. A sonda do portão da versão não atravessa o produto

A minha pedia um ficheiro estático e o encaminhamento por idioma respondeu com
outro endereço — mediu a casa em vez do build. Lê-se do lado de fora do produto.

## 5. Nada de passos à mão no guião

**Um passo que fica de fora do script fica de fora da próxima vez**, e pior:
esconde a dependência que o script tem. Duas das minhas nove paragens saíram
disso, e uma terceira do estado que o passo manual deixou para trás.

## 6. Depois de mexer no que é partilhado, verifica-se o que não se queria mudar

E antes de mexer, **pede-se um número a mais**. A idade do processo que eu ia
matar dizia três dias: era produção do cliente, não lixo meu.

## 7. A `pilot.md` distingue três estados

Feito, pendente, **não medido**. Nunca duas colunas — uma linha vazia lê-se como
uma linha aprovada, e as duas custam a mesma tinta.

## 8. A entrada progressiva tem plano de saída

Define-se **como se volta atrás** antes de avançar. Um plano de entrada sem plano
de saída é uma aposta.

## O que aceito como pendência

Hardware, credenciais e provedores que não existam. **Fecha-se o pacote local e
diz-se por palavras o que ficou por activar** — como fizeste no E27 com os envios
e no E24 com o gateway.
