export const DEFAULT_SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24; // 1 day
export const DEFAULT_SESSION_COOKIE_SECURE =
  process.env.NODE_ENV === 'production';
export const DEFAULT_SESSION_COOKIE_HTTP_ONLY = true;
export const DEFAULT_SESSION_RESAVE = false;
export const DEFAULT_SESSION_SAVE_UNINITIALIZED = false;
