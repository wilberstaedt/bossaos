/**
 * As acções de um bilhete. **Formulários, e não JavaScript.**
 *
 * O tablet da cozinha é um aparelho velho numa rede de restaurante. Um
 * `<form method="post">` continua a funcionar quando o JavaScript falha, e é a
 * mesma decisão que o E06 tomou pelas mesmas razões — aqui com mais peso, porque
 * o que se perde é um bilhete que ninguém faz.
 */
export function AccoesDoBilhete({
  idioma, locationId, stationId, orgSlug, taskId, estado, seccao, m,
}: {
  idioma: string; locationId: string; stationId: string; orgSlug: string; taskId: string;
  estado: string;
  /**
   * A secção para onde voltar. **Uma chave, não um endereço.**
   *
   * A primeira versão mandava o caminho completo num campo escondido — e isso é
   * uma redirecção controlada pelo cliente, que é como se abrem redirecções
   * abertas. É a mesma decisão que tomei na porta do Staff, e vale igual aqui:
   * o servidor reconstrói o endereço a partir do identificador da estação e
   * desta chave, validada contra a lista fechada de secções.
   */
  seccao: string;
  m: { comecar: string; pronta: string; entregar: string };
}) {
  // Só as transições que a tarefa aceita neste estado. Um botão que dá erro é um
  // botão em que alguém carrega no meio do serviço e fica sem saber o que fazer.
  const seguinte = estado === 'POR_INICIAR' ? { para: 'EM_PREPARO', texto: m.comecar }
    : estado === 'EM_PREPARO' ? { para: 'PRONTA', texto: m.pronta }
    : estado === 'PRONTA' ? { para: 'ENTREGUE', texto: m.entregar }
    : null;
  if (!seguinte) return null;

  return (
    <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="accoes">
      <input type="hidden" name="idioma" value={idioma} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="accao" value="transitar" />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="para" value={seguinte.para} />
      <input type="hidden" name="stationId" value={stationId} />
      <input type="hidden" name="seccao" value={seccao} />
      <button className="bo-botao bo-botao--primario bo-botao--operacao" type="submit"
              data-teste={`accao-${seguinte.para}`}>
        {seguinte.texto}
      </button>
    </form>
  );
}
