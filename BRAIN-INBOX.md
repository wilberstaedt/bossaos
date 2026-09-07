# BRAIN-INBOX — BossaOS

> Caixa de entrada para o segundo cérebro. O Lúmen processa e limpa via
> `/end-session` ou `/daily-briefing`; o que fica aqui é o que ainda não foi
> arrumado no vault.

---

## [2026-09-04] — do E08 ao marco do Starter aprovado

### Mudança de status do projecto
- **30%: 11 de 36 etapas, 112 de 396 telas.** Começou o dia em 19%.
- **MARCO E11 — Starter APROVADO à 2ª.** Pronto para piloto **no âmbito
  verificado**: 112 telas validadas e medidas em desktop e móvel, isolamento entre
  inquilinos visto no produto, jornada percorrida de organização inexistente até
  site publicado, identidade separada por porta estreita, preço com uma fonte só.
  **Não** é Restaurant, Pro, TPV, caixa nem fiscal.
- E08, E09, E10 e E11 fechados. E12 (cores públicas e planos) em curso.

### Decisões técnicas
- **Uma etapa com telas não se assina sem prova de navegador.** Nasceu de eu ter
  assinado o E09 com dois defeitos reais lá dentro — carta pública servida sem
  folha de estilos, e a consulta a servir o menu de **outra unidade** numa página
  pública. A minha prova era toda de base e domínio: a página nunca foi renderizada.
- **O endereço público não volta ao mundo.** Apagar tira do ar, não liberta o nome:
  o QR está impresso na mesa e um nome que muda de dono redirecciona pessoas reais.
  `@unique` impede dois ao mesmo tempo, não dois em sequência.
- **A identidade é global, o inquilino é local.** Saber que existe uma conta
  chamada Ana não é direito de quem administra um restaurante. Os nomes chegam por
  função `SECURITY DEFINER` que confirma a organização **contra o contexto da
  sessão**, nunca contra o argumento.
- **Preços em cêntimos inteiros, com uma fonte só.** O PDF comercial existia fora
  do repositório e os dois ficheiros que ele mandava criar nunca foram entregues.
  Por isso a página de planos nasceu sem preços — e o executor recusou-se a
  inventá-los, que foi a decisão certa.

### Learnings
- **O defeito do dia teve uma família só: o instrumento a vigiar uma FORMA de
  escrita em vez da propriedade.** Varri as guardas todas e **oito de oito tinham
  defeito**, nenhum no produto. Exemplos: a do QR via `export async function POST`
  e não `export const POST`; a dos alergénios via a plica e não as aspas; a das
  classes via três formas de `className` e não a condicional; a do dinheiro proibia
  `parseFloat` e deixava passar `Number(preco)`.
- **Metade das guardas não corria no servidor.** O `provar-tudo` descobre-as, a CI
  listava-as à mão, e a lista estava três dias atrasada. Uma lista envelhece em
  silêncio: ninguém vê a entrada que **falta**.
- **"Não medi" é uma resposta diferente de "zero".** A guarda dos pacotes lia a
  ausência de sumário como zero testes e mandava declarar o `domain`, que tem 302.
- **Uma reposição testa-se em base descartável.** Testei-a na base de
  desenvolvimento e envenenei-a; a reparação foi reconstruir das migrações.
- **Sondas destrutivas vão numa cópia.** Reescrevi duas vezes ficheiros que o JR
  estava a editar e só não lhe comi trabalho por sorte de temporização.
- **A régua da etapa seguinte audita a anterior.** A do E09 encontrou um buraco no
  E08 que eu já tinha assinado; é a única auditoria que tenho da minha assinatura.
- **Escrever a régua antes do código é o que muda o resultado.** As etapas que
  passaram à primeira foram as que a tinham.

### O que foi feito
- 5 guardas novas (móvel, móvel-real, acções, preços, jornada) e 8 corrigidas,
  todas com controlo negativo interno e provadas com o defeito real reproduzido.
- A CI passou a **descobrir** as guardas, com guarda contra população zero.
- `provar-marco-e11.sh`: a segunda passagem do marco **executável**, escrita
  enquanto as seis falhas ainda estavam abertas.
- Contratos novos: domínios e endereços, identidade dentro do inquilino, e a
  aresta da fila local em revogação.
- Réguas escritas antes do código: E10, E11, E12, E13.
- Preview repetível em `scripts/preview.sh`.

### Próximo passo
E12 em curso — o ataque está preparado em `inspeccao/sonda-tema.ts`: ler a cor
**resolvida pelo navegador**, e exigir que os cinco tokens públicos mudem e os
sete fixos não. A pergunta aberta do E13 está no contrato: **a revogação fecha a
porta por onde a regra 2 mandava sair**, e o rascunho fica nem enviado nem
recuperável. Três saídas nomeadas, nenhuma escolhida — é decisão de produto.

---

## [2026-09-05] — E18 e E19 assinados, e a noite em que o meu aparelho mediu a base errada

### Decisões técnicas
- **A identidade de uma mensagem é o ACONTECIMENTO que a causou**, não `(reserva,
  tipo)` nem `(reserva, tipo, momento)`. A primeira engole a segunda chamada
  legítima do host — «a sua mesa está pronta» sai duas vezes na mesma noite. A
  segunda não deduplica nada. Contrato em `capacidade-e-reservas.md`.
- **Uma lista de espera NÃO guarda posição.** A ordem de chegada não é a ordem de
  sentar: um grupo de 6 não bloqueia um de 2 quando vaga uma mesa de 2. Sem
  coluna, ninguém consegue mostrar um número errado. Deriva-se, dentro do grupo
  que cabe nas mesmas mesas.
- **O contacto de quem esperou tem finalidade que ACABA.** O registo da visita
  fica (é o que diz ao dono se perde gente à porta); o telefone não. Campo que se
  esvazia sem destruir a linha, senão o produto escolhe sempre guardar o número.
- **Toda a hora escolhida por uma pessoa passa pelo fuso da unidade antes de
  existir instante.** E sem fuso configurado, recusa-se em vez de adivinhar.

### Learnings
- **Verde não é alcance.** O E19 tinha a suite inteiramente verde, 35 controlos
  negativos a acender, e o `enfileirar` com ZERO chamadas — o histórico de
  mensagens estava sempre vazio. As provas alcançavam as funções directamente.
  Uma prova responde à pergunta que lhe fizeram; o silêncio dela sobre o resto
  parece aprovação. **Para cada aceite, apontar a linha de PRODUTO que o
  exercita** — a regra existia desde o E15 e eu não a executei sempre.
- **O meu isolamento de revisão estava anulado por uma linha.** Os `provar-*.sh`
  carregam `.env` na linha 14, depois das minhas exportações, e o `.env` da
  árvore de revisão apontava para a base do JR. Todas as provas por script
  bateram na base viva dele, que ele estava a escrever. Explicou o falso alarme
  do SKU, a «regressão» na retenção e os vermelhos que mudavam de sítio.
- **Um vermelho que aparece uma vez é observação, não achado.** Quase reportei
  fuga de custo numa resposta pública, e depois quase reportei que a porta
  pública deixava apagar reservas — as duas falsas, as duas do meu ambiente.
- **Um remendo que traz um defeito novo é sinal para parar.** Fiz quatro seguidos
  a tentar consertar concessões de base: revoguei ao papel errado, revoguei um
  `language c`, apaguei a base depois de a receita a preparar, e acusei o
  ambiente do JR de um defeito que era meu. A solução simples — a base nasce
  vazia — estava provada desde o início num script que eu já tinha.
- **Um instrumento que deixa rasto contamina a medição seguinte** e faz-se passar
  por defeito do produto. O meu detector escrevia na base e não repunha.

### O que foi feito
- **E18 VALIDADO** (`cfafed7`): 13+19 verdes, 17 controlos negativos.
- **E19 VALIDADO** (`e3482e5`) depois de retido por duas máquinas provadas sem
  chamador: 5 provas verdes, 39 controlos negativos, base reconstruída do zero.
- Contratos novos: `lista-de-espera.md`, os cinco números do relatório, a
  identidade da mensagem, a retenção do contacto.
- Aparelho de revisão consertado: `.env` da árvore, base a nascer vazia,
  detector a repor o que mexe.
- **52% das etapas (19/36), 62% das telas (247/396), zero telas a aguardar.**

### Mudança de status do projecto
- Passou de metade. O E20 (takeaway e delivery) está em curso, com o momento de
  produção derivado por **gatilho da base** — um valor escrito de fora é
  substituído.

### Próximo passo
- Fechar o E20. Depois o **E21, que é revisão minha**, e onde entra a pergunta
  que nenhuma prova faz: *o produto chega aqui?* — com a varredura de funções
  exportadas sem chamador, triando as de etapas já assinadas.
- **A CI continua parada por facturação do GitHub Actions.** Só o Matheus
  desbloqueia. 12 provas não correm lá desde 04/09.
- **E00 continua por assinar** — é meu, e só o JR o pode julgar. O dossiê está
  em `docs/reviews/E00-PROVA-PARA-O-JR.md`, agora com a prova que joga contra.

---

## [2026-09-05 · tarde] — E20 assinado, E21 fechado, MARCO DO RESTAURANT NÃO APROVADO

### Mudança de status do projecto
- **58% das etapas (21/36), 64% das telas (254/396).**
- **O marco do Restaurant está NÃO APROVADO**, e não por defeito de correcção:
  as 254 telas estão certas uma a uma e **ninguém chega lá**. Quem entra fica na
  página da equipa; sete das oito entradas do menu são `href: '#'`, incluindo
  reservas, catálogo, sala e caixa — todas construídas e assinadas.

### Decisões técnicas
- **Um módulo entregue tem porta**, e uma porta é uma ligação seguível a partir
  da sessão iniciada, sem escrever endereços. Contrato em
  `docs/architecture/portas-e-navegacao.md`.
- **A verificação de alcance é exaustiva por etapa, não amostrada.** Escolher
  funções a olho reproduz o viés que a varredura existe para eliminar.

### Learnings
- **O mesmo defeito apareceu em três escalas na mesma noite:** função sem
  chamador (código), tela sem porta (ecrã), jornada sem percurso (operação).
  **Verde não é alcance** — uma prova responde à pergunta que lhe fizeram e
  nunca diz que ninguém lhe perguntou pelo caminho.
- **Numa varredura de 30 funções sem chamador, 15 eram duplicados a APAGAR, não
  a ligar.** Entregá-las como «liguem-nas» teria criado segundos caminhos para
  coisas que já funcionam. A varredura diz onde olhar; só a leitura diz o que
  fazer, e as duas conclusões são opostas.
- **A regra pensada fica no domínio, e o produto reimplementa-a em linha** —
  alergénios, preços por canal, domínios. Nos três a versão inline está certa
  hoje; nos três, a pensada é a que não tem provas. Duas implementações da mesma
  regra divergem sempre pela que ninguém corre.
- **Verificar as minhas próprias afirmações antes de as publicar.** Contei 35
  cliques nas provas e quase desmenti o meu achado com um `grep` mal apontado:
  eram todos botões, e `getByRole('link')` aparece zero vezes.

### O que foi feito
- **E20 VALIDADO** (`ba5619c`) — 48 controlos negativos; corrigido depois com a
  admissão de que verifiquei 5 funções de 8.
- **E21 fechado**: 30 funções sem chamador triadas e lidas, achado da navegação
  medido do login ao menu, e a entrada directa confirmada **autorizada** (não é
  buraco de segurança, é alcance).

### Próximo passo
- O JR fecha o E22 (TPV, contas e caixa) e **recebe o conserto da navegação
  antes do E23** — é o que reabre o marco.
- **A CI continua trancada por facturação.** Só o Matheus desbloqueia.

---

## [2026-09-05 · manhã] — CORRECÇÃO: o marco do Restaurant foi APROVADO à 2ª

### Mudança de status do projecto
- **A entrada anterior deste ficheiro diz «MARCO DO RESTAURANT NÃO APROVADO».
  Já não é verdade** — corrigido aqui em vez de reescrito, para o vault ver a
  sequência: reprovado, corrigido, aprovado.
- **Aprovado à 2ª em `e5511b2`**, com `provar-portas.sh`: 11 casos verdes, zero
  falhas, e os controlos a acender — «caiu a porta de takeaway/relatórios/caixa:
  as telas existem e ninguém lá chega».
- **E22 (TPV, contas e caixa) VALIDADO.** 61% das etapas (22/36), 68% das telas
  (273/396).

### Learnings
- **Fixar os critérios de aceitação ANTES de ver a correcção, e escrever também
  o que NÃO se exige.** A lista negativa é o que me impediu de acrescentar
  condições ao ver a entrega — que era a falta que eu próprio tinha apontado no
  E19.
- **Um controlo negativo tem de estragar a coisa certa.** O que prova a porta
  estraga o **menu** e deixa as telas intactas; se estragasse uma tela, media
  outra vez a existência da tela, que já estava medida vinte etapas antes.
- **Quebrei a minha própria regra e apanhei-me por acaso:** observei o `/ir/` na
  árvore suja do JR, sem estar commitado, e escrevi uma nota de revisão a partir
  disso. Saber a regra não chega — **verifiquei-a por sorte, não por método.**

### Próximo passo
- **E23 em curso** (pagamentos, webhooks e reembolsos), com a régua escrita
  **antes** de existir código — ao contrário da do E22, que escrevi tarde.
- **Uma decisão nova para o Matheus:** o `/ir/<modulo>` não reencaminha quando há
  uma unidade só. No La Societat é um clique a mais em cada navegação, todos os
  dias. Está em `docs/progress/DECISOES-DO-MATHEUS.md`, com as outras cinco.

---

## [2026-09-05 · fim de tarde] — 75%, AGUARDA=0, e o E00 julgado por quem não o escreveu

### Mudança de status do projecto
- **75% das etapas (27/36), 77% das telas (308/396), e `AGUARDA=0`** — nada à
  espera de assinatura, pela primeira vez.
- Assinados desde a última entrada: **E22** (TPV e caixa), **E23** (pagamentos e
  webhooks), **E24** (fiscal, com pendência externa declarada), **E25** (stock),
  **E26** (compras). E o **E00 foi julgado pelo JR** — validado, com a frase que
  ele prometia **reprovada** e reescrita.

### Learnings — os três que valem para os outros projectos

- **Um contrato só impede um defeito se disser a consequência operacional E a
  regra de decisão na fronteira onde ele entra.** Reformulação do JR, e é melhor
  do que a minha tese. O defeito do fuso passou por baixo de um contrato que
  **falava do assunto** e nomeava os três casos difíceis — faltava-lhe dizer o
  que fazer no ponto de entrada. *(Eu tinha escrito que nenhum contrato falava
  disso. Era falso, e foi ele a encontrá-lo ao verificar a prova que eu lhe dei
  para julgar.)*
- **Uma regra que depende de alguém a executar bem de cada vez não é uma regra.**
  Falhei a verificação de alcance três vezes, de três maneiras. Só parou quando
  deixou de ser memória: primeiro um script, depois — e melhor — **um controlo
  negativo escrito por ele**, que desliga o motor do produto e verifica que a
  prova acende.
- **Não calar uma guarda vermelha com o mecanismo de excepção dela.** Podia
  declarar 43 provas como excepção e deixar a CI verde em cinco minutos. O teste
  que decide: *o que mudava no produto?* Nada — só a minha visão dele.

### O que foi feito, do meu lado
- Guardas novas: `validar-indice-de-contratos.sh` (27 contratos, 8 fora do
  índice) e `validar-silenciadores.sh` (o `2>/dev/null` que engoliu erros aos
  dois agentes hoje). Chamam-se `validar-*` e por isso entram na CI **sozinhas**.
- `varrer-alcance-da-etapa.sh` e `provar-marco-e21.sh` — a reaprovação do marco
  deixou de ser a minha leitura e passou a ser um comando.
- Corri **todas as guardas pela primeira vez**: 3 vermelhas, todas apontando
  para mim. A do móvel apanhou **89 telas que assinei sem afirmar o móvel** —
  afirmei 43 com prova em mão e **declarei 46 em vez de as afirmar de memória**.

### Próximo passo
- **E27 (CRM e campanhas)** em curso — a etapa onde um defeito manda mensagem a
  quem não a pediu.
- **Sete decisões esperam pelo Matheus** (`DECISOES-DO-MATHEUS.md`), a mais
  barata sendo a **CI trancada por facturação**, e a mais séria os **requisitos
  fiscais por confirmar antes do primeiro talão real**.

---

## [2026-09-06] — A publicação do staging, e nove paragens que não foram do produto

### Decisões técnicas
- **Publica-se um COMMIT, não a árvore de trabalho.** A primeira versão do
  `publicar.sh` exigia árvore limpa e depois fazia `rsync ./` — a verificação era
  uma *promessa* de que o disco e o commit coincidiam. Passou a `git archive`: o
  que vai para o ar existe em git porque não há outra maneira de lá chegar.
  Garantia por impossibilidade em vez de por regra. **E resolveu um problema
  real:** com dois agentes na mesma árvore, a minha nunca está limpa.
- **O portão de publicação recusa se houver etapa por assinar.** O motor existe
  para que nada passe sem segunda assinatura; publicar por cima disso desfazia-o
  a partir de fora.
- **Um deploy só está feito quando a versão que RESPONDE é a que foi construída.**
  Não basta o `docker compose up` não dar erro. E a sonda não pode atravessar o
  produto: a minha pedia `/versao.txt` e o router de idiomas devolvia
  `/es-ES/versao.txt`. Passou a ler a etiqueta da imagem, pelo Docker.

### Learnings
- **Nove paragens, e só uma não foi minha.** As outras oito: um `grep` que
  apanhava a variável errada, o `compose` a ler `.env` em vez de `.env.prod`, um
  contentor que eu deixara no projecto errado, a variável do Prisma na fase
  errada do Dockerfile, um `python` de edição **sem `assert`** que não mudou nada
  e reportou sucesso, um `git commit` que não correu por causa de aspas, uma
  porta escolhida por dedução, o `PORT` editado nos dois sítios que não mandam, e
  a sonda que media o produto em vez do build.
- **Um passo feito à mão esconde a dependência que o script tem.** Subi o
  Postgres à mão com o ambiente já carregado na sessão — e isso escondeu que o
  `docker compose` lê `.env` e não `.env.prod`, e deixou um contentor no projecto
  errado que depois colidiu. Um passo fora do script fica fora da próxima vez.
- **Pedir um número a mais evitou um incidente.** A porta que escolhi para o
  staging era do `norte_web`, em produção. Ia matar o `docker-proxy` que a
  segurava, a pensar que era lixo das minhas tentativas — o que travou foi ver a
  **idade do processo**: três dias, não trinta minutos. Sem esse número, a
  explicação errada era plausível e coerente com tudo o resto.
- **Depois de mexer em infraestrutura partilhada, verifica-se o que NÃO se queria
  mudar.** O Caddyfile serve quatro produtos; confirmei os quatro a 200 depois do
  reload, não só o meu.
- **«A semente correu OK» não é «o site funciona».** As duas semeaduras deram
  `OK` e a carta pública dava 500 — faltavam duas variáveis de ambiente. Só
  apareceu por eu abrir a página.
- **Ter a lição escrita não é o mesmo que aplicá-la.** O README do ilora já dizia
  «.env copiado ANTES do install: o prisma generate precisa dele». Li-o de
  propósito, para copiar o padrão, e pus a variável na fase errada na mesma.

### O que foi feito
- `bossaos.mwdeveloper.tech` no ar: DNS, Postgres próprio no 5434, três papéis
  separados com login **testado um a um**, migrações, build nativo no VPS,
  contentor no 8140, Caddy com TLS, e o restaurante de demonstração semeado — a
  carta pública serve 8 produtos.
- E28 e E29 assinados. 83% das etapas (30/36), 86% das telas (344/396).
- Contratos e réguas do E30, E31 e E32 escritos **antes do código**.

### Próximo passo
- O JR fecha o E30. Faltam seis etapas.

---

## [2026-09-07] — RV100 secção 6: groundwork da landing, medido e não construído

### Decisões técnicas
- **Os catorze blocos do §6.3 entram como secções da MKT-001, não como rotas
  novas.** O §12.5 rastreia 396 IDs; uma rota nova muda o total e o gate de
  cobertura passa a medir outra coisa.
- **O ritmo de 80–128 px que o §4.4 pede sai da escala do manual sem token
  novo:** `--bo-espaco-gigante` (64) em cima e em baixo de cada secção soma 128
  entre secções. Não se acrescentam tokens de 80/96/128.
- **Ordem de reconstrução em oito lotes, home primeiro** — e dentro do primeiro,
  moldura → motor de prova do produto → composição. A moldura corrige seis
  defeitos em dez rotas de uma vez; o motor de prova tem de existir antes da
  composição, senão o hero fica com o lado direito vazio, que é o defeito que o
  §10 reprova pelo nome.
- **Os preços saem de `precoDoPlano()`**, nunca escritos numa tela — a
  `validar-precos.sh` reprova `€ 19` num `.tsx`.

### Learnings
- **Uma decisão que se apoia em «X ainda não existe» não tem gatilho para o dia
  em que X passa a existir.** A página de planos ficou sem preços porque a 04/09
  às 02:38 eles não existiam; às 04:01 do mesmo dia passaram a existir e ninguém
  voltou lá. Cinco dias sem preços numa página comercial.
- **Reler evidência que já existe vale mais do que gerar evidência nova.** A
  medição de 1440 px já estava feita; recontá-la apanhou um erro pequeno no
  baseline («728 em sete páginas» são seis, mais a FAQ a 652).
- **Um enunciado detalhado não é infalível.** Cinco divergências novas entre a
  RV100 e as fontes, além das três que a secção 3 já tinha apanhado — incluindo
  uma que manda usar linguagem de um ficheiro que não a tem.
- **Contradição entre duas regras do mesmo documento resolve-se pela que
  protege quem lê**: o §10 exige rotas institucionais no footer, o §6.3.14 diz
  «conforme disponibilidade real». Ganha o §6.3.14 — um link para 404 é pior do
  que a falta dele.

### O que foi feito
- `docs/visual/rv100/2026-09-06_e953a87/05_MARKETING_AND_CONVERSION.md`: as oito
  páginas comerciais medidas uma a uma contra o §6, composição separada de
  conteúdo, ordem de reconstrução com a razão, e as cinco divergências.
- `.../11_OPEN_FINDINGS.md`: 20 achados no formato do §11.4 — 8 P1, 6 P2, 5 P3,
  1 aceite.
- `00_STATUS.md` actualizado sem apagar o registo antigo que ficou superado.
- **Zero linhas de produto alteradas. Zero tokens tocados.**

### Mudança de status do projeto
- RV100 na secção 6. As secções 2 e 3 estavam feitas; esta é a preparação da
  reconstrução, não a reconstrução.

### Próximo passo
- Lote L1 (home): moldura → motor de prova → composição. Cinco achados esperam
  decisão do Matheus e nenhum bloqueia o L1: privacidade/consentimento no
  formulário de demo, factos do piloto, o hero inglês, a política de
  equipamentos e as rotas legais do footer.
