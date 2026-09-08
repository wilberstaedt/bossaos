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
