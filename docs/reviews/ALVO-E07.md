# Alvo da revisão do E07

> **Escrito com o E06 ainda por declarar** — ou seja, antes de existir uma única linha de
> E07. É a terceira vez que uso o passo 0 com esta folga, e foi o que fez o E05 passar à
> primeira.
>
> Deriva do prompt do E07, do CT-05 ao CT-07, e de
> `docs/architecture/catalogo-e-publicacao.md`, escrito no E00.

## A regra desta etapa, e é a mais séria do produto inteiro

> *"Ausência de dados sobre alérgenos não significa ausência de alérgenos. **Não gere
> declarações a partir de nomes/fotos.**"*

Um campo de alérgeno vazio é **desconhecido**, nunca "não contém". A diferença entre as
duas é alguém no hospital. E o contrato proíbe uma tentação concreta que qualquer sistema
moderno teria: **inferir** — "leva `queijo` no nome, logo contém lactose". Um produto
chamado *"tarte de amêndoa"* pode não levar amêndoa; um chamado *"salada verde"* pode levar
mostarda no molho.

**O que testo, e o par obrigatório:**

| Caso | Esperado |
| --- | --- |
| Alérgeno **não declarado** | mostra **desconhecido**, e não "não contém" |
| Alérgeno declarado **ausente** | mostra "não contém" |
| Nome que sugere um alérgeno, sem declaração | **desconhecido** — a inferência não acontece |

Se o primeiro e o segundo derem a mesma coisa, a distinção não existe no modelo — e é a
distinção que importa. **E separo preferência alimentar de declaração de segurança:**
"vegetariano" é uma escolha; "contém amendoim" é segurança. Misturá-las num campo é o
defeito que transforma uma preferência num risco.

## Um produto, referenciado — não copiado

> *"Não crie tabelas independentes de produtos para menu, Staff ou TPV."*

O erro clássico desta área: cada superfície ganha a sua própria cópia do produto, e a partir
daí o preço da carta e o preço do TPV divergem sem ninguém saber qual é o certo.

**Aceite 1, e é um par entre superfícies:** dois canais apontam ao **mesmo** produto, e
alterar o rascunho **não** muda a versão pública. Testo os dois lados — se só testar que o
rascunho não vaza, passa um sistema onde publicar também não faz nada.

## Dinheiro: sem vírgula flutuante

`docs/architecture/dinheiro.md` já o exige e aqui aparece pela primeira vez em código de
produto. Vou procurar `number` a guardar preço, `parseFloat` sobre valores monetários e
qualquer aritmética que não seja em unidades mínimas inteiras. Um preço com cêntimos é o
caso de teste; `0.1 + 0.2` é a razão.

## Precedência de preços — explícita, nunca acidental

Regra activa de unidade+canal+período → override unidade+canal → override unidade → base da
marca. **Conflito de mesma prioridade é erro, não desempate pela ordem da base de dados.**
Vou plantar dois overrides do mesmo nível e exigir uma recusa, não um vencedor arbitrário.

E **moeda incompatível é erro, não conversão implícita** — a mesma regra do CT-12.

## Editar a base mostra quem é afectado

> *"Override local não pode alterar a base silenciosamente."*

Duas direcções, e ambas se testam: editar a base **mostra** as unidades afectadas antes de
gravar; e um override local **não** escreve na base. A segunda é a que costuma falhar em
silêncio.

## Aceite 2 — validação por chamada directa

Escolhas obrigatórias e limites `min/max` de modificadores validados **na API**, não só no
formulário. É a regra que já apliquei três vezes: **o ecrã esconde para não frustrar, o
servidor recusa para proteger.** Vou enviar um pedido que o formulário nunca deixaria sair.

## Aceite 3 — edição concorrente

Duas edições do mesmo produto: a segunda vê conflito de versão, não sobrescreve. E o
arquivamento não apaga nem quebra referências antigas.

## Os IDs

CAT-001 a 013, 016 a 019, e 022 — **dezoito**. Contados com leitor de CSV.

## Passo 8

Procurar nos meus o defeito que encontrar nos dele. E um alvo herdado: se o E06 tiver mesmo
o problema do fuso que registei na adenda do `ALVO-E06`, **verificar se algum instrumento
meu depende do relógio do processo** — o `estado.sh` não usa datas, mas os scripts de prova
que eu escrevi podem usar.
