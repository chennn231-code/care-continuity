import { describe, expect, it } from 'vitest';
import { buildCustomScenarioInterval, buildScenarioInterval, describeScenarioInterval, runPrimaryCaregiverScenario, ScenarioContractError } from '../src/scenario/scenarioContract';
import type { CareTaskRow } from '../src/lib/careTasks';
import type { CareSourceRow } from '../src/lib/careSources';
import type { CurrentAssignmentRow } from '../src/lib/currentAssignments';
import type { BackupAssignmentRow } from '../src/lib/backupAssignments';

const task = (id: string, pattern: CareTaskRow['occurrence_pattern']): CareTaskRow => ({ task_id: id, care_receiver_id: 'receiver', title: id, category: 'OTHER', occurrence_pattern: pattern, required_support_modes: ['ON_SITE'], is_active: true, created_at: '' });
const source = (id: string, user_id: string | null): CareSourceRow => ({ care_source_id: id, care_receiver_id: 'receiver', display_name: id, source_type: 'FAMILY_MEMBER', user_id, created_at: '' });
const assignment = (task_id: string, care_source_id: string, participation_type: CurrentAssignmentRow['participation_type'] = 'REGULAR'): CurrentAssignmentRow => ({ assignment_id: `${task_id}-${care_source_id}`, task_id, care_source_id, participation_type, time_scope: { mode: 'SAME_AS_TASK_PATTERN' }, support_modes: ['ON_SITE'], created_at: '' });
const backup = (task_id: string, care_source_id: string, overrides: Partial<BackupAssignmentRow> = {}): BackupAssignmentRow => ({ backup_id: `backup-${task_id}-${care_source_id}`, task_id, care_source_id, confirmation_status: 'CONFIRMED', time_scope: { mode: 'SAME_AS_TASK_PATTERN' }, support_modes_committed: ['ON_SITE'], updated_at: '', ...overrides });
const base = {
  tasks: [task('medication', { type: 'DAILY', scheduled_times: ['08:00', '15:00', '22:00'] }), task('urgent', { type: 'AS_NEEDED' })],
  sources: [source('me', 'user-a'), source('service', null), source('helper', null)],
  assignments: [assignment('medication', 'me'), assignment('medication', 'service'), assignment('urgent', 'me')],
  backups: [],
  authenticatedUserId: 'user-a', startLocal: '2026-08-25T14:00', durationHours: 24 as const
};

describe('Gate 06 scenario adapter', () => {
  it('resolves self source and keeps independent REGULAR coverage', () => expect(runPrimaryCaregiverScenario(base).details.every((item) => item.status === 'COVERED')).toBe(true));
  it('throws when self source is missing instead of guessing', () => expect(() => runPrimaryCaregiverScenario({ ...base, sources: [source('family', null)] })).toThrow(ScenarioContractError));
  it('throws when self source is ambiguous', () => expect(() => runPrimaryCaregiverScenario({ ...base, sources: [source('me', 'user-a'), source('duplicate', 'user-a')] })).toThrow('多個主要照顧者'));
  it.each([[24, '2026-08-26T14:00:00+08:00'], [72, '2026-08-28T14:00:00+08:00'], [168, '2026-09-01T14:00:00+08:00']] as const)('builds %ih exact interval', (hours, end) => expect(buildScenarioInterval('2026-08-25T14:00', hours)).toEqual({ valid_from: '2026-08-25T14:00:00+08:00', valid_until: end }));
  it('produces UNPREPARED when only self handled scheduled task', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me')] }); expect(result.details.every((item) => item.status === 'UNPREPARED')).toBe(true); });
  it('produces NEEDS_CONFIRMATION for compatible OCCASIONAL source', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me'), assignment('medication', 'helper', 'OCCASIONAL')] }); expect(result.details.every((item) => item.status === 'NEEDS_CONFIRMATION')).toBe(true); });
  it('keeps AS_NEEDED outside scheduled timeline', () => { const result = runPrimaryCaregiverScenario(base); expect(result.unscheduled_considerations).toHaveLength(1); expect(result.unscheduled_considerations[0]).not.toHaveProperty('scheduled_at'); });
  it('rejects noncanonical assignment scope', () => expect(() => runPrimaryCaregiverScenario({ ...base, assignments: [{ ...assignment('medication', 'service'), time_scope: {} }] })).toThrow('有效的負責時間範圍'));
  it('uses CONFIRMED backup as COVERED', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me')], backups: [backup('medication', 'helper')] }); expect(result.details.every((item) => item.status === 'COVERED')).toBe(true); });
  it('limits CONFIRMED_WITH_LIMITS backup to matching exact times', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me')], backups: [backup('medication', 'helper', { confirmation_status: 'CONFIRMED_WITH_LIMITS', time_scope: { scheduled_times: ['15:00'] } })] }); expect(result.details.map((item) => [item.scheduled_time, item.status])).toEqual([['15:00', 'COVERED'], ['22:00', 'UNPREPARED'], ['08:00', 'UNPREPARED']]); });
  it('uses canonical POSSIBLE as NEEDS_CONFIRMATION', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me')], backups: [backup('medication', 'helper', { confirmation_status: 'POSSIBLE', time_scope: null, support_modes_committed: [] })] }); expect(result.details.every((item) => item.status === 'NEEDS_CONFIRMATION')).toBe(true); });
  it('keeps no valid backup as UNPREPARED', () => { const result = runPrimaryCaregiverScenario({ ...base, assignments: [assignment('medication', 'me')], backups: [backup('medication', 'helper', { confirmation_status: 'CONFIRMED_WITH_LIMITS', time_scope: { scheduled_times: ['08:00'] } })] }); expect(result.details.some((item) => item.status === 'UNPREPARED')).toBe(true); });
  it('accounts for every scheduled detail in the four summary statuses', () => {
    const result = runPrimaryCaregiverScenario({
      ...base,
      assignments: [assignment('medication', 'me')],
      backups: [backup('medication', 'helper', { support_modes_committed: ['REMOTE_COORDINATION'] })]
    });
    expect(result.details).toHaveLength(
      result.summary.covered + result.summary.needs_confirmation +
      result.summary.coordination_only + result.summary.unprepared
    );
    expect(result.summary.coordination_only).toBeGreaterThan(0);
  });
  it('validates and describes a custom Taipei interval', () => { const interval = buildCustomScenarioInterval('2026-09-03T08:00', '2026-09-06T18:00'); expect(interval).toEqual({ valid_from: '2026-09-03T08:00:00+08:00', valid_until: '2026-09-06T18:00:00+08:00' }); expect(describeScenarioInterval(interval)).toEqual({ start: '2026/09/03 08:00', end: '2026/09/06 18:00', durationHours: 82 }); });
  it('rejects custom end before start and periods over seven days', () => { expect(() => buildCustomScenarioInterval('2026-09-03T08:00', '2026-09-03T08:00')).toThrow('晚於'); expect(() => buildCustomScenarioInterval('2026-09-03T08:00', '2026-09-10T08:01')).toThrow('最長'); });
  it('runs an ONCE task through the adapter', () => { const result = runPrimaryCaregiverScenario({ ...base, tasks: [task('visit', { type: 'ONCE', date: '2026-08-25', scheduled_time: '15:00' })], assignments: [assignment('visit', 'me')], backups: [] }); expect(result.details).toHaveLength(1); expect(result.details[0].scheduled_at).toBe('2026-08-25T15:00:00+08:00'); });
  it('evaluates ONCE POSSIBLE and CONFIRMED backups', () => { const onceTask = task('visit', { type: 'ONCE', date: '2026-08-25', scheduled_time: '15:00' }); const possible = runPrimaryCaregiverScenario({ ...base, tasks: [onceTask], assignments: [assignment('visit', 'me')], backups: [backup('visit', 'helper', { confirmation_status: 'POSSIBLE', time_scope: null, support_modes_committed: [] })] }); const confirmed = runPrimaryCaregiverScenario({ ...base, tasks: [onceTask], assignments: [assignment('visit', 'me')], backups: [backup('visit', 'helper')] }); expect(possible.details[0].status).toBe('NEEDS_CONFIRMATION'); expect(confirmed.details[0].status).toBe('COVERED'); });
});
