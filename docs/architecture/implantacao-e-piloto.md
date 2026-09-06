# Implantação e piloto

> Escrito a 06/09, **antes de existir código do E35** — e cinco horas depois de
> eu publicar o staging deste produto num VPS, com **nove paragens**. Oito foram
> defeito meu de instrumento e uma foi uma defesa do produto a funcionar. O que
> está aqui não é teoria: é o que custou a noite.

---

## Fronteira 1 — existe um backup

**Um backup que nunca foi restaurado é uma esperança, não um backup.**

O que se guarda no runbook não é «temos cópias»: é **a data do último ensaio de
restauração e quanto tempo demorou**. Sem isso, o número que se diz ao cliente é
inventado.

**E não se promete RPO nem RTO sem medir.** Propõe-se um objectivo, faz-se o
ensaio, e anexa-se o resultado **real** — que costuma ser pior do que o
objectivo, e é exactamente por isso que se mede.

## Fronteira 2 — preparar não é publicar

**Preparação do piloto não é autorização para publicar.** A autorização é
explícita, de quem manda, e fica registada — com data e nas palavras dele.

> Esta linha tem história noutro produto deste vault: um runbook dizia «nunca
> fazer deploy neste motor», o dono autorizou por escrito, o motor publicou, e o
> runbook ficou três horas a mentir. **A regra que sobrevive é: publicar exige
> autorização dada e registada; sem ela, prepara-se e prova-se.**

## Fronteira 3 — publica-se alguma coisa

Quatro portões, e nenhum é cerimónia. Cada um destes custou uma paragem real na
noite de 05/09:

1. **Não se publica o que não foi assinado.** Se houver etapa por validar, o que
   vai para o ar inclui código que ninguém reviu.
2. **Publica-se um COMMIT, não a árvore de trabalho.** Enviar o disco é uma
   *promessa* de que o disco e o commit coincidem. `git archive`: o que vai para
   o ar existe em git porque não há outra maneira de lá chegar.
3. **Os segredos vivem no servidor e nunca sobem.** `rsync` sem `--delete` e a
   excluir o ficheiro de ambiente — que já foi comido uma vez neste vault.
4. **A versão que RESPONDE é a que foi construída.** Um `up` sem erro não é uma
   publicação: um build que não pegou serve o bundle antigo com ar de sucesso.

**E a sonda do portão 4 não atravessa o produto.** A minha pedia `/versao.txt` e
o encaminhamento por idioma devolveu `/es-ES/versao.txt` — mediu o comportamento
da casa em vez do build. Lê-se a etiqueta da imagem, pelo Docker.

## Fronteira 4 — um passo é feito à mão

**Um passo que fica de fora do script fica de fora da próxima vez** — e é pior do
que isso: **esconde a dependência que o script tem.** Subi uma base à mão com o
ambiente já carregado na minha sessão, e isso escondeu que o compose lê `.env` e
não `.env.prod`. Duas paragens saíram daí, e uma terceira do contentor que o
passo manual deixou no projecto errado.

## Fronteira 5 — mexe-se em infraestrutura partilhada

**Depois de mexer, verifica-se o que NÃO se queria mudar.** O ficheiro do
servidor web servia quatro produtos; confirmei os quatro a 200 depois de
recarregar, e não só o meu. Confirmar só o próprio dá a mesma sensação de sucesso
e nenhuma informação sobre o estrago.

**E antes de mexer, pede-se um número a mais.** Ia matar o processo que segurava
uma porta, convencido de que era lixo das minhas tentativas. Pedi a **idade**:
três dias. Era a aplicação de produção do dono. Sem esse número, a explicação
errada era plausível e coerente com tudo o resto.

## Fronteira 6 — a importação real do cliente

**Ensaio a seco primeiro, e a lista do que a casa tem de conferir antes de
aceitar.** Produtos, preços, idiomas e alergénios — e os alergénios não se
importam por adivinhação: campo vazio é `DESCONHECIDO`, nunca «não contém».

## Fronteira 7 — falta credencial, hardware ou provedor

**Fecha-se o pacote local e marca-se a activação como pendente**, por palavras.
Nunca em branco: uma linha vazia lê-se como uma linha aprovada, e as duas custam
a mesma tinta.

## Fronteira 8 — a entrada progressiva

Starter, depois a operação, depois o Pro **só depois dos critérios dele**. E
define-se **como se volta atrás** antes de avançar — um plano de entrada sem
plano de saída é uma aposta, não um plano.

---

## O que vou exigir como prova

1. **Ensaio de restauração feito**, com a data e o tempo medidos no
   `docs/releases/pilot.md`. Controlo: um runbook que diga RPO sem ensaio anexo
   acende.
2. **Os quatro portões existem e cada um recusa** — com o controlo a violar cada
   um, à vez.
3. **A `pilot.md` distingue feito, pendente e não medido.** Nunca duas colunas.
4. **A importação a seco não escreve nada**, e a lista de conferência sai antes
   de a casa aceitar.
5. **O plano de saída existe** para cada degrau da entrada progressiva.
