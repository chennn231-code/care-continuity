import { supabase } from './supabase';

export interface CareReceiver {
  care_receiver_id: string;
  display_name: string;
  owner_user_id: string;
  created_at: string;
}

const receiverColumns = 'care_receiver_id, display_name, owner_user_id, created_at';

export async function listOwnedCareReceivers() {
  const { data, error } = await supabase
    .from('care_receivers')
    .select(receiverColumns)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as CareReceiver[];
}

export async function createCareReceiver(displayName: string) {
  const { data, error } = await supabase
    .from('care_receivers')
    .insert({ display_name: displayName.trim() })
    .select(receiverColumns)
    .single();

  if (error) throw error;
  return data as CareReceiver;
}

export async function updateCareReceiver(careReceiverId: string, displayName: string) {
  const { data, error } = await supabase
    .from('care_receivers')
    .update({ display_name: displayName.trim() })
    .eq('care_receiver_id', careReceiverId)
    .select(receiverColumns)
    .single();

  if (error) throw error;
  return data as CareReceiver;
}

export function getCareReceiverErrorMessage(action: 'load' | 'create' | 'update') {
  if (action === 'create') return '目前無法建立照顧個案，請稍後再試。';
  if (action === 'update') return '目前無法修改被照顧者稱呼，請稍後再試。';
  return '目前無法讀取照顧個案，請重新整理後再試。';
}
