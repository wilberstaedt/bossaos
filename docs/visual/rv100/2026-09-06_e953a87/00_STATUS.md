# RV100 — estado

## ENTRADA AUTORIZADA — 07/09, 02h

A condição que me travava está cumprida, e não fui eu que a interpretei a meu
favor: **o número mudou.**

| | ontem, 08h | agora |
| --- | --- | --- |
| etapas | 34/36 | **36/36** |
| telas | 396/396 | 396/396 |
| E34 | por fechar | **validado** com varredura no momento da assinatura |
| E35 | por fechar | validado |

O RV100 exige, no cabeçalho: *«após todas as etapas funcionais planejadas serem
declaradas concluídas»*. **Estão.** Escrevi neste mesmo ficheiro, de manhã, que
não resolvia a tensão sozinho — não a resolvi: esperei que ela deixasse de
existir.

**O que autoriza a entrada não é a ordem do Matheus** — ele mandou-me arrancar e
eu teria arrancado na mesma. É o facto de a condição escrita estar cumprida e
medida. As duas coisas coincidiram; se não coincidissem, dizia-lho.

### O estado, dos seis que o documento obriga a escolher

`RV100 EM RECONSTRUÇÃO`.

Entro pela secção 3 — direcção de marca — porque a **secção 2 está feita**: o
diagnóstico das oito páginas comerciais a 1440 px, com as 13 hipóteses medidas e a
evidência em `evidence/baseline/`.

### E o que fica travado por desenho

A **secção 7** tem portão de aprovação humana. Faço as secções 3 a 6, produzo as
telas-mestre e a evidência visual, e **paro**. O documento diz, no ponto 5, que
*«o Claude não pode declarar sozinho que a estética foi aprovada»* — e essa é a
única linha deste plano que nenhuma ordem levanta, porque é ela que protege quem
manda de mim.


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

## Base funcional guardada (§1.4.2)

| medição | resultado |
| --- | --- |
| `validar-no-commit.sh` — 27 guardas sobre o COMMIT | 0 falhas, 1 NÃO MEDI declarado |
| `provar-plataforma.sh` | 0 falhas, 8 controlos |
| `provar-plataforma-no-navegador.sh` | 0 falhas, 25 casos, 7 controlos |
| `provar-separacao-de-credenciais.sh` | 0 falhas |

**É contra isto que qualquer regressão visual será medida.** Um frontend mais
bonito com comportamento perdido é reprovação — está no §1.4.

---

## 07/09 — secção 6 aberta: groundwork entregue, código intocado

`RV100 EM RECONSTRUÇÃO`. O bloco lá em cima que diz «`RV100 EM RECONSTRUÇÃO` —
**não**» é de ontem de manhã, quando a condição de entrada ainda não estava
cumprida. **Fica escrito e fica superado** — apagá-lo era esconder que o estado
mudou por uma razão datada, e é a razão que interessa.

| entregue | onde |
| --- | --- |
| as oito páginas comerciais medidas contra o enunciado do §6, uma a uma | `05_MARKETING_AND_CONVERSION.md` |
| composição separada de conteúdo, e o conteúdo que não é meu separado do que é | idem, secção 3 |
| ordem de reconstrução em oito lotes, home primeiro, com a razão | idem, secção 4 |
| cinco divergências novas entre o enunciado e as fontes | idem, secção 5 |
| 20 achados no formato do §11.4 — 8 P1, 6 P2, 5 P3, 1 aceite | `11_OPEN_FINDINGS.md` |

**Nenhuma página comercial foi alterada neste lote, e nenhum token foi tocado.**
A evidência usada é a que já existia em `evidence/baseline/`; não gerei capturas
novas, porque gerar evidência que já existe é trabalho a fingir.

O que fica em pé antes do primeiro lote de código: cinco achados esperam decisão
do Matheus (RV100-011, 013, 014, 015 e a metade legal do 005) e nenhum deles
bloqueia o lote L1.
