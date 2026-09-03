# O custo da CI — medido a 2026-09-03, 20h40

Medido, não estimado, e escrito antes de ser um problema.

## O que se mede hoje

| Quando | Duração |
| --- | --- |
| De manhã (E01), ~9 passos | **~180 s** |
| Agora (E06 validado), 30 passos | **~640 s** |

**Triplicou em doze horas.** Faltam **30 etapas**, e cada uma traz provas novas: a este
ritmo passa dos trinta minutos antes do E20.

## Onde vai o tempo

```
167 s  Prova — recuperação e segundo factor, ponta a ponta   (espera pelo Mailpit)
 96 s  Prova — acesso, convites e revogação
 53 s  Prova — larguras, contraste, foco e alvos de toque    (Playwright)
 26 s  Prova — prontidão
 25 s  Tipos
 23 s  Build
 40 s  Arranque de contentores + cliente PostgreSQL
 18 s  Migrações do zero
 18 s  Instalar o navegador
```

As duas provas de ponta a ponta são **263 s dos 640** — 41 % —, e tudo corre **em série**
num único trabalho.

## Porque isto importa mais do que parece

Uma CI lenta não é só espera. Com `cancel-in-progress: true`, dois pushes seguidos cancelam
a corrida do primeiro — e quanto mais lenta, maior a janela em que isso acontece. **Já
aconteceu hoje**, e tive de ir confirmar por SHA qual commit é que a corrida verde cobria.
Uma CI de trinta minutos deixa de ser verificação e passa a ser um imposto que se aprende a
contornar.

## Quanto custam as guardas — medido a 20h10, depois de eu as ter acrescentado

Documentei o custo às 20h40 e a seguir acrescentei **dois passos**. Fui verificar a
incoerência em vez de assumir que eram baratas:

```
 8 s  Todos os pacotes medidos
 6 s  Prova — a cadeia de migrações aplica-se DO ZERO
 1 s  Cobertura íntegra (396 IDs)
 1 s  Dinheiro em inteiros
 0 s  Nenhum segredo na árvore
 0 s  Ordem das etapas
```

**~16 s de 640 — 2,5 %.** A incoerência era menor do que eu temia, mas verificar era o
mínimo depois de a apontar.

### Uma duplicação que encontrei ao contar

O `validar-testes.sh` leva 8 s porque **corre os testes de cada pacote outra vez**, só para
os contar — e o passo `Testes` corre-os logo a seguir. Hoje são 8 s; **cresce linearmente
com a suite**, que é justamente a coisa que mais cresce.

Não o mudo agora, e a razão é a mesma da divisão em trabalhos: mexer no `ci.yml` enquanto o
JR lhe acrescenta passos dá conflito. **Ao dividir em trabalhos paralelos, o
`validar-testes` funde-se com o trabalho dos testes** em vez de os repetir — a contagem sai
da mesma corrida que já acontece. Fica no mesmo lote de trabalho, no fecho do E07.

## O que fazer, e porque não agora

**Dividir em trabalhos paralelos.** Três grupos que não dependem uns dos outros:

1. **Rápido, sem base** — cobertura, segredos, dinheiro, ordem, testes por pacote, lint,
   tipos. Uns 60 s.
2. **Base** — migrações do zero, isolamento, acesso, planos, descidas, onboarding,
   recuperação e MFA, credenciais, prontidão.
3. **Navegador** — larguras, contraste, foco, alvos de toque.

O relógio passaria de ~640 s para perto do encadeamento mais longo, ~200 s.

**Não o faço agora por coordenação, não por dúvida.** O JR está a meio do E07 e **edita o
`ci.yml` para acrescentar os passos das provas dele** — reestruturar o ficheiro em três
trabalhos ao mesmo tempo dá conflito garantido, e o custo do conflito é maior do que os
sete minutos que se poupam por corrida esta noite.

**Fazer quando:** no fecho do E07, com a árvore parada, antes de autorizar o E08. Se ao
chegar lá a duração já tiver passado dos 900 s, fazer primeiro e autorizar depois.
