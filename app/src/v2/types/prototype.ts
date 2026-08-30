import type { CaseParticipantRef } from '../authorization/domainAuthorizationContract';

export type DemoRole = 'FAMILY' | 'DAY_CARE' | 'NURSE';
export type PrimaryIdentityType = 'SELF' | 'FAMILY' | 'PROFESSIONAL';
export type VerificationStatus = 'DECLARED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type ProfessionalType =
  | 'CASE_MANAGER'
  | 'CARE_WORKER'
  | 'NURSE'
  | 'PHYSICIAN'
  | 'PHYSICAL_THERAPIST'
  | 'OCCUPATIONAL_THERAPIST'
  | 'SPEECH_THERAPIST'
  | 'DIETITIAN'
  | 'PSYCHOLOGIST'
  | 'SOCIAL_WORKER';
export type IdentityRegistrationMode = 'PRIMARY' | 'SECONDARY';
export type UpdateKind = 'OBSERVATION' | 'ARRANGEMENT' | 'QUESTION' | 'ANSWER' | 'ACTION_EVENT';
export type SharingScope = 'AUTHOR_ONLY' | 'SHARED_CARE' | 'FAMILY_ONLY' | 'DIRECT_PARTICIPANTS';
export type ActionStatus =
  | 'PENDING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DECLINED'
  | 'NEEDS_REASSIGNMENT'
  | 'CANCELLED';
export type QuestionStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED';
export type InvitationStoredStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
export type InvitationEffectiveStatus = InvitationStoredStatus | 'EXPIRED';
export type InvitationRecipientType = 'FAMILY' | 'PROFESSIONAL';
export type WorkspaceCaseAccessStatus = 'ACTIVE' | 'EXPIRING' | 'WAITING_START' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
export type ProfessionalRecordSharingScope = 'AUTHOR_ONLY' | 'SHARED_CARE' | 'DIRECT_PARTICIPANTS';

export interface TimelineEntry {
  id: string;
  caseId: string;
  kind: UpdateKind;
  summary: string;
  occurredAt: string;
  recordedAt: string;
  author: CaseParticipantRef;
  authorDisplayRole: DemoRole;
  source: string;
  sharingScope: SharingScope;
  participantRefs?: CaseParticipantRef[];
  participantDisplayRoles?: DemoRole[];
  /** Deterministic demo adapter ordering; display timestamps never provide authority. */
  activitySequence: number;
  version: number;
  supersedesId?: string;
  hasUpdatedVersion: boolean;
  isCurrentVersion: boolean;
}

export interface PrototypeAction {
  id: string;
  caseId: string;
  title: string;
  detail: string;
  creator: CaseParticipantRef;
  dueAt: string;
  /** Demo projection derived from responsibilityCycles; never an authoritative pointer. */
  status: ActionStatus;
  linkedQuestionId: string;
}

export interface PrototypeQuestion {
  id: string;
  caseId: string;
  sourceTimelineEntryId: string;
  text: string;
  status: QuestionStatus;
  author: CaseParticipantRef;
  /** Display-only author label. */
  askedBy: string;
  answer?: string;
}

export interface CareCircleMember {
  id: string;
  caseId: string;
  name: string;
  role: DemoRole;
  participant: CaseParticipantRef;
  relationship: string;
  purpose: string;
  scopeSummary: string;
  validFrom: string;
  validUntil: string | null;
  status: 'ACTIVE' | 'EXPIRING';
}

export interface NewUpdateInput {
  caseId: string;
  kind: 'OBSERVATION' | 'ARRANGEMENT' | 'QUESTION';
  occurredDate: string;
  occurredTime: string;
  content: string;
  source: string;
  actor: CaseParticipantRef;
  actorDisplayRole: DemoRole;
  purpose: string;
  sharingScope: SharingScope;
  needsAction: boolean;
  assignee?: CaseParticipantRef;
  assigneeDisplayRole?: DemoRole;
  dueAt?: string;
}

export interface PrototypeIdentity {
  id: string;
  accountId: string;
  identityType: PrimaryIdentityType;
  professionalType: ProfessionalType | null;
  verificationStatus: VerificationStatus;
  isPrimary: boolean;
}

export interface IdentityRegistrationDraft {
  mode: IdentityRegistrationMode;
  identityType: PrimaryIdentityType | null;
  professionalType: ProfessionalType | null;
}

export interface MockCaseMembership {
  id: string;
  identityId: string;
  caseId: string;
  relationship: 'SELF' | 'FAMILY_MEMBER' | 'PROFESSIONAL_SERVICE';
  status: 'ACTIVE' | 'WAITING_START' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  validUntil: string | null;
}

export interface MockRoleGrant {
  id: string;
  membershipId: string;
  actingRole: DemoRole;
  purpose: string;
  targetScopes: Array<'CASE' | 'RECORD'>;
  sharingScopes: SharingScope[];
  capabilities: string[];
  startsAt?: string;
  validUntil: string | null;
}

export interface PrototypeInvitation {
  id: string;
  previousInvitationId: string | null;
  caseId: string;
  caseDisplayName: string;
  maskedCaseDisplayName: string;
  inviterName: string;
  recipientType: InvitationRecipientType;
  recipientEmailHint: string;
  roleLabel: string;
  purpose: string;
  scopeSummary: string;
  proposedTargetScopes: Array<'CASE' | 'RECORD'>;
  proposedSharingScopes: SharingScope[];
  proposedCapabilities: string[];
  serviceStartsAt: string;
  serviceEndsAt: string;
  expiresAt: string;
  status: InvitationStoredStatus;
  recipientIdentityId: string | null;
  credentialId: string;
  linkRepresentation: string;
  codeRepresentation: string;
}

export interface PrototypeInvitationInput {
  caseId: string;
  caseDisplayName: string;
  recipientType: InvitationRecipientType;
  roleLabel: string;
  purpose: string;
  scopeSummary: string;
  serviceStartsAt: string;
  serviceEndsAt: string;
}

export interface PrototypeWorkspaceCase {
  id: string;
  displayName: string;
  relationshipLabel: string;
  serviceSource: string;
  serviceStartsAt: string;
  serviceEndsAt: string | null;
  accessStatus: WorkspaceCaseAccessStatus;
  visibleActionCount: number;
  lastVisibleUpdateLabel: string;
}

export interface PrototypePrivateTag {
  id: string;
  label: string;
  color: 'MIST' | 'SUN' | 'SAGE';
}

export interface PrototypeCaseTagAssignment {
  caseId: string;
  tagId: string;
}

export interface PrototypeResponsibilityHistory {
  id: string;
  caseId: string;
  actionId: string;
  formerAssigneeName: string;
  formerAssignee: CaseParticipantRef;
  formerAssigneeDisplayRole: DemoRole;
  previousStatus: Extract<PrototypeResponsibilityStatus, 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS'>;
  endedAt: string;
  activitySequence: number;
  reason: 'SERVICE_EXPIRED' | 'MEMBERSHIP_REVOKED';
  summary: string;
}

export interface PrototypeActionStatusHistory {
  id: string;
  caseId: string;
  actionId: string;
  fromStatus: ActionStatus;
  toStatus: ActionStatus;
  actor: CaseParticipantRef;
  actorDisplayRole: DemoRole;
  changedAt: string;
  activitySequence: number;
}

export type CaseActivitySourceType = 'TIMELINE_ENTRY' | 'PROFESSIONAL_RECORD' | 'ACTION';

export interface CaseActivityItem {
  id: string;
  caseId: string;
  sourceType: CaseActivitySourceType;
  sourceId: string;
  actor: CaseParticipantRef;
  actorDisplayRole: DemoRole;
  actorLabel: string;
  displayTimestamp: string;
  /** Comparable only inside the explicitly non-authoritative demo adapter. */
  demoSequence: number;
  boundary: ActivityBoundary;
  summary: string;
  sharingScope: SharingScope;
  participantRefs?: CaseParticipantRef[];
  participantDisplayRoles?: DemoRole[];
  sourceLabel: string;
  linkedQuestionId?: string;
  linkedQuestionStatus?: QuestionStatus;
  linkedActionId?: string;
  linkedActionStatus?: ActionStatus;
}

export interface ActivityBoundary {
  source: 'SERVER' | 'DEMO_NON_AUTHORITATIVE';
  caseId: string;
  /** Opaque response boundary; clients must not derive it from display time. */
  value: string;
}

export interface CaseActivityResponse {
  source: 'SERVER' | 'DEMO_NON_AUTHORITATIVE';
  items: CaseActivityItem[];
  latestBoundary: ActivityBoundary | null;
  storedCursorBoundary: ActivityBoundary | null;
}

export interface PrototypeReadCursor {
  owner: CaseParticipantRef;
  caseId: string;
  boundary: ActivityBoundary;
}

export interface ProfessionalRecordContent {
  serviceDate: string;
  startedAt: string;
  endedAt: string;
  serviceLocation: string;
  subjectReport: string;
  objectiveObservation: string;
  assessmentSummary: string;
  serviceProvided: string;
  followUpPlan: string;
  followUpDueDate: string;
  professionalOnlyNotes: string;
}

export interface ProfessionalRecordDraft {
  caseId: string;
  actingRole: 'NURSE';
  purpose: string;
  sharingScope: ProfessionalRecordSharingScope;
  content: ProfessionalRecordContent;
  recordId?: string;
  correctionOfVersionId?: string;
  correctionReason?: string;
}

export interface ProfessionalRecordVersion {
  id: string;
  recordId: string;
  caseId: string;
  versionNumber: number;
  authorName: string;
  author: CaseParticipantRef;
  actingRole: 'NURSE';
  purpose: string;
  sharingScope: ProfessionalRecordSharingScope;
  occurredAt: string;
  recordedAt: string;
  publishedAt: string;
  activitySequence: number;
  supersedesVersionId?: string;
  correctionReason?: string;
  content: ProfessionalRecordContent;
}

export interface FamilyProfessionalRecordProjection {
  recordId: string;
  versionNumber: number;
  authorLabel: string;
  occurredAt: string;
  purpose: string;
  objectiveObservation: string;
  serviceProvided: string;
  followUpPlan: string;
  followUpDueDate: string;
  wasCorrected: boolean;
}

export interface PrototypeGrantPath {
  identity: PrototypeIdentity;
  membership: MockCaseMembership;
  grant: MockRoleGrant;
}

export type PrototypeResponsibilityStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ENDED';

export interface PrototypeResponsibilityCycle {
  id: string;
  actionId: string;
  caseId: string;
  assignee: CaseParticipantRef;
  assignedBy: CaseParticipantRef;
  status: PrototypeResponsibilityStatus;
  endedAt: string | null;
}

export interface PrototypeState {
  currentAccountId: string;
  /** Exact demo session selection by Case; role labels never select authority paths. */
  demoActorSelections: Record<string, { participant: CaseParticipantRef; displayRole: DemoRole }>;
  activeRole: DemoRole;
  identities: PrototypeIdentity[];
  identityDraft: IdentityRegistrationDraft;
  memberships: MockCaseMembership[];
  roleGrants: MockRoleGrant[];
  timeline: TimelineEntry[];
  actions: PrototypeAction[];
  questions: PrototypeQuestion[];
  members: CareCircleMember[];
  invitations: PrototypeInvitation[];
  workspaceCases: PrototypeWorkspaceCase[];
  privateTags: PrototypePrivateTag[];
  privateTagAssignments: PrototypeCaseTagAssignment[];
  responsibilityHistory: PrototypeResponsibilityHistory[];
  responsibilityCycles: PrototypeResponsibilityCycle[];
  actionStatusHistory: PrototypeActionStatusHistory[];
  professionalRecordVersions: ProfessionalRecordVersion[];
  readCursors: PrototypeReadCursor[];
  invitationSessionIds: string[];
  lastInvitationId: string | null;
  successMessage: string | null;
}
