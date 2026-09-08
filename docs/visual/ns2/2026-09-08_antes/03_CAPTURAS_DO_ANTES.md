# Fase 0.3 — o «antes», e é preciso dizer de que «antes» se trata

| ficheiro | viewport | altura da página |
|---|---|---:|
| `antes-lp-secretaria-primeira.png` · `-completa.png` | 1440×900 | **7103 px** |
| `antes-lp-movel-primeira.png` · `-completa.png` | 390×844 | **10 689 px** |

**No telemóvel são 10 689 px — cerca de 12,6 ecrãs.** Pior do que os 8,5 da
secretária, e é onde chega a maior parte das visitas.

## Estas capturas são de PRODUÇÃO, não do commit congelado

São de `bossaos.mwdeveloper.tech`, que está em **`4cba084`**. O congelamento
desta fase é **`483c4a7`**. **Não são a mesma coisa**, e a diferença tem de ser
declarada para a Fase 2 não levar crédito por trabalho que já estava feito:

| já corrigido no código, **ainda não no ar** | |
|---|---|
| capturas do produto **por idioma** | produção serve as espanholas às três línguas |
| capturas **estreitas** para telemóvel | produção encolhe as de secretária a 38–41 % |
| o `sizes` que mentia ao navegador | produção amplia 1,49× |
| o anel de foco do CTA a **1,00:1** | continua no ar |

**A Fase 2 compara-se contra o CÓDIGO, não contra estas imagens.** Estas servem
para a Nathalia ver o que existe hoje quando abre o site — que é a pergunta dela,
não a minha.

## Porque não capturei o commit congelado

Exigia um segundo `build` em paralelo com o do JR, e o `mac-health` deu
**`ATENÇÃO`**: 3386 MB disponíveis de 16 GB, 66 MB livres, orçamento seguro
~2 agentes com 4 já a correr. **Esta máquina teve quatro kernel panics sob carga
de agentes.** Fica por fazer, declarado, e faz-se quando a máquina estiver livre
— **não é «medi e deu isto», é «não medi e digo porquê».**

## 0.4 — FEITA às 05h10, e a Fase 0 fecha

| ficheiro | viewport |
|---|---|
| `antes-mesas-secretaria-primeira.png` | 1440×900 |
| `antes-mesas-movel-primeira.png` | 390×844 |

**Do commit congelado `483c4a7`, inquilino de inspecção** — o mesmo das seis do
North Star.

### O controlo que prova ser o «antes»

Uma captura do ecrã **novo** sairia igualmente nítida, portanto nitidez não prova
nada. O guião exige **`ns-mesa = 0`** e **itens de lista > 0**. Medido:
`ns-mesa=0`, `itens-de-lista=4` **nas duas larguras**.

### E o par diz a coisa sozinho

**A 390, no «antes», não se vê uma mesa na primeira dobra** — sete pastilhas
empilhadas em sete linhas comem o ecrã. **No «depois», vêem-se duas.**
Confirmei-o a olhar.

### Porque é que isto demorou, e a lição não é técnica

Declarei esta captura bloqueada **três vezes**, com **duas razões erradas** —
«a máquina» e «a porta». A terceira vez descrevi o percurso em vez de dar uma
razão, e passei-a ao JR.

**A causa era uma linha:** `pnpm install` **não lê ficheiros `.env`**, e o
`prisma generate` do Prisma 7 carrega o `prisma.config.ts`, que **lança** se a
variável não estiver **no ambiente**. Eu copiei o ficheiro para o worktree e
**nunca o exportei**. No repositório principal isso nunca aparece porque quem lá
trabalha já exportou o ambiente para outra coisa.

**Não havia problema estrutural: o worktree constrói.** A minha suspeita — que
os `TS7006` eram cliente do Prisma por gerar — **estava certa**; o que falhou foi
**a verificação**, que apontou a um caminho que também não existe no repositório
principal.
