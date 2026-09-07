# BossaOS — North Star Visual v2

**Destino:** Claude Code no repositório BossaOS  
**Tipo:** intervenção de direção criativa e frontend  
**Momento:** depois da RV100 e antes da AF100  
**Escopo inicial:** landing page espanhola + uma tela-mestre autenticada  
**Regra principal:** não propagar o redesign até Nathalia aprovar as capturas  

---

## Mensagem para enviar ao Claude

> Leia integralmente `BossaOS_North_Star_Visual_v2_Claude.md` e execute somente as fases 0, 1 e 2. A implementação funcional atual deve ser preservada. A interpretação visual anterior da RV100 está reprovada: não continue propagando aquele padrão. Reconstrua apenas a landing page espanhola e a tela-mestre autenticada indicadas, publique um preview, capture desktop e mobile e pare com o status `NORTH STAR PRONTA PARA NATHALIA`. Não declare aprovação em nome da usuária e não execute a AF100.

---

# 1. Por que esta intervenção existe

A RV100 corrigiu requisitos mecânicos, mas não produziu uma direção artística forte. A versão publicada observada em 07/09/2026 está mais completa, porém continua parecendo documentação organizada em componentes.

Medições da home em viewport desktop de 1363 × 936:

| Indicador | Estado observado |
| --- | ---: |
| Altura aproximada da página | 7.103 px |
| Seções | 13 |
| Articles/cards | 29 |
| Títulos H1–H3 | 51 |
| Parágrafos | 77 |
| Imagens, incluindo a logo | 3 |

O problema não é falta de conteúdo. É falta de edição, contraste, escala e narrativa visual.

Sintomas atuais:

- fundo areia contínuo por quase toda a página;
- dezenas de cards com a mesma aparência e o mesmo peso;
- screenshots reais pequenos demais para compreender o produto;
- pouca alternância de cor, escala, largura ou alinhamento;
- coral usado como detalhe, sem criar energia ou conversão;
- verde-lima praticamente ausente;
- excesso de explicação antes de gerar desejo;
- seções que poderiam ser uma frase ocupando centenas de pixels;
- produto mostrado como imagem anexada, não como protagonista;
- dashboard com aparência de estrutura administrativa ainda provisória;
- marca correta, porém sem presença emocional.

**Não tente corrigir isso acrescentando novos cards, textos, ícones ou seções.**

---

# 2. Tese visual obrigatória

## Conceito: Bossa in Motion

A BossaOS deve combinar:

1. **hospitalidade premium:** calor, pessoas, serviço e cuidado;
2. **operação precisa:** estado, tempo, clareza e confiança;
3. **ritmo visual:** alternância intencional, movimento e conexão entre superfícies.

A sensação desejada é:

> Um restaurante vivo por fora e uma operação calma por dentro.

O produto não deve parecer:

- ERP genérico;
- template bege de startup;
- documentação técnica publicada;
- painel governamental;
- site de agência que esconde o software;
- aplicativo infantil de alimentação;
- cópia de concorrente.

## Referências de princípio, não de cópia

- **SevenRooms:** presença humana e hospitalidade em escala grande.
- **Linear:** produto real como protagonista, composição disciplinada e sensação de precisão.
- **BossaOS:** deve acrescentar calor, coral, ritmo, transparência comercial e linguagem própria.

Não copie layout, assets, textos, cores ou código dessas marcas. Extraia somente princípios.

Referências públicas:

- `https://sevenrooms.com/`
- `https://linear.app/`

---

# 3. Linguagem visual fechada

## 3.1 Uso das cores

Mantenha os tokens aprovados:

| Papel | Cor |
| --- | --- |
| Verde profundo | `#102E35` |
| Coral | `#F5664D` |
| Areia | `#F7F4EC` |
| Lima | `#DDEA91` |
| Verde-cinza | `#51666A` |
| Borda | `#D7DEDA` |
| Superfície suave | `#E9EFEC` |

Nova disciplina:

- areia não pode ser o único fundo de todas as seções;
- o primeiro hero deve ser predominantemente verde profundo;
- coral é a energia da marca e o CTA principal;
- lima destaca estado, conexão e continuidade, nunca perigo ou sucesso financeiro;
- branco e superfície suave criam descanso e legibilidade;
- alterne blocos full-bleed verde, areia e branco;
- use coral em áreas maiores apenas uma ou duas vezes por página;
- texto comum sobre coral deve usar verde profundo quando necessário para contraste;
- não crie gradiente arco-íris, neon, glassmorphism ou fundo roxo/azul genérico.

Proporção orientativa da LP, sem virar fórmula rígida:

- 35–45% de áreas verde profundo;
- 30–40% areia/branco;
- coral como foco em 10–15%;
- lima em pequenos destaques.

## 3.2 Tipografia e escala

- Rubik 700 em display e títulos.
- Noto Sans em corpo e controles.
- H1 desktop entre 68 e 76 px, com no máximo 11 palavras visíveis.
- H1 mobile entre 42 e 48 px.
- H2 desktop entre 44 e 56 px.
- Lead desktop entre 19 e 22 px, limitado a três linhas.
- Corpo entre 16 e 18 px.
- Não use negrito em quase tudo.
- Um parágrafo comercial raramente deve ultrapassar 70 caracteres por linha.

## 3.3 Formas e profundidade

- curvas e ondas podem sugerir ritmo, sem redesenhar o símbolo da logo;
- use faixas, arcos ou linhas que conectem visualmente sala, cozinha e gestão;
- cards só existem quando agrupam algo que realmente precisa de contorno;
- cantos entre 14 e 24 px nas áreas de marketing;
- sombras suaves para elevar screenshots do produto;
- borda não pode ser a única diferença entre card e fundo;
- não coloque uma caixa em volta de cada ideia;
- não use pílula para toda navegação ou botão.

## 3.4 Fotografia

Quando houver fotografia autorizada:

- mostre serviço, movimento, cozinha, mesa ou equipe de verdade;
- priorize luz natural e sensação editorial;
- evite banco de imagem com pose corporativa;
- não use restaurante ou pessoa real sem direito de uso;
- La Societat só aparece após autorização explícita.

Se não houver fotografia autorizada, não invente pessoas por IA para fingir cliente. Use o produto real, tipografia, cor e grafismos BossaOS.

---

# 4. Landing page: composição obrigatória

Reduza a home de 13 para **7 blocos narrativos principais**, além de header e footer. Alvo de altura em desktop: aproximadamente 4.500–5.500 px, dependendo do conteúdo real.

## 4.1 Header

- altura entre 72 e 80 px;
- logo aprovada com 145–165 px de largura;
- Produto, Planes, Implantación e Recursos;
- idiomas agrupados em um seletor compacto, não três itens concorrendo com o CTA;
- Entrar como ação discreta;
- Pedir una demo como CTA coral;
- no máximo um item visualmente dominante;
- header claro sobre o hero verde ou transparente com tratamento de logo aprovado;
- mobile com logo, CTA curto e menu real.

## 4.2 Bloco 1 — Hero escuro

Desktop 1440:

- altura mínima de 760 px;
- container de 1.240–1.280 px;
- grade 5/7 ou 6/6;
- mensagem à esquerda;
- produto grande à direita;
- o usuário precisa ler títulos reais da interface sem ampliar a página.

Conteúdo:

**Todo tu restaurante. Un solo ritmo.**

Lead máximo:

> Carta, reservas, sala, cocina y gestión sobre la misma base. Menos herramientas sueltas. Menos errores en pleno servicio.

CTAs:

- primário coral: `Pedir una demo`;
- secundário claro/outline: `Ver cómo funciona`.

Composição do produto:

- screenshot principal do mapa/sala ocupando pelo menos 650 px de largura no desktop;
- KDS sobreposto em segundo plano, com contraste e sombra;
- Staff mobile sobreposto em tamanho legível;
- uma linha coral ou curva liga visualmente as três superfícies;
- um pequeno status lima comunica “Sincronizado” ou outro estado real;
- nada de frames vazios durante carregamento;
- não use perspectiva extrema que torne a UI ilegível.

O primeiro viewport precisa conter **marca + promessa + produto + CTA**.

## 4.3 Bloco 2 — Uma comanda atravessa o sistema

Fundo areia ou branco.

- título grande, com no máximo duas linhas;
- uma única comanda demonstrativa real atravessa Mesa → Cocina → Pase → Caja;
- use quatro crops grandes da interface conectados por uma linha de ritmo;
- cada passo recebe uma frase de até 16 palavras;
- no desktop, composição horizontal/diagonal;
- no mobile, narrativa vertical com progresso claro;
- não use quatro cards iguais com parágrafos.

## 4.4 Bloco 3 — Bento de produto

Fundo verde profundo.

Mostre quatro capacidades em bento assimétrico:

1. catálogo e publicação;
2. reservas e mesas;
3. Staff + KDS;
4. gestão, caixa e estoque.

Cada área precisa ter:

- screenshot real ou crop funcional;
- título curto;
- uma frase de resultado;
- link contextual quando houver página correspondente.

Use tamanhos diferentes: um módulo principal grande, dois médios e um horizontal. Não faça uma grade de quatro caixas idênticas.

## 4.5 Bloco 4 — Para cada pessoa, a tela certa

Fundo claro com tipografia editorial.

- gestor, salão, cozinha e cliente;
- use tabs ou narrativa alternável acessível;
- ao trocar papel, troque screenshot e benefício;
- mantenha a mesma base visual conectando as telas;
- evite quatro novos cards de texto.

## 4.6 Bloco 5 — Planos

Fundo coral suave ou composição areia + coral.

- Starter, Restaurant e Pro;
- Restaurant recebe destaque editorial, não um badge genérico “popular” sem justificativa;
- preço grande e comparação resumida;
- alternância mensal/anual acessível;
- implantação separada;
- IVA e cobrança por estabelecimento visíveis;
- CTA de cada tier;
- link para comparação completa.

Valores obrigatórios da fonte vigente:

- Starter: €19/mês ou €190/ano;
- Restaurant: €79/mês ou €790/ano;
- Pro: €149/mês ou €1.490/ano.

## 4.7 Bloco 6 — Começar sem surpresas

Combine em uma única seção:

- implantação;
- equipamentos;
- reaproveitamento de hardware;
- suporte inicial;
- propriedade dos dados.

Use uma composição 40/60 com linha do tempo visual e quadro de transparência. Não mantenha quatro seções separadas de cards.

## 4.8 Bloco 7 — FAQ curto + CTA final

- no máximo seis perguntas essenciais em accordion acessível;
- remova explicações repetidas que já aparecem antes;
- CTA final verde profundo, com coral em destaque;
- repita a promessa de demo de 30 minutos;
- footer completo, porém visualmente leve.

---

# 5. Edição de conteúdo

Reduza o texto total da home entre **40% e 55%** sem apagar fatos importantes.

Regras:

- uma ideia forte por seção;
- um título não repete o parágrafo seguinte;
- um benefício não vira três explicações;
- detalhes técnicos profundos vão para Produto, Confianza ou FAQ;
- equipamento entra uma vez na home;
- implantação entra uma vez na home;
- offline entra como confiança, não em quatro seções;
- não repetir “misma base” em todos os títulos;
- prefira verbos e resultados a nomes de módulo;
- escreva espanhol natural da Espanha e revise consistência de `tú`, `vosotros` e formalidade;
- não invente depoimentos, números, logos ou resultados.

---

# 6. Página de produto

A página `/es-ES/product` não deve repetir a home.

Ela deve funcionar como um tour visual:

- hero curto;
- navegação lateral ou sticky por etapa;
- screenshots em largura grande;
- zoom/crop em detalhes úteis;
- uma comanda real percorrendo catálogo, mesa, Staff, KDS e gestão;
- alternância entre imagem grande e explicação curta;
- vídeo curto opcional quando houver gravação real;
- CTA no meio e no fim;
- nada de páginas compostas por uma sequência de figuras sobre fundo areia sem ritmo.

---

# 7. North Star da aplicação autenticada

Implemente somente uma tela autenticada como referência: **Mesas em tempo real**.

## 7.1 Shell

- sidebar verde profundo entre 232 e 264 px;
- logo e seletor de tenant/unidade com hierarquia clara;
- navegação agrupada por operação, gestão e configuração;
- ícones consistentes e licenciados;
- ativo indicado por barra coral + contraste, não apenas bloco lima;
- topbar leve com breadcrumb/contexto, busca quando útil e perfil;
- superfície principal clara, com cards brancos ou suaves.

## 7.2 Tela de mesas

Não aceite uma lista de textos como “mapa de mesas”.

A tela deve ter:

- nome da zona e estado do serviço;
- resumo pequeno: livres, ocupadas, reservadas e atenção;
- mapa/grade visual de mesas com forma, capacidade e estado;
- mesa ocupada mostra duração e responsável;
- mesa reservada mostra horário próximo sem expor PII indevida;
- filtros e ações secundárias sem virar dez pílulas;
- botão primário claro para abrir mesa;
- painel lateral/drawer ao selecionar mesa;
- empty, loading, error e offline coerentes;
- dados demo identificados como demonstração.

## 7.3 Mobile/Staff

- não comprima a sidebar desktop;
- use navegação móvel própria;
- cards/linhas grandes para toque;
- ações principais na zona do polegar;
- mesa e estado legíveis em movimento;
- nenhuma operação depende de hover.

---

# 8. Limites objetivos

A primeira entrega será reprovada se:

- continuar com fundo areia em todas as seções;
- continuar com mais de dez cards de texto semelhantes na home;
- o hero não mostrar uma interface legível;
- screenshots parecerem anexos dentro de molduras vazias;
- a nova home ultrapassar oito blocos narrativos principais;
- coral e lima aparecerem apenas como detalhes mínimos;
- houver mais texto que produto nas duas primeiras telas de rolagem;
- Produto repetir integralmente a home;
- Mesas em tempo real continuar sendo essencialmente uma lista;
- o mobile for apenas o desktop empilhado;
- forem adicionados depoimentos, clientes ou métricas inventadas;
- houver regressão funcional, de idioma ou acessibilidade;
- o executor aprovar o próprio resultado.

---

# 9. Processo de execução

## Fase 0 — Congelar e medir

1. Registre SHA, branch e estado do worktree.
2. Rode o baseline funcional.
3. Capture a home atual em 1440 × 900 e 390 × 844.
4. Capture Mesas em tempo real nos mesmos contextos aplicáveis.
5. Liste componentes que podem ser reutilizados e os que perpetuam o padrão reprovado.

## Fase 1 — Sistema visual mínimo

Implemente apenas o necessário para as duas telas-mestre:

- backgrounds e sections;
- typography/display;
- header e footer;
- botões;
- product frames;
- bento;
- price cards;
- shell autenticado;
- mesa visual e estados.

Não refatore as 396 telas nesta fase.

## Fase 2 — Duas referências executáveis

Implemente:

1. `/es-ES` — landing completa no novo conceito;
2. `Mesas em tempo real` — tela autenticada North Star.

Capture obrigatoriamente:

| Evidência | Viewport |
| --- | --- |
| LP primeira viewport | 1440 × 900 |
| LP full page | 1440 px de largura |
| LP mobile primeira viewport | 390 × 844 |
| LP mobile full page | 390 px de largura |
| Mesas desktop | 1440 × 900 |
| Mesas mobile/Staff | 390 × 844 |

Teste ES, PT e EN, contraste, foco, teclado, zoom e conteúdo longo.

## Gate obrigatório

Publique um preview verificável e responda com:

1. commit;
2. URL do preview;
3. screenshots;
4. resumo das decisões visuais;
5. testes executados;
6. componentes ainda não propagados;
7. status exato: `NORTH STAR PRONTA PARA NATHALIA`.

Depois pare.

Não aplique o design às demais páginas ou telas até Nathalia escrever explicitamente que a direção foi aprovada.

## Fase 3 — Somente após aprovação

Após aprovação humana:

1. transforme as referências em componentes/tokens consolidados;
2. aplique primeiro em Produto, Planos, Implantação, Demo e páginas institucionais;
3. reapresente a frente pública;
4. aplique nos shells autenticados por família de uso;
5. preserve densidades diferentes para backoffice, Staff, KDS e TPV;
6. rode regressão funcional e visual;
7. produza a cobertura da RV100;
8. somente então marque como pronta para AF100.

---

# 10. Previews fornecidos pela usuária

Os previews abaixo foram fornecidos como contexto adicional. Eles podem exigir a sessão do proprietário:

- `https://claude.ai/code/artifact/8f11a092-444c-4e33-bff1-3b4b772a1e4e?via=auto_preview`
- `https://claude.ai/code/artifact/1bdd3bf5-63bb-42bc-a21f-116dd6031202?via=auto_preview`

Se estiverem acessíveis no ambiente do executor:

- capture-os;
- identifique o que representam;
- use somente capacidades reais;
- não os trate como visual aprovado sem mensagem explícita de Nathalia;
- copie evidências relevantes para o repositório, pois links de sessão não são fonte permanente.

---

# 11. Definição humana de sucesso

A direção estará pronta para avaliação quando Nathalia puder olhar a primeira viewport e responder “isso parece a BossaOS” antes de ler toda a página.

Critérios perceptivos:

- marca forte sem poluição;
- software grande e compreensível;
- ritmo entre escuro, claro, coral e produto;
- sensação premium, mas próxima;
- menos texto e mais demonstração;
- operação complexa parecendo organizada;
- página memorável sem efeitos gratuitos;
- tela diária mais rápida e clara que a versão anterior.

O Claude não decide se esses critérios perceptivos passaram. Ele prepara uma execução tecnicamente sólida e apresenta para aprovação.

---

# 12. Regra final

Não responda à reprovação visual com mais documentação, mais cards ou mais conteúdo.

Responda com **edição, escala, contraste, produto real e uma composição que tenha ritmo**.

O objetivo não é apenas cumprir a identidade BossaOS. É fazer a interface ter a mesma personalidade forte que a logo já tem.
