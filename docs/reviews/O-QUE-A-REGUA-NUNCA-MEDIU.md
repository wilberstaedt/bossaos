# A régua media o §8; a direcção estava no §4 — 08/09, 13h30

O Matheus escreveu: «são muitos erros, você tem vários arquivos md te mostrando para
onde ir.» Fui fazer isso — ler o norte e comparar com o que está no ar. **Ele tem
razão, e a coisa é maior do que um cabeçalho.**

## §4.1 Header, contra a página publicada

Medido ao vivo em `bossaos.mwdeveloper.tech/es-ES`, hoje:

| o §4.1 exige | medido | |
|---|---|---|
| altura entre **72 e 80 px** | **59 px** | **viola**, 13 px abaixo |
| logótipo 145–165 px | 145 px | passa, no limite inferior |
| idiomas num **selector compacto, não três itens** | **três itens**: ES, PT, EN | **viola**, e a frase do norte proíbe-o por palavras |
| **Pedir una demo como CTA coral** | fundo `rgb(16,46,53)` — o verde escuro | **viola** |
| mobile com logo, **CTA curto** e menu real | logo e hambúrguer; **sem CTA** | **viola** (fotografia dele) |

Quatro violações de especificação escrita, **só no cabeçalho** — o elemento para que
ele apontou.

## Porque é que as onze condições passaram na mesma

Porque **medem outra coisa**. O §8 são as **condições de reprovação**: fundos
distintos, número de cartões, legibilidade da captura, blocos, percentagem de coral,
texto contra produto, sobreposição com o /product, mapa das mesas, componente só-móvel,
dados inventados, regressões.

Nenhuma delas olha para o §4.

**Construí um instrumento para o §8 e nenhum para o §4.** As onze passam e continuam
a passar; simplesmente não é ali que vive a direcção. O §8 diz o que **não pode**
acontecer; o §4.1 a §4.8 dizem o que **tem de** acontecer, bloco a bloco — e disso não
se mediu nada.

É a doença do dia, na sua forma final e maior: **o instrumento estava certo, e o
sujeito que ele nunca cobriu era o que decidia.** Eu dizia «treze em treze» sobre a
metade da régua que fala de reprovação, e apresentava isso como se falasse de
qualidade.

## O que fica

Isto responde à pergunta que eu não conseguia responder às 11h28 — como é que a régua
passa uma página que ele acha horrível. **Não é que o gosto dele fuja à medição.** É
que metade do norte, a metade que descreve o que a página deve ser, nunca foi medida
uma única vez.

Sete blocos, cada um com a sua lista. Só verifiquei o primeiro.

---

## Os outros seis blocos, e o achado maior — 08/09, 13h45

Medido na landing publicada. **Viewport de 500 px**, o que me impede de julgar as
exigências de secretária (herói ≥ 760 px, contentor 1240–1280) — não as reporto, e o
meu browser tem dado 1440 numas chamadas e 500 noutras, portanto a largura vai
declarada em cada medição.

| §4 | exige | medido |
|---|---|---|
| 4.2 | primário **coral** | `rgb(216,90,68)` — **coral** ✓ |
| 4.2 | secundário «**Ver cómo funciona**» | diz «Ver el producto» — desvio de texto |
| 4.6 | Starter **€19**, Restaurant **€79**, Pro **€149** | **zero valores em euros na página inteira** |
| 4.8 | no máximo **seis** perguntas | seis ✓ |

## Os preços: não é a página a desobedecer, é uma resposta que nunca chegou

Ia escrever «o bloco dos planos viola o §4.6». Fui procurar se havia decisão em
contrário, e o que encontrei explica tudo. O prompt original, o **E10**:

> Implemente LP BossaOS: proposta, produto, **planos sem valores inventados**,
> implantação, FAQ, demonstração, confirmação e 404.

A página nasceu sem preços **porque lhe foi dito para não os inventar** — e fez bem.
Depois o North Star v2 veio e **deu-os**, com nome e número, no §4.6.

**A pergunta estava em aberto, o Matheus respondeu-a por escrito, e a resposta nunca
foi aplicada.** Não é desobediência da página: é uma instrução antiga que continuou a
valer depois de deixar de ser verdade.

E o custo é comercial e não estético: **quem chega à landing não vê quanto custa**, e
tem um bloco inteiro chamado «Un plan para tu restaurante» que não diz o preço de
nenhum.

Uma ressalva, e é de decisão e não de medição: **pôr preços reais numa página pública
tem consequências** — compromete-te com um número à frente de qualquer concorrente que
o leia. O norte é documento dele e nomeia os três valores, portanto a direcção está
escrita; mas a confirmação de que se publicam **hoje** é dele, e não a assumo.
