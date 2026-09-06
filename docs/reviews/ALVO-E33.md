# Régua do E33 — Administração da plataforma, suporte e governança

> Escrita a 06/09, **antes de existir código**. Dezanove telas — a maior etapa do
> projecto. Contrato:
> [`plataforma-e-suporte.md`](../architecture/plataforma-e-suporte.md), escrito
> imediatamente antes desta régua e também antes do código.

## O que muda nesta etapa

Todas as outras deram poder a quem trabalha na casa. **Esta dá poder a quem vende
o sistema** — a nós.

E isso inverte quem precisa de protecção: até aqui protegemos o restaurante de
enganos e de estranhos; **aqui protegemo-lo de nós.** É a única etapa em que o
atacante do modelo de ameaça somos nós próprios a agir de boa fé e com pressa.

## 1. O suporte não vira dono, e as quatro condições são todas

Temporária, visível ao inquilino, com âmbito, com motivo. **Nenhuma é
decorativa e nenhuma substitui outra:**

- Uma sessão que só termina quando alguém se lembra **é permanente na prática**.
  Exijo que expire sozinha, e o controlo faz depender de alguém fechar.
- Um acesso que só aparece do nosso lado **é um acesso que o cliente não pode
  contestar**. Exijo que o inquilino veja, e o controlo esconde-o de lá.

## 2. O rasto guarda a pessoa, não o papel

«Suporte» não responde à pergunta *quem fez isto*. É a mesma exigência que o E28
fez à correcção de ponto — e que tu formulaste melhor do que eu: **imutabilidade
guarda a forma, o segundo gatilho guarda o sentido.** Aqui é o mesmo, virado
para dentro.

## 3. A fronteira do E05 tem de sobreviver a esta etapa

**É o aceite que decide.** O E05 tirou ao processo do site a permissão de
escrever em `entitlement_grants`, e o E33 traz a interface de escrita. Se para a
tela funcionar o runtime ganhar `INSERT`, a resposta é **não** — muda-se o
caminho, não a permissão.

Controlo: dar `INSERT` ao papel de runtime e ver a
`provar-separacao-de-credenciais.sh` acender. **A fronteira que existe há
vinte e oito etapas não se abre por causa de um ecrã.**

## 4. Nenhum segredo em ecrã, registo ou auditoria

O produto já sabe fazer isto — a mensagem de ambiente recusa imprimir as
variáveis em falta e diz porquê. **A mesma regra no sítio onde é mais tentador
quebrá-la**, porque aqui quem olha é o operador e parece inofensivo.

## 5. Segurança, privacidade e exportação não ficam atrás do plano

**A única exigência desta régua que não é técnica**, e a que tenho mais medo de
ver quebrada — porque a pressão para a atravessar é comercial e chega devagar.
Começa por «a exportação em massa é Pro» e acaba com um cliente sem forma de
sair.

Uma casa no plano mais barato protege os seus dados, exporta-os, e responde a um
pedido de acesso de um cliente dela. O que pode depender do plano é a
**conveniência**. Controlo: pôr a exportação atrás do plano e ver acender.

## 6. Reprocessar não duplica

Identidade derivada e restrição na base, como a linha de extracto do E29.

## O que aceito como pendência

**A política de retenção por inquilino**, se depender de conselho jurídico. E o
que não tiver provedor real diz que não está ligado — como fizeste no E27 com os
envios e no E24 com o gateway.
