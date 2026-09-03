# Alvo da revisão do E09

> Escrita com o E08 ainda retido e sem uma linha de E09. Deriva do prompt do E09, do CT-07,
> do CT-13 e dos contratos `catalogo-e-publicacao.md`, `dados-e-accoes-sensiveis.md` e
> `autenticacao-e-convites.md`, todos do E00.

## A primeira superfície que um estranho vê

Até aqui tudo era interno: quem entrava tinha sessão. O E09 põe uma página na internet
aberta, e isso muda o que uma falha significa — deixa de ser um bug e passa a ser **exposto
ao público**.

## O que não pode sair, e é a regra dura

> *"Rotas públicas leem apenas a projecção publicada e não revelam custos, SKUs internos,
> contactos privados ou catálogo oculto."*

Vou pedir a carta pública de um restaurante que tenha, no catálogo, um produto **oculto**,
um **custo** e um **SKU interno** — e exigir que nenhum dos três apareça, nem no HTML, nem
no JSON que a página busca, nem num campo que o ecrã não desenha mas o servidor manda.

**A armadilha desta área é o campo que vem e não se mostra.** Um `select *` que chega ao
navegador e é filtrado no React não é privacidade — é uma fuga com uma cortina à frente.
Vou olhar para o **corpo da resposta**, não para o que está desenhado.

## O par de sempre, agora entre publicado e rascunho

1. Um produto **publicado** aparece na carta pública.
2. Uma alteração em **rascunho** — ou um produto oculto — **não** aparece.

Se só testar (2), passa um sistema que não publica nada. Já vi isso hoje no E07.

## O QR, e a linha que o separa de ser uma chave

> *"O QR geral não concede sessão de mesa nem permissão de encomendar."*

O QR é um **endereço**, não uma credencial. Testo: ler o QR geral e tentar abrir sessão de
mesa ou enviar um pedido — e exigir recusa. E `Starter não apresenta carrinho`, portanto
nem o botão deve existir **nem a rota deve responder**: o ecrã esconde para não frustrar, o
servidor recusa para proteger.

> *"Não use QR ilustrativo como código funcional."* — o SVG exportado tem de **ler**. Se não
> houver leitura em dois aparelhos reais, o aceite 1 diz que se **regista o teste físico
> como pendente** — e uma pendência declarada é resposta; um QR não lido que se diz lido não é.

## Cache — onde dois restaurantes se misturam

> *"Cache inclui unidade, publicação, idioma e canal. Não misture conteúdo de tenants com
> nomes iguais."*

É o isolamento do E03 outra vez, agora numa camada que ninguém olha. Vou pedir a carta de
**A**, depois a de **B** com o mesmo `slug`, e exigir conteúdos diferentes. E a mesma carta
em dois idiomas, para a chave não ignorar o idioma.

Se a chave de cache esquecer a publicação, uma carta antiga sobrevive a uma publicação nova
— que é o aceite 1 do E08 a falhar por outra porta.

## Analytics

Minimização de dados, **sem cookies de publicidade por omissão**. Vou procurar o que é
guardado por consulta: unidade, idioma e origem chegam; um identificador que siga a pessoa,
não.

## Fora de horas

A carta **continua consultável** quando o restaurante está fechado, com os horários à vista.
E o horário mostrado usa o **fuso da unidade** — o mesmo caso do E06, onde 19 asserções
estavam verdes sobre um motor que ignorava o fuso.

## Os 11 IDs

CHAN-001; MENU-001 a 005, 019; QR-001, 003, 004; REP-001. Contados com leitor de CSV.

## Passo 8

Aplicar-me a régua. E os dois alvos herdados continuam de pé: **dividir o `base`** (desenho
e medições em `CI-CUSTO.md`) e a **fusão do `validar-testes`**, esta só depois de medir.
