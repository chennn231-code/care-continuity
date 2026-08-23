import { describe, expect, it } from 'vitest';
import { normalizeAssignmentInput, type AssignmentFormValues } from '../src/assignments/assignmentContract';
import type { OccurrencePattern } from '../src/tasks/taskContract';
const form: AssignmentFormValues = { careSourceId: 'source-a', participationType: 'REGULAR', scopeMode: 'ALL', weekdays: [], scheduledTimes: [], supportMode: 'ON_SITE' };
const task = (occurrence_pattern: OccurrencePattern, required_support_modes = ['ON_SITE'] as const) => ({ occurrence_pattern, required_support_modes: [...required_support_modes] });
describe('exact-time assignment contract', () => {
  it('uses the sole canonical full scope', () => expect(normalizeAssignmentInput(task({ type: 'AS_NEEDED' }), form).time_scope).toEqual({ mode: 'SAME_AS_TASK_PATTERN' }));
  it('normalizes DAILY subset', () => expect(normalizeAssignmentInput(task({ type: 'DAILY', scheduled_times: ['08:00', '12:00'] }), { ...form, scopeMode: 'LIMITED', scheduledTimes: ['12:00', '08:00', '08:00'], weekdays: ['MON'] }).time_scope).toEqual({ scheduled_times: ['08:00', '12:00'] }));
  it('rejects time outside task', () => expect(() => normalizeAssignmentInput(task({ type: 'DAILY', scheduled_times: ['08:00'] }), { ...form, scopeMode: 'LIMITED', scheduledTimes: ['12:00'] })).toThrow('不屬於這項工作'));
  it('normalizes WEEKLY subset', () => expect(normalizeAssignmentInput(task({ type: 'WEEKLY', weekdays: ['MON', 'WED'], scheduled_times: ['08:00'] }), { ...form, scopeMode: 'LIMITED', weekdays: ['WED'], scheduledTimes: ['08:00'] }).time_scope).toEqual({ weekdays: ['WED'], scheduled_times: ['08:00'] }));
  it('rejects empty limited scope and AS_NEEDED limited scope', () => { expect(() => normalizeAssignmentInput(task({ type: 'WEEKLY', weekdays: ['MON'], scheduled_times: ['08:00'] }), { ...form, scopeMode: 'LIMITED' })).toThrow('至少需要選擇'); expect(() => normalizeAssignmentInput(task({ type: 'AS_NEEDED' }), { ...form, scopeMode: 'LIMITED' })).toThrow('只能設定為全部時間'); });
  it('blocks incompatible REGULAR but preserves OCCASIONAL input', () => { expect(() => normalizeAssignmentInput(task({ type: 'DAILY', scheduled_times: ['08:00'] }), { ...form, supportMode: 'REMOTE_COORDINATION' })).toThrow('不符合'); expect(normalizeAssignmentInput(task({ type: 'DAILY', scheduled_times: ['08:00'] }), { ...form, participationType: 'OCCASIONAL', supportMode: 'REMOTE_COORDINATION' }).support_modes).toEqual(['REMOTE_COORDINATION']); });
});
