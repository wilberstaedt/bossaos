# Régua do bloco 4, escrita antes de o trabalho começar — 08/09, 15h35

O bloco 4 (§4.5, «Para cada pessoa, a tela certa») ainda nem arrancou. Escrevo a
régua agora pela mesma razão da do bloco 2: **uma régua escrita depois tende a caber
no que foi feito**, e aqui há um risco extra — a acessibilidade é fácil de dar por
satisfeita ao olhar, e só se prova a exercer.

## O que tem de estar verdadeiro

| # | exige | instrumento | limiar |
|---|---|---|---|
| 1 | os quatro papéis que o norte nomeia: **gestor, salão, cozinha, cliente** | texto do bloco | **4**, com esses sentidos |
| 2 | **um ecrã por papel** | contagem de `img` no bloco | **≥ 4** (hoje é **1**) |
| 3 | ao trocar de papel, **troca o screenshot E o benefício** | trocar e comparar `src` e texto antes/depois | ambos mudam |
| 4 | alternável **por teclado** | `Tab` até ao selector, setas ou `Enter`, e o painel muda | funciona sem rato |
| 5 | alternável **para leitor de ecrã** | `role="tablist"`/`role="tab"`, `aria-selected`, `aria-controls` | presentes e coerentes |
| 6 | crops **legíveis** | escala × 14 px | **≥ 11 px no ecrã** |
| 7 | **não são quatro cartões de texto** | um painel visível de cada vez | **1** visível |
| 8 | **nenhuma guarda afrouxada** | `git show --name-only` | zero em `scripts/validar`, `scripts/provar`, `inspeccao/` |

## O critério 3 é o que separa isto de um carrossel de fotografias

O §4.5 diz «ao trocar papel, **troque screenshot e benefício**». Trocar só a imagem
faz uma galeria com legendas; trocar só o texto faz quatro parágrafos com uma
fotografia decorativa. **São as duas coisas a mudar juntas que fazem o bloco dizer o
que promete**: que cada pessoa vê uma tela diferente da mesma base.

## E o 4 e o 5 não se aceitam por inspecção

Já vi hoje, mais do que uma vez, uma coisa parecer certa numa captura e não estar. Um
`role="tab"` no HTML não prova que o teclado funciona, e teclado a funcionar não prova
que o leitor de ecrã anuncia a mudança.

**Exercer, não ler:** carregar `Tab` até lá, mudar de painel, e confirmar que o
conteúdo mudou. Se não der para exercer, a resposta é **NÃO MEDI** — não «parece
bem».

## O que esta régua não decide

Se o bloco é bonito, e se os quatro papéis são os quatro certos para o negócio dele.
O primeiro é da Nathalia; o segundo, se o JR achar que os quatro nomeados no norte
não são os do BossaOS real, **é achado e vem a mim** — não se corrige um documento do
Matheus por iniciativa nossa.

---

## Resultado, medido contra esta régua — 08/09

Entrega em `428b0c5` e `23a4bb2`. Prova: `inspeccao/rv100-papeis.spec.ts`.
Controlo negativo: `scripts/provar-rv100-papeis.sh`.

| # | exige | medido | veredicto |
|---|---|---|---|
| 1 | quatro papéis | 4 separadores, 4 nomes distintos, nas 3 línguas | **ok** |
| 2 | um ecrã por papel | `imagens_no_bloco=4`, `imagens_distintas=4` | **ok** |
| 3 | troca o ecrã **e** o benefício | 4 `src` distintos **e** 4 textos distintos | **ok** |
| 4 | por teclado | `Tab` desde o topo: **12** até ao selector; setas trocam; foco acompanha | **ok** |
| 5 | leitor de ecrã | 1 `tablist`, 1 `aria-selected`, 0 `aria-controls` órfãos | **ok** |
| 6 | crops legíveis | 12 medições: **13,0 px** nos papéis 1-3 e **21,4 px** no 4 (pede 11) | **ok** |
| 7 | um painel visível | `1` | **ok** |
| 8 | nenhuma guarda afrouxada | `validar-classes` 0 falhas; nada tocado em `scripts/validar` | **ok** |

**O critério 4 e o 5 foram exercidos, não lidos.** A prova carrega `Tab` a partir
do topo do documento, sem foco programado — chegar ao selector custa 12 tabulações
— e depois setas, e mede o que mudou **no ecrã**. Um `role="tab"` no HTML nunca é
aceite como resposta.

**O critério 3 recusou:** com as quatro composições iguais, a prova fica vermelha
com «1 imagens distintas nos quatro papéis», e o guião confirma o **motivo** do
vermelho — um vermelho por a página não abrir provaria outra coisa.

### O que reutilizei, e porquê não construí

O `Separadores` de `packages/ui` já existia, com `tablist`, `aria-selected`,
`aria-controls`, `tabIndex` rotativo e setas com `Home`/`End`. Construir um
selector novo seria **uma segunda forma de fazer o que o pacote já faz**.

### O par papel-ecrã não é estético

A cópia de cada papel nomeia o artefacto: «o catálogo, os preços» → `catalogo`;
«em pé e com uma mão» → `tablet`, cujo `alt` diz «o aparelho que fica na mão de
quem serve»; «uma tela com o que tem de preparar» → `kds`; «lê o cardápio» →
`carta`. A `sala` fica de fora: já é o herói.

### Três defeitos apanhados pelo caminho, os três meus

1. **O `sizes` prometia 390 px para uma ranhura de 477** — sondado, não estimado.
   O navegador ampliava 1,22×. Corrigido para `40vw`: passa a reduzir 0,93×.
2. **A minha medição do critério 6 lia painéis escondidos pelo atributo `width`**
   em vez da caixa, e dizia «51,7 px efectivos» sobre um painel fora do ecrã. Foi
   um `1440` impossível num visor de `1280` que me mandou sondar.
3. **A moldura deixava ~230 px de vazio** ao lado de um benefício de cada vez —
   visto na captura. Desceu de 520 para 420.

### Declarado, e por decidir

- **O quarto papel amplia 1,53×** (composição móvel de 312 px numa caixa de 477).
  Passa o critério 6 porque ampliar conta como «mais legível» na fórmula da
  régua, mas continua a ser desfoque. **Não invento um limiar que a régua não
  tem** — fica para o sénior.
- **Sobra vazio na coluna do texto**, menor que antes. É composição, e a régua
  diz que se o bloco é bonito é da Nathalia.
- **As capturas são em `es-ES`**, quatro, à largura a que são mostradas (1280;
  a secção sai a 1200). Dossiê `docs/visual/rv100/2026-09-08_papeis`, a retratar
  `23a4bb2` pelo carimbo do próprio manifesto.

---

## A revisão do sénior — 08/09, corrida por mim e não lida

Corri `scripts/provar-rv100-papeis.sh` eu próprio. **À primeira, ficou vermelho** — e
não pela obra: a minha shell não tinha `DATABASE_URL`. Fica o que importa disso:

**O guião não me deu falso verde.** Detectou «já estava vermelho antes do plante — o
controlo não diria nada» e recusou-se a concluir seja o que for. Um controlo negativo
que concluísse dali estaria a certificar o meu ambiente, não o produto.

### Um achado real: a prova só passava na shell de quem a escreveu

**77 dos 85 guiões `provar-*` carregam o `.env` explicitamente. Este era um dos 8 que
não carregavam.** Dos 8, só **2** correm playwright e portanto precisavam mesmo —
este e o `provar-marco-e11.sh`, que é meu. Contei os 8 e fui medir quais precisavam,
em vez de os declarar todos partidos: hoje já derivei três números de listas escritas
à mão e os três estavam errados.

Ambos levaram a linha da convenção local. Depois disso, **da mesma shell limpa que
tinha falhado**:

    TECLADO es-ES tabs_ate_ao_selector=12
    AMBITO es-ES separadores=4 imagens_no_bloco=4 imagens_distintas=4
                 beneficios_distintos=4 nomes_distintos=4     (idem pt-BR e en)
    2. Com as quatro composições IGUAIS  →  recusou pelo motivo certo:
       «1 imagens distintas nos quatro papéis»

Os critérios **1, 2, 3 e 4 estão verificados por mim**, ao vivo, com o plante
exercido. O critério 3 — o decisivo — recusa mesmo.

### Um alarme meu que era falso

Contei **2 `expect(`** no ficheiro e quase escrevi que os critérios 5, 6 e 7 não eram
medidos. **Contar `expect(` não é contar o que se mede:** a prova acumula num vector
`falhas[]` e afirma uma vez no fim, o que é melhor do que muitos `expect` porque
reporta tudo de uma vez. Os três estão lá, e há ainda uma guarda `POPULACAO-ZERO`
explícita contra verde sobre nada.

### Correcção à régua: o meu critério 8 estava mal escrito

Escrevi «zero ficheiros em `scripts/validar`, `scripts/provar`, `inspeccao/`». O
`git show` acusa três — e os três **nasceram** nestes commits: são as provas.
Acrescentar uma prova não é afrouxar uma guarda. **A redacção certa é «zero guardas
PRÉ-EXISTENTES modificadas»**, e medida assim (`--diff-filter`, A contra M) o
resultado é zero. Fica corrigido aqui em vez de o critério continuar a acusar quem
escreve provas novas.

### E uma cegueira da régua que a entrega expôs

**O critério 6 mede o tamanho do texto e nunca mede se os píxeis são reais.** Medi as
quatro fontes:

| papel | ficheiro | natural | numa ranhura de 477 |
|---|---|---|---|
| 1 catálogo | `catalogo-1440.png` | 1440×900 | 0,33× — reduzida, nítida |
| 2 tablet | `sala-tablet-834.png` | 834×1112 | 0,57× — reduzida, nítida |
| 3 KDS | `kds-cozinha-1280.png` | 1280×800 | 0,37× — reduzida, nítida |
| 4 carta | `carta-movel-390.png` | **390×844** | **1,22×+ — AMPLIADA** |

Uma ampliação **passa** no critério 6: o texto fica maior, e mais borrado. A régua
premiava exactamente o defeito. **Passa a valer também: escala ≤ 1,0** — nunca
ampliar, porque não há como inventar píxeis que não foram capturados.

E há um segundo lado, de forma e não de nitidez: `carta-movel-390.png` é 390×844,
**retrato de telemóvel**, esticado numa ranhura de paisagem. A vista do cliente é
mesmo um telefone — recapturá-la larga seria mentir sobre o produto. O caminho é
mostrá-la **ao tamanho dela, numa moldura de telefone**, e não esticada.

**Vai para o JR, não para mim:** o bloco 4 é código dele, e quem revê não assina o que
escreveu. Eu corrigi a régua; a moldura corrige-se do lado de lá.
