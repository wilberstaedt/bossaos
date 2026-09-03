# Modelo de domínio — núcleo físico

> E00. Fecha o que `MODELO_DADOS_STARTER.md` propôs em lógico. Aqui estão tipos, chaves e
> a mecânica do isolamento. Domínios de módulos futuros ficam com a fronteira definida em
> CT-05 e materializam-se na etapa deles — **não se criam tabelas vazias para o futuro.**

## A hierarquia, e porque é composta

```
Organization ──1:N── Brand ──1:N── Location
     │                                 │
     └── Membership ── RoleAssignment ─┘
```

Toda a tabela de inquilino leva `organization_id`. Isso sozinho não chega: uma FK simples
de `location_id` permitiria apontar para uma unidade de **outra** organização, e o
`organization_id` da linha continuaria a parecer certo. Por isso as referências são
**compostas**:

```sql
UNIQUE (organization_id, id)                              -- em Brand e Location
FOREIGN KEY (organization_id, brand_id)
    REFERENCES brands (organization_id, id)               -- em Location
FOREIGN KEY (organization_id, location_id)
    REFERENCES locations (organization_id, id)            -- em tudo o que é de unidade
```

A base recusa a mistura. Não é validação de formulário, é constraint — e é o que CT-05
quer dizer com "referências compostas devem impedir misturar organization/location".

## O isolamento, em três camadas que não se substituem

**1. A credencial.** O runtime liga-se com um papel que não é dono das tabelas, não é
superuser e não tem `BYPASSRLS`. As migrations correm com outro. Com Prisma 7 isto fica
explícito: o adaptador leva a credencial de runtime, `prisma.config.ts` leva a de migração.

**2. A política.** RLS em todas as tabelas de inquilino, com `USING` **e** `WITH CHECK` —
sem o segundo, um `UPDATE` pode mover uma linha para outra organização e ela deixa de ser
vista, o que parece funcionar e é perda de dados.

```sql
CREATE POLICY tenant_isolation ON <tabela>
  USING      (organization_id = current_setting('app.organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);
```

O `true` no `current_setting` devolve NULL em vez de erro quando não há contexto. NULL
compara falso, logo **sem contexto a política nega** — que é a direcção segura. O contrário
seria abrir por omissão.

**3. O escopo no domínio.** RLS protege a organização. **Não** protege marca, unidade,
estação nem acção: uma `Location` da mesma organização passa a política e continua a ser
proibida para um garçom de outra unidade. Esse filtro é do serviço, e é explícito.

Quem confiar só na primeira camada tem um sistema em que qualquer bug de contexto abre
tudo. Quem confiar só na terceira tem um sistema em que um `findMany` esquecido vaza.

## Contexto por transação

```ts
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_config('app.organization_id', ${orgId}, true)`;
  // ...todas as consultas com escopo, aqui dentro
});
```

O terceiro argumento `true` torna o `set_config` **local à transação**: não sobrevive ao
commit nem ao rollback, e não contamina a ligação seguinte do pool. Sem isso, uma ligação
reciclada levaria o contexto do inquilino anterior — que é a maneira mais silenciosa de
vazar dados entre clientes.

**O risco desta escolha, dito por extenso:** uma consulta feita fora desta transação não
rebenta. A política não encontra contexto, nega, e o Prisma devolve **lista vazia**. Vazio
lê-se como "não há nada", e o ecrã diz "sem produtos" a um restaurante que tem cem. O E03
tem de provar o contrário: teste que corre com o papel real de runtime, com uma consulta
fora de contexto, e que exige que ela devolva vazio **quando devia devolver dados** — para
que a diferença fique medida e não confiada.

## Convenções que não se negociam

| Regra | Porquê |
| --- | --- |
| `id` UUID opaco | Sequencial revela volume e permite enumeração. |
| `created_at`/`updated_at` em UTC | Regras recorrentes guardam timezone IANA à parte. |
| `version` inteiro em tudo o que se edita | Concorrência optimista: `WHERE id = ? AND version = ?`. |
| Dinheiro em `integer` de unidade mínima + `currency` | Nunca `float`, nunca `numeric` implícito. |
| Sem delete físico em entidade com histórico | `archived_at`. O histórico é obrigação, não conveniência. |
| `actor` e `reason` em acção sensível | Auditoria que não diz quem nem porquê não é auditoria. |

## Unicidade que a base tem de garantir

- `SKU` por marca, quando preenchido.
- `slug` público por namespace de rota.
- `command_id` por inquilino + actor + acção.
- Uma sessão activa incompatível por mesa.
- Referência externa por fornecedor + conta.

Todas por constraint transacional. Validar no formulário e não na base é ter a regra
enquanto ninguém corre dois pedidos ao mesmo tempo.
