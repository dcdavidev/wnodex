import { WnodexConfigInput } from 'wnodex';

import { PORT } from './port.js';

export const CORS_OPTIONS: WnodexConfigInput['cors'] = {
  origin: [`http://localhost:${PORT}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'X-Custom-Header',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};
