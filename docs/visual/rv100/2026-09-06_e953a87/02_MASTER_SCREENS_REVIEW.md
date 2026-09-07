# RV100 · §7 — as seis telas-mestre

> Passos 1 a 4 do §7.1: implementar, correr, capturar, indexar.
> **O passo 5 não é meu.** O §7.1 manda emitir `PRONTO PARA APROVAÇÃO VISUAL
> HUMANA` e parar, e o §12.4 diz que só o Matheus regista a aprovação — quem
> emite o `PRONTO` deve ser quem reviu, não quem construiu.
>
> Motor: `scripts/capturar-mestres.mjs`, guião `scripts/provar-mestres.sh`.
> Evidência: `evidence/masters/`.

---

## O viewport-alvo do M05, escrito

O §7 pede «viewport-alvo **documentado**», e a régua é explícita: *«documentado é
um aceite, não um adjectivo — sem o número, qualquer captura passa»*. Procurei
no repositório e **não estava escrito em lado nenhum**: a única ocorrência é a
própria linha do §7 a pedi-lo.

**Alvo: 1920 × 1080.** E a razão não é gosto meu — sai de uma afirmação que o
produto já faz. O §6.6 da landing diz, nas três línguas, que *«uma TV pode
precisar de um mini-PC»*: o televisor é uma superfície de KDS que o produto
**antecipa por escrito**, e 1920 × 1080 é o painel montado comum.

**Segundo viewport: 1280 × 800**, que é o da composição que já existe e é a
cozinha apertada com um portátil. Dois números escritos valem mais do que um
número escolhido por omissão.

---

## As duas divergências abertas, justificadas

O §7 pede «divergências justificadas em relação ao atlas». Estas duas estavam
por escrever, e é melhor escrevê-las antes de alguém perguntar.

### 1 · O CTA da landing é verde-escuro e não coral

A nota da régua exige *«ou uma justificação escrita de porque é que a LP tem CTA
verde e não coral, ou o `acento-sinal`»*, e diz que **«porque ficou verde» não é
resposta** — as duas soluções ficam verdes, e escolher entre elas é decisão de
marca.

**A justificação, e mudou de forma desde que a nota foi escrita.** A landing
deixou de ter *um* CTA: tem dois grounds diferentes, e o coral existe num deles.

| fundo | fronteira do botão | rótulo verde-escuro | rótulo branco |
| --- | ---: | ---: | ---: |
| areia (`--bo-superficie-base`) | **2,77** ✗ | 4,23 ✗ | 3,39 ✗ |
| verde-escuro (`--bo-superficie-inversa`) | **4,71** ✓ | **4,71** ✓ | 3,05 ✗ |

Sobre a **areia** nenhum coral cumpre as duas obrigações — verifiquei os 17
tokens, e os nove fundos que cumprem são todos escuros. Sobre o **verde-escuro**
o coral cumpre as três. Logo o coral não é um token que faltasse: **é uma
composição**, e vive numa secção escura.

Foi o que a L1j fez: o `.bo-mkt__fecho` — o bloco de conversão final, em cinco
páginas — passou a escuro com CTA coral e rótulo verde-escuro. **A LP tem CTA
coral onde o coral funciona, e verde-escuro onde não funciona.**

O que fica registado como divergência é o CTA do **cabeçalho**, que continua
verde-escuro a 13,05:1 sobre a areia — e a razão é a tabela acima: naquele fundo
não há coral que passe. O `--bo-acento-sinal` a 3,50 corrigiria a fronteira e
**partiria o rótulo** (3,73 e 3,84, ambos abaixo de 4,5). Não é escolha entre
duas soluções verdes: uma delas está vermelha do outro lado.

### 2 · O herói da home a 38–41%

Medido na L1e e **não resolvido**: as duas composições do herói renderizam a
41% e 38% da largura a que foram capturadas.

**A causa é aritmética, não composição.** As capturas disponíveis são de 1440 e
1280; numa meia coluna de ~550 px, 550/1440 = 38%. Nenhuma disposição das
imagens actuais melhora isso — só uma captura mais estreita melhora.

**E é por isso que não a repeti.** A L1k tinha seis heróis para compor e a saída
óbvia era pôr mídia à direita em todos; teria multiplicado por cinco um defeito
já medido. A divisão editorial usa a largura sem mídia, e o herói da home fica
como está até haver captura à largura certa.

**O que a fecha:** recapturar a sala e o KDS em largura de meia coluna. O motor
existe (`capturar-demonstracao.mjs`) e o inquilino materializa-se a pedido — é
trabalho, não bloqueio. **Fica medida e por resolver, e é composição, que é
secção 7 e é do Matheus.**

---

## As capturas — 25, e quatro estados por explicar

`evidence/masters/mestres.json` + os PNG ao lado. Corrida com o inquilino de
demonstração semeado, servido e **limpo** no fim (`provar-mestres.sh`).

| mestre | viewport | principal | outros estados |
| --- | --- | --- | --- |
| M01 LP desktop | 1440 × 900 | ✓ es · pt · en | — |
| M02 LP mobile | 390 × 844 | ✓ es · pt · en | `erro` ✓ (o 404 desenhado) |
| M03 Backoffice | 1440 × 900 | ✓ es · pt · en | `denied` ✗ · `erro` ✗ |
| M04 Staff | 390 × 844 | ✓ es · pt · en | `vazio` ✓ · **`offline` ✓** · `erro` ✗ |
| M05 KDS | **1920 × 1080** + 1280 × 800 | ✓ es · pt · en | `vazio` ✓ · `offline` ✗ |
| M06 Carta pública | 390 × 844 | ✓ es | — |

### O offline do M04 é a melhor captura do lote

Não é uma imagem de uma promessa: é o quarto pilar da `/trust` a acontecer.

> *«Estamos sin conexión — Puedes seguir componiendo. Nada se envía hasta que
> vuelva.»* · **Sin enviar: 0** · «Nada pendiente en este teléfono.»

Compor continua, o ecrã **não chama enviado** a nada, e há uma contagem do que
está por sair **neste telefone**. E o controlo distingue-o de uma fotografia: com
a rede ligada a mesma rota dá 371 caracteres, sem rede dá 440. **O ecrã mudou
porque reparou.**

---

## Correcção: dois dos «defeitos do produto» eram a MINHA medição

Reportei três estados como falhas do produto. **Dois não eram.**

A minha captura usava `waitUntil: 'domcontentloaded'` e fotografava **antes** de
o ecrã de erro renderizar. Com espera pelo `load` e pelo corpo a ter texto:

| | o que reportei | medido com espera correcta |
| --- | --- | --- |
| `M03 denied` | «404 em branco, não há ecrã» | **414 caracteres, 20 929 de HTML, ecrã desenhado: SIM** |
| `M04 erro` | «404 em branco» | **373 caracteres, 17 852 de HTML, ecrã desenhado: SIM** |

O `NaoEncontrado.tsx` renderiza nos dois. **Escrevi que faltava um ecrã de
`denied` e o ecrã existe** — o branco era a minha velocidade de obturador. E
usei esses brancos como argumento de que o produto tinha uma lacuna.

**A hipótese do `not-found.tsx` na raiz também cai, e por medição:** o
`notFound()` deste caminho é lançado na **página**
(`unidades/[locationId]/page.tsx:51`), não num layout — o
`[idioma]/not-found.tsx` sempre foi o resolvedor certo. Nenhum dos dois tinha de
construir nada.

**E o `M05 offline` não é defeito.** A medição estava certa — 697 antes e 697
depois — e a leitura certa é a outra: o ecrã principal **não muda de propósito**,
e o estado vive em `kds/…/ligacao`, alcançável pela cápsula «Tu estación de
trabajo», com texto próprio e sobrevivendo a uma recarga. Fica pergunta de
desenho, não defeito.

---

## O único estado que sobra: o 500 do M03

`/{idioma}/app/{org}/organization/unidades/nao-e-um-uuid` → **500**, com a página
de erro por omissão do Next («This page couldn't load»), **em inglês numa rota
`es-ES`**.

**Não é colisão de build.** Repeti com `NEXT_DIST_DIR=.next-mestres`, directório
só meu, e o 500 mantém-se. A cura do `RV100-024` (`4d63b80`, 10:42:54) é
ancestral do meu HEAD e o meu build correu às 10:51:16 — estava lá.

**O caminho está ligado**, e é isso que torna o resultado interessante:

```
escopo.ts:131   apanha P2023 e lança  new IdentificadorMalFormado(causa)
sessao.ts:140   comEscopoDoPedido envolve em semIdentificadorMalFormado
sessao.ts:170   if (erro instanceof IdentificadorMalFormado) notFound();
```

**O que encontrei, e é facto:** existem **duas** verificações diferentes para a
mesma coisa, e não são equivalentes.

| onde | verificação | o que testa |
| --- | --- | --- |
| `sessao.ts:170` | `erro instanceof IdentificadorMalFormado` | identidade da classe |
| `servidor.ts:61` | `ehIdentificadorMalFormado(erro)` | `erro.code === 'P2023'` |

E a classe **não copia o `code`** (`escopo.ts:89-98`: guarda a causa em `causa` e
mais nada). Portanto `ehIdentificadorMalFormado()` devolve **falso** para uma
instância de `IdentificadorMalFormado`. As duas funções testam objectos
diferentes, e para um dado erro no máximo uma delas acerta.

A minha rota passa **só** pela primeira, porque `comEscopoDoPedido` usa
`obterPrisma` directo e não o `obterBaseDeEcra` estendido.

**Hipótese, e digo-o como hipótese:** o `instanceof` falha porque `@bossaos/db`
está em `transpilePackages` e a classe pode existir em mais do que uma instância
de módulo — o erro é criado numa e comparado noutra. É o modo de falha clássico
do `instanceof` num monorepo transpilado, e explica o que se vê: cura presente,
caminho ligado, e 500 na mesma.

**Não a confirmei e não corrijo isto.** Confirmar exige instrumentar a cura, e
a cura é do JR — mexer em tradução de erros por minha conta, no fim de um lote,
é a mesma classe de risco que me fez não tocar no `destino()`.

**A parte que vale para além deste 500:** a guarda do `RV100-024` conta *«128
páginas sob um segmento de id, 128 cobertas»*. Isso conta páginas que **usam o
invólucro** — não páginas que **devolvem 404** para um id mal formado. A minha
medição exercita o comportamento HTTP e discorda da guarda. Uma guarda que conta
a adopção do mecanismo e não o resultado dele fica verde enquanto o mecanismo
falha, que é a família de verde que esta casa persegue há dias.

---

## O que NÃO foi capturado, e porquê

- **`loading` em nenhum mestre.** A régua diz que um `loading` numa página que
  nunca carrega é uma página partida com o nome trocado, e o controlo que eu
  desenhei — só conta onde a MESMA rota deu `principal` — não chega a resolver o
  problema de o produzir de forma determinística sem falsear a rede. **Fica por
  capturar, e prefiro dizê-lo a entregar uma imagem com o nome errado.**
- **`empty` no M01/M02/M06.** Não se aplica: uma landing e uma carta publicada
  não têm estado vazio legítimo.
- **Gravações de interacção.** O §7 pede-as «quando o movimento for relevante».
  Não gravei nenhuma: o movimento relevante deste conjunto é a queda de rede do
  M04, e a captura fixa já mostra a mudança com o número ao lado.
- **Três línguas no M06.** A carta pública leva o idioma no **segundo segmento**
  do endereço (`/r/<casa>/<idioma>/menu`) e a semeadura publica um; capturei o
  que existe em vez de inventar rotas.

---

## Tokens e componentes

**45 tokens `--bo-*` definidos, 42 referenciados** — as famílias em uso nos
mestres são `espaco` (8), `publico` (5), `superficie` (4), `estado` (4),
`acento` (4), `texto` (3), `raio` (3) e `movimento` (3). A guarda
`validar-classes.sh` verifica, com controlo negativo, que nenhuma classe `bo-`
usada no JSX falta no CSS e que nenhuma variável de tema é inventada.

Componentes das telas-mestre: `MolduraMkt` (M01/M02), `EstruturaPublica` e
`NavegacaoDoSite` (M06), `PainelDaFila`, `OQueEsteAparelhoTem` e
`DiagnosticoDaLigacao` (M04), `NavegacaoDePedidos` (M03), `Composicao` e
`AvisoDeDemonstracao` (M01).

---

## Onde isto pára

Passos 1 a 4 do §7.1 estão feitos: implementado, corrido, capturado, indexado.

**Não emito `PRONTO PARA APROVAÇÃO VISUAL HUMANA`.** O passo 5 é de quem revê, e
o §12.4 diz que só o Matheus regista a aprovação. Além disso, **três estados do
produto estão por explicar e um deles é um 500** — emitir um «pronto» por cima
disso seria pedir uma aprovação sobre coisas que eu sei estarem partidas.
