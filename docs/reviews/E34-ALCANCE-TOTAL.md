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
| usadas só por `provas/`, `inspeccao/` ou `scripts/` | **23** | código de verificação — peso no pacote publicado, não defeito |
| usadas por testes **dentro dos pacotes** (`*.test.ts`) | **23** | testadas, mas sem caminho no produto |
| **sem uso nenhum, em lado nenhum** | **19** | nem produto, nem prova, nem teste |

> ### ⚠ Correcção a 05/09, uma hora depois de eu escrever isto
>
> **Escrevi «42 sem uso nenhum em todo o repositório» e o número estava errado.**
> A minha classificação procurou uso em `provas/`, `inspeccao/` e `scripts/` — e
> **os testes também vivem ao lado do código**, em `packages/**/*.test.ts`. Vinte
> e três dos 42 são exercidos aí. São **19**, não 42.
>
> Apanhei-o por acidente: fui verificar o `sessoesVivas` e um `grep` devolveu-me
> cinco ficheiros onde eu tinha dito zero. Eram quatro artefactos de build e a
> barrica de re-exportação — o `sessoesVivas` continua órfão —, mas a
> contradição obrigou-me a refazer a conta, e a conta estava mal.
>
> **A lição é a minha de sempre, virada para mim:** defini «testado» por uma
> lista de pastas escrita à mão em vez de descobrir onde os testes estão. Quarta
> lista à mão a desalinhar hoje, e esta produziu um número que eu já tinha
> publicado.
>
> E muda uma coisa no caso dos alergénios, para pior: o `avisoDeSeguranca` está
> **bem testado**. A cobertura do domínio parece boa precisamente porque o teste
> exercita a função que a tela não usa.

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

## As 19, medidas

| Função | Ficheiro |
| --- | --- |
| `accoesDoPapel` | `packages/domain/src/permissoes.ts` |
| `apagarExcepcao` | `packages/db/src/horarios.ts` |
| `autorizacaoPorConcessoes` | `packages/domain/src/portas/autorizacao.ts` |
| `detectoresRegistados` | `packages/db/src/descidas.ts` |
| `euProprio` | `packages/db/src/repositorios.ts` |
| `filiacoesDaOrganizacao` | `packages/db/src/repositorios.ts` |
| `filiacoesDoUtilizador` | `packages/db/src/repositorios.ts` |
| `guardarLead` | `packages/db/src/leads.ts` |
| `leadsDaUnidade` | `packages/db/src/leads.ts` |
| `limparConteudoLegivel` | `packages/fila/src/navegador.ts` |
| `listarAuditoria` | `packages/db/src/auditoria.ts` |
| `oUsoCorrectoCompila` | `packages/db/src/escopo.tipos.ts` |
| `obterUnidade` | `packages/db/src/repositorios.ts` |
| `papeisDaFiliacao` | `packages/db/src/repositorios.ts` |
| `passarClienteComEscopoOndeSePedeIdentidadeNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteDeIdentidadeOndeSePedeEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `passarClienteSemEscopoNaoCompila` | `packages/db/src/escopo.tipos.ts` |
| `revogarConvite` | `packages/db/src/convites.ts` |
| `sessoesVivas` | `packages/auth/src/revogacao.ts` |
