# RV100 · secção 4 — conformidade do sistema visual

> A secção 3 mostrou que o sistema **está construído e é fiel ao manual**. Esta
> secção verifica-o item a item e nomeia onde não bate.

## 4.1 Assets da marca — duas não-conformidades, medidas

O componente `apps/web/src/componentes/Marca.tsx` cumpre as **proibições** todas, e
cumpre-as bem:

| o plano proíbe | o componente |
| --- | --- |
| reconstruir a logo com texto, CSS, fonte ou SVG automático | usa os PNG reais (`brand/logoname.png`, `brand/logoicon.png`) |
| deformar a proporção | calcula a largura pelo pixel: `(2137 / 736) × altura` |
| marca sem nome acessível | `alt="BossaOS"` |
| recolorir, sombrear, rodar, mascarar | nada disso |

**E falha nas duas exigências positivas:**

### ① A assinatura do cabeçalho está a ~81 px, e o mínimo é 120

O `Marketing.tsx:45` chama `<Wordmark />` **sem altura**. A omissão é `28`, e
`28 × 2137/736 ≈ **81 px**` de largura.

> *«A logo do header desktop começa em **120 px de largura**; alvo recomendado
> entre **144 e 168 px**.»*

Está a **dois terços** do mínimo. E não há uma única chamada com altura explícita
em todo o produto — as duas que existem usam a omissão.

### ② A marca não liga ao início

> *«A logo do header deve ligar ao início com nome acessível.»*

O `packages/ui/src/estruturas/EstruturaPublica.tsx:54` renderiza `{marca}` **nu** —
sem `<a href>`. O nome acessível existe (`alt`), a ligação não.

**Consequência prática:** clicar no logótipo é o gesto mais previsível de quem
navega uma landing, e neste momento não faz nada. Não é acessibilidade a menos — é
uma expectativa universal que o produto não cumpre.

## 4.2 Paleta funcional — conforme

Verificada na secção 3, e repito o essencial: os quatro tokens do plano
(`brand.primary` `#102E35`, `brand.accent` `#F5664D`, `surface.default` `#F7F4EC`,
`brand.highlight` `#DDEA91`) são a paleta do manual, definida uma vez em
`packages/ui/src/estilos.css` e consumida por classes.

**E há uma regra do manual que o plano não repete e que vale mais do que os
valores:** *«em interfaces, priorizar superfícies claras; coral e cítrico não devem
disputar atenção com o estado dos pedidos»*. O coral é CTA e destaque editorial —
**não é sinal operacional**, e os estados têm cor própria fora do tema do cliente.

## O que vai para quem implementa

Duas correcções pequenas e medidas:

1. dar altura explícita à assinatura no cabeçalho comercial, dentro de 144–168 px;
2. envolver a marca numa ligação ao início, com nome acessível.

**Nenhuma delas é decisão do Matheus** — são números que o plano fixa. Seguem com
a autorização dele para não parar, mas não precisavam dela.
