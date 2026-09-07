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
