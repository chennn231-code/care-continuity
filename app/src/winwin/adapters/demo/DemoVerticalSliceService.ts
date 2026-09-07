import {
  DEMO_AUTHORITY_MARKER,
  NO_ALLOWED_OPERATIONS,
  type ActionDetailView,
  type ActionMutationInput,
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
  type ResponsibilityHistoryEntryView,
  type SessionView,
  type TimelineView
} from '../../contracts/frontendContract';
import type { ResponsibilityRecoveryService } from '../../contracts/verticalSliceService';

export { DEMO_AUTHORITY_MARKER };

const CASE_ID = 'demo-case-1';
const CARE_UPDATE_ID = 'demo-care-update-1';
const CARE_UPDATE_VERSION_ID = 'demo-care-update-version-1';
const ACTION_ID = 'demo-action-1';
const CANDIDATE_REF = 'demo-candidate-b';
const REPLACEMENT_CANDIDATE_REF = 'demo-candidate-c';
const SERVER_TIME = '2026-09-05T02:00:00.000Z';
const TIMELINE_BOUNDARY = 'demo-boundary-2';

const lifecycleActivityFixtures = {
  ACCEPT_ACTION: {
    eventDisplay: '已接受處理事項',
    actorDisplay: '王先生',
    relationshipDisplay: '照顧協作者',
    happenedAt: SERVER_TIME
  },
  DECLINE_ACTION: {
    eventDisplay: '目前無法接手處理事項',
    actorDisplay: '王先生',
    relationshipDisplay: '照顧協作者',
    happenedAt: SERVER_TIME
  },
  START_ACTION: {
    eventDisplay: '已開始處理事項',
    actorDisplay: '王先生',
    relationshipDisplay: '照顧協作者',
    happenedAt: SERVER_TIME
  },
  COMPLETE_ACTION: {
    eventDisplay: '已完成處理事項工作流程',
    actorDisplay: '王先生',
    relationshipDisplay: '照顧協作者',
    happenedAt: SERVER_TIME
  }
} as const;

const operations = (enabled: readonly (keyof AllowedOperationSet)[]): AllowedOperationSet => ({
  ...NO_ALLOWED_OPERATIONS,
  ...Object.fromEntries(enabled.map((operation) => [operation, true]))
});

const careUpdate: CareUpdateDetailView = {
  careUpdateId: CARE_UPDATE_ID,
  versionId: CARE_UPDATE_VERSION_ID,
  categoryDisplay: '生活照顧變化',
  content: '早上的照顧安排需要確認。',
  sourceDisplay: '家屬觀察',
  occurredDate: '2026-09-05',
  timePrecision: 'APPROXIMATE',
  authorDisplay: '林小姐',
  serverPublishedAt: SERVER_TIME,
  visibilityDisplay: '這筆內容指定的協作者',
  linkedAction: undefined,
  allowedOperations: operations(['CREATE_ACTION'])
};

const assignedHistory: ResponsibilityHistoryEntryView = {
  historyId: 'demo-history-assigned',
  milestoneDisplay: '已指派',
  personDisplay: '王先生',
  serverRecordedAt: SERVER_TIME,
  relevance: 'CURRENT'
};

const assignedAction: ActionDetailView = {
  actionId: ACTION_ID,
  caseId: CASE_ID,
  expectedVersion: '1',
  title: '確認明早照顧安排',
  lifecycleState: 'ASSIGNED',
  stateDisplay: '尚待接手',
  sourceCareUpdate: {
    careUpdateId: CARE_UPDATE_ID,
    versionId: CARE_UPDATE_VERSION_ID,
    summary: careUpdate.content
  },
  reason: '確認誰能處理明早的照顧需要。',
  currentHolderDisplay: '王先生',
  assignedByDisplay: '林小姐',
  serverAssignedAt: SERVER_TIME,
  responsibilityHistory: [assignedHistory],
  allowedOperations: operations(['ACCEPT_ACTION', 'DECLINE_ACTION'])
};

const eligibleAssignees: readonly EligibleAssigneeView[] = [{
  candidateRef: CANDIDATE_REF,
  displayName: '王先生',
  relationshipDisplay: '照顧協作者',
  serviceValidityDisplay: '目前可指派'
}];

const eligibleReassignmentCandidates: readonly EligibleReassignmentCandidateView[] = [{
  candidateRef: REPLACEMENT_CANDIDATE_REF,
  displayName: '陳小姐',
  relationshipDisplay: '照顧協作者',
  serviceValidityDisplay: '目前可邀請確認'
}, {
  candidateRef: CANDIDATE_REF,
  displayName: '王先生',
  relationshipDisplay: '照顧協作者',
  serviceValidityDisplay: '目前可邀請確認'
}];

const caseSummary: AuthorizedCaseSummary = {
  caseId: CASE_ID,
  caseDisplay: '陳女士的照顧個案',
  relationshipDisplay: '家屬照顧者',
  newChangeCount: 1,
  responsibilitySummary: '1 項尚待接手',
  latestVisibleActivity: '發布了一筆照顧變化',
  assignedActions: []
};

const caseHome: CaseHomeView = {
  caseId: CASE_ID,
  caseDisplay: caseSummary.caseDisplay,
  relationshipDisplay: caseSummary.relationshipDisplay,
  sinceLastViewSummary: '上次查看後有 1 筆新變化',
  latestVisibleActivity: caseSummary.latestVisibleActivity,
  assignedSummary: caseSummary.responsibilitySummary,
  continuityGaps: [],
  allowedOperations: operations(['CREATE_CARE_UPDATE']),
  careUpdateCreateOptions: [{
    value: 'AUTHOR_ONLY',
    label: '只有我目前可查看',
    description: '仍需保有目前有效的個案存取權'
  }, {
    value: 'DIRECT_PARTICIPANTS',
    label: '只限這筆內容指定的協作者',
    description: '依具體協作者身分，不依角色名稱'
  }, {
    value: 'CASE_SHARED',
    label: '此個案中目前有權查看共享內容的協作者',
    description: '不包含曾經參與但目前已失去存取權的人'
  }]
};

const timeline: TimelineView = {
  caseId: CASE_ID,
  entries: [{
    activityId: 'demo-activity-1',
    eventDisplay: '發布了一筆照顧變化',
    actorDisplay: '林小姐',
    relationshipDisplay: '家屬照顧者',
    serverRecordedAt: SERVER_TIME,
    target: { kind: 'CARE_UPDATE', id: CARE_UPDATE_ID },
    sourceDisplay: careUpdate.sourceDisplay
  }],
  storedBoundary: 'demo-boundary-1',
  returnedBoundary: TIMELINE_BOUNDARY,
  newChangeCount: 1,
  newChangeStartIndex: 0,
  mergedCareUpdates: [careUpdate]
};

export type DemoAdapterOptions = Readonly<{
  operationOutcomes?: Readonly<Record<string, OperationStatusView>>;
  sessionResult?: ProjectionResult<SessionView>;
  authorizedCasesResult?: ProjectionResult<readonly AuthorizedCaseSummary[]>;
  caseHomeResult?: ProjectionResult<CaseHomeView>;
  timelineResult?: ProjectionResult<TimelineView>;
  cursorResult?: CommandResult<ReadCursorAdvanceView>;
  reassignmentCandidatesResult?: ProjectionResult<readonly EligibleReassignmentCandidateView[]>;
}>;

export class DemoVerticalSliceService implements ResponsibilityRecoveryService {
  readonly authorityMarker = DEMO_AUTHORITY_MARKER;
  private readonly operationOutcomes: Readonly<Record<string, OperationStatusView>>;
  private readonly sessionResult?: ProjectionResult<SessionView>;
  private readonly authorizedCasesResult?: ProjectionResult<readonly AuthorizedCaseSummary[]>;
  private readonly caseHomeResult?: ProjectionResult<CaseHomeView>;
  private readonly timelineResult?: ProjectionResult<TimelineView>;
  private readonly cursorResult?: CommandResult<ReadCursorAdvanceView>;
  private readonly reassignmentCandidatesResult?: ProjectionResult<readonly EligibleReassignmentCandidateView[]>;
  private createdCareUpdate?: CareUpdateDetailView;
  private readonly committedCareUpdates = new Map<OperationKey, CareUpdateDetailView>();
  private readonly careUpdateFingerprints = new Map<OperationKey, string>();
  private createdAction?: ActionDetailView;
  private actionState: ActionDetailView = assignedAction;
  private readonly actionActivity: TimelineView['entries'][number][] = [];
  private readonly committedActions = new Map<OperationKey, ActionDetailView>();
  private readonly actionFingerprints = new Map<OperationKey, string>();
  private responsibilityCycleSequence = 1;

  constructor(options: DemoAdapterOptions = {}) {
    this.operationOutcomes = options.operationOutcomes ?? {};
    this.sessionResult = options.sessionResult;
    this.authorizedCasesResult = options.authorizedCasesResult;
    this.caseHomeResult = options.caseHomeResult;
    this.timelineResult = options.timelineResult;
    this.cursorResult = options.cursorResult;
    this.reassignmentCandidatesResult = options.reassignmentCandidatesResult;
  }

  async resolveSession(): Promise<ProjectionResult<SessionView>> {
    return this.sessionResult ?? {
      result: 'SUCCESS',
      data: {
        disposition: 'SIGNED_IN',
        actorDisplay: '林小姐',
        relationshipDisplay: '家屬照顧者',
        demoMarker: DEMO_AUTHORITY_MARKER
      }
    };
  }

  async getAuthorizedCases(): Promise<ProjectionResult<readonly AuthorizedCaseSummary[]>> {
    return this.authorizedCasesResult ?? { result: 'SUCCESS', data: [caseSummary] };
  }

  async getCaseHome(caseId: string): Promise<ProjectionResult<CaseHomeView>> {
    if (this.caseHomeResult) return this.caseHomeResult;
    const latestActionActivity = this.actionActivity.at(-1);
    const continuityGaps = this.actionState.continuityGap ? [this.actionState.continuityGap] : [];
    const activityCount = timeline.entries.length + (this.createdCareUpdate ? 1 : 0) + this.actionActivity.length;
    return caseId === CASE_ID
      ? { result: 'SUCCESS', data: {
          ...caseHome,
          sinceLastViewSummary: `上次查看後有 ${activityCount} 筆新變化`,
          latestVisibleActivity: latestActionActivity?.eventDisplay
            ?? (this.createdCareUpdate ? '發布了一筆照顧變化' : caseHome.latestVisibleActivity),
          assignedSummary: continuityGaps.length > 0 ? undefined : caseHome.assignedSummary,
          inProgressSummary: continuityGaps.length > 0 ? undefined : caseHome.inProgressSummary,
          continuityGaps
        } }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
  }

  async getTimeline(caseId: string): Promise<ProjectionResult<TimelineView>> {
    if (this.timelineResult) return this.timelineResult;
    const created = this.createdCareUpdate;
    const entries: TimelineView['entries'] = created
      ? [...timeline.entries, {
          activityId: `activity-${created.careUpdateId}`,
          eventDisplay: '發布了一筆照顧變化',
          actorDisplay: created.authorDisplay,
          serverRecordedAt: created.serverPublishedAt,
          target: { kind: 'CARE_UPDATE', id: created.careUpdateId },
          sourceDisplay: created.sourceDisplay
        }, ...this.actionActivity]
      : [...timeline.entries, ...this.actionActivity];
    return caseId === CASE_ID
      ? { result: 'SUCCESS', data: {
          ...timeline,
          entries,
          returnedBoundary: entries.length === timeline.entries.length
            ? TIMELINE_BOUNDARY
            : `${TIMELINE_BOUNDARY}-${entries.length}`,
          newChangeCount: entries.length,
          mergedCareUpdates: created ? [...timeline.mergedCareUpdates, created] : timeline.mergedCareUpdates
        } }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
  }

  async createCareUpdate(
    input: CreateCareUpdateInput,
    operationKey: OperationKey
  ): Promise<CommandResult<CareUpdateDetailView>> {
    const result: CareUpdateDetailView = {
      ...careUpdate,
      careUpdateId: `${CARE_UPDATE_ID}-created`,
      versionId: `${CARE_UPDATE_VERSION_ID}-created`,
      categoryDisplay: input.category,
      content: input.content,
      sourceDisplay: input.source,
      occurredDate: input.occurredDate,
      occurredTime: input.occurredTime,
      timePrecision: input.timePrecision,
      visibilityDisplay: input.visibility,
      linkedAction: undefined
    };
    const prior = this.committedCareUpdates.get(operationKey);
    const requestFingerprint = JSON.stringify(input);
    if (prior) return this.careUpdateFingerprints.get(operationKey) === requestFingerprint
      ? { result: 'SUCCESS', data: prior }
      : { result: 'IDEMPOTENCY_CONFLICT' };
    const outcome = this.commandOutcome(operationKey, result);
    if (outcome.result === 'SUCCESS') {
      this.createdCareUpdate = result;
      this.committedCareUpdates.set(operationKey, result);
      this.careUpdateFingerprints.set(operationKey, requestFingerprint);
    }
    return outcome;
  }

  async getEligibleActionAssignees(
    caseId: string,
    sourceVersionId: string
  ): Promise<ProjectionResult<readonly EligibleAssigneeView[]>> {
    return caseId === CASE_ID
      && (sourceVersionId === CARE_UPDATE_VERSION_ID || sourceVersionId === this.createdCareUpdate?.versionId)
      ? { result: 'SUCCESS', data: eligibleAssignees }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
  }

  async createAction(
    input: CreateActionInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    if (input.assigneeCandidateRef !== CANDIDATE_REF) return { result: 'TARGET_INELIGIBLE' };
    const source = input.sourceVersionId === this.createdCareUpdate?.versionId ? this.createdCareUpdate : careUpdate;
    if (input.caseId !== CASE_ID || input.sourceVersionId !== source.versionId
      || !source.allowedOperations.CREATE_ACTION) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    const created: ActionDetailView = {
      ...assignedAction,
      actionId: 'demo-action-created',
      title: input.title,
      reason: input.reason,
      dueDisplay: input.dueAt,
      sourceCareUpdate: {
        careUpdateId: source.careUpdateId,
        versionId: source.versionId,
        summary: source.content
      },
      currentHolderDisplay: eligibleAssignees[0].displayName,
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    const requestFingerprint = JSON.stringify(input);
    const prior = this.committedActions.get(operationKey);
    if (prior) return this.actionFingerprints.get(operationKey) === requestFingerprint
      ? { result: 'SUCCESS', data: prior }
      : { result: 'IDEMPOTENCY_CONFLICT' };
    const outcome = this.commandOutcome(operationKey, created);
    if (outcome.result === 'SUCCESS') {
      this.createdAction = created;
      this.committedActions.set(operationKey, created);
      this.actionFingerprints.set(operationKey, requestFingerprint);
      this.actionActivity.push({
        activityId: `activity-action-created-${created.actionId}`,
        eventDisplay: '建立並指派了處理事項',
        actorDisplay: created.assignedByDisplay,
        relationshipDisplay: '家屬照顧者',
        serverRecordedAt: created.serverAssignedAt,
        target: { kind: 'ACTION', id: created.actionId },
        sourceDisplay: created.sourceCareUpdate.summary
      });
    }
    return outcome;
  }

  async getActionDetail(caseId: string, actionId: string): Promise<ProjectionResult<ActionDetailView>> {
    if (caseId === CASE_ID && actionId === this.createdAction?.actionId) {
      return { result: 'SUCCESS', data: this.createdAction };
    }
    return caseId === CASE_ID && actionId === ACTION_ID
      ? { result: 'SUCCESS', data: this.actionState }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
  }

  async getEligibleReassignmentCandidates(
    actionId: string
  ): Promise<ProjectionResult<readonly EligibleReassignmentCandidateView[]>> {
    if (actionId !== ACTION_ID) return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    if (!this.actionState.continuityGap || !this.actionState.allowedOperations.ACTION_REASSIGN) {
      return { result: 'NOT_FOUND_OR_NOT_VISIBLE' };
    }
    return this.reassignmentCandidatesResult
      ?? { result: 'SUCCESS', data: eligibleReassignmentCandidates };
  }

  async reassignAction(
    input: ReassignActionInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    const fingerprint = `ACTION_REASSIGN:${JSON.stringify(input)}`;
    const prior = this.committedActions.get(operationKey);
    if (prior) return this.actionFingerprints.get(operationKey) === fingerprint
      ? { result: 'SUCCESS', data: prior }
      : { result: 'IDEMPOTENCY_CONFLICT' };
    if (input.actionId !== ACTION_ID
      || input.expectedVersion !== this.actionState.expectedVersion
      || !this.actionState.continuityGap
      || !this.actionState.allowedOperations.ACTION_REASSIGN) return { result: 'STALE_VERSION' };

    const configuredCandidates = this.reassignmentCandidatesResult;
    if (configuredCandidates && configuredCandidates.result !== 'SUCCESS') {
      return configuredCandidates.result === 'NOT_FOUND_OR_NOT_VISIBLE'
        ? { result: 'NOT_FOUND_OR_NOT_VISIBLE' }
        : { result: 'TARGET_INELIGIBLE' };
    }
    const candidates = configuredCandidates?.data ?? eligibleReassignmentCandidates;
    const candidate = candidates.find(({ candidateRef }) => candidateRef === input.assigneeCandidateRef);
    if (!candidate) return { result: 'TARGET_INELIGIBLE' };

    const cycleNumber = this.responsibilityCycleSequence + 1;
    const reassigned: ActionDetailView = {
      ...this.actionState,
      expectedVersion: String(Number(this.actionState.expectedVersion) + 1),
      lifecycleState: 'ASSIGNED',
      stateDisplay: `等待 ${candidate.displayName} 確認`,
      currentHolderDisplay: candidate.displayName,
      continuityGap: undefined,
      responsibilityHistory: [...this.actionState.responsibilityHistory, {
        historyId: `demo-cycle-${cycleNumber}-assigned`,
        milestoneDisplay: '等待確認接手',
        personDisplay: candidate.displayName,
        serverRecordedAt: SERVER_TIME,
        relevance: 'CURRENT'
      }],
      allowedOperations: operations(['ACCEPT_ACTION', 'DECLINE_ACTION'])
    };
    const outcome = this.commandOutcome(operationKey, reassigned);
    if (outcome.result === 'SUCCESS') {
      this.responsibilityCycleSequence = cycleNumber;
      this.actionState = reassigned;
      this.committedActions.set(operationKey, reassigned);
      this.actionFingerprints.set(operationKey, fingerprint);
      this.actionActivity.push({
        activityId: `activity-action-reassigned-${cycleNumber}`,
        eventDisplay: `已請 ${candidate.displayName} 確認是否接手`,
        actorDisplay: '林小姐',
        relationshipDisplay: '家屬照顧者',
        serverRecordedAt: SERVER_TIME,
        target: { kind: 'ACTION', id: ACTION_ID }
      });
    }
    return outcome;
  }

  async acceptAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    const accepted = this.actionAt('ACCEPTED', '已確認接手', ['START_ACTION']);
    return this.decideAction('ACCEPT_ACTION', input, operationKey, {
      ...accepted,
      responsibilityHistory: [...accepted.responsibilityHistory, {
        historyId: 'demo-history-accepted',
        milestoneDisplay: '已確認接手',
        personDisplay: this.actionState.currentHolderDisplay,
        serverRecordedAt: SERVER_TIME,
        relevance: 'CURRENT'
      }]
    });
  }

  async declineAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    const declinedPerson = this.actionState.currentHolderDisplay;
    const historical = this.actionState.responsibilityHistory.map((entry) => ({
      ...entry,
      relevance: 'HISTORICAL' as const
    }));
    return this.decideAction('DECLINE_ACTION', input, operationKey, {
      ...this.actionState,
      expectedVersion: String(Number(this.actionState.expectedVersion) + 1),
      stateDisplay: '需要重新安排',
      currentHolderDisplay: undefined,
      continuityGap: {
        actionId: ACTION_ID,
        careNeedDisplay: assignedAction.title,
        currentHolderDisplay: '目前沒有人確定接手',
        followUpDisplay: '需要重新安排',
        priorCycleSummary: `${declinedPerson ?? '受邀者'}目前無法接手`
      },
      responsibilityHistory: [
        ...historical,
        {
          historyId: `demo-cycle-${this.responsibilityCycleSequence}-declined`,
          milestoneDisplay: '目前無法接手',
          personDisplay: declinedPerson,
          serverRecordedAt: SERVER_TIME,
          relevance: 'HISTORICAL'
        }
      ],
      allowedOperations: operations(['ACTION_REASSIGN'])
    });
  }

  async startAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    const started = {
      ...this.actionState,
      expectedVersion: '3',
      lifecycleState: 'IN_PROGRESS' as const,
      stateDisplay: '處理中',
      responsibilityHistory: [...this.actionState.responsibilityHistory, {
        historyId: 'demo-history-started',
        milestoneDisplay: '開始處理',
        personDisplay: this.actionState.currentHolderDisplay,
        serverRecordedAt: SERVER_TIME,
        relevance: 'CURRENT' as const
      }],
      allowedOperations: operations(['COMPLETE_ACTION'])
    };
    return this.mutateAction('START_ACTION', 'ACCEPTED', input, operationKey, started);
  }

  async completeAction(
    input: CompleteActionInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>> {
    const completed = {
      ...this.actionState,
      expectedVersion: '4',
      lifecycleState: 'COMPLETED' as const,
      stateDisplay: '已完成',
      serverCompletedAt: SERVER_TIME,
      completionResult: input.result,
      responsibilityHistory: [...this.actionState.responsibilityHistory.map((entry) => ({ ...entry, relevance: 'HISTORICAL' as const })), {
        historyId: 'demo-history-completed',
        milestoneDisplay: '已完成',
        personDisplay: this.actionState.currentHolderDisplay,
        serverRecordedAt: SERVER_TIME,
        relevance: 'HISTORICAL' as const
      }],
      allowedOperations: NO_ALLOWED_OPERATIONS
    };
    return this.mutateAction('COMPLETE_ACTION', 'IN_PROGRESS', input, operationKey, completed);
  }

  async lookupOperationStatus(operationKey: OperationKey): Promise<OperationStatusView> {
    const committedAction = this.committedActions.get(operationKey);
    const committed = this.committedCareUpdates.get(operationKey);
    return this.operationOutcomes[operationKey] ?? (committedAction ? {
      operationKey,
      outcome: 'COMMITTED',
      authoritativeResult: committedAction
    } : committed ? {
      operationKey,
      outcome: 'COMMITTED',
      authoritativeResult: committed
    } : {
      operationKey,
      outcome: 'UNKNOWN'
    });
  }

  async advanceReadCursor(
    caseId: string,
    boundary: ReadCursorBoundary
  ): Promise<CommandResult<ReadCursorAdvanceView>> {
    return this.cursorResult ?? (caseId === CASE_ID
      ? { result: 'SUCCESS', data: { currentBoundary: boundary } }
      : { result: 'NOT_FOUND_OR_NOT_VISIBLE' });
  }

  private actionAt(
    lifecycleState: ActionDetailView['lifecycleState'],
    stateDisplay: string,
    enabled: readonly (keyof AllowedOperationSet)[]
  ): ActionDetailView {
    return {
      ...this.actionState,
      expectedVersion: String(Number(this.actionState.expectedVersion) + 1),
      lifecycleState,
      stateDisplay,
      continuityGap: undefined,
      responsibilityHistory: this.actionState.responsibilityHistory.map((entry) => ({
        ...entry,
        relevance: lifecycleState === 'COMPLETED' ? 'HISTORICAL' : entry.relevance
      })),
      allowedOperations: operations(enabled)
    };
  }

  private decideAction(
    family: 'ACCEPT_ACTION' | 'DECLINE_ACTION',
    input: ActionMutationInput,
    operationKey: OperationKey,
    committedData: ActionDetailView
  ): CommandResult<ActionDetailView> {
    return this.mutateAction(family, 'ASSIGNED', input, operationKey, committedData);
  }

  private mutateAction(
    family: 'ACCEPT_ACTION' | 'DECLINE_ACTION' | 'START_ACTION' | 'COMPLETE_ACTION',
    requiredState: ActionDetailView['lifecycleState'],
    input: ActionMutationInput,
    operationKey: OperationKey,
    committedData: ActionDetailView
  ): CommandResult<ActionDetailView> {
    const fingerprint = `${family}:${JSON.stringify(input)}`;
    const prior = this.committedActions.get(operationKey);
    if (prior) return this.actionFingerprints.get(operationKey) === fingerprint
      ? { result: 'SUCCESS', data: prior }
      : { result: 'IDEMPOTENCY_CONFLICT' };
    if (input.actionId !== ACTION_ID
      || input.expectedVersion !== this.actionState.expectedVersion
      || this.actionState.lifecycleState !== requiredState
      || !this.actionState.allowedOperations[family]) return { result: 'STALE_VERSION' };
    const outcome = this.commandOutcome(operationKey, committedData);
    if (outcome.result === 'SUCCESS') {
      this.actionState = committedData;
      this.committedActions.set(operationKey, committedData);
      this.actionFingerprints.set(operationKey, fingerprint);
      this.recordActionActivity(family, committedData);
    }
    return outcome;
  }

  private recordActionActivity(
    family: 'ACCEPT_ACTION' | 'DECLINE_ACTION' | 'START_ACTION' | 'COMPLETE_ACTION',
    action: ActionDetailView
  ) {
    const fixture = lifecycleActivityFixtures[family];
    const actorDisplay = action.currentHolderDisplay ?? fixture.actorDisplay;
    const shared = {
      serverRecordedAt: fixture.happenedAt,
      target: { kind: 'ACTION' as const, id: action.actionId }
    };
    if (family === 'DECLINE_ACTION') {
      this.actionActivity.push({
        ...shared,
        activityId: `activity-${family.toLowerCase()}`,
        eventDisplay: fixture.eventDisplay,
        actorDisplay,
        relationshipDisplay: fixture.relationshipDisplay
      }, {
        ...shared,
        activityId: 'activity-continuity-gap',
        eventDisplay: '處理事項目前沒有人確定接手'
      });
      return;
    }
    this.actionActivity.push({
      ...shared,
      activityId: `activity-${family.toLowerCase()}`,
      eventDisplay: fixture.eventDisplay,
      actorDisplay,
      relationshipDisplay: fixture.relationshipDisplay
    });
  }

  private commandOutcome<T>(operationKey: OperationKey, committedData: T): CommandResult<T> {
    const configured = this.operationOutcomes[operationKey];
    if (!configured || configured.outcome === 'COMMITTED') {
      return { result: 'SUCCESS', data: committedData };
    }
    if (configured.outcome === 'IDEMPOTENCY_CONFLICT') return { result: 'IDEMPOTENCY_CONFLICT' };
    return {
      result: 'TEMPORARY_FAILURE',
      outcomeUncertain: configured.outcome === 'UNKNOWN'
    };
  }
}
