export const TASK_CATEGORIES = ['MEDICATION', 'MEAL', 'TOILETING', 'BATHING', 'MOBILITY', 'MEDICAL', 'NIGHT_CARE', 'TRANSPORT', 'OTHER'] as const;
export const OCCURRENCE_TYPES = ['DAILY', 'WEEKLY', 'AS_NEEDED'] as const;
export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const SUPPORT_MODES = ['ON_SITE', 'REMOTE_COORDINATION', 'FLEXIBLE'] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type OccurrenceType = (typeof OCCURRENCE_TYPES)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export type SupportMode = (typeof SUPPORT_MODES)[number];
export type OccurrencePattern =
  | { type: 'DAILY'; scheduled_times: string[] }
  | { type: 'WEEKLY'; weekdays: Weekday[]; scheduled_times: string[] }
  | { type: 'AS_NEEDED' };

export interface TaskFormValues {
  title: string;
  category: TaskCategory;
  occurrenceType: OccurrenceType;
  scheduledTimes: string[];
  weekdays: Weekday[];
  supportMode: SupportMode;
}
export interface NormalizedTaskInput {
  title: string;
  category: TaskCategory;
  occurrence_pattern: OccurrencePattern;
  required_support_modes: SupportMode[];
  is_active: true;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  MEDICATION: '用藥協助', MEAL: '備餐／進食', TOILETING: '如廁', BATHING: '洗澡',
  MOBILITY: '移動／移位', MEDICAL: '就醫相關', NIGHT_CARE: '夜間需求', TRANSPORT: '交通接送', OTHER: '其他'
};
export const OCCURRENCE_TYPE_LABELS: Record<OccurrenceType, string> = { DAILY: '每天', WEEKLY: '每週特定日', AS_NEEDED: '視需要' };
export const WEEKDAY_LABELS: Record<Weekday, string> = { MON: '一', TUE: '二', WED: '三', THU: '四', FRI: '五', SAT: '六', SUN: '日' };
export const SUPPORT_MODE_LABELS: Record<SupportMode, string> = {
  ON_SITE: '需要有人到現場', REMOTE_COORDINATION: '可以遠端協調完成', FLEXIBLE: '現場或遠端皆可'
};
export class TaskValidationError extends Error {}

export function isValidScheduledTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function normalizeScheduledTimes(values: string[]) {
  if (values.some((value) => !isValidScheduledTime(value))) {
    throw new TaskValidationError('時間必須是 00:00–23:59 的 24 小時制格式。');
  }
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
function orderedValues<T extends string>(contract: readonly T[], values: T[]) {
  const selected = new Set(values);
  return contract.filter((value) => selected.has(value));
}
export function normalizeTaskInput(values: TaskFormValues): NormalizedTaskInput {
  const title = values.title.trim();
  if (!title) throw new TaskValidationError('請輸入具體的照顧工作名稱。');
  if (title.length > 150) throw new TaskValidationError('任務名稱不可超過 150 個字。');
  const times = normalizeScheduledTimes(values.scheduledTimes);
  const weekdays = orderedValues(WEEKDAYS, values.weekdays);
  let occurrence_pattern: OccurrencePattern;
  if (values.occurrenceType === 'AS_NEEDED') occurrence_pattern = { type: 'AS_NEEDED' };
  else if (values.occurrenceType === 'DAILY') {
    if (!times.length) throw new TaskValidationError('每天發生的工作至少需要設定一個時間。');
    occurrence_pattern = { type: 'DAILY', scheduled_times: times };
  } else {
    if (!weekdays.length) throw new TaskValidationError('每週工作至少需要選擇一天。');
    if (!times.length) throw new TaskValidationError('每週工作至少需要設定一個時間。');
    occurrence_pattern = { type: 'WEEKLY', weekdays, scheduled_times: times };
  }
  return { title, category: values.category, occurrence_pattern, required_support_modes: [values.supportMode], is_active: true };
}
export function describeOccurrence(pattern: OccurrencePattern) {
  if (pattern.type === 'AS_NEEDED') return '視需要｜非固定時間';
  const times = pattern.scheduled_times.join('、');
  if (pattern.type === 'DAILY') return `每天｜${times}`;
  return `${pattern.weekdays.map((day) => `週${WEEKDAY_LABELS[day]}`).join('、')}｜${times}`;
}
// MVP limitation: all scheduled times are interpreted in Asia/Taipei.
