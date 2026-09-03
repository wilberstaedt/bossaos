// Domínio partilhado do BossaOS.
//
// Nesta etapa contém apenas as PORTAS — os contratos que o domínio impõe ao
// mundo exterior. As entidades do produto entram nas etapas que as desenham;
// inventá-las aqui seria decidir o modelo de dados sem o contrato à frente, que
// é exactamente o que o E01 manda não fazer.
export type { PortaDeMedia, FicheiroGuardado } from './portas/media.ts';
