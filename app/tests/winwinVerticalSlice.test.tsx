import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WinWinRoutes } from '../src/winwin/routes/WinWinRoutes';
import {
  DEMO_AUTHORITY_MARKER,
  NO_ALLOWED_OPERATIONS,
  type ActionDetailView,
  type ActionMutationInput,
  type AllowedOperation,
  type AllowedOperationSet,
  type AuthorizedCaseSummary,
  type CareUpdateDetailView,
  type CaseHomeView,
  type CommandResult,
  type CompleteActionInput,
  type CreateActionInput,
  type CreateCareUpdateInput,
  type EligibleAssigneeView,
  type EligibleReassignmentCandidateView,
  type OperationKey,
  type OperationStatusView,
  type ProjectionResult,
  type ReadCursorAdvanceView,
  type ReadCursorBoundary,
  type ReassignActionInput,
  type SessionView,
  type TimelineEntryView,
  type TimelineView
} from '../src/winwin/contracts/frontendContract';
import type { VerticalSliceService } from '../src/winwin/contracts/verticalSliceService';

type Actor = 'A' | 'B' | 'C' | 'U';

const CASE_ID = 'case-first-slice';
const UPDATE_ID = 'update-first-slice';
const VERSION_ID = 'version-first-slice';
const ACTION_ID = 'action-first-slice';
const B_CANDIDATE = 'candidate-b';
const C_CANDIDATE = 'candidate-c';
const ASSIGNED_AT = '2026-09-06T01:00:00.000Z';
const ACCEPTED_AT = '2026-09-06T01:10:00.000Z';
const STARTED_AT = '2026-09-06T01:20:00.000Z';
const COMPLETED_AT = '2026-09-06T01:30:00.000Z';

const actorDisplay: Record<Actor, string> = {
  A: '林小姐',
  B: '王先生',
  C: '陳小姐',
  U: '未授權訪客'
};

function operations(...enabled: AllowedOperation[]): AllowedOperationSet {
  return { ...NO_ALLOWED_OPERATIONS, ...Object.fromEntries(enabled.map((name) => [name, true])) };
}

type Store = {
  update?: CareUpdateDetailView;
  action?: ActionDetailView;
  activity: TimelineEntryView[];
  cursors: Partial<Record<Actor, string>>;
  operationResults: Map<OperationKey, CareUpdateDetailView | ActionDetailView>;
  currentAssignee?: Actor;
};

function createStore(): Store {
  return { activity: [], cursors: {}, operationResults: new Map() };
}

function viewForActor(action: ActionDetailView, actor: Actor, currentAssignee?: Actor): ActionDetailView {
  if (actor !== currentAssignee) {
    return { ...action, allowedOperations: actor === 'A' && action.continuityGap ? operations('ACTION_REASSIGN') : NO_ALLOWED_OPERATIONS };
  }
  const enabled = action.continuityGap
    ? NO_ALLOWED_OPERATIONS
    : action.lifecycleState === 'ASSIGNED'
    ? operations('ACCEPT_ACTION', 'DECLINE_ACTION')
    : action.lifecycleState === 'ACCEPTED'
      ? operations('START_ACTION')
      : action.lifecycleState === 'IN_PROGRESS'
        ? operations('COMPLETE_ACTION')
        : NO_ALLOWED_OPERATIONS;
  return { ...action, allowedOperations: enabled };
}

class SliceTestService implements VerticalSliceService {
  constructor(
    protected readonly store: Store,
    readonly actor: Actor,
    private readonly revoked = false
  ) {}

  protected visible() { return this.actor !== 'U' && !this.revoked; }

  async resolveSession(): Promise<ProjectionResult<SessionView>> {
    return {
      result: 'SUCCESS',
      data: {
        disposition: 'SIGNED_IN',
        actorDisplay: actorDisplay[this.actor],
        relationshipDisplay: this.actor === 'A' ? '家屬照顧者' : this.actor === 'U' ? undefined : '照顧協作者',
        demoMarker: DEMO_AUTHORITY_MARKER
      }
    };
  }

  async getAuthorizedCases(): Promise<ProjectionResult<readonly AuthorizedCaseSummary[]>> {
    if (!this.visible()) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    const assignedActions = this.actor === this.store.currentAssignee && this.store.action ? [{
      caseId: CASE_ID,
      actionId: ACTION_ID,
      caseDisplay: '陳女士的照顧個案',
      actionTitle: this.store.action.title,
      stateLabel: this.store.action.stateDisplay
    }] : [];
    return { result: 'SUCCESS', data: [{
      caseId: CASE_ID,
      caseDisplay: '陳女士的照顧個案',
      relationshipDisplay: this.actor === 'A' ? '家屬照顧者' : '照顧協作者',
      newChangeCount: this.store.activity.length,
      latestVisibleActivity: this.store.activity.at(-1)?.eventDisplay,
      assignedActions
    }] };
  }

  async getCaseHome(caseId: string): Promise<ProjectionResult<CaseHomeView>> {
    if (!this.visible() || caseId !== CASE_ID) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    const gap = this.store.action?.continuityGap;
    return { result: 'SUCCESS', data: {
      caseId: CASE_ID,
      caseDisplay: '陳女士的照顧個案',
      relationshipDisplay: this.actor === 'A' ? '家屬照顧者' : '照顧協作者',
      sinceLastViewSummary: `上次查看後有 ${this.store.activity.length} 筆新變化`,
      latestVisibleActivity: this.store.activity.at(-1)?.eventDisplay,
      assignedSummary: gap ? undefined : this.store.action?.stateDisplay,
      continuityGaps: gap ? [gap] : [],
      allowedOperations: this.actor === 'A' ? operations('CREATE_CARE_UPDATE') : NO_ALLOWED_OPERATIONS,
      careUpdateCreateOptions: this.actor === 'A' ? [{
        value: 'DIRECT_PARTICIPANTS',
        label: '只限這筆內容指定的協作者',
        description: '依具體協作者身分，不依角色名稱'
      }] : undefined
    } };
  }

  async getTimeline(caseId: string): Promise<ProjectionResult<TimelineView>> {
    if (!this.visible() || caseId !== CASE_ID) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    return { result: 'SUCCESS', data: {
      caseId,
      entries: [...this.store.activity],
      storedBoundary: this.store.cursors[this.actor],
      returnedBoundary: `boundary-${this.actor}-${this.store.activity.length}`,
      newChangeCount: this.store.activity.length,
      newChangeStartIndex: 0,
      mergedCareUpdates: this.store.update ? [this.store.update] : []
    } };
  }

  async createCareUpdate(input: CreateCareUpdateInput, key: OperationKey): Promise<CommandResult<CareUpdateDetailView>> {
    if (!this.visible() || this.actor !== 'A' || input.caseId !== CASE_ID) return { result: 'FORBIDDEN' };
    const update: CareUpdateDetailView = {
      careUpdateId: UPDATE_ID,
      versionId: VERSION_ID,
      categoryDisplay: input.category,
      content: input.content,
      sourceDisplay: input.source,
      occurredDate: input.occurredDate,
      occurredTime: input.occurredTime,
      timePrecision: input.timePrecision,
      authorDisplay: actorDisplay.A,
      serverPublishedAt: ASSIGNED_AT,
      visibilityDisplay: input.visibility,
      allowedOperations: operations('CREATE_ACTION')
    };
    this.store.update = update;
    this.store.activity.push({
      activityId: 'activity-update', eventDisplay: '發布了一筆照顧變化', actorDisplay: actorDisplay.A,
      relationshipDisplay: '家屬照顧者', serverRecordedAt: ASSIGNED_AT,
      target: { kind: 'CARE_UPDATE', id: UPDATE_ID }, sourceDisplay: input.source
    });
    this.store.operationResults.set(key, update);
    return { result: 'SUCCESS', data: update };
  }

  async getEligibleActionAssignees(caseId: string, versionId: string): Promise<ProjectionResult<readonly EligibleAssigneeView[]>> {
    if (!this.visible() || this.actor !== 'A' || caseId !== CASE_ID || versionId !== VERSION_ID) {
      return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    }
    return { result: 'SUCCESS', data: [{
      candidateRef: B_CANDIDATE,
      displayName: actorDisplay.B,
      relationshipDisplay: '照顧協作者',
      serviceValidityDisplay: '目前可指派'
    }] };
  }

  async createAction(input: CreateActionInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    if (!this.visible() || this.actor !== 'A' || input.caseId !== CASE_ID
      || input.sourceVersionId !== VERSION_ID || input.assigneeCandidateRef !== B_CANDIDATE || !this.store.update) {
      return { result: 'FORBIDDEN' };
    }
    const action: ActionDetailView = {
      actionId: ACTION_ID,
      caseId: CASE_ID,
      expectedVersion: '1',
      title: input.title,
      lifecycleState: 'ASSIGNED',
      stateDisplay: '尚待接手',
      sourceCareUpdate: { careUpdateId: UPDATE_ID, versionId: VERSION_ID, summary: this.store.update.content },
      reason: input.reason,
      dueDisplay: input.dueAt,
      currentHolderDisplay: actorDisplay.B,
      assignedByDisplay: actorDisplay.A,
      serverAssignedAt: ASSIGNED_AT,
      responsibilityHistory: [{
        historyId: 'history-assigned', milestoneDisplay: '已指派', personDisplay: actorDisplay.B,
        serverRecordedAt: ASSIGNED_AT, relevance: 'CURRENT'
      }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    this.store.action = action;
    this.store.currentAssignee = 'B';
    this.store.activity.push({
      activityId: 'activity-assigned', eventDisplay: '建立並指派了處理事項', actorDisplay: actorDisplay.A,
      relationshipDisplay: '家屬照顧者', serverRecordedAt: ASSIGNED_AT,
      target: { kind: 'ACTION', id: ACTION_ID }, sourceDisplay: action.sourceCareUpdate.summary
    });
    this.store.operationResults.set(key, action);
    return { result: 'SUCCESS', data: action };
  }

  async getActionDetail(caseId: string, actionId: string): Promise<ProjectionResult<ActionDetailView>> {
    if (!this.visible() || caseId !== CASE_ID || actionId !== ACTION_ID || !this.store.action) {
      return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    }
    return { result: 'SUCCESS', data: viewForActor(this.store.action, this.actor, this.store.currentAssignee) };
  }

  async getEligibleReassignmentCandidates(actionId: string): Promise<ProjectionResult<readonly EligibleReassignmentCandidateView[]>> {
    if (!this.visible() || this.actor !== 'A' || actionId !== ACTION_ID || !this.store.action?.continuityGap) {
      return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    }
    return { result: 'SUCCESS', data: [{ candidateRef: C_CANDIDATE, displayName: actorDisplay.C, relationshipDisplay: '照顧協作者' }] };
  }

  async reassignAction(input: ReassignActionInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    const current = this.store.action;
    if (!this.visible() || this.actor !== 'A' || !current?.continuityGap || input.actionId !== ACTION_ID
      || input.expectedVersion !== current.expectedVersion || input.assigneeCandidateRef !== C_CANDIDATE) return { result: 'FORBIDDEN' };
    const assigned: ActionDetailView = {
      ...current,
      expectedVersion: String(Number(current.expectedVersion) + 1), lifecycleState: 'ASSIGNED',
      stateDisplay: `等待 ${actorDisplay.C} 確認`, currentHolderDisplay: actorDisplay.C, continuityGap: undefined,
      responsibilityHistory: [...current.responsibilityHistory, {
        historyId: 'history-replacement-assigned', milestoneDisplay: '等待確認接手', personDisplay: actorDisplay.C,
        serverRecordedAt: STARTED_AT, relevance: 'CURRENT'
      }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    this.store.action = assigned;
    this.store.currentAssignee = 'C';
    this.store.activity.push({
      activityId: 'activity-reassignment-requested', eventDisplay: `已請 ${actorDisplay.C} 確認是否接手`,
      actorDisplay: actorDisplay.A, relationshipDisplay: '家屬照顧者', serverRecordedAt: STARTED_AT,
      target: { kind: 'ACTION', id: ACTION_ID }
    });
    this.store.operationResults.set(key, assigned);
    return { result: 'SUCCESS', data: assigned };
  }

  async acceptAction(input: ActionMutationInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    return this.transition(input, key, 'ASSIGNED', {
      lifecycleState: 'ACCEPTED', expectedVersion: '2', stateDisplay: '已確認接手', eventDisplay: '已接受處理事項',
      historyId: 'history-accepted', milestoneDisplay: '已確認接手', serverRecordedAt: ACCEPTED_AT
    });
  }

  async declineAction(input: ActionMutationInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    if (!this.canAct(input, 'ASSIGNED')) return { result: 'FORBIDDEN' };
    const current = this.store.action!;
    const decliningActor = this.actor;
    const declined: ActionDetailView = {
      ...current,
      expectedVersion: String(Number(current.expectedVersion) + 1),
      stateDisplay: '需要重新安排',
      currentHolderDisplay: undefined,
      continuityGap: {
        actionId: ACTION_ID,
        careNeedDisplay: current.title,
        currentHolderDisplay: '目前沒有人確定接手',
        followUpDisplay: '需要重新安排',
        priorCycleSummary: `${actorDisplay[decliningActor]}目前無法接手`
      },
      responsibilityHistory: [
        ...current.responsibilityHistory.map((entry) => ({ ...entry, relevance: 'HISTORICAL' as const })),
        { historyId: `history-${decliningActor.toLowerCase()}-declined`, milestoneDisplay: '目前無法接手', personDisplay: actorDisplay[decliningActor], serverRecordedAt: ACCEPTED_AT, relevance: 'HISTORICAL' }
      ],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    this.store.action = declined;
    this.store.currentAssignee = undefined;
    this.recordLifecycle('目前無法接手處理事項', ACCEPTED_AT);
    this.store.operationResults.set(key, declined);
    return { result: 'SUCCESS', data: declined };
  }

  async startAction(input: ActionMutationInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    return this.transition(input, key, 'ACCEPTED', {
      lifecycleState: 'IN_PROGRESS', expectedVersion: '3', stateDisplay: '處理中', eventDisplay: '已開始處理事項',
      historyId: 'history-started', milestoneDisplay: '開始處理', serverRecordedAt: STARTED_AT
    });
  }

  async completeAction(input: CompleteActionInput, key: OperationKey): Promise<CommandResult<ActionDetailView>> {
    if (!this.canAct(input, 'IN_PROGRESS')) return { result: 'FORBIDDEN' };
    const current = this.store.action!;
    const completed: ActionDetailView = {
      ...current,
      expectedVersion: '4', lifecycleState: 'COMPLETED', stateDisplay: '已完成',
      serverCompletedAt: COMPLETED_AT, completionResult: input.result,
      responsibilityHistory: [...current.responsibilityHistory.map((entry) => ({ ...entry, relevance: 'HISTORICAL' as const })), {
        historyId: 'history-completed', milestoneDisplay: '完成處理', personDisplay: actorDisplay.B,
        serverRecordedAt: COMPLETED_AT, relevance: 'CURRENT'
      }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    this.store.action = completed;
    this.recordLifecycle('已完成處理事項工作流程', COMPLETED_AT);
    this.store.operationResults.set(key, completed);
    return { result: 'SUCCESS', data: completed };
  }

  async lookupOperationStatus(key: OperationKey): Promise<OperationStatusView> {
    const result = this.store.operationResults.get(key);
    return { operationKey: key, outcome: result ? 'COMMITTED' : 'DEFINITELY_NOT_COMMITTED', authoritativeResult: result };
  }

  async advanceReadCursor(caseId: string, boundary: ReadCursorBoundary): Promise<CommandResult<ReadCursorAdvanceView>> {
    if (!this.visible() || caseId !== CASE_ID) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    this.store.cursors[this.actor] = boundary;
    return { result: 'SUCCESS', data: { currentBoundary: boundary } };
  }

  private canAct(input: ActionMutationInput, state: ActionDetailView['lifecycleState']) {
    return this.visible() && this.actor === this.store.currentAssignee && input.actionId === ACTION_ID
      && this.store.action?.lifecycleState === state && input.expectedVersion === this.store.action.expectedVersion;
  }

  private async transition(
    input: ActionMutationInput,
    key: OperationKey,
    from: ActionDetailView['lifecycleState'],
    next: Readonly<{
      lifecycleState: ActionDetailView['lifecycleState']; expectedVersion: string; stateDisplay: string;
      eventDisplay: string; historyId: string; milestoneDisplay: string; serverRecordedAt: string;
    }>
  ): Promise<CommandResult<ActionDetailView>> {
    if (!this.canAct(input, from)) return { result: 'FORBIDDEN' };
    const current = this.store.action!;
    const action: ActionDetailView = {
      ...current,
      expectedVersion: String(Number(current.expectedVersion) + 1),
      lifecycleState: next.lifecycleState,
      stateDisplay: next.stateDisplay,
      responsibilityHistory: [...current.responsibilityHistory, {
        historyId: next.historyId, milestoneDisplay: next.milestoneDisplay, personDisplay: actorDisplay[this.actor],
        serverRecordedAt: next.serverRecordedAt, relevance: 'CURRENT'
      }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    this.store.action = action;
    this.recordLifecycle(next.eventDisplay, next.serverRecordedAt);
    this.store.operationResults.set(key, action);
    return { result: 'SUCCESS', data: action };
  }

  private recordLifecycle(eventDisplay: string, serverRecordedAt: string) {
    this.store.activity.push({
      activityId: `activity-${this.store.activity.length + 1}`,
      eventDisplay,
      actorDisplay: actorDisplay[this.actor],
      relationshipDisplay: '照顧協作者',
      serverRecordedAt,
      target: { kind: 'ACTION', id: ACTION_ID }
    });
  }
}

function app(service: VerticalSliceService, path: string) {
  const phase = service instanceof SliceTestService ? `${service.actor}:${path}` : path;
  return <MemoryRouter key={phase} initialEntries={[path]}><WinWinRoutes service={service} /></MemoryRouter>;
}

async function createAssignedAction(user: ReturnType<typeof userEvent.setup>, store: Store) {
  await user.click(await screen.findByRole('link', { name: '開啟個案' }));
  await user.click(await screen.findByRole('link', { name: '新增照顧變化' }));
  await user.selectOptions(await screen.findByLabelText('類別 *'), 'CARE_ARRANGEMENT_CHANGE');
  await user.type(screen.getByLabelText('發生了什麼變化？ *'), '明早的移位照顧安排需要確認。');
  await user.type(screen.getByLabelText('資訊來源 *'), '家屬直接觀察');
  await user.type(screen.getByLabelText('發生日期 *'), '2026-09-06');
  await user.click(screen.getByRole('radio', { name: '約略時間' }));
  await user.click(screen.getByRole('radio', { name: /只限這筆內容指定的協作者/ }));
  await user.click(screen.getByRole('button', { name: '發布照顧變化' }));
  expect(await screen.findByRole('heading', { name: '已儲存' })).toBeInTheDocument();
  expect(store.update?.content).toBe('明早的移位照顧安排需要確認。');
  await user.click(screen.getByRole('button', { name: '建立處理事項' }));
  await user.type(await screen.findByLabelText('要處理的事項 *'), '確認明早移位協助');
  await user.type(screen.getByLabelText('需要處理的原因 *'), '需要一位具名協作者承接。');
  await user.selectOptions(screen.getByLabelText('指派給 *'), B_CANDIDATE);
  await user.click(screen.getByRole('button', { name: '建立並指派' }));
  expect(await screen.findByRole('heading', { name: '確認明早移位協助' })).toBeInTheDocument();
  expect(store.action?.currentHolderDisplay).toBe(actorDisplay.B);
}

async function declineAndReassignToC(
  user: ReturnType<typeof userEvent.setup>,
  store: Store,
  view: ReturnType<typeof render>
) {
  view.rerender(app(new SliceTestService(store, 'B'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
  await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
  await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
  expect((await screen.findAllByText('需要重新安排')).length).toBeGreaterThan(0);
  const priorHistory = structuredClone(store.action!.responsibilityHistory);

  view.rerender(app(new SliceTestService(store, 'A'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
  await user.click(await screen.findByRole('button', { name: '重新安排接手者' }));
  await user.click(await screen.findByRole('radio', { name: /陳小姐/ }));
  await user.click(screen.getByRole('button', { name: '檢視並確認' }));
  await user.click(screen.getByRole('button', { name: '確認並送出詢問' }));
  expect(await screen.findByText('等待 陳小姐 確認')).toBeInTheDocument();
  expect(store.action?.continuityGap).toBeUndefined();
  expect(store.currentAssignee).toBe('C');
  expect(store.action?.responsibilityHistory.slice(0, priorHistory.length)).toEqual(priorHistory);
  return priorHistory;
}

afterEach(cleanup);

describe('CP-F10-A full First Slice composition', () => {
  it('composes A create/assign, B accept/start/complete, and A fresh authoritative observation', async () => {
    const user = userEvent.setup();
    const store = createStore();
    const view = render(app(new SliceTestService(store, 'A'), '/winwin/cases'));

    expect(await screen.findByText('陳女士的照顧個案')).toBeInTheDocument();
    await createAssignedAction(user, store);
    expect(screen.queryByRole('button', { name: '接受處理' })).not.toBeInTheDocument();

    view.rerender(app(new SliceTestService(store, 'B'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    expect(await screen.findByText(actorDisplay.B)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '接受處理' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThanOrEqual(2);
    expect(store.action?.lifecycleState).toBe('ACCEPTED');
    await user.click(screen.getByRole('button', { name: '開始處理' }));
    expect(await screen.findByText('處理中')).toBeInTheDocument();
    expect(store.action?.lifecycleState).toBe('IN_PROGRESS');
    await user.type(screen.getByLabelText('處理摘要 *'), '已確認移位協助並完成交接。');
    await user.click(screen.getByRole('button', { name: '標示處理完成' }));
    expect(await screen.findByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已確認移位協助並完成交接。')).toBeInTheDocument();
    expect(store.action?.lifecycleState).toBe('COMPLETED');

    view.rerender(app(new SliceTestService(store, 'A'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    expect(await screen.findByText(actorDisplay.A)).toBeInTheDocument();
    expect(await screen.findByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已確認移位協助並完成交接。')).toBeInTheDocument();
    expect(screen.getAllByText(actorDisplay.B).length).toBeGreaterThan(0);
    expect(screen.getByText('完成處理')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /接受處理|開始處理|標示處理完成/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '個案首頁' }));
    await user.click(await screen.findByRole('link', { name: '查看所有活動' }));
    expect(await screen.findByRole('heading', { name: '已完成處理事項工作流程' })).toBeInTheDocument();
    expect(store.cursors.A).toBe(`boundary-A-${store.activity.length}`);
    expect(store.cursors.B).toBeUndefined();
  });

  it('composes exact-B decline into a preserved historical cycle and an unrepaired gap', async () => {
    const user = userEvent.setup();
    const store = createStore();
    const view = render(app(new SliceTestService(store, 'A'), '/winwin/cases'));
    await createAssignedAction(user, store);

    view.rerender(app(new SliceTestService(store, 'B'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
    expect((await screen.findAllByText('目前沒有人確定接手')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('需要重新安排').length).toBeGreaterThan(0);
    expect(screen.getByText('目前無法接手', { selector: 'strong' })).toBeInTheDocument();
    expect(store.action?.currentHolderDisplay).toBeUndefined();
    expect(store.action?.responsibilityHistory.filter((entry) => entry.milestoneDisplay === '已指派')).toHaveLength(1);
    expect(store.action?.responsibilityHistory.every((entry) => entry.relevance === 'HISTORICAL')).toBe(true);
    expect(screen.queryByRole('button', { name: /重新指派|選擇接手者|修復/ })).not.toBeInTheDocument();

    view.rerender(app(new SliceTestService(store, 'A'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    await user.click(await screen.findByRole('link', { name: '個案首頁' }));
    expect(await screen.findByText('目前沒有人確定接手')).toBeInTheDocument();
    expect(store.action?.continuityGap?.priorCycleSummary).toBe('王先生目前無法接手');
    expect(screen.queryByRole('button', { name: /重新指派|選擇接手者|修復/ })).not.toBeInTheDocument();
  });

  it('composes decline → reassignment → exact replacement Accept without creating another cycle', async () => {
    const user = userEvent.setup();
    const store = createStore();
    const view = render(app(new SliceTestService(store, 'A'), '/winwin/cases'));
    await createAssignedAction(user, store);
    const priorHistory = await declineAndReassignToC(user, store, view);
    const assignedCycleCount = store.action!.responsibilityHistory.filter((entry) => entry.milestoneDisplay === '等待確認接手').length;

    for (const actor of ['A', 'B', 'U'] as const) {
      view.rerender(app(new SliceTestService(store, actor), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
      if (actor === 'U') await screen.findByRole('heading', { name: '目前無法使用此內容' });
      else await screen.findByRole('heading', { name: '確認明早移位協助' });
      expect(screen.queryByRole('button', { name: /接受處理|目前無法接手/ })).not.toBeInTheDocument();
    }

    view.rerender(app(new SliceTestService(store, 'C'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    expect(await screen.findByRole('button', { name: '接受處理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '目前無法接手' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '接受處理' }));
    expect((await screen.findAllByText('已確認接手')).length).toBeGreaterThanOrEqual(2);
    expect(store.action?.lifecycleState).toBe('ACCEPTED');
    expect(store.action?.continuityGap).toBeUndefined();
    expect(store.action?.responsibilityHistory.slice(0, priorHistory.length)).toEqual(priorHistory);
    expect(store.action?.responsibilityHistory.filter((entry) => entry.milestoneDisplay === '等待確認接手')).toHaveLength(assignedCycleCount);
    expect(screen.queryByRole('button', { name: /接受處理|目前無法接手/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/照顧已完全恢復|所有照顧都有保障|照顧中斷風險已解除/)).not.toBeInTheDocument();
  });

  it('composes replacement Decline back to a preserved gap without automatic replacement', async () => {
    const user = userEvent.setup();
    const store = createStore();
    const view = render(app(new SliceTestService(store, 'A'), '/winwin/cases'));
    await createAssignedAction(user, store);
    const priorHistory = await declineAndReassignToC(user, store, view);

    view.rerender(app(new SliceTestService(store, 'C'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    await user.click(await screen.findByRole('button', { name: '目前無法接手' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '確認目前無法接手' }));
    expect((await screen.findAllByText('需要重新安排')).length).toBeGreaterThan(0);
    expect(store.currentAssignee).toBeUndefined();
    expect(store.action?.lifecycleState).toBe('ASSIGNED');
    expect(store.action?.continuityGap?.priorCycleSummary).toBe('陳小姐目前無法接手');
    expect(store.action?.responsibilityHistory.slice(0, priorHistory.length)).toEqual(priorHistory);
    expect(store.action?.responsibilityHistory.at(-1)).toMatchObject({ personDisplay: '陳小姐', milestoneDisplay: '目前無法接手', relevance: 'HISTORICAL' });
    expect(screen.queryByRole('button', { name: /接受處理|目前無法接手/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText(/通知|自動選擇|推薦接手者/)).not.toBeInTheDocument();
  });

  it('fails closed for unauthorized U after protected A/B state existed', async () => {
    const store = createStore();
    const user = userEvent.setup();
    const view = render(app(new SliceTestService(store, 'A'), '/winwin/cases'));
    await createAssignedAction(user, store);

    view.rerender(app(new SliceTestService(store, 'U'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    const unavailable = await screen.findByRole('heading', { name: '目前無法使用此內容' });
    expect(unavailable).toHaveFocus();
    expect(screen.getByRole('link', { name: '返回我的個案' })).toHaveAttribute('href', '/winwin/cases');
    expect(screen.queryByText('陳女士的照顧個案')).not.toBeInTheDocument();
    expect(screen.queryByText('確認明早移位協助')).not.toBeInTheDocument();
    expect(screen.queryByText('明早的移位照顧安排需要確認。')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /接受處理|目前無法接手|開始處理|標示處理完成/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/未授權|不存在|權限|拒絕/)).not.toBeInTheDocument();
  });

  it('clears a protected draft on authoritative loss and ignores an obsolete pending read settlement', async () => {
    const user = userEvent.setup();
    let settleOld!: (result: ProjectionResult<ActionDetailView>) => void;
    class PendingActionService extends SliceTestService {
      override getActionDetail(): Promise<ProjectionResult<ActionDetailView>> {
        return new Promise((resolve) => { settleOld = resolve; });
      }
    }
    const store = createStore();
    store.action = {
      actionId: ACTION_ID, caseId: CASE_ID, expectedVersion: '1', title: 'OLD_CONTEXT_SECRET',
      lifecycleState: 'ASSIGNED', stateDisplay: '尚待接手',
      sourceCareUpdate: { careUpdateId: UPDATE_ID, versionId: VERSION_ID, summary: 'OLD_SOURCE_SECRET' },
      reason: 'OLD_REASON_SECRET', currentHolderDisplay: actorDisplay.B, assignedByDisplay: actorDisplay.A,
      serverAssignedAt: ASSIGNED_AT,
      responsibilityHistory: [{ historyId: 'old', milestoneDisplay: '已指派', personDisplay: actorDisplay.B, serverRecordedAt: ASSIGNED_AT, relevance: 'CURRENT' }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    const view = render(app(new PendingActionService(store, 'A'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    expect(await screen.findByRole('heading', { name: '處理事項' })).toBeInTheDocument();

    view.rerender(app(new SliceTestService(store, 'U'), `/winwin/cases/${CASE_ID}/actions/${ACTION_ID}`));
    expect(await screen.findByRole('heading', { name: '目前無法使用此內容' })).toBeInTheDocument();
    await act(async () => { settleOld({ result: 'SUCCESS', data: store.action! }); });
    expect(screen.queryByText('OLD_CONTEXT_SECRET')).not.toBeInTheDocument();
    expect(screen.queryByText('OLD_SOURCE_SECRET')).not.toBeInTheDocument();

    const draftStore = createStore();
    view.rerender(app(new SliceTestService(draftStore, 'A'), `/winwin/cases/${CASE_ID}/updates/new`));
    const draft = await screen.findByLabelText('發生了什麼變化？ *');
    await user.type(draft, 'REVOKED_DRAFT_SECRET');
    expect(screen.getByDisplayValue('REVOKED_DRAFT_SECRET')).toBeInTheDocument();
    view.rerender(app(new SliceTestService(draftStore, 'A', true), `/winwin/cases/${CASE_ID}/updates/new`));
    expect(await screen.findByRole('heading', { name: '目前無法使用此內容' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('REVOKED_DRAFT_SECRET')).not.toBeInTheDocument();
  });

  it('keeps cursor advancement actor-scoped when an obsolete A settlement finishes in B context', async () => {
    let settleA!: (result: CommandResult<ReadCursorAdvanceView>) => void;
    class PendingCursorService extends SliceTestService {
      override advanceReadCursor(_caseId: string, boundary: ReadCursorBoundary) {
        return new Promise<CommandResult<ReadCursorAdvanceView>>((resolve) => {
          settleA = (result) => {
            if (result.result === 'SUCCESS') this.store.cursors.A = boundary;
            resolve(result);
          };
        });
      }
    }
    const store = createStore();
    store.activity.push({
      activityId: 'cursor-activity', eventDisplay: '可見活動', actorDisplay: actorDisplay.A,
      serverRecordedAt: ASSIGNED_AT, target: { kind: 'CARE_UPDATE', id: UPDATE_ID }
    });
    const view = render(app(new PendingCursorService(store, 'A'), `/winwin/cases/${CASE_ID}/timeline`));
    expect(await screen.findByRole('heading', { name: '可見活動' })).toBeInTheDocument();
    await waitFor(() => expect(settleA).toBeTypeOf('function'));

    view.rerender(app(new SliceTestService(store, 'B'), `/winwin/cases/${CASE_ID}/timeline`));
    await waitFor(() => expect(store.cursors.B).toBe('boundary-B-1'));
    await act(async () => { settleA({ result: 'SUCCESS', data: { currentBoundary: 'boundary-A-1' } }); });
    expect(store.cursors.A).toBe('boundary-A-1');
    expect(store.cursors.B).toBe('boundary-B-1');
    expect(screen.getByText(actorDisplay.B)).toBeInTheDocument();
  });
});
