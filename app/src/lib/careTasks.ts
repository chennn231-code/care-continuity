import { supabase } from './supabase';
import type {
  NormalizedTaskInput,
  OccurrencePattern,
  SupportMode,
  TaskCategory
} from '../tasks/taskContract';

export interface CareTaskRow {
  task_id: string;
  care_receiver_id: string;
  title: string;
  category: TaskCategory;
  occurrence_pattern: OccurrencePattern;
  required_support_modes: SupportMode[];
  is_active: boolean;
  created_at: string;
}

const taskColumns =
  'task_id, care_receiver_id, title, category, occurrence_pattern, required_support_modes, is_active, created_at';

export async function listCareTasks(careReceiverId: string) {
  const { data, error } = await supabase
    .from('care_tasks')
    .select(taskColumns)
    .eq('care_receiver_id', careReceiverId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as unknown as CareTaskRow[];
}

export async function createCareTask(careReceiverId: string, input: NormalizedTaskInput) {
  const { data, error } = await supabase
    .from('care_tasks')
    .insert({ care_receiver_id: careReceiverId, ...input })
    .select(taskColumns)
    .single();

  if (error) throw error;
  return data as unknown as CareTaskRow;
}

export async function updateCareTask(
  careReceiverId: string,
  taskId: string,
  input: NormalizedTaskInput
) {
  const { data, error } = await supabase
    .from('care_tasks')
    .update(input)
    .eq('task_id', taskId)
    .eq('care_receiver_id', careReceiverId)
    .select(taskColumns)
    .single();

  if (error) throw error;
  return data as unknown as CareTaskRow;
}

export function getCareTaskErrorMessage(action: 'load' | 'save') {
  return action === 'save'
    ? '目前無法儲存照顧工作，請稍後再試。'
    : '目前無法讀取照顧工作，請重新整理後再試。';
}
