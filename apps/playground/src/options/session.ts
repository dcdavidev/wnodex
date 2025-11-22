import { WnodexConfigInput } from 'wnodex';

export const SESSION_OPTIONS: WnodexConfigInput['session'] = {
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60_000, // 1 minute
    // secure and httpOnly will use schema defaults
  },
};
