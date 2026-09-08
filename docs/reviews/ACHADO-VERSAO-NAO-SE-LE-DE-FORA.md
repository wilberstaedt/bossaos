# Não há forma de ler, de fora, que versão está no ar — 08/09, 08h50

## O que fui fazer

Re-medir os factos de produção que estão na lista do Matheus, porque é sobre eles
que ele vai agir quando acordar. Leituras apenas — nada que crie conta.

| | |
|---|---|
| `insp-marina-oropesa` /menu | **HTTP 200** — continua público |
| `insp-marina-barcelona` /menu | **HTTP 200** — continua público |
| `bossa-demo` /menu | HTTP 200 |
| landing `/es-ES` | HTTP 200 |
| `origin/main` | `458814c`, de **05/09** — não mexeu (reflog sem push novo) |
| commits locais por enviar | **592** (eram 574 às 05h58) |
| `disableSignUp` em `origin/main` | **zero** |

## Uma confusão minha, que desfiz

Andei a tratar «publicado no GitHub» e «no ar em produção» como a mesma coisa. Não
são. O `publicar.sh` publica de um **ref local** (`HEAD` por omissão): produção corre
um build que nunca passou pelo GitHub. Por isso `origin/main` estar em 05/09 não diz
nada sobre o que está no ar — e `4cba084`, que eu andava a chamar «o publicado», é
um commit local de 07/09 17h01, quinze minutos antes do deploy das 17h16.

A conclusão do item 00 **aguenta-se na mesma**, e por outro caminho: a cura da porta
entrou em `fe64a4b`, às **22h37** de 07/09, cinco horas depois do deploy. O que está
no ar é anterior à cura, venha de onde vier. Mas a razão que eu dava estava trocada,
e uma razão trocada num registo manda a próxima pessoa verificar a coisa errada.

## O achado

O `publicar.sh` escreve uma marca de versão — `apps/web/public/versao.txt` — antes do
build, e o seu propósito é dizer o que está no ar. **Ela não se lê:**

```
/versao.txt        → redirecciona para /es-ES/versao.txt
/es-ES/versao.txt  → HTTP 404
```

Não é expectativa: a marca entrou no `publicar.sh` a **06/09 00:56** e o deploy no ar
é de **07/09 17:16**, posterior. Devia estar servida e não está — o encaminhamento
de idioma apanha o caminho antes de ele ser servido como ficheiro estático.

**Não confirmei o mecanismo.** Não há `middleware.ts` no repositório, portanto a
minha explicação para o redireccionamento é hipótese, não medição. O que está medido
é o resultado: 404.

## Porque é que isto importa

Sem essa marca, **ninguém consegue verificar de fora que versão está em produção**.
Tudo o que se diz sobre o que está no ar — incluindo o item 00 da lista do Matheus —
assenta em inferência a partir de horas de deploy e datas de commit, não em medição.

E importa mais no momento seguinte, não neste: quando o Matheus mandar publicar, a
pergunta imediata é «entrou?». Hoje a resposta a essa pergunta é um raciocínio, e um
raciocínio não distingue um deploy que correu de um deploy que falhou a meio.

**Uma marca de versão que a própria aplicação esconde é a mesma doença desta noite
inteira:** o instrumento existe, está correcto, e não está apontado ao sujeito.

---

## A correcção chegou à lista dele — 08/09, 09h00

Corrigi no artefacto que o Matheus vai abrir, e corrigi a **frase de topo**, não só
o rodapé. Ela dizia «o código publicado tem zero ocorrências de `disableSignUp`», e
«publicado» é exactamente a palavra ambígua que me enganou: serve para o GitHub e
para o que está no ar, e neste projecto essas duas coisas divergiram há 593 commits.

Passou a dizer «o que está no ar», com a nota a apontar para a explicação.

**Podia ter deixado só a nota lá em baixo e não deixei.** Uma correcção que vive
quatro blocos abaixo da afirmação errada chega tarde: quem lê de cima para baixo já
partiu para verificar a coisa errada antes de chegar à emenda. **A emenda tem de
estar onde o erro está, não onde é confortável escrevê-la.**

Números refrescados na mesma passagem, porque é sobre eles que ele decide: **23**
commits ao produto por publicar (eram 16 às 02h35 e 19 às 06h), e **593** commits
locais por enviar ao GitHub.

---

## RETIRO o achado — 08/09, 10h40. A casa já respondia, e melhor

Fui terminar isto e o que encontrei desmente-me.

**Primeiro, a causa que eu dei estava errada.** Teste diferencial em produção:

```
/og.png       → HTTP 200  (147 KB, image/png)   ← public/ É servido
/versao.txt   → HTTP 307                        ← o ficheiro não está lá
```

`public/` funciona. Não é o encaminhamento a «engolir» um ficheiro que existe: o
ficheiro **não existe** em produção, e por isso o pedido cai no router. A minha
explicação — que eu já tinha marcado como hipótese não confirmada — era falsa.

**Segundo, e é o que importa: o problema já estava resolvido, e melhor do que eu o
teria resolvido.** O `publicar.sh` documenta o mesmo tropeço, nas suas palavras:

> A primeira versão pedia `/versao.txt` e recebeu `/es-ES/versao.txt`: o
> encaminhamento por idioma apanhou o ficheiro estático. **A sonda entrou pela porta
> da frente e mediu o comportamento da casa em vez da versão.**

E trocou o sujeito, que é a cura desta noite inteira: o **Portão 4** já não pergunta
à aplicação que versão ela julga ser — lê a **etiqueta da imagem Docker**:

```
NO_AR = docker inspect --format '{{ .Config.Labels "bossaos.versao" }}' bossaos_web
COINCIDE     → segue
DIFERENTE:x  → erro «no ar está 'x' e eu construí 'y' — o build não pegou»
NAO_SEI      → erro «isto NÃO é versão errada, é não saber»
```

Com o `/api/health` ao lado, são as duas metades: **serve**, e **é este build**.

### O que eu disse ao Matheus, e que está errado

> «quando mandares publicar, a pergunta *entrou?* vai ter como resposta um raciocínio
> meu e não uma medição»

**Falso.** É uma medição, feita pelo próprio portão, e distingue três respostas onde
eu só imaginava duas. Corrigido na lista dele.

Dizer a alguém que a ferramenta dele é mais fraca do que é tem custo real: ou o faz
desconfiar de um deploy que está verificado, ou o põe a construir uma coisa que já
existe. **Um alarme falso sobre uma ferramenta gasta a confiança nela, e a confiança
é o que faz alguém usá-la.**

### O que sobra, e é pequeno

A escrita da marca na linha 247 é **vestigial** — nada a lê. E o comentário ao lado
ainda diz «se o build não pegar, o contentor antigo continua a servir a marca antiga
— que é precisamente a diferença que o portão 4 mede». **O portão 4 já não mede
isso.** Quem ler aquela linha conclui que a marca é portante e não é.

Não a apago: já me enganei hoje a chamar obsoleta a uma peça que outra coisa usava
(o canário), e a lição é a mesma — confirmar quem a lê antes de a tirar. Fica para o
JR, com a pergunta certa: **ou a marca serve alguém e o comentário mente, ou não
serve ninguém e sai com o comentário.**

---

## A marca saiu — 08/09

**Fiz a pergunta antes da cura**, que é a que o canário ensinou esta manhã:
**quem lê `apps/web/public/versao.txt`?**

| onde procurei | leitores |
|---|---|
| todo o repositório (`grep -rn`) | **0** — as outras menções são prosa a explicar que foi abandonada |
| `infra/` (compose, Dockerfile, papéis) | **0**. O que lá está é `LABEL bossaos.versao=${VERSAO}` |
| `.github/` | **0** |
| `docs/runbooks/publicar.md` | manda a pessoa fazer `docker inspect` à **etiqueta** |
| o próprio `publicar.sh` | o portão 4 lê a **etiqueta**, na linha 304 |

**Escrevia-se para ninguém.** Saiu a escrita, e saíram **os dois comentários** —
não só o da linha 247. O primeiro dizia, à cabeça da secção, «é isto que torna o
portão 4 possível sem tocar em código de produto», e deixar esse de pé enquanto
se tirava a linha era o pior dos dois mundos: uma secção a prometer um mecanismo
que já não existe.

**Um comentário que descreve um mecanismo substituído manda a próxima pessoa
confiar numa peça que não carrega peso.** É a mesma razão pela qual o canário
saiu de manhã, e é por isso que o que ficou no lugar diz o que o portão 4 mede
**hoje** — a etiqueta, por `docker inspect`, posta no `infra/web.Dockerfile`.

Depois de sair: `bash -n` limpo, `provar-implantacao.sh` a **0 falhas**, e o
portão em 0 entre as que mediram.

**Fica dito o que isto NÃO resolve:** continua sem haver forma de ler de fora,
por HTTP, que versão está no ar — a etiqueta só se lê com acesso ao Docker do
servidor. Tirar a marca não fechou esse buraco; tirou uma peça que dizia
fechá-lo e não fechava.

---

## A resposta passou a existir de fora — 08/09

    ok  com VERSAO definida: HTTP 200 e versao_do_build=a1b2c3d
    ok  sem VERSAO: HTTP 200 e versao_do_build=desconhecida (nao desapareceu)
    ok  o health continua a trazer o que ja trazia (estado e ts)

**Uma correcção à premissa:** o `ENV BOSSAOS_VERSAO` **já existia** no
`infra/web.Dockerfile` — a promoção do `ARG` estava feita. O que faltava era o
**leitor**: ninguém lia aquela variável. Só a rota mudou.

**Não substitui a etiqueta, e o nome do campo di-lo.** `versao_do_build` é o que
o build DIZ que é; o portão 4 continua a ler `bossaos.versao` por `docker
inspect`, que é o que compara o construído com o que está no ar. Um responde de
fora; o outro mede.

Sem a variável o campo sai `desconhecida` e **nunca desaparece** — ausente lê-se
como «build antigo», presente-a-dizer-desconhecida lê-se como «não sei». Usa-se
`||` e não `??`, porque `docker compose build` com `VERSAO=` passa cadeia vazia e
não ausência. E não passa pelo `loadEnv` de propósito: fazer o ecrã da vivacidade
depender de um carregamento que pode lançar era trocar uma pergunta por um
problema.

**A prova é pela porta.** A primeira versão importava a rota num teste de nó e não
corre — o `next/server` não resolve fora do build. E ainda bem: o terceiro
controlo é «o health continua a responder», e isso só se sabe pedindo. O corredor
acusa, medido: plantei o campo a desaparecer sem a variável e ele disse *«o campo
DESAPARECEU — ausente lê-se como build antigo, não como não sei»*.

### E a guarda de ontem apanhou um defeito meu de hoje

Ao recapturar, a `validar-provas-frescas` recusou: *«capturado com a árvore suja
— não retrata commit nenhum»*. **Estava certa sobre o que eu lhe disse, e eu é
que lhe disse mal.**

O `arvoreLimpa` perguntava por `apps` e `packages` **inteiros**, e a impressão só
cobre `.ts`, `.tsx` e `.css`. As capturas de marketing vivem em
`apps/web/src/demonstracao/`, portanto **capturar suja o `apps/`** — e o carimbo
tirado a seguir dizia `arvoreLimpa: false` para sempre. É o mesmo defeito do
`git log` sem filtro de extensão que se curou de manhã: **o medido tem de
coincidir com o declarado.** Corrigido, e o dossiê voltou a bater.
