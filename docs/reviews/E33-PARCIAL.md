# E33 — revisão em curso

> Estado: **em curso**, 06/09 às 08h00. Este ficheiro existe para o trabalho não
> se perder entre ticks. **Não é uma assinatura.** A assinatura sai em `E33.md`
> quando os seis pontos da [régua](ALVO-E33.md) estiverem medidos.

## Ponto 3 da régua — o aceite que decide: **PASSA**

A fronteira do E05 sobrevive ao E33. Medido ao vivo, com controlo negativo:

| estado | `provar-plataforma.sh` |
| --- | --- |
| fronteira intacta | 0 falhas |
| `GRANT INSERT` ao `bossaos_app` nas duas tabelas | **falha** — «o runtime ganhou escrita em entitlement_grants: a fronteira do E05 caiu» |
| reposta | 0 falhas |

E o guião repõe a fronteira sozinho no fim, o que é a diferença entre um plante e
um estrago.

**Achado a favor:** a `entitlement_grants` tem RLS que bloqueia a escrita do
runtime **mesmo com o `GRANT` aberto**. Defesa em profundidade real na tabela
mais perigosa da etapa — descoberto por acidente, ao ver o código de erro errado.

**Achado contra mim, não contra a etapa:** a régua mandava provar isto com a
`provar-separacao-de-credenciais.sh`, e essa **ficava verde com a fronteira
aberta**. Cobria DDL e identidade; as concessões, nunca. Corrigido em `5b3d576`,
com controlo negativo. Cobertura presumida pelo nome é a mesma família de defeito
que uma lista que envelhece.

## Ponto 5 da régua — segurança e exportação fora do plano: **PASSA**

Gatilho `capacidade_protegida_nao_entra_no_plano` na `plan_capabilities`.
Medido ao vivo, com positivo ao lado para o verde não ser vazio:

- `prova.banal.NNN` → **entra** (o caminho funciona);
- as **oito** protegidas, uma a uma → **todas recusadas**, com
  `capacidade_protegida_atras_do_plano` e a dica a nomear a capacidade.

A lista vive em SQL e não numa constante do produto: muda-se numa migração, com
nome e data, e não num commit que ninguém revê.

**Nota de percurso:** o meu primeiro positivo falhou com `null value in column
"id"` — o achado 2 do JR (o `@default(uuid())` do Prisma é do lado do cliente)
a aparecer sozinho, num sítio onde ninguém o foi procurar.

## Ponto 1 da régua — as quatro condições: **PASSA na base**

Medido ao vivo, com o positivo primeiro:

| sonda | resultado |
| --- | --- |
| sessão válida | **entra** |
| motivo com 5 caracteres | `sessao_tem_motivo` |
| âmbito vazio | `sessao_tem_ambito` |
| prazo no passado | `prazo_e_futuro` |
| sem prazo nenhum | `NOT NULL` em `expira_em` |

E **zero** colunas `activa`: estar viva deriva, não se escreve. O runtime tem
`SELECT` e mais nada sobre `support_sessions` — a casa vê e não apaga.

**Nota de percurso, e é a lição:** a primeira corrida destas cinco sondas deu
cinco recusas — todas pelo **meu** erro de tipo (`text[]` contra
`"AmbitoDeSuporte"[]`). Se eu tivesse escrito só as quatro que deviam falhar,
tinha concluído que as restrições funcionam sem ter medido nenhuma. **Foi o
controlo positivo que apanhou isto**, e é a terceira vez esta noite.

## Ponto 6 da régua — reprocessar não duplica: **PASSA, com uma RETENÇÃO**

`CREATE UNIQUE INDEX um_trabalho_por_identidade ON platform_jobs (identidade)`,
com a identidade derivada por gatilho — não escrita pelo produto. Medido: a
segunda inserção da mesma identidade é recusada pela restrição.

### RETENÇÃO 1 — a identidade do trabalho não tem a organização

```
identidade := tipo || ':' || alvo || ':' || tentativa
```

**Sem `organization_id`**, e o índice único é **global**. A tabela tem
`organization_id NOT NULL` com chave estrangeira: é por inquilino por desenho.
Duas casas que enfileirem o mesmo tipo sobre o mesmo alvo na mesma tentativa
colidem — a segunda leva `duplicate key` e o trabalho dela **nunca entra**.

Não é hipótese: apanhei-o porque a minha própria sonda escreveu `identidade =
'sonda2'` e a base guardou `EXPORTACAO:alvo:1`. O gatilho ignora o que o produto
escreve, que está certo — mas o que ele deriva não distingue casas.

**Hoje não colide, e é por isso que a correcção é barata:** `enfileirarTrabalho`
não tem chamador nenhum no produto — só o `reprocessarTrabalho` a chama. O
caminho de escrita ainda não tem porta. Depois de ter, mudar a chave é uma
migração com dados lá dentro.

**Pergunta para o JR, não ordem:** é omissão, ou é deduplicação global
deliberada? Se for deliberada, falta o comentário a dizê-lo — e falta explicar
por que razão uma tabela por inquilino tem chave que atravessa inquilinos.

## Por medir

| ponto | o quê |
| --- | --- |
| 1 | As quatro condições da sessão de suporte — temporária, visível, com âmbito, com motivo |
| 2 | O rasto guarda a pessoa e não o papel |
| 4 | Nenhum segredo em ecrã, registo ou auditoria |
| 6 | Reprocessar não duplica |
