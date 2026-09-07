# RV100 — onde isto está, medido às 08:30 de 07/09

> Escrito para ser a **primeira coisa lida**, porque a noite produziu oito
> documentos e ninguém acorda para ler oito. Os números aqui foram medidos ao
> escrever, não recordados.

---

## O aviso que vem primeiro, porque muda o que vais ver

**Se correres a varredura das guardas agora, vais ver vermelho — e não é o
produto.**

| momento | verdes | vermelhas | não-medi |
| --- | ---: | ---: | ---: |
| há uma hora, com os agentes parados | 36 | 1 | 1 |
| agora, com dois agentes a meio de ficheiros | 32 | 4 | 2 |

As quatro vermelhas de agora são: uma *suite* nova ainda sem guião
(`rv100-implantacao.spec.ts`, a ser escrita neste momento), dois plantes por
repor em ficheiros que o JR está a editar, e um ID que alega móvel medido.
**Nenhuma é defeito de produto.**

**E há um comando que responde à pergunta que tu tens mesmo**, que eu fui
descobrir depois de escrever isto:

```
./scripts/validar-no-commit.sh
```

Corre as **37 guardas contra o conteúdo do COMMIT**, num worktree à parte, em vez
de contra a bancada. Acabei de o correr: **verde**. O cabeçalho dele diz a
distinção que eu ia perdendo — *«as guardas leem a ÁRVORE DE TRABALHO; o que se
publica é o COMMIT»* — e foi escrito ontem de manhã depois de a mesma coisa ter
acontecido **duas vezes**: o E32 e o E33 foram commitados com plante lá dentro,
e o commit que corrigiu o primeiro *«removeu a INSTÂNCIA e não impediu a
CLASSE, por isso voltou uma etapa depois»*.

**Ia escrever que nada impede um plante de ser commitado.** Procurei «plante»
dentro do `validar-no-commit.sh` e não encontrei — porque ele enumera as guardas
por **glob**, não por lista, e inclui a dos plantes sem lhe chamar o nome.
Procurei a palavra em vez do mecanismo, pela sexta vez esta noite.

**A leitura honesta:** o corredor só se lê com os agentes parados — e o commit
lê-se sempre. Um dia
tentei provar que a base oscilava sob carga e não consegui reproduzir; hoje a
prova apareceu sozinha noutra forma — não é a base que oscila, são **os
ficheiros a meio**.

**E uma coisa que corrigi ao escrever isto:** havia **um plante aplicado em
código de produto** — a página que divide a conta no TPV, com a âncora de teste
renomeada de `soma-das-partes` para `soma-escondida`. Resíduo de uma prova que
morreu antes de repor. **Não estava commitado**, e repus. Não toquei nos outros
dois porque estão debaixo das mãos do JR.

---

## O que está feito

**As 36 etapas funcionais e as 396 telas continuam a 100%.** Isso não mudou
esta noite e não é o que está em jogo.

**A RV100 fechou cinco lotes da secção 6**, todos com revisão escrita:

| lote | o que mudou | revisão |
| --- | --- | --- |
| L1a moldura | marca `81×28` não ligada → `145×50` ligada; menu móvel; idiomas; rodapé | `RV100-L1a-MOLDURA.md` |
| L1b home | 3 → 11 secções; preços da fonte aprovada | `RV100-L1b-HOME.md` |
| L1c planos | comparação derivada, não escrita à mão | `RV100-L1c-PLANOS.md` |
| L1d motor de prova | inquilino de demonstração e 4 capturas reais | `RV100-L1d-MOTOR-DE-PROVA.md` |
| L1e capturas ligadas | **herói de 728 → 1256**; `/product` deixa de ser a home | `RV100-L1e-CAPTURAS.md` |

**As secções 2, 3, 4 e 5 estão verificadas** e a 9 está medida em três regras de
doze. Os portões §12.1 (marca), §12.2 (comercial) e §12.3 (usabilidade) têm
medição escrita em `04_CONFORMIDADE.md`.

---

## O que está bloqueado em ti, e não é negociável por mim

**§12.4 — o portão visual humano.** O plano é literal: *«O Claude pode emitir
`PRONTO PARA APROVAÇÃO VISUAL HUMANA`; não pode emitir `APROVAÇÃO VISUAL HUMANA`
em nome do usuário»*, e o §7.1 acaba com **«pare»**.

A tua autorização escrita destrava **pendências tuas** e usei-a a noite toda.
**Não pode ser aprovação de telas que ainda não existiam quando a escreveste** —
e é por isso que ela não levanta este portão.

**Os 284 commits por empurrar.** A CI está escura desde 05/09. Tudo o que esta
noite deu verde deu verde **nesta máquina**.

---

## Os números que decidem o que falta

**O portão de cobertura (§12.5) é o maior corpo de trabalho que resta**, e
ninguém o tinha medido antes desta noite:

- as 792 são 396 IDs × {desktop, móvel};
- **165 de 165 endereços abrem** (eram 163 — dois davam 404 por o atlas apontar
  a caminhos em inglês onde o produto os tem em português; corrigidos e provados);
- **143 composições estão prontas a capturar hoje**;
- 202 exigem chegar a um **estado**, e 16 não têm endereço nenhum — provocam-se;
- **a carta pública não tem porta**: nenhuma unidade tem `public_slug` semeado, e
  isso são 36 rotas que falhariam todas no mesmo dia.

---

## Duas decisões minhas que quero que revejas

**1. Não medi móvel nas reservas**, apesar de serem 29 das 46 dívidas. Razão de
calendário: o §8 propaga o redesenho depois da tua aprovação, e a evidência de
móvel exige afirmar que *aquela* tela foi medida. **Medir antes é medir duas
vezes.**

**2. O `?section=` da landing não é defeito de produto.** As três URLs servem o
mesmo byte, e isso é o comportamento **correcto** para um endereço partilhável —
o atlas já lhes chama «secção da landing page». O que mente é o `rota_sugerida`.
Mudei o critério de verificação e não o produto.

---

## Actualização das 08:30 — o que mudou desde as 06:00

| | 06:00 | **agora** |
| --- | ---: | ---: |
| corredor **na bancada** | 32 verdes · 4 falhas · 2 não-medi | **40 verdes · 0 falhas · 1 não-medi** |
| achados corrigidos | 5 de 20 | **14 de 21** |
| guardas | 38 | **41** |
| revisões de lote escritas | 5 | **13** |
| commits desta noite | 83 | **99** |
| **por empurrar** | 284 | **309** |

**O corredor limpou-se sozinho**, e a razão importa: às 06:00 as quatro vermelhas
eram *plantes por repor* e *suites novas sem guião*. Os plantes foram repostos —
um por mim, um pelo implementador — e os guiões foram escritos por quem criou as
suites. **Nenhuma das quatro era defeito de produto**, como estava escrito, e
todas fecharam por trabalho e não por tempo.

**O que se fechou desde então:** a implantação e os equipamentos, a demo e o
consentimento, a confiança e o piloto, e o SEO inteiro — quatro lotes, cada um
com revisão escrita e verificação minha.

**E um achado novo, meu:** `RV100-021` — a **única porta de conversão do produto**
devolve o formulário vazio numa recusa do servidor. Nome, restaurante, email,
telefone e a mensagem livre perdem-se todos. O produto sabe repovoar em 76
ficheiros; é o sítio onde não se fez, e é onde acaba todo o funil.

### Três incidentes que valem mais do que os números

**Um plante estava aplicado em código de produção** — a página que divide a conta
no TPV, com a âncora de teste renomeada. **Não estava commitado**, e repus.

**Outro estava na limpeza da base**, a impedi-la de apagar 64 pedidos órfãos por
corrida, numa base partilhada por dois agentes. **Reposto, e os órfãos foram a
zero** — a previsão que o implementador fez cumpriu-se à minha frente.

**E um detector dava zero por construção** enquanto media o achado que diz que o
coral está ausente. **Um instrumento partido a concordar com a hipótese que devia
testar** — a forma de erro mais perigosa da noite, porque produz o número que se
espera. O que o apanhou não foi o valor: foi **a derivada**, o número não se mexer
depois de uma mudança que tinha de o mexer.

---

## Correcção a uma instrução minha: a paragem da secção 7 é DEPOIS, não antes

Disse aos dois implementadores, várias vezes, que **«a secção 7 é onde os dois
paramos»**. Os dois pararam — e pararam **antes** de fazer o que a secção 7 pede.

O plano diz outra coisa, e é literal:

> **«Implemente primeiro as telas abaixo.»**
>
> «### 7.1 Condição de parada — **Após implementar M01–M06:** … 6. **pare**.»

**A paragem é depois da implementação, não em vez dela.** Eu li «o §7.1 acaba com
"pare"» e comprimi-o em «a secção 7 é onde paramos» — **transformei um
parar-depois num parar-antes**.

É a mesma forma de vários erros meus desta noite: **comprimi uma instrução de
duas partes numa só**, e a parte que caiu foi a que mandava trabalhar.

**O que fica de pé da minha instrução, e continua a ser a linha que nenhuma ordem
levanta:** o §12.4 diz que só o Matheus pode registar `APROVAÇÃO VISUAL HUMANA`,
e que *«silêncio, ausência de comentário ou aprovação do próprio Claude não
libera o rollout»*. **O que eu posso emitir é `PRONTO PARA APROVAÇÃO VISUAL
HUMANA`, e mais nada.**

**A secção 6 está fechada.** Os 22 achados: 20 corrigidos, 1 medido conforme, 1
não reproduzido com causa, 1 aceite. Zero abertos.
