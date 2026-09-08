# A Fase 0.4 também não está bloqueada pela porta — e a razão volta a importar

> 08/09, depois do `07f8737`. A correcção «máquina → porta» estava certa em
> descartar a máquina e **larga de mais** no que pôs no lugar.

## O número que decide, remedido

O registo diz:

    conta de demonstração: 0 credenciais
    utilizadores de inspecção: 0

O primeiro confere. **O segundo não.** Medido agora, na mesma base:

| | |
|---|---|
| `users` | **131** |
| `accounts` com `provider_id='credential'` e senha | **127** |
| `users` com `insp` no email ou nome | 3 |
| `users` em `%@bossaos.invalid` (a demonstração) | **0** |

**Há 127 credenciais vivas.** Nasceram *antes* da cura das 22:37 e a cura não
apaga nada — só impede que nasçam novas.

## E a prova que não é uma contagem

Uma tela autenticada foi capturada **agora**, com a porta fechada, pelo projecto
`painel`, que depende do `preparar` e portanto **entra de verdade**:

    MESAS Mesas-1440x900 estado=200 caminho=/es-ES/app/marina-oropesa/puerto/floor
    MESAS Mesas-1440x900 mesas=4
    MESAS Mesas-1440x900 capturada

Não é uma inferência sobre contagens: é a sessão a existir e a tela a sair.

## Portanto o bloqueio é mais estreito do que ficou escrito

| cara | bloqueada pela porta? | porquê |
|---|---|---|
| as três imagens da sala na landing | **sim** | precisam do inquilino de **demonstração**, e o `limparDemonstracao` apaga essa conta a cada corrida — não pode renascer |
| **a Fase 0.4**, o «antes» das Mesas | **não** | o arnês de **inspecção** tem 127 credenciais vivas e entrou há minutos |
| qualquer cliente novo | **sim** | é a pergunta de produto, e é a que importa |

A rota do «antes» é a mesma que as seis capturas do North Star usaram —
`/es-ES/app/marina-oropesa/puerto/floor` — e o estado antigo, em lista, está no
congelamento `483c4a7`, anterior à reescrita `8d2b2c0`. Falta uma árvore de
trabalho nesse commit e um build; **não falta uma decisão do Matheus.**

## Porque é que escrevo isto em vez de o deixar passar

É a lição do próprio `07f8737`, aplicada mais uma vez: *uma razão errada num
registo manda a próxima pessoa esperar em vez de resolver.* «Bloqueada pela
máquina» mandava esperar por RAM. **«Bloqueada pela porta» manda esperar pelo
Matheus** — e para a 0.4 isso é esperar por uma decisão que ela não precisa.

## O que NÃO faço

**Não executo a 0.4.** A Fase 0 é da revisão, e o «antes» tem de sair no formato e
com o nome que o dossiê dela espera — produzir o artefacto errado custa mais do
que não o produzir. Está executável e digo como; executá-la é de quem a desenhou.
