# Revisão do lote L1j — o fecho da secção 6

Entrega em `21e472a`.

---

## O melhor achado do lote é um erro de raciocínio dele, apanhado por uma guarda

A guarda reprovou a `/pilot` a 360 px com **1,17:1**. O `.bo-mkt__destaque` traz
fundo claro próprio e **herdava o branco da secção escura** onde passou a viver.

**E ele tinha pensado exactamente neste caso.** Está escrito que raciocinou *«tem
fundo próprio, logo o texto fica escuro»*. A frase que o corrige é dele:

> **«Fundo próprio não é cor própria — a cor herda-se, o fundo não.»**

Verifiquei com a função do produto: branco sobre aquele fundo dá **1,10:1**. Com
`--bo-texto-primario`, **13,05**. A 1,10 **o texto está lá e é invisível** — e ele
diz o que isso significa para quem revê: *«uma revisão a olho não apanhava: o
texto continuava lá, apenas ilegível»*.

**Isto é o argumento mais forte a favor de guardas que eu vi esta noite.** A
guarda não apanhou um erro de escrita nem uma distracção. **Apanhou uma inferência
errada de alguém que tinha considerado o caso e escrito o raciocínio.** Nenhuma
revisão por leitura apanha isso, porque a leitura só confirma que ele pensou —
e ele pensou.

## Um contador que não mede o que o nome dele diz, e ele diz isso

O `coralSobreEscuro` continua a marcar **0**, e ele **não o apresenta como prova**:

> «O botão pinta o seu próprio fundo, logo esse contador mede coral-**texto**-
> sobre-escuro, e eu usei coral-**preenchimento**.»

**Um zero explicado vale mais do que um zero apresentado.** É a defesa contra a
décima forma aplicada a um contador que ele próprio escreveu.

## Os números, e as três obrigações calculadas antes do CSS

| | antes | depois |
| --- | ---: | ---: |
| elementos com o acento (8 páginas) | 0 | **5** |
| secções escuras | 0 | **5** |
| perguntas na FAQ | 4 | **10** |

E a terceira obrigação do coral matou a versão ingénua **antes de ela ser
escrita**: coral sobre `#102E35` passa a 4,71, mas **rótulo branco sobre coral dá
3,05 e falha** — por isso o rótulo é verde-escuro. É a mesma conta que eu tinha
feito errada há sete horas, quando lhe mandei usar o `acento-sinal` e ele me
corrigiu.

## Dois achados que já estavam fechados, e o método com que o provou

**RV100-014** e **RV100-008** estavam fechados desde a L1b, e o meu registo tinha-os
abertos. Ele provou-o com `git log -S` — **procurar quando um valor mudou, e não
se ele existe hoje**. É um método que eu não lhe tinha sugerido e é exactamente o
certo para «isto foi corrigido quando?».

E corrigiu-me um número: o respiro é **128 entre secções**; os 48 que eu poderia
ter lido como falha são o padding do próprio herói, **não um intervalo**.

## Quatro defeitos de instrumento, e a linha que os une

Hex contra `rgb()`, o estado partilhado que não sobrevive a um worker reiniciado,
o `page.goto` sem relógio, e medir oito páginas num teste só — que falhava nas
**três mais longas** e passava nas quatro mais curtas.

> «**Nenhum descoberto pela ferramenta.**»

Mais **três escritas perdidas em silêncio**, com o script a imprimir sucesso —
apanhadas pela `validar-classes.sh` e pelo build, nunca pela mensagem.

## A vermelha do corredor não é dele

A `validar-suites-com-guiao` reprova `inspeccao/alergenios-na-carta.spec.ts` —
**ficheiro do JR, criado às 09:04, ainda por versionar**, do trabalho dos
alergénios que eu lhe passei há uma hora. **A guarda nomeia só aquele ficheiro**,
e o dele está coberto pelo `provar-fecho-mkt.sh`. Trabalho em voo, não defeito.

## O que fica, nomeado por ele em vez de arredondado

- **RV100-009** — o herói acaba em `x=728` em **seis páginas**. E a classificação
  dele é honesta: *«são heróis de duas colunas com mídia em seis sítios — um
  lote, e não um resto»*;
- **RV100-010** — dois blocos do §6.3: *produto em movimento* e *módulos
  principais*;
- a duplicação **`/trust`↔home**, cinco de doze chaves;
- a **expansão de texto**, ainda `NÃO MEDI`.

**L1j fechado. Nada aprovado** — a estética é da secção 7 e é do Matheus.
