# BRAIN-INBOX — BossaOS

> Caixa de entrada para o segundo cérebro. O Lúmen processa e limpa via
> `/end-session` ou `/daily-briefing`; o que fica aqui é o que ainda não foi
> arrumado no vault.

---

## [2026-09-04] — do E08 ao marco do Starter aprovado

### Mudança de status do projecto
- **30%: 11 de 36 etapas, 112 de 396 telas.** Começou o dia em 19%.
- **MARCO E11 — Starter APROVADO à 2ª.** Pronto para piloto **no âmbito
  verificado**: 112 telas validadas e medidas em desktop e móvel, isolamento entre
  inquilinos visto no produto, jornada percorrida de organização inexistente até
  site publicado, identidade separada por porta estreita, preço com uma fonte só.
  **Não** é Restaurant, Pro, TPV, caixa nem fiscal.
- E08, E09, E10 e E11 fechados. E12 (cores públicas e planos) em curso.

### Decisões técnicas
- **Uma etapa com telas não se assina sem prova de navegador.** Nasceu de eu ter
  assinado o E09 com dois defeitos reais lá dentro — carta pública servida sem
  folha de estilos, e a consulta a servir o menu de **outra unidade** numa página
  pública. A minha prova era toda de base e domínio: a página nunca foi renderizada.
- **O endereço público não volta ao mundo.** Apagar tira do ar, não liberta o nome:
  o QR está impresso na mesa e um nome que muda de dono redirecciona pessoas reais.
  `@unique` impede dois ao mesmo tempo, não dois em sequência.
- **A identidade é global, o inquilino é local.** Saber que existe uma conta
  chamada Ana não é direito de quem administra um restaurante. Os nomes chegam por
  função `SECURITY DEFINER` que confirma a organização **contra o contexto da
  sessão**, nunca contra o argumento.
- **Preços em cêntimos inteiros, com uma fonte só.** O PDF comercial existia fora
  do repositório e os dois ficheiros que ele mandava criar nunca foram entregues.
  Por isso a página de planos nasceu sem preços — e o executor recusou-se a
  inventá-los, que foi a decisão certa.

### Learnings
- **O defeito do dia teve uma família só: o instrumento a vigiar uma FORMA de
  escrita em vez da propriedade.** Varri as guardas todas e **oito de oito tinham
  defeito**, nenhum no produto. Exemplos: a do QR via `export async function POST`
  e não `export const POST`; a dos alergénios via a plica e não as aspas; a das
  classes via três formas de `className` e não a condicional; a do dinheiro proibia
  `parseFloat` e deixava passar `Number(preco)`.
- **Metade das guardas não corria no servidor.** O `provar-tudo` descobre-as, a CI
  listava-as à mão, e a lista estava três dias atrasada. Uma lista envelhece em
  silêncio: ninguém vê a entrada que **falta**.
- **"Não medi" é uma resposta diferente de "zero".** A guarda dos pacotes lia a
  ausência de sumário como zero testes e mandava declarar o `domain`, que tem 302.
- **Uma reposição testa-se em base descartável.** Testei-a na base de
  desenvolvimento e envenenei-a; a reparação foi reconstruir das migrações.
- **Sondas destrutivas vão numa cópia.** Reescrevi duas vezes ficheiros que o JR
  estava a editar e só não lhe comi trabalho por sorte de temporização.
- **A régua da etapa seguinte audita a anterior.** A do E09 encontrou um buraco no
  E08 que eu já tinha assinado; é a única auditoria que tenho da minha assinatura.
- **Escrever a régua antes do código é o que muda o resultado.** As etapas que
  passaram à primeira foram as que a tinham.

### O que foi feito
- 5 guardas novas (móvel, móvel-real, acções, preços, jornada) e 8 corrigidas,
  todas com controlo negativo interno e provadas com o defeito real reproduzido.
- A CI passou a **descobrir** as guardas, com guarda contra população zero.
- `provar-marco-e11.sh`: a segunda passagem do marco **executável**, escrita
  enquanto as seis falhas ainda estavam abertas.
- Contratos novos: domínios e endereços, identidade dentro do inquilino, e a
  aresta da fila local em revogação.
- Réguas escritas antes do código: E10, E11, E12, E13.
- Preview repetível em `scripts/preview.sh`.

### Próximo passo
E12 em curso — o ataque está preparado em `inspeccao/sonda-tema.ts`: ler a cor
**resolvida pelo navegador**, e exigir que os cinco tokens públicos mudem e os
sete fixos não. A pergunta aberta do E13 está no contrato: **a revogação fecha a
porta por onde a regra 2 mandava sair**, e o rascunho fica nem enviado nem
recuperável. Três saídas nomeadas, nenhuma escolhida — é decisão de produto.
