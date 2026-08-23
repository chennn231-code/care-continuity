import { assignmentSupportModeMatchesTask, type AssignmentTimeScope } from '../assignments/assignmentContract';
import type { BackupAssignmentRow } from '../lib/backupAssignments';
import type { CurrentAssignmentRow } from '../lib/currentAssignments';
import type { NormalizedTaskInput, OccurrencePattern, SupportMode } from './taskContract';

export interface TaskDependencyIssue {
  kind: 'CURRENT' | 'BACKUP';
  sourceId: string;
  reason: string;
}

function scopeMatchesPattern(scope: AssignmentTimeScope, pattern: OccurrencePattern) {
  if ('mode' in scope) return scope.mode === 'SAME_AS_TASK_PATTERN';
  if (pattern.type === 'AS_NEEDED' || pattern.type === 'ONCE') return false;
  if (scope.scheduled_times?.some((time) => !pattern.scheduled_times.includes(time))) return false;
  if (scope.weekdays) {
    if (pattern.type !== 'WEEKLY') return false;
    if (scope.weekdays.some((day) => !pattern.weekdays.includes(day))) return false;
  }
  return Boolean(scope.scheduled_times?.length || scope.weekdays?.length);
}

function modesMatchTask(modes: SupportMode[], required: SupportMode[]) {
  return modes.some((mode) => assignmentSupportModeMatchesTask(mode, required));
}

export function validateTaskDependencies(
  nextTask: Pick<NormalizedTaskInput, 'occurrence_pattern' | 'required_support_modes'>,
  currents: CurrentAssignmentRow[],
  backups: BackupAssignmentRow[]
) {
  const issues: TaskDependencyIssue[] = [];

  for (const current of currents) {
    if (!scopeMatchesPattern(current.time_scope, nextTask.occurrence_pattern)) {
      issues.push({ kind: 'CURRENT', sourceId: current.care_source_id, reason: '負責日期或時間不再屬於修改後的工作' });
    } else if (!modesMatchTask(current.support_modes, nextTask.required_support_modes)) {
      issues.push({ kind: 'CURRENT', sourceId: current.care_source_id, reason: '實際協助形式不符合修改後的工作需求' });
    }
  }

  for (const backup of backups) {
    if (backup.confirmation_status === 'POSSIBLE') continue;
    if (!backup.time_scope || !scopeMatchesPattern(backup.time_scope, nextTask.occurrence_pattern)) {
      issues.push({ kind: 'BACKUP', sourceId: backup.care_source_id, reason: '可接手日期或時間不再屬於修改後的工作' });
    } else if (!modesMatchTask(backup.support_modes_committed, nextTask.required_support_modes)) {
      issues.push({ kind: 'BACKUP', sourceId: backup.care_source_id, reason: '已確認的協助形式不符合修改後的工作需求' });
    }
  }

  return issues;
}

export function describeTaskDependencyIssues(
  issues: TaskDependencyIssue[],
  sourceNames: Map<string, string>
) {
  const lines = issues.map((issue) => {
    const kind = issue.kind === 'CURRENT' ? '目前分工' : '備援安排';
    return `${kind}「${sourceNames.get(issue.sourceId) ?? '未命名照顧來源'}」：${issue.reason}`;
  });
  return `這次修改會讓既有安排失效，請先調整以下資料：\n${lines.join('\n')}`;
}
