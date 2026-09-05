# Régua do E34 — Revisão Pro e cobertura integral

> Escrita a 05/09, muito antes da etapa. Existe por uma razão concreta: eu disse
> **«fica para o E34»** quatro vezes hoje, espalhadas por dois documentos, e não
> havia aqui nada. Uma dívida adiada para um sítio que não existe é uma dívida
> apagada com passos extra.

## O que o E34 herda, e cada item tem endereço

### 1. O menu da PLATAFORMA nunca foi medido

O marco do Restaurant mediu `app/[orgSlug]`. A `platform` tem `#` em Suporte,
Incidentes e Auditoria, **sem `porConstruir`** a dizer que etapa os faz — o
critério que apliquei ao menu de gestão nunca foi aplicado aqui.
`E21-LIMPEZA.md`.

### 2. O `/staff/` não tem uma única ligação em todo o produto

Zero `href`. É superfície de dispositivo com PIN, e um tablet configura-se uma
vez — por isso não bloqueou o marco. **A pergunta que fica:** como é que um
tablet novo chega ao endereço? Se for alguém a escrevê-lo de um papel, a
instalação de um posto depende de uma pessoa saber uma coisa que o produto não
diz.

### 3. Quatro alvos do arnês com forma de lotaria

`productId` (5 linhas a casar), `menuId` (2), `categoryId`, `groupId`:
`LIMIT 1` sem `ORDER BY`. Declarados e medidos pelo JR no E20, e **não tocados
de propósito** — servem provas de etapas assinadas, e mexer sem revalidar troca
um risco conhecido por um desconhecido. **«`LIMIT 1` sem `ORDER BY` não é um
alvo, é uma lotaria — e falha de forma intermitente, que é a maneira mais cara
de falhar.»**

### 4. As guardas que observam a FORMA DA ESCRITA

A guarda das 28 telas do E19 exigia a palavra «implementado aguardando
validação» e acendeu **por a etapa ter avançado** para «validado». Já corrigida.
**O E34 varre as restantes à procura da mesma forma:** alguma casa por texto de
estado em vez de casar pela propriedade que quer garantir?

### 5. 35 das 48 provas não correm na CI

E a causa é estrutural: a CI **glob-a as guardas** e **lista as provas à mão**.
O conserto existe — o `provar-tudo.sh` descobre — e a CI menciona-o num
comentário sem o usar. `E21-CI.md`. **Terceira aparição do mesmo defeito neste
projecto**; as outras duas foram os documentos de retoma.

### 6. O código morto, com ficheiro e linha

`E21-LIMPEZA.md` tem a lista dividida: **7 para apagar** (duplicados com
alternativa viva), **2 que NÃO se apagam** porque são capacidade em falta
(`revogarConvite` — não se cancela um convite mal enviado; `listarAuditoria` —
a auditoria é escrita e ninguém a lê), e **2 por ler** (permissões, que não se
apagam por estatística de uso).

### 7. Código de verificação no pacote publicado

As funções do `qr.ts` e o `sobrepoe` existem para **verificar** o produto, não
para o servir. Não é defeito; é peso num pacote que se publica.

### 8. As assinaturas mudaram de sítio a meio, e isso engana quem procura

**E09, E10, E12 e E13 estão validadas e não têm `docs/reviews/E##.md`.** Fui
verificar se as assinei sem rever: **não.** A evidência está lá — réguas,
controlos negativos, provas nomeadas — mas vive em `docs/progress/E##.md`.

A convenção mudou a partir do E14 e as anteriores ficaram onde estavam. Não é
defeito de substância; é defeito de **alcance**, outra vez: quem procurar as
assinaturas em `docs/reviews/` conclui que quatro etapas passaram sem revisão.

**O E34 decide uma das duas** — mover, ou deixar um apontador em cada — e
escreve qual. O que não serve é ficar a depender de alguém saber que houve uma
mudança de convenção a meio do projecto.

## O que exijo de mim próprio nesta revisão

- **Enumerar os módulos antes de medir.** Aprovei o marco do Restaurant com
  «módulos entregues» sem enumerar quais, e escaparam-me o `kds` e o `staff`.
- **Critérios fixados antes de ver, e a lista do que NÃO exijo.**
- **A reaprovação executável**, como `provar-marco-e21.sh` — a leitura não se
  reexecuta.
