import { describe, expect, it } from 'vitest';
import { V2_PROTOTYPE_NOTICE } from '../src/v2/data/branding';
import {
  anySingleGrantPathAllows,
  beginIdentityRegistration,
  completeIdentityRegistration,
  createInitialPrototypeState,
  identityHasCaseAccess,
  selectIdentityType,
  selectProfessionalType,
  shouldChooseActingContext,
  validGrantPaths
} from '../src/v2/state/prototypeState';
import type { MockCaseMembership, MockRoleGrant, PrototypeIdentity } from '../src/v2/types/prototype';

function registeredFamilyState() {
  const initial = beginIdentityRegistration(createInitialPrototypeState(), 'PRIMARY');
  return completeIdentityRegistration(selectIdentityType(initial, 'FAMILY'));
}

describe('v2 prototype identity and permission contract', () => {
  it('registers exactly one primary identity', () => {
    const state = registeredFamilyState();
    expect(state.identities).toHaveLength(1);
    expect(state.identities.filter((identity) => identity.isPrimary)).toHaveLength(1);
    expect(state.identities[0].identityType).toBe('FAMILY');
  });

  it('replaces the registration fixture instead of creating multiple primary identities', () => {
    const state = registeredFamilyState();
    expect(state.identities.filter((identity) => identity.isPrimary)).toHaveLength(1);
    expect(state.identities[0].id).toMatch(/^prototype-identity-/);
  });

  it('does not grant a family identity access to a case automatically', () => {
    const state = registeredFamilyState();
    expect(identityHasCaseAccess(state, state.identities[0].id, 'demo-case')).toBe(false);
  });

  it('does not let an unverified professional identity enter professional case content', () => {
    let state = beginIdentityRegistration(createInitialPrototypeState(), 'PRIMARY');
    state = selectIdentityType(state, 'PROFESSIONAL');
    state = selectProfessionalType(state, 'NURSE');
    state = completeIdentityRegistration(state);
    const identityId = state.identities[0].id;
    state = { ...state, memberships: [{ id: 'membership', identityId, caseId: 'demo-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: null }] };
    expect(identityHasCaseAccess(state, identityId, 'demo-case')).toBe(false);
  });

  it('does not equate verified identity with case membership', () => {
    const state = registeredFamilyState();
    const verified = { ...state.identities[0], verificationStatus: 'VERIFIED' as const };
    expect(identityHasCaseAccess({ ...state, identities: [verified] }, verified.id, 'demo-case')).toBe(false);
  });

  it('does not equate case membership with access to every sharing scope', () => {
    const state = createInitialPrototypeState();
    const paths = validGrantPaths(state, 'demo-case');
    expect(anySingleGrantPathAllows(paths, ['VIEW_SHARED_CARE'], 'SHARED_CARE')).toBe(true);
    expect(anySingleGrantPathAllows(paths, ['VIEW_SHARED_CARE'], 'AUTHOR_ONLY')).toBe(false);
  });

  it('does not give a case manager collaboration administration by profession title', () => {
    let state = beginIdentityRegistration(createInitialPrototypeState(), 'PRIMARY');
    state = selectIdentityType(state, 'PROFESSIONAL');
    state = selectProfessionalType(state, 'CASE_MANAGER');
    state = completeIdentityRegistration(state);
    expect(state.roleGrants).toHaveLength(0);
  });

  it('adds a second identity only through secondary registration and keeps it unusable while unverified', () => {
    let state = registeredFamilyState();
    state = beginIdentityRegistration(state, 'SECONDARY');
    state = selectIdentityType(state, 'PROFESSIONAL');
    state = selectProfessionalType(state, 'NURSE');
    state = completeIdentityRegistration(state);
    expect(state.identities).toHaveLength(2);
    expect(state.identities.filter((identity) => identity.isPrimary)).toHaveLength(1);
    expect(state.identities[1].verificationStatus).toBe('DECLARED');
    expect(validGrantPaths(state, 'demo-case')).toHaveLength(0);
  });

  it('asks for acting context only when multiple complete grant paths are valid', () => {
    const family: PrototypeIdentity = { id: 'family', identityType: 'FAMILY', professionalType: null, verificationStatus: 'VERIFIED', isPrimary: true };
    const nurse: PrototypeIdentity = { id: 'nurse', identityType: 'PROFESSIONAL', professionalType: 'NURSE', verificationStatus: 'VERIFIED', isPrimary: false };
    const memberships: MockCaseMembership[] = [
      { id: 'family-member', identityId: family.id, caseId: 'demo-case', relationship: 'FAMILY_MEMBER', status: 'ACTIVE', validUntil: null },
      { id: 'nurse-member', identityId: nurse.id, caseId: 'demo-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: null }
    ];
    const roleGrants: MockRoleGrant[] = [
      { id: 'family-grant', membershipId: 'family-member', actingRole: 'FAMILY', purpose: '家庭共同照顧', sharingScopes: ['FAMILY_ONLY'], capabilities: ['RESOLVE_QUESTION'], validUntil: null },
      { id: 'nurse-grant', membershipId: 'nurse-member', actingRole: 'NURSE', purpose: '護理服務', sharingScopes: ['SHARED_CARE'], capabilities: ['ADD_UPDATE'], validUntil: null }
    ];
    const paths = validGrantPaths({ ...createInitialPrototypeState(), identities: [family, nurse], memberships, roleGrants }, 'demo-case');
    expect(shouldChooseActingContext(paths)).toBe(true);
    expect(anySingleGrantPathAllows(paths, ['RESOLVE_QUESTION', 'ADD_UPDATE'], 'SHARED_CARE')).toBe(false);
  });

  it('resets registration state when the in-memory prototype is recreated', () => {
    expect(createInitialPrototypeState().identityDraft.identityType).toBeNull();
    expect(V2_PROTOTYPE_NOTICE).toContain('虛構資料');
    expect(V2_PROTOTYPE_NOTICE).toContain('重新整理後會重置');
  });
});
