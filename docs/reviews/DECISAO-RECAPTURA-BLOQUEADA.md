# Decisão: nenhuma das três saídas — 08/09 03h25

> O JR nomeou três saídas para desbloquear a recaptura e **não escolheu nenhuma
> a meio do trabalho**, dizendo que eram da revisão. Foi a decisão certa. Aqui
> está a minha.

## O que apurei antes de decidir

| | |
|---|---|
| a semente | **apaga** o utilizador **e a credencial** (`demonstracao-comum.ts:158,161`) |
| a semente cria credencial? | **não** |
| o arnês | tenta **entrar** primeiro; só cai no registo **se a conta não existir** |
| quem criava a conta | **só o `sign-up/email`** — que eu mandei fechar |

**A conta da demonstração nascia inteiramente da porta que eu fechei.**

E uma coisa que **não sei e digo que não sei**: se a API do servidor do
`better-auth` respeita o `disableSignUp`. O símbolo só aparece em ficheiros de
plugins no `dist`, e ler o núcleo minificado seria adivinhar.

## A decisão: nenhuma das três

1. **Reabrir o registo** — desfaz uma cura de segurança para arranjar uma
   fotografia.
2. **Escrever a credencial por SQL** — inventa uma senha com a forma que eu
   achar, contra o contrato do `schema.prisma:465`, num sítio onde errar a forma
   dá um utilizador que existe e não entra.
3. **Deixar a conta viva** — o arnês passa a depender de estado deixado por uma
   corrida anterior. E o que ele deixaria de provar **já é falso**: não se cria
   uma conta do nada, por desenho.

**As três pagam com segurança ou com integridade de teste para consertar um
problema cosmético.** As capturas velhas são feias numa página que ninguém
aprovou ainda; a porta de entrada é o produto.

**A recaptura fica bloqueada e declarada.** A guarda das capturas de marketing
fica vermelha, e **isso está certo**: ela está a dizer a verdade.

## O que vai para o Matheus

**Como é que um cliente novo passa a ter conta?** É de produto e é dele. Duas
formas, e a diferença técnica decide-se antes de escolher:

- **O convite cria a conta** — faz o produto cumprir o que já diz de si («só por
  convite») e resolve o arnês de caminho.
- **A semente cria a conta da demonstração** — resolve só o arnês.

**A pergunta que decide entre uma cura limpa e um remendo:** a API do servidor do
`better-auth` consegue criar a conta **sem abrir rota HTTP e sem senha escrita à
mão**? Se sim, qualquer das duas é limpa. **Se não, as duas passam por escrever
credenciais à mão, e aí a conversa é outra.**

## E o que eu levo

Fechei um buraco sem perguntar **o que é que se apoiava nele**. A régua que
escrevi até tinha o item certo — «o convite não pode partir» — e eu verifiquei-o
contra a rota em vez de contra o caminho.

**Uma porta que ninguém abriu de propósito pode estar a segurar o telhado.**
