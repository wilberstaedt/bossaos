# Revisão do lote L1k — os heróis das seis páginas

Entrega em `52b6975`. Fecha o RV100-009, o maior item que restava da secção 6.

---

## Eu chamei-lhe «molde repetido». Não era molde nenhum.

Quando corrigi a linha de base, escrevi que as seis páginas partilhavam *«o mesmo
728 exacto — que é repetição de molde, não coincidência»*. **As duas metades
estavam erradas**, e ele mostra porquê com aritmética que fecha ao pixel:

```
contentor centrado a 1440:  começa em x=184, mede 1072
lead com max-width: 68ch,   a 16px = 544
                            184 + 544 = 728
/faq: sem lead, só o h1 a 18ch      = 652
```

Verifiquei as duas pontas: a conta bate, e o `.bo-publico__texto { max-width:
68ch }` está na linha **1177** do `estilos.css`.

**Ninguém copiou aquele valor e ninguém o escolheu.** Cinco páginas escreveram
`h1` + lead, e **a medida de leitura de um parágrafo decidiu o desenho da secção
sozinha**.

### A categoria que me faltava

Quando o mesmo número aparece em N sítios, eu tinha duas hipóteses na cabeça —
**copiado** ou **coincidência** — e escolhi a primeira porque cinco iguais não
podem ser acaso. **Falta uma terceira: calculado pela mesma regra.**

Não é escolha nem acaso: é **consequência**. E distingue-se das outras duas por
uma coisa prática — **tem aritmética que se pode fechar**, e as outras não.

## Isto responde à pergunta do §10 com a palavra certa

O §10 proíbe «metade do herói vazia **por falta de mídia ou composição**». Eu
tinha corrigido o meu critério há uma hora precisamente para não prescrever a
resposta. **A resposta é composição** — e é ele que o diz, com a causa:

| | antes | depois | ocupação a 1440 |
| --- | ---: | ---: | ---: |
| `/product` `/plans` `/pilot` `/trust` `/demo` | 728 | **1212** | 96% |
| `/faq` | 652 | **1256** | **100%** |

**E por isso a correcção não foram imagens**, com a razão que eu queria ouvir:

> «As capturas disponíveis são de 1440 — numa meia coluna renderizam a 38–41%, o
> defeito medido e deixado em aberto no herói da home. **Pô-las em mais cinco
> páginas teria multiplicado por cinco um defeito conhecido.**»

> «**O teu critério corrigido foi o que me fez procurar o mecanismo em vez de
> pegar na mídia.**»

Uma hora antes eu teria mandado pôr imagens de produto ao lado das perguntas da
FAQ.

## A FAQ precisava de outra resposta, e ele encontrou-a

Era um `h1` sozinho, e é onde a mídia seria mais claramente decoração. O que usa
a largura **com função** ali é orientação: dez perguntas em três grupos **sem
índice** obrigam a rolar para descobrir o que existe.

> «O índice não repete conteúdo — **é o caminho até ele**.»

E daí vêm os dois números diferentes: o índice corre até ao bordo do contentor
(1256), o lead pára nos seus 68ch (1212). **A diferença de 44 px entre as duas
tem explicação, e não é ruído.**

E abaixo de 1024 mantêm-se numa coluna, porque a 768 duas colunas dariam 34ch
cada — *«e 34 caracteres não são uma medida de leitura, são uma tira»*.

## Duas coisas que ele preferiu que eu soubesse

**Uma suposição dele passou a ter guarda.** Trocar `load` por `domcontentloaded`
foi forçado — a `/product` esgotava 45 s à espera de pixels de cinco composições
— e assenta em o `next/image` reservar a caixa. É verdade e está documentado,
**mas era uma suposição dele a sustentar todas as medições de geometria do
ficheiro**. Agora mede a mesma página pelos dois caminhos e exige resultados
idênticos.

**E a guarda apanhou o que ele acabara de escrever:** alvos de `76×22`, `67×22`,
`112×22` — as três ligações do índice novo. E o raciocínio dele é o mesmo que eu
mandei ao JR há vinte minutos, sem os dois se falarem:

> «A isenção da WCAG é para ligações dentro de prosa corrida; **um índice não é
> prosa**, e um telemóvel é exactamente onde isso se paga.»

## O que fica

Os dois blocos do §6.3 e a duplicação `/trust`↔home. A expansão de texto continua
`NÃO MEDI`.

E ele leu a régua das telas-mestre **antes**, incluindo a nota de que uma régua
que passa num conjunto vazio não vale nada, e que a secção 7 é onde os dois
paramos.

**L1k fechado. Nada aprovado.**
