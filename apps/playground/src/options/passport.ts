// To disable passport, use:
// export const PASSPORT_OPTIONS: WnodexConfigInput['passport'] = false;
// To enable passport, provide the passport instance:
import passport from 'passport';

import { WnodexConfigInput } from 'wnodex';
export const PASSPORT_OPTIONS: WnodexConfigInput['passport'] = passport;
