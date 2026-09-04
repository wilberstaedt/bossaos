'use client';

import { useCallback, useEffect, useState } from 'react';
import { chaveDaParticao, porEnviarNoAparelho, type Particao } from '@bossaos/fila';

/**
 * Qual dos aparelhos da unidade é este — e o número que ele declara.
 *
 * ── Fecha a pendência que o E13 deixou escrita ───────────────────────────
 *
 * `devices.rascunhos_por_enviar` era `null` em todos os aparelhos, e o contrato
 * dizia porquê: *«quem o preenche é a fila local — que nasce no E15/E16»*. É
 * aqui. O ecrã de revogar já sabia mostrar o número e dizer que não sabe quando
 * não há; faltava alguém a falar.
 *
 * ── O que isto NÃO é ─────────────────────────────────────────────────────
 *
 * Não é uma identidade de dispositivo, e não se inventou uma. Uma credencial de
 * aparelho pertence ao pareamento do E13, e o pareamento acaba no painel, não
 * aqui. Isto é uma **etiqueta**, escolhida por uma pessoa com sessão, guardada no
 * próprio aparelho, e usada só para dizer um número sobre um aparelho da mesma
 * unidade. Está declarado em vez de disfarçado: um número errado aqui é uma
 * chatice para quem revoga, não uma porta.
 *
 * ── A etiqueta é particionada, como tudo o que fica no aparelho ──────────
 *
 * Mesma chave da fila. Um tablet partilhado onde a escolha do turno da tarde
 * ficasse a valer para o turno da noite era a regra 1 outra vez, em ponto
 * pequeno.
 */
const PREFIXO = 'bossaos.aparelho.v1.';

export function EsteAparelho({
  particao, orgSlug, locationId, idioma, dispositivos, m,
}: {
  particao: Particao;
  orgSlug: string;
  locationId: string;
  idioma: string;
  dispositivos: { id: string; nome: string }[];
  m: {
    esteAparelho: string; esteAparelhoAjuda: string; aparelhoPorEscolher: string;
    declarado: string; semDispositivosNaUnidade: string; porEnviarNoAparelho: string;
  };
}) {
  const chave = `${PREFIXO}${chaveDaParticao(particao)}`;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [declarado, setDeclarado] = useState<number | null>(null);
  const [montado, setMontado] = useState(false);

  const declarar = useCallback(async (deviceId: string) => {
    let quantos: number;
    try { quantos = porEnviarNoAparelho(window.localStorage); } catch { return; }
    const corpo = new URLSearchParams({
      idioma, locationId, accao: 'declarar_rascunhos', deviceId, quantos: String(quantos),
    });
    try {
      const r = await fetch(`/api/org/${orgSlug}/staff`, { method: 'POST', body: corpo });
      // Só se diz «declarado» depois de o servidor o confirmar. Pintar o número
      // antes da resposta era o defeito desta etapa inteira noutra roupa: o ecrã
      // a afirmar o que só aconteceu deste lado.
      setDeclarado(r.ok ? quantos : null);
    } catch {
      // Sem rede não se declara, e não se finge que sim. O número volta a
      // desconhecido — que é o que o servidor tem.
      setDeclarado(null);
    }
  }, [idioma, locationId, orgSlug]);

  useEffect(() => {
    let guardado: string | null;
    try { guardado = window.localStorage.getItem(chave); } catch { guardado = null; }
    setEscolhido(guardado);
    setMontado(true);
    if (guardado) void declarar(guardado);
  }, [chave, declarar]);

  if (dispositivos.length === 0) {
    return (
      <section aria-labelledby="aparelho">
        <h2 id="aparelho">{m.esteAparelho}</h2>
        <p className="bo-campo__ajuda" data-teste="sem-dispositivos">
          {m.semDispositivosNaUnidade}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="aparelho">
      <h2 id="aparelho">{m.esteAparelho}</h2>
      <p className="bo-campo__ajuda">{m.esteAparelhoAjuda}</p>
      <span className="bo-campo">
        <label className="bo-campo__rotulo" htmlFor="aparelho">{m.esteAparelho}</label>
        <select className="bo-campo__controlo" id="aparelho" data-teste="escolher-aparelho"
                value={montado && escolhido ? escolhido : ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setEscolhido(id === '' ? null : id);
                  try {
                    if (id === '') window.localStorage.removeItem(chave);
                    else window.localStorage.setItem(chave, id);
                  } catch { /* sem armazém */ }
                  if (id !== '') void declarar(id);
                  else setDeclarado(null);
                }}>
          <option value="">{m.aparelhoPorEscolher}</option>
          {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
      </span>
      {/* `—` até haver confirmação do servidor. Um zero por declarar era o número
          tranquilizador que o contrato proíbe pelo nome. */}
      <p data-teste="declarado">
        {m.declarado} · {m.porEnviarNoAparelho}: {declarado === null ? '—' : declarado}
      </p>
    </section>
  );
}
