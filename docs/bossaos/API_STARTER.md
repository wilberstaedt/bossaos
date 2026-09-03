# Contratos da API - núcleo e Starter

Rotas propostas para os casos de uso iniciais. Parâmetros org/brand/location são IDs validados pelo servidor; slug de interface não dá permissão. Endpoint público usa projeção publicada.

Mutação de domínio exige command_id/idempotência quando repetição pode duplicar efeito, payload validado e expected_version nas edições. Resposta de erro: code, message localizada, field_errors, request_id e retryable quando conhecido. Nunca retornar stack/segredo ao cliente.

| Método | Rota | Autorização | Contrato |
| --- | --- | --- | --- |
| POST | /api/v1/organizations | Verified identity | Create organization + owner + bootstrap state atomically; idempotent. |
| GET | /api/v1/me/contexts | Authenticated user | Return only active memberships and authorized units; private/no shared caching. |
| POST | /api/v1/orgs/{org}/invitations | members.invite | Scope/role bounded by inviter; single-use expiring token; audit. |
| PATCH | /api/v1/orgs/{org}/members/{member} | members.manage | Optimistic version; cannot remove final owner; invalidate permission cache. |
| POST | /api/v1/orgs/{org}/brands | brands.manage | Create brand within quota and scope; scoped slug uniqueness. |
| POST | /api/v1/orgs/{org}/locations | locations.manage | Validate brand, currency, timezone and configured quota; idempotent. |
| PATCH | /api/v1/orgs/{org}/locations/{location} | locations.manage | Expected version; historical currency/timezone behavior explicit. |
| GET | /api/v1/orgs/{org}/entitlements | subscription.read | Return effective grants and source; internal-only overrides require platform authority. |
| POST | /api/v1/orgs/{org}/plan-changes/preview | subscription.manage | Show date, affected modules, sessions and theme; no mutation. |
| POST | /api/v1/orgs/{org}/plan-changes | subscription.manage | Apply/schedule reviewed change with idempotency and service checks. |
| GET | /api/v1/orgs/{org}/brands/{brand}/products | catalog.read | Cursor/filter by scope; include source of overrides only to authorized actor. |
| POST | /api/v1/orgs/{org}/brands/{brand}/products | catalog.write | Validate money, modifier references and content; create draft. |
| PATCH | /api/v1/orgs/{org}/brands/{brand}/products/{id} | catalog.write | Expected version; no silent overwrite; all cross-references checked. |
| POST | /api/v1/orgs/{org}/brands/{brand}/imports/preview | catalog.import | Dry-run CSV/XLSX, column mapping, errors and duplicate strategy. |
| POST | /api/v1/orgs/{org}/brands/{brand}/imports/{import}/commit | catalog.import | Use validated preview revision/checksum; atomic selected batch or explicit partial mode. |
| POST | /api/v1/orgs/{org}/brands/{brand}/media | media.write | Scoped upload intent or upload; validated type/size; processing state. |
| PATCH | /api/v1/orgs/{org}/brands/{brand}/translations/{id} | catalog.translate | Locale, source_version and review state; preserve manual overrides. |
| POST | /api/v1/orgs/{org}/brands/{brand}/publications/preview | catalog.publish | Validate destination units/channels, diff and required reviews. |
| POST | /api/v1/orgs/{org}/brands/{brand}/publications | catalog.publish | Revision/destinations verified; atomic activation + outbox. |
| PATCH | /api/v1/orgs/{org}/locations/{location}/availability/{product} | availability.write | Live availability; reason/version; same brand; invalidate affected cache. |
| GET | /api/v1/public/locations/{slug}/menu | Public projection | Published menu only, locale/channel/revision-aware cache; no private fields. |
| POST | /api/v1/orgs/{org}/locations/{location}/qr | channels.manage | General QR initially; known destination; readable export. |
| PATCH | /api/v1/orgs/{org}/locations/{location}/website/pages/{page} | website.write | Typed blocks, version and preview; no arbitrary script/CSS. |
| POST | /api/v1/orgs/{org}/locations/{location}/website/publish | website.publish | Validated revision; atomic pointer and sitemap/cache invalidation. |
| POST | /api/v1/orgs/{org}/locations/{location}/domains | website.domains | Start verification; no routing before proof of control. |
| POST | /api/v1/orgs/{org}/locations/{location}/theme/preview | theme.write + entitlement | Allowlisted colors; contrast computation; Starter denied. |
| POST | /api/v1/orgs/{org}/locations/{location}/theme/publish | theme.write + entitlement | Versioned activation; public surfaces only; Starter denied. |
| POST | /api/v1/public/demo-requests | Public, rate-limited | Persist lead once; contact purpose and consent distinct; truthful response. |
| GET | /api/v1/orgs/{org}/commands/{command} | Original actor or authorized manager | Return known operation status/result without exposing another actor/tenant. |
| POST | /api/v1/orgs/{org}/exports | data.export with scope | Job/result authorization, redaction and safe CSV; download rechecks permission. |

Códigos esperados: 400/422 para entrada inválida, 401 sem identidade, 403 por ação/entitlement negado no contexto conhecido, 404 para recurso inexistente ou fora do tenant, 409 para versão/estado/idempotência conflitante, 429 para limite e 503 para indisponibilidade. Definir semântica específica no OpenAPI da E00.

Paginação, seleção de campos, cache e acesso a mídia são definidos por endpoint. Consultas privadas não podem usar cache compartilhado sem chave completa de autorização; a opção inicial segura é no-store para dados autenticados. Rotas de auth gerenciadas pela biblioteca seguem o adaptador fixado, sem duplicação artesanal.
