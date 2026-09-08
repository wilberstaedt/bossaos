# Revisão da tela «Mesas em tempo real» — 08/09 01h40

> Feita **a olhar para as capturas**, que é o instrumento certo para esta
> pergunta. O JR chegou a 100 % de contexto antes de as poder rever, e elas
> estavam por comitar.

## O que passa, e passa bem

- **A barra lateral é o §7.1**: verde profundo, agrupada em `OPERACIÓN` /
  `ABASTECIMIENTO` / `NEGOCIO`, com **barra coral** no item activo — e não o
  bloco lima que o norte recusa.
- **A condição 9 está atacada de verdade.** Deixou de ser uma `<ul>` de texto:
  são cartões com **estado, capacidade, duração e responsável**, e a **borda
  codifica o estado** — coral para ocupada, escura para reservada.
- **Resumo pequeno** presente: livres, serviços abertos, reservada, a pedir a
  conta.
- **A condição 10 passa:** o telemóvel tem navegação **própria** — hambúrguer e
  barra inferior — e não é a barra lateral comprimida.

## Três coisas que reprovam, e a primeira salta à vista

### 1 · Todo o texto dentro dos cartões é uma ligação sem estilo

`insp-07`, `insp-Terraza · 4 pax`, `Ocupada · 1:29`, o email — **tudo a azul e
sublinhado**, o azul por omissão do navegador. O resto da página **está**
estilizado (barra lateral, título, pílulas, bordas dos cartões), portanto o CSS
carregou: **falta a regra para as âncoras dentro do cartão.**

É o defeito mais visível da tela e é o primeiro que a Nathalia vai ver.

### 2 · Um email aparece no mapa de mesas

`inspeccao@exemplo.example`, repetido em **cada mesa ocupada**. O §7.2 diz
**«sem expor PII indevida»**. O responsável identifica-se por nome, nunca por
endereço — e num ecrã de parede de uma sala, menos ainda.

### 3 · No telemóvel, as sete pílulas comem o primeiro ecrã inteiro

Empilham em **sete linhas** e **não se vê uma única mesa acima da dobra**. O
§7.2 pede «filtros e acções secundárias sem virar dez pílulas»; sete que ocupam
todo o primeiro ecrã falham o espírito e quase a letra.

**No telemóvel, um mapa de mesas que não mostra mesas não é um mapa de mesas.**

## Uma observação que NÃO é defeito

Os dados são as fixtures `insp-*`. Para uma captura está certo — **mas o §7.2
pede «dados demo identificados como demonstração»** e não há rótulo nenhum a
dizê-lo. Fica como pendência da tela, não como erro da captura.

## O que isto não decide

Nada do §11. **Isto é o piso medível.** Se a Nathalia gostar, gosta apesar
destas três; se não gostar, estas três não são a razão — mas seriam se ficassem.

---

# A landing, revista a olhar — e as capturas mostram um defeito já curado

## O salto é grande e é preciso dizê-lo

O herói é **verde profundo**, o H1 domina em três linhas brancas, e **o produto é
o protagonista**: duas capturas grandes e sobrepostas com profundidade, onde se
lê «Mesas en tiempo real», as linhas das mesas, «Cocina caliente» e os nomes dos
pratos. **O §4.2 pede exactamente isso** — «o utilizador precisa de ler títulos
reais da interface sem ampliar a página» — e cumpre-se. A lima aparece onde o
norte a quer: no estado e na continuidade, na legenda que liga as duas telas.

## Mas o CTA primário não tem caixa, e o secundário tem

Na captura, **«Pedir una demo» é texto branco sobre verde, sem fundo**, enquanto
**«Ver el producto» tem caixa clara**. **A hierarquia está invertida.**

**E o defeito já está curado.** A cura está **no mesmo commit** `3096b78`:

    .ns-seccao--verde .bo-botao--primario { background: var(--bo-accao); … }

| | |
|---|---|
| `mtime` da captura | **01:20** |
| commit que a leva **e** leva a cura | **01:27** |

**As capturas foram tiradas sete minutos antes da cura e viajaram no mesmo
commit que a corrige.** O commit leva a cura e a evidência da doença lado a lado.

## E a guarda já dizia isto — ninguém a correu

`validar-provas-frescas` cobre `docs/visual` inteiro, e as capturas do norte
vivem lá. Corri-a:

    saida=1
    FALHOU  73 artefacto(s) de prova são anteriores à última alteração ao produto:
              4 docs/visual/ns2/2026-09-08_a3935ea

**Não é um buraco na maquinaria: é um passo que ninguém deu.** É a terceira vez
hoje que uma cura existia e não foi apontada ao momento certo.

**Isto tem de ser corrigido antes de a Nathalia ver seja o que for.** Ela vai
julgar as imagens, e uma imagem que mostra um defeito já morto faz reprovar
aquilo que já não existe.

## E uma coisa que a guarda não sabe distinguir

As minhas capturas do «antes», em `2026-09-08_483c4a7/capturas`, também aparecem
na lista. **E estão certas assim** — uma captura do «antes» é **suposto** ser
anterior ao produto.

**A guarda não distingue «velha por acidente» de «velha por desenho»**, e uma
guarda que acusa para sempre uma coisa correcta é uma guarda que se aprende a
ignorar. Fica dito, não corrigido — corrigi-la agora era mexer numa guarda no
meio de uma entrega.

---

# Fase 2 fechada — revisão, 08/09 02h05

## As duas coisas que apontei estão curadas, e vê-se

| | antes | agora |
|---|---|---|
| texto dos cartões | **azul sublinhado**, ligações sem estilo | verde escuro, estilizado |
| pastilhas no telemóvel | 7 linhas, **zero mesas acima da dobra** | rolam na horizontal, **duas mesas inteiras** visíveis |

## A terceira não está — e a causa não é dele

O email continua no mapa. **Mas não o acusei sem verificar**, e ainda bem:

    packages/db/src/sala.ts:99     abertaPor: dados.actor.email

**O campo é escrito com o email na camada de domínio.** Não é uma sobra da
fixture nem um recuo do redesign: em produção, abrir uma mesa **grava o email de
quem a abriu**, e o mapa mostra-o.

A captura antiga do Matheus mostrava «Marta (sala)» apenas porque a **semente de
demonstração** guarda um nome (`QUEM_ATENDE`); a de inspecção guarda o literal
`inspeccao@exemplo.example`. **O redesign só tornou visível o que já lá estava** —
num cartão maior.

**Fica como achado com dono certo:** é `sala.ts`, é anterior a esta frente, e o
§7.2 pede «sem expor PII indevida». A exposição é interna — só a vê quem tem
sessão na unidade — o que modera a severidade e não a apaga: **um email é mais
do que um nome, e um nome bastava.**

## O que verifiquei da entrega dele

- **A aritmética do coral já a tinha refeito**: o tecto é 3,84 com branco e 3,73
  com o verde. **Sobre coral, 4,5 não existe.** A cura dele foi **sair de cima do
  coral** — e escreveu a frase que interessa: *«nenhuma régua foi tocada para
  isto ficar verde.»* **Mudou o desenho em vez de baixar o limiar.**
- **Duas guardas ficaram vermelhas por causa dele e ele curou-as**, dizendo-o: o
  plante do host reancorado **na lógica e não na linha**, e as três suites novas
  que «desapareciam» por não serem nomeadas.

## E a melhor coisa que ele escreveu esta noite

Sobre o `min-width: 0` que não era a pista: **a causa era o `margin: 0 auto` da
regra-base** — *«um item de grelha com margem automática deixa de esticar e passa
a ser dimensionado pelo conteúdo»*. **A primeira cura estava errada e ele
disse-o.**

E sobre não duplicar o motor de contraste: *«duas opiniões sobre a mesma pergunta
concordam até ao dia em que discordam.»*

---

# Os catorze números, medidos POR MIM — 08/09 02h20

Andei vários ticks a dizer «os números dele continuam por verificar da minha
parte». Estão verificados. Máquina em `OK`, build do commit final, servidor a
responder 200 em `/es-ES`, e a fita **calibrada** de `scripts/medir-norte.mjs`.

| | alvo | antes | **medido por mim** |
|---|---|---:|---:|
| H1 secretária | 68–76 | 52 | **72** |
| H1 telemóvel | 42–48 | 34 | **44** |
| H2 secretária | 44–56 | **26** | **48** |
| Lead secretária | 19–22 | 16 | **21** |
| Corpo | 16–18 | 16 | **17** |
| Cabeçalho | 72–80 | 102 | **78** |
| Logótipo | 145–165 | 145 | **145** |
| Herói | ≥ 760 | 759 | **790** |
| Captura maior | ≥ 650 | 588 | **741** |
| Blocos `<section>` | ≤ 8 | 13 | **7** |
| Altura secretária | 4500–5500 | 7103 | **5477** |
| Fundos distintos | ≥ 3 | 2 | **4** |

**Doze de doze cumprem.** E o telemóvel desceu de 10 689 para **9867 px**.

## Os meus números não são exactamente os dele, e está certo assim

Ele declarou herói **776**, captura **667**, altura **5205**. Eu meço **790**,
**741**, **5477**. **Não é discrepância: é a página a mudar depois de ele medir.**
As três curas do coral moveram texto e mudaram o traçado. **Os meus são do
commit final; os dele eram verdadeiros quando os escreveu.**

Registo-o porque a tentação era escrever «confirmado» e repetir os números dele.
**Confirmar o veredicto não é confirmar os algarismos.**

## E um que a minha tabela não checava

    raios: 10px ×13   20px ×7   18px ×5

O §3.3 pede **cantos entre 14 e 24 px nas áreas de marketing**, e **treze
elementos estão a 10 px**. Os 20 e os 18 cumprem; os 10 não.

**Não estava na minha lista de doze** — eu tinha-o posto na folha dos catorze e
não o traduzi em verificação. **A fita mostrava-o e eu não olhava.** Fica como
achado pequeno e verdadeiro, e como nota sobre a fita: **imprimir um número não
é verificá-lo.**

---

# 08/09 02h55 — o herói vende uma tela que já não existe

## O que a recaptura curou

**O CTA está corrigido.** «Pedir una demo» tem agora **caixa coral** e «Ver el
producto» é o secundário claro. O verde-sobre-verde desapareceu e a hierarquia
está no sentido certo. **Confirmado a olhar para a captura nova.**

## E o que ela não podia curar

A imagem **dentro** do herói mostra a tela das Mesas **em lista** — linhas com
`07 · Terraza`, `Comensales: 3 · Abierta 19:22 · Marta (sala)`, distintivos
`Libre` à direita.

**O produto já não é assim.** A Fase 2 substituiu essa lista por uma **grelha de
cartões** com estado, capacidade, duração e borda a codificar o estado. Foi a
condição 9 do norte e está feita.

**Logo: a landing nova vende uma tela que foi substituída há quatro horas.**

E o §4.2 do norte pede exactamente **«o produto real como protagonista»**. O
protagonista está lá, grande e legível — **e é uma fotografia de algo que já não
existe.**

## A guarda já dizia, e desta vez eu corri-a

    validar-capturas-de-marketing   FALHOU
      apps/web/src/demonstracao/es-ES/sala-servico-1440.png  :: anterior a fonte do produto
      apps/web/src/demonstracao/es-ES/sala-estreita-390.png  :: anterior a fonte do produto
      apps/web/src/demonstracao/es-ES/sala-tablet-834.png    :: anterior a fonte do produto
      … 24 ao todo, nos três idiomas

**As três da sala são as que importam** — são capturas da tela reescrita. As
outras cinco estão vermelhas por arrasto: o produto mexeu, a guarda compara
contra o produto inteiro.

## O que isto tem de novo, e é o que me interessa

**O defeito foi criado por consertar o produto.** Não houve descuido: a tela
melhorou, e ao melhorar **envelheceu as imagens que a vendem**. É a terceira
forma desta doença hoje e a mais difícil de antecipar — as outras duas eram
esquecimento; esta é **consequência de fazer bem.**

**Não vai a lado nenhum antes de a Nathalia ver.** Ela está a ser convidada a
julgar uma landing cujo herói mostra o produto anterior à noite de trabalho que
lhe estamos a apresentar.
