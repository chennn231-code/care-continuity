import { SUPPORT_MODES, WEEKDAYS, WEEKDAY_LABELS, normalizeScheduledTimes, type OccurrencePattern, type SupportMode, type Weekday } from '../tasks/taskContract';

export const PARTICIPATION_TYPES = ['REGULAR', 'OCCASIONAL'] as const;
export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];
export type AssignmentScopeMode = 'ALL' | 'LIMITED';
export type AssignmentTimeScope = { mode: 'SAME_AS_TASK_PATTERN' } | { weekdays?: Weekday[]; scheduled_times?: string[] };
export interface AssignmentTaskContract { occurrence_pattern: OccurrencePattern; required_support_modes: SupportMode[]; }
export interface AssignmentFormValues {
  careSourceId: string; participationType: ParticipationType; scopeMode: AssignmentScopeMode;
  weekdays: Weekday[]; scheduledTimes: string[]; supportMode: SupportMode;
}
export interface NormalizedAssignmentInput {
  care_source_id: string; participation_type: ParticipationType; time_scope: AssignmentTimeScope; support_modes: SupportMode[];
}
export const PARTICIPATION_TYPE_LABELS: Record<ParticipationType, string> = { REGULAR: '固定負責', OCCASIONAL: '偶爾協助' };
export const ASSIGNMENT_SUPPORT_MODE_LABELS: Record<SupportMode, string> = { ON_SITE: '現場協助', REMOTE_COORDINATION: '遠端協調', FLEXIBLE: '彈性方式' };
export class AssignmentValidationError extends Error {}

function weekdaySubset(selectedValues: Weekday[], allowedValues: readonly Weekday[]) {
  const selected = new Set(selectedValues);
  const allowed = new Set(allowedValues);
  if ([...selected].some((value) => !allowed.has(value))) throw new AssignmentValidationError('負責範圍包含不屬於這項工作的日期或時間');
  return WEEKDAYS.filter((value) => selected.has(value));
}
export function assignmentSupportModeMatchesTask(mode: SupportMode, required: SupportMode[]) {
  return required.includes('FLEXIBLE') || required.includes(mode);
}
export function normalizeAssignmentInput(task: AssignmentTaskContract, values: AssignmentFormValues): NormalizedAssignmentInput {
  if (!values.careSourceId) throw new AssignmentValidationError('請選擇目前負責的照顧來源');
  if (!PARTICIPATION_TYPES.includes(values.participationType)) throw new AssignmentValidationError('請選擇有效的參與方式');
  if (!SUPPORT_MODES.includes(values.supportMode)) throw new AssignmentValidationError('請選擇有效的協助形式');
  if (values.participationType === 'REGULAR' && !assignmentSupportModeMatchesTask(values.supportMode, task.required_support_modes)) throw new AssignmentValidationError('固定負責的協助形式不符合這項工作的需求');
  let time_scope: AssignmentTimeScope;
  if (values.scopeMode === 'ALL') time_scope = { mode: 'SAME_AS_TASK_PATTERN' };
  else {
    const pattern = task.occurrence_pattern;
    if (pattern.type === 'AS_NEEDED' || pattern.type === 'ONCE') throw new AssignmentValidationError('視需要或特定日期的工作目前只能設定為全部時間');
    let times: string[];
    try { times = normalizeScheduledTimes(values.scheduledTimes); }
    catch { throw new AssignmentValidationError('負責時間必須是有效的 24 小時制時間'); }
    const allowedTimes = new Set(pattern.scheduled_times);
    if (times.some((time) => !allowedTimes.has(time))) throw new AssignmentValidationError('負責範圍包含不屬於這項工作的日期或時間');
    if (pattern.type === 'DAILY') {
      if (!times.length) throw new AssignmentValidationError('每天的特定範圍至少需要選擇一個時間');
      time_scope = { scheduled_times: times };
    } else {
      const weekdays = weekdaySubset(values.weekdays, pattern.weekdays);
      if (!weekdays.length && !times.length) throw new AssignmentValidationError('每週的特定範圍至少需要選擇日期或時間');
      time_scope = { ...(weekdays.length ? { weekdays } : {}), ...(times.length ? { scheduled_times: times } : {}) };
    }
  }
  return { care_source_id: values.careSourceId, participation_type: values.participationType, time_scope, support_modes: [values.supportMode] };
}
export function describeAssignmentScope(scope: AssignmentTimeScope) {
  if ('mode' in scope) return '全部時間';
  const parts: string[] = [];
  if (scope.weekdays?.length) parts.push(scope.weekdays.map((day) => `週${WEEKDAY_LABELS[day]}`).join('、'));
  if (scope.scheduled_times?.length) parts.push(scope.scheduled_times.join('、'));
  return parts.join('｜');
}
