import { describe, expect, it } from 'vitest';
import { validateTaskDependencies } from '../src/tasks/taskDependencyValidation';
import type { CurrentAssignmentRow } from '../src/lib/currentAssignments';
import type { BackupAssignmentRow } from '../src/lib/backupAssignments';

const current = (overrides: Partial<CurrentAssignmentRow> = {}): CurrentAssignmentRow => ({
  assignment_id: 'a', task_id: 'task', care_source_id: 'current-source', participation_type: 'REGULAR',
  time_scope: { scheduled_times: ['12:00'] }, support_modes: ['ON_SITE'], created_at: '', ...overrides
});
const backup = (overrides: Partial<BackupAssignmentRow> = {}): BackupAssignmentRow => ({
  backup_id: 'b', task_id: 'task', care_source_id: 'backup-source', confirmation_status: 'CONFIRMED_WITH_LIMITS',
  time_scope: { scheduled_times: ['12:00'] }, support_modes_committed: ['ON_SITE'], updated_at: '', ...overrides
});
const nextTask = { occurrence_pattern: { type: 'DAILY' as const, scheduled_times: ['08:00'] }, required_support_modes: ['ON_SITE' as const] };

describe('task dependency validation', () => {
  it('blocks a current scope that the edited task removes', () => expect(validateTaskDependencies(nextTask, [current()], [])).toMatchObject([{ kind: 'CURRENT' }]));
  it('blocks a limited backup scope that the edited task removes', () => expect(validateTaskDependencies(nextTask, [], [backup()])).toMatchObject([{ kind: 'BACKUP' }]));
  it('blocks incompatible current and confirmed backup support modes', () => {
    const remoteTask = { ...nextTask, required_support_modes: ['REMOTE_COORDINATION' as const] };
    expect(validateTaskDependencies(remoteTask, [current({ time_scope: { mode: 'SAME_AS_TASK_PATTERN' } })], [backup({ time_scope: { mode: 'SAME_AS_TASK_PATTERN' }, confirmation_status: 'CONFIRMED' })])).toHaveLength(2);
  });
  it('keeps full-scope compatible dependencies valid', () => expect(validateTaskDependencies(nextTask, [current({ time_scope: { mode: 'SAME_AS_TASK_PATTERN' } })], [backup({ time_scope: { mode: 'SAME_AS_TASK_PATTERN' }, confirmation_status: 'CONFIRMED' })])).toEqual([]));
  it('keeps POSSIBLE backup valid because time and ability remain unknown', () => expect(validateTaskDependencies(nextTask, [], [backup({ confirmation_status: 'POSSIBLE', time_scope: null, support_modes_committed: [] })])).toEqual([]));
});
