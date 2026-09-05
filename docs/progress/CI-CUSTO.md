# O custo da CI — medido a 2026-09-03, 20h40

Medido, não estimado, e escrito antes de ser um problema.

## O que se mede hoje

| Quando | Duração |
| --- | --- |
| De manhã (E01), ~9 passos | **~180 s** |
| Agora (E06 validado), 30 passos | **~640 s** |

**Triplicou em doze horas.** Faltam **30 etapas**, e cada uma traz provas novas: a este
ritmo passa dos trinta minutos antes do E20.

## Onde vai o tempo

```
167 s  Prova — recuperação e segundo factor, ponta a ponta   (espera pelo Mailpit)
 96 s  Prova — acesso, convites e revogação
 53 s  Prova — larguras, contraste, foco e alvos de toque    (Playwright)
 26 s  Prova — prontidão
 25 s  Tipos
 23 s  Build
 40 s  Arranque de contentores + cliente PostgreSQL
 18 s  Migrações do zero
 18 s  Instalar o navegador
```

As duas provas de ponta a ponta são **263 s dos 640** — 41 % —, e tudo corre **em série**
num único trabalho.

## Porque isto importa mais do que parece

Uma CI lenta não é só espera. Com `cancel-in-progress: true`, dois pushes seguidos cancelam
a corrida do primeiro — e quanto mais lenta, maior a janela em que isso acontece. **Já
aconteceu hoje**, e tive de ir confirmar por SHA qual commit é que a corrida verde cobria.
Uma CI de trinta minutos deixa de ser verificação e passa a ser um imposto que se aprende a
contornar.

## Quanto custam as guardas — medido a 20h10, depois de eu as ter acrescentado

Documentei o custo às 20h40 e a seguir acrescentei **dois passos**. Fui verificar a
incoerência em vez de assumir que eram baratas:

```
 8 s  Todos os pacotes medidos
 6 s  Prova — a cadeia de migrações aplica-se DO ZERO
 1 s  Cobertura íntegra (396 IDs)
 1 s  Dinheiro em inteiros
 0 s  Nenhum segredo na árvore
 0 s  Ordem das etapas
```

**~16 s de 640 — 2,5 %.** A incoerência era menor do que eu temia, mas verificar era o
mínimo depois de a apontar.

### Uma duplicação que encontrei ao contar

O `validar-testes.sh` leva 8 s porque **corre os testes de cada pacote outra vez**, só para
os contar — e o passo `Testes` corre-os logo a seguir. Hoje são 8 s; **cresce linearmente
com a suite**, que é justamente a coisa que mais cresce.

Não o mudo agora, e a razão é a mesma da divisão em trabalhos: mexer no `ci.yml` enquanto o
JR lhe acrescenta passos dá conflito. **Ao dividir em trabalhos paralelos, o
`validar-testes` funde-se com o trabalho dos testes** em vez de os repetir — a contagem sai
da mesma corrida que já acontece. Fica no mesmo lote de trabalho, no fecho do E07.

## O que fazer, e porque não agora

**Dividir em trabalhos paralelos.** Três grupos que não dependem uns dos outros:

1. **Rápido, sem base** — cobertura, segredos, dinheiro, ordem, testes por pacote, lint,
   tipos. Uns 60 s.
2. **Base** — migrações do zero, isolamento, acesso, planos, descidas, onboarding,
   recuperação e MFA, credenciais, prontidão.
3. **Navegador** — larguras, contraste, foco, alvos de toque.

O relógio passaria de ~640 s para perto do encadeamento mais longo, ~200 s.

**Não o faço agora por coordenação, não por dúvida.** O JR está a meio do E07 e **edita o
`ci.yml` para acrescentar os passos das provas dele** — reestruturar o ficheiro em três
trabalhos ao mesmo tempo dá conflito garantido, e o custo do conflito é maior do que os
sete minutos que se poupam por corrida esta noite.

**Fazer quando:** no fecho do E07, com a árvore parada, antes de autorizar o E08. Se ao
chegar lá a duração já tiver passado dos 900 s, fazer primeiro e autorizar depois.


---

# Medido depois de dividir — 22h20

| | |
| --- | --- |
| **Antes**, um trabalho em série | **649 s** |
| **Depois**, três em paralelo | **548 s** |

```
✓ Rápido — sem base nem navegador     2m03s   123 s
✓ Navegador — inspecção visual        2m27s   147 s
✓ Base — migrações e provas           9m03s   543 s   ← o encadeamento
```

## A minha previsão estava errada, e por quanto

Escrevi às 20h40 que a divisão poria o relógio **"perto de 200 s"**. Pôs em **548 s** —
uma melhoria de **15 %**, não de três vezes.

**Onde errei:** assumi que o tempo estava espalhado pelas três categorias. Não está. O
`base` sozinho leva **543 s**, porque as onze provas correm **em série dentro dele**, e
eram elas que já valiam 41 % do total. Tirar as guardas rápidas e o navegador do caminho
crítico removeu cerca de cem segundos — o resto do problema continua inteiro, só que agora
concentrado num sítio em vez de disperso.

O que se ganhou não é desprezável e não é só tempo: o `rápido` dá resposta em **dois
minutos**, portanto lint, tipos, guardas e build passam a falhar cedo em vez de esperar
pelas provas de base. Mas chamar-lhe "a CI ficou três vezes mais rápida" seria falso.

## O passo seguinte, que é onde está o tempo a sério

**Dividir o próprio `base`.** As onze provas são independentes entre si: cada uma semeia o
que precisa e limpa atrás de si — foi por isso que o JR pôs `ROLLBACK` no `finally` e que
o controlo negativo das descidas repõe o que desliga. Uma matriz com uma prova por trabalho
poria o relógio no tempo da mais longa, que é a do MFA a 167 s.

**Quando:** no fecho do E08, árvore parada — a mesma condição que respeitei desta vez e que
funcionou. E com a lição de há vinte minutos aplicada: **validar contra o esquema do
Actions e não contra o analisador de YAML**, que foi o que me deixou empurrar três trabalhos
sem `runs-on`.


---

# O desenho da divisão do `base`, agora com medições — 22h25

Antes de propor a matriz, fui medir passo a passo o trabalho `base` da corrida verde.
**Desta vez medi antes de projectar**, que foi exactamente o que não fiz às 20h40.

**Arranque, pago por cada trabalho:** `Set up job` 2 s + contentores 18 s + checkout e Node
3 s + `pnpm install` 17 s + cliente PostgreSQL 12 s + papéis 0 s + migração 4 s = **56 s**.

**As provas, e são muito desiguais:**

```
210 s  recuperação e segundo factor      ← sozinha, 44 % das provas
106 s  acesso, convites e revogação
 83 s  catálogo, alérgenos e preços
 38 s  prontidão
 14 s  migrações do zero
 11 s  onboarding
  6 s  descidas
  5 s  isolamento
  3 s  planos      3 s  plataforma      1 s  credenciais
```

## Porque é que a matriz de onze ramos é o desenho errado

Cada ramo paga **56 s de arranque**. Onze ramos = **616 s de tempo de máquina** só a
instalar dependências e a levantar contentores, para ganhar zero no relógio — porque o
relógio fica preso na prova mais longa de qualquer maneira.

## O desenho certo: três ramos equilibrados

| Ramo | Provas | Arranque + provas |
| --- | --- | --- |
| A | recuperação e MFA | 56 + 210 = **266 s** |
| B | acesso + catálogo | 56 + 189 = **245 s** |
| C | as outras oito | 56 + 81 = **137 s** |

**Relógio previsto: ~266 s**, contra os 543 s de hoje. E o total da CI passaria de 548 s
para **~266 s** — porque o `rápido` (123 s) e o `navegador` (147 s) já são mais curtos.

Três ramos em vez de onze: **o mesmo relógio, com um terço do desperdício de arranque.**

**Isto é uma projecção, não uma medição** — e escrevo-o assim porque a última vez que
projectei sem o dizer, escrevi 200 s e saíram 548 s. Confirma-se a correr.

**Quando:** fecho do E08, árvore parada, e validado contra o **esquema** do Actions.


---

# O `base` dividido, medido — 23h50

| | |
| --- | --- |
| De manhã, um trabalho, 9 passos | **649 s** |
| Três trabalhos | **548 s** |
| **Cinco trabalhos** | **369 s** |

```
✓ Rápido — sem base nem navegador       2m00s
✓ Navegador — inspecção visual          2m33s
✓ Base — as restantes provas            2m41s
✓ Base — acesso e catálogo              4m09s
✓ Base — recuperação e segundo factor   5m23s   ← o chão
```

**43 % mais rápido do que de manhã**, e o caminho crítico é agora uma única prova.

## Errei outra vez, e por menos

Projectei **289 s**; saíram **369 s** — 22 % abaixo. Da vez anterior tinha projectado 200 s
para 548 s, 63 % abaixo. **Melhor, e ainda errado.**

A causa mede-se: a prova do MFA levou **233 s** numa corrida e **210 s** noutra, e agora o
ramo inteiro levou 323 s contra os 289 previstos. Eu usei um número de uma medição única
como se fosse estável, e ele varia uns 10 %. **Uma medição não é uma distribuição** — e para
projectar um caminho crítico, o que interessa é o pior caso e não o único caso que vi.

## O chão, e o que o baixaria

O ramo do MFA é 5m23s e não desce dividindo mais: é **uma prova**. Baixá-lo exige mexer na
prova — ela espera pelo Mailpit, e essa espera pode ser evento em vez de sondagem. Não é
para hoje, e **não é urgente**: 369 s dá resposta em menos de seis minutos, e o `rápido`
continua a falhar em dois quando o erro é de lint, tipos ou guarda.

## A CI está PARADA por facturação — desde 04/09, confirmado a 05/09

Nenhum destes tempos está a ser gasto, porque **nenhum job arranca**. As
corridas aparecem como `failure` **aos 5 segundos**, e a verificação mostra
porquê: `gh run view --log-failed` devolve `log not found`, e a consulta aos
jobs não devolve passo nenhum. Um job que falhasse por código teria log e
passos. Este não chega a existir.

**Consequência prática:** enviar commits para o GitHub **não gasta minutos**,
porque não corre nada. Mas também não protege nada — as 12 provas que só correm
na CI não estão a correr desde então, e cada etapa validada daqui para a frente
tem a prova **local** e não a remota.

**Só o Matheus desbloqueia** (facturação do GitHub Actions). Não é dívida
técnica nem defeito de etapa nenhuma; é dependência externa, e está registada
aqui para não voltar a ser diagnosticada de raiz a cada tick.

**O que fica em risco enquanto durar:** a guarda de cobertura dos 396 IDs, a
varredura de segredos e a ordem das etapas correm só quando alguém as corre à
mão. A assinatura de uma etapa continua válida — a prova local é a mesma — mas
perde-se a rede que apanha o que a máquina local não vê.
