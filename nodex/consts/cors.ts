import { DEFAULT_PORT } from './port.js';

export const DEFAULT_CORS_ORIGINS = [`http://localhost:${DEFAULT_PORT}`];
export const DEFAULT_CORS_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'OPTIONS',
] as const;
export const DEFAULT_CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Origin',
  'X-Requested-With',
];
export const DEFAULT_CORS_CREDENTIALS = true;
export const DEFAULT_CORS_OPTIONS_SUCCESS_STATUS = 204;
export const DEFAULT_CORS_ENABLED = true;
export const DEFAULT_CORS_OPTIONS = {
  enabled: DEFAULT_CORS_ENABLED,
  origin: DEFAULT_CORS_ORIGINS,
  methods: [...DEFAULT_CORS_METHODS],
  allowedHeaders: DEFAULT_CORS_ALLOWED_HEADERS,
  credentials: DEFAULT_CORS_CREDENTIALS,
  optionsSuccessStatus: DEFAULT_CORS_OPTIONS_SUCCESS_STATUS,
};
