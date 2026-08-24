import { describe, expect, it } from 'vitest';
import { V2_DOCUMENT_TITLE, V2_PRODUCT_DESCRIPTION, V2_PRODUCT_NAME, V2_PROTOTYPE_NOTICE } from '../src/v2/data/branding';
import {
  addCareUpdate,
  createInitialPrototypeState,
  resolveQuestion,
  transitionAction,
  visibleTimelineEntries
} from '../src/v2/state/prototypeState';
import type { NewUpdateInput } from '../src/v2/types/prototype';

describe('v2 frontend prototype state', () => {
  it('does not allow an action to jump from pending acceptance to completed', () => {
    const state = createInitialPrototypeState();
    const next = transitionAction(state, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(next).toBe(state);
    expect(next.actions[0].status).toBe('PENDING_ACCEPTANCE');
  });

  it('moves an accepted action into progress and then completed', () => {
    const initial = createInitialPrototypeState();
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED', 'NURSE');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS', 'NURSE');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(accepted.actions[0].status).toBe('ACCEPTED');
    expect(active.actions[0].status).toBe('IN_PROGRESS');
    expect(completed.actions[0].status).toBe('COMPLETED');
  });

  it('does not let a different acting role perform the assignee transition', () => {
    const state = createInitialPrototypeState();
    expect(transitionAction(state, 'action-skin-check', 'ACCEPTED', 'FAMILY')).toBe(state);
  });

  it('keeps a question independent when its action is completed', () => {
    const initial = createInitialPrototypeState();
    const accepted = transitionAction(initial, 'action-skin-check', 'ACCEPTED', 'NURSE');
    const active = transitionAction(accepted, 'action-skin-check', 'IN_PROGRESS', 'NURSE');
    const completed = transitionAction(active, 'action-skin-check', 'COMPLETED', 'NURSE');
    expect(completed.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
  });

  it('requires a separate question resolution action', () => {
    const state = createInitialPrototypeState();
    const resolved = resolveQuestion(state, 'skin-question');
    expect(state.questions.find((item) => item.id === 'skin-question')?.status).toBe('ANSWERED');
    expect(resolved.questions.find((item) => item.id === 'skin-question')?.status).toBe('RESOLVED');
  });

  it('adds a new care update and optional action only to in-memory state', () => {
    const state = createInitialPrototypeState();
    const input: NewUpdateInput = {
      kind: 'OBSERVATION', occurredDate: '2026-08-25', occurredTime: '09:00',
      content: '今天起身時需要多一點扶持', source: '虛構家屬觀察', actingRole: 'FAMILY',
      purpose: '共同照顧交接', sharingScope: 'DIRECT_PARTICIPANTS', needsAction: true,
      assigneeRole: 'DAY_CARE', dueAt: '2026-08-26T17:00'
    };
    const next = addCareUpdate(state, input, new Date('2026-08-25T01:05:00Z'));
    expect(next.timeline).toHaveLength(state.timeline.length + 1);
    expect(next.timeline[0].summary).toBe(input.content);
    expect(next.actions).toHaveLength(state.actions.length + 1);
    expect(next.actions.at(-1)?.status).toBe('PENDING_ACCEPTANCE');
    expect(state.timeline).toHaveLength(6);
  });

  it('does not leak a hidden family-only entry when switching demo roles', () => {
    const state = createInitialPrototypeState();
    const familyIds = visibleTimelineEntries(state, 'FAMILY').map((entry) => entry.id);
    const dayCareIds = visibleTimelineEntries(state, 'DAY_CARE').map((entry) => entry.id);
    expect(familyIds).toContain('family-private-note');
    expect(dayCareIds).not.toContain('family-private-note');
    expect(dayCareIds).not.toContain('question-skin');
  });

  it('exposes the required prototype and fictional-data notice', () => {
    expect(V2_PRODUCT_NAME).toBe('WinWin');
    expect(V2_DOCUMENT_TITLE).toBe('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('WinWin v2 流程展示');
    expect(V2_PROTOTYPE_NOTICE).toContain('虛構資料');
    expect(V2_PROTOTYPE_NOTICE).toContain('重新整理後會重置');
    expect(V2_PRODUCT_DESCRIPTION).toContain(V2_PRODUCT_NAME);
  });
});
