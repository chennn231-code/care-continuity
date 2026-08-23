import { describe, expect, it } from 'vitest';
import { normalizeTaskInput, TaskValidationError, type TaskFormValues } from '../src/tasks/taskContract';
const base: TaskFormValues = { title: '  協助用藥  ', category: 'MEDICATION', occurrenceType: 'DAILY', scheduledTimes: ['08:00'], weekdays: [], onceDate: '', onceTime: '', supportMode: 'ON_SITE' };
describe('exact-time task contract', () => {
  it('trims title and sorts/deduplicates DAILY times', () => expect(normalizeTaskInput({ ...base, scheduledTimes: ['18:00', '08:00', '08:00', '12:00'] }).occurrence_pattern).toEqual({ type: 'DAILY', scheduled_times: ['08:00', '12:00', '18:00'] }));
  it('requires DAILY time', () => expect(() => normalizeTaskInput({ ...base, scheduledTimes: [] })).toThrow(TaskValidationError));
  it('normalizes WEEKLY weekdays and times', () => expect(normalizeTaskInput({ ...base, occurrenceType: 'WEEKLY', weekdays: ['FRI', 'MON', 'MON'], scheduledTimes: ['22:00', '08:00'] }).occurrence_pattern).toEqual({ type: 'WEEKLY', weekdays: ['MON', 'FRI'], scheduled_times: ['08:00', '22:00'] }));
  it('requires WEEKLY weekday', () => expect(() => normalizeTaskInput({ ...base, occurrenceType: 'WEEKLY' })).toThrow('至少需要選擇一天'));
  it.each(['25:00', '08:60', '8:00', ''])('rejects invalid HH:mm %s', (time) => expect(() => normalizeTaskInput({ ...base, scheduledTimes: [time] })).toThrow('24 小時制'));
  it('strips time and weekday from AS_NEEDED', () => expect(normalizeTaskInput({ ...base, occurrenceType: 'AS_NEEDED', weekdays: ['MON'], scheduledTimes: ['08:00'] }).occurrence_pattern).toEqual({ type: 'AS_NEEDED' }));
  it('normalizes a valid ONCE date and time', () => expect(normalizeTaskInput({ ...base, occurrenceType: 'ONCE', onceDate: '2026-09-15', onceTime: '10:30' }).occurrence_pattern).toEqual({ type: 'ONCE', date: '2026-09-15', scheduled_time: '10:30' }));
  it.each([['2026-02-30', '10:30'], ['2026-09-15', '25:00'], ['2026-09-15', '8:00']])('rejects invalid ONCE %s %s', (onceDate, onceTime) => expect(() => normalizeTaskInput({ ...base, occurrenceType: 'ONCE', onceDate, onceTime })).toThrow());
});
