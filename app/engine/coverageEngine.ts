export type SupportMode = 'ON_SITE' | 'REMOTE_COORDINATION' | 'FLEXIBLE';
export type ConfirmationStatus = 'POSSIBLE' | 'CONFIRMED_WITH_LIMITS' | 'CONFIRMED';
export type CoverageStatus = 'COVERED' | 'NEEDS_CONFIRMATION' | 'UNPREPARED' | 'COORDINATION_ONLY';
export type DurationMode = 'EXPLICIT_RANGE' | 'UNKNOWN';
export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type TimeScope = { mode: 'SAME_AS_TASK_PATTERN' } | { dates?: string[]; weekdays?: Weekday[]; scheduled_times?: string[] };
export type OccurrencePattern =
  | { type: 'DAILY'; scheduled_times: string[] }
  | { type: 'WEEKLY'; weekdays: Weekday[]; scheduled_times: string[] }
  | { type: 'AS_NEEDED' };

export interface CareTask { task_id: string; occurrence_pattern: OccurrencePattern; required_support_modes: SupportMode[]; }
export interface CurrentAssignment { task_id: string; care_source_id: string; participation_type: 'REGULAR' | 'OCCASIONAL'; time_scope?: TimeScope | null; support_modes: SupportMode[]; }
export interface BackupAssignment { task_id: string; care_source_id: string; confirmation_status: ConfirmationStatus; time_scope?: TimeScope | null; support_modes_committed: SupportMode[]; }
export interface CareScenario { unavailable_care_source_id: string; duration_mode: DurationMode; valid_from: string | null; valid_until: string | null; }
export interface TaskOccurrence {
  occurrence_type: 'SCHEDULED' | 'AS_NEEDED';
  task_id: string;
  date: string | null;
  scheduled_time?: string;
  scheduled_at?: string;
  weekday?: Weekday;
  required_support_modes: SupportMode[];
}
export interface OccurrenceEvaluation extends TaskOccurrence {
  status: CoverageStatus; source_id?: string; source_ids?: string[]; candidate_ids?: string[]; reason: string;
}
export interface CoverageEvaluationResult {
  engine_version: '2.0-MVP';
  timezone: 'Asia/Taipei';
  interval: '[valid_from, valid_until)';
  summary: { covered: number; needs_confirmation: number; unprepared: number; coordination_only: number; };
  details: OccurrenceEvaluation[];
  unscheduled_considerations: OccurrenceEvaluation[];
}

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEKDAYS: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function isValidScheduledTime(value: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function assertScheduledTime(value: string) { if (!isValidScheduledTime(value)) throw new Error(`INVALID_SCHEDULED_TIME:${value}`); }
export function supportModeMatches(provided: SupportMode[], required: SupportMode[]) {
  return required.includes('FLEXIBLE') ? provided.length > 0 : provided.some((mode) => required.includes(mode));
}
export function timeMatches(scope: TimeScope | null | undefined, occurrence: TaskOccurrence) {
  if (!scope || 'mode' in scope) return true;
  if (occurrence.occurrence_type === 'AS_NEEDED') return false;
  if (scope.dates && occurrence.date && !scope.dates.includes(occurrence.date)) return false;
  if (scope.weekdays && occurrence.weekday && !scope.weekdays.includes(occurrence.weekday)) return false;
  if (scope.scheduled_times && occurrence.scheduled_time && !scope.scheduled_times.includes(occurrence.scheduled_time)) return false;
  return true;
}
function taipeiDate(iso: string) { return new Date(Date.parse(iso) + TAIPEI_OFFSET_MS).toISOString().slice(0, 10); }
export function generateDateRange(startIso: string, endIso: string) {
  const dates: string[] = [];
  let current = new Date(`${taipeiDate(startIso)}T00:00:00Z`);
  const end = new Date(`${taipeiDate(endIso)}T00:00:00Z`);
  while (current <= end) { dates.push(current.toISOString().slice(0, 10)); current.setUTCDate(current.getUTCDate() + 1); }
  return dates;
}
function scheduledAt(date: string, time: string) { return `${date}T${time}:00+08:00`; }
export function expandOccurrences(tasks: CareTask[], dates: string[]) {
  const scheduled: TaskOccurrence[] = [];
  const unscheduled: TaskOccurrence[] = [];
  for (const task of tasks) {
    const pattern = task.occurrence_pattern;
    if (pattern.type === 'AS_NEEDED') {
      unscheduled.push({ occurrence_type: 'AS_NEEDED', task_id: task.task_id, date: null, required_support_modes: task.required_support_modes });
      continue;
    }
    const times = [...new Set(pattern.scheduled_times)];
    times.forEach(assertScheduledTime);
    for (const date of dates) {
      const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
      if (pattern.type === 'WEEKLY' && !pattern.weekdays.includes(weekday)) continue;
      for (const time of times.sort()) scheduled.push({
        occurrence_type: 'SCHEDULED', task_id: task.task_id, date, scheduled_time: time,
        scheduled_at: scheduledAt(date, time), weekday, required_support_modes: task.required_support_modes
      });
    }
  }
  return { scheduled, unscheduled };
}

export function evaluateOccurrence(occurrence: TaskOccurrence, scenario: CareScenario, currents: CurrentAssignment[], backups: BackupAssignment[]) {
  const validCurrents = currents.filter((current) =>
    current.task_id === occurrence.task_id && current.care_source_id !== scenario.unavailable_care_source_id &&
    current.participation_type === 'REGULAR' && timeMatches(current.time_scope, occurrence) &&
    supportModeMatches(current.support_modes, occurrence.required_support_modes)
  );
  if (validCurrents.length) {
    const sourceIds = [...new Set(validCurrents.map((current) => current.care_source_id))];
    return { status: 'COVERED' as const, source_id: sourceIds[0], source_ids: sourceIds, reason: 'CURRENT_REGULAR_MATCH' };
  }
  const validBackups = backups.filter((backup) => backup.task_id === occurrence.task_id &&
    backup.care_source_id !== scenario.unavailable_care_source_id &&
    (backup.confirmation_status === 'CONFIRMED' || backup.confirmation_status === 'CONFIRMED_WITH_LIMITS') &&
    timeMatches(backup.time_scope, occurrence) && supportModeMatches(backup.support_modes_committed, occurrence.required_support_modes));
  if (validBackups.length) {
    const sourceIds = [...new Set(validBackups.map((backup) => backup.care_source_id))];
    return { status: 'COVERED' as const, source_id: sourceIds[0], source_ids: sourceIds, reason: 'CONFIRMED_BACKUP_MATCH' };
  }
  const coordinationBackup = backups.find((backup) => backup.task_id === occurrence.task_id &&
    backup.care_source_id !== scenario.unavailable_care_source_id &&
    (backup.confirmation_status === 'CONFIRMED' || backup.confirmation_status === 'CONFIRMED_WITH_LIMITS') &&
    timeMatches(backup.time_scope, occurrence) && occurrence.required_support_modes.includes('ON_SITE') &&
    backup.support_modes_committed.includes('REMOTE_COORDINATION'));
  if (coordinationBackup) return { status: 'COORDINATION_ONLY' as const, source_id: coordinationBackup.care_source_id, reason: 'REMOTE_COORDINATION_ONLY' };

  const candidates = new Set<string>();
  for (const backup of backups) if (
    backup.task_id === occurrence.task_id && backup.care_source_id !== scenario.unavailable_care_source_id &&
    backup.confirmation_status === 'POSSIBLE'
  ) candidates.add(backup.care_source_id);
  for (const current of currents) if (
    current.task_id === occurrence.task_id && current.care_source_id !== scenario.unavailable_care_source_id &&
    current.participation_type === 'OCCASIONAL' && timeMatches(current.time_scope, occurrence) &&
    supportModeMatches(current.support_modes, occurrence.required_support_modes)
  ) candidates.add(current.care_source_id);
  if (candidates.size) return { status: 'NEEDS_CONFIRMATION' as const, candidate_ids: [...candidates], reason: 'UNCONFIRMED_CANDIDATES_EXIST' };
  return { status: 'UNPREPARED' as const, reason: 'NO_AVAILABLE_RESOURCE' };
}

export function evaluateScenario(tasks: CareTask[], scenario: CareScenario, currents: CurrentAssignment[], backups: BackupAssignment[]): CoverageEvaluationResult {
  if (scenario.duration_mode === 'UNKNOWN' || !scenario.valid_from || !scenario.valid_until) throw new Error('UNKNOWN_DURATION_REQUIRES_PROJECTION');
  const start = Date.parse(scenario.valid_from); const end = Date.parse(scenario.valid_until);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('INVALID_SCENARIO_INTERVAL');
  const expanded = expandOccurrences(tasks, generateDateRange(scenario.valid_from, scenario.valid_until));
  const scheduled = expanded.scheduled.filter((occurrence) => {
    const instant = Date.parse(occurrence.scheduled_at!);
    return instant >= start && instant < end;
  });
  const details = scheduled.map((occurrence) => ({ ...occurrence, ...evaluateOccurrence(occurrence, scenario, currents, backups) }));
  const unscheduled = expanded.unscheduled.map((occurrence) => ({ ...occurrence, ...evaluateOccurrence(occurrence, scenario, currents, backups) }));
  return {
    engine_version: '2.0-MVP', timezone: 'Asia/Taipei', interval: '[valid_from, valid_until)',
    summary: {
      covered: details.filter((item) => item.status === 'COVERED').length,
      needs_confirmation: details.filter((item) => item.status === 'NEEDS_CONFIRMATION').length,
      unprepared: details.filter((item) => item.status === 'UNPREPARED').length,
      coordination_only: details.filter((item) => item.status === 'COORDINATION_ONLY').length
    },
    details,
    unscheduled_considerations: unscheduled
  };
}
