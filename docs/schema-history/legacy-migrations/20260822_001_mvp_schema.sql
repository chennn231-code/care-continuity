-- Graduation Project MVP Data Model v1.1
-- 8 required tables + 1 optional task_adaptations table

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_receivers (
    care_receiver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_sources (
    care_source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_receiver_id UUID NOT NULL REFERENCES care_receivers(care_receiver_id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('FAMILY_MEMBER', 'PROFESSIONAL', 'VOLUNTEER')),
    user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_receiver_id UUID NOT NULL REFERENCES care_receivers(care_receiver_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    occurrence_pattern JSONB NOT NULL,
    required_support_modes VARCHAR(50)[] NOT NULL DEFAULT ARRAY['ON_SITE']::VARCHAR[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS current_care_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES care_tasks(task_id) ON DELETE CASCADE,
    care_source_id UUID NOT NULL REFERENCES care_sources(care_source_id) ON DELETE CASCADE,
    participation_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR' CHECK (participation_type IN ('REGULAR', 'OCCASIONAL')),
    time_scope JSONB,
    support_modes VARCHAR(50)[] NOT NULL DEFAULT ARRAY['ON_SITE']::VARCHAR[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_assignments (
    backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES care_tasks(task_id) ON DELETE CASCADE,
    care_source_id UUID NOT NULL REFERENCES care_sources(care_source_id) ON DELETE CASCADE,
    confirmation_status VARCHAR(50) NOT NULL CHECK (confirmation_status IN ('POSSIBLE', 'CONFIRMED_WITH_LIMITS', 'CONFIRMED')),
    time_scope JSONB,
    support_modes_committed VARCHAR(50)[] NOT NULL DEFAULT ARRAY['ON_SITE']::VARCHAR[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_backup_time_scope CHECK (
        confirmation_status <> 'POSSIBLE' OR time_scope IS NULL
    )
);

CREATE TABLE IF NOT EXISTS care_scenarios (
    scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_receiver_id UUID NOT NULL REFERENCES care_receivers(care_receiver_id) ON DELETE CASCADE,
    unavailable_care_source_id UUID NOT NULL REFERENCES care_sources(care_source_id),
    duration_mode VARCHAR(50) NOT NULL CHECK (duration_mode IN ('EXPLICIT_RANGE', 'UNKNOWN')),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_scenario_duration CHECK (
        (
            duration_mode = 'EXPLICIT_RANGE'
            AND valid_from IS NOT NULL
            AND valid_until IS NOT NULL
            AND valid_until > valid_from
        )
        OR
        (
            duration_mode = 'UNKNOWN'
            AND valid_from IS NULL
            AND valid_until IS NULL
        )
    )
);

CREATE TABLE IF NOT EXISTS coverage_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES care_scenarios(scenario_id) ON DELETE CASCADE,
    engine_version VARCHAR(20) NOT NULL DEFAULT '1.5-MVP',
    summary JSONB NOT NULL,
    details JSONB NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional mitigation track. It is intentionally excluded from Coverage Engine inputs.
CREATE TABLE IF NOT EXISTS task_adaptations (
    adaptation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES care_scenarios(scenario_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES care_tasks(task_id) ON DELETE CASCADE,
    adaptation_type VARCHAR(100) NOT NULL,
    mitigation_status VARCHAR(50) NOT NULL DEFAULT 'PARTIAL' CHECK (mitigation_status IN ('NONE', 'PARTIAL', 'IMPLEMENTED')),
    note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
