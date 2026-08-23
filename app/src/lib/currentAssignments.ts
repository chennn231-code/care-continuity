import { supabase } from './supabase';
import type {
  AssignmentTimeScope,
  NormalizedAssignmentInput,
  ParticipationType
} from '../assignments/assignmentContract';
import type { SupportMode } from '../tasks/taskContract';

export interface CurrentAssignmentRow {
  assignment_id: string;
  task_id: string;
  care_source_id: string;
  participation_type: ParticipationType;
  time_scope: AssignmentTimeScope;
  support_modes: SupportMode[];
  created_at: string;
}

const assignmentColumns =
  'assignment_id, task_id, care_source_id, participation_type, time_scope, support_modes, created_at';

export async function listCurrentAssignments(taskIds: string[]) {
  if (taskIds.length === 0) return [];
  const { data, error } = await supabase
    .from('current_care_assignments')
    .select(assignmentColumns)
    .in('task_id', taskIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as unknown as CurrentAssignmentRow[];
}

export async function createCurrentAssignment(taskId: string, input: NormalizedAssignmentInput) {
  const { data, error } = await supabase
    .from('current_care_assignments')
    .insert({ task_id: taskId, ...input })
    .select(assignmentColumns)
    .single();
  if (error) throw error;
  return data as unknown as CurrentAssignmentRow;
}

export async function updateCurrentAssignment(
  assignmentId: string,
  taskId: string,
  input: NormalizedAssignmentInput
) {
  const { data, error } = await supabase
    .from('current_care_assignments')
    .update(input)
    .eq('assignment_id', assignmentId)
    .eq('task_id', taskId)
    .select(assignmentColumns)
    .single();
  if (error) throw error;
  return data as unknown as CurrentAssignmentRow;
}

export async function deleteCurrentAssignment(assignmentId: string, taskId: string) {
  const { error } = await supabase
    .from('current_care_assignments')
    .delete()
    .eq('assignment_id', assignmentId)
    .eq('task_id', taskId);
  if (error) throw error;
}

export function getAssignmentErrorMessage(error: unknown, action: 'load' | 'save' | 'delete') {
  if (
    action === 'save' &&
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    return '這個照顧來源已經設定在此工作中，可以直接修改目前的負責方式';
  }
  if (action === 'delete') return '目前無法移除此分工，請稍後再試';
  return action === 'save'
    ? '目前無法儲存照顧分工，請稍後再試'
    : '目前無法讀取照顧分工，請重新整理後再試';
}
