import {
  ASSIGNMENT_SUPPORT_MODE_LABELS,
  describeAssignmentScope,
  type AssignmentTimeScope
} from '../assignments/assignmentContract';
import {
  SUPPORT_MODES,
  WEEKDAYS,
  normalizeScheduledTimes,
  type OccurrencePattern,
  type SupportMode,
  type Weekday
} from '../tasks/taskContract';

export const BACKUP_CONFIRMATION_STATUSES = ['POSSIBLE', 'CONFIRMED', 'CONFIRMED_WITH_LIMITS'] as const;
export type BackupConfirmationStatus = (typeof BACKUP_CONFIRMATION_STATUSES)[number];
export interface BackupTaskContract { occurrence_pattern: OccurrencePattern; required_support_modes: SupportMode[]; }
export interface BackupFormValues {
  careSourceId: string;
  confirmationStatus: BackupConfirmationStatus;
  weekdays: Weekday[];
  scheduledTimes: string[];
  supportModes: SupportMode[];
}
export interface NormalizedBackupInput {
  care_source_id: string;
  confirmation_status: BackupConfirmationStatus;
  time_scope: AssignmentTimeScope | null;
  support_modes_committed: SupportMode[];
}

export const BACKUP_STATUS_LABELS: Record<BackupConfirmationStatus, string> = {
  POSSIBLE: '可能可以協助｜尚未確認',
  CONFIRMED: '已與對方確認，可接手這項工作',
  CONFIRMED_WITH_LIMITS: '已與對方確認，但有接手限制'
};
export class BackupValidationError extends Error {}

export function eligibleBackupSources<T extends { user_id: string | null }>(sources: T[], authenticatedUserId: string) {
  return sources.filter((source) => source.user_id !== authenticatedUserId);
}

function sortedWeekdaySubset(selectedValues: Weekday[], allowedValues: readonly Weekday[]) {
  const selected = new Set(selectedValues);
  const allowed = new Set(allowedValues);
  if ([...selected].some((value) => !allowed.has(value))) throw new BackupValidationError('備援範圍包含不屬於這項工作的日期');
  return WEEKDAYS.filter((value) => selected.has(value));
}

export function normalizeBackupInput(task: BackupTaskContract, values: BackupFormValues): NormalizedBackupInput {
  if (!values.careSourceId) throw new BackupValidationError('請選擇備援人選或服務');
  if (!BACKUP_CONFIRMATION_STATUSES.includes(values.confirmationStatus)) throw new BackupValidationError('請選擇有效的確認狀態');
  if (values.confirmationStatus === 'POSSIBLE') return {
    care_source_id: values.careSourceId,
    confirmation_status: 'POSSIBLE',
    time_scope: null,
    support_modes_committed: []
  };

  const supportModes = SUPPORT_MODES.filter((mode) => new Set(values.supportModes).has(mode));
  if (!supportModes.length) throw new BackupValidationError('已確認的備援安排至少需要選擇一種協助形式');
  if (values.supportModes.some((mode) => !SUPPORT_MODES.includes(mode))) throw new BackupValidationError('備援安排包含無效的協助形式');
  if (values.confirmationStatus === 'CONFIRMED') return {
    care_source_id: values.careSourceId,
    confirmation_status: 'CONFIRMED',
    time_scope: { mode: 'SAME_AS_TASK_PATTERN' },
    support_modes_committed: supportModes
  };

  const pattern = task.occurrence_pattern;
  if (pattern.type === 'AS_NEEDED' || pattern.type === 'ONCE') throw new BackupValidationError('非固定需求或特定日期工作不能設定有時間限制的備援安排');
  let scheduledTimes: string[];
  try { scheduledTimes = normalizeScheduledTimes(values.scheduledTimes); }
  catch { throw new BackupValidationError('備援時間必須是有效的 24 小時制時間'); }
  if (scheduledTimes.some((time) => !pattern.scheduled_times.includes(time))) throw new BackupValidationError('備援範圍包含不屬於這項工作的時間');
  if (pattern.type === 'DAILY') {
    if (!scheduledTimes.length) throw new BackupValidationError('有條件接手每天工作時，至少需要選擇一個時間');
    return { care_source_id: values.careSourceId, confirmation_status: 'CONFIRMED_WITH_LIMITS', time_scope: { scheduled_times: scheduledTimes }, support_modes_committed: supportModes };
  }
  const weekdays = sortedWeekdaySubset(values.weekdays, pattern.weekdays);
  if (!weekdays.length && !scheduledTimes.length) throw new BackupValidationError('有條件接手每週工作時，至少需要選擇日期或時間');
  return {
    care_source_id: values.careSourceId,
    confirmation_status: 'CONFIRMED_WITH_LIMITS',
    time_scope: { ...(weekdays.length ? { weekdays } : {}), ...(scheduledTimes.length ? { scheduled_times: scheduledTimes } : {}) },
    support_modes_committed: supportModes
  };
}

export function describeBackupArrangement(status: BackupConfirmationStatus, scope: AssignmentTimeScope | null, modes: SupportMode[]) {
  if (status === 'POSSIBLE') return BACKUP_STATUS_LABELS.POSSIBLE;
  const scopeLabel = scope ? describeAssignmentScope(scope) : '時間範圍無效';
  return `${BACKUP_STATUS_LABELS[status]} · ${scopeLabel} · ${modes.map((mode) => ASSIGNMENT_SUPPORT_MODE_LABELS[mode]).join('、')}`;
}
