# Fase 0.2 — a linha de base funcional, e ela está VERMELHA

`validar-no-commit.sh` em `483c4a7`: **saída 4, quatro falhas.** Registo-o antes
de a reconstrução começar, porque **um vermelho que já existia e não foi
declarado vira um vermelho sem dono** assim que alguém mexe no visual.

| resultado | contagem |
|---|---:|
| falhas | **4** |
| `NÃO MEDI` | **11** |

## As quatro falhas, e as duas causas reais

### 1 · `validar-testes` — 2 testes de UI a reprovar

Tudo o resto passa: `domain` 427, `fila` 24, `i18n` 19, `auth` 12, `config` 14,
`db` 7, `storage` 5, `worker` 4.

**1a — o acento sem justificação**, uma ocorrência:

    estilos.css:1714  .bo-mkt__fecho .bo-botao--primario { background: var(--bo-acento) }

O teste não é caprichoso: **o coral da marca não chega a 3:1 sobre as
superfícies do produto**, portanto usá-lo em papel visual exige o
`--bo-acento-sinal` **ou** um comentário escrito a dizer que é decoração
editorial e não indicador.

**E isto colide de frente com o norte**, que manda o coral passar de detalhe a
**8–15 %** da página. Cada área nova de coral vai bater aqui. **A guarda está
certa e o norte também** — o que falta é a justificação escrita, que é
exactamente o que a guarda pede.

**1b — cinco tokens no CSS sem ficha:** `--bo-sobre-superficie`, `--bo-accao`,
`--bo-sobre-accao`, `--bo-navegacao-activa`, `--bo-foco-contraste`.

Os «dois lados» **não são claro e escuro** — são **o CSS e o `fichas.ts`**, o
registo de tokens. Estes cinco entraram no CSS **hoje**, com o contrato de
superfície do anel de foco, e nunca foram declarados no registo. **Eu revi e
assinei esse trabalho e não dei por isto.**

Importa agora e não amanhã: a Fase 1 é «sistema visual mínimo» e vai **acrescentar
tokens**. Sobre um registo já a derivar, a Fase 1 piora a deriva e o teste
vermelho passa a ser ruído que se aprende a ignorar.

### 2 · `validar-plantes` — seis controlos negativos MORTOS

Seis guiões de prova têm um plante cuja âncora deixou de casar com o código:

    provar-analitica-no-navegador   provar-kds-no-navegador
    provar-reservas                 provar-staff-no-navegador
    provar-tpv-no-navegador         provar-visitante-no-navegador

O próprio guião explica o que isso significa: *«um guião com plante morto NÃO
prova nada e ACUSA o produto: o `exigir_vermelho` corre contra um produto
intacto, ele passa, e o guião conclui que a asserção é vazia.»*

**É a doença do dia inteiro, em seis controlos negativos ao mesmo tempo** — e
são precisamente guiões que a Fase 2 vai usar para dizer «sem regressão».

*(As outras duas falhas, `validar-silenciadores` e `validar-suites-com-guiao`,
ficam por diagnosticar e estão nomeadas para não se perderem.)*

## Os 11 `NÃO MEDI`, e porque importam

`validar-superficies`, `validar-acessibilidade-dinamica`,
`validar-tipografia-minima`, `validar-foco-nos-momentos`,
`validar-expansao-de-texto`, `validar-provas-frescas`,
`validar-capturas-de-marketing`, `validar-registo-fechado`,
`validar-alergenios-na-carta`, `validar-alcance-das-composicoes`,
`validar-id-de-rota-validado`.

**Um `NÃO MEDI` não é um verde.** A Fase 2 terá de os fazer correr a sério, senão
«sem regressão» é uma afirmação sobre onze guardas que não olharam.

## O que isto obriga

**A Fase 1 não pode começar por desenhar.** Começa por: registar os cinco tokens
no `fichas.ts`, justificar (ou trocar) o acento da linha 1714, e ressuscitar os
seis plantes. **Sem isso, nada do que vier a seguir se pode chamar «sem
regressão», porque não há verde de onde partir.**
