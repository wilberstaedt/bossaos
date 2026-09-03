# Dependências externas

## CT-19 - Decisões externas e quando elas importam

Não há outra rodada obrigatória de brainstorming antes de começar. Algumas escolhas precisam de acesso comercial ou validação real e entram no momento certo.

| Dependência | Quando bloqueia | O que avançar antes |
| --- | --- | --- |
| Símbolo final da logo | Troca do símbolo em materiais finais | Usar BossaOS escrito; manter o restante do design system. |
| Preços, quotas e contratação | Cobrança real e venda de planos | Entitlements configuráveis e piloto provisionado sem cobrança simulada. |
| Domínio e Instagram | Publicação sob domínio/handle pretendidos | Rotas locais/preview e conteúdo comercial; não afirmar disponibilidade. |
| Hospedagem, storage e email | Links públicos, arquivos reais e comunicação | Adaptadores locais, testes e configuração pronta. |
| Pagamento e merchant | Captura real, terminais e repasses | Contrato do módulo, sandbox e testes de eventos. |
| Fiscal e país/entidade | Emissão real e liberação de venda/documentos | Porta fiscal, testes, fila e checklist verificável. |
| Impressora, TV, kiosk e celulares | Homologação de operação nesses aparelhos | Interface responsiva, simulador/bridge e ensaio documentado. |
| Conteúdo, fotos, preços e alérgenos | Publicação real da carta | Fixtures, importação, validação e preview. |
| Políticas de dados e termos | Coleta/uso real e contratos | Controles de consentimento, retenção configurável e exportação. |

Quando uma dependência faltar, registrar nome, capacidade afetada e informação mínima necessária. Concluir o trabalho verificável que não depende dela. Não colocar um mock em produção com aparência de integração pronta.

A pesquisa anterior de naming não prova reserva do domínio ou do Instagram. Não está sendo feita uma nova consulta de disponibilidade aqui; o produto deve usar URLs relativas/.example até haver domínio controlado.

Para bibliotecas, conferir versões estáveis e avisos oficiais na E00 e registrar lockfile. Para fiscal/pagamento, consultar documentação atual na etapa correspondente. Datas e limites de fornecedor não são constantes eternas do produto.
