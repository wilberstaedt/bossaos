# A conta da demonstração autentica-se e não pertence a nada

*08/09, a desbloquear os recortes do bloco 4.*

O JR ficou preso em `/kds/{unidade}/{estação}` e `/pos/{unidade}` a devolverem **404**
no inquilino de demonstração, com a estação e a unidade a existirem na base. Ele
descreveu-o certo: «a conta de captura não é pessoal daquela unidade».

**O 404 é a guarda a acertar, não a falhar.** `carregarKds` percorre as organizações
do actor, procura a unidade dentro do escopo dele, e faz `notFound()` se não a
encontrar — ninguém que não seja da unidade vê o KDS dela. Funcionou exactamente como
está escrito.

## O que a base diz

| conta | senha | organização |
|---|---|---|
| `demo@bossaos.invalid` (`CONTA_DA_DEMO`) | **tem** | **nenhuma** |
| `sala@bossaos.invalid` (Marta) | **nenhuma** | `bossa-demo` |

**As duas metades de uma conta que funcionaria estão em utilizadores diferentes.** A
que entra não pertence; a que pertence não entra.

Nasceram por caminhos diferentes e é daí que vem a separação: a `demo@` é criada em
`demonstracao-comum.ts` pela porta do `better-auth` — passou a nascer aí quando o
`disableSignUp` fechou o registo — e a `sala@` é criada por SQL directo em
`semente-demonstracao.ts:52`, com a `membership` ao lado. Cada metade foi feita bem no
seu ficheiro. Ninguém escreveu a linha que as junta.

## A cura

**Dar à `CONTA_DA_DEMO` uma `membership` em `bossa-demo`, na semente**, junto de onde
o utilizador é criado. Não se toca em `carregarKds`: a guarda está certa e é ela que
está a provar-se agora.

Trocar a captura para a `sala@` **não é opção** — ela não tem credencial, não se
autentica, e forjar-lhe uma sessão mediria um cookie e não o produto, que é a razão
escrita no próprio ficheiro para a demo se registar pela porta real.

## E isto não é só dos recortes

`demo@bossaos.invalid` é a conta que eu **publiquei ao Matheus** no guia de percurso
de teste, como a conta com que ele havia de entrar e ver o backoffice. Se ela não é de
organização nenhuma, o que ele viu ao entrar foi um backoffice sem inquilino.

**Medido em `bossaos_dev`, depois da reposição de hoje. Em produção NÃO está medido** —
e não vou inferir prod a partir de dev, que é o erro que já fiz três vezes hoje. O que
se pode dizer é que a semente é o mesmo código; se prod correu esta semente, prod tem
a mesma separação. **Fica como pendência a verificar, não como facto.**
