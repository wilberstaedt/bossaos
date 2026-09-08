# RETIRO o que disse há vinte minutos sobre a condição 3 — 08/09, 12h20

Escrevi, e mandei ao Matheus por Telegram:

> A condição 3 aparece uma única vez no repositório, na linha em que eu a defini, e
> eu contei-a como passada porque a outra fita métrica estava verde.

**É falso.** A condição 3 está implementada, e com o meu limiar exacto.

`inspeccao/ns2-visual.spec.ts`, no teste «as onze que se medem»:

```
C3: a captura tem ${d.capaLargura}px (mínimo 650)
C3: texto de 14px do produto chega a ${textoNoEcra.toFixed(1)}px (mínimo 11)
```

E o comentário que encabeça o bloco diz exactamente o que se mede e o que não:

> Onze medem-se aqui; a 4 (capturas como anexos) é **juízo humano declarado** e a 13
> (o executor aprovar-se) é **processo**, e **nenhuma das duas se finge medida**.

## Como é que me enganei

Procurei a condição 3 no `medir-norte.mjs` e no `validar-sistema-ns2.sh`, não a
encontrei, e concluí que não existia. Mas o `validar-sistema-ns2.sh` é um
**corredor**: levanta o servidor e chama uma suite Playwright. As verificações vivem
na suite, num terceiro ficheiro que eu não abri.

**Procurei em dois sítios e concluí sobre o conjunto.** É a mesma família do
`git ls-files` desta manhã e do `head -6` da madrugada: a população que eu inspeccionei
não continha o sujeito, e o vazio leu-se como ausência em vez de se ler como «procurei
mal».

E é pior por uma razão de tempo: eu tinha acabado de escrever, no documento anterior,
que um controlo que não dispara é indistinguível de um que não encontrou nada — e
apliquei-o para acusar a ferramenta em vez de o aplicar à minha própria busca.

## O que fica de pé, verificado no código

Uma coisa, e é real:

```js
const capa = heroi?.querySelector('img')
```

**`querySelector`, não `querySelectorAll`.** A condição 3 mede a **primeira** imagem
do herói. O herói publicado tem, por ordem de documento:

| # | intrínseco | mostrada a | escala | texto de 14 px |
|---|---|---|---|---|
| 1 | 1440 | 720 px | 0,50 | **7,0 px** ← a única que a C3 olha |
| 2 | 1280 | 380 px | 0,30 | 4,2 px |
| 3 | 1440 | 640 px | 0,44 | 6,2 px |

O critério está certo, o limiar está certo, e a **população é uma imagem numa página
que tem três**.

## O que NÃO afirmo

Pela aritmética acima, a C3 devia reprovar mesmo na imagem que olha — 7,0 contra um
mínimo de 11. **Mas eu não corri a suite**, e acabei de ser apanhado a afirmar sobre
uma ferramenta sem a correr. Não faço isso duas vezes na mesma hora.

Fica declarado como **por medir**: correr a `ns2-visual` contra a landing publicada e
ler o que a C3 diz de facto. Precisa de build e servidor, e a máquina está em ATENÇÃO.
