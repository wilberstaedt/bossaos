# Entrada progressiva — e o plano de saída de cada degrau

> **Um plano de entrada sem plano de saída é uma aposta, não um plano.** A saída
> define-se **antes** de subir — depois é quando já há pedidos a sério na casa e
> a pergunta passa a ser «como é que voltamos sem duplicar vendas?».
>
> Isto é lei do código, não boa intenção: `degrauPodeSubir` recusa um degrau sem
> `saida` e recusa um degrau sem `criterios`
> ([`implantacao.ts`](../../packages/domain/src/implantacao.ts)).

## Porque é que não se entra tudo de uma vez

Porque quando falha, não se sabe o quê. Uma casa que liga carta, pedidos,
cozinha, reservas e caixa na mesma noite tem cinco suspeitos para cada problema
e nenhuma linha de base. Cada degrau existe para que o degrau seguinte tenha um
**antes** com que comparar.

---

## Degrau 1 — STARTER: a carta no QR

**O que liga:** carta digital, QR nas mesas, alergénios, idiomas.
**O que NÃO liga:** pedidos, cozinha, caixa, reservas.

**Critérios para subir ao degrau 2**
1. Uma semana de serviço com a carta no ar.
2. Alergénios revistos pela casa — **nenhum produto em DESCONHECIDO por
   esquecimento**. Por decisão, pode ficar; por esquecimento, não.
3. A sala explica o QR a um cliente em menos de trinta segundos
   ([`formacao.md`](formacao.md), §6).

**Plano de saída:** volta-se à carta de papel. É o estado em que a casa já vivia,
não há dados de serviço a perder, e o QR desliga-se sem consequência — a carta
digital fica no ar ou sai, e nada mais depende dela. **Esta é a única saída
barata de todo o percurso**, e é por isso que este é o degrau um.

---

## Degrau 2 — RESTAURANT: a operação

**O que liga:** pedidos, ecrãs de cozinha e bar, caixa.
**O que NÃO liga:** reservas, integrações, domínio próprio.

**Critérios para subir ao degrau 3**
1. Duas semanas de serviço, incluindo **duas noites cheias** — uma casa vazia
   não mede nada.
2. Sala, cozinha e caixa com o teste passado, por pessoa e não por turno.
3. **O ensaio de restauração feito e com data** ([`pilot.md`](pilot.md)). A
   partir daqui há vendas na base, e um backup que nunca foi restaurado é uma
   esperança.
4. Zero incidentes de serviço abertos em [`pilot.md`](pilot.md).

**Plano de saída:** papel e caixa registadora — o mesmo que o pessoal treinou
para quando o sistema cai, e é isso que faz do treino um plano de saída em vez
de um exercício. **Os dados que já entraram ficam**: o rasto é append-only e não
se apaga para «ficar coerente». Sair daqui custa a casa a somar contas à mão,
e é reversível em minutos; o que não é reversível é ter apagado vendas.

---

## Degrau 3 — PRO: reservas, marca e integrações

**O que liga:** reservas e lista de espera, cores e domínio próprios,
integrações e API.

**Critérios para subir** — os do degrau 2 cumpridos, mais:
1. Alguém na casa com o papel `HOST` testado.
2. As integrações que a casa quer **existirem de facto** — não «a contratar».
   Um provedor que ainda não existe fica **pendente por palavras**, nunca em
   branco.

**Plano de saída, por partes** — e este é o degrau onde a saída deixa de ser
uma frase só:
- **Reservas:** volta o livro de papel. As mensagens automáticas **deixam de
  sair**, e quem tinha reserva por avisar é telefonema. Isto diz-se à casa
  **antes** de subir, não na noite em que acontecer.
- **Domínio próprio:** volta-se ao endereço da plataforma. O DNS demora a
  propagar — **a saída não é imediata**, e é a única deste documento que não é.
  Por isso o domínio próprio liga-se cedo no degrau, para que a propagação tenha
  acontecido muito antes de alguém precisar de voltar atrás.
- **Integrações e API:** desligam-se por chave. Quem consumia deixa de consumir,
  e isso é uma conversa com terceiros — não é um interruptor nosso.

---

## O que este documento NÃO promete

Datas. Os critérios são de **estado**, não de calendário: «uma semana de serviço»
é uma semana de serviço a sério, e uma casa que abriu três noites nessa semana
não cumpriu o critério por o calendário ter virado. O que se mede é o serviço,
não o tempo.
