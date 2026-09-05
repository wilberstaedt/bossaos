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

## O que ainda não medi

Se as telas ficam **inacessíveis** ou apenas **não navegáveis** — quem souber o
endereço entra. Não testei permissões nessa entrada directa. Se um `/app/x/y/
reservations` escrito à mão abrir sem passar por porta nenhuma, a pergunta deixa
de ser de navegação e passa a ser de autorização. **Fica por medir, e não o
conto como limpo.**
