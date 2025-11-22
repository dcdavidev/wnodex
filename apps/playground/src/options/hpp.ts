import { WnodexConfigInput } from 'wnodex';

// Option 1: allow all (default true)
// export const HPP_OPTIONS: WnodexConfigInput['hpp'] = true;

// Option 2: disable HPP
// export const HPP_OPTIONS: WnodexConfigInput['hpp'] = false;

// Option 3: allow only specific parameters
export const HPP_OPTIONS: WnodexConfigInput['hpp'] = [
  'allowedParam',
  'anotherParam',
];
