# E11 — as três correcções delimitadas

**Executou:** Lúmen JR · **Rechecagem:** Lúmen (sénior), que avisou que volta a medir
**Data:** 2026-09-04 · **Parecer que as pediu:** `docs/reviews/E11.md`

---

## Resumo

| Correcção | Estado |
| --- | --- |
| 1 · medir as 66 telas em móvel | **63 medidas**, 3 bloqueadas por um defeito real (abaixo) |
| 2 · acesso cruzado negado no produto | **feita**, com dois controlos negativos |
| 3 · resolver os 12 botões decorativos | **feita**, com guarda que impede a regressão |

**E a medição encontrou coisas.** Cinco defeitos de alvo de toque que ninguém tinha visto, e
um **500 numa tela assinada como validada desde o E04**. Nenhum deles dava erro em lado
nenhum: build verde, tipos verdes, guardas verdes.

---

## Correcção 1 — as 66 telas em móvel

**63 saíram da dívida.** `DIVIDA-MOVEL.txt` passou de 66 para **3**, e o
`validar-movel.sh` conta 109 dos 112 IDs do marco com prova de móvel.

Duas provas novas, porque as telas não são todas do mesmo tipo:

- **`inspeccao/divida-movel-auth.spec.ts`** — as 6 anteriores à sessão (AUTH-001, 003, 004,
  005, 006, 009). Correm **sem** sessão, no projecto `chromium`: com sessão o produto
  desvia-as, e medir o desvio em vez da tela é o falso verde que a régua reprova à cabeça.
- **`inspeccao/divida-movel.painel.spec.ts`** — as outras 57, com sessão real.

Cinco larguras (360, 390, 768, 1280, 1440), transbordo horizontal, elementos fora do ecrã,
alvos de toque a 44 px e contraste WCAG. **Toda a visita afirma o endereço final**: sem
isso, sessenta telas mediriam o mesmo ecrã de entrada e diriam verde nas sessenta.

### O que foi preciso semear, e porquê

Metade das rotas leva identificador. Um identificador escrito à mão fica desactualizado e o
sintoma é **a página de "não encontrado" medida como se fosse a tela** — cinco larguras
verdes sobre um 404. `inspeccao/alvos.ts` lê-os da base e **falha alto** se algum faltar.

A semeadura ganhou o que faltava para as telas existirem: um grupo de opções (CAT-018/019),
um convite por aceitar (AUTH-006) e uma **unidade `insp-` nascida arquivada** (STATE-013).
A unidade é própria e não uma fixture: arquivar uma fixture partiria as provas que contam
com ela viva — o defeito que o E06 já pagou uma vez.

O convite guarda o **resumo** do token e não o token, como o E04 decidiu. O arnês calcula o
mesmo resumo com a mesma função, em vez de inventar uma coluna ou baixar a exigência.

### Os três IDs que são ESTADOS e não rotas

STATE-006 (bloqueio de plano), STATE-013 (unidade arquivada) e STATE-014 (confirmar
identidade) partilham rota com outra tela. **Cada um afirma o seu bloco** — medir a rota
uma vez e dar dois IDs por medidos é a medição que não aconteceu, que é a mesma que pôs 66
telas nesta dívida.

As condições são semeadas e não esperadas: o bloqueio aparece porque a `marina-oropesa` é
STARTER; a unidade arquivada nasce arquivada.

### Os defeitos que a medição encontrou

Quatro de alvo de toque, todos em telas que nunca tinham sido renderizadas em móvel:

1. **A ligação «esqueci a palavra-passe»** no ecrã de entrada, a render **328×24**. Está
   sozinha por baixo do botão — a isenção da WCAG é para ligações dentro de texto corrido, e
   esta é o que se carrega quando a palavra-passe não entra.
2. **As ligações das linhas de tabela**, a **101×24** na lista de organizações da
   plataforma. Corrigido para todas as tabelas do produto, não só para aquela.
3. **As caixas de verificação dos alérgenos e das preferências**, a **13×13**. É a tela onde
   um toque errado muda uma declaração com valor legal.
4. **As caixas de verificação dos formulários do site**, a 13×13 antes da correcção do E10.

### E um DEFEITO A SÉRIO: ORG-007 devolve 500

**As três que não saíram da dívida são ORG-007, ORG-008 e STATE-014, e não é por falta de
tentativa: a rota devolve 500.**

A causa está medida, não suposta:

> A tela de equipa lê `users` pelo cliente do **runtime**, e o runtime **não pode ler
> `users`** — é a separação de credenciais do E04, e está certa. `pessoasEAcessos` faz
> `user: { select: { nome, email } }`, a base devolve `null`, e `p.user.nome` rebenta com
> *Cannot read properties of null*.

Confirmei com a credencial do runtime: a junção a `users` devolve `NULL` em todas as linhas.

**Nunca funcionou.** Foi assinada como `validado` no E04 sem nunca ter sido renderizada — e
é exactamente o buraco que esta correcção existe para fechar.

**Não a corrigi, de propósito.** A correcção obriga a abrir uma porta nova na fronteira de
identidades do E04 (uma função `SECURITY DEFINER` que devolva as identidades **da própria
organização**, espelhando a `identidade_por_email`), mais migração, mais mudanças nas duas
páginas. Isso não é «medir as 66»: é desenho na fronteira que o CT-04 protege, e a decisão
é de quem assina o contrato. **Escrever «MÓVEL MEDIDO» nelas seria assinar o que não
aconteceu** — a falha que este trabalho existe para pagar.

Fica como **falha bloqueante aberta**, o que quer dizer que o aceite 2 do marco continua
reprovado até alguém decidir a forma da correcção.

---

## Correcção 2 — o acesso cruzado negado no produto

`inspeccao/isolamento.spec.ts`, com **duas contas reais** em organizações diferentes. O
arnês passou a abrir uma segunda sessão, porque com uma só «o produto recusou» e «o produto
recusa tudo» são indistinguíveis.

- A sessão de **A** pede a unidade de **B** pelo endereço de A → **404**, com a recusa
  visível no ecrã, e sem nada de B no texto;
- A sessão de **A** pede a **organização** de B → nunca lá entra;
- **o par**: a sessão de **B** pede o **mesmo** identificador → **vê a unidade**;
- e a simetria: B também não alcança nada de A;
- e a recusa **também se vê a 360 px**, sem transbordar — a recusa é parte do fluxo.

### Duas coisas que a medição corrigiu na própria prova

**A primeira versão comparava `page.content()` e acusava fuga.** Não era: o identificador
aparece no payload de encaminhamento do Next, **ecoado do URL que a própria pessoa
escreveu**. Passou a medir-se o texto visível. Um detector que conta isso como fuga acusa
toda a gente e acaba desligado.

**E as recusas não são todas a mesma coisa.** Plantei uma pertença de A em B à espera de
derrubar as três, e uma ficou verde — a recusa por recurso alheio **dentro da minha própria
organização**. Está certa que não caia: o pedido continua a correr no âmbito de A.

São duas defesas e precisam de dois defeitos:

| Controlo | Derruba |
| --- | --- |
| pertença de A em B | as recusas por endereço de organização alheia |
| política de linha das unidades desligada | a recusa por recurso alheio dentro da própria organização |

`scripts/provar-isolamento-no-produto.sh`: **0 falhas**, 9 casos de navegador, os dois
controlos com o **par** de cada um — e uma verificação final de que a política de linha
voltou a ligar, porque uma prova que deixa a base pior do que a encontrou faz mal.

---

## Correcção 3 — os 12 botões decorativos

Contei 19 e bate com o parecer. **Sete** vivem em `/interno/catalogo` e
`/interno/estruturas` e ficam: ali um botão inerte **é** o conteúdo da página.

Dos 12 em ecrãs reais, **dois ganharam destino** e **dez saíram**:

| Rótulo | Decisão |
| --- | --- |
| *Ver opciones* (uso) | → comparação de planos |
| *Comparar planes* (plano) | → comparação de planos |
| *Revisar cambio* | saiu — `/api/org/[orgSlug]/plano` só tem `GET` |
| *Seleccionar plan* | saiu — não existe `POST` de plano |
| *Guardar acceso* | saiu — não há caminho que guarde a função de uma pessoa; revogar existe |
| *Invitar persona* | saiu — **nenhum ecrã do produto cria um convite**, só a API |
| *Enviar invitaciones* | saiu — a página nem tem `<form>`, e a API recebe JSON |
| *Continuar* (organizações) | saiu — cada organização da lista **já é** uma ligação |
| *Crear organización*, *Crear flag*, *Editar condiciones* | saíram — a escrita é por script auditado, e o aviso ao lado já o dizia |
| *Ver checklist* | saiu — não existe ecrã de checklist |

Verifiquei cada um antes de decidir. Os quatro de plataforma tinham, dois centímetros
abaixo, um aviso a dizer que a escrita é por script e que a edição chega na E33: **o botão
contradizia a nota que estava ao lado dele.**

### A mesma falta, escrita em prosa

A nota do ONB-009 dizia *«Los cambios se guardan en la unidad y el ámbito indicados»* — e
não se guarda nada. Substituí pela verdade. **A prosa engana mais do que o botão, porque
ninguém a testa.**

### A guarda, e o que ela me fez a mim

`packages/ui/src/botoes-com-accao.test.ts`. A excepção é por **caminho** e não por lista:
uma vitrina nova fica coberta, um ecrã de produto novo não. Provada plantando um botão
inerte no disco e vendo-a acender.

E apanhou-me primeiro: **o meu próprio comentário** a explicar a remoção contém a etiqueta,
atravessa três linhas, e o detector acusou-o. É a família do *grep* que acusava `parseFloat`
dentro do comentário a explicar que não se usa `parseFloat` — e eu tinha escrito isso mesmo
dentro dela. Corrigi o detector (apaga blocos, não linhas), não o comentário.

---

## Uma coisa que quase reportei como defeito e não era

Durante um bocado julguei ter encontrado um segundo 500: `/organization` devolvia 404 ao
próprio dono. A causa era **o meu arnês**, que concedia OWNER com `brand_id` preenchido —
como as fixtures fazem — enquanto a porta que o produto usa para criar um dono
(`criar_organizacao_com_dono`) insere **sem**. Uma concessão de marca não alcança um recurso
da organização, e `alcanca()` di-lo por escrito.

**O arnês tem de imitar o produto, não as fixtures.** Uma sessão com menos alcance do que a
real mede telas que o utilizador verdadeiro nunca vê.

Fica como observação para quem reveja as fixtures: elas concedem OWNER com âmbito de marca,
e o produto concede com âmbito de organização. Não é defeito de nenhuma das provas actuais,
e é uma divergência que pode enganar a próxima.

---

## Uma alteração a um INSTRUMENTO, declarada

`alvosPequenos` passou a medir a **área clicável** e não a caixa: uma caixa de verificação
de 20 px dentro de um `<label>` de 44 px deixou de ser acusada, porque carregar em qualquer
ponto do rótulo marca a caixa — e é isso que a WCAG 2.2 mede.

Mexer num instrumento para uma prova passar é a coisa mais perigosa que se faz aqui. Por
isso a mudança vem com o caso que prova o que ela **continua** a apanhar, e sobretudo a
saída que poderia ter aberto: **uma caixa pequena dentro de um rótulo também pequeno
continua acusada**. O rótulo só conta se ele próprio chegar aos 44 px.

O efeito no produto foi o inverso de calar o instrumento: as caixas ficaram com 20 px (que é
o tamanho certo de uma caixa) e os **rótulos** cresceram para 44.

---

## O que corre, e o que deu

| | |
| --- | --- |
| `pnpm verificar` | **0** — 404 testes unitários |
| `pnpm inspeccionar` | **337 verificações no navegador, 0 falhas** (eram 254) |
| `./scripts/provar-isolamento-no-produto.sh` | **0 falhas** — 9 casos, 2 controlos negativos com par |
| `./scripts/validar-movel.sh` | 109 de 112 com prova de móvel; **3 declaradas** |
| `packages/ui/src/botoes-com-accao.test.ts` | 3 casos, com controlo negativo no disco |

---

## O que fica para o revisor decidir

1. **ORG-007 / ORG-008 / STATE-014**: o 500 é real e a correcção mexe na fronteira de
   identidades do CT-04. Proponho uma função `SECURITY DEFINER` que devolva as identidades
   **da própria organização** — espelho da `identidade_por_email`, com o mesmo princípio de
   interface mínima. Não a escrevi: a forma é de quem assina o contrato.
2. **Convidar não tem interface.** A API existe, nenhum ecrã a usa. Fica declarado, e é o
   motivo de dois dos dez botões terem saído em vez de ganharem destino.
3. **As fixtures concedem OWNER com âmbito de marca** e o produto concede com âmbito de
   organização.
