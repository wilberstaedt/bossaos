'use client';

import { useState } from 'react';
import { Botao, Dialogo, Gaveta, Notificacao, Notificacoes } from '@bossaos/ui';

export interface DemoInteractivaProps {
  rotuloDialogo: string;
  rotuloGaveta: string;
  tituloDialogo: string;
  corpoDialogo: string;
  tituloGaveta: string;
  corpoGaveta: string;
  rotuloGuardar: string;
  rotuloCancelar: string;
  rotuloFechar: string;
  tituloNotificacao: string;
}

/**
 * Ilha interactiva do catálogo.
 *
 * Está separada de propósito: o resto do catálogo é servido do servidor e não
 * leva JavaScript nenhum para o browser. Só o que precisa mesmo de estado —
 * abrir um diálogo, fechar uma notificação — atravessa a fronteira.
 */
export function DemoInteractiva(p: DemoInteractivaProps) {
  const [dialogo, setDialogo] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [notificacao, setNotificacao] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Botao id="abrir-dialogo" tom="secundario" onClick={() => setDialogo(true)}>
        {p.rotuloDialogo}
      </Botao>
      <Botao id="abrir-gaveta" tom="secundario" onClick={() => setGaveta(true)}>
        {p.rotuloGaveta}
      </Botao>
      <Botao id="abrir-notificacao" tom="fantasma" onClick={() => setNotificacao(true)}>
        {p.tituloNotificacao}
      </Botao>

      <Dialogo
        aberto={dialogo}
        aoFechar={() => setDialogo(false)}
        titulo={p.tituloDialogo}
        accoes={
          <>
            <Botao tom="secundario" onClick={() => setDialogo(false)}>
              {p.rotuloCancelar}
            </Botao>
            <Botao onClick={() => setDialogo(false)}>{p.rotuloGuardar}</Botao>
          </>
        }
      >
        <p>{p.corpoDialogo}</p>
      </Dialogo>

      <Gaveta
        aberto={gaveta}
        aoFechar={() => setGaveta(false)}
        titulo={p.tituloGaveta}
        accoes={
          <Botao tom="secundario" onClick={() => setGaveta(false)}>
            {p.rotuloFechar}
          </Botao>
        }
      >
        <p>{p.corpoGaveta}</p>
      </Gaveta>

      {notificacao ? (
        <Notificacoes>
          <Notificacao
            titulo={p.tituloNotificacao}
            rotuloFechar={p.rotuloFechar}
            aoFechar={() => setNotificacao(false)}
          />
        </Notificacoes>
      ) : null}
    </div>
  );
}
