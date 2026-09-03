# Catálogo, preço e publicação

> E00, escrito antes do E07/E08. Fecha CT-07 nas regras que mais facilmente se implementam
> ao contrário. Nenhuma destas é preferência: cada uma corresponde a um erro concreto que
> aparece num restaurante a operar.

## Editado e publicado são estados diferentes

O cadastro é único; **o que está a ser editado e o que o cliente vê não são a mesma
coisa**. O rascunho guarda texto, preço, mídia, opções e programação. Publicar cria uma
**revisão imutável** e troca a referência do destino de forma atómica.

Consequência que se esquece: uma falha a meio da publicação tem de deixar a revisão
**anterior inteira**. Publicação pela metade é pior do que publicação falhada — a carta
fica com metade dos preços novos e metade dos antigos, e ninguém sabe qual é qual.

## Precedência de preço, e o que fazer com empates

```
1. regra activa explícita  unidade + canal + período
2. override                unidade + canal
3. override                unidade
4. base da marca
```

**Duas regras de igual prioridade a colidir são erro, não sorteio.** Rejeitar ou resolver
por regra explícita — nunca pela ordem em que a base devolveu as linhas, que é estável até
ao dia em que deixa de ser e ninguém liga a mudança de preço a um `ORDER BY` ausente.

Moeda incompatível é erro. Nunca conversão implícita.

## O pedido guarda um retrato, não uma referência

Pedido aceite guarda **snapshot**: nome, variante, opções, preço, moeda, componentes do
total e versão. Actualizar o catálogo não reescreve histórico. Um produto removido do menu
não apaga a linha do pedido de ontem.

Sem isto, mudar um preço às 22h altera o valor de comandas abertas — e o cliente vê um
total diferente do que combinou.

## Disponibilidade tem duas camadas

| Camada | O que é | Quem muda |
| --- | --- | --- |
| Conteúdo publicado | O item existe na carta e está agendado | Publicação, com revisão |
| Bloqueio operacional | Esgotou agora, ou o estoque acabou | Sala/cozinha, imediato |

**O bloqueio retira a venda na hora, sem republicar a carta inteira.** Um restaurante que
tenha de refazer a publicação para dizer "acabou o polvo" vai deixar de o dizer.

E o servidor **revalida tudo no envio do pedido**: a carta que o cliente tem aberta pode
ter cinco minutos.

## Traduções: idioma de interface ≠ idioma de conteúdo

O painel em português e a carta em espanhol são duas escolhas independentes. Ordem de
recuo proposta: idioma pedido e revisado → idioma principal da unidade/marca → indicação
clara da origem.

**Texto de origem alterado torna a tradução pendente de revisão.** Sem isso, mudar o preço
ou a descrição em espanhol deixa a versão inglesa a afirmar o antigo, e ninguém repara
porque a página inglesa continua a existir e a parecer completa.

Tradução automática, se existir, cria **sugestão** e regista a versão do texto original.

## Alérgenos: ausência não é ausência

Estados controlados: **contém**, **pode conter**, **desconhecido**. Campo vazio é
`desconhecido` e mostra-se como desconhecido.

> Nunca inferir ausência a partir de campo vazio, de imagem, ou de uma tradução que não
> mencionou o alérgeno.

Isto é a regra deste documento onde o erro tem consequência física. Um produto sem
informação de frutos secos não é um produto sem frutos secos. A revisão exige responsável
e data, e o ecrã diz quando foi a última.

## Importação

Mapear colunas, validar codificação e separador decimal, mostrar erros **por linha**,
simular, e só depois confirmar. Atómico para o lote aprovado; se houver importação parcial
escolhida, dizer exactamente o que entrou.

**Nome igual não é chave de identidade.** Dois "Café" não são o mesmo produto, e um SKU
vazio não autoriza fundir linhas. A estratégia de actualização é explícita ou não há
importação.

## Catálogo por marca, cópia entre marcas é acto explícito

Copiar um menu **dentro** da marca reutiliza o mesmo `Product`. Clonar para outra marca
cria IDs novos, com pré-visualização e autoria. Produtos partilhados entre marcas não
nascem de coincidência de nome nem de SKU.
