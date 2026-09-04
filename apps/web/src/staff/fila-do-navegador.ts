'use client';

import {
  armazemDoNavegador, opacar, paraEnviar, sincronizar, suspensas,
  type EntradaDaFila, type Particao, type PortasDeRede,
} from '@bossaos/fila';

/**
 * A fila local ligada ao navegador (E15).
 *
 * ── Grava ANTES de tentar enviar, sempre ─────────────────────────────────
 *
 * É o *Respeite 1* do contrato: *«som ou toast não substitui estado persistente.
 * Nunca mostre enviado se só gravou o comando no dispositivo.»* A ordem aqui é
 * gravar → tentar → gravar o resultado. Se o processo morrer no meio, o que fica
 * é a verdade: «não enviado», ou «saiu e não sei».
 *
 * A ordem inversa — tentar e gravar depois — é o defeito desta etapa inteira: o
 * ecrã diz enviado, o empregado vira costas, e a cozinha nunca soube.
 */

export interface FilaViva {
  entradas: EntradaDaFila[];
  suspensas: EntradaDaFila[];
}

function portas(orgSlug: string): PortasDeRede {
  return {
    // A CONSULTA. É o que a régua exige ver acontecer, e não só a ausência de
    // duplicado: ao reconectar, pergunta-se ao servidor se ele já conhece o
    // comando antes de o repetir.
    async consultar(commandId) {
      const r = await fetch(
        `/api/org/${orgSlug}/pedidos?commandId=${encodeURIComponent(commandId)}`,
        { headers: { accept: 'application/json' } });
      if (r.status === 404) return { conhecido: false };
      if (!r.ok) return { conhecido: false };
      const corpo = await r.json() as { conhecido?: boolean };
      return corpo.conhecido ? { conhecido: true, resposta: corpo } : { conhecido: false };
    },
    async enviar(entrada) {
      const corpo = new URLSearchParams();
      const p = entrada.payload as {
        idioma: string; locationSlug: string; linhas: { productId: string; quantidade: number }[];
        orderId?: string;
      };
      corpo.set('idioma', p.idioma);
      corpo.set('locationSlug', p.locationSlug);
      corpo.set('accao', 'enviar');
      corpo.set('canal', 'SALA');
      corpo.set('commandId', entrada.commandId);
      if (p.orderId) corpo.set('orderId', p.orderId);
      for (const l of p.linhas) {
        corpo.append('productId', l.productId);
        corpo.append('quantidade', String(l.quantidade));
      }

      // SABE-SE que não sai: o aparelho está offline. Não se tenta, e a entrada
      // fica «não enviado» em vez de «saiu, e não sei» — que era exagerar o que
      // aconteceu, e foi o que a prova de navegador apanhou.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false, naoSaiu: true };
      }

      try {
        const r = await fetch(`/api/org/${orgSlug}/pedidos`, {
          method: 'POST', body: corpo, redirect: 'manual',
        });
        // 303 é o produto a mandar de volta ao ecrã: chegou e foi aceite.
        if (r.status === 303 || r.ok || r.type === 'opaqueredirect') {
          return { ok: true, resposta: { estado: r.status } };
        }
        if (r.status === 409) {
          return { ok: false, conflito: { versaoActual: 0, mudou: ['o pedido mudou no servidor'] } };
        }
        // Qualquer outra resposta é indeterminada: pode ter chegado. Marcar «não
        // enviado» aqui apagava a dúvida — e a dúvida é a informação.
        return { ok: false, indeterminado: true };
      } catch {
        // Falhou com o aparelho a dizer que tinha rede. Pode ter chegado — e por
        // isso fica pendente, e a reconexão consulta antes de repetir.
        return { ok: false, indeterminado: true };
      }
    },
  };
}

export async function lerFila(particao: Particao): Promise<FilaViva> {
  const armazem = armazemDoNavegador(window.localStorage, particao);
  const entradas = await armazem.ler();
  return { entradas, suspensas: suspensas(entradas, particao) };
}

/**
 * Compõe um comando e **grava-o antes de qualquer coisa**.
 *
 * O `commandId` nasce aqui, no cliente, e é gravado com o comando: sobrevive ao
 * recarregamento, que é o que o contrato exige (regra 4). Se morresse com o
 * separador, a retentativa criava uma segunda cobrança — que é o defeito que ele
 * existe para impedir.
 */
export async function compor(
  particao: Particao, tipo: string, payload: unknown,
): Promise<EntradaDaFila> {
  const armazem = armazemDoNavegador(window.localStorage, particao);
  const entradas = await armazem.ler();
  const entrada: EntradaDaFila = {
    commandId: crypto.randomUUID(),
    particao, tipo, payload,
    estado: 'NAO_ENVIADO',
    criadaEm: Date.now(),
  };
  await armazem.escrever([...entradas, entrada]);
  return entrada;
}

/** Sincroniza o que é desta partição. Devolve a fila como ficou. */
export async function sincronizarAgora(
  particao: Particao, orgSlug: string, sessaoValida = true,
): Promise<FilaViva & { resumo: Awaited<ReturnType<typeof sincronizar>>['resumo'] }> {
  const armazem = armazemDoNavegador(window.localStorage, particao);
  const antes = await armazem.ler();
  // A gravação vai a CADA transição, e não só no fim: um envio que fique pendurado
  // tem de deixar «à espera de confirmação» no disco, e não «não enviado».
  const { entradas, resumo } = await sincronizar(
    antes, particao, portas(orgSlug), sessaoValida,
    (parciais) => armazem.escrever([...parciais]));
  await armazem.escrever(entradas);
  return { entradas, suspensas: suspensas(entradas, particao), resumo };
}

/** Ao sair: o conteúdo deixa de ser legível, e nada se apaga. */
export async function aoSairDoTurno(particao: Particao): Promise<void> {
  const armazem = armazemDoNavegador(window.localStorage, particao);
  const entradas = await armazem.ler();
  await armazem.escrever(entradas.map((e) => ({ ...opacar(e), payload: undefined } as EntradaDaFila)));
}

export { paraEnviar };
