# Matriz de homologação de impressoras — E31

> **Nenhuma linha desta matriz foi medida com aparelho real.** Não é um
> resultado mau: é a ausência de um resultado, e está escrita como tal.

## A regra desta página

> **Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma
> tinta.**

Há três respostas — passou, falhou, e **não medi** —, e por isso não existe
aqui nenhuma coluna de sim/não. A coluna «resultado físico» diz por palavras o
que aconteceu, e onde nada aconteceu diz **POR TESTAR**.

O mesmo está na base: a `printers` não tem coluna `homologada` booleana. Tem
`homologada_em` e `homologada_por`, e a ausência das duas **é** a terceira
resposta. Um `CHECK` obriga-as a andar juntas — uma data sem responsável não se
audita daqui a seis meses.

## O que existe, e o que não existe

**Existe:** o contrato de dispositivo (três mensagens, em
`/api/org/[orgSlug]/impressoras/[printerId]/enviar`) e um simulador que o
implementa (`scripts/ponte-de-impressao-simulada.mjs`), com um modo **mudo**
que produz o estado «não sei» — o único dos três que não se consegue observar
com uma impressora que funciona.

**Não existe:** uma única impressora física neste projecto. **Simular não é
homologar**, e nada do que o simulador produz entra nas colunas abaixo.

E não se presume nada a partir de fotografias de equipamento: **uma fotografia
não é uma especificação.** Não está escrito em lado nenhum que o modelo do
piloto aceita chamada directa do navegador, e por isso o produto não a faz — o
que fala com o aparelho é a ponte, e a ponte é de quem tiver o aparelho.

## A matriz

| Modelo | Navegador / SO | Ligação | Leitura / legibilidade | Corte | Resultado físico verificado |
| --- | --- | --- | --- | --- | --- |
| *(por definir com o piloto)* | — | REDE | **POR TESTAR** | **POR TESTAR** | **POR TESTAR** — não há aparelho |
| *(por definir com o piloto)* | — | USB | **POR TESTAR** | **POR TESTAR** | **POR TESTAR** — não há aparelho |
| *(por definir com o piloto)* | — | PONTE | **POR TESTAR** | **POR TESTAR** | **POR TESTAR** — não há aparelho |

## O que foi medido, e onde

Sem aparelho, o que se pode medir é o **comportamento do produto** perante as
três respostas possíveis do contrato. Isso está medido, e não se confunde com
homologação:

| O que | Onde | Estado |
| --- | --- | --- |
| a fila não duplica o mesmo documento | `provas/kiosk.test.ts` grupo 3 | medido |
| a segunda via vai marcada no papel | grupo 4 | medido |
| «entregue à ponte» não vira «imprimiu» | grupo 5 | medido |
| a base recusa confirmar sem resposta do aparelho | grupo 5, controlo | medido |
| a homologação não pode ser anónima | grupo 7 | medido |
| **o papel sai, é legível e o corte funciona** | — | **POR MEDIR** |

## O que fecha isto

Uma impressora do modelo do piloto, ligada como no piloto, e alguém a olhar
para o papel. Nada disso se faz daqui, e escrever que se fez era a única coisa
pior do que não ter feito.
