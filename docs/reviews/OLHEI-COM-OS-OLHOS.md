# Fui olhar para a landing, e errei duas vezes em cinco minutos — 08/09, 11h40

O Matheus abriu a landing publicada e disse: **«Meu Deus, tá horrível ainda.»**

Eu tinha medido os treze critérios do norte e passaram todos. Prometi-lhe parar de
medir e ir olhar. Fui — abri a página ao vivo no browser — e o que aprendi foi
sobretudo sobre o meu próprio olho.

## Erro 1: «há um rectângulo vazio no herói»

Primeira captura: um bloco cinzento grande e vazio por baixo da imagem do produto.
Ia reportá-lo como o defeito principal, e teria mandado o JR caçar um bug.

Ampliei: **é a captura do KDS, que ainda não tinha carregado.** O defeito era o
instante da minha fotografia, não a página. Medi um momento e tratei-o como a coisa.

## Erro 2: «as duas capturas estão cortadas à direita»

Segunda leitura: os dois cartões sobrepostos pareciam clipados na borda do painel, o
que lê como acidente de layout. Ia entregar isso como defeito de composição.

Ampliei a borda direita: **têm cantos arredondados e acabam limpos, com margem.**
Não há corte nenhum. Era a resolução reduzida a transformar uma curva num corte.

## O que isto diz, e é o mais útil que trago

**Uma captura reduzida é o instrumento errado para juízo visual fino.** Produziu-me
duas leituras confiantes e falsas em cinco minutos — e ambas eram do tipo que faz
gastar horas: uma mandava caçar um bug inexistente, a outra mandava recompor uma
coisa que já estava composta.

É a mesma doença do dia inteiro, agora dentro do meu olho: **o instrumento estava
correcto e apontado ao sujeito errado.** Um `screenshot` serve para ver se a página
existe e onde ficam as coisas. Não serve para decidir se está bonita, nem para
afirmar que uma borda está cortada.

## O que fica de pé, e é pouco

Só as observações que não dependem de ler píxeis:

- **A linha em verde-lima por baixo dos botões** é a única coisa dessa família de cor
  na página inteira e briga com o coral. Isso vê-se a qualquer resolução — e já
  estava na lista dele como decisão por tomar.
- **A captura do KDS é ilegível ao tamanho a que está.** O texto fica com 3 ou 4
  píxeis efectivos. Uma imagem de herói cujo conteúdo não se lê é decoração a
  fingir-se de prova.
- **Os passos numerados** (círculos, 1-2-3-4, filetes) são a forma genérica que se
  reconhece como feita por ferramenta.

**Não avanço para além disto**, e não é modéstia: acabei de demonstrar que o meu
juízo visual através deste canal falha. O que resolve é a fotografia do ecrã DELE,
como da última vez — as quatro fotografias dele apanharam o que nenhuma medição
minha tinha visto.

---

## O que dá para medir sem o meu olho — 08/09, 11h50

Das três coisas que ficaram de pé, uma delas não precisa de juízo visual nenhum: a
legibilidade das capturas do herói é **aritmética**.

| composição | intrínseco | `sizes` promete | escala | texto de 14 px fica |
|---|---|---|---|---|
| Mesas | 1440 | 420 px | 0,29 | **4,1 px** |
| KDS | 1280 | 420 px | 0,33 | **4,6 px** |
| sala estreita (telemóvel) | 390 | 390 px | 1,00 | 14 px |

**A cura já existe neste projecto.** A `sala-estreita-390.png` é capturada à largura
em que é mostrada, um para um — e nasceu precisamente deste defeito, quando se
mediu que «no telemóvel, texto que no produto tem 14 px chega a 3,3 px».

Foi aplicada ao telemóvel e **não ao herói de secretária**, que continua a encolher
capturas a um terço. É o padrão que atravessou o dia inteiro: **curou-se o caso e não
a classe.**

## E uma ressalva honesta, que é do outro lado

**Isto não é automaticamente um defeito.** Uma captura de produto mostrada pequena
pode ser uma escolha legítima: transmite «existe um sistema a sério» como textura,
sem se propor a ser lida. A pergunta que decide não é «lê-se?», é **«o que é que
esta imagem está aqui a fazer?»**:

- se está a dar **atmosfera**, 4 px de texto não é problema — é grão;
- se está a dar **prova** de que o produto existe e funciona, então não prova nada,
  porque não se lê.

Duas saídas, e a escolha entre elas é de desenho, não minha:

1. **capturar à largura do slot** (como se fez para o telemóvel) — o ecrã inteiro,
   legível, mas com menos detalhe visível;
2. **recortar em vez de encolher** — mostrar um pedaço do KDS a 1:1, com três
   comandas legíveis, em vez do ecrã todo ilegível.

**Não vou escolher nem construir nenhuma delas por minha conta.** Disse-lhe há uma
hora que não ia mexer no desenho pelo meu gosto e dizer-lhe que estava resolvido, e
acabei de demonstrar, duas vezes em cinco minutos, que o meu olho por este canal não
é de fiar. Levo-lhe os números e as duas saídas; a escolha é dele.
