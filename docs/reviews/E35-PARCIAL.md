# E35 — revisão em curso

> 06/09, 09h10. **Não é assinatura.** Sete dos oito pontos da
> [régua](ALVO-E35.md) medidos e passam; o oitavo tem uma retenção com a
> medição em anexo.

## O que passa, medido

**Ponto 3 — os quatro portões, cada um a recusar à vez.** Era a exigência mais
dura da régua («quatro portões com um controlo só não são quatro portões») e
está cumprida, com a **sonda que tem de passar** à cabeça:

| cenário | resultado |
| --- | --- |
| 0 · tudo em ordem | os portões abrem, o pacote fica pronto e **para sem autorização** — e parou **antes** de tocar no servidor |
| 1 · só a assinatura | recusa e **nomeia**: E20 por validar. E declara que o contador `AGUARDA` sozinho teria deixado passar |
| 2 · só o commit | avisa que 1 ficheiro por commitar não vai, e o pacote não o leva |
| 3 · só os segredos | apanhou o `.env` **e o `.next` no meio do caminho** |
| 4 · só a versão | recusa quando a imagem é de outro commit; **etiqueta ilegível dá NÃO MEDI**, e não «versão errada»; e com a etiqueta certa **chega ao fim** |

A última linha do cenário 4 é a que o torna uma prova: sem ela, «recusa sempre»
passava por portão.

**Ponto 1 — o ensaio existe e produziu números.** Restaurada em 0,56 s, cópia de
1 236 592 bytes, com amostra verificada na base restaurada — que é o que separa
restaurar de descomprimir. E `podeDeclararRpo` **recusa** produzir RPO e RTO a
partir disso, com a razão certa: o tempo de restaurar uma cópia que já existia
não é nenhum dos dois.

**Ponto 7 — três estados, nunca dois.** Medi a `pilot.md`: **116 células, zero
vazias**, com `feito` 23, `pendente` 15 e `não medido` 7. Uma linha vazia
lê-se como aprovada, e não há nenhuma.

**Pontos 2, 4, 5 e 6** passam: a autorização é explícita e vai nas palavras de
quem manda; a sonda da versão lê a etiqueta pelo Docker, **de fora do produto**,
em vez de pedir um ficheiro que o encaminhamento por idioma desvia; e o
`publicar.sh` é o guião a sério — verifiquei os sete marcadores (a caixa, o
`git archive`, a etiqueta, o `--env-file`, a porta 8140, os papéis e a migração)
em 322 linhas.

### O achado que ele próprio declarou, e que confirmei

**Reescreveu por cima do `publicar.sh` e apagou-o**, substituindo o guião que
publica a sério por uma demonstração de portões que não publicava nada. Apanhou-
se a ler o `git diff` antes de commitar. **Fui verificar em vez de acreditar:**
está reposto e é o verdadeiro.

## RETENÇÃO — a regra e os dados nunca se encontram

O ponto 8 pede plano de saída antes de subir. Existem duas metades e **nenhuma
delas toca na outra**:

- o **controlo 8** conta `## Degrau ` contra `**Plano de saída` no documento
  real — uma contagem de **cabeçalhos**;
- o **`degrauPodeSubir`** aplica a regra a objectos **inventados**
  (`{nome:"x", saida:null}`).

A regra está certa: recusa `saida` vazia ou só espaços. Mas nunca vê os três
degraus verdadeiros.

**Medi o buraco em vez de o supor.** Copiei o documento, esvaziei o plano de
saída do último degrau **deixando o cabeçalho intacto**, e corri o controlo:

```
degraus=3  saidas=3
VEREDICTO: verde — e o plano está VAZIO
```

Um degrau com o título do plano e nada por baixo sobe. E a função que o
apanharia está a três linhas de distância, a ser alimentada com `"x"`.

**A cura é pequena:** ler os três degraus do documento e passá-los pelo
`degrauPodeSubir`. O controlo negativo já existe — é o meu ficheiro adulterado.
