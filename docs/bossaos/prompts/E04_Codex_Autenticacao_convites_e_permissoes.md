# E04 - Autenticação, convites e permissões

**Enviar para:** Codex  
**Depende de:** E03  
**Entrega:** Acesso real com sessões, recuperação, convites e autorização por ação.

## Prompt para copiar

Execute a etapa indicada no repositório BossaOS. Leia instruções locais, docs/progress/HANDOFF.md, contratos em docs/bossaos e referências dos IDs no CSV/atlas. Preserve decisões e trabalho existente. Entregue comportamento real; dependência externa ausente fica como pendência, sem simular conclusão.

Etapa autorizada agora: E04 - Autenticação, convites e permissões. Resultado esperado: Acesso real com sessões, recuperação, convites e autorização por ação.

Referências específicas: CT-04, CT-14 e matriz de papéis.

IDs principais: AUTH 001, 003-009; ONB 009; ORG 007-008; STATE 014

Vistas relacionadas a evoluir/revisar: SET 010-011.

### Entregue

1. Integre a biblioteca de autenticação do ADR: login, logout, verificação de email, recuperação, expiração/revogação de sessão e MFA.
2. Implemente Membership, RoleAssignment e resolução de permissões por organização, marca, unidade e estação. Garanta ações e escopos no servidor para páginas e APIs.
3. Crie convites de uso único com validade, aceitação autenticada, seleção de organização/unidade e proteção contra remoção do último owner.
4. Implemente as telas AUTH aplicáveis, gestão básica de usuários e perfil. PIN de operação só ficará disponível em dispositivo confiável na E13.
5. Audite concessões, revogações e acesso sensível; prepare suporte assistido sem conceder acesso global implícito à equipe da plataforma.

### Respeite

1. Não construa criptografia, recuperação ou armazenamento de senha próprios. MFA básico está disponível em todos os planos como decisão técnica registrada.
2. Convite não pode conceder escopo superior ao de quem convida. Marca/unidade e permissões são revalidadas após troca de contexto.
3. Reautenticação deve preservar apenas rascunho local seguro da mesma identidade, sem revelá-lo a outro operador.

### Critérios de aceite

1. Convite expirado, reutilizado ou com escopo adulterado não dá acesso.
2. Host não lê financeiro; cozinha só opera estação autorizada; usuário revogado perde acesso sem precisar limpar a página.
3. Recuperação e MFA funcionam no ambiente de teste e encerram sessões conforme a política registrada.

Atualize docs/progress/E04.md, HANDOFF.md e a matriz de execução com arquivos, migrações, IDs, testes efetivos e pendências. Se precisar dividir a etapa, mantenha-a aberta e registre a próxima ação. Não avance automaticamente.
