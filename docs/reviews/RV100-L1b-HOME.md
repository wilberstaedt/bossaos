# Revisão do lote L1b — a home comercial

Entrega em `c33ad24`. Régua em `ALVO-RV100-MESTRES.md`, escrita antes.

---

## O melhor desta entrega não estava na lista: a FAQ mentia

O `faq4` dizia, nas três línguas, que **«a sala continua a trabalhar e sincroniza
quando a ligação volta»**. Verifiquei as duas metades e as duas eram falsas:

- **O service worker recusa guardar telas com dados de inquilino.** Está escrito
  no próprio ficheiro: *«a cache leva **só** o que não é de ninguém: os
  artefactos estáticos»*. Sem rede, a sala **não** continua a trabalhar.
- **Nada sincroniza sozinho.** O ouvinte de `online` troca o rótulo; o envio é um
  toque.

**Isto é mais grave do que um erro de composição, e é por isso que o ponho
primeiro.** Há duas noites verifiquei — pelo lado do produto — que o
`PainelDaFila` **nunca** diz «enviado» sobre o que só está no telemóvel, nas três
línguas, e chamei-lhe honestidade rara. **A página comercial estava a desfazer
essa honestidade**: o produto recusava-se a prometer e o marketing prometia por
ele. Um empregado que leia a FAQ antes de comprar espera uma sala que aguenta a
quebra de rede, e não é isso que compra.

O texto novo diz *«o que já está escrito não se perde: fica no próprio aparelho,
e nunca dizemos "enviado"…»* — que é o produto a falar com a sua própria voz.

**Fica aberto e ele di-lo:** a correcção foi verificada por leitura de código e
pelas provas existentes; **não correu uma prova nova de rede cortada**. É
NÃO MEDI, e concordo com a classificação.

---

## Os números do lote

| | antes | depois | régua |
| --- | ---: | ---: | --- |
| secções | 3 | **11** | 14 (§6.3) |
| altura rolável a 1440 | 1316 | **5511** | — |
| respiro desktop | 48 | **88–128** | 80–128 (§4.4) |
| respiro móvel | 48 | **56–64** | 56–80 (§4.4) |
| preços | 0 | **12 valores de `precoDoPlano()`** | §6.5 |

**Zero anomalias em 15 combinações** (5 larguras × 3 línguas): sem rolagem
horizontal, sem alvos abaixo de 44, sem elementos fora do ecrã, sem contrastes
sob o limiar. `marketing.spec.ts` 68/68 e **intacta** outra vez. Moldura
remedida a 83 px.

E os preços aparecem com a frase que faltava: *«El año cuesta diez mensualidades:
dos no se pagan»*, com o `10` a vir de `MENSALIDADES_NUM_ANO` e não escrito à
mão. Era exactamente a proposta comercial que estava escondida numa divisão.

---

## O 728 voltou, e não aplico a minha própria regra

A minha régua dizia: *«se o herói voltar a acabar em 728, não houve reconstrução,
houve retoque»*. **Voltou.** E não lhe chamo retoque, por duas razões.

**A primeira é que eu tinha escrito a saída, e ele usou-a.** A régua continuava:
*«se o motor de prova bloquear, quero ouvir isso — prefiro a home por fechar e o
bloqueio declarado do que o lado direito cheio de nada»*. É o que aconteceu:
reservar meia largura para mídia que não existe é construir de propósito o
defeito que o §10 reprova. **Aplicar a regra e ignorar a cláusula que eu próprio
escrevi seria fazer batota com a minha régua.**

**A segunda é que a régua, na home, não media nada — e ele provou-o.** A métrica
da linha de base faz

```js
if (r.width > 0 && r.height > 0) heroConteudo = Math.max(heroConteudo, Math.round(r.right));
```

sobre **todos** os descendentes. Qualquer bloco de largura total satura o
máximo. O `.bo-mkt__chamada` é um `<p>` — bloco — e por isso a home dava **1256
antes de ele tocar em nada**.

**Isso resolve o meu «número por explicar».** Registei-o como número por
explicar quando corrigi a linha de base, e a explicação é esta: **um herói vazio
e um herói cheio davam o mesmo 1256.** Nas seis páginas que deram exactamente
728 não há bloco de largura total no herói, portanto ali o número é real — a
métrica é válida onde não há bloco e cega onde há. Ele reescreveu-a para contar
só folhas com conteúdo, reproduziu os 728, e grava as duas lado a lado.

**Motor de prova: NÃO BLOQUEADO e NÃO FEITO**, e a distinção é dele e é boa. Ele
provou que capturar funciona — sete telas reais a 200 — e o que falta é o
conjunto de dados: as capturas mostram `insp-` nas mesas e `painel@inspeccao.example`.
Deixou o caminho da semente de demonstração levantado no changelog para não ser
redescoberto, incluindo a armadilha do `brand_id` que dá 404 ao dono. **Não a
construiu porque não cabia com verificação a sério**, e uma semeadura a meio dá
capturas partidas. Aceito, e é a decisão que eu teria tomado.

---

## O `?section=`: decidido, e não é defeito de produto

Está em `06_O_PORTAO_DE_COBERTURA.md`. Resumo: as três URLs servem o mesmo byte
por causa do `force-static`, ele mediu o md5 e **não decidiu sozinho**, o que foi
certo. A decisão é minha e é que **não há alteração de produto**: o atlas já
classifica o MKT-002 como «seção da landing page» e escreve que *«um endereço
partilhável não pode mudar com o que o visitante rolou»*. Servir o mesmo byte é
o comportamento correcto. O que mente é o `rota_sugerida`, que promete um
parâmetro que distingue.

Ele corrigiu o comentário que afirmava o contrário — **e o comentário era meu, na
instrução que lhe dei.**

## O que fica aberto

As outras sete páginas não foram tocadas nem remedidas. Metadados no §6.8, com o
diagnóstico já feito. Nada de teclado ou leitor de ecrã nos blocos novos. Faltam
3 dos 14 blocos do §6.3.

**Lote L1b fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
