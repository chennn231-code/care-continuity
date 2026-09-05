import type {
  ActionDetailView,
  ActionMutationInput,
  AuthorizedCaseSummary,
  CareUpdateDetailView,
  CaseHomeView,
  CommandResult,
  CompleteActionInput,
  CreateActionInput,
  CreateCareUpdateInput,
  EligibleAssigneeView,
  OperationKey,
  OperationStatusView,
  ProjectionResult,
  ReadCursorAdvanceView,
  ReadCursorBoundary,
  SessionView,
  TimelineView
} from './frontendContract';

export interface VerticalSliceService {
  resolveSession(): Promise<ProjectionResult<SessionView>>;
  getAuthorizedCases(): Promise<ProjectionResult<readonly AuthorizedCaseSummary[]>>;
  getCaseHome(caseId: string): Promise<ProjectionResult<CaseHomeView>>;
  getTimeline(caseId: string): Promise<ProjectionResult<TimelineView>>;
  createCareUpdate(
    input: CreateCareUpdateInput,
    operationKey: OperationKey
  ): Promise<CommandResult<CareUpdateDetailView>>;
  getEligibleActionAssignees(
    caseId: string,
    sourceVersionId: string
  ): Promise<ProjectionResult<readonly EligibleAssigneeView[]>>;
  createAction(
    input: CreateActionInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>>;
  getActionDetail(caseId: string, actionId: string): Promise<ProjectionResult<ActionDetailView>>;
  acceptAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>>;
  declineAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>>;
  startAction(
    input: ActionMutationInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>>;
  completeAction(
    input: CompleteActionInput,
    operationKey: OperationKey
  ): Promise<CommandResult<ActionDetailView>>;
  lookupOperationStatus(operationKey: OperationKey): Promise<OperationStatusView>;
  advanceReadCursor(
    caseId: string,
    boundary: ReadCursorBoundary
  ): Promise<CommandResult<ReadCursorAdvanceView>>;
}
