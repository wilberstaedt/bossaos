# Revisão da tela «Mesas em tempo real» — 08/09 01h40

> Feita **a olhar para as capturas**, que é o instrumento certo para esta
> pergunta. O JR chegou a 100 % de contexto antes de as poder rever, e elas
> estavam por comitar.

## O que passa, e passa bem

- **A barra lateral é o §7.1**: verde profundo, agrupada em `OPERACIÓN` /
  `ABASTECIMIENTO` / `NEGOCIO`, com **barra coral** no item activo — e não o
  bloco lima que o norte recusa.
- **A condição 9 está atacada de verdade.** Deixou de ser uma `<ul>` de texto:
  são cartões com **estado, capacidade, duração e responsável**, e a **borda
  codifica o estado** — coral para ocupada, escura para reservada.
- **Resumo pequeno** presente: livres, serviços abertos, reservada, a pedir a
  conta.
- **A condição 10 passa:** o telemóvel tem navegação **própria** — hambúrguer e
  barra inferior — e não é a barra lateral comprimida.

## Três coisas que reprovam, e a primeira salta à vista

### 1 · Todo o texto dentro dos cartões é uma ligação sem estilo

`insp-07`, `insp-Terraza · 4 pax`, `Ocupada · 1:29`, o email — **tudo a azul e
sublinhado**, o azul por omissão do navegador. O resto da página **está**
estilizado (barra lateral, título, pílulas, bordas dos cartões), portanto o CSS
carregou: **falta a regra para as âncoras dentro do cartão.**

É o defeito mais visível da tela e é o primeiro que a Nathalia vai ver.

### 2 · Um email aparece no mapa de mesas

`inspeccao@exemplo.example`, repetido em **cada mesa ocupada**. O §7.2 diz
**«sem expor PII indevida»**. O responsável identifica-se por nome, nunca por
endereço — e num ecrã de parede de uma sala, menos ainda.

### 3 · No telemóvel, as sete pílulas comem o primeiro ecrã inteiro

Empilham em **sete linhas** e **não se vê uma única mesa acima da dobra**. O
§7.2 pede «filtros e acções secundárias sem virar dez pílulas»; sete que ocupam
todo o primeiro ecrã falham o espírito e quase a letra.

**No telemóvel, um mapa de mesas que não mostra mesas não é um mapa de mesas.**

## Uma observação que NÃO é defeito

Os dados são as fixtures `insp-*`. Para uma captura está certo — **mas o §7.2
pede «dados demo identificados como demonstração»** e não há rótulo nenhum a
dizê-lo. Fica como pendência da tela, não como erro da captura.

## O que isto não decide

Nada do §11. **Isto é o piso medível.** Se a Nathalia gostar, gosta apesar
destas três; se não gostar, estas três não são a razão — mas seriam se ficassem.
