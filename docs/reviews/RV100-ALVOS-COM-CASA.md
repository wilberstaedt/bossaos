# Revisão — dar casa às consultas do arnês (do JR)

Entregue em `d198f71` e `c6ace75`. Duas horas e meia num trabalho que eu tinha
descrito como «três consultas», e o alargamento é dele e está justificado.

---

## O alvo: verde, e pela razão certa

```
ok   15 tabela(s) com linhas em mais de uma casa, perguntadas a base
ok   14 consulta(s) a dizer de que casa sao
```

Quando lhe passei o trabalho eram **7 consultas com casa**; ficaram **14**.

**E fez o que eu tinha exigido, e não o mais fácil.** A instrução era *«dar casa
às consultas, e não afinar o prefixo — um prefixo mais específico volta a acertar
por população, que é o que a mensagem da guarda reprova pelo nome, e a semente
seguinte parte-o outra vez»*. Li o trabalho em voo antes de ele acabar e o
comentário que ele escreveu no ficheiro diz exactamente isso, com a história toda:
a guarda avisara semanas antes, as tabelas passaram de 6 para 11, e o resolvedor
podia devolver a estação da demonstração.

**E registou-o no `RETOMAR-JR.md`** sem eu pedir — que é o documento que uma
sessão nova lê. Depois de eu ter perdido um implementador esta noite, isso vale.

---

## O que esta noite me ensinou sobre plantes, e não estava escrito

O `validar-plantes.sh` distingue três respostas — **vivo**, **aplicado** e
**morto** — e a mensagem do «aplicado» é clara: *«uma corrida morta a meio não dá
ao trap a hipótese de repor o ficheiro. Repõe-o ANTES de commitar seja o que
for.»*

**Essa instrução assume um agente só.** Com dois, abre-se uma janela que ninguém
tinha previsto:

1. uma prova morre e deixa o defeito no ficheiro;
2. **outro agente está a editar esse mesmo ficheiro**;
3. repor é `git checkout --`, que **apagaria o trabalho dele**.

Foi o que aconteceu esta madrugada. Encontrei **três plantes aplicados**:
`apps/web/.../dividir/page.tsx` (código de produto, com a âncora de teste
renomeada), `inspeccao/alvos.ts` e `inspeccao/kds.spec.ts`.

**Repus o de produto imediatamente** — ninguém lhe tocava — e **deixei os outros
dois**, porque o JR estava lá dentro. Agora que ele saiu e commitou, repus o
`kds.spec.ts`, e a guarda desceu de 2 para 1.

**E o que estava aplicado no `kds.spec.ts` não era um valor trocado: era uma
linha REMOVIDA** — `{ id: 'KDS-006', caminho: '/cursos', … }`. **O KDS-006 tinha
deixado de ser medido**, e um commit feito nessa janela tê-lo-ia calado sem
ninguém reparar. É exactamente o verde de população encolhida, entrado por
acidente em vez de por erro de instrumento.

**O terceiro fica**, deliberadamente: o `inspeccao-comum.ts` é módulo de semente e
há uma *spec* a correr agora. Verifiquei que nenhum dos guiões que plantam está
vivo, mas repor um módulo de semente debaixo de uma corrida é trocar um defeito
parado por um defeito em movimento.

### A regra que fica

**A restauração de um plante é segura quando o ficheiro está parado, e não quando
o guião que o plantou morreu.** São coisas diferentes, e com um agente só
coincidiam.
