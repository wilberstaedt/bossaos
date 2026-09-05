# Régua do E22 — TPV, contas e caixa

> **Escrita a 05/09, com o JR já a construir a etapa.** Não é escrita antes,
> como as outras, e digo-o à cabeça: falhei em escrevê-la a tempo porque estive
> dentro do E21. **Escrevi-a sem ler o código dele** — só a partir de
> `docs/architecture/dinheiro.md`, que é anterior e é meu. Se algum aceite
> parecer talhado à medida da entrega, é sinal de que falhei nessa restrição, e
> quero que seja apontado.

**É a etapa de maior risco do projecto.** Um erro numa tela mostra-se e
corrige-se. Um erro numa caixa vira dinheiro que não existe, ou que existe e
ninguém sabe de quem é.

## 1. O centavo não se perde, e não basta a soma bater

*«Unidades mínimas inteiras, com código de moeda.»* A guarda `validar-dinheiro.sh`
já cobre a representação e está calibrada dos dois lados — **não lhe abram
excepção.** Se ela acusar um nome, muda-se o nome, como se fez com o `total` das
zonas que contava pessoas.

O que ela **não** cobre e eu exijo: **a divisão.** Dividir uma conta de `1000`
por três dá `333 + 333 + 334`, e a soma tem de voltar a dar `1000` — não `999`.
Exijo o caso do resto e o caso do arredondamento de imposto, e exijo o par:
**uma divisão que dá exacto continua exacta**, senão «soma sempre ao último»
passa os dois.

## 2. Indeterminado NÃO é falhado, e é aqui que se perde dinheiro a sério

O contrato chama-lhe «o estado que mais dói». Um pagamento cuja resposta não
chegou **não é recusado**. Tratá-lo como recusado cobra duas vezes; tratá-lo como
aceite serve à borla.

Exijo os três estados distintos no registo **e no ecrã** — e a distinção medida
no **texto que a pessoa lê**, não num atributo. E o par: **um indeterminado que
se resolve** muda de estado, e o que fica pendente **não é varrido para
falhado** por um limite de tempo.

## 3. Captura, anulação e devolução são TRÊS coisas

Não são estados de uma mesma máquina com nomes bonitos. Anular antes da captura
não é devolver depois dela — o dinheiro esteve ou não esteve na conta de alguém.
Exijo que o produto **recuse** a operação errada para o momento, e exijo o
controlo negativo que colapsa as três numa só: se a suite continuar verde, elas
não estão separadas.

## 4. A caixa é dinheiro FÍSICO

Cartão e liquidação do adquirente **não entram no caixa como notas**. Exijo a
prova de que um pagamento por cartão **não** mexe no saldo de caixa, e o par: um
pagamento em numerário mexe.

E a diferença de fecho — o que falta ou sobra na gaveta — **existe e regista-se
como diferença**, não se dilui. Uma caixa que fecha sempre certa é uma caixa que
não está a medir nada.

## 5. Tudo o que toca dinheiro deixa rasto que não se apaga

Abrir, fechar, corrigir, sangrar, reforçar. **Rasto que não se apaga** quer dizer
sem `UPDATE` e sem `DELETE` — como as `audit_events`, com gatilho a recusar, e
não com a promessa de que ninguém o fará. Exijo o controlo negativo que tenta
apagar e **tem de falhar na base**, não na aplicação.

## O que reprovo à cabeça

- **Alcance, e desta vez exaustivo.** Varredura completa das funções da etapa,
  não amostragem — foi assim que assinei o E20 verificando cinco de oito. Cada
  aceite aponta a **linha de produto** que o exercita.
- **`Number()`, `parseFloat` ou aritmética de vírgula flutuante** em qualquer
  caminho de dinheiro.
- **Verde sobre caixa vazia.** Declara-se quantos movimentos existiam.
- **As 19 telas sem navegador**, cinco larguras, ES/PT/EN.
- **E o que o E21 acabou de reprovar: se estas 19 telas nascerem sem porta,
  reprovo à cabeça.** Ver `docs/architecture/portas-e-navegacao.md`. Não aceito
  mais um módulo entregue a que ninguém chega.
