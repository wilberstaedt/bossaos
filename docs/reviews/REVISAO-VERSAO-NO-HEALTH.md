# Revisão: a versão no `/api/health` — 08/09, 14h10

## O que verifiquei, e o que NÃO verifiquei

**Não corri a prova ponta-a-ponta, e digo-o em vez de a dar por feita.** O
`provar-versao-no-health.sh` faz um `next build` completo e levanta um servidor. Ao
decidir, o `mac-health` dava **OK** mas com **5 agentes contra um orçamento de ~5** e
**69 MB livres**. Ia gastar um build para confirmar uma coisa que ele já exerceu e
reportou com precisão, e o preço era arriscar a sessão dos dois.

Uma regra de saúde que só cumpro quando não me custa nada não é uma regra. **Fica
declarado: esta revisão é estática, não é exercida.**

O que dá para verificar sem build, e verifiquei:

- o campo chama-se **`versao_do_build`** — o nome carrega a ressalva, não a nota de
  rodapé. É o que o build diz que é, e não substitui a etiqueta que o Portão 4 lê:
  **um responde de fora, o outro mede**;
- o corredor distingue **três** desfechos, e não dois: campo ausente é FALHA com a
  razão escrita («ausente lê-se como build antigo, não como não sei»), valor errado é
  FALHA, e só o valor certo é verde.

E aceito duas decisões dele que são melhores do que o que eu tinha pedido:

- `||` em vez de `??`, porque `docker compose build` com `VERSAO=` passa **cadeia
  vazia**, não ausência — o `??` deixava passar o vazio;
- a rota **não** passa pelo `loadEnv`: fazer o ecrã da vivacidade depender de um
  carregamento que pode lançar era trocar uma pergunta por um problema;
- e a prova é **pela porta e não por importação** — a primeira versão importava a
  rota num teste de nó e não corre, porque `next/server` não resolve fora do build.
  «Ainda bem: o terceiro controlo só se sabe pedindo.»

## O sistema apanhou-se a si próprio, e é a quarta vez hoje

A guarda que fizemos ontem à noite recusou o trabalho **dele** de hoje, com «capturado
com a árvore suja». Estava certa, e o erro era o que lhe tinham dito: o `arvoreLimpa`
perguntava por `apps/` e `packages/` **inteiros**, e a impressão do produto só cobre
`.ts/.tsx/.css`. As capturas de marketing vivem em `apps/web/src/demonstracao/`, logo
**capturar sujava a árvore** e o carimbo dizia `arvoreLimpa: false` para sempre.

É o mesmo defeito do `git log` sem filtro de extensão que curámos de manhã: **o
medido tem de coincidir com o declarado.** Quarta vez hoje, em quatro sítios
diferentes.

O que mudou é quem o encontrou. As três primeiras fomos nós, a olhar. Esta foi **a
guarda construída para a terceira** a acusar a quarta, num sítio onde ninguém estava
a olhar. Uma família de instrumentos que começa a apanhar a sua própria classe de
erro vale mais do que a soma das curas que a fizeram nascer.
