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

O que fica em pé antes do primeiro lote de código: **nada espera por ele.** O
`00_AUTORIZACAO.md` destrava as escolhas comerciais da landing por antecipação —
o hero inglês e a linguagem de equipamentos avançam assim. Dois avançam só até
onde podem, e não por formalismo: o piloto sai sem nome de terceiro (consentimento
de outra pessoa não é pendência dele) e a privacidade sai como estrutura sem texto
dado por revisto.

---

## §7.1 — condição de paragem cumprida, 07/09 às 11h55

| passo | estado |
| --- | --- |
| 1 · testes e acessibilidade aplicáveis | feito — acessibilidade estática e dinâmica medidas, guardas verdes contra o commit |
| 2 · **preview verificável** | **publicado**: https://claude.ai/code/artifact/8f11a092-444c-4e33-bff1-3b4b772a1e4e |
| 3 · `02_MASTER_SCREENS_REVIEW.md` | existe, e traz a retractação das duas «avarias» que eram medição |
| 4 · indexar as evidências | feito — 25 capturas, 6 mestres, 3 línguas, 25/25 frescas |
| 5 · emitir | **PRONTO PARA APROVAÇÃO VISUAL HUMANA** |
| 6 · parar | é aqui |

**Emito `PRONTO PARA APROVAÇÃO VISUAL HUMANA` e mais nada.** Só o Matheus regista
a `APROVAÇÃO VISUAL HUMANA`. Silêncio, ausência de comentário ou aprovação minha
não libertam o rollout — e se houver reprovação, ajusto os mestres e reapresento
**o conjunto afectado inteiro**, não a peça isolada.

### O que vai declarado dentro do preview, e não escondido

- **O KDS não se julga num telemóvel.** É tela de parede a 1920×1080; ali vê-se
  composição e hierarquia, não legibilidade à distância. Fica em aberto sem custo.
- **«Clara» não se mede por contagem.** Três saltos da sala à comanda está medido;
  se isso é claro é juízo dele, e é para isso que este portão existe.
- **Duas telas não têm cor de marca nenhuma** — backoffice e carta pública, zero
  acento nos píxeis e também sem wordmark.

### O que fica de fora por desenho

As **792 composições da §8 continuam a zero**, e isso não bloqueia: o plano
põe-nas depois da aprovação, porque capturá-las antes é fotografar telas que
ainda podem mudar.
