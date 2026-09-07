# Régua do caminho da demonstração

> Escrita a 07/09 às 16h05, **antes da entrega**. Segunda etapa da ordem por
> venda: depois da montra vem **o que o Matheus põe à frente de um cliente**.
>
> **Aqui não quero polimento, quero que nada esteja partido.** Um prospecto
> perdoa uma tela sóbria; não perdoa um botão que não leva a lado nenhum.

## O caminho, tal como o produto o promete

A landing oferece **cinco destinos**: `/demo`, `/faq`, `/plans`, `/product`,
`/trust`. O `/demo` submete para `/api/publico/demo` e termina em `/demo/thanks`.

## 1 · Os cinco destinos existem e respondem

**Passa se** os cinco derem **200** nas três línguas. **Reprova se** algum der
404, 500, ou redireccionar para fora do idioma escolhido.

**Controlo negativo:** um destino inventado — `/pt-BR/naoexiste` — tem de dar
**404**. Sem ele, uma sonda que devolva sempre «ok» passaria com a mesma cara.

## 2 · O formulário completa a volta

**Isto é o que separa esta régua de uma que testa páginas.** Cada página pode
responder 200 e o caminho estar partido no meio: **a submissão é onde ele
quebra**, e é a única parte que ninguém vê ao navegar à mão.

**Passa se** um envio válido chegar a `/demo/thanks` **e** ficar registado. Já
está medido que a coluna existe e é escrita — `consentimentoMarketing` e
`consentimentoEm` — portanto o que falta é a volta inteira, não a coluna.

**Reprova se** o `thanks` aparecer sem o registo ter ficado: **uma página de
obrigado que agradece por nada é pior do que um erro**, porque o prospecto vai
embora a pensar que alguém o vai contactar.

## 3 · Nada de bastidores no que ele vê

Do que já apanhámos noutras telas e que aqui seria fatal: **endereços de correio
técnicos** (`demo@bossaos.invalid` esteve em dois ecrãs), **blocos de
depuração** («Not sent: 0» estava no Staff), **códigos** em vez de palavras
(`es-ES` estava na carta), e **texto cortado**.

**Reprova se** aparecer qualquer um destes no percurso do prospecto.

## 4 · A demonstração diz que é uma demonstração

Já medido e conforme noutro contexto (`RV100-017`): o inquilino chama-se «Bossa
Demo» e o aviso é renderizado. **Aqui a pergunta é outra: aparece no CAMINHO?**
Alguém que entre pela landing e clique tem de topar com o aviso **antes** de
tirar conclusões sobre os dados — ou o produto está a mostrar pratos inventados
a alguém que julga estar a ver um restaurante real.

## O que NÃO conta como prova

- **Cinco `curl` a dar 200.** Isso mede cinco páginas, não um caminho — e o
  caminho tem um POST no meio.
- **O formulário aceitar.** Aceitar não é registar; já vi hoje um `200` a
  significar «recebi» e não «guardei».
- **A minha leitura do código.** Este mede-se a andar, e ando eu depois dele.
