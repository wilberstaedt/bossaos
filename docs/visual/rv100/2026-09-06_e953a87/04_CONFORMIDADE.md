# RV100 · secção 4 — conformidade do sistema visual

> A secção 3 mostrou que o sistema **está construído e é fiel ao manual**. Esta
> secção verifica-o item a item e nomeia onde não bate.

## 4.1 Assets da marca — duas não-conformidades, medidas

O componente `apps/web/src/componentes/Marca.tsx` cumpre as **proibições** todas, e
cumpre-as bem:

| o plano proíbe | o componente |
| --- | --- |
| reconstruir a logo com texto, CSS, fonte ou SVG automático | usa os PNG reais (`brand/logoname.png`, `brand/logoicon.png`) |
| deformar a proporção | calcula a largura pelo pixel: `(2137 / 736) × altura` |
| marca sem nome acessível | `alt="BossaOS"` |
| recolorir, sombrear, rodar, mascarar | nada disso |

**E falha nas duas exigências positivas:**

### ① A assinatura do cabeçalho está a ~81 px, e o mínimo é 120

O `Marketing.tsx:45` chama `<Wordmark />` **sem altura**. A omissão é `28`, e
`28 × 2137/736 ≈ **81 px**` de largura.

> *«A logo do header desktop começa em **120 px de largura**; alvo recomendado
> entre **144 e 168 px**.»*

Está a **dois terços** do mínimo. E não há uma única chamada com altura explícita
em todo o produto — as duas que existem usam a omissão.

### ② A marca não liga ao início

> *«A logo do header deve ligar ao início com nome acessível.»*

O `packages/ui/src/estruturas/EstruturaPublica.tsx:54` renderiza `{marca}` **nu** —
sem `<a href>`. O nome acessível existe (`alt`), a ligação não.

**Consequência prática:** clicar no logótipo é o gesto mais previsível de quem
navega uma landing, e neste momento não faz nada. Não é acessibilidade a menos — é
uma expectativa universal que o produto não cumpre.

## 4.2 Paleta funcional — conforme

Verificada na secção 3, e repito o essencial: os quatro tokens do plano
(`brand.primary` `#102E35`, `brand.accent` `#F5664D`, `surface.default` `#F7F4EC`,
`brand.highlight` `#DDEA91`) são a paleta do manual, definida uma vez em
`packages/ui/src/estilos.css` e consumida por classes.

**E há uma regra do manual que o plano não repete e que vale mais do que os
valores:** *«em interfaces, priorizar superfícies claras; coral e cítrico não devem
disputar atenção com o estado dos pedidos»*. O coral é CTA e destaque editorial —
**não é sinal operacional**, e os estados têm cor própria fora do tema do cliente.

## O que vai para quem implementa

Duas correcções pequenas e medidas:

1. dar altura explícita à assinatura no cabeçalho comercial, dentro de 144–168 px;
2. envolver a marca numa ligação ao início, com nome acessível.

**Nenhuma delas é decisão do Matheus** — são números que o plano fixa. Seguem com
a autorização dele para não parar, mas não precisavam dela.

---

# RV100 · secção 5 — arquitecturas por superfície

## 5.2 Backoffice — conforme

**As migalhas existem, e no sítio certo:** nos *layouts*
(`app/[orgSlug]/layout.tsx`, `platform/layout.tsx`), não copiadas por página.

E a profundidade justifica-as: as rotas do backoffice vão a **10 a 13 segmentos**
de caminho — 126 páginas a 10, 43 a 11, 5 a 12 e uma a 13.

## 5.3 e 5.4 Staff e KDS — conforme, e por desenho

O manual pede **44 px no público e 48 px no salão**. O
`packages/ui/src/estilos.css` tem os dois como tokens e **aplica-os por
superfície**, não globalmente:

```
--bo-toque-publico: 44px;
--bo-toque-operacao: 48px;

.bo-staff .bo-botao  { min-height: var(--bo-toque-operacao); }
.bo-kds   .bo-botao  { min-height: var(--bo-toque-operacao); font-size: 18px; }
```

**Trinta e três leituras** dos dois tokens ao longo da folha. E o KDS tem
tipografia própria — 18 px nos botões — que é a *«tipografia adequada à
distância»* que a secção 5.4 exige, resolvida onde tem de ser resolvida.

**Isto não é conformidade por acaso.** Um alvo de toque só é maior no salão se
alguém tiver decidido que a mão que serve tem pressa e a mão que reserva não; a
folha de estilo mostra essa decisão escrita em duas linhas.

## 5.1 Marketing — conforme na estrutura, com as duas falhas da secção 4

O cabeçalho institucional existe (`Marketing.tsx` → `EstruturaPublica`), com uma
navegação **num sítio só** — e o comentário dela diz porquê: *«são doze telas; com
a navegação copiada em doze ficheiros, a décima terceira nasce diferente»*.

As oito páginas comerciais que o plano quer — produto, planos, implantação,
piloto, demonstração, confiança, perguntas e início — **existem**, e estão na
evidência da secção 2.

O que falha aqui é o que já medi na secção 4: a assinatura a 81 px e a marca sem
ligação ao início. **São as duas únicas não-conformidades do sistema visual em
cinco secções verificadas.**

---

## Secção 9 — Usabilidade diária

Doze regras transversais (§9.1) e dez casos de conteúdo extremo (§9.2). Medi as
que decidem dinheiro e as que decidem se o ecrã cabe. Não medi as dez todas do
§9.2 e digo quais abaixo — **NÃO MEDI é uma das três respostas**, não é a
ausência de uma delas.

### §9.1 — «nenhuma confirmação otimista para pedido, reserva ou pagamento sem
### estado autoritativo» — CONFORME, e pela razão certa

Esta é a regra do §9.1 que custa dinheiro num restaurante, por isso foi a
primeira. A fronteira está escrita numa lista de quatro:

```
ACCOES_QUE_EXIGEM_REDE = ['pagamento', 'reserva.confirmar',
                          'conta.fechar', 'desconto.autorizar']
```

As três que o manual nomeia estão lá — pagamento e reserva directamente, o
pedido por outra via — e **duas que ele não pediu**: fechar a conta e autorizar
um desconto. Quem escreveu isto percebeu que a regra é sobre *quem tem a
verdade*, e não sobre a lista de palavras do manual.

**O pedido é o caso interessante, e é o que eu fui verificar com desconfiança.**
`pedido.enviar` **passa** offline, e à letra isso lê-se como confirmação otimista
de um pedido. Não é, por duas razões que tive de medir separadamente:

1. Um Staff PWA que não deixa compor um pedido sem rede não serve num restaurante
   — e o teste da fila tem esse par escrito lá dentro como controlo positivo:
   *«sem isto, o bloqueio acima passava num sistema que bloqueasse tudo»*. Um
   teste que só prova que se bloqueia não distingue prudência de paralisia.
2. **O ecrã não mente sobre o que fez.** O `PainelDaFila` tem um comentário a
   prometer que «nunca diz enviado sobre o que só está gravado aqui» — e eu hoje
   já aprovei um comentário meu que prometia o que o código não fazia, por isso
   fui ao texto real, nas três línguas: `Not sent` / `Sin enviar` /
   `Não enviados`. A promessa do comentário está cumprida no ficheiro de
   tradução, que é onde ela se cumpre ou não.

Há ainda um segundo grau que ninguém pediu: `porEnviarNoAparelho` distingue *não
enviado neste telemóvel* de não enviado noutro. Num turno com quatro aparelhos,
essa distinção é a diferença entre procurar o pedido e voltar a lançá-lo.

**E a `RecusaFinanceira` é o oposto exacto de uma confirmação otimista:** com
rede, o ecrã diz que quem cobra é o servidor e que *aquele ecrã não cobra*.
Declarar a lacuna em vez de a esconder. O comentário dela regista um defeito que
o implementador encontrou na própria prova — uma prova que não conseguia ficar
vermelha, porque apagar a lógica toda de offline deixava-a igual. É a mesma
classe de defeito que me apanhou três vezes hoje, encontrada por ele em código
dele.

### §9.2 — expansão de texto — MEDIDO, e o pior caso é a língua do piloto

O manual manda testar traduções 30–50% maiores. Fui ver se o caso é hipotético
neste produto. **Não é**, e a medida é sobre as 1319 cadeias de 12 caracteres ou
mais, contra o inglês:

| língua | média | cadeias que crescem ≥30% |
| --- | ---: | ---: |
| pt-BR | 1,05× | 148 (11%) |
| **es-ES** | **1,09×** | **188 (14%)** |

**A pior é o es-ES, que é a língua do piloto** (La Societat, Castellón). E a
cadeia que mais cresce em ambas é operacional, não decorativa:
`integracoesE32.reprocessar` vai de `Retry safely` a `Reintenta de forma segura`
— **2,08×**. Logo a seguir, `kdsE16.estacao`: `Your station` → `A tua estação de
trabalho`, **2,08×**, e o KDS é a superfície que corre a 18 px por ser lida ao
longe. É lá que a duplicação do comprimento tem menos folga para onde ir.

**Não existe guarda de expansão de texto no corredor.** E aqui apanhei-me a mim
próprio: a minha primeira busca deu dois ficheiros e os dois eram substring —
um casava em «a expansão da *combinação*» e o outro num comentário meu antigo
sobre ter reportado 30% de telas. Fui ler os dois e ambos caíram. **Oitava vez
hoje que um instrumento me entrega um facto falso**, e a única razão de não ter
ficado no relatório é a pergunta de seguimento.

Do mesmo modo, `scripts/provar-acesso.sh` não é uma guarda de acessibilidade: é
sobre **autorização**. Não tem uma única palavra de aria, foco, contraste ou
teclado. «Acesso» e «acessibilidade» partilham o prefixo e não partilham o
assunto.

### Um achado que não é do §9 e apareceu ao ler as traduções

**O pt-BR mistura duas variantes de português na mesma língua.** Não é um
ficheiro mal etiquetado — é mistura interna, e os dois controlos dizem-no:

- **Controlo negativo:** o es-ES tem **zero** ocorrências de `telem*`. O
  detector não está a apanhar ruído que atravessa ficheiros.
- **Controlo positivo:** o pt-BR **usa mesmo** o vocabulário brasileiro noutros
  sítios — `endereço` 18×, `arquivo` 8×, `celular` 5×, `usuário` 2×.

O mesmo conceito tem dois nomes dentro da mesma língua: `celular` 5 e
`telemóvel` 7; `arquivo` 8 e `ficheiro` 3; `endereço` 18 e `morada` 4; `usuário`
2 e `utilizador`/`utilizadores` 3. Mais `ecrã`/`ecrãs` 11 e `gerir` 2. **Trinta
ocorrências em oito termos.** Um utilizador vê «celular» num ecrã e «telemóvel»
no seguinte.

**E isto diz algo sobre uma guarda que eu escrevi.** A `validar-tres-linguas.sh`
valida 2343 chaves × 3, com sonda que remove uma chave e exige exactamente uma
em falta. Ela prova **presença**, e presença não é correcção: uma chave presente
com o dialecto errado — ou com a língua errada — passa-lhe à frente sem tocar em
nada. Verifiquei o caso vizinho para saber a dimensão do buraco: só **1%** dos
valores é idêntico ao inglês, e quase todos são nomes próprios (`Starter`,
`Tenants`, `Rubik / Noto Sans`). A tradução está mesmo feita — o buraco da
guarda existe, mas não está a esconder conteúdo por traduzir. É dialecto, e é
menor. Registo-o pelo que é.

### O que NÃO medi na secção 9

Das doze regras do §9.1 medi uma a fundo (a otimista) e toquei noutra (nome
acessível: 86 `<button>`, 77 `aria-label`, 53 `aria-labelledby` — números que
não decidem nada sozinhos, porque um botão com texto visível não precisa de
`aria-label` e eu não cruzei botão a botão). **Não medi** as restantes dez.

Dos dez casos do §9.2 medi um (expansão). **Não medi** os outros nove: cem
itens, tabelas vazias e largas, alérgenos extensos, erros simultâneos, rede
lenta, teclado virtual, zoom a 200%, preços grandes, nomes longos.

Nove por medir num total de dez não é «conforme com ressalvas»: é a secção 9
**por medir**, com dois pontos verificados dentro dela. Digo o número para que
ninguém leia o que está acima como um veredicto sobre a secção inteira.

### Dois casos a mais do §9.2, e uma retractação minha no meio

**Tabelas sem dados e com muitas colunas — CONFORME, e com um cuidado raro.**
Os estados vazios existem e são sete no catálogo. E um deles diz isto:

> `"semDadosExplica": "Nobody measured: this is not the same as zero."`

**O produto distingue «ninguém mediu» de «zero» na sua própria cara.** É a mesma
doutrina das três respostas com que eu fecho as etapas, escrita numa mensagem de
interface para o dono do restaurante ler. Um ecrã que mostra zero onde ninguém
mediu é um ecrã que mente com um número — e este recusa-se.

Para as colunas, a `.bo-tabela--adaptavel` esconde o cabeçalho visualmente e
mantém-no para o leitor de ecrã (`width: 1px; height: 1px; clip-path: inset(50%)`),
que é a forma correcta e não a de o apagar.

**Zoom a 200% — NÃO MEDI, e retiro um defeito que quase escrevi.** Contei «31
alturas fixas em px contra 11 unidades relativas» e ia daí para um risco de
zoom. Fui ver as 31 antes de as reportar: **quase todas são `line-height`** — o
meu padrão `height: *[0-9]+px` casa com o hífen de `line-height`, e um
`line-height` em px ao lado de um `font-size` em px é o que se deve fazer.

Contadas como deve ser, são **5 `min-height`** — que são os alvos de toque, e
esses **devem** ser físicos, senão um dedo deixa de caber ao mudar a fonte — e
**8 alturas rígidas**, das quais várias são o truque de 1×1 px do leitor de ecrã,
uma barra de 12 px, um glifo de 5 px e um avatar de 28 px. **Nenhuma é
contentor de texto.**

Não há defeito de zoom aqui, e também não há prova de que não haja: sob zoom de
página o navegador escala px na mesma, e o caso que distingue os dois é o
utilizador que só aumenta a **fonte**. Isso mede-se ao vivo, e ao vivo não medi.

**Nono instrumento meu a falhar hoje, e a nona vez que só a pergunta de
seguimento o apanhou.** O padrão já não é acidente: sempre que um número chega
sozinho e conveniente, ele está a contar outra coisa. A regra que fica é a que
já custou o dia todo — **antes de reportar um número, ler as linhas que ele
contou.**

---

## §12.2, «preços vêm da fonte aprovada» — verificado, com uma correcção ao implementador

O achado dele diz que `precoDoPlano()` **«existe e ninguém a chama»**. A segunda
metade não se aguenta, e verifiquei com `-w` porque o `git grep` não suporta
`\b` — coisa que já me deu um «zero chamadores» falso hoje.

**É chamado**, uma vez, aqui:

```
apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/website/theme/plano/page.tsx:85
  const preco = dados.estado.descerParaPlano ? precoDoPlano(...) : null;
```

É o **backoffice**, no fluxo de descida de plano. A afirmação correcta é mais
estreita e continua a servir o mesmo fim: **a função é chamada no produto e não
é chamada na superfície comercial.** A conclusão dele — a página de planos
comercial não mostra preços — mantém-se de pé; a caracterização da função como
morta é que não.

Isto importa para além da picuinhice, porque muda o trabalho: não é ligar uma
função órfã pela primeira vez, é **usar na landing um leitor que o produto já
usa** — com o comportamento já provado do lado do backoffice.

**A fonte aprovada existe e tem números.** `docs/bossaos/PRECIFICACAO.json`, em
cêntimos, lida por `packages/domain/src/precificacao.ts`:

| plano | mensal | anual | implantação assistida |
| --- | ---: | ---: | ---: |
| STARTER | €19 | €190 | €99 |
| RESTAURANT | €79 | €790 | €299 |
| PRO | €149 | €1490 | €499 |

E `anual.mensalidades_cobradas = 10`: **o anual cobra dez mensalidades**, ou
seja dois meses oferecidos. Isso é a proposta comercial e tem de aparecer como
tal na página, não ficar escondida numa divisão que o leitor tem de fazer de
cabeça.

Nota sobre o `PRECIFICACAO.md`: **não tem um único valor** — zero linhas com
número e moeda. Quem for buscar os preços ao ficheiro de texto encontra o
modelo, não os montantes. A fonte é o `.json`, e o `.ts` que o lê já tem teste,
incluindo o caso nulo para um código de plano inventado.

---

## §12.1, «não existe identidade antiga ou paralela em uso» — CONFORME, com uma guarda em falta

**E cheguei aqui por dois falsos consecutivos, ambos meus.**

**O primeiro falso: zero.** Procurei literais de cor fora do ficheiro de tokens e
deu **zero**, com zero fontes declaradas por fora. Ia escrever «nenhuma
identidade paralela». O controlo positivo — correr o mesmo padrão **incluindo**
o ficheiro que eu sabia ter 26 — deu **zero também**, o que é impossível. A
causa é a de sempre: **`#[0-9a-fA-F]{6}\b` com `\b`, que o `git grep` não
suporta.** Já me tinha dado um «zero chamadores» falso há poucas horas.

Sem o `\b`, o número real é **79 literais** fora do ficheiro de tokens. O zero
teria ido para o documento sem o controlo.

**O segundo falso: três corais.** Nos 79 apareceram `#F5664D`, `#D85A44` e
`#FB4C39` — e três corais é o cheiro exacto de identidade paralela. Fui ver onde
vivem antes de o escrever, e a resposta desmonta a suspeita em dois passos:

1. **Dois deles são os tokens aprovados:** `--bo-acento: #F5664D` e
   `--bo-acento-sinal: #D85A44`, ambos no `estilos.css`.
2. **O terceiro é deliberado, medido e nomeado.** É o coral **da arte da logo**,
   e o `fichas.ts` explica porquê, com os números do ADR 0001: sobre o verde, o
   do manual dá **4,71** e o da arte **4,23**; sobre a areia é ao contrário.
   *«Ficam os dois, cada um no sítio onde ganha. Não use esta constante em
   interface.»*

Isto não é deriva de marca. É **um sistema de dois corais com a fronteira
escrita e a razão medida** — que é o oposto de uma identidade paralela, onde
duas cores coexistem porque ninguém decidiu.

**E a promessa do comentário cumpre-se**, o que verifiquei porque hoje já
aprovei um comentário meu que prometia o que o código não fazia. Com `-w`,
`coralDaLogo` aparece em **três** sítios: a definição e duas linhas de
re-exportação. **Zero usos em interface.** O controlo positivo é o irmão dele,
`acentoSinal`, que aparece em ficheiros de teste, no CSS e em dois documentos de
progresso — o detector vê o que existe.

Quanto aos 79 literais: vivem no `fichas.ts` (o componente que **mostra** a
paleta), nos testes de contraste e de tema, e na página interna do catálogo de
desenho. **É exactamente onde os literais têm de estar** — uma amostra de cor que
pinta `var(--bo-acento)` não consegue dizer ao leitor qual é o valor. Os
`#aabbcc` e `#123456` da lista são aparelhos de teste, e a presença deles
confirma que o detector alcança os testes.

**O que falta, e é barato: a proibição não tem guarda.** O `regras.ts` importa
`coralDaLogo` mas é só um barril de re-exportações; não impõe nada. Hoje a
fronteira entre os dois corais é mantida por um comentário e por quem o lê. Um
`coralDaLogo` que apareça numa interface daqui a três meses passa em todo o
corredor — e o corredor tem 34 guardas.

**Achado (P2): a lista de permissão de cor não cobre `coralDaLogo`.** O critério
de correcção é o de sempre — a guarda tem de conseguir ficar vermelha: pôr o
literal numa interface a título de prova, ver a guarda reprovar, tirar.

E as peças de marca são **duas**, `brand/logoname.png` e `brand/logoicon.png`,
que é o par que o §12.1 nomeia. Nota de método: a minha busca por ficheiros de
marca trouxe `provar-catalogo.sh` e mais quatro, porque **«logo» está dentro de
«catálogo»**. Terceira vez hoje que uma substring se faz passar por facto.

---

## §9.1, «erros explicam o problema e a recuperação possível»

Cheguei aqui por duas leituras erradas minhas, e a segunda quase virou um achado
publicado.

**Primeira: 8% dos erros dão recuperação.** Falso. O detector contou como
mensagens as chaves `rotuloCausa` («Causa»), `rotuloProximoPasso» («Próximo
passo») e `rotuloRascunho` («Rascunho») — que são **os campos de um componente**,
não texto de erro. Contar rótulos como mensagens é o mesmo erro de forma que já
me deu `line-height` a passar por altura de contentor.

**Segunda: «o estado de erro estruturado só existe no catálogo de desenho».**
Escrevi isto e ia a caminho de o publicar. É falso pelo motivo mais simples: o
componente `Estado` está em **300 ficheiros de produto**. O que vive só no
catálogo é aquele **conjunto de textos de demonstração**, não o padrão. Quase
transformei os textos de exemplo do catálogo numa acusação ao produto.

E do lado bom, o componente faz uma coisa que não é obrigatória e é certa:

```tsx
role={situacao.tom === 'perigo' ? 'alert' : 'status'}
```

**Papel ARIA por gravidade.** Um leitor de ecrã interrompe no perigo e não
interrompe no resto. Quem escreveu isto sabia que um `alert` em cada aviso
treina o utilizador a ignorar alertas.

### O que a medição limpa diz

Vinte e três mensagens de erro a sério (≥25 caracteres, sem rótulos). O meu
detector de verbos encontrou recuperação em três, e **três está errado** — por
inflexão: *«**Revise** as horas: o fim tem de vir depois do início»* não casa
com `reveja|rever`. É o mesmo eixo que hoje já me tinha escondido `SIMULTÂNEAS`
atrás de `simultan`. **Sempre que estreito num eixo, é nesse eixo que a resposta
se esconde.**

Lidas à mão, as vinte e três dividem-se em três grupos e só um é problema:

1. **A recuperação está no enunciado do problema**, e essas estão bem: «Falta o
   texto alternativo», «Falta o SKU para poder atualizar», «Só minúsculas,
   números e hífens». Não precisam de imperativo — dizem o que falta.
2. **Recuperação explícita**: «Muitas tentativas. Aguarde um momento antes de
   tentar de novo.», «Nada foi salvo. Tente de novo daqui a pouco».
3. **Os erros de concorrência do Staff, e é aqui que há buraco.** «Essa mesa já
   está ocupada.» · «Essa mesa já foi fechada.» · «Esse pedido já não existe.» ·
   «Esse artigo já não está no pedido.» Explicam o estado e **não oferecem passo
   seguinte**. Ao sábado às nove da noite, o empregado fica com o telemóvel na
   mão e sem acção — e estes são precisamente os erros que acontecem quando a
   casa está cheia, porque nascem de duas pessoas a mexer ao mesmo tempo.

**A excepção dentro do grupo 3 é a melhor mensagem das vinte e três:**

> «A mesa de destino ficou ocupada entretanto. **A de origem ficou como está.**»

Numa transferência falhada, a pergunta que o empregado tem é *«e agora, onde é
que ficou a conta?»* — e esta responde-a antes de ele a fazer. Diz o que **não**
aconteceu, que é a informação que falta a todas as outras.

**Achado (P2): os erros de concorrência do Staff dizem o estado e não dizem o
passo.** O critério de correcção existe e está escrito no próprio produto — é a
mensagem da transferência. As outras seis medem-se contra ela.

---

## §12.3, «loading, empty, error, offline, denied e upgrade são coerentes»

Comecei a medir isto com as **minhas** palavras e obtive zeros em offline,
negado e upgrade — que eu sabia serem falsos, porque tinha lido o subsistema de
offline uma hora antes. O produto é escrito em português e chama-lhe `semRede`,
não `offline`. **Procurar o meu vocabulário em vez do vocabulário do produto** é
a mesma armadilha que hoje me escondeu `SIMULTÂNEAS` atrás de `simultan`.

Perguntei então ao **catálogo de desenho**, que é o produto a enumerar-se a si
próprio. Seis estados: `carga`, `vazio`, `erroAoGuardar`, `semAcesso`,
`porGuardar` e `arquivar`.

| §12.3 pede | o produto tem | onde |
| --- | --- | --- |
| loading | `carga` | catálogo |
| empty | `vazio` | catálogo |
| error | `erroAoGuardar` | catálogo |
| denied | `semAcesso` | catálogo |
| offline | `semRede` + rota `staff/offline` | **só no Staff** |
| upgrade | `tema.bloqueada` + ligação ao plano | disperso |

E dois que o plano não pediu: **`porGuardar`** — que é o «formulários preservam
trabalho» do §9.1 com estado próprio — e `arquivar`.

**O offline não estar no catálogo não é incoerência.** Ele existe em 22
ficheiros e tem rota própria, e vive na superfície onde faz sentido: quem está a
uma secretária no backoffice não precisa de um estado de rede. Um estado
partilhado que só uma superfície usa seria pior.

### O upgrade está resolvido, e melhor do que eu esperava

Fui ver o caso concreto — o Starter a tentar mudar as cores — e a tela do tema
mostra `bloqueada` **e liga à página do plano**. O caminho existe. Mas o que
vale mais é o comentário ao lado, que resolve a tensão em vez de a esconder:

> «O editor tem endereço para toda a gente, e é o SERVIDOR que recusa quem não
> tem plano. Esconder a ligação ao Starter tornaria o ecrã a guarda — e o
> `planos-e-limites.md` diz o contrário por escrito: *«o ecrã esconde para não
> frustrar; o servidor recusa para proteger»*. **O que se esconde é o BOTÃO
> PRIMÁRIO, não o caminho.**»

Isto é a distinção certa. Um ecrã que esconde o caminho passa a ser ele o
mecanismo de segurança — e um ecrã nunca é mecanismo de segurança, porque o URL
continua lá. O que muda é a **hierarquia**: o botão desce de primário a
secundário. A permissão é do servidor; a frustração é do desenho.

### Um achado, e é o único do género no produto (P3)

Linha 139 da tela do tema:

```tsx
<a className="bo-botao bo-botao--primario" href="#">{m.tema.verCarta}</a>
```

**Um botão primário que não vai a lado nenhum.** Está dentro do cartão de
pré-visualização, que simula a carta pública — portanto não é um CTA a sério, é
a maqueta de outro ecrã. Mas está no pior dos dois mundos: é focável pelo
teclado, parece uma acção, e não faz nada. O §12.2 pede «CTAs com destinos
funcionais».

Duas saídas honestas: ou liga à carta pública verdadeira, e a pré-visualização
passa a servir para alguma coisa; ou deixa de ser `<a>` e passa a elemento não
focável dentro da maqueta. **A que não serve é a de agora.**

**E vale registar a dimensão:** é o **único** `href="#"` em todo o produto, em
419 ficheiros `.tsx`. Isso não é sorte — é convenção cumprida.

**Porque é que o corredor não o apanha, e não é defeito da guarda.** A
`validar-portas-mortas.sh` exige que uma porta a `#` declare quem a constrói
(`porConstruir: 'E30'`), e nasceu da dívida 1 do E34, quando três entradas do
menu da plataforma estavam a `#` sem declaração. **O âmbito dela são as
definições de menu, não as ligações em JSX.** A guarda está certa dentro do seu
âmbito; o que se aprende é que o âmbito tem uma fronteira, e esta ligação cai do
lado de fora dela.

---

## §12.2, «SEO e compartilhamento estão configurados» — NÃO CUMPRIDO

Medido com o alcance controlado primeiro: **373 `page.tsx` e 7 `layout.tsx`**
alcançados, portanto os zeros abaixo são zeros e não pathspec cego.

| o que o §12.2 implica | ficheiros que o declaram |
| --- | ---: |
| `openGraph` | **0** |
| `twitter` | **0** |
| `canonical` | **0** |
| `alternates` (hreflang) | **0** |
| `sitemap` | **0** |
| `generateMetadata` | 1 |
| `metadata` estático | 3 |

E os três que existem contam a história toda. O `apps/web/app/[idioma]/layout.tsx`
declara:

```ts
export const metadata: Metadata = {
  title: 'BossaOS',
  description: 'Sistema operativo do restaurante.',
};
```

**Um título e uma descrição para tudo o que vive sob `[idioma]`** — as sete
rotas comerciais (`/`, `/product`, `/plans`, `/getting-started`, `/faq`,
`/trust`, `/demo`) e o resto. É um objecto **estático**, e três linhas abaixo o
próprio ficheiro diz que *«os três idiomas são gerados em build: não há
negociação em tempo de pedido»*. Ou seja: **três construções estáticas, todas a
carregar a mesma descrição em português**, incluindo a espanhola — que é a
língua do piloto.

Do lado bom, e é real: o `404` põe `robots: { index: false }` e a carta pública
põe `index: true` explicitamente. Quem escreveu isso sabia o que estava a fazer;
o que falta é ter sido feito para as outras vinte e tal.

### Porque é que isto não é uma questão de higiene

**1. Sem `alternates`, as três línguas competem em vez de se declararem.** Sete
rotas × três idiomas são vinte e uma páginas que, para um motor de busca, são
conteúdo duplicado sem relação. O `hreflang` existe exactamente para dizer «esta
é a versão espanhola daquela», e não está lá.

**2. Sem `openGraph`, um link partilhado não tem cartão.** E isto toca no
negócio, não na técnica: a venda deste produto é por contacto directo. Quando o
link do BossaOS for para um WhatsApp ou um LinkedIn, o que o interlocutor vê é
uma linha de texto cinzenta em vez de uma imagem com a proposta. **É a primeira
impressão do produto, e é a única superfície que se vê antes de alguém decidir
clicar.**

**3. Um título para sete páginas** faz com que o resultado de busca de «planos»
e o de «confiança» sejam indistinguíveis.

### Critério de correcção

Não é «acrescentar tags». É:

1. `generateMetadata` por rota comercial, com título e descrição **vindos do
   i18n** — as 2343 chaves × 3 já existem e já têm guarda de completude;
2. `alternates.languages` com as três, mais o `canonical` de cada;
3. `openGraph` com imagem — e aqui há uma dependência real: **a imagem de
   partilha não existe**, e inventá-la é trabalho de marca, não de metadados.
   Registo como dependência e não como dívida;
4. `sitemap.ts` gerado das rotas do atlas, e não escrito à mão — uma lista à mão
   fica velha na primeira rota nova, que é o mesmo defeito que a CI já teve com
   as guardas em lista em vez de glob.

**Não mando isto ao implementador agora.** Ele está na moldura, e o §6.8 do
plano põe os metadados no fim do trabalho da landing — interromper agora
trocava uma correcção barata por uma cara. Fica registado para o fecho da
secção 6.

---

## §9.1, mais duas regras: uma CONFORME e outra que o meu método não sabe medir

### «acções destrutivas separadas de acções frequentes» — CONFORME, e pela forma mais forte

Há uma classe própria para o perigo, `bo-botao--perigo`, e ela aparece em quatro
telas. **As quatro estão em rotas próprias:**

```
channels/qr/mesa/[tableId]/renovar/   →  revogar
channels/qr/sessoes/[guestId]/        →  revogar
kds/[locationId]/[stationId]/bilhete/[taskId]/
staff/[locationId]/cancelar/          →  cancelar
```

**A separação não é de pixels, é de rota.** Para destruir alguma coisa é preciso
navegar até um sítio que só serve para isso — o que é uma ordem de grandeza mais
forte do que afastar o botão dentro do mesmo ecrã. E a do KDS acrescenta
`motivoObrigatorio`: não deixa avançar sem razão escrita.

### «uma acção principal por contexto» — NÃO MEDI, e digo porque falhei a medi-la

Contei `bo-botao--primario` por ficheiro: **67 com um, 6 com dois, 2 com três**.
Fui ao pior caso — `floor/sessoes/[sessionId]/encerrar`, que é onde se fecha uma
conta — e vi três primários idênticos em três formulários dentro de um cartão:
pedir a conta, **limpar**, fechar. Num telemóvel ao serviço, três botões iguais
com o que limpa a mesa no meio. **Ia escrever um P2.**

Fui ler o código à volta antes, e o achado colapsou: os três formulários são um
encadeado ternário sobre `activa.estado` — `ABERTA` / `A_ENCERRAR` / o resto.
**Só um renderiza de cada vez.** São três ramos, não três botões.

E o comentário por cima descreve uma máquina de estados pensada:

> «pedir a conta → mandar limpar → fechar. A mesa fica ocupada nos dois
> primeiros: **uma mesa vazia por limpar não é uma mesa livre**, e é só ao fechar
> que ela sai do índice único e volta a poder abrir.»

**O meu método está errado para esta regra, e não é um detalhe de contagem.**
Contar ocorrências de uma classe num ficheiro conta o **código-fonte**; a regra
fala de **botões num ecrã**. Um ficheiro com dez ramos de estado tem dez
ocorrências e um botão. É a mesma família do `line-height` contado como altura de
contentor: **medi o texto do programa e chamei-lhe a coisa que o programa
desenha.**

Verifiquei os outros sete e o método também não os resolve — alguns têm
condicionais, outros não, e «sem condicional» também não prova dois botões
simultâneos. **A regra responde-se no DOM**, contando primários visíveis por
ecrã renderizado, que é exactamente o que o arnês da landing já faz para a
moldura. Fica NÃO MEDI com o método nomeado, e não fica «conforme» por o
contador ter dado bem em 67 de 75.
