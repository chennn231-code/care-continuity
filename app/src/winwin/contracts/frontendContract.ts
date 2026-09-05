export const DEMO_AUTHORITY_MARKER = 'DEMO_NON_AUTHORITATIVE' as const;

export type OpaqueId = string;
export type IsoDateTime = string;
export type OperationKey = string;
export type ReadCursorBoundary = string;

export type AllowedOperation =
  | 'CREATE_CARE_UPDATE'
  | 'CREATE_ACTION'
  | 'ACCEPT_ACTION'
  | 'DECLINE_ACTION'
  | 'START_ACTION'
  | 'COMPLETE_ACTION';

export type AllowedOperationSet = Readonly<Record<AllowedOperation, boolean>>;

export const NO_ALLOWED_OPERATIONS: AllowedOperationSet = Object.freeze({
  CREATE_CARE_UPDATE: false,
  CREATE_ACTION: false,
  ACCEPT_ACTION: false,
  DECLINE_ACTION: false,
  START_ACTION: false,
  COMPLETE_ACTION: false
});

export type PublicError = Readonly<{
  code: 'VALIDATION' | 'TEMPORARY' | 'OFFLINE' | 'UNKNOWN';
  message: string;
}>;

export type ScreenState<T> =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'success'; data: T; freshness: 'current' | 'refreshing' }>
  | Readonly<{ status: 'empty'; boundary?: ReadCursorBoundary }>
  | Readonly<{ status: 'partial'; data: T; retryable: true }>
  | Readonly<{ status: 'recoverableError'; error: PublicError }>
  | Readonly<{ status: 'stale'; data?: T }>
  | Readonly<{ status: 'unavailable' }>;

export type ProjectionResult<T> =
  | Readonly<{ result: 'SUCCESS'; data: T }>
  | Readonly<{ result: 'EMPTY'; boundary?: ReadCursorBoundary }>
  | Readonly<{ result: 'PARTIAL'; data: T }>
  | Readonly<{ result: 'NOT_FOUND_OR_NOT_VISIBLE' }>
  | Readonly<{ result: 'TEMPORARY_FAILURE'; error: PublicError }>;

export type CommandResult<T> =
  | Readonly<{ result: 'SUCCESS'; data: T }>
  | Readonly<{ result: 'NOT_FOUND_OR_NOT_VISIBLE' }>
  | Readonly<{ result: 'FORBIDDEN' }>
  | Readonly<{ result: 'STALE_VERSION' }>
  | Readonly<{ result: 'TARGET_INELIGIBLE' }>
  | Readonly<{ result: 'TEMPORARY_FAILURE'; outcomeUncertain: boolean }>
  | Readonly<{ result: 'IDEMPOTENCY_CONFLICT' }>;

export type SessionView = Readonly<{
  disposition: 'SIGNED_IN' | 'SIGNED_OUT';
  actorDisplay?: string;
  relationshipDisplay?: string;
  demoMarker?: typeof DEMO_AUTHORITY_MARKER;
}>;

export type AssignedActionSummary = Readonly<{
  caseId: OpaqueId;
  actionId: OpaqueId;
  caseDisplay: string;
  actionTitle: string;
  stateLabel: string;
  dueDisplay?: string;
}>;

export type AuthorizedCaseSummary = Readonly<{
  caseId: OpaqueId;
  caseDisplay: string;
  relationshipDisplay: string;
  newChangeCount?: number;
  responsibilitySummary?: string;
  latestVisibleActivity?: string;
  assignedActions: readonly AssignedActionSummary[];
}>;

export type ContinuityGapView = Readonly<{
  actionId: OpaqueId;
  careNeedDisplay: string;
  currentHolderDisplay: '目前沒有人確定接手';
  followUpDisplay: '需要重新安排';
  priorCycleSummary?: string;
}>;

export type CaseHomeView = Readonly<{
  caseId: OpaqueId;
  caseDisplay: string;
  relationshipDisplay: string;
  sinceLastViewSummary?: string;
  latestVisibleActivity?: string;
  assignedSummary?: string;
  inProgressSummary?: string;
  continuityGaps: readonly ContinuityGapView[];
  allowedOperations: AllowedOperationSet;
}>;

export type TimelineTarget = Readonly<{
  kind: 'CARE_UPDATE' | 'ACTION';
  id: OpaqueId;
}>;

export type TimelineEntryView = Readonly<{
  activityId: OpaqueId;
  eventDisplay: string;
  actorDisplay?: string;
  relationshipDisplay?: string;
  serverRecordedAt: IsoDateTime;
  target: TimelineTarget;
  sourceDisplay?: string;
}>;

export type CareUpdateVisibility = 'AUTHOR_ONLY' | 'DIRECT_PARTICIPANTS' | 'CASE_SHARED';
export type TimePrecision = 'EXACT' | 'APPROXIMATE' | 'UNKNOWN';

export type CareUpdateDetailView = Readonly<{
  careUpdateId: OpaqueId;
  versionId: OpaqueId;
  categoryDisplay: string;
  content: string;
  sourceDisplay: string;
  occurredDate: string;
  occurredTime?: string;
  timePrecision: TimePrecision;
  authorDisplay: string;
  serverPublishedAt: IsoDateTime;
  visibilityDisplay: string;
  linkedAction?: Readonly<{ actionId: OpaqueId; stateLabel: string }>;
  allowedOperations: AllowedOperationSet;
}>;

export type TimelineView = Readonly<{
  caseId: OpaqueId;
  entries: readonly TimelineEntryView[];
  storedBoundary?: ReadCursorBoundary;
  returnedBoundary?: ReadCursorBoundary;
  newChangeCount?: number;
  mergedCareUpdates: readonly CareUpdateDetailView[];
}>;

export type EligibleAssigneeView = Readonly<{
  candidateRef: OpaqueId;
  displayName: string;
  relationshipDisplay?: string;
  serviceValidityDisplay?: string;
}>;

export type ActionLifecycleState = 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';

export type ResponsibilityHistoryEntryView = Readonly<{
  historyId: OpaqueId;
  milestoneDisplay: string;
  personDisplay?: string;
  serverRecordedAt: IsoDateTime;
  relevance: 'CURRENT' | 'HISTORICAL';
}>;

export type ActionDetailView = Readonly<{
  actionId: OpaqueId;
  caseId: OpaqueId;
  expectedVersion: string;
  title: string;
  lifecycleState: ActionLifecycleState;
  stateDisplay: string;
  sourceCareUpdate: Readonly<{
    careUpdateId: OpaqueId;
    versionId: OpaqueId;
    summary: string;
  }>;
  reason: string;
  dueDisplay?: string;
  currentHolderDisplay?: string;
  continuityGap?: ContinuityGapView;
  assignedByDisplay: string;
  serverAssignedAt: IsoDateTime;
  serverCompletedAt?: IsoDateTime;
  completionResult?: string;
  responsibilityHistory: readonly ResponsibilityHistoryEntryView[];
  allowedOperations: AllowedOperationSet;
}>;

export type OperationOutcome =
  | 'COMMITTED'
  | 'DEFINITELY_NOT_COMMITTED'
  | 'UNKNOWN'
  | 'IDEMPOTENCY_CONFLICT';

export type OperationAuthoritativeResult = CareUpdateDetailView | ActionDetailView;

export type OperationStatusView<
  T extends OperationAuthoritativeResult = OperationAuthoritativeResult
> = Readonly<{
  operationKey: OperationKey;
  outcome: OperationOutcome;
  authoritativeResult?: T;
}>;

export type CreateCareUpdateInput = Readonly<{
  caseId: OpaqueId;
  category: string;
  content: string;
  source: string;
  occurredDate: string;
  occurredTime?: string;
  timePrecision: TimePrecision;
  visibility: CareUpdateVisibility;
  additionalContext?: string;
}>;

export type CreateActionInput = Readonly<{
  caseId: OpaqueId;
  sourceVersionId: OpaqueId;
  title: string;
  reason: string;
  assigneeCandidateRef: OpaqueId;
  dueAt?: IsoDateTime;
}>;

export type ActionMutationInput = Readonly<{
  actionId: OpaqueId;
  expectedVersion: string;
}>;

export type CompleteActionInput = ActionMutationInput & Readonly<{
  result: string;
}>;

export type ReadCursorAdvanceView = Readonly<{
  currentBoundary: ReadCursorBoundary;
}>;
