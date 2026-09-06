# Como é que o suporte LÊ o que lhe foi concedido — decisão do E34

> 06/09/2026. A J15 corre com todos os controlos verdes e dois passos vermelhos:
> o acesso concedido e a auditoria dele. A concessão existe; o que não existe é o
> caminho de **leitura** que ela autoriza.

## As duas opções que me foram postas, e a terceira que a casa já escolheu

O JR pôs duas: (a) meter a organização da sessão no contexto durante a leitura, e
(b) uma porta estreita `SECURITY DEFINER` que devolve só a lista que a rota
declara — recomendando a segunda «como o resto da casa».

**A casa fez outra coisa.** O E33, na migração `..._a_plataforma_le_o_que_precisa`,
resolveu exactamente este problema com uma **política**, e deixou o argumento
escrito lá dentro:

> *«Uma porta estreita protege as chamadas que existem; uma política protege a
> tabela»* — incluindo as consultas que ninguém escreveu ainda.

E o mecanismo é `CREATE POLICY … FOR SELECT USING (plataforma_e_staff())`, onde o
`plataforma_e_staff()` é `SECURITY DEFINER` e **sem sessão devolve falso**.

## A decisão

**Política `FOR SELECT`, com predicado próprio para a concessão.** Não é a (a) nem
a (b): é o que o E33 fez, com o predicado ajustado ao que a J15 precisa.

1. **Um predicado `SECURITY DEFINER`** — `suporte_com_concessao_viva(org)` — que
   devolve verdadeiro quando a sessão de suporte **actual** tem concessão para
   aquela organização, **não expirada e não revogada**, com âmbito que permita
   ler. Sem sessão devolve falso, pelo mesmo motivo que o `plataforma_e_staff()`:
   `current_setting(..., true)` dá NULL e NULL não está em tabela nenhuma.
2. **A organização NÃO vem do chamador.** Deriva-se da concessão. Um predicado
   que aceite um `org` vindo de fora é uma porta com a fechadura do lado de
   dentro.
3. **`FOR SELECT` e mais nada.** Escrever continua no caminho privilegiado com
   auditoria na mesma instrução, como o E33 estabeleceu. Uma política de escrita
   aqui desfazia a fronteira que a etapa existe para manter.

### Porque não a (a)

Pôr a organização da sessão no contexto **alarga o que a RLS deixa ver enquanto a
sessão durar** — e o âmbito da concessão (`LEITURA`, `CONFIGURACAO`, …) passa a
ser conselho, não fronteira: quem o faz cumprir é a rota que escolheu a consulta.
Qualquer rota futura escrita debaixo daquele contexto herda visibilidade total
por omissão. É a porta larga com o letreiro estreito, e o letreiro não é o que
guarda a casa.

### Porque não a (b)

Uma porta estreita cobre as chamadas que existem hoje. A próxima rota de
diagnóstico terá de escrever a sua, e o dia em que alguém não escrever, lê pela
via normal e a concessão fica por cumprir. **A garantia que vive dentro da coisa
cresce com ela; a que vive numa lista ao lado, não.**

## E a interacção que ninguém disse, e é a que parte a J15

**Com política sozinha, «sem concessão» vira «sem linhas» — e sem linhas lê-se
como 404.** É precisamente o que a régua da J15 proíbe confundir: uma recusa que
diz *o recurso não existe* não distingue controlo de acesso de ausência.

Hoje o produto responde **403**, e o controlo 3 da J15 prova-o. Isso não pode
regredir. Portanto:

- **a rota mantém a verificação explícita da concessão**, que é o que produz o
  403 honesto;
- **a política é a rede por baixo**, que garante que nem por engano se lê o que
  não foi concedido.

Não é redundância: **a verificação dá a resposta certa, a política dá a
segurança.** Uma sem a outra falha de um dos dois lados.

## A auditoria escreve-se no mesmo sítio onde o acesso acontece

A J15 exige registo do acesso **bem sucedido**, com quem, o quê e quando. Se o
registo for uma chamada separada, existe um caminho em que a leitura acontece e o
registo não — e um registo que só apanha alguns acessos é pior do que nenhum,
porque dá a sensação de vigilância sem a ter.

**Auditoria na mesma instrução**, que é o que o E33 já faz do lado da escrita.
