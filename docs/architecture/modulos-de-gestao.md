# Módulos de gestão

> E00. Traduz o CT-12. **Última lacuna do contrato** — os 20 CT do pacote ficam cobertos
> com este.

## O modo de falha é um número certo à vista e errado por dentro

Nas outras áreas, o que corre mal parte. Aqui não parte nada: produz-se **um número
plausível**, alguém olha para ele, e toma uma decisão sobre o negócio. Comprar mais daquilo.
Tirar aquele prato da carta. Contratar.

A regra que encabeça o CT-12 é a defesa inteira:

> *"Não completam informação desconhecida com zeros ou números de demonstração."*

**Desconhecido é uma resposta.** Não é zero, não é uma estimativa disfarçada, e não é o
número da demonstração que ficou lá. Um painel que diz "não sei" é útil; um painel que
inventa é pior do que não existir, porque tem a autoridade de um facto.

## A regra-mãe: custo desconhecido dá margem indisponível

Se o custo de um prato não está registado, a margem **não é 100 %**. É **indisponível**.

É o exemplo mais claro de tudo isto porque o número falso é o mais bonito do ecrã: um custo
tratado como zero produz a melhor margem da carta, e o prato sobe ao topo da lista de
"mais rentáveis" precisamente **por lhe faltar informação**. A ausência de dados inverte o
resultado em vez de o esconder.

## Palavras que não são sinónimas

Receita · recebimento · taxa · repasse · despesa · caixa. Seis coisas, seis campos.

E a que o contrato nomeia de propósito: **a soma das comandas abertas não é facturação
recebida**. Uma mesa a comer não é dinheiro no banco, e chamar-lhe isso faz um restaurante
achar-se com liquidez que não tem — no dia em que precisa dela.

Indicadores operacionais do Restaurant podem usar pedidos aceites e servidos, e são
informativos. **Receita liquidada, custos e caixa só vêm do módulo correspondente.**

## Três erros de aritmética que passam despercebidos

1. **Média de percentagens não é a percentagem.** Uma unidade com 50 % sobre 2 vendas e
   outra com 100 % sobre 100 não dão 75 %. Cálculo ponderado, sempre.
2. **Moedas diferentes não se somam.** Consolidar várias unidades exige agrupar por moeda,
   ou converter com política e fonte **explícitas** e ditas no ecrã. Um total sem moeda é
   um número sem significado.
3. **Uma taxa precisa de denominador e de intervalo.** "No-show de 12 %" sobre o quê, e
   entre que datas? Sem os dois, é uma opinião com casas decimais.

## Saldos derivam-se, não se escrevem

Stock e fidelidade são **livros de movimentos**. O saldo é derivado, e uma contagem gera um
**ajuste com motivo** — não uma sobreposição do valor.

Pontos e créditos têm fonte, regra **versionada** e reversões. **Expiração e resgate não
dependem de sobrescrever um saldo**: quem sobrescreve perde a história e não consegue
explicar a um cliente irritado porque é que os pontos dele desapareceram.

## Coisas que não podem estar em dois sítios

- **Mercadoria em trânsito não está disponível nas duas unidades.** Saída, trânsito e
  recebimento ligados, com permissão nas duas pontas.
- **Reserva de stock liberta-se antes de consumir.** Cancelar antes do consumo liberta;
  depois, regista perda ou retorno comprovado. **Recall não gera nova baixa** — a mesma
  regra que está no KDS, vista do lado do inventário.
- **Compras: aprovação, recebimento parcial e pagamento são estados separados.** Entrada
  idempotente; devolução mantém a relação com o recebimento que a originou.

## CRM

**O cliente pertence ao inquilino.** Um telefone ou email igual em dois restaurantes **não**
cria um perfil global partilhado — seria uma fuga entre inquilinos disfarçada de
conveniência, e das piores, porque revela hábitos de uma pessoa a um negócio que ela nunca
visitou.

Fundir dois registos exige rever histórico **e consentimentos**: a fusão não pode herdar um
"sim" que a pessoa deu noutro contexto.

Campanhas: rascunho, audiência, teste, autorização, envio — e **revalidar o consentimento no
momento de enviar**, não no momento de compor.

## Equipa

`EmployeeProfile` **não** é `User`. Uma pessoa pode trabalhar sem conta, e uma conta pode
não ser uma pessoa da equipa.

Registo de ponto e correcção são **históricos**: corrige-se com um registo novo, nunca
apagando o anterior. Turnos e pausas respeitam fuso e escopo.

## Relatórios

Cada relatório carrega **definição, período, fuso, moeda, amostra e estado**. Um número sem
estes seis não é auditável, e um relatório que não se consegue reproduzir não se consegue
contestar.

**A exportação usa os mesmos filtros e as mesmas permissões que o ecrã.** Uma exportação
mais generosa do que a vista é uma fuga com aspecto de funcionalidade.

## O que não se presume

Módulos laboral, contabilidade legal, banco e publicidade externa **não existem** por haver
ecrãs de equipa, financeiro e campanhas. O que se implementa é o escopo descrito; o resto
integra-se com quem o faz, e fica como pendência **verificável** em vez de meia
funcionalidade.

## Os casos

| Caso | Esperado |
| --- | --- |
| Prato sem custo registado | margem **indisponível**, não 100 % |
| Comandas abertas | não entram em facturação recebida |
| Duas unidades, moedas diferentes | agrupado ou convertido com fonte dita |
| Média de percentagens | ponderada |
| Taxa sem intervalo | não se apresenta |
| Contagem de stock diferente do saldo | ajuste **com motivo** |
| Pontos expirados | movimento de expiração, não saldo reescrito |
| Mercadoria em trânsito | indisponível na origem **e** no destino |
| Recall | sem nova baixa |
| Mesmo telefone em dois inquilinos | dois clientes, não um |
| Exportar um relatório | mesmos filtros e permissões do ecrã |

**Controlo negativo**: semear um produto **sem custo** e exigir que o relatório de margem o
mostre como indisponível. Se aparecer com um número — qualquer número — o defeito está lá.
E um teste que só usa produtos com custo completo nunca o encontra: é a versão desta área
do verde sobre população zero.

## Os cinco números das reservas, definidos — contrato do E19

A regra 3 acima diz que uma taxa precisa de denominador e de intervalo. O E19
entrega o relatório onde isso deixa de ser regra e passa a ser cinco decisões
concretas. Escrevo-as antes de existir código, porque **um número mal definido
não dá erro: dá um valor plausível**, e ninguém descobre até alguém tomar uma
decisão com base nele.

### Covers

**Pessoas sentadas, não pessoas marcadas.** Um grupo de 4 que aparece com 3 são
3 covers. Um walk-in é um cover — não veio de reserva, mas jantou.

Quem contar reservas e chamar-lhe covers está a contar intenção e a chamar-lhe
serviço. Numa casa com walk-ins, os dois números afastam-se muito.

### Ocupação

**Lugares ocupados a dividir por lugares disponíveis, ao longo de um intervalo.**
Os dois lados precisam de decisão explícita:

- o denominador conta só as **horas de serviço**. Uma casa fechada à segunda não
  tem 0 % à segunda: **não tem dado nenhum**. Misturar as duas coisas puxa a
  média para baixo e faz a casa parecer pior do que é, todas as semanas.
- as mesas bloqueadas para obras saem do denominador enquanto estão bloqueadas.
  Contá-las como disponíveis castiga a casa por uma decisão dela.

### Cancelamento

Duas linhas separadas, nunca somadas: **cancelado por quem reservou** e
**cancelado pela casa**. São coisas opostas. Um cliente que desmarca com dois
dias é comportamento normal; a casa a desmarcar é um problema de operação. Um
número só, com os dois lá dentro, esconde exactamente aquilo que o dono precisa
de ver.

O intervalo de antecedência vai junto: desmarcar com dois dias e desmarcar às
19h55 não são o mesmo facto.

### No-show

**Uma reserva que chegou ao fim da janela de tolerância sem ninguém aparecer.**
Duas coisas que isto obriga a decidir, e que ninguém decide a tempo:

- **A tolerância é da casa, não nossa.** Quinze minutos numa, quarenta noutra.
  Sem ela configurada, o número é a nossa opinião disfarçada de medição.
- **Um atrasado que é sentado NÃO é no-show**, mesmo que a mesa já tivesse sido
  dada a outro. Se o produto marcar no-show quando liberta a mesa, passa a
  contar como falta do cliente uma decisão da casa.

### Origem

De onde veio a reserva: página pública, telefone atendido pelo host, walk-in.
**O walk-in tem origem** — é a origem mais comum em muitas casas, e omiti-lo faz
a página pública parecer responsável por 100 % do movimento.

### O que isto obriga

Guardam-se os **acontecimentos** com o momento em que aconteceram — sentou,
saiu, desmarcou, não apareceu — e os cinco números **derivam-se**. Nenhum deles
é uma coluna que alguém incrementa: um contador incrementado não se consegue
recontar depois de a definição mudar, e a definição vai mudar.

E a definição fica **versionada com o relatório**. Um relatório de Março tem de
poder dizer com que definição de no-show foi feito, senão a comparação com Abril
é entre duas coisas diferentes com o mesmo nome — que é o pior dos casos, porque
parece que corre bem.
