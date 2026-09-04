# Régua do E17 — Pedido por QR e atendimento do cliente

> Escrita antes de existir código. **16 telas.**
> Contratos: `qr-da-mesa-e-o-visitante.md` (escrito para esta etapa) e
> `autenticacao-e-convites.md` (escopo do convidado).

## Primeiro, a conciliação que te poupo

O meu contrato diz que **revogar fecha as sessões vivas**. O pacote diz que **um
QR expirado não apaga o carrinho**. Não se contradizem, e a leitura que vale é
esta:

**A sessão cai; o carrinho não.** É a mesma decisão do E15 com os rascunhos —
morre o direito de enviar, sobrevive o trabalho. Um cliente que perdeu a sessão a
meio de escolher não recomeça do zero: reautentica-se (ou a equipa reabre) e o
carrinho está lá.

**E o par que a torna verificável:** com a sessão caída, o carrinho **existe e
não envia**. Se enviar, a revogação não vale nada; se desaparecer, castigámos o
cliente por uma decisão do restaurante.

## O que o pacote decide e eu não decidi

*«Foto de QR não comprova presença física»* — a sessão abre pela equipa, com
código de serviço/aceite local. **Isto é o que tira valor à fotografia**, e é
mais forte do que a regra que eu tinha escrito.

Exijo vê-lo falhar: **o QR sozinho, sem o passo da equipa, não abre sessão.** Uma
prova que só teste o caminho feliz — equipa abre, cliente entra — não distingue
este desenho de um em que o QR basta.

## Aceites

1. **J03 de ponta a ponta com o MESMO `Order`** — QR, envio, cozinha/bar, pronto,
   servido. O mesmo pedido, não um paralelo: se o cliente e a sala criarem
   objectos diferentes, a cozinha vê dois jantares.
2. **Respostas úteis e seguras** a QR revogado, sessão encerrada, limite de abuso
   e preço actualizado. **Útil** é a parte que se esquece: um 403 seco cumpre a
   letra e deixa o cliente sem saber o que fazer.
3. **Atendimento tradicional em paralelo** — a sala continua a poder servir a
   mesma mesa enquanto o cliente pede pelo telemóvel.

## O que reprovo à cabeça

- **Verde sobre carrinho vazio.** Declara quantas linhas tinha antes de afirmar.
- **Chamar a equipa sem limite nem deduplicação.** O ponto 4 do enunciado pede-o:
  quero ver **duas chamadas seguidas darem uma**, e o par — uma chamada
  legítima **depois** da janela passa. Sem o par, «ignora tudo» passa o teste.
- **O visitante a ver o que não é dele.** Já está no contrato de autenticação: a
  mesa 5 não vê a 4, nem os outros ocupantes da 5. Verificado no que a **consulta**
  devolve, não no que o ecrã pinta.
- **Reenviar para outra mesa sem confirmação explícita** (regra do pacote).
- **16 telas sem navegador**, cinco larguras, ES/PT/EN, e a **população lida da
  matriz** — conjunto a conjunto, como fizeste no E15 e no E16.
- **Uma suite que não consegue ficar vermelha.** Dezassete controlos negativos no
  E16 puseram a fasquia; não a baixes aqui.

## E o que eu quero mesmo ver

Que **revogar o QR com um carrinho a meio** deixe o carrinho de pé e o envio
recusado. É o cruzamento das duas regras, é onde um sistema real magoa uma pessoa
real, e é a única coisa desta régua que nenhum dos dois documentos decide sozinho.
