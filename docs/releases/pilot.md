# Piloto assistido — estado do pacote

> **Três estados, nunca dois.** `feito`, `pendente`, `não medido`.
>
> Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma tinta.
> Por isso não há células em branco neste documento: o que não foi medido
> diz-se por palavras, e quem lê decide com essa informação se a casa abre.
>
> | estado | quer dizer |
> |--------|------------|
> | **feito** | medido, com o número ou o comando ao lado |
> | **pendente** | falta uma coisa **conhecida**, e está escrita qual |
> | **não medido** | não sei. Não é «está bem» nem «está mal» |

Última actualização: **06/09/2026**, commit da medição: `f0b3b57` + trabalho do
E35 por commitar à hora da medição.

---

## 1. Cópias de segurança e restauração

| item | estado | medição |
|------|--------|---------|
| Ensaio de restauração | **feito** | 06/09/2026 06:19 UTC · `scripts/ensaiar-restauracao.sh` |
| Tempo de restauração medido | **feito** | **0,56 s** (564 ms), cópia de 1 236 592 bytes em 0,14 s |
| Amostra verificada na base restaurada | **feito** | produtos=5 · pedidos=9 · movimentos=7 · 5 gatilhos de stock |
| Base do ensaio | **feito** | `bossaos_ensaio`, isolada, criada e destruída pelo guião |
| **RPO** | **não medido** | depende da **frequência** das cópias, e essa não está definida — não há calendário de cópias em produção porque não há produção |
| **RTO** | **não medido** | inclui perceber que há problema, decidir e o resto do sistema a voltar. O ensaio mede uma parte, e a parte não é o todo |

**O que este 0,56 s não é.** Não é RPO nem RTO. É o tempo de restaurar uma cópia
**que já existia**, sobre uma amostra de 14 linhas de catálogo e pedidos, na
mesma máquina, sem rede pelo meio. Numa casa a sério, com meses de serviço e a
cópia noutro sítio, será outro número — **maior**, e é exactamente por isso que
se mede em vez de se prometer. O guião recusa-se a emitir RPO e RTO de propósito
(`podeDeclararRpo`).

---

## 2. Os quatro portões da publicação

Todos existem e **todos recusam**, cada um provado com o seu controlo em
`scripts/provar-implantacao.sh`.

| # | portão | estado | como se prova que recusa |
|---|--------|--------|--------------------------|
| 1 | não se publica o que não foi assinado | **feito** | matriz com etapa por validar → pára |
| 2 | publica-se um commit, não a árvore | **feito** | um ficheiro por commitar **não entra no pacote** — medido abrindo o tar |
| 3 | os segredos vivem no servidor | **feito** | `.env` dentro do tar → pára |
| 4 | a versão que responde é a construída | **feito** | etiqueta ≠ commit → pára; etiqueta ilegível → **NÃO MEDI**, que não é o mesmo |

**Portão 1, hoje:** recusa. A matriz tem **E34 e E35** por validar, e é correcto
que recuse — o E35 está a ser escrito agora e o E34 é do sénior. Publicar hoje
poria no ar código que ninguém reviu.

**Portão 2 não pára com a árvore suja, e é deliberado.** São dois agentes na
mesma árvore e exigir árvore limpa impedia publicar. A garantia não é a regra: é
o `git archive`. O que se mede é que o ficheiro por commitar **não vai** — e sai
um aviso a dizer quantos ficaram de fora.

**Portão 4, hoje:** **não medido** contra um servidor a sério. A leitura da
etiqueta `bossaos.versao` está feita e o controlo prova que recusa, mas
**nunca correu contra uma imagem publicada por este guião** — não há servidor de
piloto (ver §5). O que está provado é a decisão; o que falta é o alvo.

---

## 3. Importação da carta do cliente

| item | estado | medição |
|------|--------|---------|
| Ensaio a seco | **feito** | `scripts/importar-a-seco.sh` · **não abre ligação à base** |
| Lista de conferência antes de aceitar | **feito** | sai por linha e campo, com o problema em português |
| Alergénio vazio → `DESCONHECIDO` | **feito** | aviso explícito de que **não é** «não contém» |
| Preço ilegível apanhado | **feito** | validado como texto; `1.2.3` não passa por `1.2` |
| Importação **real** de uma carta de cliente | **pendente** | não há cliente piloto com carta entregue. O guião está pronto e o ficheiro não existe |

---

## 4. Formação

Guiões escritos em [`formacao.md`](formacao.md), um por papel, cada um com o seu
teste — e o teste é a pessoa a fazer sozinha, com o formador calado.

| papel | guião | pessoa testada |
|-------|-------|----------------|
| `WAITER` | **feito** | **pendente** — não há casa piloto |
| `KITCHEN` / `BARTENDER` / `EXPO` | **feito** | **pendente** — não há casa piloto |
| `CASHIER` | **feito** | **pendente** — não há casa piloto |
| `HOST` | **feito** | **pendente** — não há casa piloto |
| `VENUE_MANAGER` | **feito** | **pendente** — não há casa piloto |
| cliente no QR | **feito** | **pendente** — mede-se com a sala, e a sala não existe |

**O tempo total dos guiões cabe no que se vende?** ~1 h 55 min somados. O Starter
vende **2 h** de implantação assistida, e o Starter só liga a carta e o QR —
25 min de sala e explicar o QR. Cabe. **Não medido:** quanto tempo isto demora
com pessoas a sério, que é sempre mais do que o guião diz.

---

## 5. O que está pendente por falta de mundo real

Fecha-se o pacote local e diz-se por palavras o que ficou por activar. Nada
disto está em branco.

| pendência | o que falta, exactamente |
|-----------|-------------------------|
| Servidor do piloto | não há máquina. Os quatro portões correm em seco; o portão 4 nunca leu uma imagem publicada por este guião |
| Casa piloto | não há restaurante. Sem ele não há formação testada, carta real, nem noite cheia |
| Impressoras de cozinha | hardware não existe. O E31 fechou com «entregue à ponte não é imprimiu», e continua verdade |
| Domínio próprio do piloto | sem DNS não há propagação, e a saída deste degrau **não é imediata** ([`entrada-progressiva.md`](entrada-progressiva.md), degrau 3) |
| Provedor de pagamentos | ficou pendente no E24 e continua |
| Envios (email/SMS) | ficou pendente no E27 e continua |
| Calendário de cópias em produção | sem ele não há RPO. É a mesma pendência da §1, dita do lado da infraestrutura |

---

## 6. Entrada progressiva

Plano e **plano de saída de cada degrau** em
[`entrada-progressiva.md`](entrada-progressiva.md). Os três degraus têm saída
escrita, e `degrauPodeSubir` recusa em código um degrau sem ela.

| degrau | saída definida | casa lá dentro |
|--------|----------------|----------------|
| 1 · STARTER — carta e QR | **feito** — volta a carta de papel, sem dados a perder | **pendente** — não há casa |
| 2 · RESTAURANT — operação | **feito** — papel e caixa registadora, dados ficam | **pendente** — não há casa |
| 3 · PRO — reservas, marca, integrações | **feito** — saída por partes; o domínio **não é imediato** | **pendente** — não há casa |

A tabela mede **o plano**, que é o que existe. A terceira coluna existe para que
ninguém leia a segunda como se fosse a casa a andar: o plano estar escrito e
alguém estar a usá-lo são duas coisas, e escrevem-se em duas colunas.

---

## 7. Incidentes

Nenhum, e isto **não é** um verde: **não houve serviço.** Zero incidentes sobre
zero serviços é população zero, e este projecto reprova essa leitura em toda a
parte. A tabela existe para quando houver.

| data | duração | o que se mediu | causa |
|------|---------|----------------|-------|
| — | — | ainda não houve serviço | — |
