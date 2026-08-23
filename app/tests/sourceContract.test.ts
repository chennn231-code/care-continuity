import { describe, expect, it } from 'vitest';
import {
  hasAnotherSelfLinkedSource,
  normalizeSourceInput,
  SourceValidationError
} from '../src/sources/sourceContract';

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('Gate 04 source contract', () => {
  it('trims a regular source and omits user_id', () => {
    expect(normalizeSourceInput({
      displayName: '  大哥  ',
      sourceType: 'FAMILY_MEMBER',
      isSelf: false
    }, USER_ID)).toEqual({
      display_name: '大哥',
      source_type: 'FAMILY_MEMBER'
    });
  });

  it('links only an explicit self source to the session user', () => {
    expect(normalizeSourceInput({
      displayName: '我',
      sourceType: 'FAMILY_MEMBER',
      isSelf: true
    }, USER_ID)).toEqual({
      display_name: '我',
      source_type: 'FAMILY_MEMBER',
      user_id: USER_ID
    });
  });

  it('rejects a blank display name', () => {
    expect(() => normalizeSourceInput({
      displayName: '   ',
      sourceType: 'OTHER',
      isSelf: false
    }, USER_ID)).toThrow(SourceValidationError);
  });

  it('detects another self-linked source but excludes the edited source', () => {
    const sources = [{ care_source_id: 'source-self', user_id: USER_ID }];
    expect(hasAnotherSelfLinkedSource(sources, USER_ID, null)).toBe(true);
    expect(hasAnotherSelfLinkedSource(sources, USER_ID, 'source-self')).toBe(false);
  });
});
