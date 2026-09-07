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

**A causa — e a primeira que escrevi aqui estava ERRADA.**

> **Fica o erro escrito, porque foi ele que me ensinou a medir isto.** Eu tinha
> publicado neste ficheiro que a causa era o cookie sair *percent-encoded* e a
> página fazer `JSON.parse` do valor cru. Medi o frasco de cookies do
> **navegador**, vi `%7B%22nome%22…`, e concluí sobre o que o **servidor** lê.
> São coisas diferentes: o `cookies().get()` do Next devolve o valor já
> descodificado. Corrigi a descodificação, reconstruí, e o defeito **continuou
> lá** — foi o build fresco a desmentir-me, não um raciocínio melhor.

A causa verdadeira, medida no cabeçalho do 303:

```
POST  chega a   http://127.0.0.1:3018/api/publico/demo
303   Location  http://localhost:3018/es-ES/demo?erro=campos     ← o anfitrião MUDOU
GET   seguinte  (SEM CABECALHO COOKIE)
```

**O `destino()` construía o endereço com `new URL(pedido.url)`, e o `pedido.url`
do Next não é o que o navegador escreveu.** Para o navegador, `127.0.0.1` e
`localhost` são sítios diferentes: o `Set-Cookie` fica no anfitrião que
respondeu, o GET seguinte vai para o outro, e o cookie **nunca é enviado**. A
página não perdia o que leu — nunca recebeu nada para ler.

**E o caso é alcançável por uma pessoa real, o que fecha a severidade.** O
padrão do servidor exige ponto no domínio (`packages/domain/src/leads.ts:59`) e
o `type="email"` do navegador **aceita** `joao@gmail`. Quem se esquece do `.com`
passa a validação nativa, é recusado pelo servidor, e perdia os cinco campos —
incluindo a mensagem livre, que é a única que teve de pensar.

**Correcção aplicada.** `Location` **relativo**: o navegador resolve-o contra o
pedido que fez, e um redireccionamento relativo não pode mudar de sítio. Uma
linha, em `apps/web/app/api/publico/demo/route.ts:42`. **A página não foi
tocada** — o código dela estava certo.

**E fecha um risco maior do que o medido:** um `pedido.url` que reporte
`localhost` em produção mandava o cliente para a máquina dele. Não o observei em
produção e não o afirmo; o que afirmo é que a forma relativa torna isso
impossível por construção.

**Prova.** `inspeccao/caminho-da-demo.spec.ts`, com controlo negativo nos dois
sentidos: reposto o redireccionamento absoluto a prova fica **vermelha** nos
cinco campos; com o relativo fica **verde**. E um terceiro A/B, para não deixar
uma correcção sem justificação: desligada a descodificação, **continua verde** —
foi assim que soube que a minha primeira correcção não era a cura, e a revi.

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

## A3 · Botões escritos à mão no caminho comercial · **BAIXA** · FECHADO

### A reconciliação, feita ANTES de corrigir

O sénior contou **10** e eu contei **14**, e a diferença não era erro de nenhum
dos dois: **eram populações diferentes**. Ele contou em seis ficheiros de rota;
eu contei nos que a travessia alcança a partir da landing.

| ficheiro | ele | eu |
| --- | ---: | ---: |
| `getting-started` | 4 | 4 |
| `plans` | 2 | 2 |
| `product` | 2 | 2 |
| `faq` | 1 | 1 |
| `demo` | 1 | 1 |
| `trust`, landing | 0 | 0 |
| **`demo/thanks`** | — | **1** |
| **`pilot`** | — | **2** |
| **`privacy`** | — | **1** |
| | **10** | **14** |

**A soma fecha: 10 + 4 = 14, e os quatro extra são alcançáveis.** O `/pilot`
está na navegação de marketing, o `/privacy` é ligado do próprio formulário de
demonstração, e o `/demo/thanks` é onde aterra quem converteu — a travessia
chegou aos três a partir da landing, sem sessão. **Corrigir dez deixava quatro
vivos em páginas que ninguém tinha visitado**, que é exactamente o modo como
estas dívidas sobrevivem.

### A correcção

Os 14 passaram a `Botao` — 13 com `href`, e o do `/demo` como
`<Botao tom="primario" type="submit">`, que continua a submeter o formulário
porque o `type` do chamador vence o `type="button"` do componente. Total no
produto: **274 → 260**. A landing continua a **zero**.

**Medido no DOM e não na contagem**, que é o que a montra me ensinou: os 14
rendem, os 14 navegam, **zero inertes**. Uma conversão que deixasse um `<a>` sem
`href` continuaria a contar como convertida e não levava ninguém a lado nenhum.

---

## O ponto 4 da régua — a demonstração diz que é uma demonstração

**Não é medível neste caminho, e a razão é o A2.** A régua pergunta se o aviso
aparece **no percurso**; o percurso nunca chega ao inquilino de demonstração,
porque nada na landing lhe aponta e ele é efémero. Não há aviso em falta: não há
ecrã. Fica em NÃO MEDI, preso ao A2 — resolvido o A2, isto passa a ter resposta.

## O que está são, e foi medido

- O envio que **resulta** funciona nas três línguas e chega ao `/demo/thanks`.
- Os dois erros dizem coisas **diferentes**: validação e falha de escrita não
  partilham mensagem, e a de validação não manda ninguém esperar.
- A caixa de consentimento de marketing **não nasce marcada**.
- **O registo fica mesmo**, e isto é o que a régua exigia acima do obrigado:
  confirmado por `SELECT` na `demo_requests` pela ligação de migração, com marca
  única por corrida — e com controlo da própria consulta, que devolve zero para
  um endereço nunca submetido.
- Os 15 destinos (cinco × três línguas) dão 200 sem sair do idioma, o destino
  inventado dá 404, e nenhum ecrã do percurso mostra correio técnico, bloco de
  depuração ou chave de tradução crua.

## Duas correcções à minha própria medição

1. A primeira passagem disse que o servidor aceitava um email sem arroba. Era a
   **validação nativa do `type="email"`** a travar o envio — o pedido nunca saiu.
   Desligada a validação do navegador, o servidor faz o correcto. Uma medição que
   nunca chega ao servidor não mede o servidor.
2. O 404 da carta pública. **Não é defeito** — era o inquilino já não estar lá.
3. A causa do A1, acima. **Duas vezes o mesmo erro no mesmo dia:** medir uma
   coisa e concluir sobre outra vizinha. No M06 foi o código a falar por uma
   imagem; aqui foi o frasco do navegador a falar pelo servidor. O que me
   apanhou das duas vezes foi ir buscar a medição directa — a captura, e o
   cabeçalho do 303.

## Declarado

Escrevi **três linhas em `demo_requests`**, uma por língua: era a única forma de
medir o envio que resulta. O runtime **não tem `SELECT`** nessa tabela, portanto
a minha prova foi o redireccionamento — e é por isso que a régua tem razão em
exigir que o registo se confirme, e não o obrigado.

---

## Verificação do sénior — 16h20

**O método vale mais do que os achados, e escrevo-o para não se perder:** ele
percorreu **por ligação seguida**, não por lista de rotas. *«Uma lista mede o que
eu me lembrei de escrever, e o que parte um percurso é precisamente a ligação de
que ninguém se lembrou.»* 30 rotas, três línguas, e **o zero é medido** — plantou
no DOM o que cada detector procura, todos acenderam, e a rota inventada deu 404.

**A1, reproduzi a cadeia por mim:** JSON *percent-encoded* lança no `parse`,
descodificado passa. Confere. **E o que a esconde é a defesa** — um `catch`
largo escrito de propósito para o formulário aparecer mesmo com cookie
corrompido, que devolve `{}` **sempre**. A funcionalidade tem prosa, tem razão
escrita ao lado, e **nunca funcionou desde que existe**. Nenhum teste falhava
porque nenhum media isto.

**Um candidato meu caiu antes de lho mandar.** Ia sugerir que a renderização
estática esvaziasse o cookie — foi o que aconteceu hoje com os `searchParams`.
**A página tem `export const dynamic = 'force-dynamic'` e lê `cookies()`
directamente.** Verifiquei antes de falar: uma pista errada a quem está a caçar
custa mais do que o silêncio.

**A2 escala para o Matheus e não para código.** Ele classificou-o como decisão
comercial e recusou-se a corrigi-lo — **e tem razão**. É também, de tudo o que
saiu hoje, o mais relevante para o «mais próximo de venda» que o Matheus pediu:
*das 30 rotas do caminho comercial, nenhuma leva a uma superfície do produto*.
Quem clica em «ver o produto» chega a uma página de marketing e acaba num
formulário à espera de um humano.

**E a auto-correcção dele dentro do A2 é do mesmo tipo das minhas:** ia reportar
que o inquilino de demonstração não tinha carta pública, com um 404 e um `grep`
por prova — **e a captura M06 mostra-a a funcionar**. O 404 era o inquilino já
não estar lá, porque é efémero. *«Segunda vez no mesmo dia que a imagem me
corrigiu uma inferência tirada do código.»*
