import type { CareTaskRow } from '../lib/careTasks';
import { listTaskHandoffs } from '../lib/taskHandoffs';
import {
  getHandoffReadiness,
  shouldShowHandoffReviewReminder,
  type TaskHandoffRecordContract
} from './handoffContract';

export interface HomeHandoffReminder {
  task: CareTaskRow;
  handoff: TaskHandoffRecordContract;
  reminderAtMs: number;
}

export interface HomeHandoffState {
  incompleteTasks: CareTaskRow[];
  dueReminders: HomeHandoffReminder[];
  visibleReminders: HomeHandoffReminder[];
  hiddenReminderCount: number;
}

function reminderAtMs(handoff: TaskHandoffRecordContract) {
  const updatedMs = Date.parse(handoff.updated_at);
  const reviewedMs = handoff.reviewed_at ? Date.parse(handoff.reviewed_at) : Number.NEGATIVE_INFINITY;
  return Math.max(updatedMs, reviewedMs) + (handoff.review_interval_days ?? 0) * 24 * 60 * 60 * 1000;
}

export function buildHomeHandoffState(
  tasks: CareTaskRow[],
  handoffs: TaskHandoffRecordContract[],
  now = new Date(),
  visibleLimit = 3
): HomeHandoffState {
  const handoffByTask = new Map(handoffs.map((handoff) => [handoff.task_id, handoff]));
  const incompleteTasks: CareTaskRow[] = [];
  const dueReminders: HomeHandoffReminder[] = [];

  for (const task of tasks) {
    if (!task.is_active) continue;
    const handoff = handoffByTask.get(task.task_id) ?? null;
    const readiness = getHandoffReadiness(task.category, handoff);
    if (readiness !== 'READY_TO_SHARE') {
      incompleteTasks.push(task);
      continue;
    }
    if (handoff && shouldShowHandoffReviewReminder({
      updated_at: handoff.updated_at,
      reviewed_at: handoff.reviewed_at,
      review_interval_days: handoff.review_interval_days,
      task
    }, now)) {
      dueReminders.push({ task, handoff, reminderAtMs: reminderAtMs(handoff) });
    }
  }

  dueReminders.sort((left, right) => left.reminderAtMs - right.reminderAtMs
    || left.task.title.localeCompare(right.task.title, 'zh-TW'));
  const limit = Math.max(0, visibleLimit);
  return {
    incompleteTasks,
    dueReminders,
    visibleReminders: dueReminders.slice(0, limit),
    hiddenReminderCount: Math.max(0, dueReminders.length - limit)
  };
}

export function applyReviewedAt(
  handoffs: TaskHandoffRecordContract[],
  handoffId: string,
  reviewedAt: string
) {
  return handoffs.map((handoff) => handoff.handoff_id === handoffId
    ? { ...handoff, reviewed_at: reviewedAt }
    : handoff);
}

export async function loadHomeHandoffs(
  tasks: CareTaskRow[],
  loader: typeof listTaskHandoffs = listTaskHandoffs
) {
  try {
    return { handoffs: await loader(tasks), failed: false as const };
  } catch (error) {
    console.error('Unable to load task handoff reminders', error);
    return { handoffs: [] as TaskHandoffRecordContract[], failed: true as const };
  }
}
