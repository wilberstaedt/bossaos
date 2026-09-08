# O «preview verificável» da Fase 2 — decidido antes de alguém dizer «publica»

> 08/09 01h55. Escrito porque **«publicar» está prestes a significar duas coisas
> diferentes para nós os dois**, e a diferença põe um redesign não aprovado no
> domínio que o Matheus mostra a pessoas.

## O risco concreto

O §9 do norte exige, no portão, **«URL do preview»**. E o Matheus já me disse,
a 07/09: *«quando tiver no domínio me avisa pra eu visualizar.»*

**Se ele disser «publica», as duas leituras são:**

| leitura | o que acontece |
|---|---|
| publicar em `bossaos.mwdeveloper.tech` | **o redesign não aprovado fica no ar**, na frente comercial |
| publicar uma página de capturas | a Nathalia vê e julga, e produção não mexe |

**São incompatíveis e nenhuma é obviamente errada à letra.** É a mesma armadilha
do commit nomeado numa promessa de publicação, um nível acima: **a palavra é que
tem dois sentidos.**

## O que o próprio norte responde, e eu não tinha visto

O §10 chama «previews fornecidos pela usuária» a **duas páginas de artefacto**:

    https://claude.ai/code/artifact/8f11a092-…
    https://claude.ai/code/artifact/1bdd3bf5-…   ← este é o meu guia de teste

**O norte já trata uma página de artefacto como preview.** Não é uma
interpretação minha para evitar o deploy: é a forma que o documento usa.

## A decisão

**O preview da Fase 2 é uma página de capturas, e produção não se toca.**

E as razões não são de conforto:

1. **A §11 pede um juízo visual, não uma sessão.** «A Nathalia olhar a primeira
   viewport e responder *isso parece a BossaOS*.» Para isso ela precisa de ver
   **a imagem**, não de navegar num sítio.
2. **Pôr no ar antes da aprovação é a propagação que o norte proíbe.** A Fase 3
   só começa depois de ela escrever que aprova.
3. **A tela autenticada não é visitável por ela** de qualquer maneira — precisa
   de sessão, unidade e dados. A captura é a única forma de ela a ver.

## O que isto NÃO decide

**Se e quando o redesign vai a produção.** Isso continua a ser do Matheus, é
autorização por commit e por momento, e **não se herda desta decisão.** Aqui só
se fixa o que a palavra «preview» quer dizer no portão da Fase 2.

---

## O preview existe — 08/09, commit `7e072ac`

**https://claude.ai/code/artifact/daf89118-390e-4a72-97fa-0860733d64fd**

Página de capturas, conforme decidido acima. **Produção não foi tocada.**

Seis capturas do commit `7e072ac`, na ordem que a §11 pede: a primeira dobra da
landing primeiro, porque é sobre ela que a pergunta é feita. A página diz, no
corpo e não em rodapé, que nada está no ar e que a propagação só começa depois
de uma resposta escrita.

A página é privada por omissão — é o Matheus que decide se a partilha, e com
quem. Não se declara aqui nenhuma aprovação em nome da Nathalia.

### Republicado a 08/09 — commit `b52fc14`

As seis capturas foram refeitas depois da cura dos cantos do §3.3. **O URL é o
mesmo**; o que mudou foi o conteúdo, e mudou porque o produto mudou: um preview
que retrata um commit anterior ao actual é a armadilha que a
`validar-provas-frescas.sh` existe para apanhar. Verificado nela: **6 artefactos
posteriores ao produto** — os seis desta frente. Os outros 69 do `docs/visual`
são o dossiê RV100, de outra frente e anteriores por natureza.

---

## Addendum, 08/09 05h30 — porque é que o «antes» NÃO entra na página dela

A Fase 0.4 fechou e agora existem **quatro capturas do «antes»** — duas da
landing e duas das Mesas. A página que a Nathalia vai abrir tem **seis imagens,
todas do «depois»**, e nenhuma comparação.

**Não as acrescentei, e é decisão e não esquecimento.**

O §11 diz o que ela tem de conseguir fazer: *«olhar a primeira viewport e
responder **isso parece a BossaOS**»*. **Isso é um juízo de identidade, não de
melhoria.**

Um antes/depois transforma a pergunta em **«está melhor?»** — e essa responde-se
sempre que sim, porque o antes era mau. **É argumento, não é juízo.** A página
foi construída para **apresentar e não persuadir**, e diz isso de si própria.

### Mas o par existe e vale — só que para outra pessoa

**A Nathalia julga identidade. O Matheus julga progresso.** Foi ele que escreveu
«ainda tá feio», e é a ele que o par serve.

Portanto o número foi para a **lista dele**, no item 17, em texto:

> na tela das mesas, **no telemóvel, antes não se via uma única mesa** no
> primeiro ecrã — sete pastilhas empilhadas comiam-no todo. **Agora vêem-se
> duas.**

**Dar a mesma prova às duas pessoas seria dar a pergunta errada a uma delas.**
