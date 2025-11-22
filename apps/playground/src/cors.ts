import { WnodexConfigInput } from 'wnodex';

// CORS configuration options
export const corsOptions: WnodexConfigInput['cors'] = {
  origin: ['http://localhost:4010', 'http://localhost:4000'],
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
