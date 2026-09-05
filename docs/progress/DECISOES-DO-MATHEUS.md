# O que só o Matheus decide

> Reunido a 05/09. Estava espalhado por seis documentos, que é como as decisões
> se perdem. Nenhuma destas é técnica — todas têm custo, risco legal ou dinheiro
> do lado de lá, e nenhuma é minha para tomar.
>
> *Renumerado a 05/09: havia um salto do 5 para o 7. Num ficheiro que existe
> para não se perderem decisões, um número em falta é a pergunta «e a 6, onde
> está?» — a que ninguém sabe responder daqui a um mês.*

## Se só tiveres cinco minutos

Por **quando bloqueia**, não por ordem de descoberta:

| | Decisão | Bloqueia |
| --- | --- | --- |
| **1º** | **6.** Requisitos fiscais espanhóis | **antes do primeiro talão a um cliente real** — e não se resolve depressa |
| 2º | **1.** Facturação da CI | já: 5 trabalhos criados morrem em 3s com zero passos |
| 3º | **7.** Provedor de envio | na primeira campanha real |
| 4º | **8.** Convenção de salário | antes do primeiro recibo real |
| 5º | **2.** Domínio próprio | quando o piloto for público |
| 6º | **3.** Alergénios em dois sítios | é regra de negócio, não de código |
| — | **4.** e **5.** | adiadas, com gatilho escrito |

**As duas primeiras não dependem uma da outra** e podem ir em paralelo. A fiscal
é a única que depende de alguém de fora, e por isso é a que tem de começar
primeiro mesmo sendo a que demora.

## 1. A CI está trancada por facturação — e é a mais barata de resolver

**Desde 04/09.** Os jobs aparecem como `failure` aos 5 segundos e **não chegam a
arrancar**: `gh run view --log-failed` devolve «log not found» e a consulta aos
jobs não devolve passo nenhum.

**O que se perde:** 12 provas não correm; a guarda de cobertura dos 396 IDs, a
varredura de segredos e a ordem das etapas só acontecem se alguém as correr à
mão. **Todas as assinaturas desde o E18 têm prova LOCAL**, e isso está escrito em
cada uma.

**Não urge por custo:** enviar commits não gasta minutos, porque nada corre.
Urge por rede de segurança.

### Medição afinada — 05/09, 19h

Reverifiquei ao fim de um dia inteiro, porque assumir sem medir é o erro que
passei a sessão a apanhar. **Continua trancada**, e agora com o sintoma exacto:

```
gh api …/actions/runs/<id>/jobs
  Rápido — sem base nem navegador:      passos=0  inicio=16:48:23  fim=16:48:26
  Base — acesso e catálogo:             passos=0  inicio=16:48:23  fim=16:48:26
  Base — recuperação e segundo factor:  passos=0  inicio=16:48:23  fim=16:48:26
```

**Os cinco jobs SÃO criados, com nome, e morrem em três segundos com zero passos
executados.** `gh run view --log-failed` devolve «log not found».

Corrijo o que escrevi antes: eu disse que «o job nem chega a existir». **Existe**
— o que não acontece é a execução. A distinção importa para quem for
desbloquear: não é o workflow que está partido nem o repositório que não
dispara. É a execução que é recusada, e isso resolve-se na facturação.

**Nada mudou no diagnóstico:** enviar commits continua a não gastar minutos,
porque nada corre. E as 43 provas sem decisão continuam sem correr — destrancar
resolve metade, e a outra metade é a CI descobrir em vez de listar.

## 2. O domínio próprio: ligar ou apagar

Existe a tabela `custom_domains`, o resolvedor `sitePublicoPorDominio`, a função
`serveConteudo` com a regra difícil já resolvida — «INDETERMINADO serve» — e
**sete provas**. E **nenhuma rota lê o Host**, portanto nada disto funciona.

**As duas saídas são legítimas e o custo é diferente:**

- **Ligar** — é uma feature comercial real (o restaurante usa o seu domínio).
  Custa uma rota que leia o Host, ecrãs de gestão, e verificação de propriedade
  do domínio.
- **Apagar** — tira peso e uma promessa por cumprir do modelo de dados.

**Ficar como está é a pior das três**, e é onde estamos: código que uma prova
jura funcionar e a que nada chega.

## 3. Alergénios: a regra está em dois sítios

A cadeia **está segura** — a publicação leva o estado, `DESCONHECIDO` incluído, e
a tela mostra os quatro estados distintos. **Não há defeito hoje.**

Mas a regra pensada vive no módulo de domínio (sem chamador e sem provas) e a
que corre está em linha, na publicação e na tela. **Duas implementações da mesma
regra divergem pela que ninguém corre** — e esta tem consequência legal.

**A decisão é tua** porque a pergunta por baixo é de produto: o sistema alguma
vez **infere** um alergénio, ou só mostra o que foi declarado? Hoje só mostra o
declarado, e o módulo órfão foi escrito para tornar a inferência *impossível*,
não apenas proibida.

## 4. O preparo não conta a quantidade

Cinco doses de batata contam como uma. **Para uma fritadeira é certo** — é uma
fritada, não cinco. Para um prato montado à mão, cinco podem ser cinco vezes.

Não é defeito: é uma decisão que ninguém tomou. Aparece em serviço como «a
cozinha está sempre atrasada às sextas», e ninguém a liga a uma linha de código.
**Quem sabe a resposta é quem esteve numa cozinha**, não eu.

## 5. A hora de entrega não tem limites — decisão adiada, com gatilho

Não há recusa para hora no passado nem para casa fechada. Uma hora no passado
põe o pedido **já** na cozinha, com a pessoa a julgar tê-lo agendado.

**Hoje não bloqueia** porque as telas são de staff. **Fica bloqueante na etapa
que abrir o takeaway ao público** — aí o staff deixa de ser o filtro. Registo-o
aqui para não ser esquecido quando essa etapa chegar.

## 6. Os requisitos fiscais espanhóis — PENDÊNCIA EXTERNA, e é a mais séria

**Nem eu nem o JR conseguimos confirmar o regime fiscal na fonte oficial.** Eu
recusei escrevê-los de cabeça na régua do E24, e mantenho a recusa: um requisito
fiscal escrito com confiança e errado é pior do que requisito nenhum, porque
passa a ser citado como verdade e ninguém volta a verificar o que já está escrito.

**O que a etapa entrega, e é verificável sem saber o regime:**

- um PDF não é documento fiscal, e não aparece como válido se a integração falhou;
- emitir duas vezes não emite dois documentos — uma correcção é documento novo;
- uma rejeição é um estado com motivo, visível a quem a tem de corrigir;
- um documento fiscal não se reescreve: corrige-se com outro, e os dois ficam,
  com rasto por gatilho da base.

**O que fica por confirmar:** os requisitos concretos do regime — que campos, que
prazos, que formato, que fornecedor homologado. Está declarado no ADR
`0002-fiscal-espanha.md` como **POR CONFIRMAR**, com a razão (sem acesso à fonte)
em vez de ser preenchido a adivinhar.

**A decisão é tua, e tem data-limite natural:** isto tem de ser confirmado por
quem tenha acesso à fonte **antes de o BossaOS tocar num restaurante a sério** —
o La Societat incluído. Não antes; não é preciso travar o desenvolvimento por
isto. Mas antes do primeiro talão emitido a um cliente real.

**E uma nota sobre como isto aconteceu**, porque a falha foi minha: eu mandei o
JR à fonte oficial sem verificar se ele tem acesso à web. Dei-lhe uma ordem e uma
proibição que se fechavam uma sobre a outra — *não inventes* e *vai confirmar
onde não podes ir* — e ele parou, que era o correcto. Um agente que parasse menos
teria inventado os requisitos para desbloquear.

## 7. O provedor de envio das campanhas — email e SMS

O E27 entrega o consentimento por finalidade e por canal, com a base a fazê-lo
valer. **O que não existe é por onde enviar.** Os envios ficam `POR_ENVIAR` e a
tela di-lo por palavras, que é o comportamento certo — o produto anuncia o que
não faz em vez de deixar alguém descobri-lo com uma campanha por enviar.

**A decisão é tua porque tem custo e tem remetente.** Provedor (Resend, SES,
outro), domínio de envio e quem assina as mensagens. Já tens contas Resend, e a
regra de uma conta por domínio no plano gratuito é capaz de decidir isto sozinha.

**Quando bloqueia:** na primeira campanha real. Até lá o produto está honesto.

## 8. A convenção de salário — converter tempo em dinheiro

O E28 guarda e mostra **tempo**. Não calcula salário, e o JR declarou-o sem eu
pedir. Concordo com a recusa: converter horas em dinheiro é **convenção
laboral**, não aritmética, e escrever uma que não foi verificada é o erro do E24
num sítio onde custa mais — aqui o prejudicado é quem trabalha na casa e tem
menos poder para contestar o recibo.

**Precisa de fonte:** convénio aplicável em Espanha para hostelaria, com
nocturnidade, horas extraordinárias e feriados. **Bloqueia antes do primeiro
recibo real**, não antes do piloto.
