import { esperarDaRua, reservarDaRua } from '@bossaos/db';
import { obterBase } from '../../../../src/servidor.ts';
import { texto, voltarPara } from '../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta da reserva pública.
 *
 * ── Porque é que ela está AQUI e não em `/r/<slug>` ───────────────────────
 *
 * A pasta `/r/` tem uma regra: **nada sem sessão de visitante**. Quem reserva
 * está em casa, três dias antes, e não tem — nem pode ter — essa sessão.
 *
 * A decisão está escrita em `qr-da-mesa-e-o-visitante.md`, e a razão é a mesma
 * que pôs a porta do visitante lá dentro, lida ao contrário: o que justifica o
 * âmbito no endereço é **haver uma credencial que não pode viajar**. Um
 * formulário anónimo não tem credencial nenhuma para proteger.
 *
 * ── O que protege esta porta ──────────────────────────────────────────────
 *
 * Não é uma credencial. É o limite por unidade e por janela, contado na base com
 * lock; a chave idempotente, que vem do formulário e não daqui; e não confirmar
 * existência a quem pergunta.
 */
export async function POST(pedido: Request) {
  const dados = await pedido.formData();
  const slug = texto(dados, 'slug') ?? '';
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const base = `/r/${slug}/${idioma}/reserve`;

  const pessoas = Number(texto(dados, 'pessoas') ?? '2');
  const nome = texto(dados, 'nome') ?? '';
  const contacto = texto(dados, 'contacto') ?? '';
  if (!Number.isFinite(pessoas) || pessoas <= 0 || nome === '' || contacto === '') {
    return voltarPara(`${base}/inicio`, { erro: 'dados' });
  }

  if (texto(dados, 'accao') === 'espera') {
    const r = await esperarDaRua(obterBase(), slug, {
      nome, contacto, pessoas: Math.round(pessoas) });
    if (!r.ok) return voltarPara(`${base}/espera`, { erro: r.motivo });
    return voltarPara(`${base}/espera/estado`, { e: r.esperaId });
  }

  const dia = texto(dados, 'dia') ?? '';
  const hora = texto(dados, 'hora') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) {
    return voltarPara(`${base}/inicio`, { erro: 'quando' });
  }

  // ── A hora vai como LOCAL, e quem a resolve é a porta ────────────────
  //
  // Aqui construía-se `new Date(dia + 'T' + hora + 'Z')`: hora de parede lida
  // como UTC. Passa a viajar como o que é — uma hora local — e o fuso da unidade
  // resolve-a onde a unidade é conhecida.
  const r = await reservarDaRua(obterBase(), slug, {
    pessoas: Math.round(pessoas), dia, hora,
    nome, contacto,
    notas: texto(dados, 'notas') ?? null,
    // ── O `false` só é verdade se for alguém a NÃO marcar ────────────────
    //
    // Uma caixa por marcar chega como ausente, e ausência é ausência. Ler isto
    // como `true` por omissão faria aceitar a reserva ser aceitar o marketing.
    aceitaMarketing: dados.get('marketing') === '1',
    chaveIdempotente: texto(dados, 'chave') ?? `${slug}|${dia}|${hora}|${pessoas}|${contacto}`,
  });

  if (!r.ok) {
    if (r.motivo === 'SEM_MESA') {
      // ── A recusa leva as ALTERNATIVAS consigo ──────────────────────────
      //
      // «Recusado» sozinho manda a pessoa recomeçar, e recomeçar é onde ela
      // desiste. As horas vão no endereço para o ecrã as poder oferecer.
      const alt = r.alternativas.map((d) => d.toISOString().slice(11, 16)).join(',');
      return voltarPara(`${base}/sem-mesa`, {
        pessoas: String(Math.round(pessoas)), dia, ...(alt ? { alt } : {}) });
    }
    return voltarPara(`${base}/sem-mesa`, { erro: r.motivo, pessoas: String(Math.round(pessoas)), dia });
  }

  // ── O segredo vai UMA vez, e o ESTADO da hora vai com ele ────────────
  //
  // «INEXISTENTE e AMBIGUA são os dois casos em que a casa entendeu outra hora e
  // a pessoa tem de o saber.» Sem isto, quem escreveu 02h30 numa noite de
  // mudança de hora aparece às 02h30 e a mesa está marcada às 03h30.
  return voltarPara(`${base}/confirmada`, {
    ...(r.segredoDeGestao ? { t: r.segredoDeGestao } : {}),
    ...(r.horaEntendida.estado !== 'NORMAL' ? { hora: r.horaEntendida.estado } : {}),
    entendida: r.horaEntendida.instante.toISOString(),
  });
}
