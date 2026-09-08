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
