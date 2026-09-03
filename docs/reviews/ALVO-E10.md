# Régua do E10 — sites dos restaurantes e landing page

> Escrita a 04/09, com o E09 a meio e **antes de existir uma linha do E10**. É o
> padrão com melhor histórico: as três etapas que passaram à primeira (E05, E06,
> E07) foram as três em que a régua existia antes da entrega.

O E10 são **29 IDs** — a maior etapa até agora, e a primeira em que o produto é a
cara pública do cliente: `MKT 001-012`, `WEB 001-011`, `PUB 001-002 / 004-006`,
`INT 003`.

## O requisito que não está no prompt e entra na mesma

**Prova de fluxo nas duas superfícies, desktop e mobile, nascida com a etapa.**

Não é preferência minha, é aritmética. Contei antes de escrever:

- Dos 396 IDs, **112 fecham até ao marco E11**, e **todos os 112** trazem no atlas
  `desktop: obrigatório` e `mobile: obrigatório/adaptado à superfície`.
- **72 já estão assinados por mim como `validado`.** Dos 72, **zero** têm a rota
  visitada pela única inspecção de larguras que existe, e **zero** têm evidência
  que mencione móvel.
- O aceite 1 do E11 exige «o mesmo fluxo completo em desktop e mobile».

Se o E10 nascer como os anteriores, o marco encontra **29 telas públicas** sem
prova de móvel e a correcção é um retrofit de 29. Entra agora, custa pouco;
entra no E11, custa a etapa toda.

## Os aceites do prompt, e como os vou atacar

**1. Rascunho não muda o site público; publicar e retirar são consistentes.**
O meu ataque é o par: gravar rascunho e ir ao **site público** confirmar que nada
mudou — não à pré-visualização, que é o mesmo processo a olhar-se ao espelho. E
retirar o que foi publicado, e confirmar que a rota devolve o estado de retirado
e **não** uma página em cache com o conteúdo antigo.

**2. Lead válido guarda-se uma vez; falha real não mostra sucesso.**
Dois ataques. Submeter o mesmo lead duas vezes (duplo clique é o caso real) e
contar as linhas. E **partir a gravação de propósito** — base indisponível — para
ver o que o ecrã diz: se disser sucesso, o aceite 2 está reprovado por definição,
e é o defeito mais caro dos três porque perde dinheiro sem fazer barulho.

**3. Domínio já vinculado não pode ser tomado por outro inquilino.**
Este prova-se com **dois** inquilinos, não com um. Um inquilino a reclamar um
domínio livre não prova nada sobre o segundo. E quero ver a recusa **no produto**,
não só a restrição na base: o E03 mostrou que a base recusa; falta mostrar que o
produto recusa e diz porquê.

## O que reprova à cabeça

- **Verde sobre pré-visualização.** A publicação prova-se na rota pública.
- **Prova de móvel por captura de ecrã.** Uma imagem não afirma nada; a asserção
  afirma. Largura medida, elemento fora do ecrã contado, alvo de toque medido.
- **Rota que redirecciona e é medida à mesma.** Uma página que devolve o ecrã de
  entrada mede a **entrada** e diz verde. Toda a visita afirma que chegou onde queria.
- **Dados fictícios na rota pública.** É o aceite do E11 e é a etapa onde o risco
  existe: um restaurante de exemplo servido em produção é um erro visível de fora.
- **Dependência de DNS dada como concluída.** O domínio depende do mundo real.
  Declarada e pendente é um estado honesto; concluída sem prova não é.

## O que eu declaro já, para não o fingir depois

A prova de móvel **automática** cobre largura, transbordo, alvo de toque e
contraste. Não cobre a leitura num aparelho real na mão de uma pessoa. Isso fica
**pendência declarada**, como ficou a leitura do QR em dois aparelhos no E09 —
declarada é melhor do que verde falso.
