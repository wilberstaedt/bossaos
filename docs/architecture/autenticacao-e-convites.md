# Autenticação, sessão e convites

> E00, escrito antes do E04. Traduz o CT-05 (papéis) e o CT-19 (sessão) em decisões
> testáveis. O E03 deixou `autorizacao.ts` como uma porta que **nega tudo** — este
> documento é o que ela vai passar a fazer.

## Negar por omissão, e as duas respostas de "não"

O contrato distingue-as, e a distinção **não é de experiência de utilizador, é de
divulgação de informação**:

| Situação | Resposta | Porquê |
| --- | --- | --- |
| Recurso privado de **outro inquilino** | **ausência** — não existe | revelar que existe é confirmar um cliente da concorrência |
| Recurso **próprio**, acção não permitida | falta de permissão | a pessoa sabe que a coisa existe; o que falta é o direito |

Trocar as duas transforma o produto num **oráculo de existência**: quem tiver um
identificador consegue distinguir "não existe" de "existe e não é teu", e com isso
enumerar clientes, unidades e pedidos de quem nunca conheceu.

**O teste, e é um par — nunca um caso sozinho:**

1. O identificador de B, pedido com sessão de A → **ausência**.
2. O **mesmo** identificador, pedido com sessão de B → **200**.

Se só se testar (1), um sistema em que *tudo* devolve ausência passa. É a mesma armadilha
do caso 3 da prova de isolamento, e a resposta é a mesma: a prova é a **diferença** entre
os dois, não o resultado de um.

## Verificar antes de ler, não filtrar depois

*"Nunca devolver dados de recurso antes de verificar escopo."*

Carregar e depois filtrar deixa três fugas: a mensagem de erro que muda consoante o
registo exista, o tempo de resposta que difere, e o filtro que alguém se esquece de aplicar
no quarto sítio. O escopo entra **na consulta**, não no `if` a seguir.

## Convites

Um convite é uma credencial. Portanto:

- **O papel vem do convite, nunca do pedido.** Se o corpo do pedido de aceitação puder
  dizer `role`, quem foi convidado como `waiter` aceita-se como `owner`. É o defeito mais
  banal desta área e o mais caro.
- **Uso único.** Aceitar duas vezes não cria duas pertenças, e o segundo uso não estende
  nada.
- **Expira**, e o prazo é configuração, não uma constante escolhida por quem programa.
- **Preso ao email convidado.** Um convite reencaminhado não serve a outra pessoa.
- **Revogável**, e a revogação vale mesmo que o email já esteja aberto noutro separador.
- Convidar para uma organização é acto de quem tem esse direito **naquela** organização.
  Um `owner` de A não convida para B.

## Revogação, e a lição que já paguei

*"Revalidar após revogação e troca de unidade."*

Tirar o acesso a alguém **não é apagar a pertença**: é fazer com que as sessões que já
existem parem de funcionar. No Norte descobri isto pelo lado errado — mudei uma senha e
quem já tinha entrado com a antiga continuava lá dentro. Parecia resolvido e não estava.

- Uma sessão emitida **antes** da revogação deixa de servir, e nota-se ao pedido seguinte.
- Trocar de unidade ou de organização **revalida**: o que a sessão podia em A não
  atravessa para B.
- Sair da sessão fecha a sessão; **revogar** fecha todas as outras e diz quantas fechou.

## Sessão

Cookie seguro; validação de origem nas mutações autenticadas; protecção contra abuso na
autenticação, na recuperação e no convite — os três, não só o login.

**MFA disponível em todos os planos** (não é uma capacidade que se compre num escalão
acima) e **exigido** para papéis e acções sensíveis, conforme política documentada.
Reautenticação para acções financeiras: o `owner` autenticado há seis horas não é a mesma
garantia que o `owner` autenticado há trinta segundos.

Chaves de API: guardadas em **hash**, com escopo e validade. Uma chave sem escopo é uma
sessão de `owner` sem cara.

## Suporte

*"Suporte não usa uma sessão invisível de owner."*

O acesso assistido é **temporário, justificado, auditado e visível** — o cliente consegue
ver que aconteceu, quando e por quem. Um modo de suporte que se parece com o utilizador
normal é indistinguível de uma conta comprometida, tanto para quem audita como para quem
foi invadido.

## Convidado

Só conteúdo publicado e os recursos da **própria** sessão ou token. Um convidado à mesa 5
não vê os pedidos da mesa 4 nem os dos outros ocupantes da 5 — partilhar o total da mesa
exige regra explícita e nunca mostra dados pessoais de terceiros.

## Os casos

| Caso | Esperado |
| --- | --- |
| Id de B com sessão de A | ausência |
| **O mesmo id** com sessão de B | 200 — é este que dá sentido ao anterior |
| Recurso próprio, papel sem direito | falta de permissão |
| Aceitar convite a pedir `role: owner` no corpo | papel do convite, não o pedido |
| Aceitar o mesmo convite duas vezes | uma pertença |
| Convite expirado / revogado | recusado |
| Convite reencaminhado a outro email | recusado |
| Sessão anterior a uma revogação | recusada ao pedido seguinte |
| Sessão de A a operar depois de trocar para B | revalidada, não herdada |
| Chave de API sem escopo | não existe — a criação recusa |
| Acesso de suporte | aparece no rasto, com actor e motivo |

**Controlo negativo:** desligar a verificação de escopo e ver o par (1)/(2) colapsar — os
dois a devolver 200. Se o teste continuar verde com a verificação desligada, o que ele está
a medir é que a rota existe.
