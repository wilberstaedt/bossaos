# Staff e KDS — o que ainda se via nas telas-mestre

> Terceiro degrau da `ORDEM-POR-VENDA.md`: o que o Matheus mostra numa
> demonstração ao vivo. A instrução era *«começa pelos que se vêem»* — por isso
> o instrumento foram as **telas-mestre M04 e M05**, frescas das 15h39, e não
> uma releitura do código.
>
> Dois achados da auditoria já não existiam quando fui verificar: a cor das
> ligações do índice do Staff (`estilos.css` já define `color` e
> `text-decoration`) e o `actor.nome` ignorado a favor do email (a página do
> turno já faz `actor.nome || actor.email`). **Não os contei como abertos.**

## K1 · Um nome de estação a servir de rótulo de navegação · **ALTA** · CORRIGIDO

**O que se via.** Na M05 principal, o `h1` dizia «Cocina caliente» e a primeira
pastilha dizia «Cocina caliente». Parecia o duplicado do Staff outra vez.

**E era pior do que isso.** `kdsE16.bilhetes` estava traduzido como um **nome de
estação** nas três línguas — «Cocina caliente», «Cozinha quente», «Hot kitchen»
— quando a chave nomeia o ecrã dos bilhetes. Como é consistente nas três, não é
lapso de tradução: é um rótulo com o nome de UMA estação.

> **A prova é a captura do estado vazio, e foi ela que mudou o diagnóstico.** A
> M05-vazio é tirada na estação **Pase** — a sobrancelha diz `SALA PRINCIPAL ·
> PASE` — e a primeira pastilha continua a dizer **«Cocina caliente»**. Não era
> um duplicado: era um rótulo **errado em todas as estações menos uma**. Numa
> cozinha com quatro estações, três liam o nome da estação do vizinho.

**Correcção.** `bilhetes` passa ao plural do que a casa já diz no singular
(`bilhete` = Ticket/Bilhete/Ticket): **Tickets / Bilhetes / Tickets**.

## K2 · A barra mostra a secção onde já se está · **MÉDIA** · CORRIGIDO

**A mesma classe que o Staff curou** — foi a primeira queixa do dono do produto,
e a cura ali foi tirar a secção actual da barra. O KDS ficou com o defeito.

**Correcção.** `.filter((x) => x.principal && x.rota !== actual)`, e o
`aria-current` sai com ela: existia para dizer «a página é esta», e quem o diz
agora é o `h1`. **Resolve a classe:** a próxima tela principal que alguém
acrescentar não repete o defeito.

## K3 · Um número sozinho, sem nome · **BAIXA** · CORRIGIDO

`prontos/page.tsx` imprimia `<p>{prontas.length}</p>`. No estado vazio isso é
**literalmente um «0»** a meio de um ecrã escuro, sem uma palavra ao lado — vê-se
na M05-vazio. As duas telas irmãs escrevem `{s.noEcra}: <strong>…</strong>`.

## S1 · O bloco de diagnóstico no ecrã do empregado · **MÉDIA** · LEVANTADO

**O que se vê na M04.** Metade de baixo do telefone é «Comandos en este
teléfono», «Con conexión», **«Sin enviar: 0»**, «Nada pendiente en este
teléfono», «Reintentar ahora», «No se puede hacer sin conexión».

**A régua do caminho da demonstração nomeia-o pelo nome** — *«blocos de
depuração («Not sent: 0» estava no Staff)»* — e ele continua lá.

**Não o corrijo, e digo porquê.** A fila offline é funcionalidade real e útil a
quem serve mesas com rede intermitente; o defeito não é ela existir, é ela
ocupar meio ecrã **para dizer que não há nada**. Esconder um painel é decisão de
produto e não conserto meu. **Proposta concreta:** o bloco só aparece quando há
algo por enviar ou a ligação caiu; com zero pendentes e ligação boa, some. Fica
para o sénior decidir se é isso ou outra coisa.

---

## Prova

`inspeccao/kds.spec.ts`, guarda nova **«a barra do KDS não diz o que o título já
diz»**, dentro da suite que já corre com sessão. Mede por **propriedade e não
por texto**: nenhuma ligação da barra pode apontar para o caminho actual, e
nenhuma pode dizer o mesmo que o `h1` — um rótulo novo com o nome de outra
estação volta a acender isto.

- **Sonda:** planta uma pastilha com o texto do título e exige vê-la. **Acendeu.**
- **População:** 14 telas com barra. Zero é NÃO MEDI, não «está bem».
- **Controlo negativo:** reposta a secção actual na barra, **25 falhas em 14
  telas** — e mostrou que o duplicado não era só o da cozinha quente: o KDS-005
  repetia «Todo listo en cocina» e o KDS-004 «Empieza la preparación».
- Suite completa do KDS: **20/20**.

> **Uma correcção minha, no meio.** A sonda correu à primeira onde o ciclo tinha
> parado — uma tela sem barra — e devolveu «sem barra». Isso não diz que a
> guarda é cega; diz que a sonda não mediu. Passou a plantar numa tela que tem
> barra, e só então o «acendeu» vale alguma coisa.
