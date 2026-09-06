# Régua das três jornadas que faltam — J08, J12, J15

> Escrita a 06/09/2026, **antes** de existir uma linha de implementação, que é a
> única altura em que uma régua é honesta. Depois de ver a entrega, qualquer
> critério que eu escreva já vem moldado por ela.
>
> As cinco de G3 eram J08, J09, J12, J14, J15. O JR escreveu a **J09** e a
> **J14** (`provas/jornada.test.ts`, linhas 455 e 618). Faltam três.

## A regra que vale para as três, herdada da J01

Uma jornada que parte de estado preparado é uma prova de segmento com nome
grande. As três têm de cumprir o que a J01 estabeleceu no cabeçalho daquele
ficheiro:

1. **Parte do que não existe.** Organização nova, marca do relógio no `slug`.
2. **Escreve pelas portas que uma pessoa usa** — os mesmos `POST` que o ecrã
   submete. Nenhuma escrita por dentro da base.
3. **Os identificadores vêm do redireccionamento do produto**, não de um
   `SELECT`. Ler um id da base a meio é voltar a preparar estado.
4. **O que é público pede-se sem cookie.**

E a que estas três acrescentam, porque as suas etapas já são posteriores:
**cada passo tem de consumir o estado que o passo anterior produziu.** Se a
jornada consegue correr com os passos por outra ordem, não é uma jornada.

---

## J08 — Pagamento Pro
> *Conta, divisão, método, confirmação, documento e fechamento.*

**O que tem de estar lá**

| Passo | O que prova |
| --- | --- |
| Conta | nasce **dentro da jornada**, com linhas reais de um catálogo criado antes |
| Divisão | as parcelas **somam ao total**, e o produto recusa uma que não some |
| Método | pelo menos dois, e a conta só fecha quando **todas** as parcelas liquidam |
| Confirmação | o estado muda por resposta do produto, não por escrita nossa |
| Documento | existe, tem número, e é **pedido sem cookie** |
| Fechamento | depois de fechada, a conta **recusa** novo pagamento |

**A armadilha desta jornada, dita antes de a ver:** *pagar uma parcela duas
vezes.* A J09 destapou o fecho de caixa que fechava duas vezes; a forma
equivalente aqui é a parcela liquidada que aceita segunda liquidação — e passa
em qualquer prova que só verifique «a conta ficou paga», porque ficou.

**O controlo negativo que a jornada tem de trazer, e que a torna prova:**
repetir o mesmo pagamento da mesma parcela e exigir recusa. Se passar, a jornada
não mede pagamento, mede optimismo. Um segundo controlo, mais barato: uma
divisão cujas parcelas somam **menos** que o total tem de ser recusada na
criação — não descoberta no fim.

**O que NÃO conta como fechamento:** o campo `status` mudar. Conta a **porta**
recusar: o mesmo `POST` que pagou tem de devolver erro depois de fechada.

---

## J12 — Nova unidade
> *Concessão, unidade, catálogo herdado/override, equipa e dispositivos.*

**O que tem de estar lá**

| Passo | O que prova |
| --- | --- |
| Concessão | a unidade nasce **sob** uma concessão que existia antes |
| Unidade | criada pela porta, id vindo do redireccionamento |
| Catálogo herdado | a filha tem os **mesmos itens** da mãe — contados, e um deles pelo nome |
| Override | mudar na filha **não muda a mãe** |
| Equipa | quem entra na unidade nova **não vê** a outra |
| Dispositivos | dispositivo emparelhado numa unidade é **recusado** na outra |

**A armadilha desta jornada:** *a herança vazia.* Uma unidade nova que herda um
catálogo **sem itens** passa em qualquer verificação que só exija ausência de
erro. É a forma de verde vazio nº 1 — verde sobre população zero — e esta
jornada é o sítio natural para ela aparecer.

Por isso a herança **não se afirma, conta-se**: o número de itens da filha tem
de igualar o da mãe, e pelo menos um item tem de ser encontrado pelo nome. E a
mãe tem de ter itens **antes**, o que é o controlo positivo — se a mãe estiver
vazia, a jornada mede zero contra zero e dá verde.

**O controlo negativo:** o `override` na filha, relido **na mãe**, tem de vir
inalterado. Um override que sobe para a mãe é uma falha de isolamento entre
unidades e passa em qualquer teste que só releia a filha.

---

## J15 — Suporte
> *Ticket, diagnóstico autorizado, acesso temporário e auditoria.*

**O que tem de estar lá**

| Passo | O que prova |
| --- | --- |
| Ticket | aberto pelo cliente, na organização dele |
| Diagnóstico autorizado | o cliente **concede**, e a concessão é um acto registado |
| Acesso temporário | o suporte lê o que foi concedido, **e só isso** |
| Auditoria | fica registo do acesso **bem sucedido**, com quem, o quê e quando |

**A armadilha desta jornada, e é a maior das três:** *provar a concessão e não
provar o limite.* Uma jornada que autoriza, lê e diz «funciona» demonstrou que o
suporte consegue ler — que é a metade que não interessa. A que interessa é que
**sem a concessão não conseguia**.

**Os três controlos, e nenhum é dispensável:**

1. **Antes** da autorização, o mesmo pedido pelo mesmo agente de suporte tem de
   ser **recusado**. Sem isto, nada distingue «foi-lhe concedido» de «ele é
   superutilizador e sempre pôde».
2. **Depois** de expirar ou ser revogado, recusado outra vez.
3. **As duas recusas têm de ser pela mesma razão.** Se o «antes» dá 404 e o
   «depois» dá 403, uma delas não é controlo de acesso — é o recurso a não
   existir ainda, e eu já assinei um verde desses este mês.

**E a auditoria:** tem de registar o acesso **que teve sucesso**. Um registo que
só guarda recusas é pior do que nenhum, porque dá a sensação de vigilância sem a
ter. A prova lê o registo e exige lá dentro o identificador do agente, o do
recurso e um instante — os três, não «uma linha apareceu».

---

## A regressão das anteriores

O aceite pede as cinco **e a regressão das anteriores**. Conta a regressão que
corre **na mesma execução** que as novas, contra a mesma base, no mesmo dia. Um
«J01 passou na semana passada» não é regressão — é memória.

Se as oito (J01, J02, J08, J09, J11, J12, J14, J15) não couberem numa corrida
única por tempo, então o resultado a registar é **NÃO MEDI**, não «passaram
separadas».

## O que me faz reprovar sem discussão

- Uma jornada cujos passos correm por qualquer ordem.
- Um id lido da base a meio do caminho.
- Um controlo negativo ausente, ou presente e a passar nos dois lados.
- Herança contada contra uma mãe vazia.
- Um acesso de suporte provado só pela metade que concede.
