# Régua da barra lateral do backoffice

> **Escrita a 07/09 às 13h20, ANTES de ver a entrega.** É a única altura em que
> uma régua não pode ser desenhada à volta do que já foi feito. Se um critério
> aqui for injusto, corrige-se **por escrito e com a razão**, não em silêncio ao
> confrontá-lo com a entrega.

O Matheus disse «esses menus laterais estão feios» e pediu que se resolvesse
antes de propagar. Por baixo do juízo estético eu medi **três defeitos
funcionais**; a régua cobre os cinco pontos que lhe passei, e cada um traz o que
o faria REPROVAR.

---

## 1 · O item activo segue a rota

**Passa se:** em três rotas diferentes do backoffice, o `aria-current="page"`
cai no item que corresponde à rota, e em **exactamente um** item.

**Reprova se:** cair sempre no mesmo item (o defeito de hoje é
`i === navegacao.length - 1`), se cair em nenhum, ou se cair em dois.

**Controlo negativo, e é este que importa:** uma rota do backoffice **que não
tem item no menu**. Aí o correcto é **zero** `aria-current` — não o último, não
o primeiro, não o «mais parecido». Se um fallback acender alguma coisa, o
defeito só mudou de forma.

**Armadilha declarada:** um `startsWith` no href faz `/ir/sala` acender também
em `/ir/salaX` e faz o item raiz (`/app/[orgSlug]`) acender em **todas** as
rotas, porque toda a gente começa por ele. Se a implementação usar prefixo, a
prova tem de incluir a rota raiz e uma irmã com prefixo comum.

## 2 · A barra inferior do telemóvel

O mesmo, e pela mesma razão: hoje tem `activa: true` fixo. Mesma prova, mesmo
controlo negativo.

## 3 · O trocador mostra uma UNIDADE

**Passa se:** o texto renderizado no cartão de topo não contém `@` e é o nome de
uma unidade.

**Reprova se:** continuar a mostrar o email, **ou** se mostrar uma cadeia vazia,
ou um traço, ou «—» a fingir que há dado.

**Se não houver unidade resolvida no contexto, a resposta certa é dizer-mo**, e
não escolher a primeira que aparecer nem inventar um rótulo. Um trocador que
mostra a unidade errada é pior do que um que declara não saber: alguém muda um
preço na casa errada.

## 4 · Uma família de ícones, um ícone por item

**Passa se:** os 14 itens têm **14 formas distintas**, todas em `viewBox` de 24,
traço de 2 px, `currentColor`, e `aria-hidden` (o rótulo já está no texto — um
ícone decorativo que se anuncia lê a mesma coisa duas vezes).

**Como se mede, e é mecânico:** extrair a geometria de cada ícone do HTML
renderizado e contar as **distintas**. `14 distintas em 14` passa; `1 em 14` é o
estado de hoje.

**Controlo negativo:** duplicar dois ícones de propósito e confirmar que a
contagem cai para 13. Sem isso, um contador que devolve sempre o total do array
passaria à mesma. **Um contador de distintos que nunca viu um duplicado não
provou que sabe vê-los.**

**Fronteira:** não julgo se os ícones são bonitos — julgo que são **distintos,
consistentes e do tamanho certo**. Bonito é do Matheus, e ele que o diga sobre a
recaptura.

## 5 · O activo indica sem gritar

**Passa se:** o verde-lima deixa de ser **fundo cheio** do item e passa a sinal,
e o par texto/fundo do estado activo é **medido** e cumpre o mínimo.

**Reprova se:** o contraste for presumido. **Um rácio é propriedade de um PAR** —
já me custou isto uma vez esta noite, quando uma correcção do acento arrumava a
fronteira e partia o rótulo. Trocar o fundo do activo muda o par: tem de ser
remedido depois da mudança, e não antes.

**Reprova também se** o novo estado activo só se distinguir por cor. Cor sozinha
não é indicação suficiente; tem de haver peso, forma ou marca a acompanhar.

---

## O que NÃO conta como prova, nesta régua

- **«O typecheck passa.»** Nenhum dos cinco defeitos é de tipos: o
  `i === length - 1` compila perfeitamente, e o email na prop `unidade` é uma
  `string` que cabe onde outra `string` era esperada. **O tipo estava certo e o
  valor estava errado** — é precisamente o buraco que um typecheck não vê.
- **Uma captura nova sem o antes ao lado.** Pedi-lhe antes e depois, e é por
  isto: uma captura sozinha mostra o que ficou, não o que mudou.
- **A minha palavra.** Recapturo eu e meço eu, e o que o Matheus aprova é a
  imagem, não a minha descrição dela.

---

## Previsão registada ANTES de medir — 07/09 às 13h35

A sonda `scripts/validar-icones-da-navegacao.mjs` está escrita e o **controlo do
contador já acendeu**: dado um conjunto de 4 formas com um duplicado plantado,
ele conta 3. Isso prova que sabe ver duplicados — e provou-o **antes** de alguma
vez olhar para o produto.

Não a corri contra o produto porque o JR está a construir, e duas construções
escrevem o mesmo `.next`. A sonda sai a **NÃO MEDI** em vez de disputar o build,
que é o comportamento certo.

**Registo então o que ela TEM de dizer sobre o estado de hoje, antes de o poder
ver:**

> Contra o produto **antes** da correcção: `FALHOU`, com **1 forma distinta em
> 14 itens**.

Se, quando houver servidor, ela disser outra coisa sobre o código não corrigido,
**o defeito é da sonda e não do produto** — e quero sabê-lo antes de a usar para
aprovar o trabalho de outra pessoa. Uma previsão escrita antes da medição é a
única forma de um instrumento novo poder falhar à minha frente.
