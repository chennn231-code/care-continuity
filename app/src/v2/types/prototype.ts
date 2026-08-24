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

export interface TimelineEntry {
  id: string;
  kind: UpdateKind;
  summary: string;
  occurredAt: string;
  recordedAt: string;
  authorRole: DemoRole;
  source: string;
  sharingScope: SharingScope;
  participantRoles?: DemoRole[];
  version: number;
  supersedesId?: string;
  hasUpdatedVersion: boolean;
  isCurrentVersion: boolean;
}

export interface PrototypeAction {
  id: string;
  title: string;
  detail: string;
  assigneeRole: DemoRole;
  assigneeName: string;
  dueAt: string;
  status: ActionStatus;
  linkedQuestionId: string;
}

export interface PrototypeQuestion {
  id: string;
  text: string;
  status: QuestionStatus;
  askedBy: string;
  answer?: string;
}

export interface CareCircleMember {
  id: string;
  name: string;
  role: DemoRole;
  relationship: string;
  purpose: string;
  scopeSummary: string;
  validFrom: string;
  validUntil: string | null;
  status: 'ACTIVE' | 'EXPIRING';
}

export interface NewUpdateInput {
  kind: 'OBSERVATION' | 'ARRANGEMENT' | 'QUESTION';
  occurredDate: string;
  occurredTime: string;
  content: string;
  source: string;
  actingRole: DemoRole;
  purpose: string;
  sharingScope: SharingScope;
  needsAction: boolean;
  assigneeRole?: DemoRole;
  dueAt?: string;
}

export interface PrototypeIdentity {
  id: string;
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
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  validUntil: string | null;
}

export interface MockRoleGrant {
  id: string;
  membershipId: string;
  actingRole: DemoRole;
  purpose: string;
  sharingScopes: SharingScope[];
  capabilities: string[];
  validUntil: string | null;
}

export interface PrototypeGrantPath {
  identity: PrototypeIdentity;
  membership: MockCaseMembership;
  grant: MockRoleGrant;
}

export interface PrototypeState {
  activeRole: DemoRole;
  identities: PrototypeIdentity[];
  identityDraft: IdentityRegistrationDraft;
  memberships: MockCaseMembership[];
  roleGrants: MockRoleGrant[];
  timeline: TimelineEntry[];
  actions: PrototypeAction[];
  questions: PrototypeQuestion[];
  members: CareCircleMember[];
  successMessage: string | null;
}
