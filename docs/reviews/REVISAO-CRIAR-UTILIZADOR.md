# Revisão: a porta que não é a rota de registo — 08/09, 06h50

Revejo `packages/auth/src/criar-utilizador.ts`, `provas/criar-utilizador.test.ts` e
a chamada em `packages/db/prisma/demonstracao-comum.ts`, todos ainda por commitar.
**Escreveu-os o JR; por isso é que sou eu a assinar isto.**

## O que está bem, e não é pouco

O teste prende **as três coisas juntas** — cria, ENTRA com a senha criada, e o
`issuer` sai certo — e a razão está escrita: criar linhas não é ter conta, e a
primeira versão criava um utilizador que não entrava. Um teste que contasse linhas
teria dado verde sobre isso.

O controlo negativo é a sério: simula o regresso vazio e **exige que a asserção do
teste de cima acuse**. Não é um segundo controlo positivo disfarçado.

`index.ts` **não** re-exporta a função. Fui verificar à espera do contrário. A porta
não fica a um `import` de distância do pacote.

A chamada na semeadura é idempotente e **recusa-se a correr sem o segredo do
produto**, com o motivo escrito: com outro segredo a conta nasce e não entra.

## FALHA — a mitigação inteira não corre

O comentário justifica assim o uso de API privada do `better-auth`:

> Uma actualização que parta isto parte o teste em voz alta em vez de partir o
> produto em silêncio.

Corri a guarda da casa, `validar-suites-com-guiao.sh`, que itera `provas/*.test.ts`:

```
FALHA provas/criar-utilizador.test.ts nao e nomeado por guiao nenhum E nao esta
      declarado. Um ficheiro de prova assim nao da verde nem vermelho: desaparece.
```

Nenhum `provar-*.sh` o nomeia, e a descoberta da CI é `for g in scripts/provar-*.sh`
— descobre **guiões**, e um ficheiro de prova sem guião nenhum não é alcançado por
ela. **Hoje, uma actualização do `better-auth` parte o produto em silêncio**, que é
exactamente o que o comentário promete impedir. A promessa não é falsa por desleixo:
falta-lhe uma linha de ligação.

Conserto: um `scripts/provar-criar-utilizador.sh` que corra o ficheiro, ou uma
entrada declarada em `scripts/provas-fora-da-ci.txt` com o motivo. **É dele, não meu**
— e a guarda passa a verde pela mão de quem escreveu o código.

## Reparo menor — um valor por omissão que concede confiança

`emailVerificado = true` é o valor por omissão de `criarUtilizador`. Os dois
chamadores de hoje querem-no verdadeiro e nenhum o escreve, portanto a omissão está
a fazer trabalho real. Verificação de email é propriedade de segurança, e **um valor
por omissão deve falhar fechado**: `false`, e quem tem a prova do endereço que a
declare. Hoje, um chamador futuro que se esqueça do parâmetro ganha um email
verificado sem prova nenhuma, em silêncio.

## O que eu ia construir e não construí

Ia escrever uma guarda nova que medisse ficheiros de prova em vez de guiões, porque
a `ci.yml` nomeia o sujeito certo em prosa — «a pergunta certa não é sobre guiões: é
sobre **ficheiros**» — e a seguir descobre guiões. **Já existia**, e é a que acusou
isto. Ia duplicar um instrumento correcto por ter lido a prosa de um e não ter
procurado o outro.

E ainda apanhei uma segunda vez, na mesma hora: contei a população com
`git ls-files 'provas/*.test.ts'` e deu **41 ficheiros, zero órfãos** — verde. O
ficheiro em causa está **por rastrear**, e o `git ls-files` não o vê. **Medi uma
população construída de modo a excluir o sujeito da pergunta.** A guarda da casa usa
glob de shell e por isso viu-o. A diferença entre o meu verde e o vermelho dela é
uma escolha de listagem que eu fiz sem reparar que era uma escolha.

---

## Fecho da revisão — 08/09, 07h50

**Achado 1 (o teste não corria): CURADO, com prova.**

`scripts/provar-criar-utilizador.sh` existe e **corre mesmo o ficheiro** — não é um
guião vazio a satisfazer o nome:

```
node --test --test-reporter=tap --experimental-strip-types \
  provas/criar-utilizador.test.ts
```

E a guarda da casa mudou de resposta, que é a prova que interessa:

| | antes (07h00) | agora |
|---|---|---|
| `validar-suites-com-guiao.sh` | `FALHA provas/criar-utilizador.test.ts` | sem acusação |
| provas de nó nomeadas por guião | 39 | **40** |

A diferença é de **uma**, e é a certa. Não aceito isto por o vermelho ter
desaparecido — um vermelho desaparece também quando se apaga o ficheiro. Aceito-o
porque o contador do lado verde **subiu exactamente um**, e porque os dois controlos
do próprio detector continuam a passar.

**Achado 2 (`emailVerificado = true` por omissão): ABERTO.**

Continua igual, e não há nota nenhuma a dizer porquê — procurei em `docs/`. Isso é o
que me faz devolvê-lo em vez de o deixar cair: não é a decisão que me incomoda, é a
ausência dela. A casa tem regra escrita para isto, na `validar-provas-na-ci.sh`:

> Esta guarda não obriga nada a correr na CI. **Obriga a DECIDIR:** ou o ficheiro
> aparece no `ci.yml`, ou aparece aqui em baixo com o motivo escrito. O que ela
> torna impossível é a terceira hipótese, que é a que aconteceu: **ninguém decidiu.**

Aplico-lhe a mesma régua. Ou o valor por omissão passa a `false` e quem tem a prova
do endereço declara-a, ou fica `true` **com o motivo escrito ao lado**. As duas
respostas fecham isto; o silêncio não.

Não é teórico: esta função existe precisamente para ser chamada por um caminho de
entrada que o Matheus ainda não escolheu. **O chamador que se vai esquecer do
parâmetro é o que ainda não foi escrito.**
