# Alvo: as capturas do produto na página de marketing

> Régua escrita **antes** da entrega, a 07/09 21h05, a partir de duas fotografias
> do Matheus e de três medições minhas. Quem entrega mede-se contra isto e não
> contra a minha opinião depois de ver o resultado.

## O que está errado, medido

**1. As telas do produto estão em espanhol em todos os idiomas.**
`Demonstracao.tsx` importa **cinco PNG fixos**. Medido ao vivo: `/pt-BR/product`
e `/es-ES/product` servem **exactamente os mesmos ficheiros**. Não é o idioma que
não propaga — não existe mecanismo para propagar. O `capturar-demonstracao.mjs`
tem `es-ES` cravado nas cinco rotas e no contexto do navegador.

Um visitante brasileiro lê «com o seu cardápio» em português por cima de
`Mesas en tiempo real`, `Servicios abiertos` e `Caja`.

**2. As capturas estão sete horas atrasadas em relação ao produto.**

| | |
|---|---|
| as cinco imagens | `07/09 10:15` |
| commits ao produto desde então | **16** |
| o último | `07/09 17:40` |

E não é atraso abstracto: abri a `carta-movel-390.png` e ela mostra **o campo de
busca com o texto cortado** — o defeito que hoje foi corrigido e que eu disse ao
Matheus estar corrigido. **A página que vende o produto está a anunciar os
defeitos que passámos o dia a tirar.**

## O alvo

1. **Um conjunto por idioma.** Os três: `es-ES`, `pt-BR`, `en`. A rota e o
   contexto do navegador seguem o idioma, não uma constante.
2. **`Demonstracao.tsx` escolhe pelo idioma que já recebe.** Ele já tem
   `Idioma` — falta usá-lo para a fonte, como já usa para o `alt`.
3. **Uma guarda de frescura, e é o ponto principal.** Já existe a mecânica no
   `scripts/pagina-de-aprovacao.py`: ele **recusa-se a gerar** se alguma captura
   for anterior à fonte mais nova do produto. As cinco imagens que um comprador
   vê não têm nada disso. Sem esta parte, daqui a uma semana estamos no mesmo
   sítio e ninguém dá por isso.

## O que NÃO é o alvo

- Não mexer nos preços nem no texto de marketing. As fotografias levantam
  também dois títulos trocados de sentido na página de planos — **isso é
  decisão do Matheus e vai para a lista dele**, não para esta entrega.
- Não converter as 267 telas. Continua atrás do portão §12.4.

## Como se prova, e não é «as imagens parecem bem»

- **Controlo negativo obrigatório:** tocar numa fonte do produto (um `touch`
  chega) e mostrar que a guarda **recusa**. Uma guarda que nunca recusou não
  provou nada — foi o que aprendemos hoje com o `trap`.
- **A prova do idioma mede a IMAGEM e não o código:** duas capturas de idiomas
  diferentes têm de ter somas de verificação **diferentes**. Hoje são iguais, e
  é assim que se sabe que o defeito existe. Se depois da cura continuarem
  iguais, a cura não pegou — e nenhuma leitura do código teria dito isso.
- **A frescura mede-se por `mtime` contra o último commit que toca no produto**,
  não por inspecção visual. Foi o `mtime` que destapou isto.
