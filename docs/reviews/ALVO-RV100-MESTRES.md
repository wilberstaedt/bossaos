# Alvo — as seis telas-mestre da RV100 (M01–M06)

> Escrito **antes** de ver a entrega, que é a única altura em que uma régua vale
> alguma coisa. Depois de ver, toda a régua se ajusta sozinha à resposta sem que
> eu dê por isso. Se algo aqui estiver errado, corrijo **aqui** e digo que
> corrigi — nunca em silêncio.

Data: 2026-09-07, madrugada. Contra `docs/RV100.md` §7 e §12.

---

## O que este documento não é

Não é a lista de aceites do §7 copiada por outras palavras. Essa lista já existe
e está lá. Isto é **como é que eu vou tentar reprovar cada mestre**, e o que
tenho de ver para não conseguir.

---

## A regra que atravessa as seis

**Cada estado entregue tem de poder ficar vermelho pela razão certa.** Um
`loading` capturado numa página que nunca carrega não é um estado de
carregamento: é uma página partida com o nome trocado. Um `empty` capturado numa
consulta que não devolveria nada em nenhum caso não prova o estado vazio, prova
que ninguém semeou.

Para cada um dos estados — principal, loading, empty, erro, offline, denied —
pergunto **o que mais produziria esta mesma imagem**. Se a resposta for «uma
avaria», o estado não está provado.

**E o controlo positivo, que hoje já me faltou quatro vezes:** o conjunto que eu
digo estar coberto tem de ser **maior do que zero** e tem de ser **obtido de
outra fonte** que não a propriedade que estou a testar. Contar os estados a
partir da lista de estados capturados prova exactamente nada.

---

## M01 — LP desktop, 1440 × 900

O §12.2 diz «o produto real e a sua proposta **em uma viewport**». Isto é
medível e não é opinião: a proposta tem de estar acima de 900.

- **Reprova se** o hero acabar outra vez em x = 728 de 1440. A linha de base
  mediu 728 em **seis** das oito páginas comerciais — o mesmo valor exacto, que
  é molde repetido e não coincidência. Se o número voltar, não houve
  reconstrução, houve retoque.
- **Reprova se** a metade direita for preenchida com mídia que não existe.
  O implementador avisou disto por escrito antes de começar, e tem razão: um
  hero com metade reservada para uma imagem de produto que ninguém produziu é
  pior do que o vazio honesto. Se o motor de prova bloquear, quero **ouvir isso**
  e não receber o lado direito cheio de nada.
- **Meço**: `x` onde o conteúdo do hero acaba, altura da assinatura (144–168 px,
  ≥120 de largura), contraste do rótulo do CTA coral (tem de ser `#102E35`;
  branco dá 3,05:1 e o manual proíbe), e quantos dos catorze blocos do §6.3
  existem — a linha de base diz **três**.
- **A armadilha desta**: os catorze blocos têm de ser **secções da MKT-001**. Se
  aparecerem como rotas novas, os 396 IDs deixam de ser 396 e o §12.5 cai.

## M02 — LP mobile, 390 × 844

- **Reprova se** não houver menu móvel. A linha de base diz que não existe, e a
  moldura é medida a 360 e 400.
- **Reprova se** o CTA principal não estiver alcançável com o polegar — e isto
  mede-se com o teclado virtual **aberto**, não fechado. Um CTA a 800 px numa
  viewport de 844 desaparece quando o teclado sobe.
- **Meço** nas duas larguras que a suite já usa (360 e 400), não só a 390. Uma
  composição que só fecha no número do manual é uma composição afinada ao teste.

## M03 — Dashboard/backoffice, 1440 × 900

- **Já verifiquei** que as migalhas vivem nos *layouts* e não copiadas por
  página, e que as rotas correm a 10–13 segmentos. Isso é conformidade real e
  não a reabro.
- **Reprova se** a densidade for resolvida a encolher a fonte. O §9.2 diz-lo
  pelo nome: *«não resolva conteúdo grande diminuindo fonte até ficar
  ilegível»*.
- **Meço** o estado vazio com dados a sério. E aviso já do que espero encontrar
  de bom: existe no catálogo um `semDadosExplica` que diz **«ninguém mediu: isto
  não é o mesmo que zero»**. Se esse estado aparecer no mestre, é ponto a favor
  e digo-o.

## M04 — Staff/mesa/pedido, 390 × 844

- **Já verifiquei** que os alvos de toque são 48 px na operação e 44 no público,
  por superfície e não globalmente, com 33 leituras dos tokens. Não reabro.
- **Reprova se** algum ecrã disser «enviado» sobre o que só está gravado no
  aparelho. Verifiquei o texto real nas três línguas — `Not sent` / `Sin
  enviar` / `Não enviados` — e essa honestidade não pode regredir no redesign.
- **Reprova se** a confirmação de pagamento aparecer sem resposta do servidor.
  As quatro acções que exigem rede são `pagamento`, `reserva.confirmar`,
  `conta.fechar`, `desconto.autorizar`.
- **«Operação com uma mão»** mede-se: a acção principal tem de cair no terço
  inferior do ecrã. Se estiver no topo, falha, por muito bonita que esteja.

## M05 — KDS, viewport-alvo documentado

Esta é a que mais me preocupa, e por um número que medi hoje.

- **Reprova se** o viewport-alvo não estiver **escrito**. «Documentado» é um
  aceite, não um adjectivo: sem o número, qualquer captura passa.
- **Reprova se** `kdsE16.estacao` transbordar. Em espanhol — **a língua do
  piloto** — `Your station` vira `A tua estação de trabalho`, **2,08×**, e o KDS
  corre a 18 px por ser lido ao longe. É a superfície com menos folga do
  produto: 188 cadeias do es-ES crescem 30% ou mais.
- **O conteúdo longo tem de ser o real**, não um `lorem`. Já existe guarda
  contra dados fictícios em 670 ficheiros; o mestre não é excepção.

## M06 — Carta pública Starter, 390 × 844

- **Reprova se** a casa usada estiver noutro plano que não Starter. **Esta é a
  armadilha que me custou três ticks esta noite**: a prova do tema chamava
  Starter a uma casa que estava em PRO durante a corrida, e o produto estava
  certo — a premissa do teste é que era falsa. Antes de julgar este mestre,
  **confirmo o plano da casa com um observador ao lado, durante a captura**, e
  não deduzo do que ficou depois.
- **Reprova se** os limites do Starter não se virem. O §12.1 exige que «tema
  Starter e personalização Restaurant/Pro respeitem limites» — um Starter que
  parece um Pro não prova limite nenhum.

---

## O que eu não vou aceitar como prova, em nenhum dos seis

1. **Uma medição só de «depois».** Sem o «antes», não sei se mudou. As capturas
   de base estão em `evidence/baseline/` e são de 1440.
2. **Um teste reescrito para ficar verde.** O §11.1 proíbe-o pelo nome. Se a
   `inspeccao/marketing.spec.ts` partir — e vai partir, mede os 12 MKT em cinco
   larguras com selectores concretos — quero saber **qual** asserção mudou e
   **porquê**, uma a uma.
3. **Um número sem as linhas que ele contou.** Nove vezes hoje um instrumento
   meu contou outra coisa: `-g` sem fronteira de palavra a arrastar SISTEMA para
   dentro de TEMA, `\b` que o `git grep` não suporta, pathspecs que não
   alcançavam nada, `lorem` a casar com `valorEm`, e há uma hora `height:
   [0-9]+px` a contar `line-height` e a quase render-me um defeito de zoom que
   não existe. **A regra: antes de reportar o número, ler as linhas.**
4. **«Aprovado».** Nem por mim nem em nome dele. O §12.4 é explícito: eu posso
   emitir `PRONTO PARA APROVAÇÃO VISUAL HUMANA` e mais nada. A autorização que
   ele deixou por escrito destrava as **pendências dele** — não pode ser
   aprovação de telas que ainda não existiam quando ele a escreveu.

---

## O teste desta régua

Se ela passar num conjunto vazio, não vale nada. Portanto: **antes de a aplicar,
confirmo que os seis mestres existem como ficheiros e que cada um tem mais do
que o estado principal.** Uma régua que dá verde a uma pasta vazia é o quinto
tipo de verde vazio, e já apanhei os outros quatro este mês.

---

## Nota escrita ANTES da entrega da moldura — o CTA deixou de ser coral

Registo isto agora, com a moldura ainda em voo, para que seja régua e não juízo
feito depois de ver o resultado.

A guarda `acento.test.ts` ficou vermelha sobre o CTA comercial novo: coral
`--bo-acento` sobre a areia dá **2,77:1** e o limiar de componente é 3:1. Mandei
os números ao implementador e apontei o caminho que o sistema já tinha: o
`--bo-acento-sinal`, que dá **3,50:1** sobre a mesma areia e que **nasceu no E02
por causa deste número exacto** — o primeiro componente a usar o acento violou a
regra a 2,77:1 e o token corrigido foi criado para o substituir.

**Ele escolheu outra saída:** o CTA passou a `--bo-primaria`, o verde-escuro, a
**13,05:1**. Passa com folga e a guarda fica verde.

**A minha reserva não é sobre o contraste, é sobre o que a solução custa.** O
§4.2 do plano diz que o coral é o CTA principal. Trocá-lo pelo verde-escuro não
corrige um contraste: muda a hierarquia visual da landing inteira, e faz o
elemento de conversão passar a ter a cor da moldura em vez da cor de acento. É
uma alteração maior do que a que a guarda exigia, resolvida no sítio onde a
guarda apitou.

**O que vou exigir na revisão**, e é o que o §7 já pede — «divergências
justificadas em relação ao atlas»: ou uma justificação escrita de porque é que a
LP tem CTA verde e não coral, ou o `acento-sinal`. **Não aceito «porque ficou
verde»** — as duas soluções ficam verdes, e escolher entre elas é uma decisão de
marca, não uma decisão de teste.

E digo o que também é verdade: **a decisão dele pode estar certa.** Um CTA verde
sobre areia com 13:1 é mais legível do que um coral a 3,50:1, e o comentário que
ele deixou ao lado — a LP mantém identidade fixa, um cliente do plano Restaurant
não pinta o CTA da BossaOS — é um raciocínio de produto que eu não tinha feito.
**O que não aceito é que a decisão fique por dizer.** Se for deliberada, escreve-se
e vale; se foi o caminho mais curto para o verde, refaz-se.

Isto é também um caso do §7 que serve à secção 7 inteira: quando uma guarda
aponta um número, a correcção mais barata e a correcção certa raramente são a
mesma, e é o revisor que tem de perguntar qual das duas foi feita.

---

## O M05 respondeu ao «documentado» melhor do que eu esperava — 07/09

A minha régua dizia: *«reprova se o viewport-alvo não estiver **escrito**.
"Documentado" é um aceite, não um adjectivo: sem o número, qualquer captura
passa.»*

Ele podia ter escolhido um número e escrito. **Foi buscar um que o produto já
tinha comprometido.**

O §6.6 da landing diz, **nas três línguas** e numa página pública, que
*«uma TV pode precisar de um mini-PC»* — verifiquei o texto literal:

> `equipamento2Texto` · *«Y una pantalla o un dispositivo para la cocina, según
> cómo trabajéis. **Una TV puede necesitar un mini-PC.**»*

**O televisor é uma superfície de KDS que o produto antecipa por escrito.** Logo
`1920 × 1080` não é uma preferência: **é a consequência de uma promessa
comercial já publicada.** E acrescentou um segundo, `1280 × 800`, que é o da
composição existente — a cozinha apertada com um portátil.

**É a melhor forma de cumprir um aceite de documentação:** não escrever um número,
mas **derivá-lo de um compromisso que já existe**. Um número escolhido pode ser
discutido; um número que sai do que a página promete ao cliente só se muda
mudando a promessa.

## E os estados declaram o que mais produziria a mesma imagem

A régua exige que cada estado possa ficar vermelho **pela razão certa**, e que se
pergunte *«o que mais produziria esta mesma imagem?»*. O arnês dele implementa
isso **por estado**, e não como princípio geral:

- **`offline`** só conta **se o ecrã mudar**. Idêntico ao `online` significa que
  a página **não reparou na rede** — não que degrada bem;
- **`denied`** falha se devolver 200 com o conteúdo de outra casa;
- **`loading`** só conta onde a mesma rota também produziu um `principal` — sem
  isso, a fotografia podia ser de uma página que **nunca carrega**.

**Os três nomeiam a avaria que se disfarça de sucesso**, que é exactamente o que
eu tinha pedido — e o do `offline` é o mais fino: dois ecrãs iguais não provam
resiliência, provam indiferença.

---

## A régua caiu em cima de quem a estava a cumprir — 07/09

Escrevi nesta régua que *«um `loading` capturado numa página que nunca carrega
não é um estado de carregamento: é uma página partida com o nome trocado»*.

**Aconteceu-lhe exactamente isso, e foi ele a apanhá-lo.**

> «**O meu próprio controlo produziu um verde falso, e o código de saída
> escondeu-o.** 25 capturas, `exit 0` — e quatro delas eram páginas brancas.»

### Como o apanhou, e é a melhor parte

**Pelo tamanho dos ficheiros.** O `M03-denied` e o `M03-erro` saíram **byte a
byte idênticos**, a 5851; o `M04-erro` e o `M04-offline` a 2740.

> «**Duas telas diferentes não podem produzir os mesmos bytes a não ser que
> nenhuma seja uma tela.**»

**Não foi a imagem que o denunciou — foi um invariante sobre a imagem.** É o mesmo
padrão que atravessou a noite: o instrumento não é testemunha de si próprio, e o
que o apanha é sempre um segundo facto que discorda do primeiro. Desta vez o
segundo facto era `ls -l`.

### A causa, numa linha que ele próprio escreveu

Aceitou `codigo >= 400` como prova de um estado `denied` ou `erro`. **E um 404 em
branco satisfaz isso.**

> «O código de resposta diz **o que o servidor decidiu**; não diz nada sobre **um
> ecrã existir**.»

### Três faltas, e a terceira é a mais funda

1. **O controlo não exigia renderização** — agora um estado tem de produzir texto
   ou fica `NÃO CAPTURADO` com a razão.
2. **`catalogo/produtos/[id]` não é uma rota** — o teste de «id inválido» batia
   num caminho que ele inventou, logo o 500 não dizia nada sobre tratamento de
   ids. Passou a usar uma rota que existe.
3. **O cenário de offline era o cenário errado.** Navegou **já offline** e
   capturou o `ERR_INTERNET_DISCONNECTED` — **a página de erro do navegador, não
   a do produto**. E não podia ter funcionado: o service worker **recusa
   deliberadamente** guardar telas de inquilino.

**A terceira liga-se ao maior achado da noite.** Exigir um arranque a frio sem
rede era *«medir uma promessa que o produto nunca fez»* — e é **exactamente a
promessa que a FAQ fazia e que foi corrigida** por ele próprio há oito horas. O
teste teria provado a mentira que a página deixou de contar.

**O cenário verdadeiro é a tablet já aberta no salão quando a rede cai** — abrir
com rede, cortar, observar. É aí que vivem o `Sin enviar` e a recusa com motivo.

## E um achado de produto que sobrevive à corrida má

O `denied` **comporta-se bem como isolamento**: a unidade de outra casa devolve
**404 e não 403**, portanto não confirma que o recurso existe. **Mas não
renderiza nada.**

**O §7 pede um estado `denied`/`upgrade` e o backoffice não tem ecrã desenhado
para ele.** O `NaoEncontrado.tsx` é o único componente de estado desenhado no
código.

**Isso é uma lacuna de produto que a lista de entregáveis do §7 expôs** — e
expô-la é para o que a lista serve.
