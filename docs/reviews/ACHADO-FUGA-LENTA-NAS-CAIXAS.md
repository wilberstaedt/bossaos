# CORRIGIDO: a fuga nas caixas não existe

> 08/09. Este ficheiro afirmava que cada semeadura deixava resíduo permanente nas
> três tabelas de caixa. **Está errado, e a medição que o desmente está aqui.**
> Deixo o erro escrito porque a forma dele importa mais do que a conclusão.

## O que eu tinha afirmado

Que uma corrida da semeadura levava `registos 6→7`, `eventos 17→18` e
`movimentos 1→3`, que os gatilhos `movimentos_sao_imutaveis` e
`acontecimentos_de_caixa_sao_imutaveis` impediam qualquer remoção, e que
portanto **ninguém** podia limpar aquilo. Chamei-lhe fuga lenta por desenho.

## A medição que desmente

Numa base recém-criada — `DROP`, `CREATE`, migrações — semeei **duas vezes** e
contei aos três momentos:

    inicio         registos=0  eventos=0  movimentos=2? não: 0
    1a semeadura   registos=1  eventos=1  movimentos=2
    2a semeadura   registos=1  eventos=1  movimentos=2

**A segunda semeadura não acrescenta uma única linha.** A semeadura **já é
idempotente** nas três tabelas. Não há fuga, e não há nada a decidir sobre
identificadores fixos.

O mecanismo estava à vista e eu não o segui: o `principal()` da semente começa
por `await limpar(prisma)`, e o `limparDemonstracao` **desactiva os gatilhos**
(`ALTER TABLE ... DISABLE TRIGGER USER`, linhas 209-216 de `inspeccao-comum.ts`)
antes de apagar, e volta a ligá-los no fim. O registo semeado chama-se
`insp-Caja 1`, que cai dentro do `PREFIXO` que a limpeza usa. Está coberto.

## Onde é que eu errei, que é o que interessa

**Medi numa base suja e li o resultado como se fosse desenho.** Os `6/17/1` que
encontrei eram estado acumulado de meses de corridas sobre uma base que nunca
tinha sido reposta; o incremento que observei nessa base era quase de certeza uma
limpeza que falhou a meio por causa de outro resto, e não a semeadura a
acrescentar por construção. **Já não o posso reproduzir: essa base foi largada.**
Digo-o em vez de arranjar uma explicação que já não posso medir.

E a segunda parte foi pior do que a primeira: escrevi *«não são limpáveis por
ninguém»* sem ter procurado quem as limpava. Bastavam-me três linhas de `grep` —
o `caixa.test.ts` limpa-se exactamente assim, com o mesmo `DISABLE TRIGGER`, e
está no repositório desde antes de eu escrever a frase. **Afirmei uma
impossibilidade a partir de uma falha que observei uma vez.**

## O que fica, e é pequeno

Nada sobre caixas. A pergunta dos identificadores fixos não chega a colocar-se.
