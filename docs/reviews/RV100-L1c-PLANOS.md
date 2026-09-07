# Revisão do lote L1c — a página de planos (MKT-005)

Entrega em `3f3c1f4`.

---

## A restrição que eu pus foi respondida com uma medição, não com uma afirmação

Eu tinha escrito: *«a MKT-005 não pode ser o conteúdo da home outra vez; se
acabar a ser a secção com mais espaço, falhou»*. Ele extraiu as chaves de i18n
dos dois ficheiros e cruzou-as.

**Verifiquei por um caminho diferente do dele**, com um extractor mais tosco —
o meu só apanha `k.xxx` directo e ignora chaves resolvidas por constante, e por
isso dá números mais baixos: **88 e 44 chaves, 9 partilhadas**, contra os 93, 62
e 11 dele. **A conclusão é a mesma**, e é a conclusão que importa:

```
mktE10 · pedirDemo · precoAOrcar · precoAno · precoEquivalente
precoImplantacao · precoImplantacaoSozinho · precoImposto · precoMes
```

**Todas unidades de preço e um CTA. Zero chaves de conteúdo partilhadas.** Dois
instrumentos independentes, a mesma resposta — que é a forma de confirmação em
que eu confio.

## A comparação é derivada, e isso resolve um problema que eu não tinha nomeado

As oito linhas de capacidade saem de `capacidadesDoPlano()`, que faz a união dos
`promete` da `DESTAQUES`. E a `provas/planos.test.ts` corre **com o papel real de
runtime, contra a base**, e reprova se um plano prometer o que não concede.

**Uma tabela de comparação escrita à mão seria uma segunda verdade a envelhecer
sozinha** — a mesma doença que a `PRECIFICACAO.md` já tem (o documento não tem um
único valor; a fonte é o `.json`). Ele evitou-a sem eu ter pedido.

## «Zero é um valor comercial, não uma ausência»

A frase é dele e fica registada como dele. O `COMISSAO_DIRECTOS` vem de
`fonte.comissao_pedidos_e_reservas_directos` e é renderizado com
`formatarNumero(…, { style: 'percent' })` — **não é `0` escrito à mão nem um `%`
concatenado a um número**.

**É a mesma família do defeito da FAQ que ele apanhou no lote anterior:** copy
que fixa à mão um facto que a fonte é dona. «Sem comissão» escrito no texto
continua a prometer zero no dia em que a comissão deixar de ser zero.

## O instrumento dele apanhou-o a ele, e ele contou

Primeira passagem: **seis blocos com preço, três com a nota de IVA ao lado.** O
§6.5 diz «todos os valores». Corrigiu e a segunda deu 6/6.

Isto vale mais do que o resultado. **A medição foi desenhada para emparelhar
preço com nota** em vez de contar ocorrências de «IVA» na página e chamar-lhe
verde — que é exactamente o erro que eu cometi há duas horas ao contar
`bo-botao--primario` por ficheiro. Ele desenhou o par; eu contei o total.

## A tabela, medida nos dois sentidos

A 360 px: a **página** não rola horizontalmente (0) **e** a **caixa** rola por
dentro (312 de caixa para 544 de tabela). Só a primeira metade também passaria
com uma tabela esmagada até ao ilegível. **Duas medições que só juntas
distinguem «cabe» de «foi espremida».** E aguentou a passagem de 3 para 8 linhas
e de 3 para 4 colunas.

## O CTA, e um facto de negócio que passa a estar visível

Ele verificou antes de escrever: **não há registo público, checkout, Stripe nem
criação de assinatura.** Confirmei com controlo — o mesmo detector acha as três
rotas da demo, portanto alcança. A entrada é por convite e a única porta pública
é a demo.

Logo, **um botão «Contratar» seria porta morta**, e ele não o pôs. Seguiu o
padrão que eu tinha indicado: não se esconde o caminho, muda-se-lhe o peso.

**Registo isto como facto de negócio e não como defeito.** Para um SaaS B2B
vendido por contacto directo, com implantação assistida de €99 a €499, a entrada
por convite é modelo e não lacuna. Mas fica escrito, porque a página passou a
publicar preços e a **única conversão possível é o formulário de demo** — e isso
é uma decisão comercial que agora está à vista de quem visita.

## O que fica aberto, com as palavras dele

A **FAQ de cobrança** descreve o que a `previaDeDescida` e o ecrã de mudança
*parecem* fazer — **não correu prova** que o confirme ponto por ponto. É a mesma
disciplina que ele aplicou ao quarto pilar da confiança, e aceito a
classificação.

E a **`/product` continua a repetir os cartões da home chave por chave.** Ele não
lhe tocou porque é outro lote, e disse-o. **É o próximo lote.**

**L1c fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
