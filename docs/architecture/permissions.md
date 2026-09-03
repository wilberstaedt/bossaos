# Permissões — como se decide quem pode o quê

> E00. Fecha `MATRIZ_PERMISSOES.csv` em mecânica. CT-04 é a regra; isto é o como.

## A resolução, por ordem, no servidor

A URL **selecciona** contexto. Não o autentica. Um `orgSlug` na rota é uma pista, não uma
prova, e um `location_id` no payload é entrada do cliente como qualquer outra.

```
1. actor          quem é (sessão válida, não revogada, utilizador activo)
2. organization   a que inquilino pertence este pedido
3. brand/location o escopo concreto dentro dele
4. papel          RoleAssignment aplicável a esse escopo
5. acção          o que se pretende fazer
6. entitlement    a organização comprou esta capacidade?
7. política       limites finos: alçada, campo, período, montante
```

Falhar em qualquer um nega. **Mas nega de maneiras diferentes**, e isso importa:

| Situação | Resposta | Porquê |
| --- | --- | --- |
| Recurso privado de outro inquilino | **404** | Um 403 confirmaria que existe. Não se revela existência. |
| Recurso próprio, acção não permitida | **403** com código de permissão | A pessoa tem de saber que precisa de autorização, não de procurar um bug. |
| Capacidade não incluída no plano | **403** com código de entitlement | Isto **vende-se**. Confundir com falta de permissão perde a conversa comercial. |
| Implementação desligada por flag | **403** com código de indisponibilidade | Não prometer o que ainda não existe. |

Três 403 com códigos distintos, não um 403 genérico. O ecrã que os recebe diz coisas
diferentes: "pede ao teu gestor", "este plano não inclui", "ainda não disponível".

## Nunca devolver dados antes de verificar

A ordem no código é: resolver contexto, verificar escopo, **depois** ler. Não ler primeiro
para descobrir a que inquilino pertence e verificar depois — nessa altura os dados já
estão na memória do processo e um `return` esquecido chega para os enviar.

## O que RLS não faz

A política de linha protege a **organização**. Não sabe de marca, unidade, estação nem
alçada. Um garçom da unidade A e um garçom da unidade B pertencem à mesma organização e
passam os dois a política. O filtro que os separa é do serviço, e é explícito.

Corolário desagradável: **uma consulta pode estar correcta perante o RLS e errada perante
o negócio.** É por isso que o teste de isolamento tem de ter dois casos — inquilino
diferente (RLS apanha) e unidade diferente dentro do mesmo inquilino (só o serviço apanha).

## Concessões que não se alargam

- Um grant de **marca** abrange as unidades dessa marca. Não abrange marca nova criada
  depois sem concessão explícita.
- Um grant de **estação** (cozinha, barra) não dá acesso ao resto da unidade.
- Um convite **não pode conceder mais do que o convidante tem**. Verificar no momento de
  criar e outra vez no momento de aceitar: o convidante pode ter perdido o papel entretanto.
- Revogação invalida acesso **corrente**, não só o próximo login. `permission_version` na
  membership força revalidação.

## Suporte não é dono disfarçado

CT-14. Uma sessão de suporte tem finalidade escrita, prazo, escopo limitado e fica no
rasto com o operador **real** — não com uma sessão de owner emprestada. Expirar deixa
trilha e não deixa acesso residual.

## O que se testa, e o teste que quase todos falham

A matriz tem ~40 acções. Testar as 40 no caminho feliz prova pouco. O que apanha defeito é
o **negativo**: para cada acção sensível, um actor que *quase* podia — mesma organização,
unidade errada; papel certo, alçada abaixo do montante; convite a tentar conceder acima do
convidante.

E um caso que não é óbvio: **exportação e download verificam duas vezes.** Permissão ao
pedir o ficheiro e permissão ao descarregá-lo. Entre as duas coisas o papel pode ter sido
revogado, e um link privado que ainda funciona depois disso é uma fuga com data marcada.
