# Plataforma, suporte e governança

> Escrito a 06/09, **antes de existir código do E33**. Por fronteira. Os planos
> estão em [planos-e-limites.md](planos-e-limites.md); as chaves e webhooks em
> [integracoes-e-cobranca-do-saas.md](integracoes-e-cobranca-do-saas.md); o
> isolamento em [prova-de-isolamento.md](prova-de-isolamento.md).

Esta é a etapa em que **nós** ganhamos poder sobre as casas dos clientes. Todas as
outras deram poder a quem lá trabalha; esta dá-o a quem vende o sistema.

E isso muda quem precisa de ser protegido: **até aqui protegemos o restaurante de
enganos e de estranhos; aqui protegemo-lo de nós.**

---

## Fronteira 1 — alguém do suporte entra numa casa

**O defeito desta etapa tem nome: o suporte virar dono sem ninguém dar por isso.**

Uma sessão de suporte é **temporária, visível ao inquilino, com âmbito e com
motivo escrito**. As quatro coisas, e nenhuma é decorativa:

- **Temporária** — expira sozinha. Não «até alguém sair»: uma sessão que depende
  de alguém se lembrar de a fechar é permanente na prática.
- **Visível ao inquilino** — o restaurante vê que alguém entrou, quando, e
  porquê. Um acesso que só aparece no nosso lado é um acesso que o cliente não
  pode contestar.
- **Com âmbito** — o suporte vê o que precisa para resolver, não a casa inteira.
- **Com motivo** — escrito antes, não depois.

**E autorizada conforme a política do inquilino.** Há casas que aceitam entrada
sem pedir; há casas que exigem consentimento a cada vez. A política é delas.

## Fronteira 2 — uma acção interna fica registada

**O rasto guarda a PESSOA, não o papel.** «Suporte» não é resposta à pergunta
*quem fez isto*. A identidade real do operador da plataforma, sempre — e é
exactamente a mesma exigência que o E28 fez à correcção de ponto, virada para
dentro.

## Fronteira 3 — a plataforma escreve concessões comerciais

**A pergunta que o Matheus fez a 05/09 e que esta etapa responde.**

O E05 tirou ao processo do site a permissão de escrever em `entitlement_grants`,
com uma razão que se mantém: *um catálogo comercial que o processo do restaurante
reescreve é um restaurante a dar-se um plano*. O E33 traz a interface de escrita
— e **não pode reabrir essa porta pelo lado de dentro**.

A regra: a escrita de concessões corre por **caminho próprio, com credencial
própria e auditoria obrigatória**, nunca pelo papel de runtime do inquilino. Se a
tela nova precisar que o runtime ganhe `INSERT` em `entitlement_grants`, a
resposta é não — muda-se o caminho, não a permissão.

**E nunca por webhook** (fronteira 4 do E32): um pedido de fora não é uma
autorização.

## Fronteira 4 — configura-se um segredo

**Mostra-se o estado e a data de rotação; nunca o valor.** Nem no ecrã, nem em
registo, nem em tabela de auditoria.

O produto já sabe fazer isto: a mensagem de erro de ambiente recusa imprimir as
variáveis em falta, e diz porquê — *uma mensagem de erro que imprime a credencial
é uma fuga de credencial*. A mesma regra, no sítio onde é mais tentador quebrá-la.

## Fronteira 5 — um trabalho falhado é reprocessado

**Sem duplicar efeitos.** Identidade derivada e restrição na base, como a linha de
extracto do E29 e a comanda do E31. Reprocessar é normal; reprocessar duas vezes
o mesmo efeito é que não.

## Fronteira 6 — uma capacidade fica atrás do plano

**Segurança, privacidade e exportação NUNCA ficam atrás do plano.**

Uma casa no plano mais barato tem direito a proteger os seus dados, a exportá-los
e a responder a um pedido de acesso de um cliente dela. O que pode depender do
plano é a **conveniência** — relatórios avançados, mais unidades, integrações.

> É a única fronteira deste documento que não é técnica. Fica escrita porque a
> pressão para a atravessar é comercial e chega devagar: começa por «a exportação
> em massa é uma funcionalidade Pro» e acaba com um cliente sem forma de sair.

---

## O que vou exigir como prova

1. **A sessão de suporte expira sozinha.** Controlo: fazê-la depender de alguém
   fechar e ver acender.
2. **O inquilino vê a entrada** — quem, quando, porquê. Controlo: escondê-la do
   lado do inquilino e ver acender.
3. **O rasto tem a pessoa.** Controlo: gravar «suporte» em vez do nome.
4. **Escrever concessões não passa pelo papel de runtime.** Controlo: dar
   `INSERT` ao runtime e ver a `provar-separacao-de-credenciais` acender — a
   fronteira do E05 tem de continuar a existir depois desta etapa.
5. **Nenhum segredo aparece** em ecrã, registo ou auditoria. Controlo: imprimir
   um e ver acender.
6. **Reprocessar não duplica.**
7. **Exportação e privacidade funcionam no plano mais barato.** Controlo: pô-las
   atrás do plano e ver acender.
