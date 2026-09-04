# Régua do E12 — cores públicas e mudanças de plano

> Escrita a 04/09 com o marco E11 ainda reprovado e **sem uma linha de E12**. É o
> padrão com melhor histórico do projecto: as etapas que passaram à primeira foram
> as que tinham régua antes do código.

Sete telas — `THEME 002-008` — e duas coisas que não se parecem uma com a outra:
**cor** e **direito**. A cor é do restaurante; o direito é do plano que ele paga.

## Aceite 1 — «estados reais e o tema efectivamente aplicado»

A palavra que carrega o aceite é **efectivamente**. Uma tela que mostra a cor
guardada no formulário não mostra o tema aplicado — mostra o que se escreveu.

**O meu ataque:** guardar uma cor, ir à **rota pública** e ler a cor que o
navegador **calcula** (`getComputedStyle`), não a que o CSS declara. Foi assim que
o E09 escondeu de mim uma carta servida sem folha de estilos: as classes existiam,
o ficheiro é que não chegava à página. Um tema "aplicado" que não chega ao browser
é o mesmo defeito com outro nome.

E o par de sempre: **antes e depois**. Uma tela que mostra o tema certo mas mostra
o mesmo tema para qualquer valor não está a ler nada.

## Aceite 2 — a cor ilegível e o tema da unidade alheia

São duas regras diferentes e a tentação é prová-las juntas.

**Cor ilegível falha NO SERVIDOR.** No cliente é conveniência; no servidor é a
regra. Vou tentar publicar um contraste abaixo do limiar por onde o produto grava
— e se houver validação só no formulário, o aceite está reprovado por definição.
O limiar tem de ser o mesmo que a inspecção já mede (4,5:1 para texto corrente,
3:1 para indicadores de estado), senão temos duas verdades sobre contraste.

**Tema noutra unidade sem autorização falha.** Este prova-se com **dois** — dois
inquilinos, ou duas unidades com permissões diferentes. Um utilizador a mudar o
tema da unidade dele não prova nada sobre a de outro. E quero a recusa **no
ecrã**, como o E11 exigiu para o isolamento: a base recusar não é o produto
recusar.

## Aceite 3 — o downgrade, que é o mais perigoso dos três

*«Reverte a aparência na data de teste, preserva conteúdo e permite restaurar a
versão anterior após upgrade.»* São **três** promessas e falham por caminhos
diferentes:

1. **Reverte na data** — não à meia-noite do servidor. É o caso do E06 outra vez:
   dezanove asserções verdes sobre um motor que ignorava o fuso da unidade.
2. **Preserva conteúdo** — a aparência recua, o conteúdo **não se perde**. Este é o
   que custa dinheiro a um cliente: quem desce de plano e perde o que escreveu não
   volta a subir.
3. **Restaura depois do upgrade** — e aqui está o par que separa a regra certa da
   preguiçosa: uma implementação que **apagasse** o tema no downgrade passaria as
   duas primeiras e falharia esta. Sem o terceiro caso, «reverter» e «apagar» são
   indistinguíveis.

## A minha sonda estava errada, e o executor corrigiu-a antes de eu a usar

Escrevi `inspeccao/sonda-tema.ts` a ler sempre `:root`. **A implementação aplica o
tema em `.bo-publico`**, e por uma razão que eu não tinha visto: isso **contém** o
tema na superfície pública, para as cores de um restaurante não escorrerem para os
ecrãs de operação — que não partilham rota nenhuma, mas partilham o CSS todo.

**A minha sonda teria produzido uma retenção falsa.** Lia a raiz, não veria
mudança, e eu concluiria que o tema não chega ao cliente — exactamente o defeito
que ela existe para apanhar, ao contrário.

Ele acrescentou o selector com valor por omissão `:root`, para o que já estava
escrito não mudar de significado. E a leitura nos dois sítios passa a provar duas
coisas em vez de uma:

- em `.bo-publico`, os cinco tokens públicos **mudam** com o tema publicado;
- em `:root`, **continuam nos valores de origem** — ou seja, o tema está contido
  onde devia estar.

**É melhor do que o que eu pedi**, e é a segunda vez nesta etapa que o instrumento
dele responde a uma pergunta que a minha régua não sabia fazer. Fica registado
aqui porque a régua é minha e estava incompleta.

## O que reprova à cabeça

- **Cor lida do formulário e não da página servida.**
- **Validação de contraste só no cliente.**
- **Downgrade provado com um só inquilino**, ou sem restaurar depois.
- **Tema aplicado sem dizer de que revisão veio** — a publicação tem revisões
  desde o E08; a aparência não pode ser a única coisa sem rasto.
- **Verde sobre tema por omissão:** se a unidade de teste nunca teve tema próprio,
  todas as asserções passam contra o tema base e não medem nada. A prova declara
  qual é o tema em vigor antes de afirmar seja o que for.

## A fonte apareceu, e confirma o que eu tinha deduzido

Escrevi esta régua a deduzir do plano que o Starter tem cores fixas. A 04/09 o
Matheus disse que havia um PDF de precificação, e havia — fora do repositório. Está
agora em `docs/bossaos/PRECIFICACAO.md`, e **documenta a regra que eu tinha
inferido**, mais duas que eu não sabia:

| Regra | Onde estava |
| --- | --- |
| Cores públicas: **Starter fixas**, Restaurant e Pro personalizáveis | deduzida por mim, agora documentada |
| Mudança de plano **preserva dados** e mostra **data, valor e impacto ANTES** de mudar | só no PDF |
| A personalização preserva tipografia, componentes, legibilidade e cores dos estados | só no PDF |

A terceira aperta o aceite 1 e vale a pena dizê-la em voz alta: **personalizar não é
poder pintar tudo.** O restaurante muda a cor da experiência pública; a tipografia,
os componentes e as cores de estado — sucesso, aviso, perigo — **não são dele**. Uma
implementação que deixe o cliente repintar um estado de erro passa o aceite 1 e
quebra a leitura de um ecrã de operação.

Portanto o E12 mostra **três** coisas: que o Restaurant/Pro muda a cor, que o
Starter **não consegue** — e a segunda não é um ecrã escondido, é o servidor a
recusar — e que **o que não é personalizável continua a não ser**, mesmo para quem
paga o plano de cima.

## E o downgrade agora tem uma exigência escrita, não inferida

*«Preservar dados e mostrar data, valor e impacto antes da mudança.»* São **quatro**
coisas a verificar antes de o botão fazer efeito, e a que se esquece é o **impacto**:
dizer que a aparência volta ao fixo, e o que deixa de estar disponível. Um ecrã que
mostra data e valor e cala o impacto cumpre metade da regra e engana a pessoa
exactamente no momento em que ela decide.
