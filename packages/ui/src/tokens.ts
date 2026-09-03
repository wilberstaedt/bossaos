/**
 * Fichas de design partilhadas.
 *
 * Estão aqui por uma razão operacional e não estética: a cor da marca no
 * material impresso e a cor da marca na interface **não são a mesma**, e essa
 * diferença foi medida, não escolhida por gosto. O `#FB4C39` do logótipo perde
 * contraste sobre o fundo areia da interface; o `#F5664D` mantém-no. Guardar as
 * duas com o nome do sítio onde valem evita que alguém "corrija" uma para a
 * outra daqui a três meses.
 *
 * As restantes fichas entram com as etapas de interface. Isto não é um sistema
 * de design — é o mínimo partilhado para que a base executável não invente cor.
 */
export const cores = {
  /** Interface: acção primária, estados activos. Contraste medido sobre areia. */
  primaria: '#F5664D',
  /** Arte do logótipo. NÃO usar como cor de interface. */
  marcaLogotipo: '#FB4C39',
  fundo: '#FBF7F2',
  texto: '#1F1B18',
  textoSuave: '#6B615A',
  borda: '#E5DCD2',
  perigo: '#B3261E',
  sucesso: '#1F6F43',
} as const;

export const espaco = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const raio = { sm: 4, md: 8, lg: 16 } as const;

export type Cor = keyof typeof cores;
