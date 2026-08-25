\set ON_ERROR_STOP on

DO $legacy_assertions$
BEGIN
  IF (SELECT count(*) FROM public.v2_identities WHERE identity_type='LEGACY_UNSPECIFIED') <> 4 THEN
    RAISE EXCEPTION 'legacy assertion failed: expected four legacy identities';
  END IF;
  IF EXISTS (
    SELECT actor_reference_id FROM public.v2_identities
    WHERE identity_type='LEGACY_UNSPECIFIED'
    GROUP BY actor_reference_id HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'legacy assertion failed: Actor does not map to exactly one legacy identity';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.v2_identities
    WHERE identity_type='LEGACY_UNSPECIFIED'
      AND (current_verification_status='VERIFIED' OR is_primary OR professional_type IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'legacy assertion failed: legacy identity gained verification, primary, or profession';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.v2_case_memberships m
    JOIN public.v2_identities i ON i.identity_id=m.identity_id
    WHERE m.membership_id IN
      ('81200000-0000-0000-0000-880000000001','82200000-0000-0000-0000-880000000002','83200000-0000-0000-0000-880000000003','84200000-0000-0000-0000-880000000004')
      AND i.actor_reference_id <> m.actor_id
  ) OR EXISTS (
    SELECT 1 FROM public.v2_case_memberships
    WHERE membership_id IN
      ('81200000-0000-0000-0000-880000000001','82200000-0000-0000-0000-880000000002','83200000-0000-0000-0000-880000000003','84200000-0000-0000-0000-880000000004')
      AND identity_id IS NULL
  ) THEN
    RAISE EXCEPTION 'legacy assertion failed: Membership Identity backfill mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.v2_role_grants g
    JOIN public.v2_grant_templates t ON t.grant_template_id=g.grant_template_id
    WHERE g.grant_id IN
      ('81300000-0000-0000-0000-880000000001','82300000-0000-0000-0000-880000000002','83300000-0000-0000-0000-880000000003','84300000-0000-0000-0000-880000000004')
      AND (t.role_type <> g.role_type OR t.purpose <> g.purpose)
  ) OR EXISTS (
    SELECT 1 FROM public.v2_role_grants
    WHERE grant_id IN
      ('81300000-0000-0000-0000-880000000001','82300000-0000-0000-0000-880000000002','83300000-0000-0000-0000-880000000003','84300000-0000-0000-0000-880000000004')
      AND grant_template_id IS NULL
  ) THEN
    RAISE EXCEPTION 'legacy assertion failed: Grant template mapping mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.v2_grant_template_capabilities
    WHERE capability IN ('VIEW_CARE_UPDATE','VIEW_QUESTION','RESOLVE_QUESTION','CREATE_PROFESSIONAL_RECORD','CORRECT_PROFESSIONAL_RECORD','VIEW_PROFESSIONAL_CONTENT')
  ) THEN
    RAISE EXCEPTION 'legacy assertion failed: new capability expanded legacy access';
  END IF;
  IF (SELECT count(*) FROM public.v2_role_grants) <> 4 THEN
    RAISE EXCEPTION 'legacy assertion failed: backfill inserted or removed a Grant';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id='81300000-0000-0000-0000-880000000001' AND scope_ceiling='AUTHOR_ONLY')
     OR NOT EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id='82300000-0000-0000-0000-880000000002' AND scope_ceiling='FAMILY_ONLY')
     OR NOT EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id='83300000-0000-0000-0000-880000000003' AND scope_ceiling='DIRECT_PARTICIPANTS')
     OR NOT EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id='84300000-0000-0000-0000-880000000004' AND scope_ceiling='SHARED_CARE') THEN
    RAISE EXCEPTION 'legacy assertion failed: sharing scope changed';
  END IF;
END
$legacy_assertions$;

SELECT 'legacy_scenario|PASS';
