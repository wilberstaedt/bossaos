# O QR da mesa é um token ao portador, colado num sítio público

> Contrato para o E17. Escrito antes da etapa.
> **Já existe regra?** Sim, meia: o `CRITERIOS_DE_ACEITE.md` decide a **revogação**
> (T09: *«revogado/sessão anterior não cria pedido»*) e o
> `autenticacao-e-convites.md` decide o **escopo** (o convidado da mesa 5 não vê a
> mesa 4 nem os outros ocupantes da 5). O que falta é o que este documento
> decide: **rotação não é revogação**, e o que cada uma faz a quem já está a comer.

## Porque isto precisa de decisão

Um QR numa mesa é um segredo que qualquer pessoa fotografa. Sem mais nada, quem
o levar para casa faz pedidos para a mesa 5 à distância, e o token vive para
sempre porque ninguém troca o autocolante.

A resposta óbvia — «então roda-se o QR» — cria o problema oposto se rodar
significar revogar: **os clientes que estão a meio da refeição perdem o carrinho
e a sessão**, e ficam sem perceber porquê. O restaurante aprende isso uma vez e
nunca mais roda. O token volta a ser eterno, agora com a ilusão de que não é.

## A regra: são dois actos diferentes

**Rodar** troca o segredo que abre sessões novas. **Não** fecha as que já estão
abertas — quem já está sentado continua a comer. É o acto de rotina, e por ser
de rotina tem de ser barato: um restaurante que hesita em rodar acaba com um QR
de 2026 colado em 2028.

**Revogar** fecha as sessões vivas daquela mesa, e é o acto de excepção — a
fotografia que apareceu num grupo, o cliente que se queixa de pedidos que não
fez. Como no E13, **diz-se ao revogar**: quantas sessões vivas vão cair, um
número e nunca o conteúdo.

**É este par que separa a regra certa da preguiçosa.** Colapsar as duas num
«invalidar» dá um sistema que ou nunca roda, ou expulsa gente da mesa a meio do
prato.

## E o que a sessão do visitante é, para além do QR

O QR **abre** a sessão; não **é** a sessão. Quem entra recebe uma credencial
própria, presa à sessão de mesa aberta pela equipa — logo:

- **Mesa fechada, QR válido: não abre sessão nenhuma.** Fora de serviço, o
  autocolante não vale nada, e é isso que tira valor à fotografia.
- Uma sessão de visitante **não sobrevive ao fecho da mesa**. A conta fecha, a
  credencial morre com ela.
- Um pedido de visitante é sempre de **origem `CARTA`** — o E15 já provou que a
  origem tem de ser visível e distinguível a quem serve, com palavras e não só
  com um atributo.

## A pasta pública pode ESCREVER, e é uma decisão que se toma aqui

Até ao E17 a regra da superfície pública era «nada além de ler», e a prova do E09
verificava-a a varrer `apps/web/app/r` à procura de qualquer verbo de escrita
exportado. Era a regra certa enquanto ali só vivia a carta.

**Deixou de ser verdade, e a mudança foi minha.** A bolacha do visitante tem
`path=/r/<slug>`; com a porta em `/api/publico/mesa`, fora desse caminho, o
navegador **nunca a enviava** — e todos os POST do visitante caíam em silêncio no
`?sessao=terminou`. A porta mudou para dentro do endereço do restaurante.

A alternativa barata era alargar a bolacha para `path=/`. Não o fiz, e é por isso
que esta decisão fica escrita: **manter o âmbito do inquilino no endereço é
melhor do que uma porta `/api/publico` global.** Uma credencial de mesa que viaja
para a raiz vai com cada pedido feito a qualquer outro restaurante servido pelo
mesmo domínio. O âmbito no caminho não é uma conveniência de arrumação — é a
única coisa que impede a credencial da mesa 5 de chegar à casa do lado.

Portanto a regra da pasta pública **muda de forma**, e não de força:

> Não é «nada além de ler». É **nada sem sessão de visitante**.

O que fica proibido continua a ser o mesmo: um verbo de escrita alcançável por
quem só tem o endereço. O que passa a ser permitido é um verbo de escrita que
**exige a credencial da visita antes de tocar em qualquer coisa** — a porta lê a
bolacha, resolve o inquilino a partir dela, e recusa sem ela.

E a prova tem de afirmar a regra nova com o par, senão mede outra coisa:

- uma escrita **sem bolacha** é recusada;
- e a mesma escrita **com bolacha** passa — sem esta metade, «recusa tudo»
  satisfazia o teste e a porta podia estar partida.

Trocar a asserção sem escrever esta decisão seria calibrar a guarda ao que já
existe, que é a forma mais silenciosa de uma guarda deixar de guardar.

## E a reserva pública, que não tem credencial nenhuma

A regra acima resolve a escrita de **quem está sentado**. A reserva pública é
outra coisa: quem reserva está em casa, três dias antes, e não tem — nem pode
ter — sessão de visitante. «Nada sem sessão de visitante» tornaria a reserva
pública impossível.

**A porta da reserva pública fica FORA de `/r/`**, em `/api/publico/reservar`. E
fica lá exactamente pela razão que pôs a outra cá dentro, lida ao contrário: o
que justifica o âmbito no endereço é **haver uma credencial que não pode viajar**.
Um formulário anónimo não tem credencial nenhuma para proteger, e por isso não
ganha nada em estar preso ao endereço do restaurante — ganha só uma excepção na
regra da pasta, que passaria a ter duas leituras.

A unidade vem no corpo do pedido e é resolvida pela porta estreita, como em toda
a superfície pública.

**O que esta porta precisa, e a outra não:** é uma escrita anónima na internet
aberta. O que a protege não é uma credencial, é:

- **um limite por unidade e por janela**, porque sem ele um guião enche a agenda
  de um sábado em segundos e o restaurante descobre à porta;
- **a chave idempotente** que o motor do E18 já exige, para que um duplo toque no
  botão não faça duas reservas;
- e **nenhuma leitura que confirme existência**: pedir uma hora ocupada e pedir
  uma hora numa unidade que não existe respondem a mesma coisa, senão a porta
  vira um catálogo de restaurantes e de horas cheias.

## O que NÃO decido, porque não é meu

**Com que frequência se roda é do restaurante**, e o sistema não traz um valor
por omissão que finja ser política. O que o sistema deve é **dizer há quanto
tempo o QR daquela mesa não é rodado** — informar não é decidir.

## Controlo negativo

1. **Rodar com uma sessão de visitante viva:** ela continua a pedir. Se cair, a
   rotação está a revogar, e o par colapsou.
2. **Revogar com uma sessão viva:** ela deixa de pedir **ao pedido seguinte**, e
   o ecrã de revogar disse o número antes de confirmar.
3. **QR válido com a mesa fechada:** não abre sessão. É o caso que tira valor à
   fotografia, e uma prova que só teste com a mesa aberta não o mede.
4. **QR antigo depois de rodar:** não abre sessão nova — mas o ponto 1 continua
   verdadeiro. As duas coisas ao mesmo tempo são a prova de que são dois actos.
5. **Escrita na pasta pública sem bolacha de visitante:** recusada, e a mesma
   escrita com bolacha passa. Sem a segunda metade, uma porta partida — que
   recusa toda a gente — passava o teste.
6. **Reserva pública acima do limite da janela:** recusada, **e a primeira
   passa**. Sem a segunda metade, uma porta que recusa toda a gente satisfaz o
   teste e ninguém consegue reservar.
