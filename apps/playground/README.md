# @wnodex/playground

[![asciicast](https://asciinema.org/a/hgPLER5XejLkBK4EOB7B0egcW.svg)](https://asciinema.org/a/hgPLER5XejLkBK4EOB7B0egcW)

<!-- toc -->

- [Overview](#overview)
- [Examples](#examples)
- [License](#license)

<!-- tocstop -->

## Overview

**@wnodex/playground** is an interactive sandbox for experimenting with and validating all configuration options of the [wnodex](https://github.com/dcdavidev/wnodex) framework. It allows developers to:

- Quickly try out different middleware and server options in a real Express environment
- See the effects of toggling features like CORS, Helmet, HPP, session, cookie-parser, and Passport
- Validate and debug custom configurations before using them in production
- Explore how wnodex integrates with common security and utility middleware

This project is ideal for:

- New users learning how to configure wnodex
- Advanced users testing edge cases or custom setups
- Contributors developing or reviewing new wnodex features

## Examples

The `src/examples/` directory contains ready-to-run example files for each major wnodex option and middleware. Each file demonstrates a minimal, focused configuration for a single feature, making it easy to see how to enable and customize it.

**Available examples:**

- `compression.ts` — Enable and configure response compression
- `cookie-parser.ts` — Use cookie parsing with custom options
- `cors.ts` — Set up CORS with various origins and methods
- `helmet.ts` — Apply security headers with Helmet
- `hpp.ts` — Prevent HTTP parameter pollution
- `passport.ts` — Integrate Passport authentication
- `rate-limit.ts` — Add rate limiting to your API
- `session.ts` — Configure session management
- `main.ts` — A combined playground entrypoint

**Example: `src/examples/cookie-parser.ts`**

```ts
import { Wnodex } from 'wnodex';

import { COOKIE_PARSER_OPTIONS } from '../options/cookie-parser.js';

// WNODEX instance
const wnodex = new Wnodex({
  port: 4000,
  cookieParser: {
    secret: ['your-secret-key', 'another-secret'],
    options: {
      decode: (val: string) => {
        // Example: custom decode logic (reverse string, ES2022-compatible, no reverse/toReversed)
        let out = '';
        for (let i = val.length - 1; i >= 0; i--) out += val[i];
        return out;
      },
    },
  },
});

const logger = wnodex.getLogger();

// Add a simple health check route
const app = wnodex.getApp();
app.get('/', (_req, res) => res.send('OK'));

// Start the server
wnodex.start().then(() => {
  logger.info('Playground server started!');
});

// Shutdown chores
const shutdown = async () => {
  await wnodex.shutdown(() => {
    // DB disconnection or other chores
    logger.info('Chores executed.');
  });
};

// Graceful shutdown on SIGINT/SIGTERM using Wnodex public method
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

Explore the other files in `src/examples/` for more focused usage patterns.

---

## License

This project is licensed under the MIT License.

Copyright (c) 2025 Davide Di Criscito

For the full details, see the [LICENSE](./LICENSE) file.
