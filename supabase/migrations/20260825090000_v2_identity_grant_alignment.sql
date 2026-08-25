-- WinWin v2 Migration 008 -- Identity and Grant Alignment
-- DESIGN DRAFT ONLY. DO NOT APPLY TO LOCAL OR REMOTE SUPABASE IN THIS GATE.
--
-- Additive scope only:
--   * identity layer and append-only verification history
--   * nullable Membership -> Identity alignment with conservative legacy backfill
--   * immutable, versioned Grant templates and capability membership
--   * nullable Role Grant and Authorization Declaration identity references
--
-- This migration intentionally does not create content, Question, Action,
-- Professional Record, private workspace, Content RLS, or content RPC objects.
-- Migration 001-007 relations, columns, policies, and functions are not dropped
-- or renamed. Existing Migration 007 Actor-based authorization remains the
-- fail-closed compatibility path until a separately reviewed Identity-aware
-- helper/RLS rollout.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixed identity and Grant-template vocabularies
-- ---------------------------------------------------------------------------

CREATE TYPE public.v2_identity_type AS ENUM (
    'CARE_RECEIVER',
    'FAMILY',
    'PROFESSIONAL',
    'LEGACY_UNSPECIFIED'
);

CREATE TYPE public.v2_professional_type AS ENUM (
    'CASE_MANAGER',
    'CARE_WORKER',
    'NURSE',
    'PHYSICIAN',
    'PHYSICAL_THERAPIST',
    'OCCUPATIONAL_THERAPIST',
    'SPEECH_THERAPIST',
    'DIETITIAN',
    'PSYCHOLOGIST',
    'SOCIAL_WORKER'
);

CREATE TYPE public.v2_identity_verification_status AS ENUM (
    'DECLARED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE public.v2_identity_status AS ENUM (
    'ACTIVE',
    'RETIRED'
);

CREATE TYPE public.v2_grant_template_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);

-- Extend the existing Migration 007 vocabulary without duplicating meanings.
-- PostgreSQL does not permit a newly added enum value to be used until the
-- transaction that added it commits. This migration therefore declares the
-- future content capabilities but does not seed template rows with these new
-- values. A later content migration may use them after Migration 008 commits.
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'VIEW_CARE_UPDATE';
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'VIEW_QUESTION';
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'RESOLVE_QUESTION';
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'CREATE_PROFESSIONAL_RECORD';
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'CORRECT_PROFESSIONAL_RECORD';
ALTER TYPE public.v2_capability ADD VALUE IF NOT EXISTS 'VIEW_PROFESSIONAL_CONTENT';

-- Frozen Frontend -> database capability mapping:
--   VIEW_SHARED_CARE / VIEW_PROFESSIONAL_CASE -> VIEW_ALLOWED_SCOPE today;
--     later content policies use VIEW_CARE_UPDATE / VIEW_PROFESSIONAL_CONTENT.
--   ADD_UPDATE                 -> CREATE_CARE_UPDATE
--   CREATE_QUESTION            -> CREATE_QUESTION
--   RESOLVE_QUESTION           -> RESOLVE_QUESTION
--   ASSIGN_ACTION              -> ASSIGN_ACTION
--   ACCEPT_OWN_ACTION          -> ACCEPT_OWN_ACTION
--   PROGRESS_OWN_ACTION        -> PROGRESS_OWN_ACTION
--   COMPLETE_OWN_ACTION        -> COMPLETE_OWN_ACTION
--   CREATE_PROFESSIONAL_RECORD -> CREATE_PROFESSIONAL_RECORD
--   CORRECT_PROFESSIONAL_RECORD-> CORRECT_PROFESSIONAL_RECORD
--   MANAGE_MEMBERS             -> MANAGE_MEMBERSHIPS
-- Existing MANAGE_INVITATIONS and MANAGE_GRANTS retain their exact names.

-- ---------------------------------------------------------------------------
-- Identity layer
-- ---------------------------------------------------------------------------

CREATE TABLE public.v2_identities (
    identity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_reference_id UUID NOT NULL,
    identity_type public.v2_identity_type NOT NULL,
    professional_type public.v2_professional_type NULL,
    display_label TEXT NULL,
    current_verification_status public.v2_identity_verification_status NOT NULL
        DEFAULT 'DECLARED',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status public.v2_identity_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    retired_at TIMESTAMPTZ NULL,
    CONSTRAINT v2_identities_actor_fkey
        FOREIGN KEY (actor_reference_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_v2_identity_actor_pair
        UNIQUE (identity_id, actor_reference_id),
    CONSTRAINT chk_v2_identity_professional_type
        CHECK (
            (identity_type = 'PROFESSIONAL' AND professional_type IS NOT NULL)
            OR (identity_type <> 'PROFESSIONAL' AND professional_type IS NULL)
        ),
    CONSTRAINT chk_v2_identity_display_label
        CHECK (display_label IS NULL OR btrim(display_label) <> ''),
    CONSTRAINT chk_v2_identity_retirement
        CHECK (
            (status = 'ACTIVE' AND retired_at IS NULL)
            OR (status = 'RETIRED' AND retired_at IS NOT NULL AND retired_at >= created_at)
        ),
    CONSTRAINT chk_v2_legacy_identity_fail_closed
        CHECK (
            identity_type <> 'LEGACY_UNSPECIFIED'
            OR (
                professional_type IS NULL
                AND current_verification_status <> 'VERIFIED'
                AND is_primary = FALSE
            )
        )
);

CREATE UNIQUE INDEX uq_v2_identity_active_primary_actor
    ON public.v2_identities(actor_reference_id)
    WHERE status = 'ACTIVE' AND is_primary = TRUE;

CREATE UNIQUE INDEX uq_v2_identity_active_legacy_actor
    ON public.v2_identities(actor_reference_id)
    WHERE status = 'ACTIVE' AND identity_type = 'LEGACY_UNSPECIFIED';

CREATE INDEX idx_v2_identities_actor_status
    ON public.v2_identities(actor_reference_id, status);

COMMENT ON TABLE public.v2_identities IS
    'Account-linked declared identities; identity verification and case authorization remain separate';
COMMENT ON COLUMN public.v2_identities.display_label IS
    'Optional current display label, not a verified legal identity and not a historical content snapshot';
COMMENT ON COLUMN public.v2_identities.is_primary IS
    'Account preference only; primary identity never grants case access';

CREATE TABLE public.v2_identity_verification_events (
    verification_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL,
    from_status public.v2_identity_verification_status NULL,
    to_status public.v2_identity_verification_status NOT NULL,
    method TEXT NOT NULL,
    decided_by_actor_id UUID NULL,
    reason_code TEXT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NULL,
    CONSTRAINT v2_identity_verification_identity_fkey
        FOREIGN KEY (identity_id)
        REFERENCES public.v2_identities(identity_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_identity_verification_decider_fkey
        FOREIGN KEY (decided_by_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_v2_identity_verification_method
        CHECK (btrim(method) <> ''),
    CONSTRAINT chk_v2_identity_verification_reason
        CHECK (reason_code IS NULL OR btrim(reason_code) <> ''),
    CONSTRAINT chk_v2_identity_verification_expiry
        CHECK (expires_at IS NULL OR expires_at > occurred_at),
    CONSTRAINT chk_v2_identity_verification_transition
        CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE INDEX idx_v2_identity_verification_identity_time
    ON public.v2_identity_verification_events(identity_id, occurred_at DESC);

COMMENT ON TABLE public.v2_identity_verification_events IS
    'Append-only verification transition history; no identity documents or credential images are stored';

-- ---------------------------------------------------------------------------
-- Membership and Authorization Declaration additive alignment
-- ---------------------------------------------------------------------------

ALTER TABLE public.v2_case_memberships
    ADD COLUMN identity_id UUID NULL;

-- One conservative, unverified legacy Identity per Actor that owns at least one
-- pre-008 Membership. No role family or profession is inferred from legacy data.
-- The partial unique index makes this backfill idempotent-friendly and prevents
-- duplicate active legacy identities for one Actor.
INSERT INTO public.v2_identities (
    actor_reference_id,
    identity_type,
    professional_type,
    display_label,
    current_verification_status,
    is_primary,
    status
)
SELECT DISTINCT
    membership.actor_id,
    'LEGACY_UNSPECIFIED',
    NULL,
    NULL,
    'DECLARED',
    FALSE,
    'ACTIVE'
FROM public.v2_case_memberships AS membership
WHERE NOT EXISTS (
    SELECT 1
    FROM public.v2_identities AS identity_row
    WHERE identity_row.actor_reference_id = membership.actor_id
      AND identity_row.identity_type = 'LEGACY_UNSPECIFIED'
      AND identity_row.status = 'ACTIVE'
)
ORDER BY membership.actor_id;

UPDATE public.v2_case_memberships AS membership
SET identity_id = identity_row.identity_id
FROM public.v2_identities AS identity_row
WHERE membership.identity_id IS NULL
  AND identity_row.actor_reference_id = membership.actor_id
  AND identity_row.identity_type = 'LEGACY_UNSPECIFIED'
  AND identity_row.status = 'ACTIVE';

DO $migration_check$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.v2_case_memberships AS membership
        WHERE membership.identity_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration 008 failed closed: a legacy Membership could not be mapped to one Identity';
    END IF;
END;
$migration_check$;

ALTER TABLE public.v2_case_memberships
    ADD CONSTRAINT v2_memberships_identity_actor_fkey
    FOREIGN KEY (identity_id, actor_id)
    REFERENCES public.v2_identities(identity_id, actor_reference_id)
    ON DELETE RESTRICT;

CREATE INDEX idx_v2_memberships_identity_case
    ON public.v2_case_memberships(identity_id, case_id);

COMMENT ON COLUMN public.v2_case_memberships.identity_id IS
    'Additive Identity participation link; future commands require it while actor_id remains for Migration 007 compatibility';

ALTER TABLE public.v2_authorization_declarations
    ADD COLUMN declarant_identity_id UUID NULL;

ALTER TABLE public.v2_authorization_declarations
    ADD CONSTRAINT v2_authorization_identity_actor_fkey
    FOREIGN KEY (declarant_identity_id, declarant_actor_id)
    REFERENCES public.v2_identities(identity_id, actor_reference_id)
    ON DELETE RESTRICT;

CREATE INDEX idx_v2_authorization_declarant_identity
    ON public.v2_authorization_declarations(declarant_identity_id)
    WHERE declarant_identity_id IS NOT NULL;

COMMENT ON COLUMN public.v2_authorization_declarations.declarant_identity_id IS
    'Optional acting Identity; Actor-level declarant remains authoritative historical linkage and is not legal verification';

-- ---------------------------------------------------------------------------
-- Immutable Grant templates and exact-scope alignment
-- ---------------------------------------------------------------------------

CREATE TABLE public.v2_grant_templates (
    grant_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT NOT NULL,
    version INTEGER NOT NULL,
    role_type public.v2_role_type NOT NULL,
    purpose public.v2_purpose NOT NULL,
    status public.v2_grant_template_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    activated_at TIMESTAMPTZ NULL,
    retired_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_v2_grant_template_key_version
        UNIQUE (template_key, version),
    CONSTRAINT uq_v2_grant_template_role_pair
        UNIQUE (grant_template_id, role_type, purpose),
    CONSTRAINT chk_v2_grant_template_key
        CHECK (btrim(template_key) <> ''),
    CONSTRAINT chk_v2_grant_template_version
        CHECK (version > 0),
    CONSTRAINT chk_v2_grant_template_role_purpose
        CHECK (
            (role_type = 'CASE_ADMIN' AND purpose = 'CASE_ADMINISTRATION')
            OR (role_type IN ('FAMILY_MEMBER', 'CARE_RECIPIENT') AND purpose = 'FAMILY_CARE')
            OR (role_type = 'PROFESSIONAL_MEMBER' AND purpose = 'PROFESSIONAL_SERVICE')
        ),
    CONSTRAINT chk_v2_grant_template_lifecycle
        CHECK (
            (status = 'DRAFT' AND activated_at IS NULL AND retired_at IS NULL)
            OR (status = 'ACTIVE' AND activated_at IS NOT NULL AND retired_at IS NULL)
            OR (status = 'RETIRED' AND activated_at IS NOT NULL AND retired_at IS NOT NULL AND retired_at >= activated_at)
        )
);

CREATE TABLE public.v2_grant_template_capabilities (
    grant_template_id UUID NOT NULL,
    capability public.v2_capability NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (grant_template_id, capability),
    CONSTRAINT v2_grant_template_capability_template_fkey
        FOREIGN KEY (grant_template_id)
        REFERENCES public.v2_grant_templates(grant_template_id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.v2_grant_templates IS
    'Versioned immutable capability templates; a Grant still carries one exact purpose and one exact sharing scope';
COMMENT ON TABLE public.v2_grant_template_capabilities IS
    'Capabilities belonging to one template version; capabilities are never stored as a Grant array';

-- Internal invariant helpers. They perform no authorization and are not exposed
-- to clients. SECURITY INVOKER is sufficient because migration owners and future
-- controlled RPCs must already hold the underlying table privileges.
CREATE FUNCTION v2_private.reject_v2_verification_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'v2 identity verification events are append-only';
END;
$$;

CREATE TRIGGER trg_v2_verification_events_append_only
BEFORE UPDATE OR DELETE ON public.v2_identity_verification_events
FOR EACH ROW
EXECUTE FUNCTION v2_private.reject_v2_verification_event_mutation();

CREATE FUNCTION v2_private.enforce_v2_grant_template_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' AND OLD.status IN ('ACTIVE', 'RETIRED') THEN
        RAISE EXCEPTION 'activated v2 Grant templates cannot be deleted';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' THEN
        IF NEW.status = 'RETIRED'
           AND NEW.retired_at IS NOT NULL
           AND NEW.template_key = OLD.template_key
           AND NEW.version = OLD.version
           AND NEW.role_type = OLD.role_type
           AND NEW.purpose = OLD.purpose
           AND NEW.created_at = OLD.created_at
           AND NEW.activated_at = OLD.activated_at THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'active v2 Grant templates are immutable; create a new version';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'RETIRED' THEN
        RAISE EXCEPTION 'retired v2 Grant templates are immutable';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_v2_grant_template_immutable
BEFORE UPDATE OR DELETE ON public.v2_grant_templates
FOR EACH ROW
EXECUTE FUNCTION v2_private.enforce_v2_grant_template_immutability();

CREATE FUNCTION v2_private.enforce_v2_template_capability_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    template_id_value UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.grant_template_id ELSE NEW.grant_template_id END;
    template_status_value public.v2_grant_template_status;
BEGIN
    SELECT template_row.status
    INTO template_status_value
    FROM public.v2_grant_templates AS template_row
    WHERE template_row.grant_template_id = template_id_value;

    IF template_status_value IS NULL THEN
        RAISE EXCEPTION 'v2 Grant template does not exist';
    END IF;

    IF template_status_value <> 'DRAFT' THEN
        RAISE EXCEPTION 'capabilities of active or retired v2 Grant templates are immutable';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_v2_grant_template_capability_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.v2_grant_template_capabilities
FOR EACH ROW
EXECUTE FUNCTION v2_private.enforce_v2_template_capability_immutability();

-- Seed only exact legacy Migration 007 templates. These rows intentionally use
-- only capabilities that existed before this transaction; no new enum value is
-- consumed before COMMIT. The seed mirrors role_has_capability() exactly and
-- therefore cannot increase existing access.
INSERT INTO public.v2_grant_templates (
    template_key,
    version,
    role_type,
    purpose,
    status
)
VALUES
    ('legacy-case-admin', 1, 'CASE_ADMIN', 'CASE_ADMINISTRATION', 'DRAFT'),
    ('legacy-family-member', 1, 'FAMILY_MEMBER', 'FAMILY_CARE', 'DRAFT'),
    ('legacy-professional-member', 1, 'PROFESSIONAL_MEMBER', 'PROFESSIONAL_SERVICE', 'DRAFT'),
    ('legacy-care-recipient', 1, 'CARE_RECIPIENT', 'FAMILY_CARE', 'DRAFT');

INSERT INTO public.v2_grant_template_capabilities (grant_template_id, capability)
SELECT template_row.grant_template_id, capability_value.capability
FROM public.v2_grant_templates AS template_row
CROSS JOIN LATERAL (
    SELECT unnest(
        CASE
            WHEN template_row.role_type = 'CASE_ADMIN' THEN ARRAY[
                'VIEW_CASE_MINIMUM',
                'MANAGE_CASE_GOVERNANCE',
                'MANAGE_INVITATIONS',
                'MANAGE_MEMBERSHIPS',
                'MANAGE_GRANTS',
                'VIEW_OWN_ACCESS_TERMS'
            ]::public.v2_capability[]
            ELSE ARRAY[
                'VIEW_CASE_MINIMUM',
                'VIEW_OWN_ACCESS_TERMS',
                'VIEW_ALLOWED_SCOPE',
                'CREATE_CARE_UPDATE',
                'CREATE_QUESTION',
                'ASSIGN_ACTION',
                'ACCEPT_OWN_ACTION',
                'PROGRESS_OWN_ACTION',
                'COMPLETE_OWN_ACTION',
                'CONFIRM_ARRANGEMENT',
                'VIEW_NEW_CHANGES'
            ]::public.v2_capability[]
        END
    ) AS capability
) AS capability_value;

UPDATE public.v2_grant_templates
SET status = 'ACTIVE',
    activated_at = clock_timestamp()
WHERE template_key IN (
    'legacy-case-admin',
    'legacy-family-member',
    'legacy-professional-member',
    'legacy-care-recipient'
)
  AND version = 1;

ALTER TABLE public.v2_role_grants
    ADD COLUMN grant_template_id UUID NULL,
    ADD COLUMN issued_by_identity_id UUID NULL;

ALTER TABLE public.v2_role_grants
    ADD CONSTRAINT v2_grants_template_role_purpose_fkey
    FOREIGN KEY (grant_template_id, role_type, purpose)
    REFERENCES public.v2_grant_templates(grant_template_id, role_type, purpose)
    ON DELETE RESTRICT;

ALTER TABLE public.v2_role_grants
    ADD CONSTRAINT v2_grants_issuer_identity_actor_fkey
    FOREIGN KEY (issued_by_identity_id, granted_by_actor_id)
    REFERENCES public.v2_identities(identity_id, actor_reference_id)
    ON DELETE RESTRICT;

UPDATE public.v2_role_grants AS grant_row
SET grant_template_id = template_row.grant_template_id
FROM public.v2_grant_templates AS template_row
WHERE grant_row.grant_template_id IS NULL
  AND template_row.version = 1
  AND template_row.status = 'ACTIVE'
  AND template_row.role_type = grant_row.role_type
  AND template_row.purpose = grant_row.purpose
  AND template_row.template_key = CASE grant_row.role_type
      WHEN 'CASE_ADMIN' THEN 'legacy-case-admin'
      WHEN 'FAMILY_MEMBER' THEN 'legacy-family-member'
      WHEN 'PROFESSIONAL_MEMBER' THEN 'legacy-professional-member'
      WHEN 'CARE_RECIPIENT' THEN 'legacy-care-recipient'
  END;

DO $migration_check$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.v2_role_grants AS grant_row
        WHERE grant_row.grant_template_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration 008 failed closed: a legacy Grant has no exact role/purpose template mapping';
    END IF;
END;
$migration_check$;

CREATE INDEX idx_v2_grants_template
    ON public.v2_role_grants(grant_template_id);

CREATE INDEX idx_v2_grants_issued_by_identity
    ON public.v2_role_grants(issued_by_identity_id)
    WHERE issued_by_identity_id IS NOT NULL;

COMMENT ON COLUMN public.v2_role_grants.grant_template_id IS
    'Immutable capability-template version; future authorization must evaluate one Grant without cross-Grant capability stitching';
COMMENT ON COLUMN public.v2_role_grants.issued_by_identity_id IS
    'Optional acting Identity of the issuer; granted_by_actor_id remains the stable historical Actor';
COMMENT ON COLUMN public.v2_role_grants.scope_ceiling IS
    'Migration 008 exact-scope contract: values are non-hierarchical and must never be compared to expand visibility';

-- ---------------------------------------------------------------------------
-- Fail-closed table access and function ACL
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.v2_identities FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.v2_identity_verification_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.v2_grant_templates FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.v2_grant_template_capabilities FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION v2_private.reject_v2_verification_event_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.enforce_v2_grant_template_immutability() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.enforce_v2_template_capability_immutability() FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.v2_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_identity_verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_identity_verification_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_grant_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_grant_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_grant_template_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_grant_template_capabilities FORCE ROW LEVEL SECURITY;

-- No client policies are added in Migration 008. This is intentional fail-closed
-- staging. Existing Migration 007 policies and helpers continue to authorize via
-- Actor -> Membership -> Grant until separately reviewed Identity-aware helpers
-- and product commands are introduced. New registration/verification commands
-- must never expose LEGACY_UNSPECIFIED as a user-selectable identity.

COMMIT;
