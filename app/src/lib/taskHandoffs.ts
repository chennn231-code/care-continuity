import { supabase } from './supabase';
import type { CareTaskRow } from './careTasks';
import {
  normalizeTaskHandoffDetails,
  validateTaskHandoffDetailsShape,
  type TaskHandoffRecordContract,
  type TaskHandoffWriteInput
} from '../handoffs/handoffContract';
import type { TaskCategory } from '../tasks/taskContract';

const handoffColumns =
  'handoff_id, task_id, details, additional_notes, created_at, updated_at, reviewed_at, review_interval_days';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown, nullable = false) {
  return (nullable && value === null)
    || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

export function parseTaskHandoffRow(row: unknown, category: TaskCategory): TaskHandoffRecordContract {
  if (!isRecord(row)) throw new Error('交接資訊資料格式無效');
  if (typeof row.handoff_id !== 'string' || typeof row.task_id !== 'string') {
    throw new Error('交接資訊識別資料無效');
  }
  if (row.additional_notes !== null && typeof row.additional_notes !== 'string') {
    throw new Error('交接補充說明格式無效');
  }
  if (!validTimestamp(row.created_at) || !validTimestamp(row.updated_at) || !validTimestamp(row.reviewed_at, true)) {
    throw new Error('交接資訊時間資料無效');
  }
  if (
    row.review_interval_days !== null
    && (!Number.isInteger(row.review_interval_days) || Number(row.review_interval_days) <= 0)
  ) {
    throw new Error('交接資訊提醒頻率無效');
  }
  const shapeIssues = validateTaskHandoffDetailsShape(category, row.details);
  if (shapeIssues.length) throw new Error(shapeIssues[0].message);
  return {
    handoff_id: row.handoff_id,
    task_id: row.task_id,
    details: normalizeTaskHandoffDetails(category, row.details),
    additional_notes: row.additional_notes,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    reviewed_at: row.reviewed_at as string | null,
    review_interval_days: row.review_interval_days as number | null
  };
}

function taskCategoryMap(tasks: Pick<CareTaskRow, 'task_id' | 'category'>[]) {
  return new Map(tasks.map((task) => [task.task_id, task.category]));
}

export async function listTaskHandoffs(tasks: Pick<CareTaskRow, 'task_id' | 'category'>[]) {
  if (!tasks.length) return [];
  const categoryByTask = taskCategoryMap(tasks);
  const { data, error } = await supabase
    .from('task_handoffs')
    .select(handoffColumns)
    .in('task_id', tasks.map((task) => task.task_id))
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown[]).map((row) => {
    if (!isRecord(row) || typeof row.task_id !== 'string') throw new Error('交接資訊指向無效工作');
    const category = categoryByTask.get(row.task_id);
    if (!category) throw new Error('交接資訊指向不存在的工作');
    return parseTaskHandoffRow(row, category);
  });
}

export async function createTaskHandoff(
  task: Pick<CareTaskRow, 'task_id' | 'category'>,
  input: TaskHandoffWriteInput
) {
  const { data, error } = await supabase
    .from('task_handoffs')
    .insert({ ...input, task_id: task.task_id })
    .select(handoffColumns)
    .single();
  if (error) throw error;
  return parseTaskHandoffRow(data, task.category);
}

export async function updateTaskHandoff(
  handoffId: string,
  task: Pick<CareTaskRow, 'task_id' | 'category'>,
  input: Omit<TaskHandoffWriteInput, 'task_id'>
) {
  const { data, error } = await supabase
    .from('task_handoffs')
    .update(input)
    .eq('handoff_id', handoffId)
    .eq('task_id', task.task_id)
    .select(handoffColumns)
    .single();
  if (error) throw error;
  return parseTaskHandoffRow(data, task.category);
}

export async function deleteTaskHandoff(handoffId: string, taskId: string) {
  const { error } = await supabase
    .from('task_handoffs')
    .delete()
    .eq('handoff_id', handoffId)
    .eq('task_id', taskId);
  if (error) throw error;
}

export async function markTaskHandoffReviewed(handoffId: string) {
  const { data, error } = await supabase.rpc('mark_task_handoff_reviewed', {
    p_handoff_id: handoffId
  });
  if (error) throw error;
  if (typeof data !== 'string' || !Number.isFinite(Date.parse(data))) {
    throw new Error('交接資訊確認時間無效');
  }
  return data;
}

export function getTaskHandoffErrorMessage(action: 'load' | 'save' | 'delete' | 'review') {
  if (action === 'save') return '目前無法儲存交接資訊，請稍後再試';
  if (action === 'delete') return '目前無法移除交接資訊，請稍後再試';
  if (action === 'review') return '目前無法確認交接資訊仍適用，請稍後再試';
  return '目前無法讀取交接資訊，請重新整理後再試';
}
