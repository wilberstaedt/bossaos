# Modelo de dados do núcleo e Starter

Proposta de schema lógico detalhado; não é uma migration executável. E00 confirma tipos físicos, nomes da biblioteca de autenticação, índices e constraints antes de E03/E07. Campos de domínio usam identificadores em inglês.

Todas as tabelas tenant usam organization_id e FKs compostas para não misturar organizações. Tabelas de marca/unidade validam também o parentesco. Campos monetários são exatos; tempo operacional é UTC mais timezone IANA da regra. Estados são enums/constraints documentados.

| Entidade | Campos essenciais | Restrições / contrato | Etapa |
| --- | --- | --- | --- |
| Organization | id UUID; legal_name; display_name; country_code; default_locale; status; created_at; version | PK id; status controlled. Bootstrap creates owner membership atomically. | E03 |
| Brand | id; organization_id; name; slug; default_locale; status; version | UNIQUE organization_id,slug and organization_id,id; FK organization. | E03 |
| Location | id; organization_id; brand_id; public_slug; name; timezone; currency; status; version | FK organization_id,brand_id; public_slug globally unique in public route namespace. | E03/E06 |
| LocationContact | location_id; organization_id; public_address; public_phone; public_email; coordinates; reviewed_at | 1:1 with location; public fields explicitly separate from billing/private contact. | E06 |
| OpeningWindow | id; organization_id; location_id; weekday; start_local; end_local; end_day_offset; service_type | Intervals with valid duration; end_day_offset distinguishes overnight. No UTC conversion without service date. | E06 |
| OpeningException | id; organization_id; location_id; local_date; closed; replacement_windows; reason | Unique rule version per location/date; override regular schedule deterministically. | E06 |
| User / AuthSession / Credential | Library-managed schema; id; verified identity; session expiry/revocation | Use selected auth adapter schema; no custom password protocol. No tenant data embedded as permanent trust. | E04 |
| Membership | id; organization_id; user_id; status; permission_version | UNIQUE organization_id,user_id; global user reference; revocation invalidates current access. | E04 |
| RoleAssignment | id; organization_id; membership_id; role; scope_type; brand_id?; location_id?; policy | FKs preserve organization. CHECK scope shape. Station scope added with production model, not as an unvalidated early ID. | E04 |
| Invitation | id; organization_id; invited_email; scope; role; token_hash; expires_at; accepted_at; inviter_id | Unique token hash; single use; grant cannot exceed inviter authority; no raw invite token in logs. | E04 |
| PlanDefinition | id; code; version; capability_rules; quota_schema; active | Global platform catalogue. Stable codes starter/restaurant/pro; quantitative values require configured contract. | E05 |
| Subscription | id; organization_id; plan_version_id; status; provider_ref?; effective_from; ends_at? | Organization subscription history; unique external account/subscription when configured. No fake payment state. | E05/E32 |
| EntitlementGrant | id; organization_id; location_id?; capability; value; source; starts_at; ends_at? | Validated typed value and precedence; explicit override history. No arbitrary client JSON controlling capability. | E05 |
| Product | id; organization_id; brand_id; sku?; name; description; lifecycle; base_currency; base_amount_minor; version | SKU unique per brand when filled; price nonnegative; brands/tenants consistent. Product identity reused by channels. | E07 |
| Category | id; organization_id; brand_id; name; description; position; status; version | Order stable with tiebreaker; authorized brand scope. | E07 |
| ProductCategory | organization_id; brand_id; product_id; category_id; position | Unique association; FKs enforce same tenant and brand. | E07 |
| Variant | id; organization_id; brand_id; product_id; name; price_adjustment_minor; active; version | Parent product same brand; resulting effective price validated. | E07 |
| ModifierGroup / ModifierOption | id; organization_id; brand_id; name; min; max; required; option_amount_minor; active | Reusable groups; min<=max; allowed selections explicit. Associations reference same brand. | E07 |
| ProductModifierGroup | organization_id; brand_id; product_id; group_id; position | Unique relation; per-product constraints cannot bypass group validation. | E07 |
| PriceRule | id; organization_id; brand_id; product_id; location_id?; channel?; local_period?; currency; amount_minor; priority; version | No ambiguous equal-priority overlap; target location belongs to brand. Exact money and explicit source. | E07 |
| ProductAllergen | organization_id; brand_id; product_id; allergen_code; declaration; reviewed_by; reviewed_at | Declaration distinguishes contains/may_contain/unknown as configured; absence is not clearance. | E07 |
| Menu / MenuEntry | id; organization_id; brand_id; name; lifecycle; product_id; category_id; position; version | MenuEntry references existing Product; copying a menu within brand does not copy product records. | E07 |
| AvailabilityOverride | id; organization_id; location_id; product_id; channel?; state; period; reason; version | Live operational layer; same-brand product; stock source arrives E25. Cannot turn unpublished data public. | E07 |
| MediaAsset | id; organization_id; brand_id?; storage_key; mime; size; checksum; processing_state; alt_text; access_state | Key generated by server; ownership verified on attach/download; no arbitrary internal URL fetch. | E08 |
| Translation | id; organization_id; brand_id; resource_type; resource_id; locale; field; text; source_version; review_state | Unique resource/locale/field; validated polymorphic reference through domain service; stale source flagged. | E08 |
| MenuRevision | id; organization_id; brand_id; menu_id; revision_number; content_snapshot; checksum; created_by; created_at | Immutable after creation; unique menu/revision. Snapshot contains only validated public fields. | E08 |
| Publication | id; organization_id; location_id; channel; revision_id; state; scheduled_at?; activated_at; version | Atomic active-pointer change per destination. Only references same-tenant, same-brand revisions. | E08 |
| WebsitePage / WebsiteRevision | id; organization_id; location_id; slug; locale; typed_blocks; seo_fields; revision; state | Sanitized structured blocks; unique slug/locale in location; preview private; publication versioned. | E10 |
| DomainBinding | id; organization_id; location_id; hostname; verification_hash; state; verified_at; certificate_state | Hostname unique among active bindings; verified control before routing; revocation and safe reuse. | E10 |
| ThemeRevision | id; organization_id; brand_id; location_id?; allowed_tokens; contrast_result; revision; state | Typed color allowlist, server validation and entitlement. Default immutable for Starter; editable in E12. | E05/E12 |
| QRCode | id; organization_id; location_id; kind; destination_ref; token_hash?; version; revoked_at? | Starter general QR only; table/session credential added E17. Export must resolve actual public route. | E09/E17 |
| Lead | id; locale; contact; message; contact_purpose; marketing_consent; source; created_at; status | Platform-owned demo request. Minimal fields; abuse controls; no invented tenant or campaign permission. | E10 |
| AuditEvent | id; organization_id?; scope; actor_id; action; resource_ref; before_after_summary; reason; occurred_at; correlation_id | Append-only for runtime; minimize PII; platform and tenant access rules distinct. | E04 |
| CommandReceipt | id; organization_id; actor_scope; action; command_id; payload_hash; response_ref; state; created_at | Unique scope/action/command_id. Persist outcome with effect; expiry policy cannot remove business uniqueness of money events. | E06 |
| OutboxEvent / JobAttempt | id; organization_id?; location_id?; aggregate_ref; sequence; schema_version; payload_ref; status; attempt; next_attempt_at | Event saved in domain transaction; consumer deduplication; retry limits and dead-letter visibility. | E08 |
| BasicAnalyticsEvent / Aggregate | id; organization_id; location_id; publication_id; event_type; locale; source; occurred_at | Allowlisted event fields; no personal tracking by default; retention/configured aggregation. | E09 |

A E00 deve acrescentar cardinalidades, índices por consulta, nullability, estratégias de versionamento e migração. Não criar antecipadamente tabelas de todos os domínios Pro: suas fronteiras já estão em CT-05 e serão materializadas na etapa do módulo.

O schema do adaptador de autenticação deve ser seguido conforme a versão fixada, sem uma segunda implementação concorrente. A verificação de membership gera contexto; o cliente não escolhe permissões por header. Jobs usam um contexto de sistema mínimo e auditado.
