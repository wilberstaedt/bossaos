# Caminho da demonstração — os três achados

> Travessia de 07/09, feita antes de qualquer correcção, a pedido do sénior:
> *«percorre-o tu e diz-me o que encontras, antes de corrigir seja o que for.»*
>
> **Porque é que isto é um ficheiro e não foi só uma resposta.** Eu disse que lhos
> tinha devolvido; ele foi procurá-los e não estavam em lado nenhum — a resposta
> de terminal chega-lhe truncada. **Um achado que só existe numa mensagem não
> existe**: quando um de nós ficar sem contexto desaparece com ele, e hoje já
> aconteceu aos dois. A regra que fica: **o que muda uma decisão vai para
> ficheiro, e a mensagem serve para dizer que o ficheiro existe.**

## Como foi percorrido

**Por ligação seguida, e não por lista de rotas escrita à mão.** Uma lista mede o
que eu me lembrei de escrever, e o que parte um percurso é precisamente a ligação
de que ninguém se lembrou. Parte-se da landing e segue-se o que lá está, como faz
quem chega. **30 rotas** nas três línguas, todas **200**.

Instrumento: `inspeccao/caminho-da-demo.spec.ts`.

**E o zero é um zero medido.** Plantei no DOM o que cada detector procura e todos
acenderam — chave de tradução crua, falta de `h1`, erro de consola — e a rota
inventada de controlo deu 404. Um relatório limpo de um detector cego é
indistinguível de um produto são.

---

## A1 · A reposição dos campos nunca funcionou · **ALTA**

**O que se vê.** Quem escreve mal o email leva a recusa correcta — «corrige e
volta a enviar: esperar não o arranja» — e **volta a um formulário vazio**. Os
cinco campos que escreveu desapareceram. A mensagem manda-o reenviar aquilo que
já não tem.

**Onde.** Escreve: `apps/web/app/api/publico/demo/route.ts:92`. Lê:
`apps/web/app/[idioma]/demo/page.tsx:49-57`.

**A causa, medida e não suposta.** O cookie sai *percent-encoded* e a página faz
`JSON.parse` do valor cru:

```
CRU                            %7B%22nome%22%3A%22Inspeccao%22...
JSON.parse(cru)                LANÇA · Unexpected token '%'
JSON.parse(decodeURIComponent) passa
```

**E o que a esconde é a defesa.** O `catch` da linha 57 é largo *de propósito* —
está escrito que é para um cookie corrompido não impedir o formulário de aparecer.
É exactamente ele que engole isto e devolve `{}` **sempre**. A funcionalidade é o
RV100-021: documentada em prosa, com a razão escrita ao lado, e **morta a 100%
desde que existe**. Nenhum teste falhava, porque nenhum media isto.

**Correcção proposta.** Descodificar antes de interpretar, e **estreitar o
`catch`** para deixar de engolir a diferença entre «não há cookie» e «o cookie
não se lê». Um `catch` que não distingue as duas é o que fez esta falha viver.

## A2 · Não há demonstração para clicar · **MÉDIA, e é de negócio**

**O que se vê.** Das 30 rotas percorridas, **nenhuma aponta para uma superfície
do produto**. «Ver el producto» vai para `/product`, que é uma página de
marketing. Quem vem ver o produto acaba num formulário à espera de um humano.

**Onde.** `apps/web/app/[idioma]/page.tsx:115` — o CTA `verProduto`. E o único
inquilino de demonstração é **efémero**: a semente publica-o por
`reservar_endereco_publico` e o `scripts/provar-mestres.sh:64` chama
`limparDemonstracao` no fim, portanto `/r/bossa-demo` existe apenas enquanto uma
corrida de capturas está em voo.

> **Correcção minha, e vale mais do que o achado.** Eu ia reportar «o inquilino
> de demonstração não tem carta pública», com um 404 e um `grep` à semente como
> prova. **A captura M06 mostra-a a funcionar** — a carta da Bossa Demo, com os
> nomes de idioma e o «Buscar» da montra lá dentro. O meu 404 era o inquilino já
> não estar lá, não um defeito. Foi a segunda vez no mesmo dia que a imagem me
> corrigiu uma inferência tirada do código.

**Correcção proposta.** Nenhuma sem decisão comercial primeiro: manter o
inquilino de demonstração persistente e ligá-lo à landing é uma escolha de
produto, não um conserto. **Fica levantado, não corrigido.**

## A3 · Botões escritos à mão no caminho comercial · **BAIXA**

**O que se vê.** A montra levou a landing a zero `className="bo-botao"` escrito à
mão. O resto do caminho comercial tem **14**, com a maior concentração em
`apps/web/app/[idioma]/getting-started/page.tsx:124,125,246,247`.

**Correcção proposta.** O `Botao` já aceita `href` desde `ec194bc` — é
substituição directa. Não está partido: é dívida, e fica classificada como tal.

---

## O que está são, e foi medido

- O envio que **resulta** funciona nas três línguas e chega ao `/demo/thanks`.
- Os dois erros dizem coisas **diferentes**: validação e falha de escrita não
  partilham mensagem, e a de validação não manda ninguém esperar.
- A caixa de consentimento de marketing **não nasce marcada**.

## Duas correcções à minha própria medição

1. A primeira passagem disse que o servidor aceitava um email sem arroba. Era a
   **validação nativa do `type="email"`** a travar o envio — o pedido nunca saiu.
   Desligada a validação do navegador, o servidor faz o correcto. Uma medição que
   nunca chega ao servidor não mede o servidor.
2. O 404 da carta pública, acima. **Não é defeito.**

## Declarado

Escrevi **três linhas em `demo_requests`**, uma por língua: era a única forma de
medir o envio que resulta. O runtime **não tem `SELECT`** nessa tabela, portanto
a minha prova foi o redireccionamento — e é por isso que a régua tem razão em
exigir que o registo se confirme, e não o obrigado.
