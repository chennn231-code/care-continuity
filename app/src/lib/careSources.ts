import { supabase } from './supabase';
import type { NormalizedSourceInput, SourceType } from '../sources/sourceContract';

export interface CareSourceRow {
  care_source_id: string;
  care_receiver_id: string;
  display_name: string;
  source_type: SourceType;
  user_id: string | null;
  created_at: string;
}

const sourceColumns =
  'care_source_id, care_receiver_id, display_name, source_type, user_id, created_at';

export async function listCareSources(careReceiverId: string) {
  const { data, error } = await supabase
    .from('care_sources')
    .select(sourceColumns)
    .eq('care_receiver_id', careReceiverId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as unknown as CareSourceRow[];
}

export async function createCareSource(
  careReceiverId: string,
  input: NormalizedSourceInput
) {
  const { data, error } = await supabase
    .from('care_sources')
    .insert({ care_receiver_id: careReceiverId, ...input })
    .select(sourceColumns)
    .single();

  if (error) throw error;
  return data as unknown as CareSourceRow;
}

export async function updateCareSource(
  careReceiverId: string,
  careSourceId: string,
  input: NormalizedSourceInput
) {
  const { data, error } = await supabase
    .from('care_sources')
    .update({
      display_name: input.display_name,
      source_type: input.source_type,
      user_id: input.user_id ?? null
    })
    .eq('care_source_id', careSourceId)
    .eq('care_receiver_id', careReceiverId)
    .select(sourceColumns)
    .single();

  if (error) throw error;
  return data as unknown as CareSourceRow;
}

export function getCareSourceErrorMessage(error: unknown, action: 'load' | 'save') {
  if (
    action === 'save' &&
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    return '這個名稱已經存在，請使用另一個容易辨識的名稱';
  }

  return action === 'save'
    ? '目前無法儲存照顧來源，請稍後再試'
    : '目前無法讀取照顧來源，請重新整理後再試';
}
