# A régua media o §8; a direcção estava no §4 — 08/09, 13h30

O Matheus escreveu: «são muitos erros, você tem vários arquivos md te mostrando para
onde ir.» Fui fazer isso — ler o norte e comparar com o que está no ar. **Ele tem
razão, e a coisa é maior do que um cabeçalho.**

## §4.1 Header, contra a página publicada

Medido ao vivo em `bossaos.mwdeveloper.tech/es-ES`, hoje:

| o §4.1 exige | medido | |
|---|---|---|
| altura entre **72 e 80 px** | **59 px** | **viola**, 13 px abaixo |
| logótipo 145–165 px | 145 px | passa, no limite inferior |
| idiomas num **selector compacto, não três itens** | **três itens**: ES, PT, EN | **viola**, e a frase do norte proíbe-o por palavras |
| **Pedir una demo como CTA coral** | fundo `rgb(16,46,53)` — o verde escuro | **viola** |
| mobile com logo, **CTA curto** e menu real | logo e hambúrguer; **sem CTA** | **viola** (fotografia dele) |

Quatro violações de especificação escrita, **só no cabeçalho** — o elemento para que
ele apontou.

## Porque é que as onze condições passaram na mesma

Porque **medem outra coisa**. O §8 são as **condições de reprovação**: fundos
distintos, número de cartões, legibilidade da captura, blocos, percentagem de coral,
texto contra produto, sobreposição com o /product, mapa das mesas, componente só-móvel,
dados inventados, regressões.

Nenhuma delas olha para o §4.

**Construí um instrumento para o §8 e nenhum para o §4.** As onze passam e continuam
a passar; simplesmente não é ali que vive a direcção. O §8 diz o que **não pode**
acontecer; o §4.1 a §4.8 dizem o que **tem de** acontecer, bloco a bloco — e disso não
se mediu nada.

É a doença do dia, na sua forma final e maior: **o instrumento estava certo, e o
sujeito que ele nunca cobriu era o que decidia.** Eu dizia «treze em treze» sobre a
metade da régua que fala de reprovação, e apresentava isso como se falasse de
qualidade.

## O que fica

Isto responde à pergunta que eu não conseguia responder às 11h28 — como é que a régua
passa uma página que ele acha horrível. **Não é que o gosto dele fuja à medição.** É
que metade do norte, a metade que descreve o que a página deve ser, nunca foi medida
uma única vez.

Sete blocos, cada um com a sua lista. Só verifiquei o primeiro.

---

## Os outros seis blocos, e o achado maior — 08/09, 13h45

Medido na landing publicada. **Viewport de 500 px**, o que me impede de julgar as
exigências de secretária (herói ≥ 760 px, contentor 1240–1280) — não as reporto, e o
meu browser tem dado 1440 numas chamadas e 500 noutras, portanto a largura vai
declarada em cada medição.

| §4 | exige | medido |
|---|---|---|
| 4.2 | primário **coral** | `rgb(216,90,68)` — **coral** ✓ |
| 4.2 | secundário «**Ver cómo funciona**» | diz «Ver el producto» — desvio de texto |
| 4.6 | Starter **€19**, Restaurant **€79**, Pro **€149** | **zero valores em euros na página inteira** |
| 4.8 | no máximo **seis** perguntas | seis ✓ |

## Os preços: não é a página a desobedecer, é uma resposta que nunca chegou

Ia escrever «o bloco dos planos viola o §4.6». Fui procurar se havia decisão em
contrário, e o que encontrei explica tudo. O prompt original, o **E10**:

> Implemente LP BossaOS: proposta, produto, **planos sem valores inventados**,
> implantação, FAQ, demonstração, confirmação e 404.

A página nasceu sem preços **porque lhe foi dito para não os inventar** — e fez bem.
Depois o North Star v2 veio e **deu-os**, com nome e número, no §4.6.

**A pergunta estava em aberto, o Matheus respondeu-a por escrito, e a resposta nunca
foi aplicada.** Não é desobediência da página: é uma instrução antiga que continuou a
valer depois de deixar de ser verdade.

E o custo é comercial e não estético: **quem chega à landing não vê quanto custa**, e
tem um bloco inteiro chamado «Un plan para tu restaurante» que não diz o preço de
nenhum.

Uma ressalva, e é de decisão e não de medição: **pôr preços reais numa página pública
tem consequências** — compromete-te com um número à frente de qualquer concorrente que
o leia. O norte é documento dele e nomeia os três valores, portanto a direcção está
escrita; mas a confirmação de que se publicam **hoje** é dele, e não a assumo.

---

## Os blocos 2 e 4 fazem exactamente o que o norte proíbe por palavras — 08/09, 14h00

Viewport de 500 px, e estas medições não dependem da largura: são contagens de nós.

**§4.3, Bloco 2 «Uma comanda atravessa o sistema».** O norte exige «use **quatro
crops grandes da interface** conectados por uma linha de ritmo» e proíbe, por
palavras: «**não use quatro cards iguais com parágrafos**».

Medido: **4 títulos, 4 parágrafos, ZERO imagens.** Os quatro cartões chamam-se «Se
reserva o se pide», «La cocina la ve», «Sale al pase», «Se cobra».

Não é uma aproximação imperfeita do que foi pedido. É **o anti-padrão nomeado no
documento**, implementado tal e qual, e sem nenhuma das quatro imagens que o
substituiriam.

**§4.5, Bloco 4 «Para cada pessoa, a tela certa».** O norte exige «use **tabs ou
narrativa alternável** acessível» e «ao trocar papel, **troque screenshot** e
benefício», e diz «**evite quatro novos cards de texto**».

Medido: **zero tabs, uma única imagem para quatro papéis, 4 títulos e 5 parágrafos.**
Com uma imagem só, trocar de papel não pode trocar de ecrã — o mecanismo que a
especificação pede não existe.

## Isto fecha o diagnóstico

O que eu vi de manhã e chamei «forma genérica que se reconhece como feita por
ferramenta» — círculos numerados, quatro colunas de texto — **é literalmente aquilo
que o norte proíbe pelo nome**. Não era gosto meu nem dele: estava escrito, e não foi
seguido.

E explica a frase dele: «são muitos erros, você tem vários arquivos md te mostrando
para onde ir.» Estão lá, com esta precisão, e ninguém os mediu.

## O tamanho do que falta, dito sem disfarce

Isto não é um conserto de uma linha como o do cabeçalho. O bloco 2 precisa de quatro
capturas reais da interface, e o bloco 4 de um mecanismo alternável com um ecrã por
papel. **É construção, não afinação** — e é o trabalho da landing, não a propagação
às 396 telas, que continua a esperar pela Nathalia.

---

## §4.1: as três corrigidas e a quarta respondida — 08/09

Medido no renderizado, com a **largura declarada em cada linha**.

### Antes

    1440px  cabecalho altura=59  logo=145
            a.bo-mkt__cta "Pedir una demo"  bg=rgb(16,46,53)  16px/700
            a "ES" x=1017..1061 · a "PT" x=1065..1109 · a "EN" x=1113..1157
    390px   cabecalho altura=59
            a.bo-mkt__marca  +  button.bo-mkt__abrir     ← e mais nada

### Depois

    1440px  altura=75  idiomas-soltos=0  selectores=1
            CTA: 19px/700 bg=rgb(216,90,68) cor=rgb(16,46,53)
    390px   altura=75  idiomas-soltos=0  selectores=1

### 1 · A altura, e a conta é simples

59 = **50** do logotipo + **8** de `padding-block` + **1** da borda. Os 4 px de
cada lado foram meus, da Fase 2, para trazer o cabeçalho de 102 para dentro da
faixa; depois o cabeçalho perdeu a linha da navegação para dentro do menu e a
mesma regra passou a dar 59. **12 de cada lado dão 75**, no meio dos 72–80.

### 2 · Os idiomas: um selector, não três itens

Eram três ligações a ocupar `x=1017..1157` — **140 px imediatamente à direita do
CTA**, que é literalmente «três itens concorrendo com o CTA».

Reutiliza o **`GrupoMkt`**, que já é o mecanismo de agrupar desta barra (os
«Recursos» usam-no). Um selector novo seria uma segunda forma de fazer a mesma
coisa, e a próxima pessoa teria de escolher entre as duas sem saber porquê. O
rótulo é o **idioma actual**: um selector que não diz o que está seleccionado
obriga a abri-lo para saber onde se está.

### 3 · O CTA coral, e o tamanho subiu com a cor

O do herói já estava certo (`rgb(216,90,68)`), portanto o desvio era só no
cabeçalho.

**E a cor obrigou o tamanho.** Sobre coral não há cor de texto que chegue a
4,5:1 — o tecto é **3,84** com branco e **3,73** com o verde. A **16 px normais**
isto seria uma falha de contraste; a **19/700** entra na faixa de texto grande da
1.4.3, onde o limiar é 3, e passa. Não é preferência: é a mesma impossibilidade
do coral que já se tinha provado, e a saída é a mesma — o tamanho. Os dois CTA
deixam de ser dois desenhos.

Confirmado por medição e não por mim: `AMBITO superficies=12 medidas=12 maus=0`.

### 4 · O CTA ao telemóvel: falta mesmo

**Confirmo.** A 390 o cabeçalho tem `a.bo-mkt__marca` e `button.bo-mkt__abrir`, e
mais nada. O CTA **existe**, mas vive dentro do painel do `MenuMkt`, que ao
telemóvel está colapsado — só aparece depois de abrir o menu. O §4.1 pede «mobile
com logo, **CTA curto** e menu real».

**Não o construí, e digo porquê.** O CTA está dentro da `<nav>` de propósito: é
dela que a `marketing.spec.ts` prova que as sete rotas se alcançam da landing.
Tirá-lo de lá parte essa prova, e a saída — alargar o selector da guarda ao
cabeçalho inteiro — é mexer numa guarda para acomodar uma mudança de desenho.
**Isso quer decisão, não iniciativa**, e é vizinho dos blocos 2 e 4 que ficaram
reservados para etapa própria.

---

## Construí a fita métrica que faltava, e a primeira corrida corrigiu-me — 08/09, 14h20

`scripts/medir-quatro.mjs`. Mede o §4 nas duas larguras, declara a largura em cada
bloco, e abstém-se do que não se pode medir naquela largura em vez de adivinhar.

**Primeira corrida contra a landing publicada: 18 medidas, 11 desvios, 1 abstenção.**

E o que ela fez primeiro foi desmentir-me:

| eu disse | a fita mediu |
|---|---|
| «altura do cabeçalho 59 px, viola 72–80» | **78 px a 1440** — dentro da spec. Os 59 são **a 390** |
| «não julgo o herói, o viewport é 500» | **790 px a 1440** — acima do mínimo de 760 ✓ |

A altura do cabeçalho **não é uma violação geral: é um desvio só no telemóvel**. Eu
medi numa largura, não a declarei no veredicto, e generalizei. É a quinta vez hoje —
e desta vez foi o instrumento novo a apanhar-me, o que é exactamente para o que ele
serve.

## Os onze desvios, com a largura ao lado

- **CTA do cabeçalho** `rgb(16,46,53)` em vez de coral — nas duas larguras;
- **3 itens de idioma** visíveis a 1440, quando a spec proíbe três por palavras;
- **cabeçalho a 59 px** a 390 (spec 72–80);
- **móvel sem CTA** (spec: logo, CTA curto e menu real);
- **bloco 2 com 0 imagens** e 4 parágrafos, nas duas larguras;
- **bloco 4 com 0 tabs**, nas duas larguras;
- **0 valores em euros**, nas duas larguras.

## Duas notas de construção

Usa o **Chrome instalado** em vez de descarregar o headless do Playwright: eram
centenas de MB na máquina dele para uma medição que o browser que ele já tem faz.

E **não é uma guarda**: mede e relata, não recusa, não entra no `validar-no-commit`.
O que fazer com um desvio é de quem desenha — a fita só impede que se descubra tarde.

**Por rever: o código é meu.** Fica para o JR, como sempre.
