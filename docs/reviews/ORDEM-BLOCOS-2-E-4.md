# Ordem de trabalho: blocos 2 e 4 — 08/09, 14h45

Escrita enquanto a máquina está em **ATENÇÃO** e o trabalho não pode arrancar, para
que quando arrancar não se gaste tempo a decidir o que já está decidido no norte.

**Não é um pedido de desenho novo.** Tudo o que segue está no `NORTH_STAR_VISUAL_V2`;
o que falta é executá-lo.

## Bloco 2 — §4.3, «Uma comanda atravessa o sistema»

**Estado medido hoje:** 4 títulos, 4 parágrafos, **zero imagens**. O §4.3 proíbe por
palavras «quatro cards iguais com parágrafos» — está lá o anti-padrão nomeado.

**O que tem de passar a existir:**

- **uma única comanda demonstrativa real** a atravessar **Mesa → Cocina → Pase →
  Caja**. Uma só, a mesma nos quatro — é isso que faz a demonstração ser um percurso
  e não quatro ecrãs soltos;
- **quatro crops grandes da interface**, não quatro cartões de texto;
- **uma linha de ritmo** a ligá-los;
- **uma frase por passo, até 16 palavras**;
- secretária em composição horizontal/diagonal; móvel em narrativa vertical com
  progresso claro.

**As quatro superfícies existem no produto** — as famílias de rota são `staff/sala`,
`kds/<locationId>/<stationId>`, a vista de **pase** dentro do KDS (a barra tem
«Pase y coordinación»), e `caixa`. **Escolhe tu os caminhos-folha exactos e regista
quais usaste**: eu não os confirmei a renderizar, e não vou fingir precisão sobre
caminhos que não vi.

**Aviso que vem de hoje:** as capturas têm de ser tiradas **à largura em que vão ser
mostradas**, não encolhidas de 1440. É a cura que já existe para o telemóvel
(`sala-estreita-390.png`, um para um) e que nunca foi levada ao resto.

## Bloco 4 — §4.5, «Para cada pessoa, a tela certa»

**Estado medido hoje:** zero tabs, **uma imagem para quatro papéis**, 4 títulos e 5
parágrafos.

**O que tem de passar a existir:**

- os quatro papéis que o norte nomeia: **gestor, salão, cozinha e cliente**;
- **tabs ou narrativa alternável acessível** — teclado e leitor de ecrã, não só rato;
- ao trocar de papel, **troca o screenshot e o benefício**. Com uma imagem só isto é
  impossível: são precisas quatro;
- mesma base visual a ligar as telas;
- **evitar quatro novos cartões de texto** — é a mesma proibição do bloco 2.

## Como se fecha

Corre `fnm exec --using=22.23.2 node scripts/medir-quatro.mjs <url>` e os desvios do
§4.3 e §4.5 têm de desaparecer nas **duas** larguras. A fita declara a largura em cada
linha; não aceites um verde sem ela ao lado.

E o de sempre: **não afrouxes guarda nenhuma para isto caber.** Se alguma reprovar,
isso é achado e volta a mim.

---

## Bloco 2, a meio: três passos existem, o quarto não tem dados — 08/09

### O que ficou feito e medido

**As quatro rotas-folha, escolhidas e registadas** — era o que pediu para eu não
herdar precisão que não tinha:

| passo | rota |
|---|---|
| Mesa | `/{idioma}/app/bossa-demo/sala/floor` |
| Cocina | `/{idioma}/kds/{unidade}/{estacaoQuente}` |
| Pase | `/{idioma}/kds/{unidade}/{estacaoQuente}/passe` |
| Caja | `/{idioma}/pos/{unidade}/caixa` |

**Capturadas à largura em que vão ser mostradas** — 560 na secretária, 390 no
telemóvel — e não encolhidas de 1440. A guarda passou a esperá-las: **24 → 48**
composições, com o controlo de sujidade passado.

### A mesma comanda, nos três primeiros

- **Mesa:** mesa `07` ocupada, `Marta (sala)`, o cartão coral entre os livres.
- **Cocina:** três tarefas, todas marcadas **`A128`**.
- **Pase:** **`A128 · En marcha · 0/3`**.

É o mesmo pedido a atravessar, que é o que faz aquilo ser um percurso.

### E o quarto não tem dados

    Historial de cajas
    0
    Todavía no hay cajas

**A semeadura da demonstração não abre caixa nenhuma.** Medido: as tabelas que ela
escreve são `organizations`, `brands`, `locations`, `users`, `memberships`,
`role_assignments` e `subscriptions` — mais o cenário de sala e cozinha. **Não há
registo de caixa nem pagamento**, portanto o percurso do A128 acaba no Pase.

**Não construí a secção**, e a razão não é a máquina: um bloco com três crops
verdadeiros e um a dizer «Todavía no hay cajas» é pior do que os quatro cartões de
texto que veio substituir — anuncia que o produto não fecha a conta.

### O que falta, com nome

**Estender a `semente-demonstracao.ts`** para abrir uma caixa e registar o
pagamento do A128. Isso é mexer no **cenário da demonstração**, que é artefacto
seu e do Matheus — e é a diferença entre executar o §4.3 e inventar dados de
demonstração, que é o que a instrução original do E10 proibia.

**Também não é grande:** a caixa fecha o percurso que já existe, e o A128 já lá
está para ser pago.

### Duas coisas menores, medidas pelo caminho

1. **O `foco` do capturador** foi preciso duas vezes. À primeira o corte saía do
   cabeçalho: a 560 a aplicação usa o desenho estreito e os primeiros 420 px são
   barra. À segunda o selector caiu no `main`, cujo topo é o mesmo cabeçalho.
   Agora aponta ao contentor da lista de cada tela, e a **largura nunca escala** —
   só a altura da janela muda, que não transforma nada.
2. **A tela da caixa tem ligações por estilar** — «Abre tu caja» sai azul
   sublinhado, o azul por omissão do navegador. É a mesma família do `.ns-mesa` de
   ontem, num ecrã do painel que não é desta frente. Fica dito, não tocado.
