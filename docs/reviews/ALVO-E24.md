# Régua do E24 — Documentos e integração fiscal

> **Escrita a 05/09, antes de o E24 começar e antes de existir código.**
> Mantenho o padrão que falhei no E22 e assumi: a régua antes da entrega.

## O que esta régua NÃO faz, e é a decisão mais importante dela

**Não escrevo aqui os requisitos do regime fiscal espanhol.** Não os enumero,
não digo que campos leva um registo, não afirmo prazos nem formatos.

Porquê: **eu não os sei verificar.** O meu conhecimento tem data, a lei fiscal
muda, e um requisito fiscal escrito com confiança e errado é pior do que
requisito nenhum — porque passa a ser citado como se fosse verdade, e ninguém
volta a verificar o que já está escrito numa régua.

O contrato do dinheiro já o diz, e concordo com ele: *«os requisitos
verificam-se na etapa, **na fonte oficial e na data** — não se congelam aqui.»*

**O que exijo, então, é o registo dessa verificação:** que fonte, que data, que
versão do regime. Uma etapa fiscal que não diga onde foi confirmar não está
provada, está suposta.

## 1. Um PDF bonito não é um documento fiscal

A frase é do contrato e é o aceite. Exijo a distinção **medida**: o que torna um
documento fiscal é o registo aceite pela autoridade ou pelo fornecedor
homologado, não o ficheiro que se imprime. Se o produto emite o PDF e a
integração falha, **o PDF não pode aparecer como se fosse válido**.

**O par:** um documento efectivamente aceite mostra-se como aceite. Sem os dois,
«mostra tudo como pendente» passa o primeiro.

## 2. Emitir duas vezes não emite dois documentos

Mesma família do E23, e a chave já existe: **a identidade é do acontecimento**.
Uma emissão repetida por reenvio, por clique duplo ou por reprocessamento devolve
**o mesmo** documento. E o par: uma **correcção** é um documento novo, e sai.

## 3. Uma rejeição é um estado, não um erro que se deita fora

O fornecedor rejeita — dados em falta, NIF inválido, série errada. Isso **fica
registado com o motivo**, é visível a quem tem de o corrigir, e o pedido original
não se perde. É a mesma exigência do «indeterminado» do E22: o estado que dói é
o do meio, e é o que costuma ser colapsado em «falhou».

## 4. Um documento fiscal não se reescreve

Corrige-se com outro documento, e os dois ficam. **Rasto por gatilho da base**,
como o E22 já faz — sem `UPDATE`, sem `DELETE`, e com controlo negativo que
tenta e **falha na base**, não na aplicação.

## O que reprovo à cabeça

- **Requisitos fiscais afirmados sem fonte e sem data.** Ver acima: é o único
  ponto onde prefiro «não sei» escrito a uma certeza inventada.
- **Alcance exaustivo**, e cada aceite a apontar a linha de produto.
- **Telas sem porta** — `portas-e-navegacao.md`. Já custou um marco.
- **Verde sobre zero documentos.** Declara-se a população.
- **Uma prova que só use o fornecedor a aceitar.** Sem rejeição simulada e sem
  reenvio, não está provado — está demonstrado.

## Reportado por ele durante a construção — e é melhor do que eu pedi

*(Registado do que ele me disse, não de leitura de árvore suja.)*

**Eu pedi a pendência fiscal declarada no ADR. Ele pô-la nos ecrãs** — INT-006,
POS-020, POS-021 e CAT-021 — com esta razão:

> «Um limite escrito só num documento de progresso é um limite que o restaurante
> nunca lê.»

**Está certo, e a diferença não é de forma.** Um `docs/progress/` é lido por nós
os dois e por mais ninguém. Quem vai emitir um talão está num ecrã, e é aí que
tem de aparecer que os requisitos do regime não foram confirmados na fonte.

É a mesma família do controlo do E23 que garante que o TPV **declara que não tem
gateway**: um produto que anuncia os seus limites não deixa a pessoa descobri-los
ao vivo. Aqui a aposta é maior, porque o limite é legal — e o pior sítio para
descobrir que um talão pode não servir é em frente ao cliente que o pediu.

**E uma segunda coisa que ele disse e vale a pena guardar:** o controlo da
identidade dele caía pela razão errada, e **só o viu porque a mensagem esperada
não batia**. Sem essa segunda pergunta no `exigir_vermelho` — *não basta ficar
vermelho, tem de ficar vermelho pelo motivo certo* — teria contado como controlo
bom. É a armadilha que me apanhou quatro vezes no E15, agora apanhada por um
instrumento em vez de por sorte.

## Como julgo o aceite da fonte, decidido ANTES da declaração

A régua exige «que fonte, que data, que versão». A resposta vai ser **«não foi
possível confirmar»** — e isso aconteceu por uma instrução minha impossível de
cumprir. Decido agora como o julgo, antes de ver a entrega, para não moldar o
critério ao que chegar.

**O aceite cumpre-se se a ausência estiver declarada, e reprova se for
preenchida.** O que eu queria impedir não era a falta de confirmação: era a
**invenção**. Um ADR que diga «POR CONFIRMAR, sem acesso à fonte» cumpre o
espírito inteiro; um ADR com uma lista de campos plausível e sem origem
reprova, mesmo que a lista esteja certa por acaso.

**Três coisas que exijo para o dar por cumprido:**

1. **A ausência nomeada**, não subentendida. «Por confirmar» escrito, com a razão.
2. **A distinção entre o que vale sem o regime e o que depende dele.** As quatro
   propriedades da régua não precisam de Espanha; se estiverem misturadas com o
   que falta, ninguém saberá o que está garantido.
3. **O limite visível a quem usa** — e isto ele já foi além, sem eu pedir: pôs a
   pendência nos ecrãs, não só no ADR. *«Um limite escrito só num documento de
   progresso é um limite que o restaurante nunca lê.»*

**O que NÃO exijo:** os requisitos confirmados. Não os posso exigir de quem não
tem acesso à fonte, e exigi-los seria repetir a instrução impossível que já o
travou dezoito minutos.

**E a nota que fica na assinatura**, se ela vier: esta etapa passa com uma
pendência externa declarada, e a assinatura di-lo. Não é o mesmo que uma etapa
completa, e não vou deixar parecer que é.
