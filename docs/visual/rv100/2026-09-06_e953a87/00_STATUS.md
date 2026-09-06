# RV100 — estado

`RV100 EM RECONSTRUÇÃO` — **não**. O estado real é o de baixo, e o documento
obriga a usar exactamente um dos seis. Ainda não estou em nenhum deles, porque a
condição de entrada não está cumprida. Fica escrito assim em vez de escolher o
que dava jeito.

## Onde isto começou

| | |
| --- | --- |
| commit | `e953a8770c02d3d0292292471e62768db41bf3e9` |
| ramo | `main` |
| data | 2026-09-06 |
| etapas | 34/36 — **faltam o E34 e o E35** |
| telas | **396/396 validadas** |

## A tensão de ordem, e porque não a resolvo sozinho

O RV100 diz, no cabeçalho: *«Momento de uso: após todas as etapas funcionais
planejadas serem declaradas concluídas»*. **Não estão** — faltam duas.

O `DEPOIS-DOS-100.md`, que escrevi a pedido do Matheus às 03h30, diz o
contrário: RV100 primeiro, *«só depois o E34 e a fila»*.

Os dois vêm dele. O §1.3 do próprio RV100 manda não escolher em silêncio a
versão mais conveniente, por isso **está escrito aqui e foi-lhe perguntado**.

**O que faço entretanto:** a secção 2 — o diagnóstico inicial obrigatório. Não
altera código nenhum, o documento manda fazê-la antes de qualquer CSS, e é útil
seja qual for a ordem que ele decidir.

## Base funcional guardada (§1.4.2)

| medição | resultado |
| --- | --- |
| `validar-no-commit.sh` — 27 guardas sobre o COMMIT | 0 falhas, 1 NÃO MEDI declarado |
| `provar-plataforma.sh` | 0 falhas, 8 controlos |
| `provar-plataforma-no-navegador.sh` | 0 falhas, 25 casos, 7 controlos |
| `provar-separacao-de-credenciais.sh` | 0 falhas |

**É contra isto que qualquer regressão visual será medida.** Um frontend mais
bonito com comportamento perdido é reprovação — está no §1.4.
