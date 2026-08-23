import { describe, expect, it, vi } from 'vitest';
import type { CareTaskRow } from '../src/lib/careTasks';
import type { TaskHandoffRecordContract } from '../src/handoffs/handoffContract';
import {
  applyReviewedAt,
  buildHomeHandoffState,
  loadHomeHandoffs
} from '../src/handoffs/homeHandoffReminders';

const now = new Date('2026-09-01T12:00:00+08:00');
const task = (id: string, overrides: Partial<CareTaskRow> = {}): CareTaskRow => ({
  task_id: id,
  care_receiver_id: 'receiver-a',
  title: `任務 ${id}`,
  category: 'MEAL',
  occurrence_pattern: { type: 'DAILY', scheduled_times: ['08:00'] },
  required_support_modes: ['ON_SITE'],
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
  ...overrides
});
const completeDetails = { meal_arrangement: '送餐', feeding_assistance_required: false, diet_form: '軟質' };
const handoff = (taskId: string, overrides: Partial<TaskHandoffRecordContract> = {}): TaskHandoffRecordContract => ({
  handoff_id: `handoff-${taskId}`,
  task_id: taskId,
  details: completeDetails,
  additional_notes: null,
  created_at: '2026-08-01T00:00:00+08:00',
  updated_at: '2026-08-01T00:00:00+08:00',
  reviewed_at: null,
  review_interval_days: 14,
  ...overrides
});

describe('home handoff reminders', () => {
  it('puts NOT_PREPARED and NEEDS_DETAILS only in section A', () => {
    const state = buildHomeHandoffState([task('missing'), task('incomplete')], [handoff('incomplete', { details: {} })], now);
    expect(state.incompleteTasks.map((item) => item.task_id)).toEqual(['missing', 'incomplete']);
    expect(state.dueReminders).toEqual([]);
  });

  it('keeps a ready handoff out of section B before its chosen time', () => {
    const state = buildHomeHandoffState([task('future')], [handoff('future', { updated_at: '2026-08-25T00:00:00+08:00' })], now);
    expect(state.incompleteTasks).toEqual([]);
    expect(state.dueReminders).toEqual([]);
  });

  it('shows a ready due handoff in section B', () => {
    expect(buildHomeHandoffState([task('due')], [handoff('due')], now).dueReminders[0].task.task_id).toBe('due');
  });

  it('never treats an incomplete due handoff as a review reminder', () => {
    const state = buildHomeHandoffState([task('incomplete')], [handoff('incomplete', { details: {} })], now);
    expect(state.incompleteTasks).toHaveLength(1);
    expect(state.dueReminders).toHaveLength(0);
  });

  it('excludes inactive tasks and completed ONCE tasks but allows future ONCE tasks', () => {
    const tasks = [
      task('inactive', { is_active: false }),
      task('past', { occurrence_pattern: { type: 'ONCE', date: '2026-08-31', scheduled_time: '08:00' } }),
      task('future-once', { occurrence_pattern: { type: 'ONCE', date: '2026-09-02', scheduled_time: '08:00' } })
    ];
    const state = buildHomeHandoffState(tasks, tasks.map((item) => handoff(item.task_id)), now);
    expect(state.dueReminders.map((item) => item.task.task_id)).toEqual(['future-once']);
  });

  it('sorts oldest reminders first and exposes only three cards', () => {
    const tasks = ['a', 'b', 'c', 'd'].map((id) => task(id));
    const handoffs = [
      handoff('a', { updated_at: '2026-08-04T00:00:00+08:00' }),
      handoff('b', { updated_at: '2026-08-01T00:00:00+08:00' }),
      handoff('c', { updated_at: '2026-08-03T00:00:00+08:00' }),
      handoff('d', { updated_at: '2026-08-02T00:00:00+08:00' })
    ];
    const state = buildHomeHandoffState(tasks, handoffs, now);
    expect(state.dueReminders.map((item) => item.task.task_id)).toEqual(['b', 'd', 'c', 'a']);
    expect(state.visibleReminders.map((item) => item.task.task_id)).toEqual(['b', 'd', 'c']);
    expect(state.hiddenReminderCount).toBe(1);
  });

  it('removes a card after the review RPC timestamp is applied', () => {
    const tasks = [task('reviewed')];
    const initial = [handoff('reviewed')];
    expect(buildHomeHandoffState(tasks, initial, now).dueReminders).toHaveLength(1);
    const reviewed = applyReviewedAt(initial, 'handoff-reviewed', now.toISOString());
    expect(buildHomeHandoffState(tasks, reviewed, now).dueReminders).toHaveLength(0);
    expect(reviewed[0].updated_at).toBe(initial[0].updated_at);
  });

  it('contains a task-specific update deep link contract', () => {
    const taskId = 'task with spaces';
    expect(`/setup/handoffs?task=${encodeURIComponent(taskId)}`).toBe('/setup/handoffs?task=task%20with%20spaces');
  });

  it('isolates a handoff load failure from the rest of the home data', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loader = vi.fn(async () => { throw new Error('network'); });
    await expect(loadHomeHandoffs([task('a')], loader)).resolves.toEqual({ handoffs: [], failed: true });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
