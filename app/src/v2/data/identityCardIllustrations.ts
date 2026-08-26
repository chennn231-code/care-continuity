import familyCaregiverIllustration from '../assets/winwin-identity-family-caregiver.png';
import olderAdultIllustration from '../assets/winwin-identity-older-adult.png';
import professionalCareTeamIllustration from '../assets/winwin-identity-professional-care-team.png';
import type { PrimaryIdentityType } from '../types/prototype';

export const IDENTITY_CARD_ILLUSTRATIONS: Record<PrimaryIdentityType, string> = {
  SELF: olderAdultIllustration,
  FAMILY: familyCaregiverIllustration,
  PROFESSIONAL: professionalCareTeamIllustration
};
