# Revisão: a ferramenta que cria conta no servidor — 08/09, 10h50

**Aceito o `6e935c9`.** Corri os seis controlos, não os li:

```
ok  cria e a conta ENTRA com a senha (a propria ferramenta o verifica)
ok  email repetido: RECUSADO, e nao cria um segundo em silencio
ok  sem segredo: FALHA e diz porque (nasce e nao entra)
ok  senha por argumento: RECUSADA (fica no historico e no `ps`)
ok  nao alcancavel por HTTP: 0 das 477 rotas do build a nomeiam
ok  nenhuma conta real ficou: 131 utilizadores antes e depois
```

O último é o que mais me interessa: a prova **não deixou nada atrás de si**.

Três decisões dele que são melhores do que o que pedi:

- a inalcançabilidade por HTTP **não é afirmada por ele** — é lida do
  `app-path-routes-manifest.json`, ou seja **o que o Next decidiu servir**, e com
  guarda de população: com poucas rotas no manifesto, abstém-se em vez de concluir;
- a ferramenta **verifica o próprio trabalho** — depois de criar, entra com a senha,
  porque «criar linhas não é ter conta e quem corre isto no servidor não descobre o
  contrário senão tentando»;
- e a prova **abstém-se sem base de dados** em vez de falhar. Foi o que me deu a mim,
  à primeira, sem o ambiente carregado.

## FALHA — o caminho documentado contorna a protecção

A ferramenta **recusa** a senha em argumento, e a razão está escrita: fica no
histórico da shell e visível no `ps`. O runbook abre assim, como **primeira** forma:

```bash
echo -n 'a-senha-escolhida' | node ... criar-conta.mjs alguem@casa.pt
```

`echo` é um builtin, portanto o `ps` está a salvo. **O histórico não.** A senha fica
escrita em `.zsh_history`, que é exactamente o que a recusa existe para impedir.

Fechámos a porta da frente e a documentação ensina a janela. É a forma do dia outra
vez, num sítio novo: **a protecção é real e o caminho recomendado passa ao lado.**

Cura, e é pequena:

1. **`--gerar` primeiro.** É a via mais segura e já existe — nada é escrito por
   ninguém, a senha aparece uma vez e não passa por lado nenhum que persista.
2. Só depois, para senha escolhida: `read -rs SENHA` (não ecoa, não entra no
   histórico) e `printf '%s' "$SENHA" | ...`.
3. E não ensinar o truque do espaço à frente do comando: depende de uma opção da
   shell que pode não estar ligada, e uma defesa condicional ensinada como regra é
   pior do que nenhuma.

---

## Fecho — 08/09, 11h00. E a cura foi à classe, não ao caso

**Aceito o `e71f6d9`.** O runbook passou a abrir com `--gerar` e a razão certa —
«ninguém escreve nada» — e o segundo exemplo nomeia **as duas fugas**: o argumento
fica no `ps`, o `echo` resolve o `ps` e deixa a senha no histórico.

Mas o que interessa é que ele **não corrigiu só o ficheiro**. Pôs uma guarda, e ela
mede a classe:

```
ok  nenhum dos 4 runbooks ensina um segredo na linha de comando
ok  a sonda acendeu: a forma que se teme e' mesmo vista
ok  a prosa que explica o perigo NAO e' acusada (so conta o bloco de codigo)
```

O terceiro controlo é o mais fino, e não lho pedi. O runbook agora **descreve** a
forma perigosa para avisar contra ela; um detector ingénuo acusaria o próprio aviso
e ensinava a apagar a explicação para ficar verde. Distinguir código de prosa é o
que impede uma guarda de castigar quem documenta o perigo.

**Exercitei o controlo negativo em vez de o ler:** plantei `echo -n "a-senha" | …`
no runbook e a guarda **falhou, saída 1**, nomeando ficheiro e linha. Reposto,
árvore limpa. E os controlos de sempre continuam: 477 rotas sem a ferramenta, e
**131 utilizadores antes e depois**.

## Uma limitação minha, declarada

Quis correr o `publicar.sh` em modo preparar — que corre os portões locais e **pára
antes de tocar no servidor** — para que qualquer problema aparecesse agora e não com
o Matheus à espera. **O classificador recusou**, e não contornei: um script chamado
`publicar` deve exigir permissão humana explícita, e essa recusa está do lado certo.

**Consequência, e ele tem de saber:** os portões correm no momento em que autorizar,
não antes. Se algum falhar, falha com ele a olhar.
