# O que só o Matheus decide

> Reunido a 05/09. Estava espalhado por seis documentos, que é como as decisões
> se perdem. Nenhuma destas é técnica — todas têm custo, risco legal ou dinheiro
> do lado de lá, e nenhuma é minha para tomar.

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

## 7. Os requisitos fiscais espanhóis — PENDÊNCIA EXTERNA, e é a mais séria

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
