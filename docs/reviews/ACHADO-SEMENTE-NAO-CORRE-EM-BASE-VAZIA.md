# CORRIGIDO: a semente corre numa base vazia — eu é que a corri mal

> 08/09. Este ficheiro afirmava que `semente-inspeccao.ts` nunca tinha conseguido
> correr numa base vazia, e que havia uma «ordem escondida» no repositório.
> **As duas coisas são falsas.**

## O que se passou de facto

Depois do `DROP` corri `semente-inspeccao.ts` **directamente**, e ela rebentou em
`categories_organization_id_fkey` porque `IDS.orgA` não existia. Concluí que a
semente estava partida. Não estava: **eu usei o ponto de entrada errado.**

O ponto de entrada é `inspeccao/semear.ts`, e ele faz exactamente a ordem certa:

    execFileSync(node, ['packages/db/prisma/fixtures.ts'])        // cria orgA/orgB
    execFileSync(node, ['packages/db/prisma/semente-inspeccao.ts'])

A ordem **não está escondida**: está escrita em código, num ficheiro chamado
`semear.ts`, com um comentário a explicar porque é que corre em dois processos
(a credencial de migração não entra no processo do arnês). Eu chamei-lhe ordem
escondida sem ter aberto o ficheiro que a declara.

E `fixtures.ts` não é «um módulo que as provas importam»: é **um script
executável**, com um bloco `if (import.meta.url === ...)` no fim que chama
`semear(url)` quando o ficheiro é corrido. **Ninguém importa `semear` — zero
ocorrências no repositório inteiro.** A minha afirmação anterior de que «36
provas chamam `semear()`» era falsa: as 12 ocorrências que contei em `provas/`
são funções locais com o mesmo nome, e nenhuma é esta.

## A medição, com o ponto de entrada certo

Base recém-criada, migrações, e depois `fixtures.ts` → `semente-inspeccao.ts` →
`semente-demonstracao.ts`. **Ambas as sementes passam.** Nove utilizadores:

    ana@marina-oropesa.example      bruno@marina-barcelona.example   } fixtures
    carla@exemplo.example           diogo@bossaos.example            }
    demo@bossaos.invalid            sala@bossaos.invalid             } demonstração
    painel@inspeccao.example        painel-b@inspeccao.example       } arnês
    painel-c@inspeccao.example                                       }

Três organizações: `bossa-demo`, `marina-oropesa`, `marina-barcelona`.

**Nove, e não cinco.** A minha tabela de contagens esperadas estava errada pela
terceira vez, e sempre pelo mesmo motivo: omiti o `fixtures.ts` por acreditar que
era só das provas.

## O que fica, e é real mas pequeno

Corrida sozinha, a semente falha com um erro de chave estrangeira opaco em vez de
dizer «falta correr o `fixtures.ts` primeiro». A dependência está declarada no
`semear.ts`, mas **não no sítio onde rebenta**. Isso é uma mensagem de erro
melhor, não uma mudança de desenho — e não a faço sem ordem.
