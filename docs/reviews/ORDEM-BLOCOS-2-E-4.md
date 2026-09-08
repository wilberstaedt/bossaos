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
