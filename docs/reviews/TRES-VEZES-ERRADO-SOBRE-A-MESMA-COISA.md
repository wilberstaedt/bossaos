# Três vezes errado sobre a mesma coisa, em noventa minutos — 08/09, 12h35

O Matheus disse que a landing está horrível. Tentei transformar isso em algo medido.
Falhei três vezes seguidas, e cada uma foi corrigida pela medição seguinte.

| hora | o que afirmei | verdade |
|---|---|---|
| 11h40 | «há um rectângulo vazio no herói» | era a imagem do KDS a carregar |
| 11h40 | «as capturas estão cortadas à direita» | são cantos arredondados a resolução reduzida |
| 12h05 | «a condição 3 nunca foi medida» | está implementada, com o meu limiar exacto |
| 12h20 | «a C3 reprova: 14 px ficam a 7» | fica a **17,3 px**. **A C3 passa.** |

## A medição que devia ter sido a primeira

Na página ao vivo, viewport 1440:

```
capa: naturalWidth=540  render=667  escala=1,236  texto14=17,3px   (mínimo 11)
```

A `naturalWidth` é **540**, não 1440. O Next serve uma variante do `srcset`; o
`width="1440"` do atributo é **declaração de proporção**, não o ficheiro servido. Eu
calculei a escala com o número declarado e não com o servido, e saiu-me um terço do
tamanho real.

## A regra que eu próprio escrevi, e não segui

`ALVO-NORTH-STAR-V2.md`, na secção «as três armadilhas de hoje», ponto 2:

> **Mede-se a página renderizada, nunca o código.** Ler `background: verde` no CSS
> não prova que a secção é verde. Hoje isso enganou-me três vezes.

Escrevi isso de madrugada, depois de me enganar três vezes. E hoje ao meio-dia passei
noventa minutos a calcular a partir de atributos do HTML — que é ler o código — em vez
de abrir a página e perguntar ao browser. Quando finalmente perguntei, a resposta veio
em segundos e contradisse tudo.

**Ter a regra escrita não é o mesmo que a usar.** A minha estava escrita, no ficheiro
certo, sobre este exacto assunto, e eu li-a hoje duas vezes enquanto a violava.

## O que isto quer dizer para o problema dele

Que eu não tenho uma reprovação objectiva para lhe dar. **As onze condições que se
medem passam**, incluindo a que eu tentei três vezes usar contra a página.

Portanto o que o Matheus está a ver **não é uma violação do norte** — é o que o norte
não cobre, e o próprio norte diz qual é:

> Nada do §11. «Parece a BossaOS», premium, memorável, ritmo — **isso é da Nathalia**,
> e nenhuma medição minha substitui o olho dela. Estes treze são o **piso**: passá-los
> não faz a direcção boa.

A página está no piso. O piso não é o tecto, e ele está a olhar para o tecto.

**Não tenho mais nada a medir aqui.** O que falta é o olho dele e o dela, e a minha
insistência em achar um número que explicasse o desagrado dele produziu três erros e
zero informação.
