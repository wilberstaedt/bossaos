# Alvo da revisão do E06

> **Escrito antes de existir uma linha.** O JR arrancou o E06 há dezanove segundos quando
> comecei isto. Ao contrário do E05, aqui a régua é anterior de verdade e não leva ressalva.
>
> Deriva do prompt do E06, do CT-05, do CT-07 e do CT-17, e dos contratos
> `domain-model.md` e `permissions.md` — o E06 é onde se decide **de quem é cada dado**
> quando um restaurante entra.

## Suspeita pré-registada, e desta vez sem ter visto nada

O onboarding é a etapa onde é mais tentador **preencher por omissão para a coisa avançar**.
Um formulário com sete campos e o utilizador a meio: o instinto é pôr um valor razoável e
seguir. E a regra número um dos meus cinco princípios diz o contrário —
**desconhecido é uma resposta**.

O que vou procurar, e nomeio já para não poder mudar de alvo depois:

- **Um horário por configurar NÃO é 09:00-18:00.** É por configurar, e a unidade não abre.
- **Uma unidade sem moeda NÃO é AUD**, nem EUR por o piloto ser em Espanha.
- **Um fuso por escolher NÃO é o do servidor.**
- **Um país por escolher não se infere do IP.**

Um valor por omissão que ninguém escolheu é um dado inventado com aparência de
configuração — e no CT-12 já está escrito o que isso faz a jusante: um número plausível
sobre o qual alguém decide.

## O aceite 1 — repetir após timeout não duplica

É o mesmo problema do `command_id` do CT-09, agora na criação de um inquilino. O caso:
criar organização, o pedido esgota o tempo, o operador carrega outra vez. **Uma
organização, não duas.**

Testo os dois lados, como sempre: a repetição **com a mesma chave** devolve o mesmo
resultado; a criação **genuinamente nova** cria. Se só o primeiro for testado, passa um
sistema que nunca cria nada.

## O aceite 2 — 20:00-01:00, e é o que mais parte

Um turno que atravessa a meia-noite é a armadilha clássica: `abre <= agora <= fecha` dá
**falso** para as 23:30 quando o fecho é 01:00 do dia seguinte. Vou pedir:

| Instante | Esperado |
| --- | --- |
| 23:30 do próprio dia | **aberto** |
| 00:30 do dia seguinte | **aberto** |
| 02:00 | fechado |
| 19:59 | fechado |
| feriado declarado, às 23:30 | **fechado** — a excepção ganha ao semanal |

E tudo isto **no fuso configurado da unidade**, não no do servidor nem no meu. Um teste que
corra com o fuso do processo igual ao da unidade não prova nada: os dois têm de ser
diferentes durante o teste, senão a conversão nunca é exercitada. É o mesmo achado que ele
próprio teve no E04 com o Prisma a ler duas horas adiantado.

## O aceite 3 — Starter chega ao catálogo

Sem exigir mesas, KDS, pedidos nem provedor de pagamento. Vou percorrer o caminho, não ler
a lista de passos: **um checklist que mostra os passos certos e um servidor que exige os
errados é a mesma coisa que não ter checklist.**

## O que mais verifico

| Verifico | Porque decide |
| --- | --- |
| Moeda não muda retroactivamente | uma transacção antiga não pode trocar de moeda por alguém editar a unidade |
| Mudar fuso não reinterpreta carimbos antigos | senão o histórico anda para trás |
| Arquivar não apaga | e **impede novos serviços**, que é a outra metade |
| Dependências visíveis ao arquivar | arquivar às cegas é apagar com outro nome |
| Retomar onboarding interrompido | o estado a meio é estado, não lixo |
| La Societat **identificada como fixture** | CT-17: nome de piloto não é nome no código |
| Os 14 IDs | ONB-001/002/003/010; ORG-001..006, 015; SET-001/002; STATE-013 |

Os IDs conto **com leitor de CSV**, não com `awk` nem `split(',')` — as duas formas
falharam-me hoje no mesmo ficheiro.

## Passo 8

Depois da revisão, procurar nos meus o defeito que encontrar nos dele. E há um alvo
concreto herdado deste tick: o `awk -F,` que me enganou vive em mais sítios? Já corrigi o
`estado.sh`; o `validar-cobertura.sh` foi o JR que corrigiu. **Varrer os sete scripts por
`awk -F,` e `cut -d,` sobre CSV** — se um deles ainda lá estiver, mede outra coluna sem
avisar ninguém.
