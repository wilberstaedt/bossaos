# Dados, confiança e acções sensíveis

> E00. Traduz o CT-14 em decisões testáveis. Última lacuna grande do contrato, a par do
> CT-12.

## Estas falhas não parecem falhas

O que torna esta secção diferente das outras: quase nada aqui produz um erro. Um CSV que
abre no Excel e executa uma fórmula é *"a exportação funcionou"*. Um logótipo SVG que
aparece na página é *"o carregamento funcionou"*. Um link de exportação que ainda abre três
meses depois é *"o link funciona"*.

São defeitos que se apresentam como sucesso, e por isso não se encontram a testar o
caminho feliz — encontram-se a perguntar **o que mais é que isto permite**.

## Exportações

**Dois pontos de verificação, não um.** A permissão confirma-se no pedido **e** outra vez
no descarregamento. Um ficheiro gerado quando alguém tinha direito continua a existir
depois de esse direito acabar; se o descarregamento não verifica, a exportação é uma porta
que fica aberta atrás da pessoa.

Links privados **expiram**.

**CSV é executável.** Um campo que comece por `=`, `+`, `-` ou `@` é interpretado como
fórmula pelas folhas de cálculo. Um produto chamado `=HYPERLINK(...)` no menu de um
restaurante torna-se código a correr na máquina de quem abre o relatório — e para o produto
tudo isto foi apenas texto guardado e devolvido. **É a única forma de injecção em que o
atacante não precisa de tocar no nosso sistema**: escreve no nome do prato e espera.

## Ficheiros

Tipo e tamanho permitidos, tratamento seguro, e **associação ao inquilino** — um ficheiro
sem dono é um ficheiro de toda a gente.

**Não executar SVG nem HTML do cliente.** Um SVG é um documento com script lá dentro. Aceite
como logótipo e servido na página do restaurante, é XSS armazenado que se instala sozinho.
Servir como imagem, converter, ou recusar — nunca renderizar em linha.

**Buscar imagem por URL é um pedido que o nosso servidor faz.** Sem restrição de destino,
oferecemos um proxy para a rede interna: o cliente escreve um endereço interno e o nosso
servidor vai lá buscar e devolve. Destinos restringidos, tamanho limitado, e nada de
endereços privados.

## Dados pessoais, e onde eles não podem estar

Nem em URLs, nem em capturas de marketing, nem em registos de depuração, nem no que se
envia para observabilidade. Cada um destes é um sítio onde os dados **sobrevivem** ao
sistema que os devia guardar: um URL fica no histórico e no referrer, uma captura fica num
sítio público, e um registo de depuração fica num serviço de terceiros para sempre.

Minimizar nos formulários e nas vistas: pedir só o que se usa.

## Consentimento

**Dados para prestar serviço não dão permissão de campanha.** O telefone que alguém deixou
para confirmar uma reserva não é uma lista de marketing, e transformá-lo nisso é o defeito
mais comum de todos os produtos de restauração.

Consentimento registado **por finalidade e por canal**, com origem e momento. Retirada vale
**antes de qualquer envio futuro** — não a partir da próxima campanha, não depois da fila
esvaziar: antes do próximo envio.

## Não ensaiar em pessoas reais

Email, campanha, cobrança e alteração de produção **não** se testam em pessoas reais por
omissão. Sandbox, e **estados verdadeiros** de configuração, falha e entrega.

Isto tem nome próprio para mim: a 5 de Julho afirmei que um email tinha sido enviado a um
cliente porque a chamada devolveu sucesso, e não tinha. HTTP 200 é *"o pedido foi aceite"*,
não *"a pessoa recebeu"*. O ecrã tem de distinguir configurado, enviado, entregue e
falhado, e nunca mostrar um pelo outro.

## Suporte e dispositivos

Acesso de suporte com **finalidade, prazo e escopo**, e cada acção atribuída ao operador
real — não a um utilizador genérico de plataforma.

**Rotação ou revogação de dispositivo impede comandos novos**, imediatamente. Um tablet
roubado com sessão viva é o cenário, e "impede" quer dizer ao pedido seguinte, não no
próximo início de sessão.

Auditoria regista **acção, recurso, versão, actor e motivo**, e **não copia segredos** — a
tentação de guardar o pedido inteiro "para depurar" é como os segredos entram no rasto.

## Cancelar um inquilino

Oferece exportação. **Não destrói dados financeiros nem operacionais no clique.** Limita
acessos.

Um restaurante que cancela continua a ter obrigações fiscais sobre o que vendeu, e um
apagamento imediato destrói prova de que ele pode precisar num sítio onde nós não estamos.
O que se corta é o acesso; o que se preserva é o registo, conforme a regra jurídica
**verificada**, não presumida.

## Os casos

| Caso | Esperado |
| --- | --- |
| Descarregar exportação depois de perder o direito | recusado **no descarregamento** |
| Link privado antigo | expirado |
| Produto chamado `=1+1` exportado para CSV | neutralizado, não fórmula |
| Logótipo SVG com script | não renderiza em linha |
| Imagem por URL a apontar a endereço interno | recusado |
| Dado pessoal num URL | não existe rota assim |
| Retirar consentimento e disparar campanha | não envia |
| Telefone de reserva usado em campanha | recusado por finalidade |
| Dispositivo revogado a enviar comando | recusado ao pedido seguinte |
| Rasto de auditoria | tem actor e motivo, não tem segredos |
| Cancelar inquilino | exporta, corta acesso, **não apaga** o financeiro |

**Controlo negativo do CSV**: gerar a exportação com a neutralização desligada e confirmar
que o campo sai como fórmula. Um teste que só verifica que o ficheiro tem o nome certo não
está a testar isto — está a testar que a exportação corre.
