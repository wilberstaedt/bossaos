# Alvo da revisão do E08

> Escrito com o JR a 32 minutos do E08 e sem `E08.md`. Ele já lá vai — mas não vi uma linha
> do que fez, e é isso que mantém a régua honesta. Deriva do prompt do E08, do CT-07, do
> CT-14 e do CT-17, e de `catalogo-e-publicacao.md` e `dados-e-accoes-sensiveis.md`, ambos
> escritos no E00.

## Esta é a primeira etapa que aceita ficheiros de estranhos

Até agora tudo o que entrou no produto foi escrito por quem tem sessão. O E08 abre a porta
a **imagens, CSV e XLSX** vindos de fora, e o `dados-e-accoes-sensiveis.md` já nomeou as
armadilhas antes de existirem. Vou às três.

**SVG é um documento com script lá dentro, não uma imagem.** Aceite como logótipo e servido
na página do restaurante, é XSS armazenado que se instala sozinho. Teste: carregar um SVG
com `<script>` e exigir que **não** seja servido em linha — convertido, servido como
ficheiro, ou recusado. As três são respostas; renderizar não é.

**Buscar imagem por URL é um pedido que o NOSSO servidor faz.** Sem restrição de destino,
oferecemos um proxy para a rede interna. Teste: apontar a `127.0.0.1`, a `169.254.169.254`
e a um endereço privado, e exigir recusa nos três. Um destes três a passar é o mesmo que
nenhum estar guardado.

**O CSV exportado é executável.** Um campo que comece por `=`, `+`, `-` ou `@` é fórmula
para as folhas de cálculo. Um prato chamado `=HYPERLINK(...)` torna-se código na máquina de
quem abre o relatório — **e é a única injecção em que o atacante não toca no nosso sistema**:
escreve no nome do prato e espera. Teste: exportar um produto com esse nome e exigir que o
campo saia neutralizado.

## O aceite 1 é o que mais me interessa

> *"Falha no meio da publicação mantém a versão anterior inteira disponível."*

Publicar é o momento em que o restaurante fica exposto. Uma publicação que falha a meio e
deixa metade da carta nova e metade da velha é pior do que uma que não acontece.

**Testo os dois lados**, como sempre: uma publicação que falha a meio deixa a anterior
**inteira e servível**; e uma que corre até ao fim **troca mesmo**. Se só testar a falha,
passa um sistema que nunca publica.

## O aceite 2 — importar duas vezes

Mesma família da idempotência do E06, agora com ficheiros. Repetir a importação com
estratégia de actualizar **não duplica SKUs**, e a pré-visualização mostra o que vai mudar
**antes** de mudar. E o par: importar coisas **diferentes** tem de criar coisas diferentes,
senão passa um sistema que ignora o segundo ficheiro.

## O que verifico mais

| Verifico | Porque decide |
| --- | --- |
| Pré-visualização não é adivinhável por URL | um link previsível é um link público |
| Substituir média não quebra referências publicadas | a carta viva não pode partir por uma troca de foto |
| Tradução volta a **pendente** quando a origem muda | senão fica uma tradução que já não traduz nada |
| Ausência de fornecedor mantém edição manual | e não bloqueia nem inventa |
| Bloqueio claro sem preço ou com revisão pendente | *"não invente conteúdo para passar no checklist"* |
| Publicação **não reescreve pedidos existentes** | um pedido antigo guarda o que foi vendido |
| Restauração cria **nova** revisão | e não reescreve a história |
| Os 10 IDs | CAT-014/015, 023-027; ONB-005/006; SET-012 |

## Passo 8, com alvo herdado

Depois da revisão: aplicar-me a régua. E há um alvo já escrito — **dividir o `base` em três
ramos**, com o desenho e as medições em `CI-CUSTO.md`. A condição é a mesma que respeitei da
última vez e funcionou: **árvore parada**, e validar contra o **esquema** do Actions, não
contra o analisador de YAML.
