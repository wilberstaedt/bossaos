# Contratos de API

> E00. Fecha `API_STARTER.md` em regras transversais. As rotas concretas estão lá; aqui
> está o que **toda** rota tem de cumprir, para não se repetir 30 vezes.

## Comando e consulta não têm as mesmas obrigações

**Consulta:** filtros validados, escopo resolvido no servidor, selecção mínima de campos,
paginação por cursor quando a lista pode crescer. Nunca `offset` em listas operacionais —
com escrita concorrente, a página 2 perde e repete linhas.

**Comando:** `command_id`, payload validado, `expected_version` quando edita, contexto
resolvido. Mesma chave + mesmo payload devolve o resultado anterior. Mesma chave + payload
diferente é **conflito**, não sobreposição silenciosa.

## O erro é parte do contrato

```json
{ "code": "PLAN_CAPABILITY_MISSING",
  "message": "Este plano não inclui reservas.",
  "field_errors": null,
  "request_id": "01J…",
  "retryable": false }
```

`code` estável — o ecrã decide o que mostrar a partir dele, não do texto. `message`
localizada. `request_id` sempre, porque sem ele o suporte pede capturas de ecrã. E
`retryable` explícito: um cliente que não sabe se pode repetir ou repete sempre, ou nunca,
e os dois são maus.

**Nunca devolver stack, SQL, nome de tabela ou segredo.** Um 500 diz que falhou e dá o
`request_id`; o resto fica no log com correlação.

## Códigos, e o que cada um promete

| Código | Significa | Não significa |
| --- | --- | --- |
| 400/422 | Entrada inválida | Que o utilizador não tem permissão |
| 401 | Sem identidade | Sessão expirada é 401, mas o ecrã não pode dizer "senha errada" |
| 403 | Identidade conhecida, acção negada | **Três razões distintas**: permissão, plano, flag — com códigos diferentes |
| 404 | Não existe **ou** está fora do inquilino | Deliberado: não se revela existência alheia |
| 409 | Versão, estado ou idempotência em conflito | Não é erro do servidor; é o cliente a trabalhar sobre leitura velha |
| 429 | Limite | Tem de dizer quando se pode tentar de novo |
| 503 | Indisponível | Dependência externa em baixo é 503 com o nome dela, não 500 |

O 409 merece nota: no Norte, mapear todos os 409 para "a lease morreu" fez um worker
descartar trabalho concluído e provado. **Um código que significa três coisas obriga o
cliente a adivinhar.** Se 409 pode ser versão, estado ou idempotência, o corpo diz qual.

## Idempotência, e onde ela é obrigatória

Onde repetir duplica efeito com custo: criar organização, convidar, importar catálogo,
publicar, mudar plano, submeter pedido, pagar, reembolsar, receber compra, fechar caixa.

O recibo do comando guarda-se **na mesma transação do efeito**. Guardar depois é uma janela
onde o efeito existe e o recibo não — e a repetição volta a executá-lo.

Consultar `GET /commands/{id}` devolve o estado ao actor original ou a um gestor autorizado.
É isto que permite ao cliente perguntar "o que aconteceu?" depois de um timeout, em vez de
carregar outra vez e esperar pelo melhor.

## Público e privado não partilham cache

Rota pública (carta publicada) tem cache por revisão, locale e canal. Rota autenticada é
`no-store` por omissão. Um cache partilhado sem a chave completa de autorização entrega a
resposta de um inquilino a outro — e é o tipo de defeito que não aparece em teste, aparece
em produção com dois clientes ao mesmo tempo.

## Realtime

SSE com `cursor` e eventos duráveis. A tela que religa manda o último cursor e recebe o
intervalo; se o intervalo já não existir, pede snapshot. **Nunca aplicar versão anterior
por cima de versão actual** — o evento pode chegar fora de ordem e chega mesmo.

Som e notificação são auxiliares. O estado persistente é que manda: uma cozinha que perdeu
o som não pode perder o ticket.

## Upload e exportação

Job com escopo e estado. O resultado é privado, expira, e o **download reverifica
permissão** — não basta ter sido autorizado a pedir. CSV exportado escapa conteúdo que a
folha de cálculo interpreta como fórmula, senão uma célula com `=` vira execução na
máquina de quem abre.
