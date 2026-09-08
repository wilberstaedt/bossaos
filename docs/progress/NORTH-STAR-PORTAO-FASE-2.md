# Portão da Fase 2 — a resposta dos sete pontos

> §9 do `NORTH_STAR_VISUAL_V2.md`. Emitido 08/09 02h30.

## 1 · Commit

`d257b2a` em `main`. A Fase 2 vive entre `b41cdc4` (landing) e `7e072ac`
(fecho), com as revisões em `0497749` e `d257b2a`.

## 2 · URL do preview

**https://claude.ai/code/artifact/daf89118-390e-4a72-97fa-0860733d64fd**

Página de capturas, privada por omissão. **Produção não foi tocada** — a decisão
e as suas razões estão em `docs/reviews/O-QUE-E-O-PREVIEW-DA-FASE-2.md`.

## 3 · Capturas

As seis obrigatórias, em `docs/visual/ns2/2026-09-08_a3935ea/`:
LP a 1440×900 e 390×844, primeira dobra e página inteira; Mesas a 1440×900 e
390×844.

## 4 · Decisões visuais

- **Herói verde profundo** e sete blocos narrativos — a landing deixa de ser
  areia contínua: **4 fundos distintos**, contra 2.
- **O coral não muda de valor.** Está demonstrado que **nenhum coral serve 3:1
  sobre areia e 4,5:1 com texto verde ao mesmo tempo** — os intervalos de
  luminância não se tocam. A saída foi o **tamanho do texto** (19 px/700), onde
  a norma pede 3:1.
- **Onde 4,5 era impossível, mudou-se o desenho e não a régua**: três textos
  saíram de cima do coral. **Nenhuma régua foi tocada para ficar verde.**
- **As Mesas deixaram de ser uma lista**: grelha com estado, capacidade, duração
  e responsável, com a borda a codificar o estado; barra que rola no telemóvel.
- Duas curas foram de **especificidade**, não de valor — o H2 e o CTA do herói —
  e **sem `!important`**.

## 5 · Testes corridos, e corri-os eu

| | |
|---|---|
| `validar-sistema-ns2` | **saída 0** — `idiomas=3 referencias=2 larguras=2 esperadas=12 medidas=12` |
| `validar-superficies` | **saída 0** — «nada desaparece em **12 superfícies**» |
| os catorze números | **12 de 12 cumprem**, medidos com a fita calibrada |

## 6 · Componentes ainda NÃO propagados

**40 classes `ns-`**, usadas em **4 ficheiros**, todos do âmbito.
**Ficheiros fora do âmbito: ZERO.** As 396 telas continuam em `bo-`.
Detalhe em `docs/reviews/NS2-COMPONENTES-NAO-PROPAGADOS.md`.

## 7 · Estado

## `NORTH STAR PRONTA PARA NATHALIA`

**E paramos aqui.** A Fase 3 não começa. Ninguém declara aprovação em nome dela,
e o silêncio não é aprovação.

---

## O que fica dito, e não escondido

- **Treze elementos com cantos a 10 px**, contra os 14–24 do §3.3. Pequeno,
  verdadeiro, e apanhado por mim depois de a fita o imprimir várias vezes sem
  eu olhar.
- **O mapa mostra o email de quem abriu a mesa** — `sala.ts:99` grava
  `actor.email`. **É anterior a esta frente**, o redesign só o tornou visível,
  e o §7.2 pede «sem expor PII indevida».
- **Fase 0.4 por fazer:** não há captura do «antes» das Mesas. A comparação
  dessa tela é contra descrição, não contra imagem.
