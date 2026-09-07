# Fase 0.5 — o que se reaproveita e o que perpetua o padrão reprovado

## O achado que muda o custo da reconstrução

**O padrão reprovado não é um componente.** A landing inteira é **um ficheiro de
389 linhas**, `apps/web/app/[idioma]/page.tsx`, com a marcação escrita à mão:

| classe | ocorrências |
|---|---:|
| `bo-mkt__cartao` | **19** |
| `bo-mkt__seccao` | 11 |
| `bo-mkt__grelha` | 7 |
| `bo-mkt__chamada` | 7 |
| `bo-mkt__passo` | 5 |

**Não há um `<CartaoDeTexto>` a desfazer em 396 sítios.** Reescrever a landing é
reescrever uma página — o risco de propagação que o norte proíbe **não existe
aqui**, porque nada disto está partilhado.

## Reaproveitável

| peça | onde | porquê |
|---|---|---|
| `Botao` | `packages/ui` | união discriminada, `href` faz âncora; o contrato de superfície já lá está |
| `Composicao`, `MolduraMkt` | `apps/web/src/componentes` | as molduras do produto, já com `<picture>` por idioma e `sizes` correcto |
| `Marca`, `MenuMkt`, `NavegacaoDoSite` | idem | cabeçalho e navegação |
| `CartoesDePlano` | idem | os preços vêm da fonte aprovada e há guarda (`validar-precos`) |
| tokens de cor e tipografia | `packages/ui/src/estilos.css` | o norte manda **mantê-los**; muda-se a disciplina de uso, não os valores |

## Perpetua o padrão, e morre com a reescrita

- os **19 `bo-mkt__cartao`** inline;
- as **7 `bo-mkt__grelha`** de três colunas — a origem dos cartões órfãos;
- `bo-mkt__seccao` como único ritmo vertical: **todas as secções têm o mesmo
  fundo areia**, que é o primeiro ponto da lista de reprovação.

## Medido antes de tocar

De `MEDIDA-DA-LANDING-SECRETARIA.md`, ao vivo a 1440×900:

- **7103 px** de altura
- **10 grelhas**, **5** com cartão órfão
- **3 imagens**, **0 abaixo da dobra**
- telas do produto a **41 %** e **38 %** do tamanho de captura
