-- WinWin IA-3A authority foundation.
-- Additive schema only: this migration is not a runtime authorization engine.
-- RLS, workflow functions, record visibility, domain records, and audit follow in later gates.

BEGIN;

CREATE TABLE public.winwin_actor_references (
    actor_reference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE public.winwin_account_actor_links (
    account_actor_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_key TEXT NOT NULL,
    provider_subject_id TEXT NOT NULL,
    actor_reference_id UUID NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_account_actor_links_actor
        FOREIGN KEY (actor_reference_id)
        REFERENCES public.winwin_actor_references(actor_reference_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_winwin_account_actor_links_provider_key
        CHECK (
            char_length(provider_key) BETWEEN 1 AND 64
            AND provider_key ~ '^[A-Z][A-Z0-9_]*$'
        ),
    CONSTRAINT ck_winwin_account_actor_links_provider_subject
        CHECK (char_length(provider_subject_id) BETWEEN 1 AND 255),
    CONSTRAINT ck_winwin_account_actor_links_period
        CHECK (ended_at IS NULL OR ended_at > effective_at),
    CONSTRAINT ck_winwin_account_actor_links_terminal_pair
        CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
    CONSTRAINT ck_winwin_account_actor_links_end_reason
        CHECK (end_reason IS NULL OR char_length(end_reason) BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX uq_winwin_account_actor_links_active_subject
    ON public.winwin_account_actor_links(provider_key, provider_subject_id)
    WHERE ended_at IS NULL;

CREATE UNIQUE INDEX uq_winwin_account_actor_links_active_actor
    ON public.winwin_account_actor_links(actor_reference_id)
    WHERE ended_at IS NULL;

CREATE TABLE public.winwin_identities (
    identity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE public.winwin_identity_actor_bindings (
    identity_actor_binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL,
    actor_reference_id UUID NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_identity_actor_bindings_identity
        FOREIGN KEY (identity_id)
        REFERENCES public.winwin_identities(identity_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_identity_actor_bindings_actor
        FOREIGN KEY (actor_reference_id)
        REFERENCES public.winwin_actor_references(actor_reference_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_winwin_identity_actor_bindings_period
        CHECK (ended_at IS NULL OR ended_at > effective_at),
    CONSTRAINT ck_winwin_identity_actor_bindings_terminal_pair
        CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
    CONSTRAINT ck_winwin_identity_actor_bindings_end_reason
        CHECK (end_reason IS NULL OR char_length(end_reason) BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX uq_winwin_identity_actor_bindings_active_identity
    ON public.winwin_identity_actor_bindings(identity_id)
    WHERE ended_at IS NULL;

CREATE UNIQUE INDEX uq_winwin_identity_actor_bindings_active_pair
    ON public.winwin_identity_actor_bindings(actor_reference_id, identity_id)
    WHERE ended_at IS NULL;

CREATE TABLE public.winwin_cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_identity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_cases_creator_identity
        FOREIGN KEY (created_by_identity_id)
        REFERENCES public.winwin_identities(identity_id)
        ON DELETE RESTRICT
);

CREATE TABLE public.winwin_person_references (
    person_reference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_person_references_case
        FOREIGN KEY (case_id)
        REFERENCES public.winwin_cases(case_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_winwin_person_references_case
        UNIQUE (case_id),
    CONSTRAINT uq_winwin_person_references_path
        UNIQUE (person_reference_id, case_id)
);

CREATE TABLE public.winwin_care_recipient_roles (
    care_recipient_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    person_reference_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_care_recipient_roles_person_case
        FOREIGN KEY (person_reference_id, case_id)
        REFERENCES public.winwin_person_references(person_reference_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_winwin_care_recipient_roles_case
        UNIQUE (case_id),
    CONSTRAINT uq_winwin_care_recipient_roles_person
        UNIQUE (person_reference_id)
);

CREATE TABLE public.winwin_case_memberships (
    membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL,
    case_id UUID NOT NULL,
    source_type TEXT NOT NULL,
    source_reference_id UUID,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_case_memberships_identity
        FOREIGN KEY (identity_id)
        REFERENCES public.winwin_identities(identity_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_case_memberships_case
        FOREIGN KEY (case_id)
        REFERENCES public.winwin_cases(case_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_winwin_case_memberships_path
        UNIQUE (membership_id, identity_id, case_id),
    CONSTRAINT ck_winwin_case_memberships_source
        CHECK (source_type IN ('DIRECT_GRANT', 'INVITATION', 'MIGRATION')),
    CONSTRAINT ck_winwin_case_memberships_period
        CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE public.winwin_membership_lifecycle_events (
    membership_lifecycle_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_order BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    membership_id UUID NOT NULL,
    identity_id UUID NOT NULL,
    case_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    actor_identity_id UUID,
    actor_membership_id UUID,
    correlation_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    reason_code TEXT,
    CONSTRAINT fk_winwin_membership_events_membership_path
        FOREIGN KEY (membership_id, identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_membership_events_actor_path
        FOREIGN KEY (actor_membership_id, actor_identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_winwin_membership_events_actor_pair
        CHECK (
            (actor_identity_id IS NULL AND actor_membership_id IS NULL)
            OR
            (actor_identity_id IS NOT NULL AND actor_membership_id IS NOT NULL)
        ),
    CONSTRAINT ck_winwin_membership_events_type
        CHECK (event_type IN (
            'WAITING_START',
            'ACTIVATED',
            'SUSPENDED',
            'REVOKED',
            'EXPIRED',
            'ENDED'
        )),
    CONSTRAINT ck_winwin_membership_events_reason
        CHECK (reason_code IS NULL OR char_length(reason_code) BETWEEN 1 AND 100)
);

CREATE TABLE public.winwin_case_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    identity_id UUID NOT NULL,
    case_id UUID NOT NULL,
    relationship_type TEXT NOT NULL,
    service_purpose TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_case_relationships_membership_path
        FOREIGN KEY (membership_id, identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_winwin_case_relationships_path
        UNIQUE (relationship_id, membership_id, identity_id, case_id),
    CONSTRAINT ck_winwin_case_relationships_type
        CHECK (relationship_type IN ('SELF', 'FAMILY', 'PROFESSIONAL_SERVICE', 'OTHER')),
    CONSTRAINT ck_winwin_case_relationships_purpose
        CHECK (char_length(service_purpose) BETWEEN 1 AND 500),
    CONSTRAINT ck_winwin_case_relationships_period
        CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE public.winwin_relationship_lifecycle_events (
    relationship_lifecycle_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_order BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    relationship_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    identity_id UUID NOT NULL,
    case_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    actor_identity_id UUID,
    actor_membership_id UUID,
    correlation_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    reason_code TEXT,
    CONSTRAINT fk_winwin_relationship_events_relationship_path
        FOREIGN KEY (relationship_id, membership_id, identity_id, case_id)
        REFERENCES public.winwin_case_relationships(
            relationship_id,
            membership_id,
            identity_id,
            case_id
        )
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_relationship_events_actor_path
        FOREIGN KEY (actor_membership_id, actor_identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_winwin_relationship_events_actor_pair
        CHECK (
            (actor_identity_id IS NULL AND actor_membership_id IS NULL)
            OR
            (actor_identity_id IS NOT NULL AND actor_membership_id IS NOT NULL)
        ),
    CONSTRAINT ck_winwin_relationship_events_type
        CHECK (event_type IN ('ACTIVATED', 'SUSPENDED', 'ENDED')),
    CONSTRAINT ck_winwin_relationship_events_reason
        CHECK (reason_code IS NULL OR char_length(reason_code) BETWEEN 1 AND 100)
);

CREATE TABLE public.winwin_grants (
    grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grantee_identity_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    relationship_id UUID NOT NULL,
    case_id UUID NOT NULL,
    issued_by_identity_id UUID,
    issued_by_membership_id UUID,
    purpose TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_reference_id UUID,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT fk_winwin_grants_relationship_path
        FOREIGN KEY (relationship_id, membership_id, grantee_identity_id, case_id)
        REFERENCES public.winwin_case_relationships(
            relationship_id,
            membership_id,
            identity_id,
            case_id
        )
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_grants_issuer_membership_path
        FOREIGN KEY (issued_by_membership_id, issued_by_identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_winwin_grants_path
        UNIQUE (grant_id, grantee_identity_id, membership_id, relationship_id, case_id),
    CONSTRAINT ck_winwin_grants_issuer_pair
        CHECK (
            (issued_by_identity_id IS NULL AND issued_by_membership_id IS NULL)
            OR
            (issued_by_identity_id IS NOT NULL AND issued_by_membership_id IS NOT NULL)
        ),
    CONSTRAINT ck_winwin_grants_purpose
        CHECK (char_length(purpose) BETWEEN 1 AND 500),
    CONSTRAINT ck_winwin_grants_source
        CHECK (source_type IN ('DIRECT_GRANT', 'INVITATION', 'MIGRATION')),
    CONSTRAINT ck_winwin_grants_period
        CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE public.winwin_grant_lifecycle_events (
    grant_lifecycle_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_order BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    grant_id UUID NOT NULL,
    grantee_identity_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    relationship_id UUID NOT NULL,
    case_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    actor_identity_id UUID,
    actor_membership_id UUID,
    correlation_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    reason_code TEXT,
    CONSTRAINT fk_winwin_grant_events_grant_path
        FOREIGN KEY (
            grant_id,
            grantee_identity_id,
            membership_id,
            relationship_id,
            case_id
        )
        REFERENCES public.winwin_grants(
            grant_id,
            grantee_identity_id,
            membership_id,
            relationship_id,
            case_id
        )
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_grant_events_actor_path
        FOREIGN KEY (actor_membership_id, actor_identity_id, case_id)
        REFERENCES public.winwin_case_memberships(membership_id, identity_id, case_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_winwin_grant_events_actor_pair
        CHECK (
            (actor_identity_id IS NULL AND actor_membership_id IS NULL)
            OR
            (actor_identity_id IS NOT NULL AND actor_membership_id IS NOT NULL)
        ),
    CONSTRAINT ck_winwin_grant_events_type
        CHECK (event_type IN ('ACTIVATED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'ENDED')),
    CONSTRAINT ck_winwin_grant_events_reason
        CHECK (reason_code IS NULL OR char_length(reason_code) BETWEEN 1 AND 100)
);

CREATE TABLE public.winwin_capability_definitions (
    capability_key TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT ck_winwin_capability_definitions_key
        CHECK (
            char_length(capability_key) BETWEEN 1 AND 100
            AND capability_key ~ '^[A-Z][A-Z0-9_]*$'
        )
);

INSERT INTO public.winwin_capability_definitions (capability_key)
VALUES
    ('RECORD_VIEW'),
    ('CARE_UPDATE_CREATE'),
    ('CARE_UPDATE_CORRECT'),
    ('QUESTION_ASK'),
    ('QUESTION_ANSWER'),
    ('QUESTION_RESOLVE'),
    ('ACTION_CREATE'),
    ('ACTION_ASSIGN'),
    ('ACTION_ACCEPT'),
    ('ACTION_DECLINE'),
    ('ACTION_START'),
    ('ACTION_COMPLETE'),
    ('ACTION_RELINQUISH'),
    ('ACTION_REASSIGN'),
    ('ACCESS_INVITE'),
    ('ACCESS_REVOKE');

CREATE TABLE public.winwin_grant_scope_definitions (
    scope_key TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT ck_winwin_grant_scope_definitions_key
        CHECK (
            char_length(scope_key) BETWEEN 1 AND 100
            AND scope_key ~ '^[A-Z][A-Z0-9_]*$'
        )
);

INSERT INTO public.winwin_grant_scope_definitions (scope_key)
VALUES ('CASE'), ('RECORD');

CREATE TABLE public.winwin_grant_capabilities (
    grant_id UUID NOT NULL,
    capability_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT pk_winwin_grant_capabilities
        PRIMARY KEY (grant_id, capability_key),
    CONSTRAINT fk_winwin_grant_capabilities_grant
        FOREIGN KEY (grant_id)
        REFERENCES public.winwin_grants(grant_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_grant_capabilities_definition
        FOREIGN KEY (capability_key)
        REFERENCES public.winwin_capability_definitions(capability_key)
        ON DELETE RESTRICT
);

CREATE TABLE public.winwin_grant_scopes (
    grant_id UUID NOT NULL,
    scope_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT pk_winwin_grant_scopes
        PRIMARY KEY (grant_id, scope_key),
    CONSTRAINT fk_winwin_grant_scopes_grant
        FOREIGN KEY (grant_id)
        REFERENCES public.winwin_grants(grant_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_winwin_grant_scopes_definition
        FOREIGN KEY (scope_key)
        REFERENCES public.winwin_grant_scope_definitions(scope_key)
        ON DELETE RESTRICT
);

-- Structural immutability only. This function performs no authorization or workflow transition.
CREATE FUNCTION public.winwin_reject_immutable_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'WINWIN_IMMUTABLE_ROW';
END;
$$;

-- Account-link rows permit one monotonic terminal update and prohibit deletion or resurrection.
CREATE FUNCTION public.winwin_enforce_account_actor_link_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'WINWIN_ACCOUNT_ACTOR_LINK_DELETE_FORBIDDEN';
    END IF;

    IF OLD.account_actor_link_id IS DISTINCT FROM NEW.account_actor_link_id
       OR OLD.provider_key IS DISTINCT FROM NEW.provider_key
       OR OLD.provider_subject_id IS DISTINCT FROM NEW.provider_subject_id
       OR OLD.actor_reference_id IS DISTINCT FROM NEW.actor_reference_id
       OR OLD.effective_at IS DISTINCT FROM NEW.effective_at
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR OLD.ended_at IS NOT NULL
       OR NEW.ended_at IS NULL
       OR NEW.end_reason IS NULL THEN
        RAISE EXCEPTION 'WINWIN_ACCOUNT_ACTOR_LINK_IMMUTABLE';
    END IF;

    RETURN NEW;
END;
$$;

-- Identity-binding rows use the same one-way terminal lifecycle and retain historical attribution.
CREATE FUNCTION public.winwin_enforce_identity_actor_binding_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'WINWIN_IDENTITY_ACTOR_BINDING_DELETE_FORBIDDEN';
    END IF;

    IF OLD.identity_actor_binding_id IS DISTINCT FROM NEW.identity_actor_binding_id
       OR OLD.identity_id IS DISTINCT FROM NEW.identity_id
       OR OLD.actor_reference_id IS DISTINCT FROM NEW.actor_reference_id
       OR OLD.effective_at IS DISTINCT FROM NEW.effective_at
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR OLD.ended_at IS NOT NULL
       OR NEW.ended_at IS NULL
       OR NEW.end_reason IS NULL THEN
        RAISE EXCEPTION 'WINWIN_IDENTITY_ACTOR_BINDING_IMMUTABLE';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_winwin_account_actor_links_lifecycle
BEFORE UPDATE OR DELETE ON public.winwin_account_actor_links
FOR EACH ROW EXECUTE FUNCTION public.winwin_enforce_account_actor_link_lifecycle();

CREATE TRIGGER trg_winwin_identity_actor_bindings_lifecycle
BEFORE UPDATE OR DELETE ON public.winwin_identity_actor_bindings
FOR EACH ROW EXECUTE FUNCTION public.winwin_enforce_identity_actor_binding_lifecycle();

CREATE TRIGGER trg_winwin_actor_references_immutable
BEFORE UPDATE OR DELETE ON public.winwin_actor_references
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_identities_immutable
BEFORE UPDATE OR DELETE ON public.winwin_identities
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_cases_immutable
BEFORE UPDATE OR DELETE ON public.winwin_cases
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_person_references_immutable
BEFORE UPDATE OR DELETE ON public.winwin_person_references
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_care_recipient_roles_immutable
BEFORE UPDATE OR DELETE ON public.winwin_care_recipient_roles
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_case_memberships_immutable
BEFORE UPDATE OR DELETE ON public.winwin_case_memberships
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_membership_events_immutable
BEFORE UPDATE OR DELETE ON public.winwin_membership_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_case_relationships_immutable
BEFORE UPDATE OR DELETE ON public.winwin_case_relationships
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_relationship_events_immutable
BEFORE UPDATE OR DELETE ON public.winwin_relationship_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_grants_immutable
BEFORE UPDATE OR DELETE ON public.winwin_grants
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_grant_events_immutable
BEFORE UPDATE OR DELETE ON public.winwin_grant_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_capability_definitions_immutable
BEFORE UPDATE OR DELETE ON public.winwin_capability_definitions
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_scope_definitions_immutable
BEFORE UPDATE OR DELETE ON public.winwin_grant_scope_definitions
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_grant_capabilities_immutable
BEFORE UPDATE OR DELETE ON public.winwin_grant_capabilities
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

CREATE TRIGGER trg_winwin_grant_scopes_immutable
BEFORE UPDATE OR DELETE ON public.winwin_grant_scopes
FOR EACH ROW EXECUTE FUNCTION public.winwin_reject_immutable_row_change();

COMMENT ON TABLE public.winwin_actor_references IS
    'Stable Physical Actor references; not Logical Identity and not Case authority.';
COMMENT ON TABLE public.winwin_account_actor_links IS
    'Historical provider-account to Physical Actor lifecycle links; never Logical Identity.';
COMMENT ON TABLE public.winwin_identities IS
    'Stable Logical WinWin Identities independent from authentication accounts and roles.';
COMMENT ON TABLE public.winwin_identity_actor_bindings IS
    'Historical lifecycle bindings from Physical Actors to Logical Identities.';
COMMENT ON TABLE public.winwin_cases IS
    'WinWin collaboration and authorization boundary; not a medical record.';
COMMENT ON TABLE public.winwin_person_references IS
    'Case-scoped opaque person prerequisite with no profile or authorization semantics.';
COMMENT ON TABLE public.winwin_care_recipient_roles IS
    'Exactly-one-per-Case care-receiver association; never an authorization role.';
COMMENT ON TABLE public.winwin_case_memberships IS
    'Immutable Identity-plus-Case participation lifecycle instance; Membership alone grants nothing.';
COMMENT ON TABLE public.winwin_case_relationships IS
    'Immutable relationship context for one Membership path; Relationship alone grants nothing.';
COMMENT ON TABLE public.winwin_grants IS
    'Distinct immutable authorization proof-path lifecycle owning its capability and scope mappings.';
COMMENT ON TABLE public.winwin_grant_scopes IS
    'Grant target-boundary scopes only; RECORD still requires typed Record Visibility later.';
COMMENT ON FUNCTION public.winwin_reject_immutable_row_change() IS
    'Structural immutability guard only; performs no authorization or workflow transition.';
COMMENT ON FUNCTION public.winwin_enforce_account_actor_link_lifecycle() IS
    'Allows only the first terminal update of an account-to-Actor lifecycle row.';
COMMENT ON FUNCTION public.winwin_enforce_identity_actor_binding_lifecycle() IS
    'Allows only the first terminal update of an Actor-to-Identity lifecycle row.';

COMMIT;
