import { describe, expect, it, vi } from 'vitest';
import { describeScenarioSources } from '../src/scenario/scenarioPresentation';
import type { OccurrenceEvaluation } from '../engine/coverageEngine';

const occurrence = (overrides: Partial<OccurrenceEvaluation>): OccurrenceEvaluation => ({
  occurrence_type: 'SCHEDULED', task_id: 'task', date: '2026-08-25', scheduled_time: '08:00',
  scheduled_at: '2026-08-25T08:00:00+08:00', required_support_modes: ['ON_SITE'],
  status: 'UNPREPARED', reason: 'test', ...overrides
});
const sources = new Map([['a', '大姐'], ['b', '居服員']]);

describe('scenario source presentation', () => {
  it('shows every matching covered source', () => expect(describeScenarioSources(occurrence({ status: 'COVERED', source_id: 'a', source_ids: ['a', 'b'] }), sources)).toBe('可持續來源：大姐、居服員'));
  it('shows every candidate requiring confirmation', () => expect(describeScenarioSources(occurrence({ status: 'NEEDS_CONFIRMATION', candidate_ids: ['b', 'a'] }), sources)).toBe('待確認：居服員、大姐'));
  it('shows the remote coordination source', () => expect(describeScenarioSources(occurrence({ status: 'COORDINATION_ONLY', source_id: 'b' }), sources)).toBe('可提供遠端協調：居服員'));
  it('uses a neutral fallback and reports a missing source id', () => {
    const warning = vi.fn();
    expect(describeScenarioSources(occurrence({ status: 'COVERED', source_id: 'missing' }), sources, warning)).toContain('未命名照顧來源');
    expect(warning).toHaveBeenCalledWith('missing');
  });
  it('describes an unprepared occurrence without implying a hidden source', () => expect(describeScenarioSources(occurrence({}), sources)).toBe('目前沒有可確認的照顧來源'));
});
