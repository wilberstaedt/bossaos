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
