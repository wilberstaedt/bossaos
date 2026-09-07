# RV100 · secção 3 — direcção de marca no produto

> Medida, não proposta. A direcção já existe em dois sítios — o manual e o código —
> e o meu trabalho foi confrontá-los.

## A fonte, e uma correcção ao plano

O RV100 manda ler `docs/bossaos/BRAND_ASSETS.md`,
`docs/bossaos/assets/brand/manifest.json` e as imagens em `assets/brand/`.
**Nenhum desses três caminhos existe.** Os ficheiros da marca estão em `brand/`
(`logoicon.png`, `logoname.png`), e a fonte autoritativa é o PDF que existe:
`docs/bossaos/fontes/BossaOS_Manual_de_Marca_e_Estrategia_v1.pdf`.

Fica registado como **divergência do plano**, não como falta do produto. Li o PDF.

## O que o manual manda (páginas 14 a 19)

| | |
| --- | --- |
| **Paleta** | Verde Atlântico `#102E35` (base, texto, acção primária) · Coral Bossa `#F5664D` (energia, destaque editorial) · Areia Clara `#F7F4EC` (fundo) · Cítrico `#DDEA91` (acento pontual) |
| **Neutros** | texto secundário `#51666A` · bordas `#D7DEDA` · superfície suave `#E9EFEC` |
| **Proporção** | 60 / 25 / 10 / 5 **na comunicação** — e a regra que a interface tem de respeitar: *«priorizar superfícies claras; coral e cítrico não devem disputar atenção com o estado dos pedidos»* |
| **Tipografia** | Rubik 700 títulos (48/52, móvel 32/36, máx. 3 linhas) · Noto Sans 400/600 texto 16/24 · rótulos 14/20 · **nunca corpo abaixo de 14 px** |
| **Grelha** | base 4 px · escala 4·8·12·16·24·32·48·64 · conteúdo até 1200 px · margens 24 móvel / 64 desktop |
| **Formas** | cartões 16 px de raio · controlos 10 px · etiquetas em cápsula |
| **Ícones** | traço 2 px em grelha de 24 · **uma família em todo o produto** |
| **Movimento** | 160 a 240 ms · respeitar preferência por movimento reduzido |
| **Toque** | 44 px no público, 48 px no salão |

E duas regras que não são estética e sim segurança:

- **«Estados operacionais não seguem o tema do cliente.»** Confirmado, aguardando,
  falha e informação têm cor própria, fora do tema.
- **Contraste calculado, par a par** — e a tabela nomeia o que **não** se usa em
  texto comum: branco sobre coral (3,05:1) e **coral sobre areia (2,77:1)**.

## O que o produto já tem — medido agora

| o manual manda | o `packages/ui/src/estilos.css` tem |
| --- | --- |
| escala 4·8·12·16·24·32·48·64 | **exactamente essa** (`--bo-espaco-xs` a `--bo-espaco-gigante`) |
| cartões 16 px | 13 usos |
| controlos 10 px | presente |
| conteúdo até 1200 px | presente |
| margens 64 / 24 | presentes |
| movimento 160–240 ms | **os dois extremos**, nomeados |
| paleta | definida **uma vez**, no pacote de desenho, e consumida por classes |

**O sistema de marca não precisa de ser construído: está construído, e é fiel ao
manual número a número.** E tem provas próprias — `contraste.test.ts`,
`estilos.test.ts`, `tema.test.ts`.

*(Contei primeiro os hexadecimais no `apps/web` e deu 1, 1, 2 e quatro zeros. Ia
concluir que a paleta não estava ligada. **Um token define-se uma vez** — o que
mede uso é o `var()` e as classes, não a repetição do valor. Sexta vez hoje que a
contagem da grafia quase me deu a resposta errada.)*

## O que isto faz ao âmbito da RV100

O plano foi escrito a assumir que o frontend precisa de reconstrução visual. **A
camada de tokens não precisa.** O que o diagnóstico da secção 2 encontrou, hoje de
manhã, foi nas **oito páginas comerciais** — a landing —, e é aí que a
reconstrução tem alcance real.

**Isto não é licença para não fazer nada.** É o contrário: diz onde o trabalho
rende e onde seria mexer no que já está certo. As secções 4 e 5 passam a ser
verificação de conformidade; a secção 6 — a landing — é onde se constrói.

## As três divergências que já conheço, e nenhuma é do sistema

1. **Ícones:** o manual pede traço de 2 px em grelha de 24, **uma família**. Há
   **zero ficheiros `.svg`** no repositório. Não está atrasado — não começou.
2. **`--bo-publico-acento`** está declarado e **nenhuma regra o lê**.
3. O contraste **coral sobre areia** a 2,77:1 aparece numa pendência como defeito.
   **Não é:** é a paleta da própria marca, e o manual diz que aquele par não se usa
   em texto comum. O produto está certo e a pendência estava a ler a tabela ao
   contrário.
