# E34 — a varredura de alcance ao produto INTEIRO

> Corrida a 05/09, pela primeira vez. Até hoje a varredura correu sempre por
> **etapa**, e é por isso que isto nunca tinha aparecido.

## A falha estava no meu instrumento, não no produto

O `varrer-alcance-da-etapa.sh` recebe um intervalo de commits e pergunta se as
funções **desse intervalo** têm chamador. Foi escrito assim de propósito, depois
de eu ter varrido um commit em vez de uma etapa no E23 e deixar passar o
`receberWebhook`.

Mas o desenho tem uma consequência que só vi hoje: **uma função só é perguntada
uma vez, na etapa em que nasce.** Se nasceu ligada e o chamador desapareceu
depois, ninguém volta a perguntar. Se nasceu órfã numa etapa cuja varredura eu
ainda não fazia, também não. **A varredura incremental só apanha órfãos novos;
os herdados são invisíveis por construção.**

Corri-a ao intervalo completo, do primeiro commit até HEAD.

## O que saiu

```
ficheiros no intervalo: 95   funcoes exportadas: 538
FALHA    65 sem chamador em produto
```

**65 de 538.** E 65 não são 65 defeitos — classifiquei antes de dizer o que quer
que fosse:

| Classe | Quantas | O que significa |
| --- | --- | --- |
| usadas só por `provas/`, `inspeccao/` ou `scripts/` | **23** | código de verificação, a família da dívida 7 — peso no pacote publicado, não defeito |
| **sem uso NENHUM em todo o repositório** | **42** | nem produto, nem prova, nem script |

As 42 são a parte que interessa, e por uma razão que a contagem sozinha não diz:
**não estarem alcançáveis também significa não estarem testadas por nada.** Uma
função assim ou é capacidade que o produto anuncia e não entrega, ou é código
adiantado à sua etapa — que continua a ser código por testar.

## As duas que já classifiquei

**`listarAuditoria` — legítima.** O E33 consome-a (`SET-011` «Registro de
acciones», `PLAT-013` «Registro de administración»). É código à frente da etapa,
a mesma figura do `porConstruir` num menu.

**`revogarConvite` — defeito real, e o melhor exemplo do dia.** Está implementada
e correcta em `packages/db/src/convites.ts:223`, exportada no `index.ts:91`, e a
base tem o estado `REVOGADO` com `revokedAt`. A tela onde viveria — `ORG-007`,
«Personas y accesos» — **já foi construída e assinada no E04**, e até **lista os
convites pendentes** (`listarConvites`). A rota da API importa `criarConvite,
listarConvites, registar`. **Não importa `revogarConvite`.**

Resultado: um convite enviado para o email errado dá acesso ao sistema de um
restaurante e **não se cancela** — espera-se que caduque. O prazo é configurável,
por isso a janela é o que alguém escolher.

E a formulação que fica: **o modelo de dados tem um estado que o produto não
consegue produzir.** Enquanto `REVOGADO` existir na base e nenhum caminho lá
chegar, o esquema descreve um produto que não é este.

## O que fica para o E34 decidir

As outras 40, uma a uma, em três caixas: **apagar**, **ligar** (é capacidade que
falta), ou **declarar** (é da etapa X, como a auditoria). O que não serve é a
contagem ficar como número.

E a correcção do instrumento, que é a lição maior: **a varredura por etapa
continua certa para fechar uma etapa, e é insuficiente como garantia do
produto.** Precisa de irmã — uma varredura total com lista declarada, na forma
que a `validar-provas-na-ci` já usa: cada órfão ou tem chamador, ou tem motivo
escrito. Aí o número deixa de crescer em silêncio.

## As 42, medidas

| Função | Ficheiro |
| --- | --- |
| `accoesDoPapel` | `packages/domain/src/permissoes.ts` |
| `aoSair` | `packages/fila/src/fila.ts` |
| `apagarExcepcao` | `packages/db/src/horarios.ts` |
| `aplicarEvento` | `packages/fila/src/sincronizacao.ts` |
| `aplicarSequencia` | `packages/domain/src/kds.ts` |
| `autorizacaoPorConcessoes` | `packages/domain/src/portas/autorizacao.ts` |
| `avisoDeSeguranca` | `packages/domain/src/alergenios.ts` |
| `chaveDeTarefa` | `packages/domain/src/chaves.ts` |
| `correioDeMemoria` | `packages/auth/src/correio.ts` |
| `descodificar` | `packages/domain/src/qr.ts` |
| `detectoresRegistados` | `packages/db/src/descidas.ts` |
| `diasConfigurados` | `packages/domain/src/horarios.ts` |
| `euProprio` | `packages/db/src/repositorios.ts` |
| `filiacoesDaOrganizacao` | `packages/db/src/repositorios.ts` |
| `filiacoesDoUtilizador` | `packages/db/src/repositorios.ts` |
| `guardarLead` | `packages/db/src/leads.ts` |
| `identificadorAdivinhavel` | `packages/domain/src/exportacao.ts` |
| `leadsDaUnidade` | `packages/db/src/leads.ts` |
| `limparConteudoLegivel` | `packages/fila/src/navegador.ts` |
| `linhasParaGravar` | `packages/domain/src/importacao.ts` |
| `listarAuditoria` | `packages/db/src/auditoria.ts` |
| `modulosDeDadosDaVersao` | `packages/domain/src/qr.ts` |
| `nomeDeEvento` | `packages/domain/src/chaves.ts` |
| `oUsoCorrectoCompila` | `packages/db/src/escopo.tipos.ts` |
| `obterUnidade` | `packages/db/src/repositorios.ts` |
| `papeisDaFiliacao` | `packages/db/src/repositorios.ts` |
| `passarClienteComEscopoOndeSePedeIdentidadeNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteDeIdentidadeOndeSePedeEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteSemEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `penalidadePorMascara` | `packages/domain/src/qr.ts` |
| `planosComAnualIncoerente` | `packages/domain/src/precificacao.ts` |
| `podeSeguirParaCatalogo` | `packages/domain/src/arranque.ts` |
| `precosPorCanal` | `packages/domain/src/precos.ts` |
| `prefixoDeMedia` | `packages/domain/src/chaves.ts` |
| `projeccaoVazia` | `packages/domain/src/kds.ts` |
| `revogarConvite` | `packages/db/src/convites.ts` |
| `serveConteudo` | `packages/domain/src/dominios.ts` |
| `sessoesVivas` | `packages/auth/src/revogacao.ts` |
| `sindromes` | `packages/domain/src/qr.ts` |
| `textoDeProduto` | `packages/i18n/src/traduzir.ts` |
| `tradutor` | `packages/i18n/src/traduzir.ts` |
| `unidadesAfectadasPelaBase` | `packages/domain/src/precos.ts` |

---

## O segundo caso verificado, e é o mais sério: `avisoDeSeguranca`

Fui a este pelo nome — numa casa de comida, uma função chamada «aviso de
segurança» sem chamador é o pior sítio possível para haver código morto. **Não
há defeito de segurança vivo.** Mas o que está por baixo é pior do que código
morto, e explica-se em três factos que só juntos fazem sentido.

**1. A regra existe e tem nome.** `avisoDeSeguranca` devolve os quatro baldes —
`contem`, `podeConter`, `naoContem`, `desconhecidos` — e o comentário por cima
diz a razão de existir: *«`desconhecido` não desaparece e não vira "não
contém"»*. É a regra mais séria do produto inteiro.

**2. A tela pública não a chama.** Reimplementa-a numa cadeia de ternários:

```
a.estado === 'CONTEM' ? 'perigo' : a.estado === 'PODE_CONTER' ? 'aviso'
  : a.estado === 'NAO_CONTEM' ? 'sucesso' : 'neutro'
```

Hoje está **correcta** — `DESCONHECIDO` cai em `neutro` com rótulo próprio.
Verifiquei linha a linha antes de escrever isto.

**3. A guarda vigia o módulo; a prova conta linhas; ninguém vigia o mapeamento.**
A `validar-alergenios.sh` trabalha sobre `packages/domain/src/alergenios.ts`: que
as assinaturas não aceitem nome nem foto, que os estados não colapsem no tipo.
Correcta — e aponta para o caminho que **não é usado**. A prova pública afirma
`toHaveCount(14)`, o que protege contra **omitir** uma linha; o próprio
comentário di-lo: *«omitir um lê-se como "não contém"»*.

**Nada afirma que um `DESCONHECIDO` aparece rotulado como desconhecido.** Trocar
o último ternário para `'sucesso'` mantinha a contagem em catorze, passava a
prova, passava a guarda — e um cliente com alergia lia **«não contém»** sobre um
ingrediente que ninguém declarou.

> **A regra está enunciada num sítio, implementada noutro, e as verificações
> cobrem o sítio que não corre.** É a forma do dia inteiro, na sua versão mais
> cara: aqui o preço de errar não é um número torto num relatório.

**A correcção que proponho é uma só e resolve os dois problemas:** a tela passa a
chamar `avisoDeSeguranca`. O órfão deixa de ser órfão, e o caminho vivo passa a
ser o caminho guardado. Alternativa mais fraca, se houver razão para a tela
manter o mapeamento: a prova pública afirma o **rótulo por estado**, e não só a
contagem.

Não a faço eu: é código de produto e sou eu que o vou verificar.
