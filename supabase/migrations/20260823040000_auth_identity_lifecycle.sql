-- 備份心 MVP — Authentication Identity Lifecycle
--
-- This migration passed static review and a canonical
-- baseline -> Migration 002 -> Migration 003 PostgreSQL dry run before being
-- moved into the formal migration chain.
--
-- Scope:
--   1. Provision public.users atomically after an auth.users insert.
--   2. Keep public.users.email synchronized with the canonical auth.users.email.
--   3. Default new care receivers to the current authenticated user.
--
-- Registration contract:
--   Every MVP sign-up path, including Dashboard and Admin API user creation,
--   must provide raw_user_meta_data.display_name. Missing or blank profile data
--   fails the auth.users transaction; no fallback name or hidden conflict repair
--   is allowed.
--
-- Security boundary:
--   care_receivers.owner_user_id DEFAULT auth.uid() is a creation convenience,
--   not authorization. A later RLS migration must enforce:
--       WITH CHECK (owner_user_id = auth.uid())
--   Until that policy exists and is tested, the App must not write care data.
--
-- Intentionally excluded:
--   RLS and policies, test accounts, seed or household data, OAuth/OTP UI,
--   household membership, domain naming changes, delete triggers, and changes
--   to Migration 002 trigger-function privileges.

BEGIN;

-- Fail instead of guessing how to provision or repair pre-existing identities.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM auth.users AS au
        LEFT JOIN public.users AS p ON p.user_id = au.id
        WHERE p.user_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration 003 requires every existing auth.users row to have a public.users profile';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM auth.users AS au
        JOIN public.users AS p ON p.user_id = au.id
        WHERE p.email IS DISTINCT FROM au.email
    ) THEN
        RAISE EXCEPTION
            'Migration 003 requires existing public.users.email values to match auth.users.email';
    END IF;
END
$$;

CREATE FUNCTION public.provision_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    profile_display_name TEXT;
BEGIN
    IF NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'auth.users.email is required to provision public.users';
    END IF;

    profile_display_name := pg_catalog.btrim(
        NEW.raw_user_meta_data ->> 'display_name'
    );

    IF profile_display_name IS NULL OR profile_display_name = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'raw_user_meta_data.display_name is required to provision public.users';
    END IF;

    INSERT INTO public.users (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, profile_display_name);

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.provision_user_profile() FROM authenticated;
REVOKE ALL ON FUNCTION public.provision_user_profile() FROM service_role;

CREATE TRIGGER auth_user_profile_provisioned
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.provision_user_profile();

CREATE FUNCTION public.sync_user_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- The trigger watches only the canonical auth.users.email column. During
    -- Supabase's confirmation flow, a pending address is kept separately; this
    -- function runs only after the canonical email value actually changes.
    IF NEW.email IS NOT DISTINCT FROM OLD.email THEN
        RETURN NEW;
    END IF;

    IF NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'auth.users.email cannot be empty when synchronizing public.users';
    END IF;

    UPDATE public.users
       SET email = NEW.email
     WHERE user_id = NEW.id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            ERRCODE = '23503',
            MESSAGE = pg_catalog.format(
                'public.users profile is missing for auth user %s',
                NEW.id
            );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_profile_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_user_profile_email() FROM anon;
REVOKE ALL ON FUNCTION public.sync_user_profile_email() FROM authenticated;
REVOKE ALL ON FUNCTION public.sync_user_profile_email() FROM service_role;

CREATE TRIGGER auth_user_profile_email_synchronized
AFTER UPDATE OF email
ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_user_profile_email();

ALTER TABLE public.care_receivers
    ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

COMMENT ON COLUMN public.care_receivers.owner_user_id IS
    'MVP owner identity. DEFAULT auth.uid() is creation convenience only; authorization requires a later RLS WITH CHECK (owner_user_id = auth.uid()) policy.';

COMMIT;
