#!/usr/bin/env bash
set -Eeuo pipefail

export SUPABASE_TELEMETRY_DISABLED=1

EXPECTED_DRAFT_SHA="84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389"
FORMAL_MIGRATION_NAME="20260824220000_v2_access_foundation.sql"
PROJECT_PREFIX="cc-v2-007-rc"
PORTS=(58320 58321 58322 58323 58324 58325 58326 58327 58328 58329)

if [[ "${1:-}" == "--self-test-failure-exit-code" ]]; then
  echo "Simulated harness failure: FAIL=1" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURE_ROOT="$REPO_ROOT/supabase/tests/v2-access-foundation"
DRAFT_PATH="$REPO_ROOT/docs/sql-drafts/007_v2_access_foundation_draft.sql"
MIGRATION_ROOT="$REPO_ROOT/supabase/migrations"
FORMAL_MIGRATION_PATH="$MIGRATION_ROOT/$FORMAL_MIGRATION_NAME"

for command_name in supabase docker shasum lsof sed mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "BLOCKED: required command is unavailable: $command_name" >&2
    exit 2
  }
done

for port in "${PORTS[@]}"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "BLOCKED: isolated port $port is already in use" >&2
    exit 2
  fi
done

actual_draft_sha="$(shasum -a 256 "$DRAFT_PATH" | awk '{print $1}')"
if [[ "$actual_draft_sha" != "$EXPECTED_DRAFT_SHA" ]]; then
  echo "BLOCKED: SQL Draft SHA-256 does not match the verified candidate" >&2
  exit 2
fi

if [[ ! -f "$FORMAL_MIGRATION_PATH" ]]; then
  echo "BLOCKED: formal Migration 007 is missing" >&2
  exit 2
fi
actual_formal_sha="$(shasum -a 256 "$FORMAL_MIGRATION_PATH" | awk '{print $1}')"
if [[ "$actual_formal_sha" != "$EXPECTED_DRAFT_SHA" ]]; then
  echo "BLOCKED: formal Migration 007 SHA-256 does not match the verified candidate" >&2
  exit 2
fi
if ! cmp -s "$DRAFT_PATH" "$FORMAL_MIGRATION_PATH"; then
  echo "BLOCKED: SQL Draft and formal Migration 007 are not byte-for-byte identical" >&2
  exit 2
fi

migration_files=("$MIGRATION_ROOT"/*.sql)
if [[ "${#migration_files[@]}" -ne 7 ]]; then
  echo "BLOCKED: formal migration directory must contain exactly Migration 001-007" >&2
  exit 2
fi

run_suffix="$(date -u +%Y%m%d%H%M%S)-$$"
project_id="$PROJECT_PREFIX-$run_suffix"
dryrun_root="$(mktemp -d "${TMPDIR:-/tmp}/care-continuity-v2-007-harness.XXXXXX")"
logs_dir="$dryrun_root/logs"
temp_supabase="$dryrun_root/supabase"
temp_tests="$dryrun_root/tests"
mkdir -p "$logs_dir" "$temp_supabase/migrations" "$temp_tests"

summary_file="$logs_dir/summary.txt"
stack_stop_result="NOT_ATTEMPTED"
stack_started=0
final_exit=1

stop_stack() {
  local incoming_status=$?
  set +e
  if [[ -f "$temp_supabase/config.toml" ]]; then
    SUPABASE_TELEMETRY_DISABLED=1 supabase --workdir "$dryrun_root" stop >"$logs_dir/stack-stop.log" 2>&1
    stop_status=$?
    if [[ $stop_status -eq 0 ]]; then
      stack_stop_result="PASS"
    else
      stack_stop_result="FAIL"
    fi
  fi
  {
    echo "stack_stop=$stack_stop_result"
    echo "evidence_directory=$dryrun_root"
  } >>"$summary_file"
  echo "Evidence preserved at: $dryrun_root"
  if [[ $incoming_status -ne 0 ]]; then
    exit "$incoming_status"
  fi
  if [[ "$stack_stop_result" != "PASS" ]]; then
    exit 1
  fi
  exit "$final_exit"
}
trap stop_stack EXIT

cp "$REPO_ROOT/supabase/config.toml" "$temp_supabase/config.toml"
for migration_file in "${migration_files[@]}"; do
  cp "$migration_file" "$temp_supabase/migrations/$(basename "$migration_file")"
done
cp "$FIXTURE_ROOT"/*.sql "$temp_tests/"

config_file="$temp_supabase/config.toml"
replace_config() {
  local from="$1"
  local to="$2"
  sed "s|$from|$to|g" "$config_file" >"$config_file.next"
  mv "$config_file.next" "$config_file"
}
replace_config 'project_id = "care-continuity-mvp-engine-implementatio"' "project_id = \"$project_id\""
replace_config '54320' '58320'
replace_config '54321' '58321'
replace_config '54322' '58322'
replace_config '54323' '58323'
replace_config '54324' '58324'
replace_config '54325' '58325'
replace_config '54326' '58326'
replace_config '54327' '58327'
replace_config '54328' '58328'
replace_config '54329' '58329'

if find "$dryrun_root" -name '.env*' -o -name '.temp' -o -name 'project-ref' | grep -q .; then
  echo "BLOCKED: forbidden environment or remote-link material entered temporary root" >&2
  exit 2
fi

{
  echo "project_id=$project_id"
  echo "ports=58320-58329"
  echo "sql_draft_sha256=$actual_draft_sha"
  echo "formal_migration=$FORMAL_MIGRATION_PATH"
  echo "formal_migration_sha256=$actual_formal_sha"
  echo "draft_formal_byte_comparison=PASS"
  echo "migration_apply=NOT_RUN"
} >"$summary_file"

if ! SUPABASE_TELEMETRY_DISABLED=1 supabase --workdir "$dryrun_root" start 2>&1 \
  | sed -E '/(DB_URL|API_URL|REST_URL|GRAPHQL_URL|FUNCTIONS_URL|MCP_URL|STUDIO_URL|PUBLISHABLE_KEY|SECRET_KEY|JWT_SECRET|ANON_KEY|SERVICE_ROLE_KEY|MAILPIT_URL|INBUCKET_URL|STORAGE_S3_URL|S3_PROTOCOL_ACCESS_KEY)/d' \
  >"$logs_dir/migration-start.log"; then
  echo "migration_apply=FAIL" >>"$summary_file"
  echo "FAIL: isolated Supabase start or migration apply failed" >&2
  exit 1
fi
stack_started=1
sed 's/migration_apply=NOT_RUN/migration_apply=PASS/' "$summary_file" >"$summary_file.next"
mv "$summary_file.next" "$summary_file"

db_container="supabase_db_$project_id"
run_sql() {
  local sql_file="$1"
  local log_file="$2"
  docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <"$sql_file" >"$log_file" 2>&1
}

run_sql "$temp_tests/core.sql" "$logs_dir/core.log"
run_sql "$temp_tests/security-regression.sql" "$logs_dir/security-regression.log"
run_sql "$temp_tests/structural.sql" "$logs_dir/structural.log"

set +e
docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <"$temp_tests/concurrency-session-a.sql" >"$logs_dir/concurrency-a.log" 2>&1 &
session_a_pid=$!
docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres <"$temp_tests/concurrency-session-b.sql" >"$logs_dir/concurrency-b.log" 2>&1 &
session_b_pid=$!
wait "$session_a_pid"
session_a_status=$?
wait "$session_b_pid"
session_b_status=$?
set -e

docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -v session_a_status="$session_a_status" -v session_b_status="$session_b_status" \
  <"$temp_tests/concurrency-assertions.sql" >"$logs_dir/concurrency-assertions.log" 2>&1

run_sql "$temp_tests/inventory.sql" "$logs_dir/inventory.log"
docker exec "$db_container" psql -X -At -U postgres -d postgres \
  -c "select outcome,count(*) from v2_access_harness.results group by outcome order by outcome" >"$logs_dir/result-counts.log"
docker exec "$db_container" psql -X -At -U postgres -d postgres \
  -c "select test_name||'|'||outcome||'|'||detail from v2_access_harness.results order by test_name" >"$logs_dir/71-test-details.log"

pass_count="$(awk -F'|' '$1=="PASS" {print $2}' "$logs_dir/result-counts.log")"
fail_count="$(awk -F'|' '$1=="FAIL" {print $2}' "$logs_dir/result-counts.log")"
skip_count="$(awk -F'|' '$1=="SKIP" {print $2}' "$logs_dir/result-counts.log")"
blocked_count="$(awk -F'|' '$1=="BLOCKED" {print $2}' "$logs_dir/result-counts.log")"
pass_count="${pass_count:-0}"
fail_count="${fail_count:-0}"
skip_count="${skip_count:-0}"
blocked_count="${blocked_count:-0}"
total_count=$((pass_count + fail_count + skip_count + blocked_count))

{
  echo "pass=$pass_count"
  echo "fail=$fail_count"
  echo "skip=$skip_count"
  echo "blocked=$blocked_count"
  echo "total=$total_count"
  echo "concurrency_session_a_exit=$session_a_status"
  echo "concurrency_session_b_exit=$session_b_status"
  echo "inventory_begin"
  sed -n '1,40p' "$logs_dir/inventory.log"
  echo "inventory_end"
} >>"$summary_file"

if [[ "$pass_count" -eq 71 && "$fail_count" -eq 0 && "$skip_count" -eq 0 && "$blocked_count" -eq 0 && "$total_count" -eq 71 ]]; then
  final_exit=0
  echo "Harness result: PASS (71 PASS / 0 FAIL / 0 SKIP / 0 BLOCKED)"
else
  final_exit=1
  echo "Harness result: FAIL ($pass_count PASS / $fail_count FAIL / $skip_count SKIP / $blocked_count BLOCKED)" >&2
fi
