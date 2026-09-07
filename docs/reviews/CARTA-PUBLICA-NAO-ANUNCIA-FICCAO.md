# A carta pública não anuncia ficção — e isso inclui a Bossa Demo

> Escrito a 07/09 depois de ler o `8c26883`, onde o sénior encontra as fixtures
> do arnês servidas em público na instalação no ar. **Não venho contestar esse
> achado: venho dizer que ele é maior do que a limpeza resolve**, e vai para
> ficheiro porque muda a recomendação que já está na mesa do Matheus.

## O que verifiquei

**O produto não tem forma de saber que um inquilino é fictício.** Nem coluna,
nem flag, nem convenção lida por código: procurei `insp-` e `SLUG_DE_INSPECCAO`
em `apps/web` e não há uma única ocorrência.

**E o aviso do RV100-017 não está onde se pensa que está.** Ele existe e é real —
`apps/web/src/componentes/Demonstracao.tsx:82` renderiza `mktE10.demoAviso` — mas
serve **quatro rotas de marketing**: a landing, `/product`, `/getting-started` e
o painel da organização. **A carta pública não é uma delas.**

Confirmado por três caminhos que não dependem um do outro:

1. `apps/web/app/r/[publicLocationSlug]/[locale]/menu/page.tsx` só usa `Etiqueta`
   para os estados de horário — aberto, fechado, por configurar. Nenhum aviso.
2. A chave `comum.datosDemostracion` **existe** e é usada só em superfícies
   internas: o catálogo de desenho, a prévia do tema, os exemplos.
3. A tela-mestre **M06** — a carta da Bossa Demo a 390px, recapturada hoje —
   não mostra aviso nenhum. Sobrancelha «BOSSA DEMO», título «Sala principal».

## A consequência, e é ela que muda a recomendação

O `fix_criteria` do RV100-017 diz textualmente **«a semeadura de inspecção fica
intocada»**. A cura foi criar um inquilino que se *chama* demonstração e pôr o
aviso na **montra**. Ficou de fora a superfície onde a ficção é servida como
produto: a carta.

Por isso os inquilinos `insp-` serviram-se calados. **Não falhou nada — não havia
nada para falhar.** E a mesma frase vale para o inquilino certo:

> **`/r/bossa-demo/es-ES/menu` também não anuncia que é uma demonstração.**

Isto importa agora por causa do **A2**, que já está com o Matheus: a recomendação
é *manter um inquilino de demonstração persistente e ligá-lo à landing*. Se ela
for aceite tal como está, **passa a haver uma carta pública de um restaurante
inventado, ligada da landing, sem uma palavra a dizer o que é** — que é o §6.4
outra vez, desta vez de propósito e no caminho comercial.

## O que proponho, e a decisão de desenho que não tomo sozinho

A cura durável não é limpar a base: é a carta saber anunciar ficção. Assim, **se
houver um quarto caminho** — e o sénior escreveu, com razão, que não provou que
não exista — o que voltar a escapar escapa **a dizer o que é**.

Falta o sinal, e há duas formas com custos diferentes:

- **Uma coluna no inquilino** (`e_demonstracao`), lida pela carta. É um facto
  sobre os dados, sobrevive a renomeações e não engana. Custa uma migração.
- **O prefixo do `public_slug`**, que é o sinal que o sénior usou para os
  identificar. Custa zero e é uma convenção, não um facto: o dia em que um
  cliente verdadeiro tiver um slug com o prefixo, leva um aviso falso.

**Prefiro a coluna** e não a implemento por minha conta: uma migração em produção
e uma marca no modelo de dados não são conserto meu, e a limpeza que está a ser
decidida pode mudar o desenho. Fica proposto com os dois custos escritos.

## O que isto NÃO diz

Não diz que a limpeza é desnecessária — ficção a mais na base continua a ser
ficção a mais. Diz que **limpar fecha a instância e não a classe**, e que a
classe volta a abrir na próxima vez que um inquilino de demonstração for
publicado de propósito.
