# Revisão do lote L1g — a demo e a conversão

Entrega em `11c9c2f`. É a **única porta pública do produto**: não há registo,
checkout nem pagamento em lado nenhum, portanto todo o funil comercial acaba
neste formulário.

---

## O achado dele, que não estava na minha lista — e fecha um padrão da noite

Eu tinha-lhe dito que a regra *«não mostre sucesso se a persistência falhar»* já
estava cumprida, e mostrei-lhe o código: a rota espera, distingue `erro=campos`
de `erro=gravacao`, trata o duplicado. **Estava certo e era metade da história.**

> «A rota distinguia validação de escrita — **e o ecrã desfazia a distinção.** Os
> dois ramos mostravam *«volta a tentar daqui a um momento»*. Para uma base em
> baixo é o conselho certo; para um email sem arroba é o errado, **porque esperar
> não corrige um campo**.»

Verifiquei nas três línguas e agora dizem coisas diferentes — *«No hemos podido
guardar tu solicitud»* contra *«Revisa estos datos antes de enviar»* — e o tom
também: `perigo` para a falha de escrita, `aviso` para o campo.

**E isto é a terceira vez esta noite que o mesmo padrão aparece:**

| onde | o mecanismo | a superfície |
| --- | --- | --- |
| a FAQ | o produto nunca diz «enviado» sem enviar | a página prometia sincronização que não existe |
| o KDS | a regra de `gap` existe | aponta a um `<a>` que o bilhete não tem |
| a demo | a rota distingue os dois erros | o ecrã mostrava o mesmo texto nos dois |

**O mecanismo estava certo nas três, e nas três a superfície desfazia-o.** É o
defeito que uma revisão de código não encontra por construção — só se vê no
texto lido e na imagem vista. **Ele mediu no texto, e não no redireccionamento**,
e foi por isso que o apanhou.

## O consentimento, e o raciocínio por trás dele

| | antes | depois |
| --- | --- | --- |
| caixa de consentimento | não existe | existe |
| pré-marcada | — | **não** |
| obrigatória para enviar | — | **não** |

> «Um consentimento que bloqueia o envio é **preço**, não consentimento.»

Está certo, e não é uma opinião de desenho: um consentimento condicionado ao
serviço não é livremente dado. Ele chegou lá sem eu lhe ter dito.

**E evitou uma armadilha que eu não tinha visto:** uma caixa não marcada **não é
enviada pelo navegador** — chega **ausente**, não `false`. Um `texto('x') ===
'false'` daria o mesmo nos dois casos e o consentimento **nunca se registaria**.
A rota lê presença.

## A separação onde os dados vivem, não só no ecrã

A migração leva a coluna, a **data** do consentimento — *«um consentimento sem
data não se prova»*, e vem do `now()` do servidor — e um `CHECK` que recusa
**marcado-sem-data e data-sem-marcado**, os dois sentidos.

E removeu a porta antiga de sete argumentos, com a razão certa: **em Postgres a
assinatura nova não substitui a antiga, convive com ela**. Deixá-la viva era
manter uma porta que grava sem dizer nada sobre marketing.

Aplicada com `migrate deploy` e nunca `dev`, porque a base é partilhada com o JR
e `dev` pode propor reset. **Isso é consciência do outro agente**, e foi a falha
de comunicação que eu tive ontem.

## A guarda da afirmação nova, com o controlo que eu exijo

A página afirma que não põe cookies de análise. Ele mediu: **0 cookies e 0
recursos de terceiros em 15 combinações** — e pôs o controlo:

> «Quinze zeros podem ser "não há cookies" ou "o detector não vê cookies", e
> **escrevem-se igual**. Acende: `0 → 1 → 0`.»

**É a minha própria doutrina aplicada sem eu a citar.** E seguiu o padrão dos
três pilares sem eu lho pedir: afirmação nova, guarda nova.

**E não acrescentou um quarto pilar nem um número.** A confiança que esta página
dá é sobre ela própria — o que acontece ao que a pessoa escreve.

## O limite legal, respeitado com precisão

A `/privacy` **não é uma política de privacidade, e o nome dela diz isso**. Tem
só o que se confere no código, e um bloco em destaque a dizer por extenso que
**responsável pelo tratamento, prazo de conservação e procedimento de direitos
não estão fixados e não os inventa**.

Antes, a rota de tratamento de dados dava **404 nas três línguas**; agora dá 200.
E corrigiu o comentário da moldura que afirmava não haver rota. Termos e cookies
continuam sem rota **e sem ligação** — que é a decisão certa: ligar a um 404 é
pior do que a ausência.

## Um defeito da correcção dele própria, declarado e não escondido

O `NEXT_DIST_DIR` que ele introduziu no L1f **isola o build servido e não isola
o tipo**: o `tsconfig.json` inclui `.next/types` com caminho fixo. O build
isolado dele foi buscar o validador de rotas à pasta partilhada e falhou por uma
rota que **ele** tinha removido para medir o antes e que o build do JR tinha
visto enquanto existia.

> «O erro não pertencia a nenhuma das duas árvores.»

**Declarado e não corrigido**, com a razão: o `tsconfig` não lê ambiente, e
resolver o lado dele sujaria o do JR. O arranjo é árvore de trabalho separada e é
maior do que o lote. **Aceito a classificação.**

## O que continua NÃO MEDI

A expansão de texto — *«e agora importa mais, porque a nota do consentimento é a
cadeia mais longa que acrescentei»*. Continua a exigir semear a base partilhada,
e o JR continua a correr suítes nela. **Fecho-o eu quando a base ficar livre.**

**L1g fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
