import { supabase } from './supabase';
import type { AssignmentTimeScope } from '../assignments/assignmentContract';
import type { BackupConfirmationStatus, NormalizedBackupInput } from '../backups/backupContract';
import type { SupportMode } from '../tasks/taskContract';

export interface BackupAssignmentRow {
  backup_id: string;
  task_id: string;
  care_source_id: string;
  confirmation_status: BackupConfirmationStatus;
  time_scope: AssignmentTimeScope | null;
  support_modes_committed: SupportMode[];
  updated_at: string;
}

const backupColumns = 'backup_id, task_id, care_source_id, confirmation_status, time_scope, support_modes_committed, updated_at';

export async function listBackupAssignments(taskIds: string[]) {
  if (!taskIds.length) return [];
  const { data, error } = await supabase.from('backup_assignments').select(backupColumns).in('task_id', taskIds).order('updated_at', { ascending: true });
  if (error) throw error;
  return data as unknown as BackupAssignmentRow[];
}

export async function createBackupAssignment(taskId: string, input: NormalizedBackupInput) {
  const { data, error } = await supabase.from('backup_assignments').insert({ task_id: taskId, ...input }).select(backupColumns).single();
  if (error) throw error;
  return data as unknown as BackupAssignmentRow;
}

export async function updateBackupAssignment(backupId: string, taskId: string, input: NormalizedBackupInput) {
  const { data, error } = await supabase.from('backup_assignments').update({ ...input, updated_at: new Date().toISOString() }).eq('backup_id', backupId).eq('task_id', taskId).select(backupColumns).single();
  if (error) throw error;
  return data as unknown as BackupAssignmentRow;
}

export async function deleteBackupAssignment(backupId: string, taskId: string) {
  const { error } = await supabase.from('backup_assignments').delete().eq('backup_id', backupId).eq('task_id', taskId);
  if (error) throw error;
}

export function getBackupErrorMessage(error: unknown, action: 'load' | 'save' | 'delete') {
  if (action === 'save' && typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    return '這個來源已經是此工作的備援安排，可以直接編輯既有資料';
  }
  if (action === 'delete') return '目前無法移除此備援安排，請稍後再試';
  return action === 'save' ? '目前無法儲存備援安排，請稍後再試' : '目前無法讀取備援安排，請重新整理後再試';
}
