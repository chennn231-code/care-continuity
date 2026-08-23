import { describe, expect, it } from 'vitest';
import {
  buildScenarioHandoffPresentation,
  combineScenarioOccurrencePresentation,
  loadScenarioHandoffs,
  SCENARIO_HANDOFF_CTA_LABELS,
  summarizeScenarioHandoffs
} from '../src/scenario/scenarioPresentation';
import type { CareTaskRow } from '../src/lib/careTasks';
import type { TaskHandoffRecordContract } from '../src/handoffs/handoffContract';

const task = (taskId: string): CareTaskRow => ({
  task_id: taskId, care_receiver_id: 'receiver', title: '用藥協助', category: 'MEDICATION',
  occurrence_pattern: { type: 'DAILY', scheduled_times: ['08:00'] }, required_support_modes: ['ON_SITE'],
  is_active: true, created_at: '2026-08-23T00:00:00Z'
});

const handoff = (taskId: string, details: TaskHandoffRecordContract['details']): TaskHandoffRecordContract => ({
  handoff_id: `handoff-${taskId}`, task_id: taskId, details, additional_notes: null,
  created_at: '2026-08-23T00:00:00Z', updated_at: '2026-08-23T00:00:00Z', reviewed_at: null,
  review_interval_days: 14
});

describe('scenario handoff presentation', () => {
  it('treats a successful query with no handoff as NOT_PREPARED', () => {
    expect(buildScenarioHandoffPresentation(task('a'), null).readiness).toBe('NOT_PREPARED');
  });

  it('keeps incomplete validated handoff as NEEDS_DETAILS', () => {
    expect(buildScenarioHandoffPresentation(task('a'), handoff('a', {})).readiness).toBe('NEEDS_DETAILS');
  });

  it('presents complete handoff as READY_TO_SHARE regardless of reminder freshness', () => {
    const record = handoff('a', {
      official_information_ready: true,
      official_information_location: '餐桌抽屜',
      assistance_types: ['REMINDER']
    });
    record.updated_at = '2025-01-01T00:00:00Z';
    record.review_interval_days = 14;
    expect(buildScenarioHandoffPresentation(task('a'), record).readiness).toBe('READY_TO_SHARE');
  });

  it('counts repeated occurrences of the same task only once', () => {
    const a = buildScenarioHandoffPresentation(task('a'), null);
    const b = buildScenarioHandoffPresentation(task('b'), handoff('b', {}));
    expect(summarizeScenarioHandoffs(['a', 'a', 'b'], new Map([['a', a], ['b', b]]))).toEqual({
      NOT_PREPARED: 1, NEEDS_DETAILS: 1, READY_TO_SHARE: 0
    });
  });

  it('uses the same task-level readiness for scheduled and AS_NEEDED presentation', () => {
    const presentation = buildScenarioHandoffPresentation(task('a'), null);
    expect(summarizeScenarioHandoffs(['a'], new Map([['a', presentation]])).NOT_PREPARED).toBe(1);
  });

  it('provides the expected deep-link CTA labels for every readiness state', () => {
    expect(SCENARIO_HANDOFF_CTA_LABELS).toEqual({
      NOT_PREPARED: '整理交接資訊', NEEDS_DETAILS: '補充交接資訊', READY_TO_SHARE: '查看交接資訊'
    });
  });

  it.each([
    ['COVERED', 'NOT_PREPARED'],
    ['COVERED', 'READY_TO_SHARE'],
    ['NEEDS_CONFIRMATION', 'NEEDS_DETAILS'],
    ['COORDINATION_ONLY', 'READY_TO_SHARE'],
    ['UNPREPARED', 'READY_TO_SHARE']
  ] as const)('keeps %s coverage independent from %s handoff readiness', (coverageStatus, readiness) => {
    expect(combineScenarioOccurrencePresentation(
      { status: coverageStatus },
      { taskId: 'a', readiness, updatedAt: null, reviewedAt: null }
    )).toEqual({ coverageStatus, handoffReadiness: readiness });
  });

  it('isolates a handoff query failure from scenario coverage data', async () => {
    const result = await loadScenarioHandoffs([task('a')], async () => { throw new Error('offline'); });
    expect(result).toEqual({ handoffs: [], failed: true });
  });
});
