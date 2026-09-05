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
