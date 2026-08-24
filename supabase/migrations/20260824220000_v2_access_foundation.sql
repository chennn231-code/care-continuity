-- DRAFT ONLY
-- DO NOT APPLY
-- NOT A PRODUCTION MIGRATION
-- REMOTE SUPABASE NOT VERIFIED
--
-- Migration 007 candidate: v2 Access Foundation only
-- This file intentionally lives under docs/sql-drafts and must never be picked
-- up by Supabase migration commands. It has not been parsed or executed by
-- PostgreSQL. All security and concurrency behavior remains subject to a
-- dedicated static review and local PostgreSQL dry-run gate.
--
-- OWNER / DEFINER DRY-RUN REQUIREMENTS:
-- * inspect pg_proc.proowner and the owning role's rolsuper/rolbypassrls flags;
-- * inspect pg_proc.prosecdef for every function;
-- * inspect pg_proc.proconfig and require search_path="" on every definer;
-- * inspect proacl/information_schema.routine_privileges for exact EXECUTE ACL;
-- * treat every SECURITY DEFINER RPC as potentially bypassing RLS.

BEGIN;

-- ---------------------------------------------------------------------------
-- Preflight intent (not a claim that this draft has been run)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF to_regclass('public.v2_actor_references') IS NOT NULL
       OR to_regclass('public.v2_cases') IS NOT NULL
       OR to_regclass('public.v2_authorization_declarations') IS NOT NULL
       OR to_regclass('public.v2_invitations') IS NOT NULL
       OR to_regclass('public.v2_case_memberships') IS NOT NULL
       OR to_regclass('public.v2_role_grants') IS NOT NULL
       OR to_regclass('public.v2_access_events') IS NOT NULL THEN
        RAISE EXCEPTION
            'Migration 007 draft requires all seven v2 Access Foundation tables to be absent';
    END IF;

    IF to_regclass('public.care_receivers') IS NULL
       OR to_regclass('public.task_handoffs') IS NULL THEN
        RAISE EXCEPTION
            'Migration 007 draft requires the complete v1 Migration 001-006 baseline';
    END IF;

    -- SQL GATE 1 support: pgcrypto resolution must be verified in local dry-run.
    IF to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL
       OR to_regprocedure('extensions.digest(bytea,text)') IS NULL THEN
        RAISE EXCEPTION
            'Migration 007 requires pgcrypto functions in the extensions schema';
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Fixed vocabularies. No free-text role, capability, purpose, sharing scope,
-- lifecycle state, event type, or event target kind is accepted.
-- ---------------------------------------------------------------------------

CREATE TYPE public.v2_case_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'ARCHIVED'
);

CREATE TYPE public.v2_actor_kind AS ENUM (
    'ACCOUNT_HOLDER',
    'HISTORICAL_ACTOR'
);

CREATE TYPE public.v2_identity_assertion_status AS ENUM (
    'UNVERIFIED_PROTOTYPE'
);

CREATE TYPE public.v2_authorization_status AS ENUM (
    'DECLARED',
    'WITHDRAWN',
    'DISPUTED',
    'SUPERSEDED'
);

CREATE TYPE public.v2_invitation_status AS ENUM (
    'INVITED',
    'ACCEPTED',
    'DECLINED',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE public.v2_membership_status AS ENUM (
    'ACCEPTED',
    'ACTIVE',
    'SUSPENDED',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE public.v2_grant_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'REVOKED',
    'EXPIRED',
    'SUPERSEDED'
);

CREATE TYPE public.v2_role_type AS ENUM (
    'CASE_ADMIN',
    'FAMILY_MEMBER',
    'PROFESSIONAL_MEMBER',
    'CARE_RECIPIENT'
);

CREATE TYPE public.v2_purpose AS ENUM (
    'CASE_ADMINISTRATION',
    'FAMILY_CARE',
    'PROFESSIONAL_SERVICE'
);

CREATE TYPE public.v2_sharing_scope AS ENUM (
    'AUTHOR_ONLY',
    'SHARED_CARE',
    'FAMILY_ONLY',
    'DIRECT_PARTICIPANTS'
);

CREATE TYPE public.v2_capability AS ENUM (
    'VIEW_CASE_MINIMUM',
    'EDIT_DRAFT_MINIMUM',
    'ABANDON_DRAFT',
    'DECLARE_AUTHORIZATION',
    'MANAGE_CASE_GOVERNANCE',
    'MANAGE_INVITATIONS',
    'MANAGE_MEMBERSHIPS',
    'MANAGE_GRANTS',
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
);

CREATE TYPE public.v2_relationship_kind AS ENUM (
    'CASE_ADMIN',
    'FAMILY',
    'PROFESSIONAL',
    'CARE_RECIPIENT'
);

CREATE TYPE public.v2_invitation_binding_type AS ENUM (
    'VERIFIED_EMAIL'
);

CREATE TYPE public.v2_access_event_type AS ENUM (
    'CASE_ACTIVATED',
    'CASE_SUSPENDED',
    'CASE_ARCHIVED',
    'AUTHORIZATION_DECLARED',
    'AUTHORIZATION_WITHDRAWN',
    'AUTHORIZATION_DISPUTED',
    'INVITATION_ISSUED',
    'INVITATION_ACCEPTED',
    'INVITATION_DECLINED',
    'INVITATION_REVOKED',
    'INVITATION_EXPIRED',
    'MEMBERSHIP_CREATED',
    'MEMBERSHIP_SUSPENDED',
    'MEMBERSHIP_REVOKED',
    'MEMBERSHIP_EXPIRED',
    'MEMBERSHIP_PERIOD_CHANGED',
    'GRANT_CREATED',
    'GRANT_SUPERSEDED',
    'GRANT_REVOKED',
    'CASE_ADMIN_TRANSFERRED',
    'ACTOR_AUTH_DETACHED',
    'DRAFT_ABANDONED'
);

CREATE TYPE public.v2_access_event_target_kind AS ENUM (
    'CASE',
    'AUTHORIZATION_DECLARATION',
    'INVITATION',
    'MEMBERSHIP',
    'ROLE_GRANT',
    'ACTOR_REFERENCE'
);

-- ---------------------------------------------------------------------------
-- Seven Access Foundation tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.v2_actor_references (
    actor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NULL,
    actor_kind public.v2_actor_kind NOT NULL DEFAULT 'ACCOUNT_HOLDER',
    display_name_snapshot TEXT NOT NULL,
    identity_assertion_status public.v2_identity_assertion_status NOT NULL
        DEFAULT 'UNVERIFIED_PROTOTYPE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    detached_at TIMESTAMPTZ NULL,
    pseudonymized_at TIMESTAMPTZ NULL,
    CONSTRAINT v2_actor_auth_user_fkey
        FOREIGN KEY (auth_user_id)
        REFERENCES auth.users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_v2_actor_display_name_nonblank
        CHECK (btrim(display_name_snapshot) <> ''),
    CONSTRAINT chk_v2_actor_detached_consistency
        CHECK (auth_user_id IS NOT NULL OR detached_at IS NULL OR detached_at >= created_at),
    CONSTRAINT chk_v2_actor_pseudonymized_consistency
        CHECK (pseudonymized_at IS NULL OR pseudonymized_at >= created_at)
);

CREATE UNIQUE INDEX uq_v2_actor_active_auth_user
    ON public.v2_actor_references(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

COMMENT ON TABLE public.v2_actor_references IS
    'DRAFT: stable, unverified historical actors independent of login-account lifetime';
COMMENT ON COLUMN public.v2_actor_references.auth_user_id IS
    'Nullable current Auth link; auth deletion uses SET NULL and never cascades v2 history';
COMMENT ON COLUMN public.v2_actor_references.display_name_snapshot IS
    'Historical display label recorded by the prototype; not a verified identity';

CREATE TABLE public.v2_cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status public.v2_case_status NOT NULL DEFAULT 'DRAFT',
    subject_display_name TEXT NOT NULL,
    subject_identity_status public.v2_identity_assertion_status NOT NULL
        DEFAULT 'UNVERIFIED_PROTOTYPE',
    draft_creator_actor_id UUID NOT NULL,
    creation_operation_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    suspended_at TIMESTAMPTZ NULL,
    suspended_reason TEXT NULL,
    archived_at TIMESTAMPTZ NULL,
    archived_reason TEXT NULL,
    CONSTRAINT v2_cases_draft_creator_fkey
        FOREIGN KEY (draft_creator_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_v2_case_subject_display_name_nonblank
        CHECK (btrim(subject_display_name) <> ''),
    CONSTRAINT chk_v2_case_status_metadata
        CHECK (
            (status = 'SUSPENDED' AND suspended_at IS NOT NULL)
            OR (status <> 'SUSPENDED' AND suspended_at IS NULL AND suspended_reason IS NULL)
        ),
    CONSTRAINT chk_v2_case_archive_metadata
        CHECK (
            (status = 'ARCHIVED' AND archived_at IS NOT NULL)
            OR (status <> 'ARCHIVED' AND archived_at IS NULL AND archived_reason IS NULL)
        )
);

CREATE INDEX idx_v2_cases_draft_creator
    ON public.v2_cases(draft_creator_actor_id);
CREATE INDEX idx_v2_cases_status
    ON public.v2_cases(status);

COMMENT ON TABLE public.v2_cases IS
    'DRAFT: independent v2 case root with minimum unverified subject information';
COMMENT ON COLUMN public.v2_cases.draft_creator_actor_id IS
    'Only the DRAFT access root; it must not authorize an ACTIVE case';

CREATE TABLE public.v2_authorization_declarations (
    declaration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    declarant_actor_id UUID NOT NULL,
    claimed_capacity TEXT NOT NULL,
    declaration_text_version TEXT NOT NULL,
    limitation_notice_version TEXT NOT NULL,
    status public.v2_authorization_status NOT NULL DEFAULT 'DECLARED',
    declared_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    withdrawn_at TIMESTAMPTZ NULL,
    disputed_at TIMESTAMPTZ NULL,
    reason TEXT NULL,
    CONSTRAINT v2_authorization_case_fkey
        FOREIGN KEY (case_id)
        REFERENCES public.v2_cases(case_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_authorization_actor_fkey
        FOREIGN KEY (declarant_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_v2_authorization_claim_nonblank
        CHECK (btrim(claimed_capacity) <> ''),
    CONSTRAINT chk_v2_authorization_versions_nonblank
        CHECK (
            btrim(declaration_text_version) <> ''
            AND btrim(limitation_notice_version) <> ''
        ),
    CONSTRAINT chk_v2_authorization_status_metadata
        CHECK (
            (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL AND disputed_at IS NULL)
            OR (status = 'DISPUTED' AND disputed_at IS NOT NULL AND withdrawn_at IS NULL)
            OR (status IN ('DECLARED', 'SUPERSEDED') AND withdrawn_at IS NULL AND disputed_at IS NULL)
        )
);

CREATE UNIQUE INDEX uq_v2_authorization_current_declaration
    ON public.v2_authorization_declarations(case_id)
    WHERE status = 'DECLARED';
CREATE INDEX idx_v2_authorization_declarant
    ON public.v2_authorization_declarations(declarant_actor_id);

COMMENT ON TABLE public.v2_authorization_declarations IS
    'DRAFT: append-only prototype authorization declarations; not legal verification';

CREATE TABLE public.v2_invitations (
    invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    inviter_actor_id UUID NOT NULL,
    inviter_grant_id UUID NULL, -- FK added after grants exist.
    binding_type public.v2_invitation_binding_type NOT NULL DEFAULT 'VERIFIED_EMAIL',
    recipient_email_normalized TEXT NOT NULL,
    recipient_actor_id UUID NULL,
    role_type public.v2_role_type NOT NULL,
    purpose public.v2_purpose NOT NULL,
    scope_ceiling public.v2_sharing_scope NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    token_hash BYTEA NOT NULL,
    status public.v2_invitation_status NOT NULL DEFAULT 'INVITED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ NULL,
    declined_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    terminal_reason TEXT NULL,
    unverified_organization_name TEXT NULL,
    unverified_professional_title TEXT NULL,
    CONSTRAINT v2_invitations_case_fkey
        FOREIGN KEY (case_id)
        REFERENCES public.v2_cases(case_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_invitations_inviter_actor_fkey
        FOREIGN KEY (inviter_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_invitations_recipient_actor_fkey
        FOREIGN KEY (recipient_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_v2_invitation_token_hash UNIQUE (token_hash),
    CONSTRAINT chk_v2_invitation_email_normalized
        CHECK (
            recipient_email_normalized = lower(btrim(recipient_email_normalized))
            AND recipient_email_normalized <> ''
        ),
    CONSTRAINT chk_v2_invitation_period
        CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT chk_v2_invitation_professional_period
        CHECK (role_type <> 'PROFESSIONAL_MEMBER' OR ends_at IS NOT NULL),
    CONSTRAINT chk_v2_invitation_role_purpose
        CHECK (
            (role_type = 'CASE_ADMIN' AND purpose = 'CASE_ADMINISTRATION')
            OR (role_type IN ('FAMILY_MEMBER', 'CARE_RECIPIENT') AND purpose = 'FAMILY_CARE')
            OR (role_type = 'PROFESSIONAL_MEMBER' AND purpose = 'PROFESSIONAL_SERVICE')
        ),
    CONSTRAINT chk_v2_invitation_admin_scope
        CHECK (role_type <> 'CASE_ADMIN' OR scope_ceiling = 'AUTHOR_ONLY'),
    CONSTRAINT chk_v2_invitation_expiry
        CHECK (expires_at > created_at),
    CONSTRAINT chk_v2_invitation_terminal_metadata
        CHECK (
            (status = 'INVITED' AND accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL)
            OR (status = 'ACCEPTED' AND accepted_at IS NOT NULL AND declined_at IS NULL AND revoked_at IS NULL)
            OR (status = 'DECLINED' AND accepted_at IS NULL AND declined_at IS NOT NULL AND revoked_at IS NULL)
            OR (status = 'REVOKED' AND accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NOT NULL)
            OR (status = 'EXPIRED' AND accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL)
        )
);

CREATE INDEX idx_v2_invitations_case_status
    ON public.v2_invitations(case_id, status);
CREATE INDEX idx_v2_invitations_recipient_email
    ON public.v2_invitations(recipient_email_normalized, status);

COMMENT ON TABLE public.v2_invitations IS
    'DRAFT: verified-email-bound, single-use invitations; raw tokens are never stored';
COMMENT ON COLUMN public.v2_invitations.recipient_email_normalized IS
    'Sensitive normalized recipient email used only for controlled invitation delivery and acceptance';
COMMENT ON COLUMN public.v2_invitations.token_hash IS
    'SHA-256 digest of a high-entropy opaque token; the raw token is returned once by the issue RPC';

CREATE TABLE public.v2_case_memberships (
    membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    source_invitation_id UUID NULL,
    relationship_kind public.v2_relationship_kind NOT NULL,
    status public.v2_membership_status NOT NULL,
    generation INTEGER NOT NULL DEFAULT 1,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    accepted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    suspended_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    expired_at TIMESTAMPTZ NULL,
    terminal_reason TEXT NULL,
    unverified_organization_name TEXT NULL,
    unverified_professional_title TEXT NULL,
    unverified_service_description TEXT NULL,
    CONSTRAINT v2_memberships_case_fkey
        FOREIGN KEY (case_id)
        REFERENCES public.v2_cases(case_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_memberships_actor_fkey
        FOREIGN KEY (actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_memberships_invitation_fkey
        FOREIGN KEY (source_invitation_id)
        REFERENCES public.v2_invitations(invitation_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_v2_membership_generation
        UNIQUE (case_id, actor_id, generation),
    CONSTRAINT uq_v2_membership_source_invitation
        UNIQUE (source_invitation_id),
    CONSTRAINT chk_v2_membership_generation_positive
        CHECK (generation > 0),
    CONSTRAINT chk_v2_membership_period
        CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT chk_v2_membership_professional_period
        CHECK (relationship_kind <> 'PROFESSIONAL' OR ends_at IS NOT NULL),
    CONSTRAINT chk_v2_membership_status_metadata
        CHECK (
            (status = 'SUSPENDED' AND suspended_at IS NOT NULL AND revoked_at IS NULL)
            OR (status = 'REVOKED' AND revoked_at IS NOT NULL)
            OR (status = 'EXPIRED' AND expired_at IS NOT NULL AND revoked_at IS NULL)
            OR (status IN ('ACCEPTED', 'ACTIVE') AND suspended_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL)
        )
);

CREATE INDEX idx_v2_memberships_case_actor
    ON public.v2_case_memberships(case_id, actor_id);
CREATE INDEX idx_v2_memberships_effective_period
    ON public.v2_case_memberships(case_id, status, starts_at, ends_at);

COMMENT ON TABLE public.v2_case_memberships IS
    'DRAFT: accepted case relationships; effective access is always recomputed with database clock';
COMMENT ON COLUMN public.v2_case_memberships.unverified_organization_name IS
    'User-declared organization relationship; not verified by the prototype';

CREATE TABLE public.v2_role_grants (
    grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    role_type public.v2_role_type NOT NULL,
    purpose public.v2_purpose NOT NULL,
    scope_ceiling public.v2_sharing_scope NOT NULL,
    template_version TEXT NOT NULL,
    status public.v2_grant_status NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    granted_by_actor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    suspended_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    superseded_by_grant_id UUID NULL,
    terminal_reason TEXT NULL,
    CONSTRAINT v2_grants_membership_fkey
        FOREIGN KEY (membership_id)
        REFERENCES public.v2_case_memberships(membership_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_grants_granter_actor_fkey
        FOREIGN KEY (granted_by_actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_grants_superseded_by_fkey
        FOREIGN KEY (superseded_by_grant_id)
        REFERENCES public.v2_role_grants(grant_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_v2_grant_template_nonblank
        CHECK (btrim(template_version) <> ''),
    CONSTRAINT chk_v2_grant_period
        CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT chk_v2_grant_role_purpose
        CHECK (
            (role_type = 'CASE_ADMIN' AND purpose = 'CASE_ADMINISTRATION')
            OR (role_type IN ('FAMILY_MEMBER', 'CARE_RECIPIENT') AND purpose = 'FAMILY_CARE')
            OR (role_type = 'PROFESSIONAL_MEMBER' AND purpose = 'PROFESSIONAL_SERVICE')
        ),
    CONSTRAINT chk_v2_grant_admin_scope
        CHECK (role_type <> 'CASE_ADMIN' OR scope_ceiling = 'AUTHOR_ONLY'),
    CONSTRAINT chk_v2_grant_status_metadata
        CHECK (
            (status = 'SUSPENDED' AND suspended_at IS NOT NULL AND revoked_at IS NULL)
            OR (status = 'REVOKED' AND revoked_at IS NOT NULL)
            OR (status = 'SUPERSEDED' AND superseded_by_grant_id IS NOT NULL)
            OR (status IN ('ACTIVE', 'EXPIRED') AND suspended_at IS NULL AND revoked_at IS NULL)
        )
);

CREATE INDEX idx_v2_grants_membership_path
    ON public.v2_role_grants(membership_id, status, role_type, purpose, starts_at, ends_at);
CREATE UNIQUE INDEX uq_v2_active_grant_shape
    ON public.v2_role_grants(
        membership_id,
        role_type,
        purpose,
        scope_ceiling
    )
    WHERE status = 'ACTIVE';

COMMENT ON INDEX public.uq_v2_active_grant_shape IS
    'At most one unterminated ACTIVE grant for one Membership-role-purpose-scope path; reauthorization must terminate the prior grant first';

ALTER TABLE public.v2_invitations
    ADD CONSTRAINT v2_invitations_inviter_grant_fkey
    FOREIGN KEY (inviter_grant_id)
    REFERENCES public.v2_role_grants(grant_id)
    ON DELETE RESTRICT;

COMMENT ON TABLE public.v2_role_grants IS
    'DRAFT: one complete role-purpose-scope-validity path; capabilities cannot be combined across grants';
COMMENT ON COLUMN public.v2_role_grants.scope_ceiling IS
    'Non-linear sharing-scope ceiling; CASE_ADMIN does not imply access to all content';

CREATE TABLE public.v2_access_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    case_id UUID NULL,
    actor_id UUID NOT NULL,
    acting_grant_id UUID NULL,
    event_type public.v2_access_event_type NOT NULL,
    target_kind public.v2_access_event_target_kind NOT NULL,
    target_id UUID NOT NULL,
    event_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    previous_state TEXT NULL,
    new_state TEXT NULL,
    reason_code TEXT NULL,
    metadata TEXT NULL,
    operation_key UUID NOT NULL,
    CONSTRAINT v2_access_events_case_fkey
        FOREIGN KEY (case_id)
        REFERENCES public.v2_cases(case_id)
        ON DELETE SET NULL,
    CONSTRAINT v2_access_events_actor_fkey
        FOREIGN KEY (actor_id)
        REFERENCES public.v2_actor_references(actor_id)
        ON DELETE RESTRICT,
    CONSTRAINT v2_access_events_grant_fkey
        FOREIGN KEY (acting_grant_id)
        REFERENCES public.v2_role_grants(grant_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_v2_access_event_operation
        UNIQUE (operation_key, event_type, target_kind, target_id),
    CONSTRAINT chk_v2_access_event_reason_nonblank
        CHECK (reason_code IS NULL OR btrim(reason_code) <> ''),
    CONSTRAINT chk_v2_access_event_metadata_length
        CHECK (metadata IS NULL OR char_length(metadata) <= 1000),
    CONSTRAINT chk_v2_access_event_case_or_draft_tombstone
        CHECK (
            case_id IS NOT NULL
            OR (
                event_type = 'DRAFT_ABANDONED'
                AND target_kind = 'CASE'
            )
        )
);

CREATE INDEX idx_v2_access_events_case_sequence
    ON public.v2_access_events(case_id, event_sequence);
CREATE INDEX idx_v2_access_events_target
    ON public.v2_access_events(target_kind, target_id);

COMMENT ON TABLE public.v2_access_events IS
    'DRAFT: immutable Access Foundation governance events only; no care content, action, or read tracking';
COMMENT ON COLUMN public.v2_access_events.target_id IS
    'Controlled immutable target identifier. For DRAFT_ABANDONED it retains only the deleted Case UUID and never grants future content access';
COMMENT ON COLUMN public.v2_access_events.case_id IS
    'Normally an enforced Case FK; ON DELETE SET NULL is allowed only for the minimal DRAFT_ABANDONED tombstone';
COMMENT ON COLUMN public.v2_access_events.metadata IS
    'Minimal non-content metadata only; never copy complete sensitive care information';

-- ---------------------------------------------------------------------------
-- Internal schema and fixed role-template mapping
-- ---------------------------------------------------------------------------

CREATE SCHEMA v2_private;
REVOKE ALL ON SCHEMA v2_private FROM PUBLIC;
REVOKE ALL ON SCHEMA v2_private FROM anon;
REVOKE ALL ON SCHEMA v2_private FROM authenticated;

-- FUNCTION CLASSIFICATION AFTER STATIC SECURITY REVISION:
-- 1. Pure SECURITY INVOKER: normalize_email, role_has_capability.
-- 2. Policy SECURITY DEFINER with minimal result: current_actor_id,
--    has_case_grant_path.
-- 3. Internal SECURITY INVOKER, no client EXECUTE: case_has_effective_admin,
--    current_verified_email, assert_access_event_target, append_access_event.
-- 4. Authenticated transaction SECURITY DEFINER RPCs: the nine public RPCs.

CREATE FUNCTION v2_private.normalize_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT lower(btrim(p_email));
$$;

CREATE FUNCTION v2_private.role_has_capability(
    p_role public.v2_role_type,
    p_purpose public.v2_purpose,
    p_capability public.v2_capability
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_role = 'CASE_ADMIN'
             AND p_purpose = 'CASE_ADMINISTRATION'
        THEN p_capability IN (
            'VIEW_CASE_MINIMUM',
            'MANAGE_CASE_GOVERNANCE',
            'MANAGE_INVITATIONS',
            'MANAGE_MEMBERSHIPS',
            'MANAGE_GRANTS',
            'VIEW_OWN_ACCESS_TERMS'
        )
        WHEN p_role = 'FAMILY_MEMBER'
             AND p_purpose = 'FAMILY_CARE'
        THEN p_capability IN (
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
        )
        WHEN p_role = 'PROFESSIONAL_MEMBER'
             AND p_purpose = 'PROFESSIONAL_SERVICE'
        THEN p_capability IN (
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
        )
        WHEN p_role = 'CARE_RECIPIENT'
             AND p_purpose = 'FAMILY_CARE'
        THEN p_capability IN (
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
        )
        ELSE FALSE
    END;
$$;

-- SECURITY MODEL:
-- The Supabase migration owner is expected to create and own these functions.
-- This draft does not create an unverified custom role and does not assume that
-- FORCE RLS constrains a superuser/BYPASSRLS function owner. Definer functions
-- are therefore reviewed as privileged boundaries: they derive identity from
-- auth.uid(), validate all inputs, use an empty search_path and qualified names,
-- expose minimum results, and receive minimum EXECUTE ACL. Exact ownership,
-- role attributes, prosecdef, proconfig and proacl remain mandatory dry-run
-- evidence before remote release.

-- POLICY HELPER / SECURITY DEFINER RESPONSIBILITY:
-- Returns only the current request's stable actor identifier, derived from
-- auth.uid(); accepts no client identity and bypasses actor-table RLS solely to
-- avoid recursive policy evaluation.
CREATE FUNCTION v2_private.current_actor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT actor.actor_id
    FROM public.v2_actor_references AS actor
    WHERE actor.auth_user_id = (SELECT auth.uid())
    LIMIT 1;
$$;

-- INTERNAL SECURITY INVOKER HELPER: used only within policy/RPC definers and
-- returns one boolean; direct client EXECUTE is revoked.
CREATE FUNCTION v2_private.case_has_effective_admin(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.v2_case_memberships AS membership
        JOIN public.v2_actor_references AS actor
          ON actor.actor_id = membership.actor_id
        JOIN public.v2_role_grants AS grant_row
          ON grant_row.membership_id = membership.membership_id
        WHERE membership.case_id = p_case_id
          AND actor.auth_user_id IS NOT NULL
          AND membership.status IN ('ACCEPTED', 'ACTIVE')
          AND membership.starts_at <= clock_timestamp()
          AND (membership.ends_at IS NULL OR clock_timestamp() < membership.ends_at)
          AND membership.revoked_at IS NULL
          AND grant_row.status = 'ACTIVE'
          AND grant_row.role_type = 'CASE_ADMIN'
          AND grant_row.purpose = 'CASE_ADMINISTRATION'
          AND grant_row.starts_at <= clock_timestamp()
          AND (grant_row.ends_at IS NULL OR clock_timestamp() < grant_row.ends_at)
          AND grant_row.revoked_at IS NULL
    );
$$;

-- POLICY HELPER / SECURITY DEFINER RESPONSIBILITY:
-- Evaluates one complete current Actor -> Membership -> Role Grant path and
-- returns only boolean authorization. It never combines separate grants and
-- accepts neither actor identity nor role/capability assertions from clients.
CREATE FUNCTION v2_private.has_case_grant_path(
    p_case_id UUID,
    p_capability public.v2_capability,
    p_purpose public.v2_purpose DEFAULT NULL,
    p_scope public.v2_sharing_scope DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.v2_cases AS case_row
        JOIN public.v2_case_memberships AS membership
          ON membership.case_id = case_row.case_id
        JOIN public.v2_actor_references AS actor
          ON actor.actor_id = membership.actor_id
        JOIN public.v2_role_grants AS grant_row
          ON grant_row.membership_id = membership.membership_id
        WHERE case_row.case_id = p_case_id
          AND case_row.status = 'ACTIVE'
          AND v2_private.case_has_effective_admin(case_row.case_id)
          AND actor.actor_id = v2_private.current_actor_id()
          AND actor.auth_user_id = (SELECT auth.uid())
          AND membership.status IN ('ACCEPTED', 'ACTIVE')
          AND membership.starts_at <= clock_timestamp()
          AND (membership.ends_at IS NULL OR clock_timestamp() < membership.ends_at)
          AND membership.revoked_at IS NULL
          AND grant_row.status = 'ACTIVE'
          AND grant_row.starts_at <= clock_timestamp()
          AND (grant_row.ends_at IS NULL OR clock_timestamp() < grant_row.ends_at)
          AND grant_row.revoked_at IS NULL
          AND (p_purpose IS NULL OR grant_row.purpose = p_purpose)
          AND (p_scope IS NULL OR grant_row.scope_ceiling = p_scope)
          AND v2_private.role_has_capability(
              grant_row.role_type,
              grant_row.purpose,
              p_capability
          )
    );
$$;

-- SQL GATE 1: verified-email trust boundary.
-- INTERNAL SECURITY INVOKER HELPER: callable only from privileged RPC code;
-- direct client EXECUTE is revoked. It inherits the outer definer's effective
-- privilege and returns one normalized Email or NULL, never an Auth row.
-- This helper reads auth.users directly under the function owner and never uses
-- client-supplied email, email_verified, user_metadata, or a potentially stale
-- JWT email claim. Supabase local dry-run must confirm email_confirmed_at is the
-- supported verified-email boundary for the installed Auth schema.
CREATE FUNCTION v2_private.current_verified_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT v2_private.normalize_email(auth_user.email)
    FROM auth.users AS auth_user
    WHERE auth_user.id = (SELECT auth.uid())
      AND auth_user.email IS NOT NULL
      AND auth_user.email_confirmed_at IS NOT NULL
    LIMIT 1;
$$;

CREATE FUNCTION v2_private.assert_access_event_target(
    p_case_id UUID,
    p_event_type public.v2_access_event_type,
    p_target_kind public.v2_access_event_target_kind,
    p_target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    target_exists BOOLEAN := FALSE;
    compatible BOOLEAN := FALSE;
BEGIN
    compatible := CASE p_target_kind
        WHEN 'CASE' THEN p_event_type IN (
            'CASE_ACTIVATED', 'CASE_SUSPENDED',
            'CASE_ARCHIVED', 'DRAFT_ABANDONED'
        )
        WHEN 'AUTHORIZATION_DECLARATION' THEN p_event_type IN (
            'AUTHORIZATION_DECLARED', 'AUTHORIZATION_WITHDRAWN',
            'AUTHORIZATION_DISPUTED'
        )
        WHEN 'INVITATION' THEN p_event_type IN (
            'INVITATION_ISSUED', 'INVITATION_ACCEPTED',
            'INVITATION_DECLINED', 'INVITATION_REVOKED',
            'INVITATION_EXPIRED'
        )
        WHEN 'MEMBERSHIP' THEN p_event_type IN (
            'MEMBERSHIP_CREATED', 'MEMBERSHIP_SUSPENDED',
            'MEMBERSHIP_REVOKED', 'MEMBERSHIP_EXPIRED',
            'MEMBERSHIP_PERIOD_CHANGED', 'CASE_ADMIN_TRANSFERRED'
        )
        WHEN 'ROLE_GRANT' THEN p_event_type IN (
            'GRANT_CREATED', 'GRANT_SUPERSEDED', 'GRANT_REVOKED',
            'CASE_ADMIN_TRANSFERRED'
        )
        WHEN 'ACTOR_REFERENCE' THEN p_event_type = 'ACTOR_AUTH_DETACHED'
        ELSE FALSE
    END;

    IF NOT compatible THEN
        RAISE EXCEPTION 'Access event type is incompatible with target kind';
    END IF;

    target_exists := CASE p_target_kind
        WHEN 'CASE' THEN EXISTS (
            SELECT 1 FROM public.v2_cases AS row_value
            WHERE row_value.case_id = p_target_id
              AND row_value.case_id = p_case_id
        )
        WHEN 'AUTHORIZATION_DECLARATION' THEN EXISTS (
            SELECT 1 FROM public.v2_authorization_declarations AS row_value
            WHERE row_value.declaration_id = p_target_id
              AND row_value.case_id = p_case_id
        )
        WHEN 'INVITATION' THEN EXISTS (
            SELECT 1 FROM public.v2_invitations AS row_value
            WHERE row_value.invitation_id = p_target_id
              AND row_value.case_id = p_case_id
        )
        WHEN 'MEMBERSHIP' THEN EXISTS (
            SELECT 1 FROM public.v2_case_memberships AS row_value
            WHERE row_value.membership_id = p_target_id
              AND row_value.case_id = p_case_id
        )
        WHEN 'ROLE_GRANT' THEN EXISTS (
            SELECT 1
            FROM public.v2_role_grants AS row_value
            JOIN public.v2_case_memberships AS membership
              ON membership.membership_id = row_value.membership_id
            WHERE row_value.grant_id = p_target_id
              AND membership.case_id = p_case_id
        )
        WHEN 'ACTOR_REFERENCE' THEN EXISTS (
            SELECT 1 FROM public.v2_actor_references AS row_value
            WHERE row_value.actor_id = p_target_id
        )
        ELSE FALSE
    END;

    IF NOT target_exists THEN
        RAISE EXCEPTION 'Access event target is not available in the expected case';
    END IF;
END;
$$;

-- INTERNAL SECURITY INVOKER HELPER: called only from append_access_event under
-- the outer RPC's effective identity; direct client EXECUTE is revoked.
CREATE FUNCTION v2_private.append_access_event(
    p_case_id UUID,
    p_actor_id UUID,
    p_acting_grant_id UUID,
    p_event_type public.v2_access_event_type,
    p_target_kind public.v2_access_event_target_kind,
    p_target_id UUID,
    p_previous_state TEXT,
    p_new_state TEXT,
    p_reason_code TEXT,
    p_metadata TEXT,
    p_operation_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    new_event_id UUID;
BEGIN
    PERFORM v2_private.assert_access_event_target(
        p_case_id,
        p_event_type,
        p_target_kind,
        p_target_id
    );

    INSERT INTO public.v2_access_events (
        case_id,
        actor_id,
        acting_grant_id,
        event_type,
        target_kind,
        target_id,
        previous_state,
        new_state,
        reason_code,
        metadata,
        operation_key
    ) VALUES (
        p_case_id,
        p_actor_id,
        p_acting_grant_id,
        p_event_type,
        p_target_kind,
        p_target_id,
        p_previous_state,
        p_new_state,
        p_reason_code,
        p_metadata,
        p_operation_key
    )
    RETURNING event_id INTO new_event_id;

    RETURN new_event_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC boundaries. All mutations derive Actor from auth.uid(); none accept
-- a trusted actor, role, capability, verified-email flag, or database timestamp
-- from the client.
-- ---------------------------------------------------------------------------

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Creates only an isolated DRAFT for auth.uid(); it cannot create Membership,
-- Grant or sharing access and accepts no actor identifier from the client.
CREATE FUNCTION public.create_v2_draft_case(
    p_subject_display_name TEXT,
    p_actor_display_name TEXT,
    p_operation_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    actor_id_value UUID;
    case_id_value UUID;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required';
    END IF;

    IF btrim(p_subject_display_name) = '' OR btrim(p_actor_display_name) = '' THEN
        RAISE EXCEPTION 'Minimum case labels are required';
    END IF;

    INSERT INTO public.v2_actor_references (
        auth_user_id,
        display_name_snapshot
    ) VALUES (
        current_user_id,
        btrim(p_actor_display_name)
    )
    ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL
    DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
    RETURNING actor_id INTO actor_id_value;

    INSERT INTO public.v2_cases (
        subject_display_name,
        draft_creator_actor_id,
        creation_operation_key
    ) VALUES (
        btrim(p_subject_display_name),
        actor_id_value,
        p_operation_key
    )
    ON CONFLICT (creation_operation_key) DO NOTHING
    RETURNING case_id INTO case_id_value;

    IF case_id_value IS NULL THEN
        SELECT case_row.case_id INTO case_id_value
        FROM public.v2_cases AS case_row
        WHERE case_row.creation_operation_key = p_operation_key
          AND case_row.draft_creator_actor_id = actor_id_value
          AND case_row.status = 'DRAFT';

        IF case_id_value IS NULL THEN
            RAISE EXCEPTION 'Draft operation key is already in use';
        END IF;
    END IF;

    RETURN case_id_value;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Locks the creator-owned DRAFT and atomically creates the declaration, first
-- Membership, constrained CASE_ADMIN Grant and events before activation.
CREATE FUNCTION public.activate_v2_case(
    p_case_id UUID,
    p_claimed_capacity TEXT,
    p_declaration_text_version TEXT,
    p_limitation_notice_version TEXT,
    p_operation_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id_value UUID := v2_private.current_actor_id();
    declaration_id_value UUID;
    membership_id_value UUID;
    grant_id_value UUID;
    database_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- SQL GATE 4: lock the case row so activation/manager transitions serialize.
    PERFORM 1
    FROM public.v2_cases AS case_row
    WHERE case_row.case_id = p_case_id
      AND case_row.status = 'DRAFT'
      AND case_row.draft_creator_actor_id = actor_id_value
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Draft case is not available';
    END IF;

    INSERT INTO public.v2_authorization_declarations (
        case_id,
        declarant_actor_id,
        claimed_capacity,
        declaration_text_version,
        limitation_notice_version,
        declared_at
    ) VALUES (
        p_case_id,
        actor_id_value,
        p_claimed_capacity,
        p_declaration_text_version,
        p_limitation_notice_version,
        database_now
    )
    RETURNING declaration_id INTO declaration_id_value;

    INSERT INTO public.v2_case_memberships (
        case_id,
        actor_id,
        relationship_kind,
        status,
        starts_at,
        accepted_at
    ) VALUES (
        p_case_id,
        actor_id_value,
        'CASE_ADMIN',
        'ACTIVE',
        database_now,
        database_now
    )
    RETURNING membership_id INTO membership_id_value;

    INSERT INTO public.v2_role_grants (
        membership_id,
        role_type,
        purpose,
        scope_ceiling,
        template_version,
        starts_at,
        granted_by_actor_id
    ) VALUES (
        membership_id_value,
        'CASE_ADMIN',
        'CASE_ADMINISTRATION',
        'AUTHOR_ONLY',
        'ACCESS_FOUNDATION_V1',
        database_now,
        actor_id_value
    )
    RETURNING grant_id INTO grant_id_value;

    UPDATE public.v2_cases
    SET status = 'ACTIVE', updated_at = database_now
    WHERE case_id = p_case_id;

    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, grant_id_value,
        'AUTHORIZATION_DECLARED', 'AUTHORIZATION_DECLARATION', declaration_id_value,
        NULL, 'DECLARED', NULL, NULL, p_operation_key
    );
    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, grant_id_value,
        'MEMBERSHIP_CREATED', 'MEMBERSHIP', membership_id_value,
        NULL, 'ACTIVE', NULL, NULL, p_operation_key
    );
    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, grant_id_value,
        'GRANT_CREATED', 'ROLE_GRANT', grant_id_value,
        NULL, 'ACTIVE', NULL, NULL, p_operation_key
    );
    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, grant_id_value,
        'CASE_ACTIVATED', 'CASE', p_case_id,
        'DRAFT', 'ACTIVE', NULL, NULL, p_operation_key
    );

    RETURN membership_id_value;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Re-derives the acting administrator from auth.uid(); client role/purpose/scope
-- values describe the proposed recipient grant and must pass fixed vocabulary,
-- combination, period and CASE_ADMIN scope checks before insertion.
CREATE FUNCTION public.issue_v2_invitation(
    p_case_id UUID,
    p_recipient_email TEXT,
    p_role_type public.v2_role_type,
    p_purpose public.v2_purpose,
    p_scope public.v2_sharing_scope,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_expires_at TIMESTAMPTZ,
    p_unverified_organization_name TEXT,
    p_unverified_professional_title TEXT,
    p_operation_key UUID
)
RETURNS TABLE (invitation_id UUID, raw_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id_value UUID := v2_private.current_actor_id();
    grant_id_value UUID;
    invitation_id_value UUID;
    raw_token_value TEXT;
    token_hash_value BYTEA;
    normalized_email_value TEXT := v2_private.normalize_email(p_recipient_email);
BEGIN
    SELECT grant_row.grant_id
    INTO grant_id_value
    FROM public.v2_case_memberships AS membership
    JOIN public.v2_role_grants AS grant_row
      ON grant_row.membership_id = membership.membership_id
    WHERE membership.case_id = p_case_id
      AND membership.actor_id = actor_id_value
      AND membership.status IN ('ACCEPTED', 'ACTIVE')
      AND membership.starts_at <= clock_timestamp()
      AND (membership.ends_at IS NULL OR clock_timestamp() < membership.ends_at)
      AND grant_row.status = 'ACTIVE'
      AND grant_row.role_type = 'CASE_ADMIN'
      AND grant_row.purpose = 'CASE_ADMINISTRATION'
      AND grant_row.starts_at <= clock_timestamp()
      AND (grant_row.ends_at IS NULL OR clock_timestamp() < grant_row.ends_at)
      AND v2_private.role_has_capability(
          grant_row.role_type,
          grant_row.purpose,
          'MANAGE_INVITATIONS'
      )
    ORDER BY grant_row.created_at
    LIMIT 1;

    IF grant_id_value IS NULL OR NOT v2_private.case_has_effective_admin(p_case_id) THEN
        RAISE EXCEPTION 'Case invitation is not available';
    END IF;

    IF p_starts_at < clock_timestamp()
       OR p_expires_at <= clock_timestamp()
       OR (p_ends_at IS NOT NULL AND p_ends_at <= p_starts_at)
       OR (p_role_type = 'PROFESSIONAL_MEMBER' AND p_ends_at IS NULL)
       OR NOT (
           (p_role_type = 'CASE_ADMIN' AND p_purpose = 'CASE_ADMINISTRATION')
           OR (p_role_type IN ('FAMILY_MEMBER', 'CARE_RECIPIENT') AND p_purpose = 'FAMILY_CARE')
           OR (p_role_type = 'PROFESSIONAL_MEMBER' AND p_purpose = 'PROFESSIONAL_SERVICE')
       )
       OR (p_role_type = 'CASE_ADMIN' AND p_scope <> 'AUTHOR_ONLY') THEN
        RAISE EXCEPTION 'Invitation period is invalid';
    END IF;

    raw_token_value := encode(extensions.gen_random_bytes(32), 'hex');
    token_hash_value := extensions.digest(convert_to(raw_token_value, 'UTF8'), 'sha256');

    INSERT INTO public.v2_invitations (
        case_id,
        inviter_actor_id,
        inviter_grant_id,
        recipient_email_normalized,
        role_type,
        purpose,
        scope_ceiling,
        starts_at,
        ends_at,
        token_hash,
        expires_at,
        unverified_organization_name,
        unverified_professional_title
    ) VALUES (
        p_case_id,
        actor_id_value,
        grant_id_value,
        normalized_email_value,
        p_role_type,
        p_purpose,
        p_scope,
        p_starts_at,
        p_ends_at,
        token_hash_value,
        p_expires_at,
        NULLIF(btrim(p_unverified_organization_name), ''),
        NULLIF(btrim(p_unverified_professional_title), '')
    )
    RETURNING v2_invitations.invitation_id INTO invitation_id_value;

    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, grant_id_value,
        'INVITATION_ISSUED', 'INVITATION', invitation_id_value,
        NULL, 'INVITED', NULL, NULL, p_operation_key
    );

    RETURN QUERY SELECT invitation_id_value, raw_token_value;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Uses auth.uid() plus database-side confirmed Email, locks the one-time token,
-- and atomically creates Membership/Grant/events without accepting client actor.
CREATE FUNCTION public.accept_v2_invitation(
    p_raw_token TEXT,
    p_operation_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    actor_id_value UUID;
    verified_email_value TEXT;
    token_hash_value BYTEA;
    invitation_row public.v2_invitations%ROWTYPE;
    membership_id_value UUID;
    grant_id_value UUID;
    next_generation INTEGER;
    database_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required';
    END IF;

    verified_email_value := v2_private.current_verified_email();

    IF verified_email_value IS NULL THEN
        RAISE EXCEPTION 'A confirmed signed-in email is required';
    END IF;

    token_hash_value := extensions.digest(convert_to(p_raw_token, 'UTF8'), 'sha256');

    SELECT *
    INTO invitation_row
    FROM public.v2_invitations AS invitation
    WHERE invitation.token_hash = token_hash_value
    FOR UPDATE;

    IF NOT FOUND
       OR invitation_row.status <> 'INVITED'
       OR invitation_row.expires_at <= database_now
       OR invitation_row.recipient_email_normalized <> verified_email_value THEN
        RAISE EXCEPTION 'Invitation is not available';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.v2_cases AS case_row
        WHERE case_row.case_id = invitation_row.case_id
          AND case_row.status = 'ACTIVE'
    ) OR NOT v2_private.case_has_effective_admin(invitation_row.case_id) THEN
        RAISE EXCEPTION 'Invitation is not available';
    END IF;

    -- Invitation acceptance is a legitimate first Actor-reference entry point.
    -- It runs only after the trusted Auth Email, token, terminal state, expiry,
    -- recipient binding and active Case governance have all been validated.
    -- The generic label is not identity evidence and does not use user_metadata.
    -- A detached historical Actor is never relinked by Email; only an existing
    -- row with this exact current auth.users id may be reused.
    INSERT INTO public.v2_actor_references (
        auth_user_id,
        display_name_snapshot
    ) VALUES (
        current_user_id,
        'Invited member'
    )
    ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL
    DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
    RETURNING actor_id INTO actor_id_value;

    SELECT COALESCE(MAX(membership.generation), 0) + 1
    INTO next_generation
    FROM public.v2_case_memberships AS membership
    WHERE membership.case_id = invitation_row.case_id
      AND membership.actor_id = actor_id_value;

    INSERT INTO public.v2_case_memberships (
        case_id,
        actor_id,
        source_invitation_id,
        relationship_kind,
        status,
        generation,
        starts_at,
        ends_at,
        accepted_at,
        unverified_organization_name,
        unverified_professional_title
    ) VALUES (
        invitation_row.case_id,
        actor_id_value,
        invitation_row.invitation_id,
        CASE invitation_row.role_type
            WHEN 'CASE_ADMIN' THEN 'CASE_ADMIN'::public.v2_relationship_kind
            WHEN 'FAMILY_MEMBER' THEN 'FAMILY'::public.v2_relationship_kind
            WHEN 'PROFESSIONAL_MEMBER' THEN 'PROFESSIONAL'::public.v2_relationship_kind
            WHEN 'CARE_RECIPIENT' THEN 'CARE_RECIPIENT'::public.v2_relationship_kind
        END,
        CASE
            WHEN invitation_row.starts_at <= database_now
                THEN 'ACTIVE'::public.v2_membership_status
            ELSE 'ACCEPTED'::public.v2_membership_status
        END,
        next_generation,
        invitation_row.starts_at,
        invitation_row.ends_at,
        database_now,
        invitation_row.unverified_organization_name,
        invitation_row.unverified_professional_title
    )
    RETURNING membership_id INTO membership_id_value;

    INSERT INTO public.v2_role_grants (
        membership_id,
        role_type,
        purpose,
        scope_ceiling,
        template_version,
        starts_at,
        ends_at,
        granted_by_actor_id
    ) VALUES (
        membership_id_value,
        invitation_row.role_type,
        invitation_row.purpose,
        invitation_row.scope_ceiling,
        'ACCESS_FOUNDATION_V1',
        invitation_row.starts_at,
        invitation_row.ends_at,
        invitation_row.inviter_actor_id
    )
    RETURNING grant_id INTO grant_id_value;

    UPDATE public.v2_invitations
    SET status = 'ACCEPTED',
        accepted_at = database_now,
        recipient_actor_id = actor_id_value
    WHERE invitation_id = invitation_row.invitation_id;

    PERFORM v2_private.append_access_event(
        invitation_row.case_id, actor_id_value, grant_id_value,
        'INVITATION_ACCEPTED', 'INVITATION', invitation_row.invitation_id,
        'INVITED', 'ACCEPTED', NULL, NULL, p_operation_key
    );
    PERFORM v2_private.append_access_event(
        invitation_row.case_id, actor_id_value, grant_id_value,
        'MEMBERSHIP_CREATED', 'MEMBERSHIP', membership_id_value,
        NULL, 'ACTIVE_OR_ACCEPTED', NULL, NULL, p_operation_key
    );
    PERFORM v2_private.append_access_event(
        invitation_row.case_id, actor_id_value, grant_id_value,
        'GRANT_CREATED', 'ROLE_GRANT', grant_id_value,
        NULL, 'ACTIVE', NULL, NULL, p_operation_key
    );

    RETURN membership_id_value;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Locks the invitation and requires a current complete invitation-management
-- grant path derived from auth.uid() before terminal mutation and event append.
CREATE FUNCTION public.revoke_v2_invitation(
    p_invitation_id UUID,
    p_reason TEXT,
    p_operation_key UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    invitation_row public.v2_invitations%ROWTYPE;
    actor_id_value UUID := v2_private.current_actor_id();
    database_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT * INTO invitation_row
    FROM public.v2_invitations AS invitation
    WHERE invitation.invitation_id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND
       OR invitation_row.status <> 'INVITED'
       OR NOT v2_private.has_case_grant_path(
           invitation_row.case_id,
           'MANAGE_INVITATIONS',
           'CASE_ADMINISTRATION',
           NULL
       ) THEN
        RAISE EXCEPTION 'Invitation is not available';
    END IF;

    UPDATE public.v2_invitations
    SET status = 'REVOKED', revoked_at = database_now, terminal_reason = p_reason
    WHERE invitation_id = p_invitation_id;

    PERFORM v2_private.append_access_event(
        invitation_row.case_id, actor_id_value, invitation_row.inviter_grant_id,
        'INVITATION_REVOKED', 'INVITATION', p_invitation_id,
        'INVITED', 'REVOKED', NULL, NULL, p_operation_key
    );
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Locks the Case, re-reads current Membership state and serializes last-manager
-- protection before revoking Membership/Grant state atomically.
CREATE FUNCTION public.revoke_v2_membership(
    p_membership_id UUID,
    p_reason TEXT,
    p_operation_key UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    membership_row public.v2_case_memberships%ROWTYPE;
    locked_case_id_value UUID;
    actor_id_value UUID := v2_private.current_actor_id();
    acting_grant_id_value UUID;
    database_now TIMESTAMPTZ;
BEGIN
    -- Discover only the Case identifier before locking. Authorization and all
    -- mutable Membership facts are re-read after the shared Case lock.
    SELECT membership.case_id INTO locked_case_id_value
    FROM public.v2_case_memberships AS membership
    WHERE membership.membership_id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership is not available';
    END IF;

    PERFORM 1
    FROM public.v2_cases AS case_row
    WHERE case_row.case_id = locked_case_id_value
      AND case_row.status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership is not available';
    END IF;

    database_now := clock_timestamp();

    -- The preliminary lookup discovers the Case to lock. Re-read the target
    -- membership after acquiring that shared serialization lock so all
    -- last-manager checks use current data, not a pre-lock snapshot.
    SELECT * INTO membership_row
    FROM public.v2_case_memberships AS membership
    WHERE membership.membership_id = p_membership_id
      AND membership.case_id = locked_case_id_value;

    IF NOT FOUND OR membership_row.status NOT IN ('ACCEPTED', 'ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Membership is not available';
    END IF;

    IF actor_id_value IS NULL OR NOT v2_private.has_case_grant_path(
        locked_case_id_value,
        'MANAGE_MEMBERSHIPS',
        'CASE_ADMINISTRATION',
        NULL
    ) THEN
        RAISE EXCEPTION 'Membership is not available';
    END IF;

    SELECT grant_row.grant_id INTO acting_grant_id_value
    FROM public.v2_case_memberships AS manager_membership
    JOIN public.v2_role_grants AS grant_row
      ON grant_row.membership_id = manager_membership.membership_id
    WHERE manager_membership.case_id = membership_row.case_id
      AND manager_membership.actor_id = actor_id_value
      AND manager_membership.status IN ('ACCEPTED', 'ACTIVE')
      AND manager_membership.starts_at <= database_now
      AND (manager_membership.ends_at IS NULL OR database_now < manager_membership.ends_at)
      AND manager_membership.revoked_at IS NULL
      AND grant_row.role_type = 'CASE_ADMIN'
      AND grant_row.purpose = 'CASE_ADMINISTRATION'
      AND grant_row.status = 'ACTIVE'
      AND grant_row.starts_at <= database_now
      AND (grant_row.ends_at IS NULL OR database_now < grant_row.ends_at)
    LIMIT 1;

    IF acting_grant_id_value IS NULL THEN
        RAISE EXCEPTION 'Membership is not available';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.v2_role_grants AS target_grant
        WHERE target_grant.membership_id = p_membership_id
          AND target_grant.role_type = 'CASE_ADMIN'
          AND target_grant.status = 'ACTIVE'
          AND target_grant.starts_at <= database_now
          AND (target_grant.ends_at IS NULL OR database_now < target_grant.ends_at)
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.v2_case_memberships AS other_membership
        JOIN public.v2_actor_references AS other_actor
          ON other_actor.actor_id = other_membership.actor_id
        JOIN public.v2_role_grants AS other_grant
          ON other_grant.membership_id = other_membership.membership_id
        WHERE other_membership.case_id = membership_row.case_id
          AND other_membership.membership_id <> p_membership_id
          AND other_actor.auth_user_id IS NOT NULL
          AND other_membership.status IN ('ACCEPTED', 'ACTIVE')
          AND other_membership.starts_at <= database_now
          AND (other_membership.ends_at IS NULL OR database_now < other_membership.ends_at)
          AND other_grant.role_type = 'CASE_ADMIN'
          AND other_grant.purpose = 'CASE_ADMINISTRATION'
          AND other_grant.status = 'ACTIVE'
          AND other_grant.starts_at <= database_now
          AND (other_grant.ends_at IS NULL OR database_now < other_grant.ends_at)
    ) THEN
        RAISE EXCEPTION 'The final case administrator cannot be revoked';
    END IF;

    UPDATE public.v2_case_memberships
    SET status = 'REVOKED', revoked_at = database_now, terminal_reason = p_reason
    WHERE membership_id = p_membership_id;

    UPDATE public.v2_role_grants
    SET status = 'REVOKED', revoked_at = database_now, terminal_reason = p_reason
    WHERE membership_id = p_membership_id
      AND status IN ('ACTIVE', 'SUSPENDED');

    PERFORM v2_private.append_access_event(
        membership_row.case_id, actor_id_value, acting_grant_id_value,
        'MEMBERSHIP_REVOKED', 'MEMBERSHIP', p_membership_id,
        membership_row.status::TEXT, 'REVOKED', NULL, NULL, p_operation_key
    );
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Locks the Case, verifies the caller's complete grant path and the recipient's
-- explicitly accepted CASE_ADMIN relationship before atomic grant transfer.
CREATE FUNCTION public.transfer_v2_case_admin(
    p_case_id UUID,
    p_old_admin_membership_id UUID,
    p_new_admin_membership_id UUID,
    p_operation_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id_value UUID := v2_private.current_actor_id();
    acting_grant_id_value UUID;
    target_grant_id_value UUID;
    database_now TIMESTAMPTZ;
BEGIN
    -- SQL GATE 4: all manager mutations lock the same Case row. Concurrent
    -- attempts to remove each other serialize and re-check current facts.
    PERFORM 1 FROM public.v2_cases AS case_row
    WHERE case_row.case_id = p_case_id
      AND case_row.status = 'ACTIVE'
    FOR UPDATE;

    IF NOT FOUND OR NOT v2_private.has_case_grant_path(
        p_case_id,
        'MANAGE_GRANTS',
        'CASE_ADMINISTRATION',
        NULL
    ) THEN
        RAISE EXCEPTION 'Case administration is not available';
    END IF;

    IF p_old_admin_membership_id = p_new_admin_membership_id THEN
        RAISE EXCEPTION 'New case administrator must be different';
    END IF;

    database_now := clock_timestamp();

    SELECT grant_row.grant_id INTO acting_grant_id_value
    FROM public.v2_case_memberships AS membership
    JOIN public.v2_role_grants AS grant_row
      ON grant_row.membership_id = membership.membership_id
    WHERE membership.case_id = p_case_id
      AND membership.actor_id = actor_id_value
      AND membership.status IN ('ACCEPTED', 'ACTIVE')
      AND membership.starts_at <= database_now
      AND (membership.ends_at IS NULL OR database_now < membership.ends_at)
      AND membership.revoked_at IS NULL
      AND grant_row.role_type = 'CASE_ADMIN'
      AND grant_row.purpose = 'CASE_ADMINISTRATION'
      AND grant_row.status = 'ACTIVE'
      AND grant_row.starts_at <= database_now
      AND (grant_row.ends_at IS NULL OR database_now < grant_row.ends_at)
    LIMIT 1;

    SELECT grant_row.grant_id INTO target_grant_id_value
    FROM public.v2_case_memberships AS membership
    JOIN public.v2_actor_references AS actor
      ON actor.actor_id = membership.actor_id
    JOIN public.v2_role_grants AS grant_row
      ON grant_row.membership_id = membership.membership_id
    WHERE membership.membership_id = p_new_admin_membership_id
      AND membership.case_id = p_case_id
      AND membership.relationship_kind = 'CASE_ADMIN'
      AND membership.status IN ('ACCEPTED', 'ACTIVE')
      AND membership.accepted_at IS NOT NULL
      AND membership.starts_at <= database_now
      AND (membership.ends_at IS NULL OR database_now < membership.ends_at)
      AND membership.revoked_at IS NULL
      AND actor.auth_user_id IS NOT NULL
      AND grant_row.role_type = 'CASE_ADMIN'
      AND grant_row.purpose = 'CASE_ADMINISTRATION'
      AND grant_row.scope_ceiling = 'AUTHOR_ONLY'
      AND grant_row.status = 'ACTIVE'
      AND grant_row.starts_at <= database_now
      AND (grant_row.ends_at IS NULL OR database_now < grant_row.ends_at)
      AND grant_row.revoked_at IS NULL
    LIMIT 1;

    IF acting_grant_id_value IS NULL OR target_grant_id_value IS NULL THEN
        RAISE EXCEPTION 'New case administrator is not eligible';
    END IF;

    -- The accepted target administrator already owns one complete effective
    -- grant path. Reuse it; do not create a duplicate active grant.
    UPDATE public.v2_role_grants AS old_grant
    SET status = 'SUPERSEDED',
        superseded_by_grant_id = target_grant_id_value,
        terminal_reason = 'CASE_ADMIN_TRANSFERRED'
    WHERE old_grant.membership_id = p_old_admin_membership_id
      AND old_grant.role_type = 'CASE_ADMIN'
      AND old_grant.purpose = 'CASE_ADMINISTRATION'
      AND old_grant.status = 'ACTIVE'
      AND EXISTS (
          SELECT 1
          FROM public.v2_case_memberships AS old_membership
          WHERE old_membership.membership_id = old_grant.membership_id
            AND old_membership.case_id = p_case_id
      );

    IF NOT FOUND OR NOT v2_private.case_has_effective_admin(p_case_id) THEN
        RAISE EXCEPTION 'Case administrator transfer would leave the case unmanaged';
    END IF;

    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, acting_grant_id_value,
        'CASE_ADMIN_TRANSFERRED', 'ROLE_GRANT', target_grant_id_value,
        p_old_admin_membership_id::TEXT, p_new_admin_membership_id::TEXT,
        NULL, NULL, p_operation_key
    );

    RETURN target_grant_id_value;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Permits only the auth.uid()-derived creator to hard-delete an unpublished
-- DRAFT, writes the minimum tombstone first, and copies no draft content.
CREATE FUNCTION public.abandon_v2_draft_case(
    p_case_id UUID,
    p_operation_key UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id_value UUID := v2_private.current_actor_id();
BEGIN
    PERFORM 1 FROM public.v2_cases AS case_row
    WHERE case_row.case_id = p_case_id
      AND case_row.status = 'DRAFT'
      AND case_row.draft_creator_actor_id = actor_id_value
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Draft case is not available';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.v2_authorization_declarations AS declaration
        WHERE declaration.case_id = p_case_id
    ) OR EXISTS (
        SELECT 1 FROM public.v2_invitations AS invitation
        WHERE invitation.case_id = p_case_id
    ) OR EXISTS (
        SELECT 1 FROM public.v2_case_memberships AS membership
        WHERE membership.case_id = p_case_id
    ) THEN
        RAISE EXCEPTION 'Draft case cannot be abandoned after access records exist';
    END IF;

    -- DRAFT_ABANDONED is the only first-phase tombstone exception. The target is
    -- validated while the DRAFT still exists, then ON DELETE SET NULL detaches
    -- the Case FK while target_id retains only the original opaque Case UUID.
    -- No subject label, health content or draft payload is copied into the event.
    PERFORM v2_private.append_access_event(
        p_case_id, actor_id_value, NULL,
        'DRAFT_ABANDONED', 'CASE', p_case_id,
        'DRAFT', 'DELETED', NULL, NULL, p_operation_key
    );

    DELETE FROM public.v2_cases WHERE case_id = p_case_id;
END;
$$;

-- CLIENT RPC / SECURITY DEFINER RESPONSIBILITY:
-- Performs only fail-closed governance preflight for the auth.uid()-derived
-- actor; it neither deletes Auth rows nor accepts a substitute actor identity.
CREATE FUNCTION public.prepare_v2_account_deletion(p_operation_key UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id_value UUID := v2_private.current_actor_id();
BEGIN
    IF actor_id_value IS NULL THEN
        RAISE EXCEPTION 'Account actor is not available';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.v2_cases AS case_row
        WHERE case_row.status = 'DRAFT'
          AND case_row.draft_creator_actor_id = actor_id_value
    ) THEN
        RAISE EXCEPTION 'Unresolved draft cases must be handled before account deletion';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.v2_case_memberships AS membership
        JOIN public.v2_role_grants AS grant_row
          ON grant_row.membership_id = membership.membership_id
        WHERE membership.actor_id = actor_id_value
          AND grant_row.role_type = 'CASE_ADMIN'
          AND grant_row.status = 'ACTIVE'
          AND grant_row.starts_at <= clock_timestamp()
          AND (grant_row.ends_at IS NULL OR clock_timestamp() < grant_row.ends_at)
          AND NOT EXISTS (
              SELECT 1
              FROM public.v2_case_memberships AS other_membership
              JOIN public.v2_actor_references AS other_actor
                ON other_actor.actor_id = other_membership.actor_id
              JOIN public.v2_role_grants AS other_grant
                ON other_grant.membership_id = other_membership.membership_id
              WHERE other_membership.case_id = membership.case_id
                AND other_membership.membership_id <> membership.membership_id
                AND other_actor.auth_user_id IS NOT NULL
                AND other_membership.status IN ('ACCEPTED', 'ACTIVE')
                AND other_membership.starts_at <= clock_timestamp()
                AND (other_membership.ends_at IS NULL OR clock_timestamp() < other_membership.ends_at)
                AND other_grant.role_type = 'CASE_ADMIN'
                AND other_grant.status = 'ACTIVE'
                AND other_grant.starts_at <= clock_timestamp()
                AND (other_grant.ends_at IS NULL OR clock_timestamp() < other_grant.ends_at)
          )
    ) THEN
        RAISE EXCEPTION 'Case administration must be transferred before account deletion';
    END IF;

    -- This RPC does not delete auth.users and cannot guarantee that a Supabase
    -- administrator will use the normal App flow. The Auth deletion itself will
    -- SET NULL auth_user_id. Every v2 grant helper requires a current Auth link,
    -- so direct administrator deletion preserves data and fails closed.
    RETURN actor_id_value;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA v2_private FROM PUBLIC;

REVOKE ALL ON TABLE public.v2_actor_references FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_authorization_declarations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_case_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_role_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.v2_access_events FROM PUBLIC, anon, authenticated;

-- Only narrowly-scoped reads are granted. Invitation Email/token hash and
-- Access Events are never directly readable through the client API.
GRANT SELECT (actor_id, display_name_snapshot, identity_assertion_status, created_at)
    ON public.v2_actor_references TO authenticated;
GRANT SELECT (
    case_id,
    status,
    subject_display_name,
    subject_identity_status,
    draft_creator_actor_id,
    created_at,
    updated_at,
    suspended_at,
    suspended_reason,
    archived_at,
    archived_reason
) ON public.v2_cases TO authenticated;
GRANT SELECT
    ON public.v2_authorization_declarations TO authenticated;
GRANT SELECT
    ON public.v2_case_memberships TO authenticated;
GRANT SELECT
    ON public.v2_role_grants TO authenticated;

ALTER TABLE public.v2_actor_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_actor_references FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_authorization_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_authorization_declarations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_case_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_case_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_role_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.v2_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_access_events FORCE ROW LEVEL SECURITY;

-- FORCE RLS and these policies protect ordinary direct table access. They are
-- not asserted to constrain SECURITY DEFINER functions owned by a superuser or
-- BYPASSRLS role. The RPC validation and ACL boundaries above remain mandatory
-- even when a dry-run proves the owner bypasses RLS.

-- Five SELECT policies only. All writes use controlled RPCs. No v1 policy is
-- modified or widened by this draft.
CREATE POLICY v2_actor_references_select_self
ON public.v2_actor_references
FOR SELECT
TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY v2_cases_select_allowed
ON public.v2_cases
FOR SELECT
TO authenticated
USING (
    (
        status = 'DRAFT'
        AND draft_creator_actor_id = v2_private.current_actor_id()
    )
    OR v2_private.has_case_grant_path(
        case_id,
        'VIEW_CASE_MINIMUM',
        NULL,
        NULL
    )
);

CREATE POLICY v2_authorization_declarations_select_governance
ON public.v2_authorization_declarations
FOR SELECT
TO authenticated
USING (
    declarant_actor_id = v2_private.current_actor_id()
    OR v2_private.has_case_grant_path(
        case_id,
        'MANAGE_CASE_GOVERNANCE',
        'CASE_ADMINISTRATION',
        NULL
    )
);

CREATE POLICY v2_case_memberships_select_own_or_managed
ON public.v2_case_memberships
FOR SELECT
TO authenticated
USING (
    actor_id = v2_private.current_actor_id()
    OR v2_private.has_case_grant_path(
        case_id,
        'MANAGE_MEMBERSHIPS',
        'CASE_ADMINISTRATION',
        NULL
    )
);

CREATE POLICY v2_role_grants_select_own_or_managed
ON public.v2_role_grants
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.v2_case_memberships AS membership
        WHERE membership.membership_id = v2_role_grants.membership_id
          AND (
              membership.actor_id = v2_private.current_actor_id()
              OR v2_private.has_case_grant_path(
                  membership.case_id,
                  'MANAGE_GRANTS',
                  'CASE_ADMINISTRATION',
                  NULL
              )
          )
    )
);

-- Function ACL: PostgreSQL grants EXECUTE on new functions to PUBLIC by default,
-- so every function is explicitly revoked before selective grants.
REVOKE ALL ON FUNCTION v2_private.normalize_email(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.role_has_capability(public.v2_role_type, public.v2_purpose, public.v2_capability) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.current_actor_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.case_has_effective_admin(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.has_case_grant_path(UUID, public.v2_capability, public.v2_purpose, public.v2_sharing_scope) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.current_verified_email() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.assert_access_event_target(UUID, public.v2_access_event_type, public.v2_access_event_target_kind, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION v2_private.append_access_event(UUID, UUID, UUID, public.v2_access_event_type, public.v2_access_event_target_kind, UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;

-- RLS policy helpers require authenticated EXECUTE but live in a non-exposed
-- private schema and return only UUID/boolean. SQL dry-run must verify PostgREST
-- cannot expose the private schema and that this grant does not permit bypass.
GRANT USAGE ON SCHEMA v2_private TO authenticated;
GRANT EXECUTE ON FUNCTION v2_private.current_actor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION v2_private.has_case_grant_path(UUID, public.v2_capability, public.v2_purpose, public.v2_sharing_scope) TO authenticated;

REVOKE ALL ON FUNCTION public.create_v2_draft_case(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.activate_v2_case(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.issue_v2_invitation(UUID, TEXT, public.v2_role_type, public.v2_purpose, public.v2_sharing_scope, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_v2_invitation(TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_v2_invitation(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_v2_membership(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.transfer_v2_case_admin(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.abandon_v2_draft_case(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_v2_account_deletion(UUID) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_v2_draft_case(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_v2_case(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_v2_invitation(UUID, TEXT, public.v2_role_type, public.v2_purpose, public.v2_sharing_scope, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_v2_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_v2_invitation(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_v2_membership(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_v2_case_admin(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_v2_draft_case(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_v2_account_deletion(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- SQL Gate disposition summary
-- ---------------------------------------------------------------------------
--
-- GATE 1 confirmed Email:
--   Resolved in draft by current_verified_email(), which starts from auth.uid()
--   and reads auth.users.email + email_confirmed_at under a controlled definer.
--   It rejects client/JWT metadata. Local Supabase schema verification required.
--
-- GATE 2 direct Auth administrator deletion:
--   auth_user_id uses ON DELETE SET NULL. All grant helpers require a current
--   Auth link and an effective admin. Case/history remain; no Auth trigger is
--   introduced. Admin-console deletion cannot be prevented by this prototype.
--
-- GATE 3 helper/RPC security:
--   Every function declares invoker/definer, empty search_path, qualified
--   relations, explicit revoke, and selective authenticated grants. The draft
--   expects the Supabase migration owner and treats every definer as potentially
--   bypassing RLS. Exact owner flags, prosecdef, proconfig and proacl are local
--   dry-run assertions; FORCE RLS is not a definer safety boundary.
--
-- GATE 4 last-manager concurrency:
--   Manager mutation RPCs lock the Case row and re-check effective managers.
--   New admin grant is effective before the old grant ends in one transaction.
--
-- GATE 5 Access Event target integrity:
--   Fixed enum vocabularies + internal compatibility/existence validation.
--   DRAFT_ABANDONED validates the live DRAFT first, then preserves only actor,
--   event time/type and opaque Case UUID while ON DELETE SET NULL clears case_id.
--   It is the only first-phase nullable-case tombstone exception. Tradeoff:
--   one polymorphic target cannot have six declarative FKs.
--
-- DRAFT LIMITATION:
--   No known static design blocker remains after the security/tombstone revision.
--   PostgreSQL local dry-run must still prove parseability, migration-owner
--   attributes, FORCE-RLS/definer behavior, pgcrypto schema, auth.users columns,
--   PostgREST exposure, concurrency and exact privileges. This file must not be
--   applied to remote Supabase in its current state.

COMMIT;
