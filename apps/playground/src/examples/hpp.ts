import { Wnodex } from 'wnodex';

import { HPP_OPTIONS } from '../options/hpp.js';

// WNODEX instance
const wnodex = new Wnodex({
  port: 4000,
  hpp: HPP_OPTIONS,
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
