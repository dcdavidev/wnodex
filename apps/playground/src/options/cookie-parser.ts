import { WnodexConfigInput } from 'wnodex';

export const COOKIE_PARSER_OPTIONS: WnodexConfigInput['cookieParser'] = {
  secret: ['your-secret-key', 'another-secret'],
  options: {
    decode: (val: string) => {
      // Example: custom decode logic (reverse string, ES2022-compatible, no reverse/toReversed)
      let out = '';
      for (let i = val.length - 1; i >= 0; i--) out += val[i];
      return out;
    },
  },
};
