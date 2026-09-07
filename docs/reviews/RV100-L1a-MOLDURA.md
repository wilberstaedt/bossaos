# Revisão do lote L1a — a moldura comercial

Entrega em `8bdca0d`. Régua escrita antes, em `ALVO-RV100-MESTRES.md`.
Revisor: o sénior. **Não assino código meu** — este lote é do implementador.

---

## Veredicto: os seis defeitos fecham. Três coisas minhas estavam erradas.

Medi da **evidência**, não da tabela dele. As duas não-conformidades que eu tinha
levantado na secção 4:

| | antes | depois |
| --- | --- | --- |
| caixa da marca | `81.5 × 28` | **`145.5 × 50`** |
| `marca.ligada` | `False` | **`True`** |

---

## ① A minha instrução era ambígua, e ele resolveu-a bem

O meu documento cita o manual correctamente:

> *«A logo do header desktop começa em **120 px de largura**; alvo recomendado
> entre **144 e 168 px**.»*

O 144–168 é da **largura** — está na mesma frase. Mas ao passar a instrução
escrevi: *«dar **altura** explícita à assinatura, dentro de 144–168 px»*.
Comprimi duas coisas numa linha: a **acção** é dar altura (o componente recebe
`altura` e a omissão de 28 é a causa), o **alvo** é largura.

Uma assinatura com 144 px de altura num cabeçalho seria absurda. Ele pôs a
altura a **50**, que pela razão do ficheiro (`2137/736`) produz ~145 de largura —
dentro do alvo. **Leu a intenção contra o manual em vez de executar a minha
frase à letra**, que é o que eu quero de um implementador e o oposto do que eu
lhe teria dado se ele tivesse obedecido.

## ② O meu conselho sobre o coral estava errado, e verifiquei-o a fundo

Mandei-lhe usar `--bo-acento-sinal` como fundo do CTA. **Corrige a fronteira e
parte o rótulo:**

| fundo | fronteira /areia (≥3) | rótulo primária (≥4,5) | rótulo branco (≥4,5) |
| --- | ---: | ---: | ---: |
| `--bo-acento` | 2,77 ✗ | 4,71 ✓ | 3,05 ✗ |
| `--bo-acento-sinal` | 3,50 ✓ | **3,73 ✗** | **3,84 ✗** |
| coral da arte | 3,08 ✓ | 4,23 ✗ | 3,39 ✗ |

**O mecanismo do meu erro:** citei 4,71, que é `primária` sobre `acento`, e
usei-o para um fundo diferente. **Uma razão de contraste é propriedade de um
PAR, não de uma cor** — mudar o fundo apaga o número. Corrigi uma obrigação e
parti a outra, que é a armadilha exacta de um botão cheio: ele tem **duas**
obrigações, o enchimento contra a página e o rótulo contra o enchimento.

Verifiquei a afirmação forte dele — *«nenhuma cor da paleta chega lá»* — contra
os **17 tokens de cor** do ficheiro. **Confirma-se:** os nove fundos que cumprem
as duas obrigações são todos escuros (`primária`, os quatro de estado, o texto
secundário). Nenhum coral serve. A escolha dele, `--bo-primaria` a 14,34:1, é a
única família disponível.

**E o RV100-012 ganha forma com uma medição que faltava:** o coral sobre o
**verde-escuro** dá **4,71** e passa como texto. O coral não morreu — ele não
vive na areia. Um CTA coral existe numa **secção escura**. Isso é decisão de
composição, não de token, e é assim que o item deve ser escrito.

## ③ A minha previsão sobre a suite estava errada

Avisei-o de que a `marketing.spec.ts` ia partir — «mede os 12 MKT em cinco
larguras com selectores concretos». **Não partiu:** `git diff` dá **0 linhas**
no ficheiro e ela passa 68/68. Ancora em marcadores de conteúdo, não em
estrutura, e este lote só mexeu na moldura. Previ a fragilidade pelo número de
selectores e não pela **natureza** deles.

E ele foi mais longe do que eu tinha pedido: encontrou o que ela **não** media —
alvos e contraste só a 360 px, com a gaveta **fechada**, ou seja população zero
nos controlos novos. O instrumento dele abre a gaveta antes de medir. É o erro
que eu persigo há dois dias, encontrado por ele no instrumento alheio.

---

## Um defeito que ninguém tinha registado, e é dele

**O cabeçalho tinha sete alturas diferentes a 1440 px** — de 60 a 166,9. O
`.bo-publico` é grelha com `min-height:100vh` e faixas automáticas: em páginas
curtas a folga sobrava e **engordava o cabeçalho**. Ficou em **83** nas dez
rotas, cinco larguras e três línguas.

Isto não aparecia na minha linha de base porque eu medi **oito** páginas e a
moldura atinge **dez** — a `/demo/thanks` e a `/404` herdam-na. Alargar o
conjunto medido fez aparecer o defeito. **É a mesma lição de ontem por outro
lado: todo o eixo em que estreito é um eixo onde a resposta se esconde.**

E o número importa para o que vem a seguir: é contra 83 px que o herói do M01 se
compõe.

---

## A troca sem JavaScript: ACEITE, e verificada

Ele declarou-a de olhos abertos e ofereceu-me recusá-la: **abaixo de 1024 px, sem
JavaScript, a navegação não abre.**

Não a aceitei pela palavra dele. Verifiquei a mitigação:

- `Marketing.tsx` **não tem `'use client'`** — renderiza no servidor;
- o rodapé leva `/product`, `/plans`, `/getting-started`, `/pilot`, `/trust`,
  `/faq`, `/demo` e a entrada na conta.

**Nenhum destino comercial fica inalcançável sem JavaScript**, e o rastreador vê
as ligações todas no HTML do servidor. O custo é atrito — um utilizador sem JS
tem de descer ao rodapé — e atrito não é parede. **Aceite.**

## O que fica aberto, com as palavras dele

Ele listou o que **não** mediu, e a lista fica aberta tal como está: teclado e
leitor de ecrã reais (Escape e devolução de foco estão escritos, não medidos),
PT e EN só na landing, «página actual» não anunciada em `/pilot`, `/trust` e
`/faq` por viverem no grupo fechado, e 27 das suites por correr.

**E não tocou no `11_OPEN_FINDINGS.md`**, com a razão certa escrita: mudar o
`status` seria ele a assinar a própria revisão. É exactamente a regra que faz
existirem dois, aplicada por ele a si próprio sem que eu a tivesse invocado.

**Lote L1a fechado.** Nada aqui está aprovado — a estética é da secção 7 e é do
Matheus.
