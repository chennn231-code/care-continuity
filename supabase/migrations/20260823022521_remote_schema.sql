alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."backup_assignments" (
  "backup_id"               uuid                     not null default gen_random_uuid(),
  "task_id"                 uuid                     not null,
  "care_source_id"          uuid                     not null,
  "confirmation_status"     character varying(50)    not null,
  "time_scope"              jsonb,
  "support_modes_committed" character varying(50)[]  not null default ARRAY['ON_SITE'::character varying(50)],
  "updated_at"              timestamp with time zone not null default now(),
  constraint "backup_assignments_pkey" primary key (backup_id),
  constraint "chk_backup_confirmation_status"
    check (((confirmation_status)::text = ANY ((ARRAY['POSSIBLE'::character varying, 'CONFIRMED_WITH_LIMITS'::character varying, 'CONFIRMED'::character varying])::text[]))),
  constraint "chk_backup_support_modes_not_empty" check ((cardinality(support_modes_committed) > 0)),
  constraint "chk_backup_support_modes_valid"
    check ((support_modes_committed <@ ARRAY['ON_SITE'::character varying(50), 'REMOTE_COORDINATION'::character varying(50), 'FLEXIBLE'::character varying(50)])),
  constraint "chk_backup_time_scope_object" check (((time_scope IS NULL) OR (jsonb_typeof(time_scope) = 'object'::text))),
  constraint "chk_confirmed_with_limits_has_scope" check ((((confirmation_status)::text <> 'CONFIRMED_WITH_LIMITS'::text) OR (time_scope IS NOT NULL))),
  constraint "chk_possible_has_no_time_scope" check ((((confirmation_status)::text <> 'POSSIBLE'::text) OR (time_scope IS NULL))),
  constraint "uq_backup_task_source" unique (task_id, care_source_id)
);

create table "public"."care_receivers" (
  "care_receiver_id" uuid                     not null default gen_random_uuid(),
  "display_name"     character varying(100)   not null,
  "created_at"       timestamp with time zone not null default now(),
  constraint "care_receivers_pkey" primary key (care_receiver_id),
  constraint "chk_care_receiver_name_not_blank" check ((length(TRIM(BOTH FROM display_name)) > 0))
);

create table "public"."care_scenarios" (
  "scenario_id"                uuid                     not null default gen_random_uuid(),
  "care_receiver_id"           uuid                     not null,
  "unavailable_care_source_id" uuid                     not null,
  "duration_mode"              character varying(50)    not null,
  "valid_from"                 timestamp with time zone,
  "valid_until"                timestamp with time zone,
  "created_at"                 timestamp with time zone not null default now(),
  constraint "care_scenarios_pkey" primary key (scenario_id),
  constraint "chk_scenario_duration_fields" check (((((duration_mode)::text = 'EXPLICIT_RANGE'::text) AND (valid_from IS NOT NULL) AND (valid_until IS
    NOT NULL) AND (valid_until > valid_from)) OR (((duration_mode)::text = 'UNKNOWN'::text) AND (valid_from IS NULL) AND (valid_until IS NULL)))),
  constraint "chk_scenario_duration_mode" check (((duration_mode)::text = ANY ((ARRAY['EXPLICIT_RANGE'::character varying, 'UNKNOWN'::character varying])::text[])))
);

create table "public"."care_sources" (
  "care_source_id"   uuid                     not null default gen_random_uuid(),
  "care_receiver_id" uuid                     not null,
  "display_name"     character varying(100)   not null,
  "source_type"      character varying(50)    not null,
  "user_id"          uuid,
  "created_at"       timestamp with time zone not null default now(),
  constraint "care_sources_pkey" primary key (care_source_id),
  constraint "chk_care_source_name_not_blank" check ((length(TRIM(BOTH FROM display_name)) > 0)),
  constraint "chk_care_source_type"
    check
    (((source_type)::text = ANY ((ARRAY['FAMILY_MEMBER'::character varying, 'PROFESSIONAL'::character varying, 'VOLUNTEER'::character varying, 'OTHER'::character
    varying])::text[]))),
  constraint "uq_care_source_per_receiver" unique (care_receiver_id, display_name)
);

create table "public"."care_tasks" (
  "task_id"                uuid                     not null default gen_random_uuid(),
  "care_receiver_id"       uuid                     not null,
  "title"                  character varying(150)   not null,
  "category"               character varying(50)    not null,
  "occurrence_pattern"     jsonb                    not null,
  "required_support_modes" character varying(50)[]  not null default ARRAY['ON_SITE'::character varying(50)],
  "is_active"              boolean                  not null default true,
  "created_at"             timestamp with time zone not null default now(),
  constraint "care_tasks_pkey" primary key (task_id),
  constraint "chk_care_task_category"
    check
    (((category)::text = ANY ((ARRAY['MEDICATION'::character varying, 'MEAL'::character varying, 'TOILETING'::character varying, 'BATHING'::character varying, 'MOBILITY'::character
    varying, 'MEDICAL'::character varying, 'NIGHT_CARE'::character varying, 'TRANSPORT'::character varying, 'OTHER'::character varying])::text[]))),
  constraint "chk_care_task_title_not_blank" check ((length(TRIM(BOTH FROM title)) > 0)),
  constraint "chk_occurrence_pattern_object" check ((jsonb_typeof(occurrence_pattern) = 'object'::text)),
  constraint "chk_required_support_modes_not_empty" check ((cardinality(required_support_modes) > 0)),
  constraint "chk_required_support_modes_valid"
    check ((required_support_modes <@ ARRAY['ON_SITE'::character varying(50), 'REMOTE_COORDINATION'::character varying(50), 'FLEXIBLE'::character varying(50)]))
);

create table "public"."coverage_evaluations" (
  "evaluation_id"  uuid                     not null default gen_random_uuid(),
  "scenario_id"    uuid                     not null,
  "engine_version" character varying(20)    not null default '1.5-MVP'::character varying,
  "summary"        jsonb                    not null,
  "details"        jsonb                    not null,
  "evaluated_at"   timestamp with time zone not null default now(),
  constraint "chk_evaluation_details_array" check ((jsonb_typeof(details) = 'array'::text)),
  constraint "chk_evaluation_summary_object" check ((jsonb_typeof(summary) = 'object'::text)),
  constraint "coverage_evaluations_pkey" primary key (evaluation_id)
);

create table "public"."current_care_assignments" (
  "assignment_id"      uuid                     not null default gen_random_uuid(),
  "task_id"            uuid                     not null,
  "care_source_id"     uuid                     not null,
  "participation_type" character varying(50)    not null default 'REGULAR'::character varying,
  "time_scope"         jsonb,
  "support_modes"      character varying(50)[]  not null default ARRAY['ON_SITE'::character varying(50)],
  "created_at"         timestamp with time zone not null default now(),
  constraint "chk_current_participation_type" check (((participation_type)::text = ANY ((ARRAY['REGULAR'::character varying, 'OCCASIONAL'::character varying])::text[]))),
  constraint "chk_current_support_modes_not_empty" check ((cardinality(support_modes) > 0)),
  constraint "chk_current_support_modes_valid"
    check ((support_modes <@ ARRAY['ON_SITE'::character varying(50), 'REMOTE_COORDINATION'::character varying(50), 'FLEXIBLE'::character varying(50)])),
  constraint "chk_current_time_scope_object" check (((time_scope IS NULL) OR (jsonb_typeof(time_scope) = 'object'::text))),
  constraint "current_care_assignments_pkey" primary key (assignment_id),
  constraint "uq_current_task_source" unique (task_id, care_source_id)
);

create table "public"."task_adaptations" (
  "adaptation_id"     uuid                     not null default gen_random_uuid(),
  "scenario_id"       uuid                     not null,
  "task_id"           uuid                     not null,
  "adaptation_type"   character varying(100)   not null,
  "mitigation_status" character varying(50)    not null default 'PARTIAL'::character varying,
  "note"              text,
  "updated_at"        timestamp with time zone not null default now(),
  constraint "chk_mitigation_status"
    check (((mitigation_status)::text = ANY ((ARRAY['NONE'::character varying, 'PARTIAL'::character varying, 'IMPLEMENTED'::character varying])::text[]))),
  constraint "task_adaptations_pkey" primary key (adaptation_id),
  constraint "uq_task_adaptation_scenario" unique (scenario_id, task_id)
);

create table "public"."users" (
  "user_id"      uuid                     not null default gen_random_uuid(),
  "email"        character varying(255)   not null,
  "display_name" character varying(100)   not null,
  "created_at"   timestamp with time zone not null default now(),
  constraint "chk_users_display_name_not_blank" check ((length(TRIM(BOTH FROM display_name)) > 0)),
  constraint "chk_users_email_not_blank" check ((length(TRIM(BOTH FROM email)) > 0)),
  constraint "users_email_key" unique (email),
  constraint "users_pkey" primary key (user_id)
);

alter table "public"."care_scenarios"
  add constraint "care_scenarios_care_receiver_id_fkey" foreign key (care_receiver_id) references public.care_receivers(care_receiver_id) on delete cascade;

alter table "public"."care_sources"
  add constraint "care_sources_care_receiver_id_fkey" foreign key (care_receiver_id) references public.care_receivers(care_receiver_id) on delete cascade;

alter table "public"."backup_assignments"
  add constraint "backup_assignments_care_source_id_fkey" foreign key (care_source_id) references public.care_sources(care_source_id) on delete cascade;

alter table "public"."care_scenarios"
  add constraint "care_scenarios_unavailable_care_source_id_fkey" foreign key (unavailable_care_source_id) references public.care_sources(care_source_id) on delete restrict;

alter table "public"."care_tasks"
  add constraint "care_tasks_care_receiver_id_fkey" foreign key (care_receiver_id) references public.care_receivers(care_receiver_id) on delete cascade;

alter table "public"."backup_assignments"
  add constraint "backup_assignments_task_id_fkey" foreign key (task_id) references public.care_tasks(task_id) on delete cascade;

alter table "public"."coverage_evaluations"
  add constraint "coverage_evaluations_scenario_id_fkey" foreign key (scenario_id) references public.care_scenarios(scenario_id) on delete cascade;

alter table "public"."current_care_assignments"
  add constraint "current_care_assignments_care_source_id_fkey" foreign key (care_source_id) references public.care_sources(care_source_id) on delete cascade;

alter table "public"."current_care_assignments"
  add constraint "current_care_assignments_task_id_fkey" foreign key (task_id) references public.care_tasks(task_id) on delete cascade;

alter table "public"."task_adaptations"
  add constraint "task_adaptations_scenario_id_fkey" foreign key (scenario_id) references public.care_scenarios(scenario_id) on delete cascade;

alter table "public"."task_adaptations"
  add constraint "task_adaptations_task_id_fkey" foreign key (task_id) references public.care_tasks(task_id) on delete cascade;

alter table "public"."care_sources"
  add constraint "care_sources_user_id_fkey" foreign key (user_id) references public.users(user_id) on delete set null;

create index idx_backup_assignments_task on public.backup_assignments using btree (task_id);

create index idx_care_sources_receiver on public.care_sources using btree (care_receiver_id);

create index idx_care_tasks_receiver on public.care_tasks using btree (care_receiver_id);

create index idx_coverage_evaluations_scenario on public.coverage_evaluations using btree (scenario_id);

create index idx_current_assignments_task on public.current_care_assignments using btree (task_id);

create index idx_scenarios_receiver on public.care_scenarios using btree (care_receiver_id);

create index idx_task_adaptations_scenario on public.task_adaptations using btree (scenario_id);

comment on table "public"."care_scenarios" is 'Scenario models temporary CareSource unavailability. It does not collect the private reason for unavailability.';

comment on table "public"."coverage_evaluations" is 'Coverage Engine generated snapshot. Coverage status must not be manually treated as source-of-truth input.';

comment on table "public"."task_adaptations" is 'Risk mitigation / task adaptation data. Adaptation does not itself imply coverage.';

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."backup_assignments" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."care_receivers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."care_scenarios" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."care_sources" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."care_tasks" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."coverage_evaluations" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."current_care_assignments" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."task_adaptations" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."users" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";
