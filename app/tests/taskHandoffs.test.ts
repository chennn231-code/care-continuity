import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

import {
  createTaskHandoff,
  deleteTaskHandoff,
  listTaskHandoffs,
  markTaskHandoffReviewed,
  parseTaskHandoffRow,
  updateTaskHandoff
} from '../src/lib/taskHandoffs';

const task = { task_id: 'task-a', category: 'MEAL' as const };
const row = {
  handoff_id: 'handoff-a', task_id: 'task-a',
  details: { meal_arrangement: '送餐', feeding_assistance_required: false, diet_form: '軟質' },
  additional_notes: null, created_at: '2026-08-23T01:00:00Z', updated_at: '2026-08-23T01:00:00Z',
  reviewed_at: null, review_interval_days: 30
};

function mutationChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  Object.assign(chain, result);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

describe('task handoff Supabase adapter', () => {
  it('validates and normalizes a live row by Task category', () => {
    expect(parseTaskHandoffRow({ ...row, details: { ...row.details, meal_arrangement: ' 送餐 ' } }, 'MEAL'))
      .toMatchObject({ task_id: 'task-a', details: { meal_arrangement: '送餐' } });
  });

  it('rejects category-mismatched JSON without directly casting it', () => {
    expect(() => parseTaskHandoffRow({ ...row, details: { bathing_method: 'SHOWER' } }, 'MEAL'))
      .toThrow('這個欄位不適用');
  });

  it('rejects invalid timestamps and reminder intervals', () => {
    expect(() => parseTaskHandoffRow({ ...row, updated_at: 'bad' }, 'MEAL')).toThrow('時間資料無效');
    expect(() => parseTaskHandoffRow({ ...row, review_interval_days: 0 }, 'MEAL')).toThrow('提醒頻率無效');
  });

  it('lists rows and resolves each Task category', async () => {
    const order = vi.fn(async () => ({ data: [row], error: null }));
    const inFilter = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: inFilter }));
    mocks.from.mockReturnValue({ select });
    await expect(listTaskHandoffs([task])).resolves.toEqual([expect.objectContaining({ handoff_id: 'handoff-a' })]);
    expect(mocks.from).toHaveBeenCalledWith('task_handoffs');
    expect(inFilter).toHaveBeenCalledWith('task_id', ['task-a']);
  });

  it('creates with the trusted Task id and returns a validated row', async () => {
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });
    const created = await createTaskHandoff(task, {
      task_id: 'untrusted-id', details: row.details, additional_notes: null, review_interval_days: 30
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ task_id: 'task-a' }));
    expect(created.handoff_id).toBe('handoff-a');
  });

  it('updates content fields without sending task_id', async () => {
    const chain = mutationChain({ data: row, error: null });
    const update = vi.fn(() => chain);
    mocks.from.mockReturnValue({ update });
    await expect(updateTaskHandoff('handoff-a', task, {
      details: row.details, additional_notes: '補充', review_interval_days: 14
    })).resolves.toMatchObject({ task_id: 'task-a' });
    expect(update).toHaveBeenCalledWith(expect.not.objectContaining({ task_id: expect.anything() }));
  });

  it('deletes only the selected handoff relationship', async () => {
    const chain = mutationChain({ error: null });
    const remove = vi.fn(() => chain);
    mocks.from.mockReturnValue({ delete: remove });
    await expect(deleteTaskHandoff('handoff-a', 'task-a')).resolves.toBeUndefined();
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'handoff_id', 'handoff-a');
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'task_id', 'task-a');
  });

  it('waits for the review RPC and returns its database timestamp', async () => {
    mocks.rpc.mockResolvedValue({ data: '2026-08-23T08:00:00Z', error: null });
    await expect(markTaskHandoffReviewed('handoff-a')).resolves.toBe('2026-08-23T08:00:00Z');
    expect(mocks.rpc).toHaveBeenCalledWith('mark_task_handoff_reviewed', { p_handoff_id: 'handoff-a' });
  });

  it('does not report review success when RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(markTaskHandoffReviewed('handoff-b')).rejects.toThrow('denied');
  });
});
