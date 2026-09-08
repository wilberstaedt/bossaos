# A página das telas-mestre não se regenera — e é a mesma porta, a quarta cara

> 08/09. Pedido: regenerar a partir do build do HEAD `9e1bf64`, com a guarda de
> frescura a passar por si. **Não passou, e não a contornei.**

## O que a guarda diz, na voz dela

    $ python3 scripts/pagina-de-aprovacao.py /tmp/telas-mestre-teste.html
    RECUSO: 25 captura(s) anteriores a fonte mais recente do produto.
        M01-principal-es-ES-1440x900.png
        M01-principal-pt-BR-1440x900.png
        M01-principal-en-1440x900.png
        M02-principal-es-ES-390x844.png
        …
    Recaptura antes de mostrar isto a alguem.

    codigo de saida: 1
    ficheiro gerado: NAO

**A guarda funciona e recusou sozinha.** Não há ficheiro novo, não há página com
aviso colado por cima, não há nada que alguém possa abrir e confundir com o
produto de agora. É o comportamento certo — e é a resposta à pergunta: *sim,
recusou, e o motivo exacto está acima.*

## Porque é que «é só recapturar» não era

O premissa era que faltava correr o capturador. **Falta a conta.**

    $ ./scripts/provar-mestres.sh
    1. A semeadura e' determinista?
      ok    duas corridas, a mesma impressao (b06bec96fc418b67bb7a70fc2ed9658e)
      ok    controlo negativo: a impressao muda quando um prato muda
    2. As capturas do produto a correr
       (a construir — nao havia build)
    Error: a inscrição da conta de demonstração falhou: 400
        at abrirSessao (scripts/sessao-da-demo.mjs:65)
        at capturar-mestres.mjs:131
      FALHA o capturador reprovou
      FALHA nao ha composicao de KDS
    4. A limpeza devolve a base ao que era?
      ok    a limpeza correu e nao deixou restos
      ok    a limpeza nao tocou em nada alheio

**Saíram zero capturas, não 25.** O `abrirSessao` lança na linha 131, **antes**
da primeira fotografia — nem as superfícies públicas chegam a ser visitadas.

O `capturar-mestres.mjs` abre sessão pelo `sessao-da-demo.mjs`, e a conta
`demo@bossaos.invalid` está a **0** na base: o `limparDemonstracao` apaga-a a cada
corrida, com as credenciais do better-auth, e **não pode renascer** enquanto o
`sign-up/email` recusar.

## É a mesma porta

Já estavam contadas três caras. Esta é a **quarta**:

| cara | precisa de |
|---|---|
| as três imagens da sala na landing | inquilino de **demonstração** |
| qualquer cliente novo | a porta, é a pergunta de produto |
| **as 25 telas-mestre da página de aprovação** | inquilino de **demonstração** |
| a Fase 0.4 | *não* — usa o de **inspecção**, e está feita |

A 0.4 saiu porque o arnês de inspecção tem 127 credenciais vivas. **Os mestres
não têm essa saída**: o `SLUG_DA_DEMO` está cravado nas rotas e as capturas
existem para mostrar o cenário da demonstração, com «Bossa Demo» e sem prefixo de
arnês. Trocar de inquilino não seria recapturar — seria mudar o que a página
mostra, e a instrução foi **não mudar o desenho de nada**.

## O que fica

**A página publicada continua com o aviso à mão, e ele continua a ser o penso.**
A cura é a mesma decisão da porta que está com o Matheus. Quando ela existir, a
regeneração é uma corrida de `provar-mestres.sh` seguida do gerador — a
maquinaria está inteira e provada até ao ponto onde a conta falta: a semeadura é
determinista com controlo negativo, o build correu, e a limpeza devolveu a base
ao que era.
