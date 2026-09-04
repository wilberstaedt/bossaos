'use client';

import { useEffect, useState } from 'react';
import { podeOffline } from '@bossaos/fila';

/**
 * A tentativa de cobrar — e a recusa que ela recebe **quando não há rede**.
 *
 * ── Um defeito que encontrei na minha própria prova ──────────────────────
 *
 * A primeira versão desta peça chamava `podeOffline('pagamento')` e mostrava a
 * recusa. `podeOffline` responde sobre a **acção**, não sobre a rede: pagamento
 * exige servidor, portanto devolve sempre «não». O ecrã dizia então «não se pode
 * fazer sem conexão» **com conexão** — e o caso de prova do E15 clicava no botão
 * com a rede LIGADA e dava verde.
 *
 * Isso é uma prova que não consegue ficar vermelha: apagar a lógica de offline
 * toda deixava-a exactamente igual. É o que a régua reprova pelo nome, e estava
 * do meu lado.
 *
 * ── O que a peça faz agora ───────────────────────────────────────────────
 *
 * Cruza as duas coisas, que são diferentes: **o que a acção exige** e **o que o
 * aparelho tem**. Sem rede é recusa, com o motivo, e nada entra na fila —
 * enfileirar prometia que ia acontecer. Com rede a resposta é outra, e diz o que
 * é verdade: quem cobra é o servidor, e este ecrã não cobra. Declarar a lacuna é
 * melhor do que a esconder atrás de uma frase sobre rede que não se aplica.
 *
 * As duas mensagens serem **distintas** é o que torna o caso mensurável: agora
 * um teste que corra online e offline distingue os dois estados, e um que corra
 * só num deles falha a metade que interessa.
 */
export function RecusaFinanceira({
  m,
}: {
  m: { semRede: string; semRedeTitulo: string; pagamentoNoServidor: string };
}) {
  const [resposta, setResposta] = useState<{ offline: boolean; texto: string } | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
    };
  }, []);

  const tentar = () => {
    const exige = !podeOffline('pagamento').pode;
    // A rede lê-se no MOMENTO da tentativa, e não do estado guardado: entre o
    // último evento e este clique a ligação pode ter caído, e é o momento da
    // tentativa que decide.
    const semRede = typeof navigator !== 'undefined' && navigator.onLine === false;
    setResposta(exige && semRede
      ? { offline: true, texto: m.semRede }
      : { offline: false, texto: m.pagamentoNoServidor });
  };

  return (
    <section aria-labelledby="pagamento">
      <h2 id="pagamento">{m.semRedeTitulo}</h2>
      <p className="bo-campo__ajuda" data-teste="ligacao-da-conta">
        {online ? '' : m.semRedeTitulo}
      </p>
      <button className="bo-botao bo-botao--secundario" type="button" data-teste="pagar"
              onClick={tentar}>
        {m.semRedeTitulo}
      </button>
      {resposta ? (
        <p className={`bo-aviso ${resposta.offline ? 'bo-aviso--perigo' : 'bo-aviso--info'}`}
           role="alert"
           data-teste={resposta.offline ? 'recusa-offline' : 'pagamento-no-servidor'}>
          <strong>{m.semRedeTitulo}</strong> — {resposta.texto}
        </p>
      ) : null}
    </section>
  );
}
