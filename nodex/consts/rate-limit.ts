export const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_RATE_LIMIT_MAX = 100;
export const DEFAULT_RATE_LIMIT_MESSAGE =
  'Too many requests, please try again later.';
export const DEFAULT_RATE_LIMIT_OPTIONS = {
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  max: DEFAULT_RATE_LIMIT_MAX,
  message: DEFAULT_RATE_LIMIT_MESSAGE,
};
