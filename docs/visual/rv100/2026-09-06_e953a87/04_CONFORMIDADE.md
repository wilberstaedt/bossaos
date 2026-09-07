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
