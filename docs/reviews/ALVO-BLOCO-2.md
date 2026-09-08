# Régua do bloco 2, escrita ANTES de ver a entrega — 08/09, 15h20

O JR está a construir. **Escrevo isto agora, sem ter visto nada do que ele fez**, e a
razão não é cerimónia: uma régua escrita depois de ver o trabalho **tende a caber no
trabalho**. Foi assim que a primeira etapa do BossaOS passou à primeira — contrato e
régua antes, não depois.

Se alguma linha desta régua for injusta, prefiro descobri-lo a discutir com ele do
que a descobri-lo a ajustar o critério até a entrega passar.

## O que tem de estar verdadeiro, e como se mede

| # | exige | instrumento | limiar |
|---|---|---|---|
| 1 | quatro **crops da interface**, não cartões de texto | `medir-quatro.mjs`, contagem de `img` no bloco | **≥ 4** |
| 2 | **a mesma comanda** nos quatro | **manifesto da captura**, não a minha vista (ver abaixo) | **4 iguais** |
| 3 | crops **legíveis**, não encolhidos | escala da captura × 14 px | **≥ 11 px no ecrã** |
| 4 | uma frase por passo, **até 16 palavras** | contagem de palavras nos quatro parágrafos | **≤ 16** cada |
| 5 | **linha de ritmo** a ligar os quatro | existe elemento visual contínuo entre eles | presente |
| 6 | móvel em **narrativa vertical com progresso** | a 390: quatro passos empilhados, ordem visível | presente |
| 7 | **nenhuma guarda afrouxada** | `git show --name-only` do commit | **zero** ficheiros em `scripts/validar`, `scripts/provar`, `inspeccao/` |
| 8 | nada partido à volta | `pnpm verificar` e as guardas de conteúdo | **≤ 17 erros**, guardas a 0 |

## O que esta régua NÃO decide

**Se ficou bonito.** Isso é do Matheus e da Nathalia, e já aprendi hoje — por três
retractações — que a minha leitura visual através de capturas não é de fiar. Estes
oito são o **piso**: passá-los não faz o bloco bom, só impede que seja reprovado por
uma razão que se podia ter medido.

## Duas armadilhas que eu próprio vou ter de evitar ao rever

1. **Não aceitar o desaparecimento de um vermelho como prova.** Um desvio some-se
   também quando se apaga o elemento que o gerava. O que conta é o contador do lado
   certo **subir** — foi assim que aceitei o teste do `criarUtilizador`, pelo 39 → 40
   e não pela ausência da falha.
2. **Declarar a largura em cada medição.** Hoje reportei uma altura de cabeçalho como
   violação geral quando era desvio só a 390. A fita já força isto; eu é que tenho de
   ler o que ela escreve ao lado.

## O critério 2 é o que decide, e digo porquê

Quatro imagens bonitas de quatro ecrãs diferentes satisfariam o critério 1 e **não
seriam o bloco**. O §4.3 pede «**uma única comanda demonstrativa real** atravessa Mesa
→ Cocina → Pase → Caja» — é a **mesma** comanda que transforma quatro capturas num
percurso. Sem isso é uma galeria, e uma galeria é o anti-padrão com imagens em vez de
parágrafos.


---

## Emenda ao critério 2, antes de haver entrega — 15h50

Escrevi «leitura das quatro imagens: o identificador do pedido tem de coincidir». Fui
reler e **isso põe o critério que decide a depender dos meus olhos** — os mesmos que
hoje leram um rectângulo vazio onde havia uma imagem a carregar, um corte onde havia
um canto arredondado, e três vezes um número errado.

**Um critério que só eu consigo verificar a olho não é um critério: é uma opinião com
número.**

**Como passa a medir-se:** o corredor que produz as capturas **regista, por captura,
qual a comanda que estava no ecrã** — o identificador que já existe nos dados
semeados. O critério 2 passa a ser uma comparação de quatro cadeias de texto, e
qualquer pessoa a repete.

Se o corredor não conseguir registar isso, a resposta ao critério 2 é **NÃO MEDI** — e
um bloco cujo critério decisivo não se mede não fecha. **Não o dou por satisfeito
porque as imagens me parecem a mesma comanda.**

Isto é preparação, não exigência nova: prefiro descobrir agora que o critério não era
mensurável do que descobri-lo no momento em que tenho a entrega à frente e vontade de
a aceitar.
