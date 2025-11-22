# wnodex

An extensible and robust Express.js server class designed for effortless customization and rapid deployment.

## Table of Contents

<!-- toc -->

- [Features](#features)
- [Usage](#usage)
  - [Import and Instantiate](#import-and-instantiate)
  - [Access the Logger](#access-the-logger)
  - [Get Validated Config](#get-validated-config)
  - [Access the Express App](#access-the-express-app)
  - [Start the Server](#start-the-server)
  - [Graceful Shutdown](#graceful-shutdown)
- [API Reference](#api-reference)
  - [class `Wnodex`](#class-wnodex)
    - [Constructor](#constructor)
    - [Methods](#methods)
- [License](#license)

<!-- tocstop -->

## Features

- **Express App Instantiation**: Quickly create a new Express application instance.
- **Configuration Validation**: Validate and store configuration using Zod schemas.
- **Middleware Setup**: Automatically applies global middlewares (helmet, cors, compression, rate-limit, etc.).
- **Logging**: Integrated with Pino for structured logging.
- **Error Handling**: Centralized error handler for Express.
- **Server Startup**: Simple method to start the server and listen on a specified port.
- **Graceful Shutdown**: Built-in support for graceful server shutdown and async cleanup chores.

## Usage

### Import and Instantiate

```ts
import { Wnodex } from 'wnodex';

const wnodex = new Wnodex({ port: 3000 });
```

### Access the Logger

```ts
const log = wnodex.getLogger();
log.info('Custom log message');
```

### Get Validated Config

```ts
const config = wnodex.getConfig();
console.log(config.port); // 3000
```

### Access the Express App

```ts
const app = wnodex.getApp();
app.get('/health', (req, res) => res.send('OK'));
```

### Start the Server

```ts
await wnodex.start();
```

### Graceful Shutdown

```ts
await wnodex.shutdown(async () => {
  await db.close();
  await cache.clear();
});
```

## API Reference

### class `Wnodex`

#### Constructor

```ts
new Wnodex(config: WnodexConfigInput)
```

- `config`: Configuration input validated by `WnodexConfigSchema`.

#### Methods

- `getLogger(): Logger` — Returns the logger instance.
- `getConfig(): WnodexConfigOutput` — Returns the validated configuration.
- `getApp(): Application` — Returns the Express app instance.
- `start(): Promise<void>` — Starts the server and listens on the configured port.
- `shutdown(chores?: () => Promise<void> | void): Promise<void>` — Gracefully shuts down the server, running optional async cleanup chores.

## License

This project is licensed under the MIT License.

Copyright (c) 2025 Davide Di Criscito

For the full details, see the [LICENSE](./LICENSE) file.
