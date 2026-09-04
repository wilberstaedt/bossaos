'use client';

import { useEffect, useState } from 'react';
import { chaveDaParticao, type Particao } from '@bossaos/fila';

/**
 * STAFF-002 · a zona onde estás, e ela vive NO APARELHO.
 *
 * ── Porquê no aparelho e não no servidor ─────────────────────────────────
 *
 * «Estou na terraça» não é um facto sobre a organização: é sobre esta pessoa,
 * neste telemóvel, neste turno. Guardá-la no servidor fazia dela um estado
 * partilhado que duas pessoas com a mesma conta se sobrepunham — e obrigava a
 * uma escrita com rede para uma escolha que tem de funcionar sem ela.
 *
 * ── E é particionada pela MESMA chave da fila ────────────────────────────
 *
 * *Regra 1 do `offline-e-fila-local.md`.* Um tablet de sala é partilhado: se a
 * zona não levasse a partição, o turno da noite abria o aparelho já «na terraça»
 * porque foi lá que o turno da tarde esteve. É a mesma família de defeito dos
 * rascunhos a seguirem com a sessão de outra pessoa, em ponto pequeno — e o
 * ponto pequeno é onde estas coisas se aprendem baratas.
 */
const PREFIXO = 'bossaos.zona.v1.';

export function chaveDaZona(particao: Particao): string {
  return `${PREFIXO}${chaveDaParticao(particao)}`;
}

export function EscolhaDeZona({
  particao, zonas, m,
}: {
  particao: Particao;
  zonas: { id: string; nome: string }[];
  m: { escolherZona: string; zonaEscolhida: string; zonaNoAparelho: string; semZonas: string };
}) {
  const [zona, setZona] = useState<string | null>(null);
  // `montado` distingue «ainda não li o armazém» de «li e não havia nada». Sem
  // ele, o primeiro render dizia «sem zona escolhida» a quem tinha uma — e um
  // ecrã que se corrige sozinho a seguir é o mesmo que mentir por um instante.
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    try { setZona(window.localStorage.getItem(chaveDaZona(particao))); } catch { setZona(null); }
    setMontado(true);
  }, [particao]);

  const escolher = (id: string) => {
    try { window.localStorage.setItem(chaveDaZona(particao), id); } catch { /* sem armazém */ }
    setZona(id);
  };

  if (zonas.length === 0) {
    return <p className="bo-campo__ajuda" data-teste="sem-zonas">{m.semZonas}</p>;
  }

  const escolhida = zonas.find((z) => z.id === zona) ?? null;

  return (
    <section className="bo-staff__zonas" aria-labelledby="zonas">
      <h2 id="zonas">{m.escolherZona}</h2>
      {montado && escolhida ? (
        <p data-teste="zona-escolhida">{m.zonaEscolhida}: <strong>{escolhida.nome}</strong></p>
      ) : null}
      <ul className="bo-lista" data-teste="zonas">
        {zonas.map((z) => (
          <li key={z.id}>
            <button className={`bo-botao ${z.id === zona ? 'bo-botao--primario' : 'bo-botao--secundario'}`}
                    type="button" data-teste="zona" data-zona={z.id}
                    aria-pressed={z.id === zona}
                    onClick={() => escolher(z.id)}>
              {z.nome}
            </button>
          </li>
        ))}
      </ul>
      <p className="bo-campo__ajuda">{m.zonaNoAparelho}</p>
    </section>
  );
}
