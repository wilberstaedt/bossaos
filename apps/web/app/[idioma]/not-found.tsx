import { NaoEncontrado } from '../../src/componentes/NaoEncontrado.tsx';

/**
 * O que um visitante perdido vê, com **404** a sério.
 *
 * O Next não passa `params` ao `not-found`, por isso o idioma não se sabe aqui.
 * Fica o espanhol, que é o idioma em que o produto vive — e não uma dedução a
 * partir do cabeçalho do navegador, que daria uma página em inglês a quem está
 * a navegar em espanhol.
 */
export default function NaoEncontradoDaRota() {
  return <NaoEncontrado idioma="es-ES" />;
}
