# Acessibilidade dinâmica — medida no navegador

Gerado por `scripts/validar-acessibilidade-dinamica.sh` em 2026-09-07 08:38.
A metade estática está no `07_INDICE_DE_EVIDENCIAS.md`; esta é a que exige navegador.

| o quê | medida | resultado |
| --- | --- | --- |
| menu móvel devolve o foco ao accionador | 1 menu (o único do produto) | conforme |
| anel de foco vs. fundo de trás do anel | 62 focáveis, 3 superfícies | conforme, mínimo 3:1 |
| acções principais alcançáveis com Tab | 18/18 | conforme |
| 200% de zoom sem rolar na horizontal | 3 superfícies | conforme |

## O que NÃO está aqui

- Superfícies com sessão (painel, TPV, KDS): esta prova corre no projecto
  `chromium`, sem sessão. É dívida declarada, não cobertura.
- Foco preso em modal: **o produto não tem modais.** O `Dialogo` é importado
  por um ficheiro só, o catálogo de desenho. Medido em `docs/reviews/RV100-FOCO.md`.

## Porque é que se pode acreditar nos zeros

Cada um dos quatro detectores tem sonda própria, que lhe planta na página o
defeito que ele deve encontrar e exige que o encontre — um menu que não
devolve o foco, um anel branco sobre branco, uma acção com `tabindex=-1`, e
2000 px numa janela de 640. As quatro acenderam nesta corrida.
