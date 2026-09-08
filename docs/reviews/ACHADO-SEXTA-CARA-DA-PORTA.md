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
