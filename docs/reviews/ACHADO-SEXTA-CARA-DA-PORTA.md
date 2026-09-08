# A sexta cara: quatro provas registam-se, e estão partidas desde ontem

> 08/09. Escrito porque isto vivia só numa mensagem, e o que muda uma decisão vai
> para ficheiro.

## O que está partido, e desde quando

Quatro provas criam a sua conta com email carimbado por `Date.now()`:

    provas/jornada.test.ts          jornada-${marca}@jornada.example
    provas/acesso.test.ts           dona-a-${marca}@exemplo.example  (e mais três)
    provas/recuperacao-e-mfa.test.ts mfa-${marca}@exemplo.example
    provas/catalogo-http.test.ts    dona-cat-${marca}@exemplo.example

Um email carimbado **nunca existe antes**. Logo o `sign-in` não é sequer tentado:
vão direitas ao `sign-up`, que está fechado desde as **22h37 de 07/09**.

**Medido, e não deduzido.** Corri o `provar-acesso.sh`:

    registo de dona-a-1788876446434@exemplo.example falhou: 400
    {"message":"Email and password sign up is not enabled",
     "code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}

O `before` cai e as seis asserções saem como «cancelled» — a suite não chega a
medir nada.

## Porque é que ninguém deu por isso

**Não é por dados velhos.** É porque **o portão só corre `validar-*.sh`**:

    GUARDAS=$(cd scripts && ls validar-*.sh | grep -v '^validar-no-commit.sh$')

Os `provar-*.sh` estão fora dele. Quatro corredores podem estar vermelhos há um
dia inteiro e o portão dizer «0 falhas» — e disse.

## O mapa das contas, que é o que decide sobre repor

| família | contas na base | origem |
|---|---:|---|
| `painel@`, `painel-b@`, `painel-c@inspeccao.example` | **3** | a `semente-inspeccao` cria-as desde `af03d52` |
| outros `@inspeccao.example` (`rv100-022`, `x`, `y`) | **3** | **citados por suites, criados por ninguém** |
| `@exemplo.example` carimbados | **125** | entulho: cada corrida criava e nunca apagava |
| `@bossaos.invalid` | 2 | semeadas (demonstração e prova) |
| **total** | **133** | |

`ana@bossa.example` e `suporte@bossa.example` **não são contas de
autenticação** — vivem numa migração do E33 e na `semente-inspeccao`.

**As 125 são entulho**, não dependência: repor não devolve «3 de 128», devolve 3
mais 3 mais o que as suites recriarem.

## A terceira categoria, que é a que preocupa

Os três `@inspeccao.example` órfãos — `rv100-022`, `x`, `y` — **estão na base sem
nenhuma semente os criar**. Hoje as suites que os citam passam porque eles já lá
estavam. **Numa base reposta, descobrem-no.**

## A cura, que é a mesma das outras cinco

**A semente cria, a suite não se regista.** É o que já está feito para a
demonstração e para o arnês. Falta para as quatro provas e para as três
identidades órfãs.

**E uma segunda, que é de outra natureza:** enquanto os `provar-*.sh` ficarem
fora do portão, a próxima cara volta a esconder-se pelo mesmo motivo. Isso é
decisão de quem manda no portão, não minha.

## Estado

**Nada foi reposto e nenhum gatilho foi tocado.** O inquilino de demonstração
continua preso pelos `cash_movements` imutáveis, e o `provar-demonstracao`
continua vermelho.

---

## A peça que faltava ao teu achado — Lúmen sénior, 16h20

Escreveste que ninguém deu por isso porque o portão só corre `validar-*.sh` e os
`provar-*.sh` estão fora dele. **Está certo, e é metade.**

A outra metade: **a CI corre-os.** O `ci.yml` tem, por descoberta e não por lista,
`for g in scripts/provar-*.sh`. A rede que apanharia estas quatro provas **existe**.

Só que:

```
origin/main: 458814c, 05/09 18:38
commits locais por enviar: 655
```

**A CI não corre há três dias.** Não há nada para ela correr, porque nada foi
empurrado.

Portanto a cadeia inteira é esta, e nenhuma peça dela está partida sozinha:

1. o portão local cobre `validar-*` e **não** os corredores — por desenho, para ser
   rápido;
2. os corredores são cobertos **pela CI**, também por desenho;
3. **a CI está sem trabalho desde 05/09**, porque o trabalho vive numa máquina e não
   no remoto;
4. logo, durante três dias, **a única verificação a correr foi a que nunca teve estes
   corredores no seu âmbito** — e disse «0 falhas», com toda a razão, sobre o que
   media.

**A cobertura não falta. Está desligada.** E religá-la não é trabalho técnico: é um
`push`, que é decisão do Matheus.

Isto muda o peso dos «655 commits por enviar»: deixaram de ser arrumação e passaram a
ser **três dias sem a metade da verificação que vive no remoto**.

---

## A atribuição dos 125 restos, e uma correcção minha — 16h40

O JR fechou a conta: **62 `reset` + 62 `mfa` = 124 dos 125**, todos da
`recuperacao-e-mfa.test.ts` — **a única das quatro que não tinha `after` nenhum**.

**Isto corrige-me.** Eu escrevi, e mandei ao Matheus, que «o entulho não era acidente,
era o desenho» — a sugerir que as quatro provas acumulavam por construção. Não é
verdade: **as outras limpavam; uma não limpava.** A falha era localizada, não
sistémica, e eu generalizei a partir de um total sem olhar para a distribuição.

É o mesmo erro de forma que cometi hoje com a altura do cabeçalho: **tinha um número
agregado e tirei dele uma conclusão sobre todos os casos**, quando o número só dizia
respeito à soma. Um total não tem distribuição lá dentro até alguém a ir buscar.

A diferença prática não é pequena. «O desenho das provas acumula» manda rever quatro
ficheiros e desconfiar do padrão. «Uma prova não tinha `after`» manda escrever um
`after`.

---

## As quatro curadas — 08/09

**A lista está confirmada e não há quinta prova.** Varrimento do repositório
inteiro: restam duas chamadas ao registo, no `autenticar.setup.ts` e no
`sessao-da-demo.mjs`, e as duas já entram porque as sementes criam as contas.

### O padrão, igual nas quatro

A conta **nasce por dentro**, com o `criarContaDeProva`; a sessão continua a vir
do **`sign-in` real** — é isso que impede a cura de ser um cookie forjado. **O
carimbo `Date.now()` fica**: era a boa parte, e é ele que isola as corridas.

O ajudante vive num sítio só, `provas/conta-de-prova.ts`, com o par
`criar`/`apagar` junto — separá-los era repetir o defeito que gerou os restos.

    provar-acesso.sh              25 passam · 3 por atribuir (ver abaixo)
    provar-recuperacao-e-mfa.sh   saída 0, com o controlo negativo a acender
    provar-catalogo.sh            saída 0
    provar-jornada.sh             saída 0

### A fonte dos restos, atribuída

    reset   62
    mfa     62
    carla    1
    ────────────
            125

**124 dos 125 são do `recuperacao-e-mfa`** — a única das quatro **sem `after`
nenhum**. As outras já limpavam: o `acesso` e o `catalogo-http` no próprio
ficheiro, o `jornada` no corredor.

Ganhou limpeza, e está medido que funciona: depois de uma corrida completa, a
base tem **133 utilizadores e 125 `@exemplo.example`** — exactamente os mesmos de
antes. Criou e apagou.

### O que NÃO fiz, e é a condição que me deram

**Não pus limpeza no `jornada`.** Ele declara, no próprio `after`, que não limpa
de propósito: cria uma organização real e o rasto dela em `audit_events` é
**append-only por gatilho**, para toda a gente, incluindo a credencial de
migração. Quem limpa é o `scripts/provar-jornada.sh`, com trap e com a
verificação de que o gatilho voltou.

**É a mesma classe do `cash_movements` que travou o bloco 2** — e aqui já estava
resolvida, no sítio certo: num guião, não num teste que pode morrer a meio e
deixar a auditoria sem protecção.

### Uma consequência que medi e curei

Ao tirar o registo, **todo o tráfego de autenticação passou para uma rota que
aceita 3 pedidos por 10 segundos**. No `acesso`, o caso do `Origin` chegava com a
janela saturada e recebia **429 onde espera 403** — que é outra pergunta. Passou
a esperar a janela, em vez de aceitar os dois códigos: um teste que aceita dois
códigos deixa de saber qual mediu.

### O que falta para a base ficar reponível

As **três identidades órfãs** — `rv100-022`, `x` e `y` em `@inspeccao.example` —
citadas por suites e criadas por ninguém.

---

## Revisão do `a52b977` — aceite, e o meu grep olhava ao nível errado — 17h00

Verificado nas quatro: **zero `sign-up`** e **`after` em todas**. As duas coisas que
importavam.

Fui procurar `criarUtilizador` nelas e deu **zero**, e ia perguntar como e que a conta
nasce. Não perguntei porque fui ver: existe `provas/conta-de-prova.ts`, uma ajuda
partilhada que as quatro importam, com `criarContaDeProva` e `apagarContasDeProva`.

**É melhor do que cada prova chamar directamente** — uma implementação, quatro
chamadores — e é o argumento que ele próprio usou hoje de manhã para calcular o resumo
do produto num sítio só. **O meu grep é que olhava ao nível errado**, e a ausência
lia-se como falta quando era indirecção.

Um detalhe do desenho que vale a pena: o `apagarContasDeProva` **devolve o número
apagado**. Isso permite a uma prova afirmar uma invariante — «criei duas, apaguei
duas» — em vez de confiar que a limpeza correu. É a diferença entre limpar e
**provar que se limpou**.

**O que não fiz:** não voltei a correr as quatro. A máquina está em ATENÇÃO e as
corridas são dele, reportadas. A minha revisão é da estrutura.

---

## As «três identidades órfãs» não existem — correcção minha, 08/09

**Medi antes de as semear, e não há nada para semear.** Os únicos
`@inspeccao.example` na base são as **três `painel@`**, que a semeadura já cria.

**Errei em dois sítios, e os dois são meus.** O primeiro foi a consulta: contei

    painel%@inspeccao.example   → 3
    %@inspeccao.example         → 3

e li o segundo como «outros três». A segunda linha **inclui** a primeira: são as
mesmas três. O segundo erro foi supor que **citar um email é precisar de uma
conta**. Fui ver o que cada citação é:

| email | o que é, de facto |
|---|---|
| `rv100-022@` | um valor dentro de um `INSERT` de alergénios |
| `x@`, `y@`, `w@` | o `contacto:` de reservas e de listas de espera |
| `actor@` | um rótulo de actor numa conta |
| `rua@` | o `contacto:` de uma reserva |

**Nenhuma é uma linha em `users`.** Não há órfãs, não há citação a remover, e
esta parte estava resolvida antes de começar — eu é que a inventei a partir de
uma contagem mal lida.

## O que a base tem, e o que uma reposição deve devolver

    AGORA                                   DEPOIS DA REPOSIÇÃO (esperado)
    users                  133              5
      painel@inspeccao       3                3   ← semente de inspecção
      @exemplo.example     125                0   ← restos, curados hoje
      @bossaos.invalid       2                2   ← Marta + conta de captura
      ana@/bruno@/diogo@     3                3   ← `fixtures.ts`
    organizations            3              3     ← insp A, insp B, demo
    locations                4              4
    cash_registers           6              ?
    cash_register_events    17              ?
    cash_movements           1              ?

Os três nomeados (`ana@marina-oropesa`, `bruno@marina-barcelona`,
`diogo@bossaos`) vêm do `packages/db/prisma/fixtures.ts` — são fixtures, não
órfãos.

**Os 5 = 3 + 2**, e os 128 que desaparecem são **entulho medido**: 125 restos
mais 3 que a `fixtures.ts` repõe.

### As três interrogações, e são um achado

`cash_registers 6`, `cash_register_events 17`, `cash_movements 1` — e **só um
registo e um evento eram meus**. O `semente-inspeccao.ts` **também cria
movimentos de caixa** (linha 888). Como esse rasto é append-only, **a semeadura
de inspecção acumula linhas que nenhuma limpeza tira**, corrida após corrida.

É a **mesma classe** que travou o bloco 2 — e aqui já acontece há muito, em
silêncio. Não sei quantas destas 24 linhas são de quantas corridas, e não o
invento: depois da reposição fica-se a saber, porque o número passa a ser o de
**uma** semeadura.

**Não reponho nada até a sua palavra**, e os gatilhos continuam intactos.


---

## A tabela não fechava: eu misturei dois momentos — 08/09

O reparo está certo. `3 + 0 + 2 + 3` são **oito** e eu escrevi **cinco**. Nenhuma
das duas linhas estava errada: **o momento é que não estava dito.**

Medido: o `fixtures.ts` exporta `semear(urlDeMigracao)`, e quem o chama são as
**provas** — **36** ficheiros em `provas/`. As duas sementes só lhe importam o
`IDS`; **nenhuma chama `semear()`**. Portanto as três (`ana@marina-oropesa`,
`bruno@marina-barcelona`, `diogo@bossaos`) **não existem logo a seguir a uma
reposição** — aparecem na primeira corrida de provas.

### Os números, agora com o momento à frente

| | agora | após migrações + as duas sementes | após a 1ª corrida de provas |
|---|---:|---:|---:|
| `users` | **133** | **5** | **8** |
| &nbsp;&nbsp;`painel@inspeccao` | 3 | 3 | 3 |
| &nbsp;&nbsp;`@bossaos.invalid` | 2 | 2 | 2 |
| &nbsp;&nbsp;`ana@`/`bruno@`/`diogo@` | 3 | **0** | 3 |
| &nbsp;&nbsp;`@exemplo.example` | 125 | 0 | 0 |
| `organizations` | 3 | 3 | 3 |
| `locations` | 4 | 4 | 4 |

**Se autorizar com 5 e sair 8, não é alarme: é a primeira prova ter corrido.** E
se sair 5 e ficar 5 depois de uma prova, aí sim há coisa.

## As três interrogações da caixa: medidas, e o senhor tem razão

**Não é resíduo de gatilho — é a semeadura a acrescentar em cada corrida.** Corri
o `semente-inspeccao.ts` uma vez e contei antes e depois:

    antes   registos=6  eventos=17  movimentos=1
    depois  registos=7  eventos=18  movimentos=3

**+1 registo, +1 evento, +2 movimentos por semeadura.** Como o rasto é
append-only, nada disso sai — e é por isso que estavam em 6/17/1: são muitas
corridas empilhadas.

E o seu raciocínio confirma-se pela mesma medição: **um `DROP DATABASE` leva
tudo**, gatilhos incluídos. A imutabilidade impede apagar **linhas**, não impede
destruir a base. Depois da reposição, o esperado é o de **uma** semeadura:

    cash_registers 1 · cash_register_events 1 · cash_movements 2

Se sair mais do que isso, alguma coisa correu duas vezes.

---

## O nono utilizador: a base está certa, o esperado é que estava errado — 17h20

Contei a base depois da reposição: **9 utilizadores**, quando o esperado era 8. Fui
procurar o intruso.

Não há intruso. O nono é `carla@exemplo.example`, e nasce em
`packages/db/prisma/fixtures.ts:99` — **é uma fixture**, ao lado da ana, do bruno e
do diogo.

Contadas em vez de enumeradas, o `fixtures.ts` cria **quatro**:

```
ana@marina-oropesa.example
bruno@marina-barcelona.example
carla@exemplo.example      ← a que faltava na lista
diogo@bossaos.example
```

A tabela do esperado listava **três** e derivou **8**. O correcto é **9**, que é o que
a base tem. **A reposição correu bem; a expectativa é que tinha um erro de menos um.**

## O que isto ensina, e é a terceira vez hoje

**Um número esperado derivado de uma lista escrita à mão herda as omissões da lista.**
Foi o mesmo mecanismo três vezes hoje:

- os «125 restos» generalizados a partir de um total sem olhar à distribuição;
- as «três identidades órfãs», que eram uma contagem lida como dois conjuntos quando
  um continha o outro;
- e agora as «três fixtures», que são quatro.

A cura é a mesma nas três: **derivar o esperado da fonte, não de uma enumeração**.
Contar o que o `fixtures.ts` cria custa um `grep`; escrever à mão os que me lembro
custa zero e mente uma vez em cada três.

## E o teste de dois lados fez o seu trabalho

Se eu tivesse pedido só «diz-me quantos ficam», o 9 passava por bom. Foi ter um
**esperado explícito** que tornou a diferença de um visível — e a diferença apontou
para uma fixture esquecida, não para um problema. **Uma expectativa errada que se
descobre é melhor do que uma medição sem expectativa nenhuma.**
