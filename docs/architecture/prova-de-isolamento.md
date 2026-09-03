# A prova de isolamento que o E03 tem de passar

> Escrito no E00, **antes** de o E03 começar, para que o alvo não seja definido por quem
> vai ser medido. Isto não é sugestão: é o critério de aceite T01 e T02 tornado executável.

## Porque este documento existe

No E01 aceitei `packages/db` com zero testes, porque a sonda de prontidão exercitava o
caminho por HTTP. **No E03 isso deixa de servir**, e a razão é específica:

> Uma consulta com escopo que corra **fora** da transação que define
> `app.organization_id` não rebenta. A política não encontra contexto, nega, e o Prisma
> devolve **lista vazia**.

Vazio lê-se como "não há nada". O ecrã diria "sem produtos" a um restaurante com cem, e o
teste que só verifica "o inquilino A vê o seu catálogo" passaria na mesma no dia em que
todo o contexto se perdesse — porque o inquilino A também veria vazio, e ninguém está a
olhar para o vazio dele.

## Os quatro casos, e nenhum é dispensável

### 1. Positivo — o contexto funciona
Com `app.organization_id = A`, uma consulta ao catálogo de A devolve **as linhas de A**.
Sem este caso, os três seguintes passam num sistema completamente partido: tudo devolve
vazio, tudo "nega", e o verde é vácuo.

### 2. Inquilino alheio — o RLS apanha
Com contexto A, ler explicitamente uma linha de B por `id` devolve **nada**, e escrever
com `organization_id = B` é **recusado** pelo `WITH CHECK`. Os dois: um `SELECT` protegido
com um `UPDATE` desprotegido é uma porta.

### 3. **Sem contexto nenhum** — nega, e nega para o positivo também
Fora da transação que define o contexto, a **mesma consulta do caso 1** devolve vazio.
É o caso que prova que o vazio do caso 2 vem da política e não de a base estar oca.
Sem ele, os casos 1 e 2 são compatíveis com "existe" e com "não existe".

### 4. Unidade errada dentro do mesmo inquilino — o RLS **não** apanha
Um garçom da unidade X e um da unidade Y pertencem à mesma organização e passam os dois a
política. O que os separa é o filtro do serviço. Este caso tem de falhar **se e só se** o
filtro de serviço for removido — e é o único dos quatro que o RLS não cobre.

## Como se corre, e porque não pelo ORM

O teste liga-se com o **papel real de runtime** — o mesmo do adaptador, sem posse das
tabelas e sem `BYPASSRLS` —, não com a credencial de migração e não pelo cliente Prisma
com privilégios de teste. Uma política que só é verificada por quem já tem permissão para
tudo não foi verificada.

O `provar-separacao-de-credenciais.sh` do E01 já estabeleceu esse papel e provou que ele
não faz DDL. Este teste usa-o.

## O controlo negativo obrigatório

**Desligar a política e ver o teste ficar vermelho.**

```sql
ALTER TABLE <tabela> DISABLE ROW LEVEL SECURITY;   -- e depois reactivar
```

Se os casos 2 e 3 continuarem verdes com o RLS desligado, eles não estavam a medir o RLS —
estavam a medir outra coisa qualquer, provavelmente um filtro de serviço que já lá estava.
É o mesmo padrão que o JR aplicou no E01, quando concedeu `CREATE ON SCHEMA` de propósito
para ver o detector ficar vermelho.

## O que NÃO conta como prova

- Um teste que corre com a credencial de migração.
- Um teste que só usa o cliente Prisma, sem tocar no papel de runtime.
- Um `expect(lista).toEqual([])` sem o caso positivo ao lado.
- Uma sonda HTTP que devolve 200: o 200 diz que a rota respondeu, não que a linha certa
  foi devolvida ao actor certo.
- Contar quantas políticas existem no `pg_policies`. Existir não é aplicar.

## Onde isto reaparece depois

O mesmo contrato vale, com os mesmos quatro casos, sempre que nascer uma tabela de
inquilino: catálogo (E07), publicação (E08), sessões e pedidos (E13-E14), pagamentos (E23),
estoque (E25). **Não é um teste do E03** — é o molde que cada etapa com dados novos repete.
