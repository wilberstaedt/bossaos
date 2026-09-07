# Revisão do lote L1i — internacionalização, SEO e partilha

Entrega em `2a26c45`. Fecha o RV100-007, que era o P1 mais antigo em aberto.

---

## Um risco de produção que sai deste lote, e que é decisão do Matheus

**O `NEXT_PUBLIC_SITE_URL` não está definido em lado nenhum.** Verifiquei: zero
no `.env`, zero no `.env.example`, e só é lido em `apps/web/src/seo/origem.ts`.
Sem ele, a origem cai em `localhost` — e **todos os `canonical`, `hreflang` e
`og:url` de produção apontam para a máquina de quem compilou**.

E a razão de não ter valor por omissão é a certa, e está escrita no repositório:

> *«bossaos.com e @bossaos são nomes pretendidos, **sem posse ou disponibilidade
> presumida**»* — `PROMPTS_COMPLETOS.md`

**Um `canonical` é uma reivindicação de posse legível por máquina, num sítio que
ninguém relê.** Escrever ali um domínio que ninguém confirmou seria afirmar posse.
Ele escolheu a falha que se vê: *«`localhost` é obviamente falso, onde um domínio
plausível mas errado passaria despercebido»*.

**O que eu acrescentei:** a variável não estava no `.env.example`, portanto o
requisito não era descobrível onde se configura. Pus lá o comentário com a razão.
**Não decide o domínio** — torna a decisão visível a quem fizer deploy.

## A medição é de títulos DISTINTOS, e não de títulos presentes

| | antes | depois |
| --- | ---: | ---: |
| títulos **distintos** entre 9 rotas | **1** | **9** |
| descrições distintas por rota, entre línguas | **1** | **3** |
| `canonical` · `hreflang` · `og:image` | 0 · 0 · 0 | 27 · 27 · 27 |
| `sitemap.xml` · `robots.txt` | **404** · **404** | 200 · 200 |

E ele diz porquê: *«o estado antigo tinha nove títulos e passaria em qualquer
contagem de presença»*. **É a lição do denominador aplicada ao seu próprio
instrumento** — nove títulos iguais e nove títulos diferentes contam-se igual.

## A omissão passou a `noindex`, e o raciocínio é o melhor do lote

Escolheu **negar por omissão** em vez de lista de proibidos:

> «Com uma lista de proibidos, a próxima rota de sessão nasce indexável e ninguém
> repara; com negação por omissão, uma rota comercial nova **não aparece** — e
> *isso* repara-se. **Entre os dois erros escolhi o que se descobre.**»

Isso é desenho de sistema, não configuração. E mediu: `/es-ES/auth/login` devolve
200 com `noindex, nofollow`.

## O defeito que só apareceu depois de o ficheiro existir

O `/robots.txt` respondia **307 para `/es-ES/robots.txt`** — um endereço que não
vale nada, porque o protocolo lê o `robots.txt` na raiz e em mais lado nenhum.

> «O redireccionamento não o moveu; **apagou-o**.»

E a causa é estrutural: o `proxy.ts` redirecciona por **lista de excepções**,
portanto todo o ficheiro novo na raiz nasce com prefixo de língua. Corrigido numa
constante partilhada e não num regex enterrado.

**E ele quase o perdeu por procurar o nome errado:** procurou `middleware.ts` e
concluiu «sem middleware» — **é `proxy.ts` desde o Next 16**. É a forma nº 1 da
minha própria lista, e ele nomeia-a como lição deste repositório: *«um
instrumento que não alcança o alvo tem de falhar, não reportar ausência»*.

## A segunda correcção que me faz, e resolve-a melhor do que eu

Eu tinha escrito que o `sitemap` devia ser **gerado do atlas**, e dei a razão:
uma lista à mão fica velha na primeira rota nova.

**Ele mediu e recusou:** três das doze linhas MKT produziriam entradas erradas —
MKT-002/003 são o **mesmo byte** que a home, MKT-006 aponta para uma rota que não
existe (RV100-020), e MKT-011/012 não são indexáveis. *«O atlas é o registo de
IDs e é excelente nisso.»*

**E manteve a minha objecção viva em vez de a descartar:** a lista não vive
sozinha — o `validar-seo.sh` compara-a com o sistema de ficheiros e **reprova
numa pasta de rota não classificada**. É a resposta certa: recusou a instrução e
satisfez a preocupação que a motivava.

## Duas medições que eu não teria feito assim

**O favicon a tamanho real.** O glifo ocupa **91,3% da tela**, o que dá **~14,6
px efectivos a 16**. *«Não há margem para recuperar. A silhueta aguenta; a onda
interior quase fecha.»* Uma variante simplificada é secção 7 — e classificar
assim é correcto.

**A imagem Open Graph marca-se a si própria por dentro dos pixels:** contém
`bossa-demo` e `demo@bossaos.invalid` — **um TLD reservado que não pode
resolver**. Uma OG é a superfície que mais viaja fora do nosso controlo, e esta
leva a prova de que é demonstração **dentro** da imagem, onde sobrevive a ser
recortada e repartilhada.

## Zero dados estruturados, e é decisão

*«Os factos que um JSON-LD comercial carrega — `aggregateRating`, `reviewCount`,
contagens de clientes — não existem aqui. Se uma guarda não o prova, não se
escreve.»* Bate com o que eu tinha auditado: zero prova social em toda a
superfície comercial.

**L1i fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
