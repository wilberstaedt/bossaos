# A identidade dentro de um inquilino

> Escrito a 04/09, depois de a tela de equipa (`ORG-007`) devolver 500 **desde
> sempre**. A causa não era um defeito: era esta regra a funcionar, sem estar
> escrita em lado nenhum. Uma regra que só existe nas políticas da base é uma
> regra que a próxima pessoa descobre a partir de um 500.

## O que a base já decide, medido e não suposto

`users` tem **duas** políticas de linha:

| Política | Alcance | Para quem |
| --- | --- | --- |
| `autenticacao_ve_identidades` | `true` | a credencial de **autenticação**, que faz login |
| `identidade_propria` | `id = app_utilizador_actual()` | toda a gente o resto do tempo |

E `memberships` tem `tenant_isolation` — `organization_id = app_organizacao_actual()`.

**A consequência, dita em voz alta:** o runtime a agir por uma pessoa vê **uma
linha** de `users` — a dela. Uma tela que liste colegas e junte `users` recebe
nulos e rebenta, e foi exactamente isso que aconteceu.

**Isto não é uma limitação a contornar. É a regra.** A identidade é **global** e o
inquilino é **local**: saber que existe uma conta chamada Ana não é um direito de
quem administra um restaurante. O CT-04 separa as credenciais precisamente para
que uma injecção bem-sucedida num inquilino não devolva a lista de contas do
mundo.

## Como um nome chega então a uma tela de inquilino

**Por uma função `SECURITY DEFINER` estreita, limitada à organização actual.** É o
padrão que este projecto já usa em `publico_carta` e em `vincular_dominio`: a
função sabe uma coisa só, devolve o mínimo, e o direito de a chamar é explícito.

A função recebe a organização do contexto — não como argumento de quem chama — e
devolve, para os `memberships` **dessa** organização, apenas o que a tela precisa
de desenhar. Nome e email de quem partilha a organização com quem pergunta; nada
mais, e nada de quem não partilha.

**O que NÃO se faz, e é a saída tentadora:**

1. **Alargar a política de `users`.** Faz a tela renderizar e devolve ao runtime a
   capacidade de enumerar contas — troca um ecrã partido por um buraco de
   segurança. Está trancado mecanicamente em `provar-separacao-de-credenciais.sh`,
   que exige que o runtime veja **zero** utilizadores enquanto a migração vê
   alguns.
2. **Copiar o nome para `Membership` e servi-lo dali.** Resolve hoje e mente
   amanhã: a pessoa muda o nome na identidade e o inquilino continua a mostrar o
   antigo. Um nome tem um dono, e o dono é a identidade.
3. **Ir buscar os nomes pela credencial de autenticação.** Ela vê tudo por
   desenho, e usá-la para desenhar um ecrã de inquilino junta as duas coisas que o
   CT-04 separa.

## Como se prova

O par, como sempre. **A tela mostra os colegas da organização** — e **a mesma
função, chamada no contexto de outra organização, não os mostra**. Sem a segunda
metade, uma função que devolvesse toda a gente passava a primeira.

E o controlo que impede o conserto errado: **depois da correcção, o runtime
continua a ver zero linhas de `users` numa consulta directa.** Se esse número
subir, a tela foi arranjada pelo caminho que não se pode tomar.
