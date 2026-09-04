# E10 — revisão estática, feita antes de a prova existir

> Escrita a 04/09 com o JR ainda a construir `provar-sites.sh`. Não substitui a
> prova viva: **isto é leitura de código, e leitura não é medição.** Fica aqui para
> a validação ser de minutos quando ele declarar, em vez de começar do zero.

## Aceite 2 — «falha real não mostra mensagem de sucesso»

O mais caro dos três, porque perde dinheiro sem fazer barulho. **Sustenta-se na
leitura**, em três camadas:

- `packages/db/src/leads.ts` apanha **um** erro e só um: a violação de chave única
  (`P2002`), que significa duplicado e é legítimo devolver como sucesso. Tudo o
  resto — base indisponível, coluna mudada — **sobe**. Um `try/catch` largo aqui
  era exactamente o defeito que o aceite proíbe, e ele não está lá.
- `apps/web/app/api/publico/lead/route.ts` tem **um único caminho** para
  `?enviado=1`, e passa por a gravação ter devolvido. Qualquer erro que suba cai
  em `?erro=gravacao`.
- A tela rende `<Aviso tom="perigo">` nesse caso, e **as seis chaves de mensagem
  existem nos três idiomas** — verifiquei uma a uma. Um erro que redirecciona para
  um ecrã em branco lê-se como sucesso; não é o caso.

**O que falta e só a prova dá:** partir a gravação a valer e ver o ecrã. A leitura
diz que o caminho está certo; só a execução diz que ele é o que corre.

## Aceite 3 — «domínio vinculado não pode ser tomado por outro inquilino»

`vincular_dominio` implementa as quatro regras de `dominios-e-enderecos.md`:

1. **Reservado por outra organização recusa com motivo próprio** —
   `reservado_por_outra_organizacao`, e não um «ocupado» genérico. A diferença
   importa: «ocupado» manda a pessoa esperar que se liberte, e ele não se liberta.
2. **O dono retoma.** É o par que separa a regra certa da preguiçosa: sem ele, o
   teste passaria com uma implementação que proibisse todos os nomes já usados.
3. **Nasce sempre `PENDENTE`** — vincular não é verificar, e quem não provou não
   serve conteúdo.
4. **`largar_dominio` tira do ar e a linha de dono fica** — o nome não volta ao
   mundo.

E a posse está fora do alcance da credencial de execução: `custom_domain_owners`
tem `PRIMARY KEY (dominio)` e `REVOKE ALL ... FROM bossaos_app`. A escrita passa
por função `SECURITY DEFINER`, o que é mais forte do que uma regra em código.

## Aceite 1 — «rascunho não muda o site público»

**Por verificar.** Exige a prova viva na rota pública, não na pré-visualização —
a pré-visualização é o mesmo processo a olhar-se ao espelho.

## O que a prova tem de trazer, e eu não aceito sem

- **Partir a gravação do lead** e ver o ecrã. Sem isto o aceite 2 é uma leitura.
- **Dois inquilinos** no domínio. Um inquilino a reclamar um nome livre não prova
  nada sobre o segundo.
- **Rascunho contra a rota pública**, nunca contra a pré-visualização.
- **As 29 telas medidas em móvel**, e as **11 do E09** a saírem da dívida na mesma
  passagem — é a condição bloqueante que escrevi antes de a etapa começar.
