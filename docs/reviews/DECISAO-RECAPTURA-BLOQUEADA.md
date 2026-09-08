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

---

## Addendum, 03h35 — a pergunta que eu deixei em aberto tem resposta

Escrevi acima que **não sabia** se a API do servidor respeita o `disableSignUp`,
e que ler o núcleo minificado seria adivinhar. **Não adivinhei: medi.**

Montei a instância de autenticação com as opções reais e chamei
`auth.api.signUpEmail` com **corpo inválido de propósito** — senha de um
carácter — pela mesma razão que o JR usou: **nada é criado em nenhum dos dois
resultados.**

    recusou com: EMAIL_PASSWORD_SIGN_UP_DISABLED
    utilizadores com esse email, depois: 0

**O `disableSignUp` trava as duas portas** — a HTTP e a do servidor. A saída
limpa que eu esperava (a semente criar a conta pela API) **não existe com a
bandeira ligada**.

### E há um caminho que eu não conhecia

O plugin **`admin`** vem no pacote instalado — não é dependência nova — e expõe
**`createUser`**.

Isso é **nativo da biblioteca**: sem reabrir rota HTTP, sem senha escrita à mão,
com a cifra feita por quem sabe. É o candidato a cura limpa para as duas coisas
que faltam: **a conta da demonstração** e, sobretudo, **o convite criar a conta**.

### O que verifiquei e o que NÃO verifiquei

- **Verifiquei:** que o plugin existe no pacote e expõe `createUser`.
- **NÃO verifiquei:** que ele cria com o `disableSignUp` ligado. Exige activá-lo
  primeiro, e activar um plugin de administração é decisão com consequências
  próprias.

**Dizer «existe `createUser`, logo resolve» seria repetir esta noite inteira** —
foi assim que eu declarei o convite intacto tendo medido só a rota. **A
existência de uma porta não é a prova de que ela abre.**

## O que isto muda para o Matheus

A decisão deixa de ser entre três más. **Passa a haver um candidato limpo**, e a
pergunta é mais pequena e mais concreta: **activar o plugin `admin` do
`better-auth` e usar o `createUser` no convite** — o que faz o produto cumprir o
«só por convite» que já diz de si.

---

## Revisão do `2a3280f` — 08/09 03h40

**Assino a medição.** O controlo de dois lados é o que a torna válida: produto
com a bandeira ligada **recusa** e cria 0 linhas; a mesma configuração com **um
campo trocado** cria 1. Sem esse controlo, *«a recusa não distinguia respeitar a
bandeira de eu invocar mal»* — a frase é dele e é a razão de a medição valer.

E há um detalhe que me diz respeito: **a primeira corrida dele deu `criou=SIM,
NÃO ENTROU`** — exactamente o modo de falha que eu tinha escrito na decisão
(«errar a forma dá um utilizador que existe e não entra»). **A previsão escrita
foi o que o impediu de concluir «não funciona»**: foi comparar as duas linhas e
achou o `issuer` trocado.

**Uma decisão que nomeia o modo de falha esperado poupa a quem vem a seguir a
conclusão errada.**

### O custo que ele declarou, verificado por mim

| | |
|---|---|
| `internalAdapter` no `index.d.mts` | **0 ocorrências** |

**É mesmo interno.** Sem promessa de estabilidade, e a partir dele o produto fica
a depender de uma interface que pode mudar sem aviso — **em silêncio**, que é o
pior modo.

### E isso muda a recomendação

O caminho que **ele** mediu funciona e assenta em **API privada**. O que **eu**
propus — o plugin `admin` — é **público e documentado**, e ainda **não foi
medido**.

Procurei se o `admin.createUser` consulta a bandeira e **não encontrei consulta
nenhuma** — mas «o `grep` não encontrou» **não é prova**, e enganei-me assim
mais do que uma vez esta noite.

**Antes de escolher, mede-se o `admin` com o mesmo método dele** — corpo
inválido, controlo de dois lados, contagem antes e depois. Se ele criar com a
bandeira ligada, ganha-se **o mesmo resultado com promessa de estabilidade**, e a
escolha deixa de ter custo.

**Se não criar, então a escolha é entre API privada e nada** — e aí é decisão do
Matheus, com o custo à vista.
