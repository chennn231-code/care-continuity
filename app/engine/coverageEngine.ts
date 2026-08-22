export type SupportMode = 'ON_SITE' | 'REMOTE_COORDINATION' | 'FLEXIBLE';
export type ConfirmationStatus = 'POSSIBLE' | 'CONFIRMED_WITH_LIMITS' | 'CONFIRMED';
export type CoverageStatus = 'COVERED' | 'NEEDS_CONFIRMATION' | 'UNPREPARED' | 'COORDINATION_ONLY';
export type DurationMode = 'EXPLICIT_RANGE' | 'UNKNOWN';

export interface TimeScope {
  mode?: 'SAME_AS_TASK_PATTERN';
  dates?: string[];
  weekdays?: string[];
  time_blocks?: string[];
}

export interface CareTask {
  task_id: string;
  occurrence_pattern: {
    type: 'DAILY' | 'WEEKLY' | 'AS_NEEDED';
    time_blocks?: string[];
    weekdays?: string[];
  };
  required_support_modes: SupportMode[];
}

export interface CurrentAssignment {
  task_id: string;
  care_source_id: string;
  participation_type: 'REGULAR' | 'OCCASIONAL';
  time_scope?: TimeScope | null;
  support_modes: SupportMode[];
}

export interface BackupAssignment {
  task_id: string;
  care_source_id: string;
  confirmation_status: ConfirmationStatus;
  time_scope?: TimeScope | null;
  support_modes_committed: SupportMode[];
}

export interface CareScenario {
  unavailable_care_source_id: string;
  duration_mode: DurationMode;
  valid_from: string | null;
  valid_until: string | null;
}

export interface TaskOccurrence {
  task_id: string;
  date: string | null;
  time_block: string;
  weekday?: string;
  required_support_modes: SupportMode[];
}

export interface OccurrenceEvaluation extends TaskOccurrence {
  status: CoverageStatus;
  source_id?: string;
  candidate_ids?: string[];
  reason: string;
}

export interface CoverageEvaluationResult {
  engine_version: '1.5-MVP';
  summary: {
    covered: number;
    needs_confirmation: number;
    unprepared: number;
    coordination_only: number;
  };
  details: OccurrenceEvaluation[];
}

export function supportModeMatches(provided: SupportMode[], required: SupportMode[]): boolean {
  if (required.includes('FLEXIBLE')) return provided.length > 0;
  return provided.some(mode => required.includes(mode));
}

export function timeMatches(timeScope: TimeScope | null | undefined, occurrence: TaskOccurrence): boolean {
  if (!timeScope || timeScope.mode === 'SAME_AS_TASK_PATTERN') return true;

  if (occurrence.time_block === 'AS_NEEDED') {
    if (timeScope.dates || timeScope.weekdays || timeScope.time_blocks) return false;
    return true;
  }

  if (timeScope.dates && occurrence.date && !timeScope.dates.includes(occurrence.date)) return false;
  if (timeScope.weekdays && occurrence.weekday && !timeScope.weekdays.includes(occurrence.weekday)) return false;
  if (timeScope.time_blocks && !timeScope.time_blocks.includes(occurrence.time_block)) return false;
  return true;
}

export function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  const startDate = startDateStr.slice(0, 10);
  const endDate = endDateStr.slice(0, 10);
  const dates: string[] = [];
  let curr = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export function expandOccurrences(tasks: CareTask[], dates: string[]): TaskOccurrence[] {
  const occurrences: TaskOccurrence[] = [];
  const weekdayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (const task of tasks) {
    const pattern = task.occurrence_pattern;

    if (pattern.type === 'AS_NEEDED') {
      occurrences.push({
        task_id: task.task_id,
        date: null,
        time_block: 'AS_NEEDED',
        required_support_modes: task.required_support_modes
      });
      continue;
    }

    for (const dateStr of dates) {
      const dayOfWeek = weekdayNames[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
      if (pattern.type === 'WEEKLY' && pattern.weekdays && !pattern.weekdays.includes(dayOfWeek)) continue;

      for (const block of pattern.time_blocks ?? []) {
        occurrences.push({
          task_id: task.task_id,
          date: dateStr,
          time_block: block,
          weekday: dayOfWeek,
          required_support_modes: task.required_support_modes
        });
      }
    }
  }

  return occurrences;
}

export function evaluateOccurrence(
  occurrence: TaskOccurrence,
  scenario: CareScenario,
  currents: CurrentAssignment[],
  backups: BackupAssignment[]
): { status: CoverageStatus; source_id?: string; candidate_ids?: string[]; reason: string } {
  const unavailableId = scenario.unavailable_care_source_id;

  const validCurrent = currents.find(c =>
    c.task_id === occurrence.task_id &&
    c.care_source_id !== unavailableId &&
    c.participation_type === 'REGULAR' &&
    timeMatches(c.time_scope, occurrence) &&
    supportModeMatches(c.support_modes, occurrence.required_support_modes)
  );

  if (validCurrent) {
    return { status: 'COVERED', source_id: validCurrent.care_source_id, reason: 'CURRENT_REGULAR_MATCH' };
  }

  const validBackup = backups.find(b =>
    b.task_id === occurrence.task_id &&
    (b.confirmation_status === 'CONFIRMED' || b.confirmation_status === 'CONFIRMED_WITH_LIMITS') &&
    timeMatches(b.time_scope, occurrence) &&
    supportModeMatches(b.support_modes_committed, occurrence.required_support_modes)
  );

  if (validBackup) {
    return { status: 'COVERED', source_id: validBackup.care_source_id, reason: 'CONFIRMED_BACKUP_MATCH' };
  }

  const coordinationBackup = backups.find(b =>
    b.task_id === occurrence.task_id &&
    (b.confirmation_status === 'CONFIRMED' || b.confirmation_status === 'CONFIRMED_WITH_LIMITS') &&
    timeMatches(b.time_scope, occurrence) &&
    occurrence.required_support_modes.includes('ON_SITE') &&
    b.support_modes_committed.includes('REMOTE_COORDINATION')
  );

  if (coordinationBackup) {
    return { status: 'COORDINATION_ONLY', source_id: coordinationBackup.care_source_id, reason: 'REMOTE_COORDINATION_ONLY' };
  }

  const candidates = new Set<string>();

  for (const b of backups) {
    if (b.task_id !== occurrence.task_id || b.confirmation_status !== 'POSSIBLE') continue;
    // POSSIBLE may intentionally have unknown capability in MVP; it is evidence of a candidate, not coverage.
    candidates.add(b.care_source_id);
  }

  for (const c of currents) {
    if (
      c.task_id === occurrence.task_id &&
      c.care_source_id !== unavailableId &&
      c.participation_type === 'OCCASIONAL' &&
      timeMatches(c.time_scope, occurrence)
    ) {
      candidates.add(c.care_source_id);
    }
  }

  if (candidates.size > 0) {
    return {
      status: 'NEEDS_CONFIRMATION',
      candidate_ids: [...candidates],
      reason: 'UNCONFIRMED_CANDIDATES_EXIST'
    };
  }

  return { status: 'UNPREPARED', reason: 'NO_AVAILABLE_RESOURCE' };
}

export function evaluateScenario(
  tasks: CareTask[],
  scenario: CareScenario,
  currents: CurrentAssignment[],
  backups: BackupAssignment[]
): CoverageEvaluationResult {
  if (scenario.duration_mode === 'UNKNOWN' || !scenario.valid_from || !scenario.valid_until) {
    throw new Error('UNKNOWN_DURATION_REQUIRES_PROJECTION');
  }

  const dates = generateDateRange(scenario.valid_from, scenario.valid_until);
  const occurrences = expandOccurrences(tasks, dates);
  const details: OccurrenceEvaluation[] = occurrences.map(occurrence => ({
    ...occurrence,
    ...evaluateOccurrence(occurrence, scenario, currents, backups)
  }));

  return {
    engine_version: '1.5-MVP',
    summary: {
      covered: details.filter(x => x.status === 'COVERED').length,
      needs_confirmation: details.filter(x => x.status === 'NEEDS_CONFIRMATION').length,
      unprepared: details.filter(x => x.status === 'UNPREPARED').length,
      coordination_only: details.filter(x => x.status === 'COORDINATION_ONLY').length
    },
    details
  };
}
