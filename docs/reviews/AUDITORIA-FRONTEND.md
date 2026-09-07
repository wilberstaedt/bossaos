# Auditoria de frontend — o que o «está feio» era, medido

> Pedida pelo Matheus a 07/09 às 13h33: «essa auditoria de frontend tem que rodar
> especialistas e skills de frontend, pq do jeito que tá tá feio, já tem a
> identidade visual e logos, então arruma pfv antes de replicar pras 300 telas».
>
> Quatro agentes, **uma só régua** — a do manual de marca, já verificada em
> `03_DIRECAO_DE_MARCA.md`. Se cada um lesse o manual por si, eu ficava com quatro
> gostos em vez de uma medição.

## O diagnóstico, e agora tem ficheiro e linha

A direcção de marca já dizia que **o sistema de tokens está construído e é fiel
ao manual número a número**. Faltava explicar porque é que os ecrãs parecem
montados à mão apesar disso. A resposta apareceu:

> `apps/web/src/staff/NavegacaoDoStaff.tsx:82` → `className="bo-publico__seccoes"`
>
> **A navegação do Staff veste a folha de estilos do SITE PÚBLICO.** Herda o raio
> de cápsula (999 px) de uma etiqueta, quando a régua manda 10 px para controlos.
> É por isso que «tudo vira pastilha»: é o link do site público, com o CSS do
> site público, num ecrã de salão.

Não é falta de marca. É **falta da camada de composição** entre os tokens e o
ecrã — e cada tela foi vestida com a classe que estava à mão.

## Os dois que pagam mais, e são uma linha cada

Dois agentes, em superfícies diferentes e sem se falarem, **caíram no mesmo
token**. Convergência de lentes independentes levanta um achado de ecrã a achado
de classe:

| token | a régua manda | está | alcance medido |
| --- | --- | --- | --- |
| `.bo-estado__sobrancelha` (`estilos.css:405`) | rótulos 14/20, **nunca abaixo de 14 px** | **12 px** | **328** usos |
| `.bo-pagina` (`estilos.css:888`) | conteúdo até **1200 px** | **1100 px** | **291** ficheiros |

**Verificado por mim, não aceite dos agentes.** E é exactamente por isto que
replicar antes de arranjar sairia caro: o defeito ia cozido nas 300 telas, e
depois custava 300 correcções em vez de duas linhas.

## O resto, por superfície

**Staff (M04)** — links do índice a renderizar **azul sublinhado do navegador**,
porque `.bo-staff .bo-lista a` define só disposição e nunca `color` nem
`text-decoration` (verificado: `estilos.css:663-667`). O título repetido que o
Matheus viu tem causa exacta — `SECCOES_DO_STAFF` inclui a secção actual, e as
duas usam a mesma chave `staffE15.turno`; aparece **três** vezes na página de
índice. Nenhum bloco usa `.bo-cartao`, que existe e é usado em 15 sítios do
produto. E o `actor.nome` **já existe** (`sessao.ts:45`) e está a ser ignorado a
favor do email.

**Backoffice (M03)** — a área de conteúdo não usa **nada** do que o próprio
sistema já construiu para o caso: o componente `Estado`/`factos`, a `.bo-tabela`
e o `.bo-estado__numero` existem e são usados noutros ecrãs; este escreve
`<p>` e `<span>` sem classe. Os rótulos («Timezone», «Lines», «Average per
line») **estão no dicionário e não são referenciados**. E a migalha diz sempre
«People and access» porque está fixa no layout.

## Onde eu paro

Isto é implementação, e implementação não é minha. Passo ao JR com a ordem de
retorno: **primeiro os dois tokens** (duas linhas, 328 e 291 ecrãs), depois a
classe própria para a navegação do Staff, depois o resto por severidade.

Os achados marcados como **gosto sem regra** ficam para o Matheus. Eu só mando
corrigir o que viola a régua — a diferença entre as duas colunas foi exigida a
cada agente, e é o que impede uma auditoria de virar preferência.
