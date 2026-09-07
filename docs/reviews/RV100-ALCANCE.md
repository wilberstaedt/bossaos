# O classificador de alcance (do JR) — revisão, e o defeito que ele destapou

---

## Ele não classificou de secretária: foi bater a todas as portas

Eu pedi um classificador que dissesse **como** se alcança cada um dos 396. Ele
entregou isso e mais uma coisa que eu não tinha pedido: **visitou os endereços**.

```
âmbito:  396 composições · 178 só-URL · 202 estado-partilhado · 16 provocar
         163/165 endereços abrem · 338 composições atrás de porta aberta
         PRONTAS A CAPTURAR HOJE: 142
```

**A diferença entre classificar e visitar é o que produziu o achado.** Uma rota
escrita no atlas parece sempre plausível; só bater à porta distingue a que existe
da que não.

## As duas portas fechadas, e as duas eram a mesma coisa

`/app/marina-oropesa/brands/marina/catalog/duplicate` → **404**
`/app/marina-oropesa/help` → **404**

Cinco IDs do atlas — `CAT-028` e `HELP-001` a `004` — assinados como
**`validado`**, a apontar para rotas que não respondem. Fui procurar as telas
antes de concluir que não existiam, e **existem as duas**:

| o atlas dizia | onde a tela está |
| --- | --- |
| `/app/[orgSlug]/brands/[brandSlug]/catalog/duplicate` | `app/[orgSlug]/catalogo/duplicar` |
| `/app/[orgSlug]/help` | `app/[orgSlug]/ajuda` (quatro ficheiros, quatro IDs) |

**Não é tela em falta — é o mapa a apontar para o sítio errado.** E o padrão é
nítido: **o produto usa inglês nas rotas públicas de marketing** (`/plans`,
`/faq`, `/trust`) **e português nas internas** (`/ajuda`, `/catalogo`). O atlas
assumiu inglês em tudo.

Verifiquei que a `rota_detalhada` não era a coluna certa antes de mexer — é uma
bandeira («sim», «família; compor na E00»), não um caminho.

## A correcção, e a prova de que funcionou

Corrigi as cinco linhas do `coverage.csv`. As três guardas que o lêem —
`validar-cobertura`, `validar-movel`, `validar-assinaturas` — continuam verdes,
**mas guarda verde não é porta aberta.** A prova é voltar a bater:

| | antes | depois |
| --- | ---: | ---: |
| endereços que abrem | 163/165 | **165/165** |
| composições atrás de porta aberta | 338 | **343** |
| prontas a capturar hoje | 142 | **143** |

**As cinco composições que entraram são exactamente as cinco linhas que corrigi.**
E a sonda dele continua a fechar um endereço inventado, portanto o verde novo
sabe ficar vermelho.

## E respondeu a um NÃO MEDI meu, com uma resposta melhor do que a minha suposição

Eu tinha escrito: *«`publicLocationSlug` e `brandSlug` ficam NÃO MEDI — presumo
constantes, e presumir não é medir. Confirma-os tu.»*

Ele mediu, e a resposta não é «constante»:

> `SEM-RESOLUCAO publicLocationSlug publicOrderId postSlug recibo` ·
> **«nenhuma unidade tem `public_slug` — o sítio público não tem porta»**

O campo existe no esquema (`Location.publicSlug String? @unique`) e **está vazio
na casa determinística**. Não é um parâmetro por resolver: é **uma superfície
inteira sem entrada** — as 36 rotas de `/r/[publicLocationSlug]/…`, que são a
carta que os clientes do restaurante vêem.

**Se eu tivesse tratado a minha suposição como facto**, isto aparecia no dia da
captura, com 36 composições a falhar de uma vez e ninguém a saber porquê.

## O que fica

O `publicSlug` por semear é agora o maior bloqueio único do portão de cobertura,
e cai no mesmo lote que a semente de demonstração — que já está com o outro
implementador. **Registo a coincidência: as duas coisas que faltam para capturar
são a mesma peça.**
