# E21 · O Restaurant está construído e não se chega lá

> Achado operacional de 05/09. **É o mais grave que encontrei**, e não foi
> nenhuma prova que o apanhou — foi seguir o caminho de uma pessoa que entra.

## O caminho, medido passo a passo

1. Sessão iniciada → `layout.tsx:31` redirecciona para `/auth/organizations`.
2. `auth/organizations/page.tsx` tem **uma** ligação:
   `` href={`/${idioma}/app/${o.slug}/organization`} `` — a página da equipa.
3. Chega-se lá. O menu do `app/[orgSlug]/layout.tsx` tem oito entradas:

```
{ href: '#', rotulo: navegacao.inicio        }
{ href: '#', rotulo: navegacao.catalogo      }
{ href: '#', rotulo: navegacao.reservas      }
{ href: '#', rotulo: navegacao.salaPedidos   }
{ href: '#', rotulo: navegacao.caixa         }
{ href: '#', rotulo: navegacao.inventario    }
{ href: '#', rotulo: navegacao.clientes      }
{ href: `…/organization`, rotulo: navegacao.equipa }   ← a única viva
```

4. **Não existe `page.tsx` em `app/[orgSlug]/`.** Nem layout ao nível da
   unidade. Não há middleware. O único `redirect` do layout dispara quando
   **não** há sessão.

**Resultado: quem entra fica na página da equipa, e do menu não sai de lá.**
As 254 telas validadas — reservas, sala, catálogo, takeaway, KDS — não têm porta.

## O que isto NÃO é

**Não é «etapa por construir».** As reservas estão feitas: 34 telas entre o E18
e o E19, provadas em navegador, assinadas por mim. O catálogo idem. Um `#` num
módulo que ainda não existe seria marcador; **um `#` num módulo entregue é uma
porta que ninguém abriu.**

Os módulos ligam-se **entre si** — `reservations/mensagens`,
`reservations/regras`, `delivery`, `floor/mesas` aparecem em `href` dentro de
páginas. O que falta é a **primeira** porta.

## Porque é que nenhuma prova o viu

**As provas de navegador visitam os endereços directamente.** É assim que se
mediram 254 telas: abre-se a URL, confirma-se o marcador `data-tela`, mede-se
contraste e largura. Nenhuma delas começa na porta de entrada e clica.

É a **mesma família** de tudo o resto desta noite, uma camada acima:

- no E19, uma função provada que o produto não chamava;
- aqui, uma **tela** provada a que o utilizador não chega.

**Verde não é alcance** — e desta vez «alcance» quer dizer dedo humano num
menu, não uma chamada de código.

## O que peço

1. **Uma porta para cada módulo entregue**, com o `locationSlug` resolvido —
   provavelmente uma escolha de unidade, que também não existe.
2. **Uma prova que comece na sessão iniciada e navegue por cliques** até uma
   tela de cada módulo. Sem visitar URL nenhuma directamente. É o controlo
   negativo natural: se alguém voltar a pôr `#` num módulo vivo, ela fica
   vermelha.
3. **Um `#` que fique** tem de ser visivelmente inerte, e ter ao lado o nome da
   etapa que o vai substituir. Um item de menu que parece clicável e não faz
   nada ensina o utilizador a desconfiar do menu inteiro.

## MEDIDO a seguir: a entrada directa está autorizada

Declarei isto por medir e fui medi-lo. `apps/web/src/reservas/pagina.ts:12`:

```ts
const sessao = await resolverPedido(orgSlug);
if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);
const unidade = await comEscopoDoPedido(sessao, async (db) => {
  … unidades.find((u) => u.slug === locationSlug) ?? null;
});
if (!unidade) notFound();
```

Três coisas, e as três seguram:

1. **A sessão é resolvida contra o `orgSlug` da URL.** Escrever a organização de
   outra pessoa não passa daqui — redirecciona.
2. **A lista de unidades vem sob escopo**, não da URL. Um `locationSlug` de
   outra organização não está na lista.
3. **`notFound()`**, não «lista vazia»: não confirma existência a quem pergunta.

**Isto baixa a gravidade e afina o achado.** Não é buraco de segurança: é
**alcance**. As telas estão protegidas e inalcançáveis — o que não deixa de ser
um produto que não se pode usar, mas é uma coisa que se conserta com ligações e
não com uma migração.

E é a resposta certa à pergunta que fiz: quem souber o endereço **não** entra
onde não deve. Entra onde já podia entrar, se souber escrevê-lo — e mais ninguém.

## O que continua por medir


Se as telas ficam **inacessíveis** ou apenas **não navegáveis** — quem souber o
endereço entra. Não testei permissões nessa entrada directa. Se um `/app/x/y/
reservations` escrito à mão abrir sem passar por porta nenhuma, a pergunta deixa
de ser de navegação e passa a ser de autorização. **Fica por medir, e não o
conto como limpo.**

## Verifiquei a minha própria afirmação — e quase caí na contagem

Escrevi que «nenhuma prova começa na porta de entrada e clica». Depois contei
**35 cliques** nas provas de navegador e fui verificar antes de deixar a frase
ficar, porque 35 cliques podiam desmentir-me.

Não desmentem. Medido:

```
inspeccao/*.spec.ts  →  getByRole('link'…)   0 ocorrências
inspeccao/*.spec.ts  →  click(…)            35 ocorrências
todos os goto(…)     →  endereços profundos, directos
```

Os 35 são **botões e submissões de formulário dentro de uma página** — «guardar»,
«publicar», «confirmar». Nenhum é uma ligação de navegação. A minha contagem
inicial juntava as duas coisas num só `grep`, e teria sido eu a produzir o
desmentido da minha própria afirmação com um instrumento mal apontado.

**O que isto confirma:** as 254 telas foram medidas por `goto(URL)`. Cada uma
está certa; o caminho entre elas nunca foi medido, porque nunca foi percorrido.

## As jornadas: as peças estão provadas, o percurso não

A `provas/jornada.test.ts` prova **J01 e J02 ponta a ponta ao nível HTTP**, e
bem — «o id vem do redireccionamento, não da base», «encontrá-la onde a pessoa a
encontra». Isso é percurso a sério.

Da J03 em diante, a régua já dizia o que agora se confirma: **as peças estão
provadas, o percurso não.** E agora sabe-se porquê — o percurso não é
percorrível: não há ligação da entrada para módulo nenhum.

**As duas conclusões do E21 são a mesma:** o produto está construído por peças
verificadas, e ninguém verificou que se anda de uma para a outra. No código
chamou-se *função sem chamador*; no ecrã chama-se *tela sem porta*; na operação
chama-se *jornada sem percurso*. É a mesma falha, medida em três escalas.
