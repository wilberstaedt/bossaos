# Ponto 6 do portão: os componentes ainda NÃO propagados — 08/09 01h50

> O §9 do norte exige, na resposta do portão, «componentes ainda não
> propagados». É a fronteira da Fase 3: o que existe de novo e **não** foi
> aplicado às 396 telas. Sem esta lista, ou se propaga cedo de mais ou perde-se
> o rasto do que é novo.

## O que existe de novo

**40 classes `ns-` distintas** em `packages/ui/src/estilos.css`:

    ns-accao-heroi  ns-bento  ns-cabecalho  ns-chamada  ns-comecar  ns-corpo
    ns-display  ns-faq  ns-fecho  ns-fecho--coral  ns-fluxo  ns-heroi  ns-lead
    ns-linha-do-tempo  ns-mesa  ns-mesa--atencao  ns-mesa--livre
    ns-mesa--ocupada  ns-mesa--reservada  ns-mesas  ns-moldura
    ns-moldura--sobreposta  ns-papeis  ns-preco  ns-preco--destaque  ns-precos
    ns-resumo  ns-rodape  ns-sala-nav  ns-seccao  ns-seccao--areia
    ns-seccao--branca  ns-seccao--coral  ns-seccao--suave  ns-seccao--verde
    ns-shell  ns-sinal  ns-titulo  ns-titulo-pequeno  ns-transparencia

## Onde estão usadas — e é só o âmbito

| ficheiro | é o quê |
|---|---|
| `app/[idioma]/page.tsx` | a landing |
| `app/[idioma]/interno/ns2/page.tsx` | a página do sistema da Fase 1 |
| `app/[idioma]/app/[orgSlug]/[locationSlug]/floor/page.tsx` | Mesas em tempo real |
| `src/componentes/NavegacaoDaSala.tsx` | parte das Mesas |

**Ficheiros fora do âmbito da Fase 2: ZERO.** O prefixo `ns-` fez o que era
suposto — as 396 telas continuam em `bo-` e **nada do novo lhes tocou**.

## E quase acusei o JR de propagar

A minha primeira contagem deu **seis** ficheiros, incluindo o `layout.tsx` de
**todas** as rotas `[idioma]` e o layout da **carta pública** — o que seria
propagação a sério, e proibida.

Fui ver antes de o escrever. Os dois «achados» eram:

    fallback: ['Arial', 'sans-serif']
    noto-sans-latin.woff2

**O meu `grep 'ns-'` casou com `sans-serif`.** Sétima vez hoje que um padrão
largo me dá uma resposta plausível e errada — e esta ia dar numa **acusação**.

A cura foi uma fronteira, `[^a-zA-Z-]ns-[a-z]`, **auto-testada contra os três
casos** antes de a usar: apanha a classe, ignora o `sans-serif` e ignora o
`noto-sans-latin`.

**Um padrão sem fronteira não procura o que se quer: procura o que casa.**
