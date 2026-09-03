# Alvo da revisão do E02

> **Escrito antes de ver a entrega.** O `docs/progress/E02.md` ainda não existe no
> momento em que gravo isto — o JR está a escrever o registo da etapa. Isto é
> deliberado: uma lista tirada daquilo que a entrega calhou de fazer não é uma revisão,
> é uma justificação. Derivado de `PROMPTS_COMPLETOS.md` (E02), CT-13 e CT-15.

## Suspeita pré-registada

No terminal do JR, durante o E02, li esta sequência:

1. «Playwright inspection reveals focus trap failure in dialog component»
2. «o foco sai do diálogo à segunda tabulação»
3. «Focus trap test corrected to validate reachability not containment»

**Um teste encontrou um defeito e a seguir o teste foi alterado.** Pode ser legítimo —
"containment" é de facto a asserção errada se o diálogo é não-modal, e nesse caso o teste
é que estava mal. Ou pode ser o teste a ceder ao componente.

Não decido isto por leitura da mensagem. **Corro a versão anterior da asserção contra o
componente actual**: se o diálogo é modal e o foco sai à segunda tabulação, o defeito é
real e a correcção foi no sítio errado. Se é não-modal por desenho documentado, a
asserção antiga é que estava errada — e então quero ver **onde está documentado** que é
não-modal, escrito antes deste tick.

O critério de aceite do E02 diz literalmente: *foco em diálogo e retorno ao accionador*.
Retorno ao accionador é a segunda metade e é fácil de esquecer — verifico as duas.

## O que re-corro eu, sem pipes, a ler o código de saída

- `pnpm verificar` inteiro, e `./scripts/validar-cobertura.sh` — o meu, não o relato dele.
- A suite de tokens **com um token alterado à mão**. Se continuar verde, não testa nada.
- Playwright meu, em 360, 390, 768, 1280 e 1440.

## O que meço eu próprio no DOM

| Verifico | Critério | Onde falha silenciosamente |
| --- | --- | --- |
| Tokens | Os 9 hex do CT-13, exactos | Um token "aproximado" passa a olho |
| Alvos de toque | 44 px público, 48 px operação | `padding` visual sem área real de toque |
| Contraste | 4.5:1 texto, 3:1 gráfico | **Coral `#F5664D` sobre areia `#F7F4EC` dá 2.77 — reprova gráfico.** Já medi. Se o acento aparecer como borda, ícone ou barra sobre areia, é defeito |
| Foco | Visível, e volta ao accionador ao fechar | Um `outline: none` num reset |
| Conteúdo longo | ES/PT/EN sem corte nem acção inalcançável | O alemão-do-espanhol: "Configuración" em botão estreito |

## O que confirmo por leitura

1. **Logos**: usa `brand/logoname.png` e `brand/logoicon.png`. O símbolo rejeitado não
   reaparece. (A D01 do ADR 0001 foi corrigida por causa disto.)
2. **Seis IDs e só seis**: STATE 001-003, 005, 007, 016 mudam de estado no `coverage.csv`.
   Um sétimo ID mexido é tão defeito como um em falta.
3. **Demonstração fora das rotas comerciais** — o catálogo de componentes não é uma página
   do produto.
4. **Espanhol é o inicial**, e texto de interface está separado de tradução de produto.
   Um único ficheiro a misturar os dois falha o CT-13 mesmo que a UI pareça certa.
5. **Nenhum número inventado em dashboard.** O prompt proíbe-o explicitamente. Procuro
   literais numéricos nas estruturas.
6. **Tema público só toca tokens permitidos**; foco, grelha, tipografia e administração
   ficam no sistema fixo.

## O que não aceito como prova

- «O build passou.» Não é acessibilidade nem fidelidade visual.
- «As capturas estão em `docs/progress/capturas`.» Existirem não é terem sido comparadas.
  Comparo-as com o atlas pp. 2-4 e o manual pp. 15-20, e digo o que diverge.
- Um teste de contraste que só corre nos pares que já se sabe que passam.

## Veredicto possível

`validado` · `implementado aguardando validação` (com a lista do que falta) · `reprovado`.
Não existe "validado com ressalvas": ou a etapa está fechada ou está aberta.
